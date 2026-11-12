import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

let dom;
let vite;
let React;
let act;
let createRoot;
let WorkflowStepBuilder;

function installDom() {
  const nextDom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    {
      url: 'http://localhost/admin/projects/new',
      pretendToBeVisual: true,
    },
  );
  const { window } = nextDom;

  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLInputElement: window.HTMLInputElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
    HTMLButtonElement: window.HTMLButtonElement,
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

  React = await import('react');
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

  const module = await vite.ssrLoadModule('/src/admin/WorkflowStepBuilder.jsx');
  WorkflowStepBuilder = module.default;
});

after(async () => {
  await vite?.close();
  dom?.window.close();
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function flush() {
  await act(async () => {
    await tick();
    await tick();
  });
}

function makeStep(id, title, description = '') {
  return { id, title, description, type: 'process' };
}

function Harness({ initialSteps }) {
  const [steps, setSteps] = React.useState(initialSteps);
  return React.createElement(WorkflowStepBuilder, {
    steps,
    onChange: setSteps,
    error: null,
  });
}

function findButton(label) {
  return Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent.replace(/\s+/g, ' ').trim() === label,
  );
}

test('removing a populated workflow step asks before discarding typed copy', async () => {
  const root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(
      React.createElement(Harness, {
        initialSteps: [
          makeStep('step-1', 'Visitor submits the form', 'Typed copy'),
          makeStep('step-2', 'API saves the record', 'Second description'),
        ],
      }),
    );
  });
  await flush();

  const removeSecond = document.querySelector('button[aria-label="Remove step 2"]');
  assert.ok(removeSecond);

  await act(async () => {
    removeSecond.click();
  });
  await flush();

  let dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'removing typed content must ask first');
  assert.match(dialog.textContent, /Remove this workflow step\?/);
  assert.match(dialog.textContent, /API saves the record/);
  assert.equal(document.querySelectorAll('li[class*="rounded-2xl"]').length >= 2, true);

  await act(async () => {
    findButton('Cancel').click();
  });
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.ok(document.getElementById('project-workflow-step-step-2-title'));
  assert.equal(document.getElementById('project-workflow-step-step-2-title').value, 'API saves the record');

  await act(async () => {
    document.querySelector('button[aria-label="Remove step 2"]').click();
  });
  await flush();
  dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog);

  await act(async () => {
    findButton('Remove step', dialog).click();
  });
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.equal(document.getElementById('project-workflow-step-step-2-title'), null);
  assert.equal(document.getElementById('project-workflow-step-step-1-title').value, 'Visitor submits the form');

  await act(async () => {
    root.unmount();
  });
});

test('an untouched workflow step is removed immediately', async () => {
  const root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(
      React.createElement(Harness, {
        initialSteps: [
          makeStep('step-1', 'Builder step'),
          makeStep('step-empty', ''),
          makeStep('step-2', 'Kept step'),
        ],
      }),
    );
  });
  await flush();

  await act(async () => {
    document.querySelector('button[aria-label="Remove step 2"]').click();
  });
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.equal(document.getElementById('project-workflow-step-step-empty-title'), null);
  assert.ok(document.getElementById('project-workflow-step-step-2-title'));

  await act(async () => {
    root.unmount();
  });
});
