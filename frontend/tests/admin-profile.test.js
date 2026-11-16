import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test, { after, afterEach, before } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

/*
 * This is a real browser-DOM interaction test. The project otherwise tests
 * plain functions and server rendering, so jsdom supplies the document that
 * react-dom/client needs. React, React DOM, and React Router are imported only
 * after the DOM globals exist, and Vite's SSR module loader provides the same
 * component modules the application uses.
 */
const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const EXACT_UNSAVED_MESSAGE =
  'You have unsaved changes. Are you sure you want to discard them?';

const initialProfile = {
  name: 'Pradeep Chavan',
  email: 'owner@example.com',
  headline: 'Full-stack developer',
  intro: 'I build useful software.',
  bio: ['First paragraph.', 'Second paragraph.'],
  location: 'Pune, India',
  github: 'https://github.com/example',
  linkedin: 'https://www.linkedin.com/in/example',
  leetcode: 'https://leetcode.com/u/example',
  resumePath: 'resume.pdf',
};

const originalFetch = globalThis.fetch;

let dom;
let vite;
let React;
let act;
let createRoot;
let createMemoryRouter;
let RouterProvider;
let AdminProfilePage;
let AdminAuthProvider;
let UNSAVED_PROFILE_MESSAGE;

function installDom() {
  const nextDom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    {
      url: 'http://localhost/admin/profile',
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
    // The browser build uses react-router's ESM entries. SSR otherwise
    // resolves its CommonJS entries, splitting the router context that
    // `useBlocker` and `RouterProvider` must share.
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

  const profileModule = await vite.ssrLoadModule('/src/admin/AdminProfilePage.jsx');
  const authModule = await vite.ssrLoadModule('/src/admin/AdminAuthContext.jsx');
  AdminProfilePage = profileModule.default;
  UNSAVED_PROFILE_MESSAGE = profileModule.UNSAVED_PROFILE_MESSAGE;
  AdminAuthProvider = authModule.AdminAuthProvider;
});

after(async () => {
  await vite?.close();
  dom?.window.close();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  window.sessionStorage.clear();
  window.localStorage.clear();
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Minimal stand-in for the two endpoints these components call. The stored
 * profile is mutable so an accepted Reload can prove it refetched, and every
 * call is recorded so a declined Reload can prove it did not.
 */
function mockProfileApi(profile = initialProfile) {
  const calls = [];
  let stored = {
    ...profile,
    bio: [...profile.bio],
  };

  globalThis.fetch = async (url, init = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({ url: String(url), method, body: init.body });

    if (String(url) === '/api/auth/me') {
      return jsonResponse({
        data: {
          admin: { id: 'admin-1', email: 'owner@example.com', name: 'Owner' },
        },
      });
    }

    if (String(url) === '/api/admin/profile') {
      if (method === 'PUT') {
        const body = JSON.parse(init.body);
        stored = {
          ...stored,
          ...body,
          bio: Array.isArray(body.bio) ? [...body.bio] : [],
        };
      }
      return jsonResponse({ data: { profile: stored } });
    }

    throw new Error(`Unexpected request in admin profile test: ${method} ${url}`);
  };

  return {
    calls,
    profileRequests() {
      return calls.filter(
        (call) => call.url === '/api/admin/profile' && call.method === 'GET',
      );
    },
    putRequests() {
      return calls.filter(
        (call) => call.url === '/api/admin/profile' && call.method === 'PUT',
      );
    },
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function flush() {
  await act(async () => {
    await tick();
    await tick();
    await tick();
  });
}

async function mountProfile() {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/profile',
        element: React.createElement(
          AdminAuthProvider,
          null,
          React.createElement(AdminProfilePage),
        ),
      },
      {
        path: '/admin',
        element: React.createElement('div', null, 'Admin home'),
      },
    ],
    { initialEntries: ['/admin/profile'] },
  );

  const container = document.getElementById('root');
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(RouterProvider, { router }));
    await tick();
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

function findButton(label, scope = document) {
  return Array.from(scope.querySelectorAll('button')).find(
    (button) => button.textContent.replace(/\s+/g, ' ').trim() === label,
  );
}

function setValue(element, value) {
  const prototype =
    element instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;

  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

async function editField(id, value) {
  const element = document.getElementById(id);
  assert.ok(element, `expected field ${id} to be rendered`);

  await act(async () => {
    setValue(element, value);
  });
  await flush();
}

async function editFirstBio(value) {
  const element = document.querySelector('textarea[id^="profile-bio-"]');
  assert.ok(element, 'expected a biography textarea to be rendered');

  await act(async () => {
    setValue(element, value);
  });
  await flush();
}

function unloadWasPrevented() {
  const event = new window.Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

async function navigate(router, path) {
  let navigation;
  await act(async () => {
    navigation = router.navigate(path);
  });
  await flush();
  return navigation;
}

test('tracks field edits, warns before unload, and blocks navigation until discarded', async (t) => {
  mockProfileApi();
  const { router, unmount } = await mountProfile();
  t.after(unmount);

  assert.equal(UNSAVED_PROFILE_MESSAGE, EXACT_UNSAVED_MESSAGE);
  assert.equal(document.getElementById('profile-name').value, 'Pradeep Chavan');
  assert.equal(unloadWasPrevented(), false, 'a loaded, untouched form must not warn');

  await editField('profile-name', 'Pradeep C');

  assert.equal(unloadWasPrevented(), true, 'editing a field must arm beforeunload');

  await navigate(router, '/admin');

  assert.equal(router.state.location.pathname, '/admin/profile');
  const dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'in-app navigation must be blocked while dirty');
  assert.match(dialog.textContent, /Discard unsaved changes\?/);

  await act(async () => {
    findButton('Cancel').click();
  });
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.equal(router.state.location.pathname, '/admin/profile');
  assert.equal(document.getElementById('profile-name').value, 'Pradeep C');

  const allowed = await navigate(router, '/admin');

  const blockerDialog = document.querySelector('[role="alertdialog"]');
  assert.ok(
    findButton('Discard changes', blockerDialog),
    'a second navigation must block again',
  );

  await act(async () => {
    findButton('Discard changes', blockerDialog).click();
  });
  await flush();
  await allowed;

  assert.equal(router.state.location.pathname, '/admin');
  assert.match(document.body.textContent, /Admin home/);
});

test('marks a biography paragraph dirty and clears the snapshot after a successful save', async (t) => {
  const api = mockProfileApi();
  const { router, unmount } = await mountProfile();
  t.after(unmount);

  await editFirstBio('Rewritten paragraph.');

  assert.equal(
    unloadWasPrevented(),
    true,
    'editing a biography paragraph must arm beforeunload',
  );

  await navigate(router, '/admin');
  assert.ok(
    document.querySelector('[role="alertdialog"]'),
    'a biography-only edit must block navigation',
  );

  await act(async () => {
    findButton('Cancel').click();
  });
  await flush();

  await act(async () => {
    findButton('Save profile').click();
  });
  await flush();
  await flush();

  const puts = api.putRequests();
  assert.equal(puts.length, 1);
  assert.deepEqual(JSON.parse(puts[0].body).bio, [
    'Rewritten paragraph.',
    'Second paragraph.',
  ]);
  assert.match(document.body.textContent, /Your profile was saved\./);

  assert.equal(
    unloadWasPrevented(),
    false,
    'a successful save must reset the baseline snapshot and disarm beforeunload',
  );

  await navigate(router, '/admin');

  assert.equal(
    document.querySelector('[role="alertdialog"]'),
    null,
    'saved edits must not trigger the navigation blocker',
  );
  assert.equal(router.state.location.pathname, '/admin');
});

test('two synchronous Save profile clicks send one PUT, and a failure preserves the draft', async (t) => {
  const calls = [];
  let failPut;
  globalThis.fetch = async (url, init = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({ url: String(url), method });

    if (String(url) === '/api/auth/me') {
      return jsonResponse({
        data: { admin: { id: 'admin-1', email: 'owner@example.com', name: 'Owner' } },
      });
    }

    if (String(url) === '/api/admin/profile' && method === 'GET') {
      return jsonResponse({ data: { profile: initialProfile } });
    }

    if (String(url) === '/api/admin/profile' && method === 'PUT') {
      return new Promise((resolve, reject) => {
        failPut = () => reject(new TypeError('socket closed'));
      });
    }

    throw new Error(`Unexpected request in admin profile test: ${method} ${url}`);
  };

  const { unmount } = await mountProfile();
  t.after(unmount);

  await editField('profile-name', 'Draft Name');
  await editField('profile-headline', 'Draft headline');

  const save = findButton('Save profile');
  await act(async () => {
    save.click();
    save.click();
  });
  await flush();

  const puts = calls.filter(
    (call) => call.url === '/api/admin/profile' && call.method === 'PUT',
  );
  assert.equal(puts.length, 1, 'a same-tick double click must send one PUT');

  const busyButton = findButton('Saving…');
  assert.ok(busyButton, 'the form must stay in its busy state while the PUT is pending');
  assert.equal(busyButton.disabled, true);

  await act(async () => {
    failPut();
  });
  await flush();

  const alert = document.querySelector('[role="alert"]');
  assert.ok(alert, 'a failed save must expose an alert');
  assert.match(alert.textContent, /could not reach the server/i);
  assert.equal(findButton('Save profile').disabled, false, 'busy state must be released');
  assert.equal(document.getElementById('profile-name').value, 'Draft Name');
  assert.equal(document.getElementById('profile-headline').value, 'Draft headline');
});

test('a 401 save keeps the typed profile, bypasses the blocker, and restores the draft', async (t) => {
  globalThis.fetch = async (url, init = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();

    if (String(url) === '/api/auth/me') {
      return jsonResponse({
        data: { admin: { id: 'admin-1', email: 'owner@example.com', name: 'Owner' } },
      });
    }

    if (String(url) === '/api/admin/profile' && method === 'GET') {
      return jsonResponse({ data: { profile: initialProfile } });
    }

    if (String(url) === '/api/admin/profile' && method === 'PUT') {
      return jsonResponse(
        { error: { code: 'UNAUTHENTICATED', message: 'Your session has expired.' } },
        401,
      );
    }

    throw new Error(`Unexpected request in admin profile test: ${method} ${url}`);
  };

  const first = await mountProfile();
  await editField('profile-name', 'Draft Name');
  await editField('profile-headline', 'Draft headline');

  await act(async () => {
    findButton('Save profile').click();
  });
  await flush();

  const savedDraft = JSON.parse(
    window.sessionStorage.getItem('pradeep-portfolio.admin.draft.profile'),
  );
  assert.equal(savedDraft.values.name, 'Draft Name');
  assert.equal(savedDraft.values.headline, 'Draft headline');

  // The session-expiry navigation must not be trapped by the dirty blocker.
  await navigate(first.router, '/admin');
  assert.equal(first.router.state.location.pathname, '/admin');
  assert.equal(document.querySelector('[role="alertdialog"]'), null);

  await first.unmount();

  globalThis.fetch = async (url, init = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();

    if (String(url) === '/api/auth/me') {
      return jsonResponse({
        data: { admin: { id: 'admin-1', email: 'owner@example.com', name: 'Owner' } },
      });
    }

    if (String(url) === '/api/admin/profile' && method === 'GET') {
      return jsonResponse({ data: { profile: initialProfile } });
    }

    throw new Error(`Unexpected request after re-login: ${method} ${url}`);
  };

  const second = await mountProfile();
  t.after(second.unmount);

  assert.equal(document.getElementById('profile-name').value, 'Draft Name');
  assert.equal(document.getElementById('profile-headline').value, 'Draft headline');
  assert.match(document.body.textContent, /restored the draft/i);
  const remainingDraft = JSON.parse(
    window.sessionStorage.getItem('pradeep-portfolio.admin.draft.profile'),
  );
  assert.equal(remainingDraft.values.name, 'Draft Name');
  assert.equal(
    remainingDraft.values.headline,
    'Draft headline',
    'the latest snapshot must stay available in this tab',
  );
});

test('a sign-out broadcast from another tab preserves the profile draft and releases the blocker', async (t) => {
  mockProfileApi();
  const { router, unmount } = await mountProfile();
  t.after(unmount);

  await editField('profile-headline', 'Cross-tab draft');

  await act(async () => {
    window.dispatchEvent(
      new window.StorageEvent('storage', {
        key: 'pradeep-portfolio.admin.auth',
        newValue: JSON.stringify({
          type: 'signed-out',
          reason: 'signed-out',
          at: Date.now(),
          nonce: 'test',
        }),
      }),
    );
  });
  await flush();

  const savedDraft = JSON.parse(
    window.sessionStorage.getItem('pradeep-portfolio.admin.draft.profile'),
  );
  assert.equal(savedDraft.values.headline, 'Cross-tab draft');

  await navigate(router, '/admin');
  assert.equal(router.state.location.pathname, '/admin');
  assert.equal(
    document.querySelector('[role="alertdialog"]'),
    null,
    'a remote sign-out must not leave the dirty blocker open',
  );
});

test('Remove paragraph asks for confirmation and leaves the draft untouched on cancel', async (t) => {
  const api = mockProfileApi();
  const { unmount } = await mountProfile();
  t.after(unmount);

  const biographyFields = () =>
    Array.from(document.querySelectorAll('textarea[id^="profile-bio-"]'));

  assert.equal(biographyFields().length, 2);
  assert.equal(biographyFields()[1].value, 'Second paragraph.');

  await act(async () => {
    findButton('Remove paragraph 2').click();
  });
  await flush();

  let dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'Remove paragraph must open the custom confirmation');
  assert.match(dialog.textContent, /Remove this paragraph\?/);
  assert.ok(findButton('Cancel', dialog));
  assert.ok(findButton('Remove paragraph', dialog));
  assert.equal(
    biographyFields().length,
    2,
    'opening the confirmation must not delete the paragraph yet',
  );

  await act(async () => {
    findButton('Cancel', dialog).click();
  });
  await flush();

  dialog = document.querySelector('[role="alertdialog"]');
  assert.equal(dialog, null);
  assert.equal(biographyFields().length, 2, 'cancelling must preserve the paragraph');
  assert.equal(biographyFields()[1].value, 'Second paragraph.');
  assert.equal(api.putRequests().length, 0);

  await act(async () => {
    findButton('Remove paragraph 2').click();
  });
  await flush();

  dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'the confirmation must appear again after cancelling');

  await act(async () => {
    findButton('Remove paragraph', dialog).click();
  });
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.equal(biographyFields().length, 1);
  assert.equal(biographyFields()[0].value, 'First paragraph.');
  assert.equal(api.putRequests().length, 0, 'removal is a draft edit until Save profile');
});

test('Discard changes stays disabled until dirty and restores the saved snapshot', async (t) => {
  const api = mockProfileApi();
  const { unmount } = await mountProfile();
  t.after(unmount);

  const discardButton = findButton('Discard changes');
  assert.ok(discardButton, 'the form must expose an explicit Discard changes action');
  assert.equal(discardButton.disabled, true, 'an untouched form cannot discard anything');

  await editField('profile-name', 'Changed Name');
  await editFirstBio('Changed biography.');

  assert.equal(discardButton.disabled, false, 'a dirty form must enable Discard changes');

  await act(async () => {
    discardButton.click();
  });
  await flush();

  let dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'Discard changes must open the custom confirmation');
  assert.match(dialog.textContent, /Discard unsaved changes\?/);
  assert.ok(dialog.textContent.includes(EXACT_UNSAVED_MESSAGE));

  await act(async () => {
    findButton('Cancel', dialog).click();
  });
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.equal(document.getElementById('profile-name').value, 'Changed Name');
  assert.equal(
    document.querySelector('textarea[id^="profile-bio-"]').value,
    'Changed biography.',
    'cancelling must keep the draft',
  );

  await act(async () => {
    discardButton.click();
  });
  await flush();

  dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'Discard changes must ask again while the draft is dirty');

  await act(async () => {
    findButton('Discard changes', dialog).click();
  });
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.equal(document.getElementById('profile-name').value, 'Pradeep Chavan');
  assert.equal(
    document.querySelector('textarea[id^="profile-bio-"]').value,
    'First paragraph.',
    'discarding must restore the last saved biography',
  );
  assert.equal(discardButton.disabled, true);
  assert.equal(unloadWasPrevented(), false);
  assert.equal(api.putRequests().length, 0, 'discarding must not write to the server');
});

test('saving fewer paragraphs than the loaded profile asks before removing public content', async (t) => {
  const api = mockProfileApi();
  const { unmount } = await mountProfile();
  t.after(unmount);

  await act(async () => {
    findButton('Remove paragraph 2').click();
  });
  await flush();

  await act(async () => {
    findButton('Remove paragraph', document.querySelector('[role="alertdialog"]')).click();
  });
  await flush();

  assert.equal(
    document.querySelectorAll('textarea[id^="profile-bio-"]').length,
    1,
    'the draft must be reduced before saving',
  );

  await act(async () => {
    findButton('Save profile').click();
  });
  await flush();

  let dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'a save that reduces the paragraph count must be confirmed');
  assert.match(dialog.textContent, /Save with fewer paragraphs\?/);
  assert.match(dialog.textContent, /from 2 paragraphs to 1/);
  assert.equal(api.putRequests().length, 0, 'the save must wait for confirmation');

  await act(async () => {
    findButton('Cancel', dialog).click();
  });
  await flush();

  dialog = document.querySelector('[role="alertdialog"]');
  assert.equal(dialog, null);
  assert.equal(api.putRequests().length, 0);
  assert.equal(
    document.querySelectorAll('textarea[id^="profile-bio-"]').length,
    1,
    'cancelling must keep the reduced draft',
  );

  await act(async () => {
    findButton('Save profile').click();
  });
  await flush();

  dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'saving again must ask again');

  await act(async () => {
    findButton('Save profile', dialog).click();
  });
  await flush();
  await flush();

  const puts = api.putRequests();
  assert.equal(puts.length, 1);
  assert.deepEqual(JSON.parse(puts[0].body).bio, ['First paragraph.']);
  assert.match(document.body.textContent, /Your profile was saved\./);
  assert.equal(unloadWasPrevented(), false);
});

test('Reload uses the custom discard dialog and only refetches when accepted', async (t) => {
  const api = mockProfileApi();
  const { unmount } = await mountProfile();
  t.after(unmount);

  await editField('profile-name', 'Changed Name');

  const nativeConfirmCalls = [];
  window.confirm = (message) => {
    nativeConfirmCalls.push(message);
    return true;
  };

  await act(async () => {
    findButton('Reload').click();
  });
  await flush();

  let dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'Reload with a dirty form must open the custom confirmation');
  assert.match(dialog.textContent, /Discard unsaved changes\?/);
  assert.ok(dialog.textContent.includes(EXACT_UNSAVED_MESSAGE));
  assert.deepEqual(nativeConfirmCalls, [], 'window.confirm must not be used');
  assert.equal(
    document.getElementById('profile-name').value,
    'Changed Name',
    'opening the confirmation must preserve the draft',
  );
  assert.equal(
    api.profileRequests().length,
    1,
    'opening the confirmation must not refetch the profile',
  );

  await act(async () => {
    findButton('Cancel', dialog).click();
  });
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.equal(
    document.getElementById('profile-name').value,
    'Changed Name',
    'cancelling must return to the form with the draft intact',
  );
  assert.equal(api.profileRequests().length, 1, 'cancelling must not refetch');

  await act(async () => {
    findButton('Reload').click();
  });
  await flush();

  dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog, 'Reload must ask again while the draft is still dirty');
  assert.ok(dialog.textContent.includes(EXACT_UNSAVED_MESSAGE));

  await act(async () => {
    findButton('Discard changes', dialog).click();
  });
  await flush();
  await flush();

  assert.equal(document.querySelector('[role="alertdialog"]'), null);
  assert.deepEqual(nativeConfirmCalls, [], 'window.confirm must never be called');
  assert.equal(api.profileRequests().length, 2, 'accepting must refetch the profile');
  assert.equal(
    document.getElementById('profile-name').value,
    'Pradeep Chavan',
    'accepting must restore the stored profile',
  );
  assert.equal(
    unloadWasPrevented(),
    false,
    'reloading the stored profile must clear the dirty state',
  );
});

test('an invalid profile submit focuses the first invalid field and exposes its message', async (t) => {
  mockProfileApi();
  const { unmount } = await mountProfile();
  t.after(unmount);

  await editField('profile-email', 'not-an-email');

  await act(async () => {
    findButton('Save profile').click();
  });
  await flush();

  const email = document.getElementById('profile-email');
  assert.equal(document.activeElement, email, 'focus must move to the first invalid field');
  assert.equal(email.getAttribute('aria-invalid'), 'true');
  assert.equal(
    document.getElementById('profile-email-error').textContent,
    'Enter a valid email address.',
  );
  assert.match(document.body.textContent, /Please fix the highlighted fields/);
});
