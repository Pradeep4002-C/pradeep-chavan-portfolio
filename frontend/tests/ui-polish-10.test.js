import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test, { after, before, beforeEach } from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

/*
 * UI-Polish-10 contracts.
 *
 * These tests exercise the restrained enhancements with the real components:
 * the Contact copy-email micro-interaction (clipboard payload, confirmation
 * state, polite announcement, and reset), the Navbar active-link indicator,
 * the motion-safe hover polish on project and skill cards, the single zinc
 * focus treatment shared by public and admin form controls, and the scoped
 * editorial gradient mesh.
 */

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

let dom;
let vite;
let act;
let createRoot;
let Contact;
let Navbar;
let ProjectEntry;
let Skills;
let PortfolioContext;
let adminInputClass;
let clipboardWrites;
let clipboardMode;

const source = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

function installDom() {
  const nextDom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: 'http://localhost/', pretendToBeVisual: true },
  );
  const { window } = nextDom;

  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLAnchorElement: window.HTMLAnchorElement,
    HTMLButtonElement: window.HTMLButtonElement,
    HTMLInputElement: window.HTMLInputElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
    Element: window.Element,
    Node: window.Node,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    FocusEvent: window.FocusEvent,
    InputEvent: window.InputEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    localStorage: window.localStorage,
  };

  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }

  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  });

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return nextDom;
}

before(async () => {
  dom = installDom();

  act = React.act;
  ({ createRoot } = await import('react-dom/client'));

  vite = await createServer({
    root: frontendRoot,
    configFile: false,
    esbuild: { jsx: 'automatic' },
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });

  const contactModule = await vite.ssrLoadModule('/src/sections/Contact.jsx');
  const navbarModule = await vite.ssrLoadModule('/src/components/Navbar.jsx');
  const projectModule = await vite.ssrLoadModule('/src/components/ProjectEntry.jsx');
  const skillsModule = await vite.ssrLoadModule('/src/sections/Skills.jsx');
  const contextModule = await vite.ssrLoadModule('/src/PortfolioContext.jsx');
  const adminUiModule = await vite.ssrLoadModule('/src/admin/AdminUi.jsx');

  Contact = contactModule.default;
  Navbar = navbarModule.default;
  ProjectEntry = projectModule.default;
  Skills = skillsModule.default;
  PortfolioContext = contextModule.PortfolioContext;
  adminInputClass = adminUiModule.inputClass;
});

after(async () => {
  await vite?.close();
  dom?.window.close();
});

beforeEach(() => {
  clipboardWrites = [];
  clipboardMode = 'resolve';

  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText(text) {
        clipboardWrites.push(text);
        return clipboardMode === 'reject'
          ? Promise.reject(new Error('Clipboard permission denied.'))
          : Promise.resolve();
      },
    },
  });

  // jsdom does not implement the legacy copy command. Removing it makes the
  // denied-permission test deterministic and exercises the real error path.
  Object.defineProperty(window.document, 'execCommand', {
    configurable: true,
    value: undefined,
  });

  window.location.hash = '';
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function flush() {
  await act(async () => {
    await tick();
    await tick();
    await tick();
  });
}

function portfolioValue(profile = {}, overrides = {}) {
  return {
    profile: {
      email: '  owner@example.com  ',
      location: 'Pune, India',
      ...profile,
    },
    projects: [],
    skillGroups: [],
    education: [],
    certifications: [],
    achievements: [],
    status: 'ready',
    ...overrides,
  };
}

async function mountContact(profile) {
  const container = document.getElementById('root');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(
        PortfolioContext.Provider,
        { value: portfolioValue(profile) },
        React.createElement(Contact),
      ),
    );
  });

  return {
    root,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
    },
  };
}

function copyButton() {
  return Array.from(document.querySelectorAll('#contact button')).find((button) =>
    /Copy email|Copied/.test(button.textContent),
  );
}

function labelOf(button) {
  return button.textContent.replace(/\s+/g, ' ').trim();
}

test('Copy email writes the trimmed address, shows Copied, announces politely, then resets', async (t) => {
  const { unmount } = await mountContact();
  t.after(unmount);

  const button = copyButton();
  assert.ok(button, 'a valid profile email must expose the copy action');
  assert.equal(labelOf(button), 'Copy email');
  assert.match(
    button.className,
    /min-h-\[44px\]/,
    'the copy action must keep a 44px touch target',
  );
  assert.equal(button.getAttribute('type'), 'button');
  assert.ok(button.querySelector('svg[aria-hidden="true"]'), 'the default state needs a copy icon');

  await act(async () => {
    button.click();
  });
  await flush();

  assert.deepEqual(clipboardWrites, ['owner@example.com'], 'only the trimmed address is copied');
  assert.equal(labelOf(button), 'Copied');
  assert.ok(button.querySelector('svg[aria-hidden="true"]'), 'the copied state needs a check icon');

  const status = document.getElementById('contact-copy-status');
  assert.ok(status, 'the copy action needs a live status region');
  assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.equal(status.getAttribute('aria-atomic'), 'true');
  assert.equal(status.textContent, 'Email address copied to clipboard.');

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2100));
  });

  assert.equal(labelOf(button), 'Copy email', 'the label must reset after 2s');
  assert.equal(status.textContent, '', 'the announcement must clear after the confirmation window');
});

test('a denied clipboard permission never shows Copied and offers fallback guidance', async (t) => {
  clipboardMode = 'reject';
  const { unmount } = await mountContact();
  t.after(unmount);

  const button = copyButton();
  assert.ok(button);

  await act(async () => {
    button.click();
  });
  await flush();

  assert.equal(labelOf(button), 'Copy email');
  const status = document.getElementById('contact-copy-status');
  assert.match(status.textContent, /Could not copy automatically/);
  assert.match(status.textContent, /Select the email address/);
});

test('an invalid profile address does not render the copy action', async (t) => {
  const { unmount } = await mountContact({ email: 'not-an-address' });
  t.after(unmount);

  assert.equal(copyButton(), undefined);
});

test('the active navigation link exclusively owns both editorial indicators', async (t) => {
  window.location.hash = '#work';

  const value = portfolioValue(
    { resume: '' },
    { skillGroups: [{ label: 'Languages', items: ['JavaScript'] }] },
  );
  const root = createRoot(document.getElementById('root'));

  await act(async () => {
    root.render(
      React.createElement(
        PortfolioContext.Provider,
        { value },
        React.createElement(Navbar),
      ),
    );
  });

  t.after(async () => {
    await act(async () => {
      root.unmount();
    });
    window.location.hash = '';
  });

  const active = document.querySelector('a[aria-current="location"]');
  assert.ok(active, 'the current section must be marked with aria-current="location"');
  assert.equal(active.textContent.trim(), 'Work');

  const classes = active.className;
  for (const token of [
    'min-h-[48px]',
    'text-ink',
    'font-semibold',
    'before:opacity-100',
    'motion-safe:before:transition-opacity',
    'md:after:h-0.5',
    'md:after:scale-x-100',
    'md:motion-safe:after:transition-transform',
  ]) {
    assert.ok(classes.includes(token), `the active link must include ${token}`);
  }

  const links = Array.from(document.querySelectorAll('nav a[href^="#"]')).filter((link) =>
    ['Work', 'Skills', 'About', 'Contact'].includes(link.textContent.trim()),
  );
  assert.ok(links.length >= 4, 'expected the public section links');

  for (const link of links.filter((link) => link !== active)) {
    assert.equal(link.hasAttribute('aria-current'), false);
    assert.match(link.className, /md:after:scale-x-0/);
    // Hover and keyboard focus may change the text, but they must never grow
    // the underline that marks the current section. Otherwise a hovered link
    // shows a second bar beside the active one.
    assert.match(link.className, /hover:text-accent/);
    assert.doesNotMatch(link.className, /md:hover:after:scale-x-100/);
    assert.doesNotMatch(link.className, /md:focus-visible:after:scale-x-100/);
  }

  // The underline token appears on exactly one link: the aria-current target.
  const underlineOwners = links.filter((link) =>
    link.className.includes('md:after:scale-x-100'),
  );
  assert.deepEqual(underlineOwners, [active]);
});

const project = {
  number: '01',
  category: 'Web application',
  name: 'Test project',
  summary: 'A concise project summary.',
  description: 'A case-study description long enough to render as copy.',
  technologies: ['React'],
  href: null,
  demoHref: null,
  linkLabel: 'View source code',
  artwork: 'hostelcare',
  featured: false,
};

function articleClass(markup) {
  const document = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`).window.document;
  const article = document.querySelector('article');
  assert.ok(article, 'expected a card article');
  return article.className;
}

function assertHoverPolish(classes) {
  for (const token of [
    'transition-all',
    'duration-200',
    'ease-out',
    'motion-safe:hover:-translate-y-0.5',
    'hover:border-ink/30',
    'hover:shadow-md',
    'hover:delay-0!',
  ]) {
    assert.ok(classes.includes(token), `card hover polish must include ${token}`);
  }
  assert.doesNotMatch(classes, /overflow-hidden/, 'the card itself must not clip focus outlines');
}

test('project cards use the restrained motion-safe lift', () => {
  assertHoverPolish(
    articleClass(renderToStaticMarkup(React.createElement(ProjectEntry, { project }))),
  );
});

test('skill cards use the same restrained motion-safe lift', () => {
  const value = portfolioValue(
    {},
    { skillGroups: [{ label: 'Languages', items: ['JavaScript', 'TypeScript'] }] },
  );
  const markup = renderToStaticMarkup(
    React.createElement(
      PortfolioContext.Provider,
      { value },
      React.createElement(Skills),
    ),
  );

  const classes = articleClass(markup);
  assert.ok(classes.includes('min-h-[144px]'));
  assertHoverPolish(classes);
});

const zincFocusTokens = [
  'transition-colors',
  'focus:outline-none',
  'focus:ring-1',
  'focus:ring-zinc-400',
  'focus:border-zinc-400',
];

function assertZincFocus(classes, label) {
  for (const token of zincFocusTokens) {
    assert.ok(classes.includes(token), `${label} must include ${token}`);
  }
  assert.doesNotMatch(
    classes,
    /focus-visible:ring-accent|focus:border-accent|ring-blue|ring-accent/,
    `${label} must not stack a blue or accent focus treatment`,
  );
}

test('every public contact field uses one zinc focus ring', async (t) => {
  const { unmount } = await mountContact();
  t.after(unmount);

  const section = document.getElementById('contact');
  assert.match(section.className, /editorial-dark-mesh/);
  assert.doesNotMatch(section.className, /bg-night/);

  const fields = Array.from(
    document.querySelectorAll('#contact input, #contact textarea, #contact select'),
  ).filter((field) => field.id !== 'contact-website');

  assert.equal(fields.length, 4, 'expected the four visible contact fields');
  for (const field of fields) {
    assertZincFocus(field.className, `#${field.id}`);
  }
});

test('shared admin fields and publication checkboxes use the zinc focus contract', () => {
  assertZincFocus(adminInputClass, 'admin inputClass');

  const projectSource = source('src/admin/ProjectEditorPage.jsx');
  const checkboxClasses = Array.from(
    projectSource.matchAll(/type="checkbox"[\s\S]{0,320}?className="([^"]+)"/g),
    (match) => match[1],
  );

  assert.equal(checkboxClasses.length, 2, 'expected featured and published checkboxes');
  for (const classes of checkboxClasses) {
    assertZincFocus(classes, 'admin checkbox');
    assert.match(classes, /accent-zinc-600/);
    assert.doesNotMatch(classes, /text-accent/);
  }
});

test('the dark editorial mesh uses the specified zinc gradients without layout impact', () => {
  const css = source('src/index.css');
  const mesh = css.match(/@utility editorial-dark-mesh\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

  assert.match(mesh, /background-color: #09090b;/);
  assert.match(
    mesh,
    /radial-gradient\(circle at 15% 15%, rgba\(63, 63, 70, 0\.12\) 0%, transparent 40%\)/,
  );
  assert.match(
    mesh,
    /radial-gradient\(circle at 85% 85%, rgba\(39, 39, 42, 0\.15\) 0%, transparent 45%\)/,
  );
  assert.match(mesh, /background-attachment: fixed;/);
  assert.match(mesh, /color-scheme: dark;/);

  const bodyRule = css.match(/\n  body \{([\s\S]*?)\n  \}/)?.[1] ?? '';
  assert.match(bodyRule, /background-image:/);
  assert.match(bodyRule, /radial-gradient\(circle at 15% 15%/);
  assert.match(bodyRule, /radial-gradient\(circle at 85% 85%/);
  assert.match(bodyRule, /background-attachment: fixed;/);
});
