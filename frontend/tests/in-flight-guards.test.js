import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Every network-mutating action must close the same-tick double-click window
 * with a ref. React's `disabled`/busy state only exists after the next commit,
 * so these contracts complement the interaction tests with a cheap inventory
 * guard for the actions that are harder to drive in jsdom.
 */

const frontendRoot = new URL('..', import.meta.url);

function source(relativePath) {
  return readFileSync(new URL(`src/${relativePath}`, frontendRoot), 'utf8');
}

const GUARDS = [
  ['sections/Contact.jsx', ['submittingRef']],
  ['admin/AdminLoginPage.jsx', ['submittingRef']],
  ['admin/AdminProfilePage.jsx', ['savingRef']],
  ['admin/ProjectEditorPage.jsx', ['submittingRef']],
  ['admin/ResourceManager.jsx', ['submittingRef', 'actionRef']],
  ['admin/AdminProjectsPage.jsx', ['actionRef']],
  ['admin/AdminMessagesPage.jsx', ['actionRef']],
];

test('every mutating UI action has a synchronous ref guard', () => {
  for (const [file, refs] of GUARDS) {
    const text = source(file);

    for (const ref of refs) {
      assert.match(
        text,
        new RegExp(`const ${ref} = useRef\\(false\\)`),
        `${file} must declare ${ref} with useRef(false)`,
      );
      assert.match(
        text,
        new RegExp(`if \\([^)]*${ref}\\.current`),
        `${file} must check ${ref}.current before starting a request`,
      );
      assert.match(
        text,
        new RegExp(`${ref}\\.current = true`),
        `${file} must flip ${ref}.current synchronously before awaiting`,
      );
      assert.match(
        text,
        new RegExp(`${ref}\\.current = false`),
        `${file} must release ${ref}.current after the request settles`,
      );
    }
  }
});

test('the scroll spy keeps absolute top and bottom boundaries', () => {
  const navbar = source('components/Navbar.jsx');

  assert.match(navbar, /maxScroll/, 'the spy must measure the document scroll limit');
  assert.match(
    navbar,
    /scrollY >= maxScroll - 1/,
    'maximum scroll must activate the final section',
  );
  assert.match(
    navbar,
    /if \(boundaryId\) return;/,
    'observer callbacks must not overwrite a boundary while it is pinned',
  );
});

test('the public portfolio revalidates after a back/forward-cache restore', () => {
  const context = source('PortfolioContext.jsx');

  assert.match(context, /addEventListener\('pageshow'/);
  assert.match(context, /event\.persisted/);
  assert.match(context, /if \(event\.persisted\)[\s\S]{0,40}retry\(\)/);
});
