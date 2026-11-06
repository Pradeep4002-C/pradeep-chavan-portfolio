import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

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
  const about = await server.ssrLoadModule('/src/sections/About.jsx');
  const background = await server.ssrLoadModule('/src/sections/Background.jsx');
  const navbar = await server.ssrLoadModule('/src/components/Navbar.jsx');
  const app = await server.ssrLoadModule('/src/App.jsx');

  return {
    PortfolioContext: context.PortfolioContext,
    Hero: hero.default,
    Work: work.default,
    About: about.default,
    Background: background.default,
    Navbar: navbar.default,
    App: app.default,
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
