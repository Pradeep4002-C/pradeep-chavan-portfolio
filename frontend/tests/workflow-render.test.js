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
