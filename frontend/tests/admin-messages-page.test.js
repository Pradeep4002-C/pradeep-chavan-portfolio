import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));

let dom;
let server;
let createRoot;
let act;
let AdminMessagesPage;
let AdminAuthProvider;
let Pagination;
let messageRows;
let fetchCalls;
const savedGlobals = new Map();
const originalFetch = globalThis.fetch;

function installDomGlobals(window) {
  const names = [
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'Node',
    'Element',
    'Event',
    'MouseEvent',
    'KeyboardEvent',
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

function installFetchMock() {
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input), 'https://portfolio.test');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
    fetchCalls.push({ path: `${url.pathname}${url.search}`, method, body });

    if (url.pathname === '/api/auth/me') {
      return jsonResponse({
        data: { admin: { id: 'admin-1', email: 'admin@example.com', name: 'Admin' } },
      });
    }

    if (url.pathname === '/api/admin/messages' && method === 'GET') {
      const read = url.searchParams.get('read') ?? 'all';
      const visible = messageRows.filter(
        (message) =>
          read === 'all' || (read === 'read' ? message.read : !message.read),
      );

      return jsonResponse({
        data: {
          messages: visible.map((message) => ({ ...message })),
          pagination: {
            total: visible.length,
            page: 1,
            pages: 1,
            hasPrev: false,
            hasNext: false,
          },
        },
      });
    }

    const messageMatch = url.pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
    if (messageMatch) {
      const id = decodeURIComponent(messageMatch[1]);
      const index = messageRows.findIndex((message) => message.id === id);
      assert.notEqual(index, -1);

      if (method === 'PATCH') {
        messageRows[index] = { ...messageRows[index], ...body };
        return jsonResponse({ data: { message: { ...messageRows[index] } } });
      }

      if (method === 'DELETE') {
        messageRows.splice(index, 1);
        return new Response(null, { status: 204 });
      }
    }

    return jsonResponse({ error: { message: 'Unhandled test request.' } }, 500);
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
    url: 'https://portfolio.test/admin/messages',
    pretendToBeVisual: true,
  });
  installDomGlobals(dom.window);

  const reactDomClient = await import('react-dom/client');
  const testUtils = await import('react-dom/test-utils');
  createRoot = reactDomClient.createRoot;
  act = React.act ?? testUtils.act;

  const pageModule = await server.ssrLoadModule('/src/admin/AdminMessagesPage.jsx');
  const authModule = await server.ssrLoadModule('/src/admin/AdminAuthContext.jsx');
  const uiModule = await server.ssrLoadModule('/src/admin/AdminUi.jsx');

  AdminMessagesPage = pageModule.default;
  AdminAuthProvider = authModule.AdminAuthProvider;
  Pagination = uiModule.Pagination;

  installFetchMock();
});

after(async () => {
  globalThis.fetch = originalFetch;
  await server.close();
  dom.window.close();
  restoreDomGlobals();
});

beforeEach(() => {
  fetchCalls = [];
  messageRows = [
    {
      id: 'm1',
      name: 'Alice',
      email: 'alice@example.com',
      subject: 'A question',
      message: 'Did u get my message',
      read: false,
      hidden: true,
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    },
    {
      id: 'm2',
      name: 'Bob',
      email: 'bob@example.com',
      subject: '',
      message: 'just to check u there',
      read: false,
      hidden: true,
      createdAt: '2026-01-03T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z',
    },
  ];
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

async function mountPage() {
  const { host, root } = createHost();
  await act(async () => {
    root.render(
      React.createElement(
        AdminAuthProvider,
        null,
        React.createElement(AdminMessagesPage),
      ),
    );
  });
  await flush();
  return { host, root };
}

function buttonByText(container, label) {
  return [...container.querySelectorAll('button')].find(
    (button) => button.textContent.trim() === label,
  );
}

function rowByText(container, name) {
  return [...container.querySelectorAll('li')].find((row) => row.textContent.includes(name));
}

async function click(element) {
  assert.ok(element, 'Expected the control to exist before clicking it.');
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

test('messages page hides bodies, persists View/Hide, syncs read, filters, refreshes, and deletes', async () => {
  const { host, root } = await mountPage();

  try {
    assert.match(host.textContent, /Messages/);
    assert.equal(host.querySelectorAll('[data-message-visibility="hidden"]').length, 2);
    assert.doesNotMatch(host.textContent, /Did u get my message/);
    assert.doesNotMatch(host.textContent, /just to check u there/);

    let alice = rowByText(host, 'Alice');
    assert.ok(alice);
    assert.match(alice.textContent, /Message body hidden/);
    assert.equal(
      buttonByText(alice, 'View message').getAttribute('aria-expanded'),
      'false',
    );
    assert.equal(
      buttonByText(alice, 'View message').getAttribute('aria-controls'),
      'admin-message-body-m1',
    );
    assert.equal(buttonByText(alice, 'Mark read').getAttribute('aria-pressed'), 'false');

    await click(buttonByText(alice, 'View message'));
    await flush();

    alice = rowByText(host, 'Alice');
    assert.match(alice.textContent, /Did u get my message/);
    assert.ok(buttonByText(alice, 'Hide message'));
    assert.equal(
      buttonByText(alice, 'Hide message').getAttribute('aria-expanded'),
      'true',
    );
    assert.equal(
      fetchCalls.filter((call) => call.method === 'PATCH').at(-1).body.hidden,
      false,
    );

    await click(buttonByText(alice, 'Hide message'));
    await flush();

    alice = rowByText(host, 'Alice');
    assert.doesNotMatch(alice.textContent, /Did u get my message/);
    assert.ok(buttonByText(alice, 'View message'));
    assert.equal(
      buttonByText(alice, 'View message').getAttribute('aria-expanded'),
      'false',
    );
    assert.equal(
      fetchCalls.filter((call) => call.method === 'PATCH').at(-1).body.hidden,
      true,
    );

    await click(buttonByText(alice, 'Mark read'));
    await flush();

    alice = rowByText(host, 'Alice');
    assert.ok([...alice.querySelectorAll('span')].some((span) => span.textContent === 'Read'));
    assert.equal(
      buttonByText(alice, 'Mark unread').getAttribute('aria-pressed'),
      'true',
    );
    assert.match(host.textContent, /Message marked as read/);
    assert.equal(
      fetchCalls.filter((call) => call.method === 'PATCH').at(-1).body.read,
      true,
    );

    const getsBeforeRefresh = fetchCalls.filter((call) => call.method === 'GET').length;
    await click(buttonByText(host, 'Refresh'));
    await flush();
    assert.equal(
      fetchCalls.filter((call) => call.method === 'GET').length,
      getsBeforeRefresh + 1,
    );

    await click(buttonByText(host, 'Unread'));
    await flush();
    assert.match(
      fetchCalls.filter((call) => call.method === 'GET').at(-1).path,
      /read=unread/,
    );
    assert.ok(rowByText(host, 'Bob'));
    assert.equal(rowByText(host, 'Alice'), undefined);
    assert.equal(buttonByText(host, 'Unread').getAttribute('aria-pressed'), 'true');

    await click(buttonByText(host, 'All'));
    await flush();

    await click(buttonByText(host, 'Read'));
    await flush();
    assert.match(
      fetchCalls.filter((call) => call.method === 'GET').at(-1).path,
      /read=read/,
    );
    assert.equal(buttonByText(host, 'Read').getAttribute('aria-pressed'), 'true');
    assert.ok(rowByText(host, 'Alice'));
    assert.equal(rowByText(host, 'Bob'), undefined);

    alice = rowByText(host, 'Alice');
    assert.equal(
      buttonByText(alice, 'Mark unread').getAttribute('aria-pressed'),
      'true',
    );
    await click(buttonByText(alice, 'Mark unread'));
    await flush();

    assert.equal(
      fetchCalls.filter((call) => call.method === 'PATCH').at(-1).body.read,
      false,
    );
    assert.equal(rowByText(host, 'Alice'), undefined);
    assert.match(host.textContent, /No read messages/);

    await click(buttonByText(host, 'All'));
    await flush();

    alice = rowByText(host, 'Alice');
    await click(buttonByText(alice, 'Delete'));
    assert.ok(document.querySelector('[role="alertdialog"]'));
    await click(buttonByText(document, 'Delete message'));
    await flush();

    assert.equal(rowByText(host, 'Alice'), undefined);
    assert.ok(rowByText(host, 'Bob'));
    assert.ok(fetchCalls.some((call) => call.method === 'DELETE' && call.path.endsWith('/m1')));
    assert.match(host.textContent, /was deleted/);
  } finally {
    await unmount(root, host);
  }
});

test('pagination buttons change pages and disable at the boundaries', async () => {
  const { host, root } = createHost();
  const changes = [];

  await act(async () => {
    root.render(
      React.createElement(Pagination, {
        page: 2,
        pages: 3,
        hasPrev: true,
        hasNext: true,
        onPage: (next) => changes.push(next),
        busy: false,
      }),
    );
  });

  await click(buttonByText(host, 'Previous'));
  await click(buttonByText(host, 'Next'));
  assert.deepEqual(changes, [1, 3]);

  await act(async () => {
    root.render(
      React.createElement(Pagination, {
        page: 1,
        pages: 1,
        hasPrev: false,
        hasNext: false,
        onPage: (next) => changes.push(next),
        busy: true,
      }),
    );
  });

  assert.equal(buttonByText(host, 'Previous').disabled, true);
  assert.equal(buttonByText(host, 'Next').disabled, true);
  assert.deepEqual(changes, [1, 3]);

  await unmount(root, host);
});
