import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Accessibility and anchor contracts.
 *
 * The browser audit exercises these in a real layout at five viewport widths.
 * These source-level assertions keep the contracts from regressing when the
 * components are edited without a browser available.
 */

function source(relativePath) {
  return readFileSync(new URL(`../src/${relativePath}`, import.meta.url), 'utf8');
}

const PUBLIC_SECTIONS = [
  ['sections/Hero.jsx', 'home'],
  ['sections/Work.jsx', 'work'],
  ['sections/Skills.jsx', 'skills'],
  ['sections/About.jsx', 'about'],
  ['sections/Background.jsx', 'background'],
  ['sections/Contact.jsx', 'contact'],
];

test('public anchors rely on one global sticky-header scroll offset', () => {
  const css = source('index.css');
  assert.match(
    css,
    /scroll-padding-top:\s*6rem;/,
    'index.css must reserve 6rem above every scroll target',
  );

  // Six rem is 96px, which clears the 78px desktop header. If either number
  // grows, the other needs a matching review.
  assert.equal(6 * 16, 96);
  const navbar = source('components/Navbar.jsx');
  assert.match(navbar, /md:min-h-\[78px\]/);
  assert.match(navbar, /href=\{`#\$\{section\.id\}`\}/);
  assert.match(navbar, /aria-current=\{isActive \? 'location' : undefined\}/);

  for (const [file, id] of PUBLIC_SECTIONS) {
    const section = source(file);
    assert.ok(
      section.includes(`id="${id}"`),
      `${file} must own the #${id} anchor`,
    );
    assert.ok(
      section.includes('tabIndex={-1}'),
      `${file} must remain programmatically focusable`,
    );
    assert.ok(
      !section.includes('scroll-mt-'),
      `${file} must not duplicate the global scroll-padding offset`,
    );
  }
});

test('administrator state toggles expose pressed or expanded state', () => {
  const messages = source('admin/AdminMessagesPage.jsx');
  assert.match(messages, /aria-pressed=\{Boolean\(message\.read\)\}/);
  assert.match(messages, /aria-expanded=\{expanded\}/);
  assert.match(messages, /aria-controls=\{bodyId\}/);
  assert.match(messages, /disabled=\{Boolean\(busyId\)\}/);

  const projects = source('admin/AdminProjectsPage.jsx');
  assert.equal(
    projects.match(/aria-pressed=\{Boolean\(project\.published\)\}/g)?.length,
    2,
    'desktop and mobile project rows must both expose publish state',
  );
  assert.equal(
    projects.match(/disabled=\{Boolean\(busyId\)\}/g)?.length >= 4,
    true,
    'project actions must be disabled while a write is in flight',
  );

  const login = source('admin/AdminLoginPage.jsx');
  assert.match(login, /aria-pressed=\{showPassword\}/);
  assert.match(login, /aria-label=\{showPassword \? 'Hide password' : 'Show password'\}/);

  const layout = source('admin/AdminLayout.jsx');
  assert.match(layout, /aria-expanded=\{menuOpen\}/);
  assert.match(layout, /aria-controls="admin-mobile-nav"/);
  assert.match(layout, /menuButtonRef\.current\?\.focus\(\)/);

  const resources = source('admin/ResourceManager.jsx');
  assert.match(resources, /aria-label=\{`Move \$\{label\} up`\}/);
  assert.match(resources, /aria-label=\{`Move \$\{label\} down`\}/);
  assert.match(resources, /disabled=\{index === 0 \|\| Boolean\(movingId\) \|\| Boolean\(busyId\)\}/);
  assert.match(
    resources,
    /disabled=\{index === items\.length - 1 \|\| Boolean\(movingId\) \|\| Boolean\(busyId\)\}/,
  );
});
