import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { ContactMessage } from '../src/models/ContactMessage.js';
import {
  isSubmissionTimingValid,
  MAX_CLOCK_SKEW_MS,
  MIN_FORM_AGE_MS,
} from '../src/validation/contact.js';

/*
 * These tests require a local MongoDB (or TEST_MONGODB_URI). The default is a
 * disposable database whose name ends in `_test`; the suite refuses to run
 * against the development portfolio database.
 */
const TEST_URI =
  process.env.TEST_MONGODB_URI ??
  'mongodb://127.0.0.1:27017/pradeep_portfolio_m4_test';
const TEST_DB_NAME = TEST_URI.split('/').pop()?.split('?')[0] ?? '';

if (!TEST_DB_NAME.endsWith('_test') || TEST_DB_NAME === 'pradeep_portfolio') {
  throw new Error('Contact tests require an isolated database whose name ends in `_test`.');
}

const CONTACT_PATH = '/api/contact';

function validPayload(overrides = {}) {
  return {
    name: 'Test Visitor',
    email: 'visitor@example.com',
    subject: 'Hello',
    message: 'This is a valid test message.',
    website: '',
    formStartedAt: Date.now() - 5000,
    ...overrides,
  };
}

async function startServer(options = {}) {
  const app = createApp(options);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  return {
    base: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function send(base, path, { method = 'POST', body, rawBody, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(rawBody !== undefined || body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { response, text, json };
}

before(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await ContactMessage.deleteMany({});
});

beforeEach(async () => {
  await ContactMessage.deleteMany({});
});

after(async () => {
  await ContactMessage.deleteMany({});
  await mongoose.disconnect();
});

test('accepts a valid submission, normalises fields, and saves read=false', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const { response, json } = await send(server.base, CONTACT_PATH, {
    body: validPayload({
      name: '  Ada Lovelace  ',
      email: '  ADA@Example.COM ',
      subject: '  Project idea  ',
      message: '  A valid test message.  ',
    }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(json, { data: { message: 'Your message has been received.' } });

  const saved = await ContactMessage.findOne({ email: 'ada@example.com' }).lean();
  assert.ok(saved);
  assert.equal(saved.name, 'Ada Lovelace');
  assert.equal(saved.subject, 'Project idea');
  assert.equal(saved.message, 'A valid test message.');
  assert.equal(saved.read, false);
  assert.ok(saved.createdAt instanceof Date);
  assert.ok(saved.updatedAt instanceof Date);
  assert.equal(saved.meta, undefined);
});

test('subject is optional and defaults to an empty string', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const payload = validPayload();
  delete payload.subject;

  const { response } = await send(server.base, CONTACT_PATH, { body: payload });
  assert.equal(response.status, 201);

  const saved = await ContactMessage.findOne({ email: 'visitor@example.com' }).lean();
  assert.equal(saved.subject, '');
});

test('rejects invalid fields with field-level messages and stores nothing', async (t) => {
  const server = await startServer({ contactRateLimit: { limit: 100 } });
  t.after(server.close);

  const secret = 'DO-NOT-ECHO-THIS-VALUE';
  const cases = [
    ['missing name', { name: undefined }, 'name'],
    ['blank name', { name: '   ' }, 'name'],
    ['long name', { name: secret.repeat(81) }, 'name'],
    ['missing email', { email: undefined }, 'email'],
    ['blank email', { email: '' }, 'email'],
    ['invalid email', { email: 'not-an-email' }, 'email'],
    ['missing message', { message: undefined }, 'message'],
    ['blank message', { message: '' }, 'message'],
    ['short message', { message: 'too short' }, 'message'],
    ['long message', { message: 'x'.repeat(5001) }, 'message'],
    ['long subject', { subject: 'x'.repeat(121) }, 'subject'],
    ['wrong message type', { message: 123 }, 'message'],
  ];

  for (const [label, override, field] of cases) {
    const { response, text, json } = await send(server.base, CONTACT_PATH, {
      body: validPayload(override),
    });

    assert.equal(response.status, 400, label);
    assert.equal(json?.error?.code, 'VALIDATION_FAILED', label);
    assert.equal(typeof json?.error?.fields?.[field], 'string', label);
    assert.equal(text.includes(secret), false, `${label} echoed the submitted value`);
  }

  assert.equal(await ContactMessage.countDocuments(), 0);
});

test('rejects unexpected database fields', async (t) => {
  const server = await startServer({ contactRateLimit: { limit: 100 } });
  t.after(server.close);

  const { response, json } = await send(server.base, CONTACT_PATH, {
    body: validPayload({ read: true, meta: { ipHash: 'not-allowed' }, createdAt: new Date() }),
  });

  assert.equal(response.status, 400);
  assert.equal(json?.error?.code, 'VALIDATION_FAILED');
  assert.equal(typeof json?.error?.fields?.form, 'string');
  assert.equal(await ContactMessage.countDocuments(), 0);
});

test('suppresses a honeypot submission without storing it', async (t) => {
  const server = await startServer({ contactRateLimit: { limit: 100 } });
  t.after(server.close);

  for (const website of ['https://spam.example', ['array-value']]) {
    const { response, json } = await send(server.base, CONTACT_PATH, {
      body: validPayload({ website }),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(json, { data: { message: 'Your message has been received.' } });
  }

  assert.equal(await ContactMessage.countDocuments(), 0);
});

test('accepts timing at the 500 ms boundary and within five minutes of skew', () => {
  const now = Date.now();

  assert.equal(isSubmissionTimingValid(now - MIN_FORM_AGE_MS, now), true);
  assert.equal(isSubmissionTimingValid(now - MIN_FORM_AGE_MS + 1, now), false);
  assert.equal(isSubmissionTimingValid(now, now), false);
  assert.equal(isSubmissionTimingValid(now + MAX_CLOCK_SKEW_MS, now), true);
  assert.equal(isSubmissionTimingValid(now + MAX_CLOCK_SKEW_MS + 1, now), false);
});

test('suppresses missing, malformed, too-fast, and far-future timing values', async (t) => {
  const server = await startServer({ contactRateLimit: { limit: 100 } });
  t.after(server.close);

  const timingValues = [
    Date.now(),
    Date.now() + MAX_CLOCK_SKEW_MS + 60000,
    0,
    -1,
    1.5,
    '1234567890',
    null,
    undefined,
  ];

  for (const formStartedAt of timingValues) {
    const payload = validPayload();
    if (formStartedAt === undefined) {
      delete payload.formStartedAt;
    } else {
      payload.formStartedAt = formStartedAt;
    }

    const { response } = await send(server.base, CONTACT_PATH, { body: payload });
    assert.equal(response.status, 201, String(formStartedAt));
  }

  assert.equal(await ContactMessage.countDocuments(), 0);
});

test('saves a submission when the client clock is two minutes ahead', async (t) => {
  const server = await startServer({ contactRateLimit: { limit: 100 } });
  t.after(server.close);

  const { response, json } = await send(server.base, CONTACT_PATH, {
    body: validPayload({ formStartedAt: Date.now() + 2 * 60 * 1000 }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(json, { data: { message: 'Your message has been received.' } });

  const saved = await ContactMessage.findOne({ email: 'visitor@example.com' }).lean();
  assert.ok(saved, 'expected the clock-ahead submission to be stored');
  assert.equal(saved.name, 'Test Visitor');
  assert.equal(saved.message, 'This is a valid test message.');
});

test('rate limits after the configured threshold with JSON and standard headers', async (t) => {
  const server = await startServer({
    contactRateLimit: { limit: 2, windowMs: 60 * 1000 },
  });
  t.after(server.close);

  for (let index = 0; index < 2; index += 1) {
    const { response } = await send(server.base, CONTACT_PATH, {
      body: validPayload({ message: `Valid rate-limit message ${index}.` }),
    });
    assert.equal(response.status, 201);
  }

  const { response, json } = await send(server.base, CONTACT_PATH, {
    body: validPayload({ message: 'This one should be rate limited.' }),
  });

  assert.equal(response.status, 429);
  assert.equal(json?.error?.code, 'RATE_LIMITED');
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.ok(
    response.headers.get('ratelimit') || response.headers.get('x-ratelimit-limit'),
    'expected a standard rate-limit header',
  );
  assert.equal(await ContactMessage.countDocuments(), 2);
});

test('ignores spoofed X-Forwarded-For values unless a proxy is trusted', async (t) => {
  const server = await startServer({
    contactRateLimit: {
      limit: 1,
      windowMs: 60 * 1000,
      // The test deliberately sends X-Forwarded-For while trust proxy is off.
      validate: { xForwardedForHeader: false },
    },
  });
  t.after(server.close);

  const first = await send(server.base, CONTACT_PATH, {
    body: validPayload({ message: 'First request behind a spoofed address.' }),
    headers: { 'X-Forwarded-For': '198.51.100.10' },
  });
  assert.equal(first.response.status, 201);

  const second = await send(server.base, CONTACT_PATH, {
    body: validPayload({ message: 'Second request with a different spoofed address.' }),
    headers: { 'X-Forwarded-For': '198.51.100.20' },
  });
  assert.equal(second.response.status, 429);
  assert.equal(second.json?.error?.code, 'RATE_LIMITED');
  assert.equal(await ContactMessage.countDocuments(), 1);
});

test('returns 503 without saving when MongoDB is disconnected', async (t) => {
  const server = await startServer();
  t.after(server.close);

  await mongoose.disconnect();
  try {
    const { response, json } = await send(server.base, CONTACT_PATH, {
      body: validPayload({ message: 'A message while the database is down.' }),
    });

    assert.equal(response.status, 503);
    assert.equal(json?.error?.code, 'DATABASE_UNAVAILABLE');
  } finally {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 });
  }

  assert.equal(await ContactMessage.countDocuments(), 0);
});

test('returns a generic 500 when the database write fails and logs no visitor content', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const marker = 'PRIVATE-WRITE-FAILURE-MESSAGE';
  const nameMarker = 'PRIVATE-WRITE-FAILURE-NAME';
  const emailMarker = 'private.write.failure@example.com';
  const originalCreate = ContactMessage.create;
  ContactMessage.create = async () => {
    throw new Error(
      `simulated write failure for ${nameMarker} <${emailMarker}> "${marker}"`,
    );
  };

  const stderrWrite = process.stderr.write;
  const logChunks = [];
  process.stderr.write = function captureStderr(chunk, ...rest) {
    logChunks.push(String(chunk));
    return stderrWrite.call(this, chunk, ...rest);
  };

  try {
    const { response, text, json } = await send(server.base, CONTACT_PATH, {
      body: validPayload({
        name: nameMarker,
        email: emailMarker,
        message: `${marker} is long enough to pass validation.`,
      }),
    });

    assert.equal(response.status, 500);
    assert.equal(json?.error?.code, 'INTERNAL_ERROR');
    assert.equal(json?.error?.message, 'Something went wrong.');
    assert.equal('stack' in (json?.error ?? {}), false);
    assert.equal(text.includes(marker), false);
    assert.equal(text.includes('simulated write failure'), false);
  } finally {
    process.stderr.write = stderrWrite;
    ContactMessage.create = originalCreate;
  }

  const logOutput = logChunks.join('');
  assert.equal(logOutput.includes(marker), false, 'message content reached the logs');
  assert.equal(logOutput.includes(nameMarker), false, 'visitor name reached the logs');
  assert.equal(logOutput.includes(emailMarker), false, 'visitor email reached the logs');
  assert.equal(logOutput.includes('simulated write failure'), false, 'raw error reached the logs');
  assert.match(logOutput, /CONTACT_PERSISTENCE_FAILED/, 'safe diagnostic category is missing');

  assert.equal(await ContactMessage.countDocuments(), 0);
});

test('keeps health and portfolio working and never exposes stored messages', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const marker = 'PRIVATE-M4-MESSAGE-MUST-NOT-LEAK';
  await ContactMessage.create({
    name: 'Private Person',
    email: 'private@example.com',
    subject: 'Private subject',
    message: `${marker} with enough characters.`,
  });

  const health = await send(server.base, '/api/health', { method: 'GET' });
  assert.equal(health.response.status, 200);
  assert.equal(health.json?.status, 'ok');

  const portfolio = await send(server.base, '/api/portfolio', { method: 'GET' });
  assert.equal(portfolio.response.status, 200);
  assert.deepEqual(Object.keys(portfolio.json?.data ?? {}).sort(), [
    'achievements',
    'certifications',
    'education',
    'profile',
    'projects',
    'skills',
  ]);
  assert.equal(portfolio.text.includes(marker), false);

  const publicContactRead = await send(server.base, CONTACT_PATH, { method: 'GET' });
  assert.equal(publicContactRead.response.status, 404);
  assert.equal(publicContactRead.text.includes(marker), false);
});

test('keeps existing JSON parsing and body-limit errors consistent', async (t) => {
  const server = await startServer({ contactRateLimit: { limit: 100 } });
  t.after(server.close);

  const invalidJson = await send(server.base, CONTACT_PATH, { rawBody: '{"name":' });
  assert.equal(invalidJson.response.status, 400);
  assert.equal(invalidJson.json?.error?.code, 'INVALID_JSON');

  const oversized = await send(server.base, CONTACT_PATH, {
    body: validPayload({ message: 'x'.repeat(40000) }),
  });
  assert.equal(oversized.response.status, 413);
  assert.equal(oversized.json?.error?.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(await ContactMessage.countDocuments(), 0);
});
