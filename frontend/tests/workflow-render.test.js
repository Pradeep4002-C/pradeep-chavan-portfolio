import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

async function loadModules(t) {
  const server = await createServer({
    root: frontendRoot,
    // The test only needs Vite's JSX module loader. Loading the application
    // config makes Vite walk parent directories in restricted environments,
    // which is unrelated to this renderer and can fail before it is exercised.
    configFile: false,
    esbuild: { jsx: 'automatic' },
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  const artwork = await server.ssrLoadModule('/src/components/WorkflowArtwork.jsx');
  const projectEntry = await server.ssrLoadModule('/src/components/ProjectEntry.jsx');
  return { WorkflowArtwork: artwork.default, ProjectEntry: projectEntry.default };
}

test('workflow renderer keeps semantic order, safe text, and a neutral fallback', async (t) => {
  const { WorkflowArtwork, ProjectEntry } = await loadModules(t);

  const html = renderToStaticMarkup(
    React.createElement(WorkflowArtwork, {
      workflow: {
        steps: [
          { id: 'step-one', title: 'Visitor submits a form', description: 'Typed input', type: 'input' },
          { id: 'step-two', title: 'API saves the record', description: '', type: 'backend' },
        ],
      },
    }),
  );

  assert.match(html, /<figure/);
  assert.match(html, /<ol/);
  assert.match(html, /2 steps/);
  assert.match(html, /Visitor submits a form/);
  assert.match(html, /Workflow diagram with 2 steps/);
  assert.ok(html.indexOf('Visitor submits a form') < html.indexOf('API saves the record'));

  const unsafe = renderToStaticMarkup(
    React.createElement(WorkflowArtwork, {
      workflow: {
        steps: [
          { id: 'step-one', title: '<script>alert(1)</script>', type: 'input' },
          { id: 'step-two', title: 'Safe second step', type: 'output' },
        ],
      },
    }),
  );

  assert.match(unsafe, /Neutral project illustration/);
  assert.doesNotMatch(unsafe, /<script>alert/);

  const neutral = renderToStaticMarkup(
    React.createElement(WorkflowArtwork, { workflow: { steps: [] } }),
  );

  assert.match(neutral, /Neutral project illustration/);
  assert.doesNotMatch(neutral, /<figure/);

  const supporting = renderToStaticMarkup(
    React.createElement(ProjectEntry, {
      project: {
        number: '02',
        category: 'Web application',
        name: 'Supporting workflow project',
        summary: 'Summary',
        description: 'Description',
        technologies: ['React'],
        href: 'https://example.com/supporting',
        linkLabel: 'Repository',
        artwork: 'workflow',
        workflow: {
          steps: [
            { id: 'step-one', title: 'Input arrives', type: 'input' },
            { id: 'step-two', title: 'Output returns', type: 'output' },
          ],
        },
      },
    }),
  );

  assert.match(supporting, /<figure/);
  assert.match(supporting, /Input arrives/);
  assert.match(supporting, /Output returns/);
  assert.doesNotMatch(supporting, /Neutral project illustration/);
});

test('project actions show a demo only when one is supplied, beside the repository link', async (t) => {
  const { ProjectEntry } = await loadModules(t);
  const project = {
    number: '01',
    category: 'Web application',
    name: 'Project with a demo',
    summary: 'Summary',
    description: 'Description',
    technologies: ['React'],
    href: 'https://example.com/source',
    demoHref: 'https://example.com/demo',
    linkLabel: 'View source code',
    artwork: 'expense',
  };

  const withDemo = renderToStaticMarkup(React.createElement(ProjectEntry, { project }));

  assert.match(withDemo, /View live demo/);
  assert.match(withDemo, /href="https:\/\/example\.com\/demo"/);
  assert.match(withDemo, /View source code/);
  assert.match(withDemo, /for Project with a demo \(opens in a new tab\)/);

  const withoutDemo = renderToStaticMarkup(
    React.createElement(ProjectEntry, { project: { ...project, demoHref: null } }),
  );

  assert.doesNotMatch(withoutDemo, /View live demo/);
  assert.match(withoutDemo, /View source code/);
});

test('a multi-paragraph description renders as readable paragraphs', async (t) => {
  const { ProjectEntry } = await loadModules(t);

  const html = renderToStaticMarkup(
    React.createElement(ProjectEntry, {
      project: {
        number: '01',
        category: 'Web application',
        name: 'Paragraph project',
        summary: 'Summary',
        description:
          'Students submit a request.\n\nAdministrators triage it.\n\nStaff resolve it.',
        technologies: ['React'],
        href: 'https://example.com/source',
        demoHref: null,
        linkLabel: 'View source code',
        artwork: 'expense',
      },
    }),
  );

  assert.match(
    html,
    /Students submit a request\.<\/p><p[^>]*>Administrators triage it\.<\/p><p[^>]*>Staff resolve it\./,
  );
  assert.match(html, /Built with/);
});
