import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { profile as fallbackProfile } from '../src/data/portfolio.js';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const PRODUCTION_ORIGIN = 'https://pradeep-portfolio.onrender.com';
const OG_IMAGE_URL = `${PRODUCTION_ORIGIN}/og-image.png`;

async function loadModules(t) {
  const server = await createServer({
    root: frontendRoot,
    configFile: false,
    esbuild: { jsx: 'automatic' },
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  t.after(() => server.close());

  const context = await server.ssrLoadModule('/src/PortfolioContext.jsx');
  const hero = await server.ssrLoadModule('/src/sections/Hero.jsx');
  const work = await server.ssrLoadModule('/src/sections/Work.jsx');
  const skills = await server.ssrLoadModule('/src/sections/Skills.jsx');
  const about = await server.ssrLoadModule('/src/sections/About.jsx');
  const background = await server.ssrLoadModule('/src/sections/Background.jsx');
  const contact = await server.ssrLoadModule('/src/sections/Contact.jsx');
  const footer = await server.ssrLoadModule('/src/sections/Footer.jsx');
  const navbar = await server.ssrLoadModule('/src/components/Navbar.jsx');
  const notFound = await server.ssrLoadModule('/src/pages/NotFound.jsx');
  const app = await server.ssrLoadModule('/src/App.jsx');

  return {
    PortfolioContext: context.PortfolioContext,
    PortfolioProvider: context.PortfolioProvider,
    Hero: hero.default,
    Work: work.default,
    Skills: skills.default,
    About: about.default,
    Background: background.default,
    Contact: contact.default,
    Footer: footer.default,
    Navbar: navbar.default,
    NotFound: notFound.default,
    App: app.default,
    isKnownPublicPath: app.isKnownPublicPath,
  };
}

function portfolioValue(overrides = {}) {
  return {
    profile: {
      name: 'Pradeep Chavan',
      email: 'chavanpradeep096@gmail.com',
      intro:
        'I turn practical problems into full-stack applications, workflow automations, and data-driven tools.',
      bio: [
        'I learn best by building interfaces, backend systems, and automation.',
        'I care about clear problem-solving, maintainable code, and software that is genuinely useful.',
      ],
      headline: 'Full-stack developer focused on practical software.',
      location: 'Belagavi, Karnataka, India',
      github: 'https://github.com/example',
      linkedin: 'https://www.linkedin.com/in/example/',
      leetcode: 'https://leetcode.com/example/',
      resume: 'resume.pdf',
    },
    projects: [
      {
        id: 'hostelcare',
        number: '01',
        category: 'Full-stack web app',
        name: 'HostelCare',
        summary: 'Hostel maintenance platform for reporting, triaging, and resolving room issues.',
        description:
          'Students raise complaints, administrators triage them, and maintenance staff track progress.',
        technologies: ['React', 'Node.js', 'Express', 'MongoDB'],
        href: 'https://github.com/example/hostelcare',
        demoHref: null,
        linkLabel: 'View source code',
        artwork: 'hostelcare',
        featured: true,
      },
      {
        id: 'aquapredict',
        number: '02',
        category: 'Applied machine learning',
        name: 'AquaPredict',
        summary: 'Dashboard that predicts wastewater BOD from water-quality measurements.',
        description: 'A Flask API loads a saved model and returns an estimated BOD status band.',
        technologies: ['Python', 'Flask', 'scikit-learn', 'React'],
        href: 'https://github.com/example/aquapredict',
        demoHref: 'https://example.com/aquapredict-demo',
        linkLabel: 'View source code',
        artwork: 'aquapredict',
        featured: false,
      },
      {
        id: 'expense-tracker',
        number: '03',
        category: 'Workflow automation',
        name: 'RPA Expense Tracker',
        summary: 'UiPath automation that turns Excel expense data into summary reports and email.',
        description: 'The workflow reads, processes, summarises, and emails expense data.',
        technologies: ['UiPath', 'Excel', 'Email automation'],
        href: 'https://github.com/example/rpa-expense-tracker',
        demoHref: null,
        linkLabel: 'View source code',
        artwork: 'expense',
        featured: false,
      },
    ],
    skillGroups: [
      { label: 'Languages', items: ['JavaScript', 'Python'] },
      { label: 'Frameworks', items: ['React', 'Node.js'] },
    ],
    education: [
      {
        institution: 'K.L.S. Gogte Institute of Technology',
        qualification: 'Bachelor of Engineering (B.E.)',
        field: 'Computer Science and Engineering',
        startYear: 2023,
        endYear: 2027,
        score: '8.61',
        location: 'Belagavi, Karnataka, India',
        order: 1,
      },
    ],
    certifications: [
      {
        title: 'Introduction to Front-End Development',
        issuer: 'Meta',
        year: 2024,
        url: 'https://example.com/certificates/front-end',
        order: 1,
      },
      {
        title: 'Programming with JavaScript',
        issuer: 'Meta',
        year: 2024,
        url: 'https://example.com/certificates/javascript',
        order: 2,
      },
    ],
    achievements: [],
    status: 'ready',
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

function assertInOrder(html, needles) {
  const positions = needles.map((needle) => html.indexOf(needle));

  positions.forEach((position, index) => {
    assert.ok(position >= 0, `expected to find ${needles[index]}`);
  });

  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(
      positions[index] > positions[index - 1],
      `expected ${needles[index]} to follow ${needles[index - 1]}`,
    );
  }
}

/**
 * Installs a browser-like DOM for the one component test that needs effects.
 * The globals are restored afterwards so the rest of this SSR-oriented file
 * keeps running without a document.
 */
function installTestDocument(html, url) {
  const dom = new JSDOM(html, { url, pretendToBeVisual: true });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    HTMLButtonElement: dom.window.HTMLButtonElement,
    SVGElement: dom.window.SVGElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    FocusEvent: dom.window.FocusEvent,
    InputEvent: dom.window.InputEvent,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    localStorage: dom.window.localStorage,
  };
  const previousDescriptors = new Map();
  const previousActEnvironment = Object.getOwnPropertyDescriptor(
    globalThis,
    'IS_REACT_ACT_ENVIRONMENT',
  );

  for (const [key, value] of Object.entries(globals)) {
    previousDescriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    document: dom.window.document,
    restore() {
      for (const [key, descriptor] of previousDescriptors) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          delete globalThis[key];
        }
      }

      if (previousActEnvironment) {
        Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', previousActEnvironment);
      } else {
        delete globalThis.IS_REACT_ACT_ENVIRONMENT;
      }

      dom.window.close();
    },
  };
}

test('the page composition keeps the project-first section order', () => {
  const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assertInOrder(appSource, [
    '<Hero />',
    '<Work />',
    '<Skills />',
    '<About />',
    '<Background />',
    '<Contact />',
  ]);
});

test('the public catch-all renders a branded 404 with a homepage action', async (t) => {
  const { App, NotFound, isKnownPublicPath } = await loadModules(t);

  assert.equal(isKnownPublicPath('/'), true);
  assert.equal(isKnownPublicPath('/index.html'), true);
  assert.equal(isKnownPublicPath('/projects'), false);
  assert.equal(isKnownPublicPath('/adminfoo'), false);

  const notFound = renderToStaticMarkup(React.createElement(NotFound));
  assert.match(notFound, /404/);
  assert.match(notFound, /Page not found/);
  assert.match(notFound, /<h1[^>]*>This page is off the map\.<\/h1>/);
  assert.match(notFound, /href="\/"/);
  assert.match(notFound, /Back to the homepage/);
  assert.doesNotMatch(notFound, /id="main-content"/);

  const missing = renderToStaticMarkup(React.createElement(App, { pathname: '/projects' }));
  assert.match(missing, /This page is off the map\./);
  assert.match(missing, /href="\/"/);
  assert.doesNotMatch(missing, /id="main-content"/);

  const home = renderToStaticMarkup(React.createElement(App, { pathname: '/' }));
  assert.match(home, /id="main-content"/);
  assert.match(home, /id="work"/);
  assert.doesNotMatch(home, /This page is off the map\./);
});

test('the 404 view sets its document title and restores the previous title on unmount', async (t) => {
  const { document: testDocument, restore } = installTestDocument(
    '<!doctype html><html><head><title>Previous page title</title></head><body><div id="root"></div></body></html>',
    'http://localhost/does-not-exist',
  );

  try {
    const { NotFound } = await loadModules(t);
    const { createRoot } = await import('react-dom/client');
    const container = testDocument.getElementById('root');
    const root = createRoot(container);

    await React.act(async () => {
      root.render(React.createElement(NotFound));
    });
    assert.equal(testDocument.title, 'Page not found — Pradeep Chavan');

    await React.act(async () => {
      root.unmount();
    });
    assert.equal(testDocument.title, 'Previous page title');

    testDocument.title = '';
    const fallbackContainer = testDocument.createElement('div');
    testDocument.body.appendChild(fallbackContainer);
    const fallbackRoot = createRoot(fallbackContainer);

    await React.act(async () => {
      fallbackRoot.render(React.createElement(NotFound));
    });
    assert.equal(testDocument.title, 'Page not found — Pradeep Chavan');

    await React.act(async () => {
      fallbackRoot.unmount();
    });
    assert.equal(testDocument.title, 'Pradeep Chavan — Developer Portfolio');
  } finally {
    restore();
  }
});

test('a deep link is aligned after async portfolio data settles', async (t) => {
  const { document: testDocument, restore } = installTestDocument(
    '<!doctype html><html><head><title>Hash test</title></head><body><div id="root"></div><section id="work"></section><section id="about"></section></body></html>',
    'http://localhost/#about',
  );

  try {
    const view = testDocument.defaultView;
    view.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    });

    const scrollCalls = [];
    testDocument.getElementById('about').scrollIntoView = (options) => {
      scrollCalls.push(options);
    };

    const { PortfolioContext, Navbar } = await loadModules(t);
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(testDocument.getElementById('root'));
    const readyValue = portfolioValue();
    const loadingValue = {
      ...readyValue,
      projects: [],
      skillGroups: [],
      education: [],
      certifications: [],
      achievements: [],
      status: 'loading',
    };

    const renderNavbar = (value) =>
      React.createElement(
        PortfolioContext.Provider,
        { value },
        React.createElement(Navbar),
      );

    await React.act(async () => {
      root.render(renderNavbar(loadingValue));
    });

    await React.act(async () => {
      await new Promise((resolve) => view.requestAnimationFrame(resolve));
    });
    assert.deepEqual(scrollCalls, []);

    await React.act(async () => {
      root.render(renderNavbar(readyValue));
    });

    await React.act(async () => {
      await new Promise((resolve) => view.requestAnimationFrame(resolve));
    });

    assert.equal(scrollCalls.length, 1);
    assert.deepEqual(scrollCalls[0], { block: 'start', behavior: 'instant' });
  } finally {
    restore();
  }
});

test('the active-section spy marks the first visible section in navigation order', async (t) => {
  const { document: testDocument, restore } = installTestDocument(
    `<!doctype html><html><body>
      <div id="root"></div>
      <section id="home"></section>
      <section id="work"></section>
      <section id="skills"></section>
      <section id="about"></section>
      <section id="background"></section>
      <section id="contact"></section>
    </body></html>`,
    'http://localhost/',
  );

  const view = testDocument.defaultView;
  view.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });

  const observers = [];

  class FakeIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = [];
      this.disconnected = false;
      observers.push(this);
    }

    observe(element) {
      this.observed.push(element.id);
    }

    disconnect() {
      this.disconnected = true;
    }
  }

  const previousObserver = Object.getOwnPropertyDescriptor(
    globalThis,
    'IntersectionObserver',
  );
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: FakeIntersectionObserver,
  });

  try {
    const { PortfolioContext, Navbar } = await loadModules(t);
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(testDocument.getElementById('root'));

    await React.act(async () => {
      root.render(
        React.createElement(
          PortfolioContext.Provider,
          { value: portfolioValue() },
          React.createElement(Navbar),
        ),
      );
    });

    const observer = observers.at(-1);
    assert.ok(observer, 'the navbar must create an IntersectionObserver');
    assert.deepEqual(observer.observed, [
      'home',
      'work',
      'skills',
      'about',
      'background',
      'contact',
    ]);
    assert.match(observer.options.rootMargin, /^-\d+px 0px -\d+px 0px$/);

    const activeHref = () =>
      testDocument
        .querySelector('a[aria-current="location"]')
        ?.getAttribute('href') ?? null;
    const entry = (id, isIntersecting) => ({
      target: testDocument.getElementById(id),
      isIntersecting,
    });

    await React.act(async () => {
      observer.callback([entry('work', true), entry('skills', true)]);
    });
    assert.equal(activeHref(), '#work');

    await React.act(async () => {
      observer.callback([entry('work', false)]);
    });
    assert.equal(activeHref(), '#skills');

    await React.act(async () => {
      observer.callback([
        entry('skills', false),
        entry('about', true),
        entry('background', true),
      ]);
    });
    assert.equal(activeHref(), '#about');

    await React.act(async () => {
      observer.callback([
        entry('about', false),
        entry('background', false),
        entry('contact', true),
      ]);
    });
    assert.equal(activeHref(), '#contact');

    // Home has no nav link; at the very top no marker should be claimed.
    await React.act(async () => {
      observer.callback([entry('contact', false), entry('home', true)]);
    });
    assert.equal(activeHref(), null);

    await React.act(async () => {
      root.unmount();
    });
    assert.equal(observer.disconnected, true);
  } finally {
    if (previousObserver) {
      Object.defineProperty(globalThis, 'IntersectionObserver', previousObserver);
    } else {
      delete globalThis.IntersectionObserver;
    }
    restore();
  }
});

test('the mobile navigation uses a centred SVG icon, a backdrop, scroll lock, and post-close section jumps', async (t) => {
  const sectionIds = ['home', 'work', 'skills', 'about', 'background', 'contact'];
  const { document: testDocument, restore } = installTestDocument(
    `<!doctype html><html><head><title>Navbar test</title></head><body><div id="root"></div>${sectionIds
      .map((id) => `<section id="${id}"></section>`)
      .join('')}</body></html>`,
    'http://localhost/',
  );

  try {
    const view = testDocument.defaultView;
    view.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    });

    const scrollCalls = [];
    for (const id of sectionIds) {
      testDocument.getElementById(id).scrollIntoView = (options) => {
        scrollCalls.push({ id, options });
      };
    }

    const { PortfolioContext, Navbar } = await loadModules(t);
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(testDocument.getElementById('root'));

    await React.act(async () => {
      root.render(
        React.createElement(
          PortfolioContext.Provider,
          { value: portfolioValue() },
          React.createElement(Navbar),
        ),
      );
    });

    const toggle = testDocument.querySelector(
      'button[aria-controls="primary-navigation"]',
    );
    const panel = testDocument.getElementById('primary-navigation');
    assert.ok(toggle, 'the mobile menu toggle must render');

    const menuIcon = () => toggle.querySelector('svg[data-menu-icon]');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(menuIcon()?.getAttribute('data-menu-icon'), 'menu');
    assert.deepEqual(
      Array.from(menuIcon().querySelectorAll('path')).map((path) => path.getAttribute('d')),
      ['M4 8h16', 'M4 16h16'],
    );

    await React.act(async () => {
      toggle.click();
    });

    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(menuIcon()?.getAttribute('data-menu-icon'), 'close');
    assert.deepEqual(
      Array.from(menuIcon().querySelectorAll('path')).map((path) => path.getAttribute('d')),
      ['M6 6 18 18', 'M18 6 6 18'],
    );
    assert.ok(
      testDocument.querySelector('[data-mobile-menu-backdrop]'),
      'an open drawer must render a click-outside backdrop',
    );
    assert.equal(testDocument.body.style.overflow, 'hidden');

    await React.act(async () => {
      testDocument.querySelector('[data-mobile-menu-backdrop]').click();
    });

    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(
      testDocument.querySelector('[data-mobile-menu-backdrop]'),
      null,
      'clicking the backdrop must close the drawer',
    );
    assert.equal(testDocument.body.style.overflow, '', 'closing must restore body scrolling');

    await React.act(async () => {
      toggle.click();
    });
    assert.equal(testDocument.body.style.overflow, 'hidden');

    const aboutLink = panel.querySelector('a[href="#about"]');
    assert.ok(aboutLink, 'the drawer must include the About section link');

    await React.act(async () => {
      aboutLink.click();
    });
    await React.act(async () => {
      await new Promise((resolve) => view.requestAnimationFrame(resolve));
    });

    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(testDocument.body.style.overflow, '', 'a section link must unlock scrolling');
    assert.equal(view.location.hash, '#about');
    assert.deepEqual(scrollCalls, [
      { id: 'about', options: { block: 'start', behavior: 'smooth' } },
    ]);

    await React.act(async () => {
      toggle.click();
    });
    assert.equal(testDocument.body.style.overflow, 'hidden');

    await React.act(async () => {
      root.unmount();
    });
    assert.equal(
      testDocument.body.style.overflow,
      '',
      'unmounting with the drawer open must release the scroll lock',
    );
  } finally {
    restore();
  }
});

test('an invalid contact submit focuses and scrolls to the first invalid field', async (t) => {
  const { document: testDocument, restore } = installTestDocument(
    '<!doctype html><html><head><title>Contact focus test</title></head><body><div id="root"></div></body></html>',
    'http://localhost/#contact',
  );

  try {
    const view = testDocument.defaultView;
    const scrollCalls = [];
    view.HTMLElement.prototype.scrollIntoView = function scrollIntoView(options) {
      scrollCalls.push({ id: this.id, options });
    };

    const { PortfolioContext, Contact } = await loadModules(t);
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(testDocument.getElementById('root'));

    await React.act(async () => {
      root.render(
        React.createElement(
          PortfolioContext.Provider,
          { value: portfolioValue() },
          React.createElement(Contact),
        ),
      );
    });

    const submit = Array.from(testDocument.querySelectorAll('button')).find(
      (button) => button.textContent.replace(/\s+/g, ' ').trim() === 'Send message',
    );
    assert.ok(submit, 'the contact form must render its submit button');

    await React.act(async () => {
      submit.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const name = testDocument.getElementById('contact-name');
    assert.equal(testDocument.activeElement, name, 'focus must move to the first invalid field');
    assert.equal(name.getAttribute('aria-invalid'), 'true');
    assert.equal(
      testDocument.getElementById('contact-name-error').textContent,
      'Enter your name.',
    );
    assert.match(testDocument.body.textContent, /Please check the highlighted fields/);
    assert.deepEqual(scrollCalls, [{ id: 'contact-name', options: { block: 'center' } }]);

    const setValue = (element, value) => {
      const prototype =
        element instanceof view.HTMLTextAreaElement
          ? view.HTMLTextAreaElement.prototype
          : view.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
      element.dispatchEvent(new view.Event('input', { bubbles: true }));
    };

    await React.act(async () => {
      setValue(name, 'Pradeep Chavan');
      setValue(testDocument.getElementById('contact-email'), 'owner@example.com');
    });

    scrollCalls.length = 0;

    await React.act(async () => {
      submit.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const message = testDocument.getElementById('contact-message');
    assert.equal(
      testDocument.activeElement,
      message,
      'when earlier fields are valid, focus must skip to the message',
    );
    assert.equal(message.getAttribute('aria-invalid'), 'true');
    assert.equal(
      testDocument.getElementById('contact-message-error').textContent,
      'Enter a message.',
    );
    assert.deepEqual(scrollCalls, [{ id: 'contact-message', options: { block: 'center' } }]);

    await React.act(async () => {
      root.unmount();
    });
  } finally {
    restore();
  }
});

test('the public metadata uses the production origin and a complete social image contract', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const compactHtml = html.replace(/\s+/g, ' ');

  assert.equal(compactHtml.includes('example.com'), false);
  assert.ok(
    compactHtml.includes(`<link rel="canonical" href="${PRODUCTION_ORIGIN}/" />`),
  );
  assert.ok(
    compactHtml.includes(`<meta property="og:url" content="${PRODUCTION_ORIGIN}/" />`),
  );
  assert.ok(
    compactHtml.includes(`<meta property="og:image" content="${OG_IMAGE_URL}" />`),
  );
  assert.ok(compactHtml.includes('<meta property="og:image:type" content="image/png" />'));
  assert.ok(compactHtml.includes('<meta property="og:image:width" content="1200" />'));
  assert.ok(compactHtml.includes('<meta property="og:image:height" content="630" />'));
  assert.match(
    compactHtml,
    /<meta property="og:image:alt" content="[^"]*Pradeep Chavan[^"]*" \/>/,
  );
  assert.ok(
    compactHtml.includes(`<meta name="twitter:image" content="${OG_IMAGE_URL}" />`),
  );
  assert.match(
    compactHtml,
    /<meta name="twitter:image:alt" content="[^"]*Pradeep Chavan[^"]*" \/>/,
  );
});

test('the social preview image is a valid 1200x630 PNG', () => {
  const png = readFileSync(new URL('../public/og-image.png', import.meta.url));

  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.equal(png.subarray(png.length - 8, png.length - 4).toString('ascii'), 'IEND');
  assert.ok(png.length > 1000, 'expected a non-trivial social preview image');
});

test('navigation follows the page order and keeps the resume action separate', async (t) => {
  const { PortfolioContext, Navbar } = await loadModules(t);
  const html = renderWith(PortfolioContext, Navbar, portfolioValue());

  assertInOrder(html, [
    'href="#work"',
    'href="#skills"',
    'href="#about"',
    'href="#background"',
    'href="#contact"',
    'Download resume',
  ]);
});

test('navigation reserves optional links while the portfolio is loading', async (t) => {
  const { PortfolioContext, Navbar } = await loadModules(t);
  const loadingHtml = renderWith(PortfolioContext, Navbar, {
    ...portfolioValue(),
    projects: [],
    skillGroups: [],
    education: [],
    certifications: [],
    achievements: [],
    status: 'loading',
  });

  assertInOrder(loadingHtml, [
    'href="#work"',
    'href="#skills"',
    'href="#about"',
    'href="#background"',
    'href="#contact"',
  ]);

  const unavailableHtml = renderWith(PortfolioContext, Navbar, {
    ...portfolioValue(),
    projects: [],
    skillGroups: [],
    education: [],
    certifications: [],
    achievements: [],
    status: 'unavailable',
  });

  assert.doesNotMatch(unavailableHtml, /href="#skills"/);
  assert.doesNotMatch(unavailableHtml, /href="#background"/);
});

test('Skills renders duplicate labels and technologies without duplicate-key warnings', async (t) => {
  const { document: testDocument, restore } = installTestDocument(
    '<!doctype html><html><head><title>Skills key safety</title></head><body><div id="root"></div></body></html>',
    'http://localhost/',
  );
  const originalConsoleError = console.error;
  const duplicateKeyWarnings = [];

  try {
    console.error = (...args) => {
      const message = args.map((value) => String(value)).join(' ');
      if (/same key|unique.*key/i.test(message)) {
        duplicateKeyWarnings.push(message);
      }
    };

    const { PortfolioContext, Skills } = await loadModules(t);
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(testDocument.getElementById('root'));
    const value = portfolioValue({
      skillGroups: [
        { label: 'Languages', items: ['JavaScript', 'JavaScript'] },
        { label: 'Languages', items: ['JavaScript'] },
      ],
    });

    await React.act(async () => {
      root.render(
        React.createElement(
          PortfolioContext.Provider,
          { value },
          React.createElement(Skills),
        ),
      );
    });

    const renderedItems = [...testDocument.querySelectorAll('#skills li')];
    assert.deepEqual(
      renderedItems.map((item) => item.textContent),
      ['JavaScript', 'JavaScript', 'JavaScript'],
    );
    assert.deepEqual(duplicateKeyWarnings, []);

    await React.act(async () => {
      root.unmount();
    });
  } finally {
    console.error = originalConsoleError;
    restore();
  }
});

test('all three projects render in order with only genuinely available actions', async (t) => {
  const { PortfolioContext, Work } = await loadModules(t);
  const html = renderWith(PortfolioContext, Work, portfolioValue());

  assertInOrder(html, ['HostelCare', 'AquaPredict', 'RPA Expense Tracker']);
  assert.equal((html.match(/View live demo/g) ?? []).length, 1);
  assert.match(html, /href="https:\/\/example\.com\/aquapredict-demo"/);
  assert.equal((html.match(/View source code/g) ?? []).length, 3);
  assert.equal((html.match(/Built with/g) ?? []).length, 3);
  assert.match(html, /for AquaPredict \(opens in a new tab\)/);
});

test('keeps legacy extra featured projects visible in the supporting grid', async (t) => {
  const { PortfolioContext, Work } = await loadModules(t);
  const value = portfolioValue();
  value.projects = value.projects.map((project) =>
    project.id === 'aquapredict' ? { ...project, featured: true } : project,
  );

  const html = renderWith(PortfolioContext, Work, value);

  assertInOrder(html, ['HostelCare', 'AquaPredict', 'RPA Expense Tracker']);
  assert.equal((html.match(/Built with/g) ?? []).length, 3);
  assert.equal((html.match(/View source code/g) ?? []).length, 3);
});

test('the unavailable work state retries the portfolio request and recovers', async (t) => {
  const { document: testDocument, restore } = installTestDocument(
    '<!doctype html><html><head><title>Portfolio retry</title></head><body><div id="root"></div></body></html>',
    'http://localhost/',
  );
  const originalFetch = globalThis.fetch;
  const originalConsoleWarn = console.warn;
  const requests = [];
  let releaseRetry;
  let root;

  globalThis.fetch = (url, init = {}) => {
    requests.push({ url, signal: init.signal });

    if (requests.length === 1) {
      return Promise.resolve({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            message: 'The portfolio database is unavailable.',
            code: 'DATABASE_UNAVAILABLE',
          },
        }),
      });
    }

    return new Promise((resolve) => {
      releaseRetry = () =>
        resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              profile: { name: 'Pradeep Chavan', email: 'owner@example.com' },
              projects: [
                {
                  slug: 'hostelcare',
                  title: 'HostelCare',
                  repoUrl: 'https://github.com/example/hostelcare',
                  order: 1,
                },
              ],
              skills: [],
              education: [],
              certifications: [],
              achievements: [],
            },
          }),
        });
    });
  };
  console.warn = () => {};

  try {
    const { PortfolioProvider, Work } = await loadModules(t);
    const { createRoot } = await import('react-dom/client');
    const container = testDocument.getElementById('root');
    root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          PortfolioProvider,
          null,
          React.createElement(Work),
        ),
      );
    });

    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.match(container.textContent, /Selected work is temporarily unavailable/);
    assert.match(container.textContent, /The rest of the portfolio is still available/);

    const retryButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent.trim() === 'Try again',
    );
    assert.ok(retryButton, 'expected a Try again button');
    assert.match(retryButton.className, /min-h-\[48px\]/);
    assert.match(retryButton.className, /min-w-\[48px\]/);
    assert.match(retryButton.className, /focus-visible:ring-2/);

    await React.act(async () => {
      retryButton.click();
    });

    assert.match(container.textContent, /Loading selected work/);
    assert.doesNotMatch(container.textContent, /temporarily unavailable/);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, '/api/portfolio');
    assert.equal(requests[1].url, '/api/portfolio');
    assert.notEqual(requests[0].signal, requests[1].signal);
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(requests[1].signal.aborted, false);
    assert.equal(typeof releaseRetry, 'function');

    await React.act(async () => {
      releaseRetry();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.match(container.textContent, /HostelCare/);
    assert.doesNotMatch(container.textContent, /temporarily unavailable/);
    assert.doesNotMatch(container.textContent, /Try again/);
    assert.equal(requests.length, 2);
  } finally {
    if (root) {
      await React.act(async () => {
        root.unmount();
      });
    }

    globalThis.fetch = originalFetch;
    console.warn = originalConsoleWarn;
    restore();
  }
});

test('the hero states the identity, positioning, actions, and profile links', async (t) => {
  const { PortfolioContext, Hero } = await loadModules(t);
  const html = renderWith(PortfolioContext, Hero, portfolioValue());

  assert.match(html, /<h1[^>]*id="hero-title"[^>]*><span class="sr-only">Pradeep Chavan\.<\/span>/);
  assert.match(html, /Hello, I’m/);
  assert.match(html, /Computer Science Engineering Student/);
  assert.match(html, /Full-Stack Developer/);
  assert.match(html, /I turn practical problems into full-stack applications/);
  assert.match(html, /View projects/);
  assert.match(html, /Download resume/);
  assert.match(html, /download="Pradeep_Chavan_Resume\.pdf"/);
  assert.match(html, /animate-blink/);
  assert.match(html, /href="https:\/\/github\.com\/example"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/example\/"/);
  assert.doesNotMatch(html, /I&#x27;m Pradeep, a Computer Science Engineering student/);
});

test('cleared optional profile fields render nothing instead of bundled fallback copy', async (t) => {
  const { PortfolioContext, Hero, Navbar, Footer, Contact, Work, About } = await loadModules(t);
  const value = portfolioValue({
    profile: {
      name: 'Pradeep Chavan',
      email: 'owner@example.com',
      intro: null,
      bio: [],
      headline: null,
      location: null,
      github: null,
      linkedin: null,
      leetcode: null,
      resume: null,
    },
  });

  const hero = renderWith(PortfolioContext, Hero, value);
  assert.equal(hero.includes(fallbackProfile.intro), false);
  assert.doesNotMatch(hero, /Download resume/);
  assert.equal(hero.includes(fallbackProfile.github), false);
  assert.equal(hero.includes(fallbackProfile.linkedin), false);

  const navbar = renderWith(PortfolioContext, Navbar, value);
  assert.doesNotMatch(navbar, /Download resume/);

  const footer = renderWith(PortfolioContext, Footer, value);
  assert.doesNotMatch(footer, /GitHub|LinkedIn|LeetCode/);
  assert.match(footer, /Pradeep Chavan/);

  const contact = renderWith(PortfolioContext, Contact, value);
  assert.equal(contact.includes(fallbackProfile.location), false);
  assert.match(contact, /owner@example\.com/);

  const work = renderWith(PortfolioContext, Work, value);
  assert.doesNotMatch(work, /Browse GitHub/);
  assert.doesNotMatch(work, /More projects and code are on GitHub/);

  const about = renderWith(PortfolioContext, About, value);
  for (const paragraph of fallbackProfile.bio) {
    assert.equal(about.includes(paragraph), false);
  }
});

test('About does not repeat education even when education records are present', async (t) => {
  const { PortfolioContext, About } = await loadModules(t);
  const html = renderWith(PortfolioContext, About, portfolioValue());

  assert.match(html, /Full-stack developer focused on practical software/);
  assert.match(html, /clear problem-solving, maintainable code/);
  assert.doesNotMatch(html, /Gogte|8\.61|2023|2027|Computer Science and Engineering/);
});

test('Background presents the degree, score, location, and both certificate links', async (t) => {
  const { PortfolioContext, Background } = await loadModules(t);
  const html = renderWith(PortfolioContext, Background, portfolioValue());

  assert.match(html, /K\.L\.S\. Gogte Institute of Technology/);
  assert.match(html, /Bachelor of Engineering \(B\.E\.\)/);
  assert.match(html, /Computer Science and Engineering/);
  assert.match(html, /2023–2027/);
  assert.match(html, /CGPA · 8\.61 \/ 10/);
  assert.match(html, /Belagavi, Karnataka, India/);
  assert.match(html, /Introduction to Front-End Development/);
  assert.match(html, /Programming with JavaScript/);
  assert.match(html, /href="https:\/\/example\.com\/certificates\/front-end"/);
  assert.match(html, /href="https:\/\/example\.com\/certificates\/javascript"/);
  assert.equal((html.match(/View credential/g) ?? []).length, 2);
});

test('optional Background content stays hidden when every collection is empty', async (t) => {
  const { PortfolioContext, Background } = await loadModules(t);
  const html = renderWith(
    PortfolioContext,
    Background,
    portfolioValue({ education: [], certifications: [], achievements: [] }),
  );

  assert.equal(html, '');
});
