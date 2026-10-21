import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { ApiError } from '../src/api/client.js';
import {
  createProject,
  deleteProject,
  fetchOverview,
  fetchProjects,
  fetchSession,
  loginAdmin,
  logoutAdmin,
  updateProject,
} from '../src/admin/adminApi.js';

const originalFetch = globalThis.fetch;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function noContent() {
  return new Response(null, { status: 204 });
}

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return calls;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('fetchProjects reads the protected admin project list', async () => {
  const calls = mockFetch(() => jsonResponse({ data: { projects: [{ id: '1', title: 'A' }] } }));

  const projects = await fetchProjects();

  assert.equal(calls[0].url, '/api/admin/projects');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(projects.length, 1);
  assert.equal(projects[0].title, 'A');
});

test('fetchOverview returns the overview payload and rejects an unreadable body', async () => {
  mockFetch(() => jsonResponse({ data: { totalProjects: 3 } }));
  assert.deepEqual(await fetchOverview(), { totalProjects: 3 });

  mockFetch(() => jsonResponse({ data: null }));
  await assert.rejects(
    () => fetchOverview(),
    (error) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
  );
});

test('createProject posts the payload and returns the created project', async () => {
  const calls = mockFetch(() => jsonResponse({ data: { project: { id: 'new', title: 'New' } } }, 201));

  const project = await createProject({ title: 'New' });

  assert.equal(calls[0].url, '/api/admin/projects');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { title: 'New' });
  assert.equal(project.id, 'new');
});

test('updateProject patches the encoded id and returns the updated project', async () => {
  const calls = mockFetch(() => jsonResponse({ data: { project: { id: 'a b', title: 'Updated' } } }));

  await updateProject('a b', { published: false });

  assert.equal(calls[0].url, '/api/admin/projects/a%20b');
  assert.equal(calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].init.body), { published: false });
});

test('deleteProject sends a DELETE and accepts a 204 with no body', async () => {
  const calls = mockFetch(() => noContent());

  await assert.doesNotReject(() => deleteProject('xyz'));

  assert.equal(calls[0].url, '/api/admin/projects/xyz');
  assert.equal(calls[0].init.method, 'DELETE');
});

test('surfaces a 401 as an ApiError so the UI can re-authenticate', async () => {
  mockFetch(() => jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } }, 401));

  await assert.rejects(
    () => fetchProjects(),
    (error) => error instanceof ApiError && error.status === 401 && error.code === 'UNAUTHENTICATED',
  );
});

test('surfaces duplicate-slug conflicts with field details', async () => {
  mockFetch(() =>
    jsonResponse(
      {
        error: {
          code: 'SLUG_CONFLICT',
          message: 'A project with that slug already exists.',
          fields: { slug: 'That slug is already in use.' },
        },
      },
      409,
    ),
  );

  await assert.rejects(
    () => createProject({ slug: 'taken' }),
    (error) =>
      error.status === 409 &&
      error.code === 'SLUG_CONFLICT' &&
      error.fields.slug === 'That slug is already in use.',
  );
});

test('normalises a network failure into NETWORK_ERROR', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('connection refused');
  };

  await assert.rejects(
    () => fetchOverview(),
    (error) => error instanceof ApiError && error.code === 'NETWORK_ERROR',
  );
});

test('session helpers use the existing auth endpoints', async () => {
  const calls = mockFetch((url) => {
    if (url === '/api/auth/me' || url === '/api/auth/login') {
      return jsonResponse({ data: { admin: { id: 'a1', email: 'e@x.com', name: 'N' } } });
    }
    return noContent();
  });

  const admin = await fetchSession();
  assert.equal(admin.id, 'a1');
  assert.equal(calls[0].url, '/api/auth/me');

  await loginAdmin({ email: 'e@x.com', password: 'secret' });
  assert.equal(calls[1].url, '/api/auth/login');
  assert.equal(calls[1].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].init.body), { email: 'e@x.com', password: 'secret' });

  await assert.doesNotReject(() => logoutAdmin());
  assert.equal(calls[2].url, '/api/auth/logout');
  assert.equal(calls[2].init.method, 'POST');
});

test('rejects an unreadable administrator response', async () => {
  mockFetch(() => jsonResponse({ data: { admin: { email: 'missing-id@example.com' } } }));

  await assert.rejects(
    () => fetchSession(),
    (error) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
  );
});
