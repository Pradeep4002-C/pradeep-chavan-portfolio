import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

let dom;
let server;
let createRoot;
let act;
let ResourceManager;
let AdminAuthProvider;
const savedGlobals = new Map();
const originalFetch = globalThis.fetch;

function installDomGlobals(window) {
  const names = [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLTextAreaElement',
    'HTMLButtonElement',
    'SVGElement',
    'Node',
    'Element',
    'Event',
    'InputEvent',
    'MouseEvent',
    'KeyboardEvent',
    'FocusEvent',
    'MutationObserver',
  ];

  for (const name of names) {
    savedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: window[name],
    });
  }

  for (const name of ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    savedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: window[name].bind(window),
    });
  }

  savedGlobals.set(
    'IS_REACT_ACT_ENVIRONMENT',
    Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'),
  );
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}

function restoreDomGlobals() {
  for (const [name, descriptor] of savedGlobals) {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete globalThis[name];
    }
  }
  savedGlobals.clear();
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeConfig() {
  return {
    key: 'skills',
    title: 'Skills',
    description: 'Skill groups shown in the public Skills section.',
    addLabel: 'Add skill group',
    singular: 'skill group',
    plural: 'skill groups',
    emptyTitle: 'No skill groups yet',
    emptyMessage: 'Add a skill group to publish skills in the Skills section.',
    api: {
      list: async () => [],
      create: async (payload) => ({ id: 'created', ...payload }),
      update: async (id, payload) => ({ id, ...payload }),
      remove: async () => {},
    },
    fields: [
      {
        name: 'label',
        label: 'Label',
        type: 'text',
        required: true,
        requiredMessage: 'Enter a label.',
        maxLength: 60,
        span: 2,
      },
    ],
    primary: (item) => item.label,
    secondary: () => '',
  };
}

before(async () => {
  server = await createServer({
    root: frontendRoot,
    configFile: false,
    esbuild: { jsx: 'automatic' },
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });

  dom = new JSDOM('<!doctype html><html><body><div id="root"></div><div id="host"></div></body></html>', {
    url: 'https://portfolio.test/admin/skills',
    pretendToBeVisual: true,
  });
  installDomGlobals(dom.window);

  const reactDomClient = await import('react-dom/client');
  const testUtils = await import('react-dom/test-utils');
  createRoot = reactDomClient.createRoot;
  act = React.act ?? testUtils.act;

  const managerModule = await server.ssrLoadModule('/src/admin/ResourceManager.jsx');
  const authModule = await server.ssrLoadModule('/src/admin/AdminAuthContext.jsx');
  ResourceManager = managerModule.default;
  AdminAuthProvider = authModule.AdminAuthProvider;

  globalThis.fetch = async (input) => {
    const url = new URL(String(input), 'https://portfolio.test');
    if (url.pathname === '/api/auth/me') {
      return jsonResponse({
        data: { admin: { id: 'admin-1', email: 'admin@example.com', name: 'Admin' } },
      });
    }
    return jsonResponse({ error: { message: 'Unexpected test request.' } }, 500);
  };
});

after(async () => {
  globalThis.fetch = originalFetch;
  await server.close();
  dom.window.close();
  restoreDomGlobals();
});

function createHost() {
  const host = document.createElement('div');
  document.getElementById('host').appendChild(host);
  return { host, root: createRoot(host) };
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function unmount(root, host) {
  await act(async () => {
    root.unmount();
  });
  host.remove();
}

async function mountManager() {
  const { host, root } = createHost();
  await act(async () => {
    root.render(
      React.createElement(
        AdminAuthProvider,
        null,
        React.createElement(ResourceManager, { config: makeConfig() }),
      ),
    );
  });
  await flush();
  return { host, root };
}

function buttonByText(container, label) {
  return [...container.querySelectorAll('button')].find(
    (button) => button.textContent.replace(/\s+/g, ' ').trim() === label,
  );
}

async function click(element) {
  assert.ok(element, 'Expected the control to exist before clicking it.');
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

async function setValue(element, value) {
  const prototype =
    element instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;

  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await flush();
}

test('discarding a dirty resource form uses the custom dialog and preserves the draft on cancel', async () => {
  const confirmCalls = [];
  dom.window.confirm = (message) => {
    confirmCalls.push(message);
    return false;
  };

  const { host, root } = await mountManager();

  try {
    assert.match(host.textContent, /No skill groups yet/);

    await click(buttonByText(host, 'Add skill group'));
    await flush();

    let input = document.getElementById('resource-skills-label');
    assert.ok(input, 'expected the create form to render');
    await setValue(input, 'Languages');

    await click(buttonByText(document, 'Cancel'));
    await flush();

    let dialog = document.querySelector('[role="alertdialog"]');
    assert.ok(dialog, 'expected the custom discard confirmation');
    assert.match(dialog.textContent, /Discard unsaved changes\?/);
    assert.match(dialog.textContent, /Your skill group edits have not been saved/);
    assert.deepEqual(confirmCalls, [], 'window.confirm must not be used');

    await click(buttonByText(dialog, 'Cancel'));
    await flush();

    assert.equal(document.querySelector('[role="alertdialog"]'), null);
    input = document.getElementById('resource-skills-label');
    assert.ok(input, 'cancel must return to the still-open form');
    assert.equal(input.value, 'Languages', 'cancel must preserve the draft');
    assert.deepEqual(confirmCalls, []);

    await click(buttonByText(document, 'Cancel'));
    await flush();

    dialog = document.querySelector('[role="alertdialog"]');
    assert.ok(dialog, 'expected the confirmation again');
    await click(buttonByText(dialog, 'Discard changes'));
    await flush();

    assert.equal(document.querySelector('[role="alertdialog"]'), null);
    assert.equal(document.getElementById('resource-skills-label'), null);
    assert.ok(buttonByText(host, 'Add skill group'), 'the list view must return');
    assert.deepEqual(confirmCalls, []);
  } finally {
    await unmount(root, host);
  }
});

test('an untouched resource form closes without a discard dialog', async () => {
  const { host, root } = await mountManager();

  try {
    await click(buttonByText(host, 'Add skill group'));
    await flush();
    assert.ok(document.getElementById('resource-skills-label'));

    await click(buttonByText(document, 'Cancel'));
    await flush();

    assert.equal(document.querySelector('[role="alertdialog"]'), null);
    assert.equal(document.getElementById('resource-skills-label'), null);
    assert.ok(buttonByText(host, 'Add skill group'));
  } finally {
    await unmount(root, host);
  }
});
