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
let Dialog;
let ConfirmDialog;
let InactivityWarningDialog;

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

  const uiModule = await vite.ssrLoadModule('/src/admin/AdminUi.jsx');
  const warningModule = await vite.ssrLoadModule('/src/admin/InactivityWarningDialog.jsx');
  Dialog = uiModule.Dialog;
  ConfirmDialog = uiModule.ConfirmDialog;
  InactivityWarningDialog = warningModule.default;
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

test('an inactivity warning sits above an open dialog, owns Escape, and releases the lower layer', async () => {
  let lowerClosed = 0;
  let stayed = 0;
  let signedOut = 0;

  function Stack({ topOpen }) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        Dialog,
        { labelledBy: 'lower-heading', onClose: () => { lowerClosed += 1; } },
        React.createElement('h2', { id: 'lower-heading' }, 'Lower dialog'),
        React.createElement('button', { type: 'button' }, 'Lower action'),
      ),
      topOpen
        ? React.createElement(InactivityWarningDialog, {
            secondsRemaining: 30,
            onStaySignedIn: () => { stayed += 1; },
            onSignOut: () => { signedOut += 1; },
          })
        : null,
    );
  }

  const root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(React.createElement(Stack, { topOpen: true }));
  });
  await flush();

  const lower = document.querySelector('[data-dialog-layer="dialog"]');
  const top = document.querySelector('[data-dialog-layer="inactivity"]');
  assert.ok(lower);
  assert.ok(top);
  assert.equal(lower.hasAttribute('inert'), true, 'the lower dialog must be inert');
  assert.equal(top.hasAttribute('inert'), false, 'the top dialog must stay interactive');
  assert.equal(document.body.style.overflow, 'hidden');

  await act(async () => {
    document.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
  });
  await flush();

  assert.equal(stayed, 1, 'Escape must resolve the top dialog');
  assert.equal(signedOut, 0);
  assert.equal(lowerClosed, 0, 'the dialog underneath must not receive the key event');

  await act(async () => {
    root.render(React.createElement(Stack, { topOpen: false }));
  });
  await flush();

  assert.equal(document.querySelector('[data-dialog-layer="inactivity"]'), null);
  assert.equal(lower.hasAttribute('inert'), false, 'closing the top dialog restores the lower one');
  assert.equal(document.body.style.overflow, 'hidden', 'the remaining dialog keeps scrolling locked');

  await act(async () => {
    root.unmount();
  });
  assert.equal(document.body.style.overflow, '');
  assert.equal(document.getElementById('root').hasAttribute('inert'), false);
});

test('closing a confirmation and its lower dialog together restores the page trigger', async () => {
  const controls = { openLower: null, openTop: null };

  function StackedLayers() {
    const [lowerOpen, setLowerOpen] = React.useState(false);
    const [topOpen, setTopOpen] = React.useState(false);
    controls.openLower = setLowerOpen;
    controls.openTop = setTopOpen;

    return React.createElement(
      React.Fragment,
      null,
      React.createElement('button', { type: 'button', id: 'stack-opener' }, 'Open editor'),
      lowerOpen
        ? React.createElement(
            Dialog,
            { labelledBy: 'stack-lower-heading', onClose: () => setLowerOpen(false) },
            React.createElement('h2', { id: 'stack-lower-heading' }, 'Editor dialog'),
            React.createElement(
              'button',
              { type: 'button', id: 'stack-lower-cancel', onClick: () => setLowerOpen(false) },
              'Cancel editor',
            ),
          )
        : null,
      topOpen
        ? React.createElement(ConfirmDialog, {
            title: 'Discard unsaved changes?',
            message: 'Both layers close together.',
            onCancel: () => setTopOpen(false),
            onConfirm: () => {
              setTopOpen(false);
              setLowerOpen(false);
            },
          })
        : null,
    );
  }

  const root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(React.createElement(StackedLayers));
  });
  await flush();

  const opener = document.getElementById('stack-opener');
  opener.focus();

  await act(async () => {
    controls.openLower(true);
  });
  await flush();

  document.getElementById('stack-lower-cancel').focus();

  await act(async () => {
    controls.openTop(true);
  });
  await flush();
  assert.ok(document.querySelector('[role="alertdialog"]'));

  await act(async () => {
    controls.openTop(false);
    controls.openLower(false);
  });
  await flush();

  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.equal(
    document.activeElement,
    opener,
    'the control that opened the stack must regain focus',
  );
  assert.equal(document.body.style.overflow, '');
  assert.equal(document.getElementById('root').hasAttribute('inert'), false);

  await act(async () => {
    root.unmount();
  });
});

test('stacked confirmations generate unique heading and description ids', async () => {
  const root = createRoot(document.getElementById('root'));
  await act(async () => {
    root.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(ConfirmDialog, {
          title: 'First confirmation',
          message: 'First message',
          onCancel() {},
          onConfirm() {},
        }),
        React.createElement(ConfirmDialog, {
          title: 'Second confirmation',
          message: 'Second message',
          onCancel() {},
          onConfirm() {},
        }),
      ),
    );
  });
  await flush();

  const dialogs = Array.from(document.querySelectorAll('[role="alertdialog"]'));
  assert.equal(dialogs.length, 2);
  const headingIds = dialogs.map((dialog) => dialog.getAttribute('aria-labelledby'));
  const messageIds = dialogs.map((dialog) => dialog.getAttribute('aria-describedby'));

  assert.equal(new Set(headingIds).size, 2, 'each confirmation needs a unique heading id');
  assert.equal(new Set(messageIds).size, 2, 'each confirmation needs a unique description id');
  for (const id of [...headingIds, ...messageIds]) {
    assert.equal(document.getElementById(id)?.closest('[role="alertdialog"]') !== null, true);
  }

  await act(async () => {
    root.unmount();
  });
});
