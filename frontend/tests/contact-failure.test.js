import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after, afterEach, before } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

/*
 * Interaction tests for the public contact form: one request per synchronous
 * double submit, an assertive error announcement, a released busy state, and a
 * draft that survives transport and server failures. jsdom + Vite's SSR loader
 * exercise the real component with the real API client.
 */
const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const originalFetch = globalThis.fetch;

let dom;
let vite;
let React;
let act;
let createRoot;
let Contact;
let PortfolioContext;

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
    localStorage: window.localStorage,
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

  const contactModule = await vite.ssrLoadModule('/src/sections/Contact.jsx');
  const contextModule = await vite.ssrLoadModule('/src/PortfolioContext.jsx');
  Contact = contactModule.default;
  PortfolioContext = contextModule.PortfolioContext;
});

after(async () => {
  await vite?.close();
  dom?.window.close();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function flush() {
  await act(async () => {
    await tick();
    await tick();
    await tick();
  });
}

const portfolio = {
  profile: { email: 'owner@example.com', location: 'Pune, India' },
  projects: [],
  skillGroups: [],
  education: [],
  certifications: [],
  achievements: [],
  status: 'ready',
};

async function mountContact() {
  const container = document.getElementById('root');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(
        PortfolioContext.Provider,
        { value: portfolio },
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

function setValue(element, value) {
  const prototype =
    element instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;

  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

const draft = {
  'contact-name': 'Test Visitor',
  'contact-email': 'visitor@example.com',
  'contact-subject': 'A question',
  'contact-message': 'This draft must never disappear on a failed send.',
};

async function fillDraft() {
  await act(async () => {
    for (const [id, value] of Object.entries(draft)) {
      assert.ok(document.getElementById(id), `expected field ${id}`);
      setValue(document.getElementById(id), value);
    }
  });
  await flush();
}

function submitForm() {
  const form = document.querySelector('#contact form');
  assert.ok(form, 'expected the contact form');
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

function submitButton() {
  return Array.from(document.querySelectorAll('#contact button')).find((button) =>
    /Send message|Sending/.test(button.textContent),
  );
}

function assertDraftPreserved() {
  for (const [id, value] of Object.entries(draft)) {
    assert.equal(document.getElementById(id).value, value, `${id} draft must survive`);
  }
}

test('a transport failure announces an alert, releases busy state, preserves the draft, and can retry', async (t) => {
  const calls = [];
  let fail = true;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method, body: init.body });
    if (fail) {
      throw new TypeError('Failed to fetch');
    }
    return new Response(
      JSON.stringify({ data: { message: 'Thanks — your message was received.' } }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const { unmount } = await mountContact();
  t.after(unmount);

  await fillDraft();

  await act(async () => {
    submitForm();
  });
  await flush();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/contact');
  assert.equal(calls[0].method, 'POST');

  const alert = document.querySelector('#contact [role="alert"]');
  assert.ok(alert, 'a failed send must expose an alert region');
  assert.match(alert.textContent, /Could not reach the contact service/);

  assert.equal(submitButton().disabled, false, 'busy state must be released for retry');
  assert.equal(submitButton().getAttribute('aria-busy'), 'false');
  assertDraftPreserved();

  fail = false;
  await act(async () => {
    submitForm();
  });
  await flush();

  assert.equal(calls.length, 2);
  assert.equal(document.querySelector('#contact [role="alert"]').textContent.trim(), '');
  assert.match(
    document.querySelector('#contact [role="status"]').textContent,
    /Thanks — your message was received\./,
  );
  for (const id of Object.keys(draft)) {
    assert.equal(document.getElementById(id).value, '', `${id} must clear after success`);
  }
});

test('a 500 response keeps every typed value and explains the server error', async (t) => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message: 'The contact service could not save your message.',
          code: 'SERVICE_UNAVAILABLE',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );

  const { unmount } = await mountContact();
  t.after(unmount);

  await fillDraft();

  await act(async () => {
    submitForm();
  });
  await flush();

  const alert = document.querySelector('#contact [role="alert"]');
  assert.match(alert.textContent, /could not save your message/);
  assert.equal(submitButton().disabled, false);
  assertDraftPreserved();
});

test('two synchronous submit events send exactly one request', async (t) => {
  const calls = [];
  let resolveRequest;
  globalThis.fetch = (url, init = {}) => {
    calls.push({ url: String(url), method: init.method });
    return new Promise((resolve) => {
      resolveRequest = () =>
        resolve(
          new Response(JSON.stringify({ data: { message: 'Sent once.' } }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
    });
  };

  const { unmount } = await mountContact();
  t.after(unmount);

  await fillDraft();

  // Both events are dispatched before React can commit the `isSubmitting`
  // render, so only the synchronous ref guard can stop the duplicate.
  await act(async () => {
    submitForm();
    submitForm();
  });
  await flush();

  assert.equal(calls.length, 1, 'a same-tick double submit must send one message');
  assert.equal(submitButton().disabled, true);
  assert.equal(submitButton().getAttribute('aria-busy'), 'true');
  assertDraftPreserved();

  resolveRequest();
  await flush();
  assert.match(
    document.querySelector('#contact [role="status"]').textContent,
    /Sent once\./,
  );
});
