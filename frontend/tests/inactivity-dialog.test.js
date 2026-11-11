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
let InactivityWarningDialog;
let useInactivityLogout;
let createActivitySignal;
const savedGlobals = new Map();

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
    'StorageEvent',
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
    url: 'https://portfolio.test/admin',
    pretendToBeVisual: true,
  });
  installDomGlobals(dom.window);

  const reactDomClient = await import('react-dom/client');
  const testUtils = await import('react-dom/test-utils');
  createRoot = reactDomClient.createRoot;
  act = React.act ?? testUtils.act;

  const dialogModule = await server.ssrLoadModule('/src/admin/InactivityWarningDialog.jsx');
  const hookModule = await server.ssrLoadModule('/src/admin/useInactivityLogout.js');
  const inactivityModule = await server.ssrLoadModule('/src/admin/inactivity.js');

  InactivityWarningDialog = dialogModule.default;
  useInactivityLogout = hookModule.useInactivityLogout;
  createActivitySignal = inactivityModule.createActivitySignal;
});

after(async () => {
  await server.close();
  dom.window.close();
  restoreDomGlobals();
});

function createHost() {
  const host = document.createElement('div');
  document.getElementById('host').appendChild(host);
  return { host, root: createRoot(host) };
}

async function unmount(root, host) {
  await act(async () => {
    root.unmount();
  });
  host.remove();
}

function buttonByText(container, label) {
  return [...container.querySelectorAll('button')].find(
    (button) => button.textContent.trim() === label,
  );
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

function createFakeClock() {
  let current = 0;
  let nextId = 1;
  const timers = new Map();

  return {
    now: () => current,
    schedule(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, at: current + Math.max(0, delay) });
      return id;
    },
    cancel(id) {
      timers.delete(id);
    },
    advance(ms) {
      const target = current + ms;

      for (;;) {
        let selected = null;
        for (const [id, timer] of timers) {
          if (timer.at <= target && (!selected || timer.at < selected.timer.at)) {
            selected = { id, timer };
          }
        }

        if (!selected) {
          break;
        }

        timers.delete(selected.id);
        current = selected.timer.at;
        selected.timer.callback();
      }

      current = target;
    },
  };
}

test('warning dialog renders an accessible countdown and both decisions', async () => {
  const { host, root } = createHost();

  await act(async () => {
    root.render(
      React.createElement(InactivityWarningDialog, {
        secondsRemaining: 60,
        onStaySignedIn: () => {},
        onSignOut: () => {},
      }),
    );
  });

  let dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog);
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  assert.match(dialog.textContent, /60s/);
  assert.ok(buttonByText(dialog, 'Stay signed in'));
  assert.ok(buttonByText(dialog, 'Sign out now'));

  await act(async () => {
    root.render(
      React.createElement(InactivityWarningDialog, {
        secondsRemaining: 1,
        onStaySignedIn: () => {},
        onSignOut: () => {},
      }),
    );
  });

  dialog = document.querySelector('[role="alertdialog"]');
  assert.match(dialog.textContent, /1s/);

  await unmount(root, host);
  assert.equal(document.querySelector('[role="alertdialog"]'), null);
});

test('dialog buttons invoke their exact handlers', async () => {
  const { host, root } = createHost();
  let stayed = 0;
  let signedOut = 0;

  await act(async () => {
    root.render(
      React.createElement(InactivityWarningDialog, {
        secondsRemaining: 42,
        onStaySignedIn: () => {
          stayed += 1;
        },
        onSignOut: () => {
          signedOut += 1;
        },
      }),
    );
  });

  const dialog = document.querySelector('[role="alertdialog"]');
  await click(buttonByText(dialog, 'Stay signed in'));
  assert.equal(stayed, 1);
  assert.equal(signedOut, 0);

  await click(buttonByText(dialog, 'Sign out now'));
  assert.equal(stayed, 1);
  assert.equal(signedOut, 1);

  await unmount(root, host);
});

test('hook warns, counts down, resets on stay, accepts cross-tab activity, and signs out', async () => {
  const clock = createFakeClock();
  let idleCalls = 0;

  function Probe() {
    const state = useInactivityLogout(
      () => {
        idleCalls += 1;
      },
      {
        timeoutMs: 120_000,
        warningMs: 60_000,
        storageKey: 'qa-activity',
        syncIntervalMs: 0,
        tickMs: 1000,
        schedule: clock.schedule,
        cancel: clock.cancel,
        now: clock.now,
      },
    );

    return React.createElement(
      'div',
      null,
      React.createElement('output', { 'data-warning': state.warningOpen ? 'open' : 'closed' }),
      React.createElement('output', { 'data-seconds': String(state.secondsRemaining) }),
      React.createElement('button', { type: 'button', onClick: state.staySignedIn }, 'stay'),
      React.createElement('button', { type: 'button', onClick: state.signOutNow }, 'out'),
    );
  }

  const { host, root } = createHost();
  await act(async () => {
    root.render(React.createElement(Probe));
  });

  const warningState = () => host.querySelector('[data-warning]').getAttribute('data-warning');
  const seconds = () => host.querySelector('[data-seconds]').getAttribute('data-seconds');

  assert.equal(warningState(), 'closed');

  await act(async () => {
    clock.advance(60_000);
  });
  assert.equal(warningState(), 'open');
  assert.equal(seconds(), '60');

  await act(async () => {
    clock.advance(1000);
  });
  assert.equal(seconds(), '59');

  await click(buttonByText(host, 'stay'));
  assert.equal(warningState(), 'closed');

  await act(async () => {
    clock.advance(60_000);
  });
  assert.equal(warningState(), 'open');

  const storageEvent = new window.StorageEvent('storage', {
    key: 'qa-activity',
    newValue: createActivitySignal(clock.now() + 1000, 'other-tab'),
  });
  await act(async () => {
    window.dispatchEvent(storageEvent);
  });
  assert.equal(warningState(), 'closed');

  await act(async () => {
    clock.advance(60_000);
  });
  assert.equal(warningState(), 'open');

  await click(buttonByText(host, 'out'));
  assert.equal(warningState(), 'closed');
  assert.equal(idleCalls, 1);

  await act(async () => {
    clock.advance(1_000_000);
  });
  assert.equal(idleCalls, 1);

  await unmount(root, host);
});
