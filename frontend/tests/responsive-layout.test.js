import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

/**
 * Responsive layout guards.
 *
 * These are source-level assertions because the defects they protect against are
 * CSS contracts rather than data transformations: a mobile drawer must clamp its
 * height, a dialog must scroll inside the viewport, and administrator-supplied
 * text must be able to break instead of widening the page. The browser audit at
 * 320px exercises the same contracts visually.
 */

function source(relativePath) {
  return readFileSync(new URL(`../src/${relativePath}`, import.meta.url), 'utf8');
}

function sourceFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const child = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, directory);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(child));
    } else if (/\.(jsx?|css)$/.test(entry.name)) {
      files.push(child);
    }
  }

  return files;
}

function assertTokens(label, text, tokens) {
  for (const token of tokens) {
    assert.ok(
      text.includes(token),
      `${label} must include the responsive guard "${token}"`,
    );
  }
}

test('public mobile navigation clamps its height and scrolls internally', () => {
  const navbar = source('components/Navbar.jsx');
  assertTokens('Navbar mobile panel', navbar, [
    'max-h-[calc(100dvh-4.5rem)]',
    'overflow-y-auto',
    'overscroll-contain',
    'md:max-h-none',
    'md:overflow-y-visible',
  ]);
});

test('admin mobile header and drawer fit a 320px viewport', () => {
  const layout = source('admin/AdminLayout.jsx');
  assertTokens('Admin mobile header', layout, [
    'min-w-0 items-center gap-2',
    'grid size-12 shrink-0 place-items-center rounded-full',
    'max-h-[calc(100dvh-4.5rem)]',
    'overflow-y-auto',
    'overscroll-contain',
    'data-admin-menu-backdrop',
  ]);
  assert.match(layout, /aria-label=\{menuOpen \? 'Close navigation menu' : 'Open navigation menu'\}/);
  assert.match(layout, /<MenuIcon open=\{menuOpen\} \/>/);
});

test('admin header, form controls, and breadcrumbs expose 44px touch targets', () => {
  const layout = source('admin/AdminLayout.jsx');
  assert.ok(
    layout.includes('inline-flex min-h-[44px] min-w-0 items-center gap-2 rounded-lg'),
    'the mobile admin brand link must fill the header touch target',
  );

  const ui = source('admin/AdminUi.jsx');
  assert.ok(
    ui.includes('min-h-[44px] w-full rounded-xl'),
    'shared admin inputs must be at least 44px tall on touch screens',
  );

  const projectEditor = source('admin/ProjectEditorPage.jsx');
  assert.ok(
    projectEditor.includes('inline-flex min-h-[44px] min-w-[44px] items-center rounded'),
    'breadcrumb links must not shrink below the 44px target',
  );
  assert.ok(
    projectEditor.includes('flex min-h-[44px] cursor-pointer items-center gap-2.5'),
    'checkbox labels must provide a 44px row for the native input',
  );
});

test('modal layers sit above sticky headers and inactivity is the top layer', () => {
  const ui = source('admin/AdminUi.jsx');
  assert.ok(ui.includes('z-[70]'), 'content dialogs must sit above every sticky header');
  assert.ok(ui.includes('data-dialog-layer="dialog"'));

  const inactivity = source('admin/InactivityWarningDialog.jsx');
  assert.ok(inactivity.includes('z-[90]'), 'inactivity warning must be the highest modal layer');
  assert.ok(inactivity.includes('data-dialog-layer="inactivity"'));

  const publicNavbar = source('components/Navbar.jsx');
  assert.ok(publicNavbar.includes('sticky top-0 z-50'));
  assert.ok(publicNavbar.includes('fixed inset-0 z-40'));

  const adminLayout = source('admin/AdminLayout.jsx');
  assert.ok(adminLayout.includes('sticky top-0 z-50'));
  assert.ok(adminLayout.includes('fixed inset-0 z-40'));
});

test('shared dialogs clamp to the dynamic viewport and scroll internally', () => {
  const ui = source('admin/AdminUi.jsx');
  assertTokens('AdminUi Dialog', ui, [
    'max-h-[calc(100dvh-4rem)]',
    'overflow-y-auto',
    'overscroll-contain',
  ]);

  const inactivity = source('admin/InactivityWarningDialog.jsx');
  assertTokens('InactivityWarningDialog', inactivity, [
    'max-h-[calc(100dvh-4rem)]',
    'overflow-y-auto',
    'overscroll-contain',
  ]);
});

test('technology pills can wrap long administrator-supplied names', () => {
  const tags = source('components/TechnologyTags.jsx');
  assertTokens('Technology tag recipes', tags, [
    'max-w-full',
    '[overflow-wrap:anywhere]',
    'flex flex-wrap gap-2',
  ]);
});

test('public dynamic text keeps long unbroken words inside its card', () => {
  const hero = source('sections/Hero.jsx');
  assertTokens('Hero heading', hero, ['min-w-0 max-w-[920px]', '[overflow-wrap:anywhere]']);

  const skills = source('sections/Skills.jsx');
  assertTokens('Skills cards', skills, [
    'min-w-0',
    'shrink-0 text-[0.68rem]',
    '[overflow-wrap:anywhere]',
  ]);

  const background = source('sections/Background.jsx');
  assertTokens('Background cards', background, [
    'grid grid-cols-1 gap-4',
    'min-w-0',
    '[overflow-wrap:anywhere]',
  ]);

  const about = source('sections/About.jsx');
  assertTokens('About biography', about, ['[overflow-wrap:anywhere]']);

  const footer = source('sections/Footer.jsx');
  assertTokens('Footer call to action', footer, [
    'min-w-0 [overflow-wrap:anywhere]',
    'shrink-0',
  ]);

  const project = source('components/ProjectEntry.jsx');
  assertTokens('Project entry', project, [
    'max-w-full self-start',
    '[overflow-wrap:anywhere]',
  ]);
});

test('admin dynamic text wraps without widening the mobile page', () => {
  const messages = source('admin/AdminMessagesPage.jsx');
  assertTokens('Admin messages', messages, [
    'min-w-0 text-base font-semibold',
    'shrink-0 text-xs text-muted',
    '[overflow-wrap:anywhere]',
  ]);

  const projects = source('admin/AdminProjectsPage.jsx');
  assertTokens('Admin projects', projects, [
    'inline-flex shrink-0 items-center rounded-full',
    '[overflow-wrap:anywhere]',
  ]);

  const resources = source('admin/ResourceManager.jsx');
  assertTokens('Resource manager', resources, [
    'min-w-0 text-base font-semibold',
    'shrink-0 rounded-full',
    '[overflow-wrap:anywhere]',
  ]);

  const login = source('admin/AdminLoginPage.jsx');
  assertTokens('Admin login header', login, [
    'inline-flex min-w-0 items-center gap-2',
    'min-h-[44px] shrink-0 items-center',
    'text-xs font-semibold',
  ]);
});

test('project artwork is inline SVG, so no external image request can fail', () => {
  const root = new URL('../src/', import.meta.url);
  const files = sourceFiles(root);
  assert.ok(files.length > 20, 'expected to scan the complete frontend source tree');

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const label = decodeURIComponent(file.pathname.split('/src/').pop());
    assert.doesNotMatch(text, /<img\b/i, `${label} must not render an external <img>`);
    assert.doesNotMatch(
      text,
      /\bimageUrl\b|\bimage_url\b/,
      `${label} must not depend on a remote image URL`,
    );
    assert.doesNotMatch(
      text,
      /url\([^)]*\.(?:png|jpe?g|webp|gif)\b/i,
      `${label} must not reference a raster asset`,
    );
  }

  const artwork = source('components/ProjectArtwork.jsx');
  assert.match(artwork, /<NeutralProjectArtwork \/>/, 'unknown artwork must fall back');

  const workflowArtwork = source('components/WorkflowArtwork.jsx');
  assert.match(workflowArtwork, /export function NeutralProjectArtwork/);
  assert.match(workflowArtwork, /<svg\b/, 'the fallback must be inline vector artwork');
});
