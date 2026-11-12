import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import React from 'react';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

let dom;
let vite;
let act;
let createRoot;
let RouteErrorBoundary;
let RouteErrorView;
const originalConsoleError = console.error;

function installDom() {
  const nextDom = new JSDOM(
    '<!doctype html><html><head><title>Boundary test</title></head><body><div id="root"></div></body></html>',
    { url: 'http://localhost/', pretendToBeVisual: true },
  );
  const { window } = nextDom;
  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Node: window.Node,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    FocusEvent: window.FocusEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  };

  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }

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

  RouteErrorBoundary = (
    await vite.ssrLoadModule('/src/components/RouteErrorBoundary.jsx')
  ).default;
  RouteErrorView = (await vite.ssrLoadModule('/src/components/RouteErrorView.jsx')).default;
});

after(async () => {
  await vite?.close();
  dom?.window.close();
});

function findButton(label, scope = document) {
  return Array.from(scope.querySelectorAll('button')).find(
    (button) => button.textContent.replace(/\s+/g, ' ').trim() === label,
  );
}

function findLink(label, scope = document) {
  return Array.from(scope.querySelectorAll('a')).find(
    (link) => link.textContent.replace(/\s+/g, ' ').trim() === label,
  );
}

function Crash() {
  throw new Error('Deliberate render crash for the boundary test');
}

test('the public boundary replaces a crash with branded recovery actions', async (t) => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  let reloads = 0;

  // React prints caught render errors in development. Silence that expected
  // noise while still letting the assertion prove no raw stack reaches the DOM.
  console.error = () => {};
  try {
    await act(async () => {
      root.render(
        React.createElement(
          RouteErrorBoundary,
          { scope: 'public', onReload: () => { reloads += 1; } },
          React.createElement(Crash),
        ),
      );
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.match(document.body.textContent, /This page hit a snag\./);
  assert.match(document.body.textContent, /Unexpected error/);
  assert.match(document.body.textContent, /Something interrupted this page while it was loading\./);
  assert.doesNotMatch(document.body.textContent, /Unexpected Application Error/);
  assert.doesNotMatch(document.body.textContent, /Hey developer/);
  assert.doesNotMatch(document.body.textContent, /Deliberate render crash/);
  assert.equal(document.querySelector('[role="alert"]')?.textContent.includes('Something interrupted'), true);
  assert.equal(document.title, 'Something went wrong — Pradeep Chavan');

  const backLink = findLink('Back to portfolio');
  assert.ok(backLink, 'the public fallback must offer a portfolio route');
  assert.equal(backLink.getAttribute('href'), '/');

  const reloadButton = findButton('Reload page');
  assert.ok(reloadButton, 'the fallback must offer a reload action');
  await act(async () => {
    reloadButton.click();
  });
  assert.equal(reloads, 1);

  await act(async () => {
    root.unmount();
  });
  assert.equal(document.title, 'Boundary test', 'unmounting must restore the previous title');
});

test('the admin fallback offers dashboard recovery instead of the public route', async (t) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let reloads = 0;

  await act(async () => {
    root.render(
      React.createElement(RouteErrorView, {
        scope: 'admin',
        onReload: () => {
          reloads += 1;
        },
      }),
    );
  });

  assert.match(container.textContent, /Administrator error/);
  assert.match(container.textContent, /This page hit a snag\./);
  assert.doesNotMatch(container.textContent, /Unexpected Application Error/);

  const backLink = findLink('Back to admin', container);
  assert.ok(backLink, 'the admin fallback must offer a dashboard route');
  assert.equal(backLink.getAttribute('href'), '/admin');

  await act(async () => {
    findButton('Reload page', container).click();
  });
  assert.equal(reloads, 1);

  await act(async () => {
    root.unmount();
  });
  container.remove();
});

test('the admin router wires its error element and consumes the route error', () => {
  const adminRoot = readFileSync(
    new URL('../src/admin/AdminRoot.jsx', import.meta.url),
    'utf8',
  );
  const adminError = readFileSync(
    new URL('../src/admin/AdminRouteError.jsx', import.meta.url),
    'utf8',
  );

  assert.match(adminRoot, /errorElement:\s*<AdminRouteError\s*\/>/);
  assert.match(adminRoot, /import AdminRouteError from '\.\/AdminRouteError\.jsx';/);
  assert.match(adminError, /useRouteError\(\)/);
  assert.match(adminError, /<RouteErrorView scope="admin"\s*\/>/);
});
