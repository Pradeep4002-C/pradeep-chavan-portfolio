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
let AdminLayout;
let AdminAuthProvider;
let getBodyScrollLockCount;
let desktopMatches = false;

function installDom() {
  const nextDom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    {
      url: 'http://localhost/admin',
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

  window.matchMedia = (query) => ({
    media: query,
    matches: query.includes('1024px') ? desktopMatches : false,
    addEventListener() {},
    removeEventListener() {},
  });

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

  const layoutModule = await vite.ssrLoadModule('/src/admin/AdminLayout.jsx');
  const authModule = await vite.ssrLoadModule('/src/admin/AdminAuthContext.jsx');
  const scrollLockModule = await vite.ssrLoadModule('/src/components/bodyScrollLock.js');
  AdminLayout = layoutModule.default;
  AdminAuthProvider = authModule.AdminAuthProvider;
  getBodyScrollLockCount = scrollLockModule.getBodyScrollLockCount;

  globalThis.fetch = async (url) => {
    if (String(url) === '/api/auth/me') {
      return new Response(
        JSON.stringify({
          data: { admin: { id: 'admin-1', email: 'owner@example.com', name: 'Owner' } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    throw new Error(`Unexpected request in admin layout test: ${url}`);
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

async function mountLayout() {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: React.createElement(
          AdminAuthProvider,
          null,
          React.createElement(AdminLayout),
        ),
        children: [
          {
            index: true,
            element: React.createElement('div', null, 'Overview page'),
          },
          {
            path: 'projects',
            element: React.createElement('div', null, 'Projects page'),
          },
        ],
      },
    ],
    { initialEntries: ['/admin'] },
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

function menuButton() {
  return document.querySelector('button[aria-controls="admin-mobile-nav"]');
}

function findLink(label, scope = document) {
  return Array.from(scope.querySelectorAll('a')).find(
    (link) => link.textContent.replace(/\s+/g, ' ').trim() === label,
  );
}

async function openMenu() {
  await act(async () => {
    menuButton().click();
  });
  await flush();
}

test('the admin drawer uses a centred 48px icon, locks scrolling, and closes on backdrop', async (t) => {
  const { unmount } = await mountLayout();
  t.after(unmount);

  const toggle = menuButton();
  assert.ok(toggle);
  assert.ok(toggle.className.includes('size-12'));
  assert.ok(toggle.className.includes('place-items-center'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');

  await openMenu();

  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), 'Close navigation menu');
  const icon = toggle.querySelector('svg[data-menu-icon]');
  assert.equal(icon?.getAttribute('data-menu-icon'), 'close');
  assert.deepEqual(
    Array.from(icon.querySelectorAll('path')).map((path) => path.getAttribute('d')),
    ['M6 6 18 18', 'M18 6 6 18'],
  );

  const drawer = document.getElementById('admin-mobile-nav');
  assert.ok(drawer);
  assert.ok(drawer.className.includes('max-h-[calc(100dvh-4.5rem)]'));
  assert.ok(drawer.className.includes('overflow-y-auto'));
  assert.equal(document.body.style.overflow, 'hidden');

  const backdrop = document.querySelector('[data-admin-menu-backdrop]');
  assert.ok(backdrop, 'the drawer must render a backdrop');
  await act(async () => {
    backdrop.click();
  });
  await flush();

  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(menuButton().querySelector('svg[data-menu-icon]')?.getAttribute('data-menu-icon'), 'menu');
  assert.equal(document.getElementById('admin-mobile-nav'), null);
  assert.equal(document.body.style.overflow, '', 'closing must restore body scrolling');
  assert.equal(getBodyScrollLockCount(), 0);
});

test('Escape, the lg breakpoint, and route changes all close the admin drawer', async (t) => {
  const { router, unmount } = await mountLayout();
  t.after(unmount);

  await openMenu();
  assert.equal(document.body.style.overflow, 'hidden');

  await act(async () => {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  });
  await flush();

  assert.equal(document.getElementById('admin-mobile-nav'), null);
  assert.equal(document.activeElement, menuButton(), 'Escape must return focus to the toggle');
  assert.equal(document.body.style.overflow, '');

  await openMenu();
  desktopMatches = true;
  await act(async () => {
    window.dispatchEvent(new window.Event('resize'));
  });
  await flush();

  assert.equal(document.getElementById('admin-mobile-nav'), null);
  assert.equal(document.body.style.overflow, '');
  desktopMatches = false;

  await openMenu();
  await act(async () => {
    await router.navigate('/admin/projects');
  });
  await flush();

  assert.equal(router.state.location.pathname, '/admin/projects');
  assert.equal(document.getElementById('admin-mobile-nav'), null);
  assert.equal(document.body.style.overflow, '');
});

test('the admin drawer tracks the route title and releases its lock on Back', async (t) => {
  const { router, unmount } = await mountLayout();
  t.after(unmount);

  assert.equal(document.title, 'Admin overview — Pradeep Chavan');

  await openMenu();
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(getBodyScrollLockCount(), 1);

  // A history navigation can arrive while the drawer is open; the popstate
  // listener must close it even before the router has repainted the page.
  await act(async () => {
    window.dispatchEvent(new window.Event('popstate'));
  });
  await flush();

  assert.equal(document.getElementById('admin-mobile-nav'), null);
  assert.equal(document.body.style.overflow, '');
  assert.equal(getBodyScrollLockCount(), 0, 'an interrupted drawer must not leak the lock');

  await act(async () => {
    await router.navigate('/admin/projects');
  });
  await flush();

  assert.equal(document.title, 'Projects — Admin — Pradeep Chavan');
  assert.doesNotMatch(document.title, /undefined/);
});

test('a drawer link closes the panel and moves focus into the new page', async (t) => {
  const { router, unmount } = await mountLayout();
  t.after(unmount);

  await openMenu();
  const projectsLink = findLink('Projects', document.getElementById('admin-mobile-nav'));
  assert.ok(projectsLink);

  await act(async () => {
    projectsLink.click();
  });
  await flush();

  assert.equal(router.state.location.pathname, '/admin/projects');
  assert.equal(document.getElementById('admin-mobile-nav'), null);
  assert.equal(document.body.style.overflow, '');
  assert.equal(document.activeElement, document.querySelector('main'));
  assert.match(document.querySelector('main').textContent, /Projects page/);
});
