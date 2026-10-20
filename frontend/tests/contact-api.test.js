import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { ApiError } from '../src/api/client.js';
import { sendContactMessage } from '../src/api/contact.js';

const originalFetch = globalThis.fetch;
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

const payload = {
  name: 'Test Visitor',
  email: 'visitor@example.com',
  subject: 'Hello',
  message: 'This is a valid message.',
  website: '',
  formStartedAt: Date.now() - 5000,
};

test('posts to the relative contact endpoint and returns the confirmation', async () => {
  const calls = mockFetch(() =>
    jsonResponse({ data: { message: 'Your message has been received.' } }, 201),
  );

  const message = await sendContactMessage(payload);

  assert.equal(message, 'Your message has been received.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/contact');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), payload);
});

test('surfaces validation fields without exposing the response envelope', async () => {
  mockFetch(() =>
    jsonResponse(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Please check the highlighted fields and try again.',
          fields: { email: 'Enter a valid email address.', internal: 42 },
        },
      },
      400,
    ),
  );

  await assert.rejects(sendContactMessage(payload), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_FAILED');
    assert.deepEqual(error.fields, { email: 'Enter a valid email address.' });
    return true;
  });
});

test('rejects a malformed success response instead of showing false success', async () => {
  mockFetch(() => jsonResponse({ data: {} }, 201));

  await assert.rejects(sendContactMessage(payload), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'INVALID_RESPONSE');
    return true;
  });
});

test('normalises a network failure into a safe ApiError', async () => {
  mockFetch(() => {
    throw new TypeError('fetch failed');
  });

  await assert.rejects(sendContactMessage(payload), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, 'NETWORK_ERROR');
    assert.equal(error.status, undefined);
    return true;
  });
});

test('rethrows AbortError unchanged', async () => {
  const controller = new AbortController();

  mockFetch(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  );

  const request = sendContactMessage(payload, { signal: controller.signal });
  controller.abort();

  await assert.rejects(request, (error) => error.name === 'AbortError');
});

test('never writes contact values to the console', async () => {
  const logged = [];
  console.log = (...args) => logged.push(args);
  console.warn = (...args) => logged.push(args);
  console.error = (...args) => logged.push(args);

  mockFetch(() =>
    jsonResponse({ data: { message: 'Your message has been received.' } }, 201),
  );
  await sendContactMessage(payload);

  mockFetch(() =>
    jsonResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      500,
    ),
  );
  await assert.rejects(sendContactMessage(payload));

  assert.deepEqual(logged, []);
});
