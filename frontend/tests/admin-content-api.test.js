import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { ApiError } from '../src/api/client.js';
import {
  achievementsApi,
  certificationsApi,
  deleteMessage,
  educationApi,
  fetchMessages,
  fetchProfile,
  skillGroupsApi,
  updateMessage,
  updateProfile,
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

test('fetchMessages requests the inbox with filters and reads pagination', async () => {
  const calls = mockFetch(() =>
    jsonResponse({
      data: {
        messages: [{ id: '1', name: 'A', read: false }],
        pagination: { total: 1, page: 1, limit: 10, pages: 1, hasNext: false, hasPrev: false },
      },
    }),
  );

  const result = await fetchMessages({ read: 'unread', page: 2, limit: 10 });

  assert.equal(calls[0].url, '/api/admin/messages?read=unread&page=2&limit=10');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(result.messages.length, 1);
  assert.equal(result.pagination.total, 1);
});

test('fetchMessages defaults to all/1/20 and rejects an unreadable inbox', async () => {
  const calls = mockFetch(() =>
    jsonResponse({ data: { messages: [], pagination: { total: 0, page: 1, limit: 20, pages: 1 } } }),
  );
  await fetchMessages();
  assert.equal(calls[0].url, '/api/admin/messages?read=all&page=1&limit=20');

  mockFetch(() => jsonResponse({ data: {} }));
  await assert.rejects(fetchMessages(), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'INVALID_RESPONSE');
    return true;
  });
});

test('updateMessage PATCHes only the read flag and returns the message', async () => {
  const calls = mockFetch(() => jsonResponse({ data: { message: { id: '1', read: true } } }));

  const updated = await updateMessage('1', { read: true });

  assert.equal(calls[0].init.method, 'PATCH');
  assert.equal(calls[0].url, '/api/admin/messages/1');
  assert.deepEqual(JSON.parse(calls[0].init.body), { read: true });
  assert.equal(updated.read, true);
});

test('deleteMessage DELETEs an encoded id and tolerates 204', async () => {
  const calls = mockFetch(() => noContent());

  await deleteMessage('a b');

  assert.equal(calls[0].init.method, 'DELETE');
  assert.equal(calls[0].url, '/api/admin/messages/a%20b');
});

test('skillGroupsApi uses the protected collection endpoints', async () => {
  const calls = mockFetch((url, init) => {
    if (init.method === 'GET') {
      return jsonResponse({ data: { skillGroups: [{ id: '1', label: 'A' }] } });
    }
    if (init.method === 'POST') {
      return jsonResponse({ data: { skillGroup: { id: '2', label: 'B' } } }, 201);
    }
    if (init.method === 'PATCH') {
      return jsonResponse({ data: { skillGroup: { id: '1', order: 5 } } });
    }
    return noContent();
  });

  const list = await skillGroupsApi.list();
  assert.equal(calls[0].url, '/api/admin/skill-groups');
  assert.equal(list.length, 1);

  const created = await skillGroupsApi.create({ label: 'B', items: ['X'] });
  assert.equal(calls[1].init.method, 'POST');
  assert.equal(calls[1].url, '/api/admin/skill-groups');
  assert.equal(created.id, '2');

  const updated = await skillGroupsApi.update('1', { order: 5 });
  assert.equal(calls[2].url, '/api/admin/skill-groups/1');
  assert.equal(updated.order, 5);

  await skillGroupsApi.remove('1');
  assert.equal(calls[3].init.method, 'DELETE');
  assert.equal(calls[3].url, '/api/admin/skill-groups/1');
});

test('collection wrappers target their own paths and response keys', async () => {
  const calls = mockFetch(() =>
    jsonResponse({
      data: {
        education: [{ id: 'e' }],
        certifications: [{ id: 'c' }],
        achievements: [{ id: 'a' }],
      },
    }),
  );

  assert.deepEqual(await educationApi.list(), [{ id: 'e' }]);
  assert.deepEqual(await certificationsApi.list(), [{ id: 'c' }]);
  assert.deepEqual(await achievementsApi.list(), [{ id: 'a' }]);

  assert.equal(calls[0].url, '/api/admin/education');
  assert.equal(calls[1].url, '/api/admin/certifications');
  assert.equal(calls[2].url, '/api/admin/achievements');
});

test('collection wrappers reject an unreadable list', async () => {
  mockFetch(() => jsonResponse({ data: { education: 'nope' } }));

  await assert.rejects(educationApi.list(), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'INVALID_RESPONSE');
    return true;
  });
});

test('fetchProfile returns null when no profile is stored and an object otherwise', async () => {
  const calls = mockFetch(() => jsonResponse({ data: { profile: null } }));
  assert.equal(await fetchProfile(), null);
  assert.equal(calls[0].url, '/api/admin/profile');

  mockFetch(() => jsonResponse({ data: { profile: { name: 'Pradeep', email: 'p@example.com' } } }));
  assert.equal((await fetchProfile()).name, 'Pradeep');
});

test('updateProfile PUTs the profile and validates the response', async () => {
  const calls = mockFetch(() => jsonResponse({ data: { profile: { name: 'Pradeep' } } }));

  const saved = await updateProfile({ name: 'Pradeep', email: 'p@example.com' });

  assert.equal(calls[0].init.method, 'PUT');
  assert.equal(calls[0].url, '/api/admin/profile');
  assert.deepEqual(JSON.parse(calls[0].init.body), { name: 'Pradeep', email: 'p@example.com' });
  assert.equal(saved.name, 'Pradeep');

  mockFetch(() => jsonResponse({ data: {} }));
  await assert.rejects(updateProfile({ name: 'P', email: 'p@example.com' }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'INVALID_RESPONSE');
    return true;
  });
});
