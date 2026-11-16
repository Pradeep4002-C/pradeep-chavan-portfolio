import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

/*
 * QA-Audit-9 frontend contracts.
 *
 * The live Chromium audit proves the rendered result. These tests keep the
 * guarantees that make that result possible: no unsafe DOM sinks anywhere in
 * application code, hostile values escaping as inert text, a single page-level
 * h1 with no skipped heading levels, and contrast-safe design tokens.
 */

const frontendRootUrl = new URL('..', import.meta.url);
const frontendRoot = fileURLToPath(frontendRootUrl);
const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

const HOSTILE = {
  script: '<script>window.__xss=1</script>',
  image: '<img src=x onerror="window.__xss=1">',
  svg: '"><svg onload=alert(1)>',
};

const UNSAFE_SINKS = [
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
  ['innerHTML', /\.innerHTML\b/],
  ['outerHTML', /\.outerHTML\b/],
  ['document.write', /document\.write\s*\(/],
  ['eval', /(?:^|[^A-Za-z0-9_$])eval\s*\(/],
  ['new Function', /new\s+Function\s*\(/],
];

let vite;
let modules;

function source(relativePath) {
  return readFileSync(new URL(`src/${relativePath}`, frontendRootUrl), 'utf8');
}

function listJavaScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...listJavaScriptFiles(fullPath));
    } else if (/\.(?:js|jsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function portfolioValue(overrides = {}) {
  return {
    status: 'ready',
    profile: {
      name: HOSTILE.image,
      email: 'owner@example.com',
      intro: HOSTILE.script,
      bio: [HOSTILE.svg, HOSTILE.image],
      headline: HOSTILE.script,
      location: HOSTILE.svg,
      github: 'https://github.com/example',
      linkedin: 'https://www.linkedin.com/in/example',
      leetcode: 'https://leetcode.com/u/example',
      resume: 'resume.pdf',
    },
    projects: [
      {
        id: 'hostile-project',
        number: '01',
        category: HOSTILE.svg,
        name: `${HOSTILE.image} Project`,
        summary: HOSTILE.script,
        description: `${HOSTILE.svg}\n\n${HOSTILE.image}`,
        technologies: [HOSTILE.script, HOSTILE.image],
        href: 'https://github.com/example/project',
        demoHref: 'https://example.com/demo',
        linkLabel: 'View source code',
        artwork: 'hostelcare',
        featured: true,
      },
    ],
    skillGroups: [
      {
        label: `${HOSTILE.image} Languages`,
        items: [HOSTILE.script, HOSTILE.svg, 'JavaScript'],
      },
    ],
    education: [
      {
        institution: `${HOSTILE.image} University`,
        qualification: HOSTILE.script,
        field: HOSTILE.svg,
        startYear: 2021,
        endYear: 2025,
        score: '8.5',
        location: HOSTILE.svg,
      },
    ],
    certifications: [
      {
        title: `${HOSTILE.svg} Certificate`,
        issuer: HOSTILE.script,
        year: 2024,
        url: 'https://example.com/certificate',
      },
    ],
    achievements: [
      {
        title: `${HOSTILE.image} Award`,
        year: 2024,
        description: HOSTILE.script,
      },
    ],
    ...overrides,
  };
}

function renderWith(PortfolioContext, Component, value) {
  return renderToStaticMarkup(
    React.createElement(
      PortfolioContext.Provider,
      { value },
      React.createElement(Component),
    ),
  );
}

function assertInert(markup, label) {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`);
  const document = dom.window.document;

  assert.equal(document.querySelectorAll('script').length, 0, `${label} must not create a script element`);
  assert.equal(document.querySelectorAll('img').length, 0, `${label} must not create an image element`);
  assert.equal(document.querySelectorAll('[onload]').length, 0, `${label} must not create onload handlers`);
  assert.equal(document.querySelectorAll('[onerror]').length, 0, `${label} must not create onerror handlers`);
  for (const element of document.querySelectorAll('*')) {
    for (const attribute of element.attributes) {
      assert.doesNotMatch(attribute.name, /^on/i, `${label} must not create inline event handlers`);
    }
  }
}

function headingLevels(markup) {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`);
  return Array.from(dom.window.document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(
    (heading) => Number(heading.tagName[1]),
  );
}

function assertNoSkippedLevels(levels) {
  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(
      levels[index] - levels[index - 1] <= 1,
      `heading level skipped from h${levels[index - 1]} to h${levels[index]}`,
    );
  }
}

function parseHex(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  assert.ok(match, `expected a six-digit hex colour, received ${value}`);
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16));
}

function luminance([r, g, b]) {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const first = luminance(parseHex(foreground));
  const second = luminance(parseHex(background));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

before(async () => {
  vite = await createServer({
    root: frontendRoot,
    configFile: false,
    esbuild: { jsx: 'automatic' },
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });

  const context = await vite.ssrLoadModule('/src/PortfolioContext.jsx');
  const hero = await vite.ssrLoadModule('/src/sections/Hero.jsx');
  const work = await vite.ssrLoadModule('/src/sections/Work.jsx');
  const skills = await vite.ssrLoadModule('/src/sections/Skills.jsx');
  const about = await vite.ssrLoadModule('/src/sections/About.jsx');
  const background = await vite.ssrLoadModule('/src/sections/Background.jsx');
  const contact = await vite.ssrLoadModule('/src/sections/Contact.jsx');
  const footer = await vite.ssrLoadModule('/src/sections/Footer.jsx');
  const app = await vite.ssrLoadModule('/src/App.jsx');
  const messageBody = await vite.ssrLoadModule('/src/admin/AdminMessageBody.jsx');

  modules = {
    PortfolioContext: context.PortfolioContext,
    Hero: hero.default,
    Work: work.default,
    Skills: skills.default,
    About: about.default,
    Background: background.default,
    Contact: contact.default,
    Footer: footer.default,
    App: app.default,
    AdminMessageBody: messageBody.default,
  };
});

after(async () => {
  await vite?.close();
});

test('application source contains no unsafe DOM sinks', () => {
  const directories = [
    path.join(frontendRoot, 'src'),
    path.join(repositoryRoot, 'backend', 'src'),
  ];

  for (const file of directories.flatMap(listJavaScriptFiles)) {
    const contents = readFileSync(file, 'utf8');
    for (const [label, pattern] of UNSAFE_SINKS) {
      assert.doesNotMatch(
        contents,
        pattern,
        `${path.relative(repositoryRoot, file)} must not use ${label}`,
      );
    }
  }
});

test('hostile public content renders strictly as inert text', () => {
  const value = portfolioValue();

  const markup = [
    renderWith(modules.PortfolioContext, modules.Hero, value),
    renderWith(modules.PortfolioContext, modules.Work, value),
    renderWith(modules.PortfolioContext, modules.Skills, value),
    renderWith(modules.PortfolioContext, modules.About, value),
    renderWith(modules.PortfolioContext, modules.Background, value),
    renderWith(modules.PortfolioContext, modules.Contact, value),
    renderWith(modules.PortfolioContext, modules.Footer, value),
  ].join('');

  assertInert(markup, 'public portfolio');
  assert.ok(markup.includes('&lt;script&gt;window.__xss=1&lt;/script&gt;'));
  assert.ok(markup.includes('&lt;img src=x'));
  assert.ok(markup.includes('&lt;svg onload=alert(1)&gt;'));
});

test('hostile contact-message content renders strictly as inert text', () => {
  const markup = renderToStaticMarkup(
    React.createElement(modules.AdminMessageBody, {
      id: 'mock-message',
      message: {
        hidden: false,
        message: `${HOSTILE.script}\n\n${HOSTILE.image}\n\n${HOSTILE.svg}`,
      },
    }),
  );

  assertInert(markup, 'admin message body');
  assert.match(markup, /&lt;script&gt;window\.__xss=1&lt;\/script&gt;/);
});

test('the public page has one banner, one main, one footer, and one h1', () => {
  const markup = renderToStaticMarkup(React.createElement(modules.App, { pathname: '/' }));
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`);
  const document = dom.window.document;

  assert.equal(document.querySelectorAll('header').length, 1);
  assert.equal(document.querySelectorAll('main').length, 1);
  assert.equal(document.querySelectorAll('footer').length, 1);
  assert.ok(document.querySelector('header nav[aria-label="Main navigation"]'));
  assert.equal(document.querySelectorAll('h1').length, 1);
  assert.equal(document.querySelectorAll('main h1').length, 1);
  assert.equal(document.querySelector('main')?.id, 'main-content');
});

test('the rendered public heading outline is sequential with no skipped levels', () => {
  const value = portfolioValue();
  const markup = [
    renderWith(modules.PortfolioContext, modules.Hero, value),
    renderWith(modules.PortfolioContext, modules.Work, value),
    renderWith(modules.PortfolioContext, modules.Skills, value),
    renderWith(modules.PortfolioContext, modules.About, value),
    renderWith(modules.PortfolioContext, modules.Background, value),
    renderWith(modules.PortfolioContext, modules.Contact, value),
  ].join('');

  const levels = headingLevels(markup);
  assert.deepEqual(levels, [1, 2, 3, 2, 3, 2, 2, 3, 4, 3, 4, 3, 4, 2, 3]);
  assertNoSkippedLevels(levels);
});

test('the administrator login page owns a main landmark in every state', () => {
  const login = source('admin/AdminLoginPage.jsx');
  assert.equal(
    login.match(/<main\b/g)?.length,
    3,
    'loading, error, and sign-in states must each render a main landmark',
  );
  assert.doesNotMatch(login, /<div className="(?:flex )?min-h-screen bg-sunken">/);
});

test('design tokens and status colours meet WCAG AA contrast', () => {
  const css = source('index.css');
  const tokens = Object.fromEntries(
    Array.from(css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/gi)).map((match) => [
      match[1],
      match[2],
    ]),
  );

  const normalTextPairs = [
    ['ink', 'paper', 4.5],
    ['ink', 'surface', 4.5],
    ['muted', 'paper', 4.5],
    ['muted', 'surface', 4.5],
    ['muted', 'sunken', 4.5],
    ['subtle', 'paper', 4.5],
    ['subtle', 'surface', 4.5],
    ['subtle', 'sunken', 4.5],
    ['accent', 'paper', 4.5],
    ['accent', 'surface', 4.5],
    ['accent-strong', 'accent-soft', 4.5],
    ['night-soft', 'night', 4.5],
  ];

  for (const [foreground, background, minimum] of normalTextPairs) {
    assert.ok(
      contrast(tokens[foreground], tokens[background]) >= minimum,
      `${foreground} on ${background} must reach ${minimum}:1`,
    );
  }

  // The accent period in large display headings is allowed to use the 3:1
  // large-text threshold on the sunken section background.
  assert.ok(contrast(tokens.accent, tokens.sunken) >= 3);

  const statusPairs = [
    ['#ffffff', tokens.ink, 4.5],
    ['#ffffff', tokens.accent, 4.5],
    ['#f9f8f4', tokens.night, 4.5],
    ['#ffc9c0', tokens.night, 4.5],
    ['#bfe8c7', tokens.night, 4.5],
    ['#8f1d15', '#fdf1f0', 4.5],
    ['#1f6f43', '#eef8f1', 4.5],
    ['#b3261e', tokens.surface, 4.5],
  ];

  for (const [foreground, background, minimum] of statusPairs) {
    assert.ok(
      contrast(foreground, background) >= minimum,
      `${foreground} on ${background} must reach ${minimum}:1`,
    );
  }
});
