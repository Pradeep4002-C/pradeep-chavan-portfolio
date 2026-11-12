import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const originalFetch = globalThis.fetch;

let dom;
let vite;
let React;
let act;
let createRoot;
let createMemoryRouter;
let RouterProvider;
let AdminLoginPage;
let AdminAuthProvider;

function installDom() {
  const nextDom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    {
      url: 'http://localhost/admin/login',
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
    resolve: {
      alias: [
        {
          find: /^react-router-dom$/,
          replacement: fileURLToPath(import.meta.resolve('react-router-dom')),
        },
        {
          find: /^react-router\/dom$/,
          replacement: fileURLToPath(import.meta.resolve('react-router/dom')),
        },
        {
          find: /^react-router$/,
          replacement: fileURLToPath(import.meta.resolve('react-router')),
        },
      ],
    },
  });

  const routerModule = await vite.ssrLoadModule('react-router-dom');
  createMemoryRouter = routerModule.createMemoryRouter;
  RouterProvider = routerModule.RouterProvider;

  const loginModule = await vite.ssrLoadModule('/src/admin/AdminLoginPage.jsx');
  const authModule = await vite.ssrLoadModule('/src/admin/AdminAuthContext.jsx');
  AdminLoginPage = loginModule.default;
  AdminAuthProvider = authModule.AdminAuthProvider;

  globalThis.fetch = async (url) => {
    if (String(url) === '/api/auth/me') {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
    throw new Error(`Unexpected request in admin login test: ${url}`);
  };
});

after(async () => {
  globalThis.fetch = originalFetch;
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

async function mountLogin() {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/login',
        element: React.createElement(
          AdminAuthProvider,
          null,
          React.createElement(AdminLoginPage),
        ),
      },
      {
        path: '/admin',
        element: React.createElement('div', null, 'Admin dashboard'),
      },
    ],
    { initialEntries: ['/admin/login'] },
  );

  const root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(React.createElement(RouterProvider, { router }));
    await tick();
    await tick();
  });

  return {
    router,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
    },
  };
}

function setValue(element, value) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(
    element,
    value,
  );
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function findButton(label) {
  return Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent.replace(/\s+/g, ' ').trim() === label,
  );
}

test('an empty sign-in focuses the first missing field and exposes its error', async (t) => {
  const { unmount } = await mountLogin();
  t.after(unmount);

  await act(async () => {
    findButton('Sign in').click();
  });
  await flush();

  const email = document.getElementById('admin-email');
  const password = document.getElementById('admin-password');
  assert.equal(document.activeElement, email, 'focus must move to the first invalid field');
  assert.equal(email.getAttribute('aria-invalid'), 'true');
  assert.match(document.getElementById('admin-email-error').textContent, /email address/i);
  assert.equal(password.getAttribute('aria-invalid'), 'true');
  assert.match(document.getElementById('admin-password-error').textContent, /password/i);
});

test('an invalid email is rejected before a request and receives focus', async (t) => {
  const { unmount } = await mountLogin();
  t.after(unmount);

  await act(async () => {
    setValue(document.getElementById('admin-email'), 'not-an-email');
    setValue(document.getElementById('admin-password'), 'secret');
  });

  await act(async () => {
    findButton('Sign in').click();
  });
  await flush();

  assert.equal(document.activeElement?.id, 'admin-email');
  assert.match(document.getElementById('admin-email-error').textContent, /valid email/i);
  assert.match(document.body.textContent, /Please fix the highlighted fields/);
});
