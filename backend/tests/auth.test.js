import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { after, before, beforeEach } from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Admin } from '../src/models/Admin.js';
import { ConfigError, loadEnv } from '../src/config/env.js';
import { MAX_FAILED_ATTEMPTS } from '../src/config/auth.js';
import {
  SESSION_TTL_MS,
  createSessionMiddleware,
  createSessionStore,
  sessionCookieOptions,
} from '../src/config/session.js';
import { hashPassword } from '../src/lib/password.js';
import { createRequireAuth } from '../src/middleware/requireAuth.js';

/*
 * Authentication tests require a local MongoDB (or TEST_MONGODB_URI). The
 * default is a disposable database ending in `_test`; the suite refuses to run
 * against the development portfolio database.
 */
const TEST_URI =
  process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/pradeep_portfolio_m5_test';
const TEST_DB_NAME = TEST_URI.split('/').pop()?.split('?')[0] ?? '';

if (!TEST_DB_NAME.endsWith('_test') || TEST_DB_NAME === 'pradeep_portfolio') {
  throw new Error('Authentication tests require an isolated database whose name ends in `_test`.');
}

const TEST_SECRET = 'm5-test-session-secret-0123456789abcdef';
const TEST_ORIGIN = 'http://localhost:5173';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'M5-Test-Password-123!';

const LOGIN_PATH = '/api/auth/login';
const ME_PATH = '/api/auth/me';
const LOGOUT_PATH = '/api/auth/logout';

async function createTestAdmin(overrides = {}) {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  return Admin.create({
    email: TEST_EMAIL,
    name: 'Test Administrator',
    passwordHash,
    ...overrides,
  });
}

function sessionConfig(overrides = {}) {
  const store = createSessionStore({
    client: mongoose.connection.getClient(),
    dbName: mongoose.connection.name,
  });

  return {
    store,
    middleware: createSessionMiddleware({
      secret: TEST_SECRET,
      store,
      isProduction: false,
      trustProxy: false,
    }),
    isProduction: false,
    clientOrigin: TEST_ORIGIN,
    ...overrides,
  };
}

async function startServer({
  session = sessionConfig(),
  loginRateLimit = { limit: 100, windowMs: 60 * 1000 },
  contactRateLimit = { limit: 100, windowMs: 60 * 1000 },
} = {}) {
  const app = createApp({ session, loginRateLimit, contactRateLimit });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  return {
    base: `http://127.0.0.1:${port}`,
    session,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function request(base, path, { method = 'GET', body, headers = {}, cookie } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  const setCookieValues =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);

  return { response, text, json, setCookieValues };
}

function sessionIdFrom(setCookieValues) {
  for (const header of setCookieValues) {
    const match = /(?:^|,\s*)pradeep\.sid=([^;]+)/.exec(header);
    if (match) {
      const decoded = decodeURIComponent(match[1]);
      // express-session signs cookies as `s:<sessionId>.<signature>`.
      return decoded.startsWith('s:') ? decoded.slice(2).split('.')[0] : decoded;
    }
  }
  return null;
}

function sessionCookieFrom(setCookieValues) {
  for (const header of setCookieValues) {
    const match = /(?:^|,\s*)pradeep\.sid=([^;]+)/.exec(header);
    if (match) {
      // Keep the signed value exactly as the browser would send it.
      return `pradeep.sid=${match[1]}`;
    }
  }
  return null;
}

async function login(base, { email = TEST_EMAIL, password = TEST_PASSWORD, cookie, headers } = {}) {
  return request(base, LOGIN_PATH, {
    method: 'POST',
    body: { email, password },
    cookie,
    headers,
  });
}

async function captureProcessOutput(run) {
  const stdoutWrite = process.stdout.write;
  const stderrWrite = process.stderr.write;
  const chunks = [];

  process.stdout.write = function captureStdout(chunk, ...rest) {
    chunks.push(String(chunk));
    return stdoutWrite.call(this, chunk, ...rest);
  };
  process.stderr.write = function captureStderr(chunk, ...rest) {
    chunks.push(String(chunk));
    return stderrWrite.call(this, chunk, ...rest);
  };

  try {
    return { result: await run(), output: () => chunks.join('') };
  } finally {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  }
}

before(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await Admin.deleteMany({});
  await mongoose.connection.collection('sessions').deleteMany({});
});

beforeEach(async () => {
  await Admin.deleteMany({});
  await mongoose.connection.collection('sessions').deleteMany({});
});

after(async () => {
  await Admin.deleteMany({});
  await mongoose.connection.collection('sessions').deleteMany({});
  await mongoose.disconnect();
});

test('logs in with valid credentials, persists the session, and returns only safe admin fields', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const admin = await createTestAdmin({ lastLoginAt: new Date(Date.now() - 60_000) });

  const { response, text, json, setCookieValues } = await login(server.base);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(json?.data?.admin ?? {}).sort(), ['email', 'id', 'name']);
  assert.equal(json.data.admin.email, TEST_EMAIL);
  assert.equal(json.data.admin.name, 'Test Administrator');
  assert.equal('passwordHash' in json.data.admin, false);
  assert.equal('failedAttempts' in json.data.admin, false);
  assert.equal('lockedUntil' in json.data.admin, false);
  assert.equal(text.includes('$argon2'), false);

  const sessionId = sessionIdFrom(setCookieValues);
  assert.ok(sessionId, 'expected a session cookie to be set');

  const fresh = await Admin.findById(admin._id).lean();
  assert.ok(fresh.lastLoginAt instanceof Date);
  assert.ok(fresh.lastLoginAt.getTime() > Date.now() - 10_000);
  assert.equal(fresh.failedAttempts, 0);
  assert.equal(fresh.lockedUntil, null);

  const stored = await mongoose.connection.collection('sessions').findOne({ _id: sessionId });
  assert.ok(stored, 'expected the session to be persisted in MongoDB');
  assert.equal(JSON.stringify(stored).includes('passwordHash'), false);
  assert.equal(JSON.stringify(stored).includes(TEST_PASSWORD), false);
});

test('auth responses are private and never cacheable', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const loginResult = await login(server.base);
  assert.equal(loginResult.response.status, 200);
  assert.equal(loginResult.response.headers.get('cache-control'), 'no-store');
  assert.match(loginResult.response.headers.get('vary') ?? '', /Cookie/i);

  const cookie = sessionCookieFrom(loginResult.setCookieValues);
  assert.ok(cookie, 'expected a session cookie');

  const me = await request(server.base, ME_PATH, { cookie });
  assert.equal(me.response.status, 200);
  assert.equal(me.response.headers.get('cache-control'), 'no-store');
  assert.match(me.response.headers.get('vary') ?? '', /Cookie/i);

  const anonymousMe = await request(server.base, ME_PATH);
  assert.equal(anonymousMe.response.status, 401);
  assert.equal(anonymousMe.response.headers.get('cache-control'), 'no-store');

  const unknown = await request(server.base, '/api/auth/not-a-route');
  assert.equal(unknown.response.status, 404);
  assert.equal(unknown.response.headers.get('cache-control'), 'no-store');
  assert.match(unknown.response.headers.get('vary') ?? '', /Cookie/i);

  const logout = await request(server.base, LOGOUT_PATH, { method: 'POST', cookie });
  assert.equal(logout.response.status, 204);
  assert.equal(logout.response.headers.get('cache-control'), 'no-store');
  assert.match(logout.response.headers.get('vary') ?? '', /Cookie/i);
});

test('rejects a wrong password with the generic invalid-credentials response', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const { response, json } = await login(server.base, { password: 'Wrong-Password-123!' });
  assert.equal(response.status, 401);
  assert.deepEqual(json, {
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
  });
});

test('rejects an unknown administrator with the same public response as a wrong password', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const wrongPassword = await login(server.base, { password: 'Wrong-Password-123!' });
  const unknownEmail = await login(server.base, { email: 'nobody@example.com' });

  assert.equal(unknownEmail.response.status, 401);
  assert.deepEqual(unknownEmail.json, wrongPassword.json);
  assert.equal(unknownEmail.text.includes('nobody@example.com'), false);
});

test('rejects a locked account without revealing the lockout', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin({ lockedUntil: new Date(Date.now() + 10 * 60 * 1000) });

  const { response, json } = await login(server.base);
  assert.equal(response.status, 401);
  assert.equal(json?.error?.code, 'INVALID_CREDENTIALS');
  assert.equal(json?.error?.message, 'Invalid email or password.');
});

test('rotates the session id on every successful login', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const first = await login(server.base);
  const firstSid = sessionIdFrom(first.setCookieValues);
  assert.ok(firstSid);

  const second = await login(server.base, { cookie: sessionCookieFrom(first.setCookieValues) });
  const secondSid = sessionIdFrom(second.setCookieValues);

  assert.equal(second.response.status, 200);
  assert.ok(secondSid);
  assert.notEqual(secondSid, firstSid);
});

test('locks an account after the configured number of failed attempts and rejects the correct password', async (t) => {
  const server = await startServer({ loginRateLimit: { limit: 100, windowMs: 60 * 1000 } });
  t.after(server.close);
  const admin = await createTestAdmin();

  for (let attempt = 1; attempt <= MAX_FAILED_ATTEMPTS; attempt += 1) {
    const { response, json } = await login(server.base, { password: `Wrong-${attempt}` });
    assert.equal(response.status, 401);
    assert.equal(json?.error?.code, 'INVALID_CREDENTIALS');
  }

  const locked = await Admin.findById(admin._id).lean();
  assert.ok(locked.failedAttempts >= MAX_FAILED_ATTEMPTS);
  assert.ok(locked.lockedUntil instanceof Date);
  assert.ok(locked.lockedUntil.getTime() > Date.now());

  const correctWhileLocked = await login(server.base);
  assert.equal(correctWhileLocked.response.status, 401);
  assert.equal(correctWhileLocked.json?.error?.code, 'INVALID_CREDENTIALS');
});

test('clears an expired lockout and resets counters on successful login', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const admin = await createTestAdmin({
    failedAttempts: MAX_FAILED_ATTEMPTS,
    lockedUntil: new Date(Date.now() - 60_000),
  });

  const { response } = await login(server.base);
  assert.equal(response.status, 200);

  const fresh = await Admin.findById(admin._id).lean();
  assert.equal(fresh.failedAttempts, 0);
  assert.equal(fresh.lockedUntil, null);
});

test('resets failed attempts after a successful login', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const admin = await createTestAdmin({ failedAttempts: 3 });

  const { response } = await login(server.base);
  assert.equal(response.status, 200);

  const fresh = await Admin.findById(admin._id).lean();
  assert.equal(fresh.failedAttempts, 0);
  assert.equal(fresh.lockedUntil, null);
});

test('rate limits login attempts per IP with JSON and standard headers', async (t) => {
  const server = await startServer({ loginRateLimit: { limit: 2, windowMs: 60 * 1000 } });
  t.after(server.close);

  for (let index = 0; index < 2; index += 1) {
    const { response } = await login(server.base, { password: `Wrong-${index}` });
    assert.equal(response.status, 401);
  }

  const { response, json } = await login(server.base, { password: 'Wrong-final' });
  assert.equal(response.status, 429);
  assert.equal(json?.error?.code, 'RATE_LIMITED');
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.ok(
    response.headers.get('ratelimit') || response.headers.get('x-ratelimit-limit'),
    'expected a standard rate-limit header',
  );
});

test('does not count successful logins against the login IP limit', async (t) => {
  const server = await startServer({ loginRateLimit: { limit: 1, windowMs: 60 * 1000 } });
  t.after(server.close);
  await createTestAdmin();

  const first = await login(server.base);
  const second = await login(server.base);

  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 200);
});

test('returns the current administrator for an authenticated session', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const loginResult = await login(server.base);
  const cookie = sessionCookieFrom(loginResult.setCookieValues);

  const me = await request(server.base, ME_PATH, { cookie });
  assert.equal(me.response.status, 200);
  assert.deepEqual(Object.keys(me.json?.data?.admin ?? {}).sort(), ['email', 'id', 'name']);
  assert.equal(me.json.data.admin.email, TEST_EMAIL);
  assert.equal(me.text.includes('$argon2'), false);
  assert.equal(me.text.includes('passwordHash'), false);
});

test('returns 401 for /me without a session and creates no anonymous session', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const me = await request(server.base, ME_PATH);
  assert.equal(me.response.status, 401);
  assert.equal(me.json?.error?.code, 'UNAUTHENTICATED');
  assert.equal(setCookieValuesEmpty(me.setCookieValues), true);
  assert.equal(await mongoose.connection.collection('sessions').countDocuments(), 0);
});

test('rejects a deleted administrator and invalidates the session', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const loginResult = await login(server.base);
  const sid = sessionIdFrom(loginResult.setCookieValues);
  const cookie = sessionCookieFrom(loginResult.setCookieValues);
  assert.ok(sid);

  await Admin.deleteMany({ email: TEST_EMAIL });

  const me = await request(server.base, ME_PATH, { cookie });
  assert.equal(me.response.status, 401);
  assert.equal(me.json?.error?.code, 'UNAUTHENTICATED');
  assert.equal(await mongoose.connection.collection('sessions').countDocuments({ _id: sid }), 0);
});

test('logout destroys the server session and clears the browser cookie', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const loginResult = await login(server.base);
  const sid = sessionIdFrom(loginResult.setCookieValues);
  const cookie = sessionCookieFrom(loginResult.setCookieValues);
  assert.ok(sid);

  const loggedOut = await request(server.base, LOGOUT_PATH, { method: 'POST', cookie });
  assert.equal(loggedOut.response.status, 204);
  assert.equal(loggedOut.text, '');
  const cleared = loggedOut.setCookieValues.join('; ');
  assert.match(cleared, /pradeep\.sid=;/);
  assert.match(cleared, /Path=\//);
  assert.equal(await mongoose.connection.collection('sessions').countDocuments({ _id: sid }), 0);

  const reused = await request(server.base, ME_PATH, { cookie });
  assert.equal(reused.response.status, 401);
});

test('logout without an active session is safe', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const loggedOut = await request(server.base, LOGOUT_PATH, { method: 'POST' });
  assert.equal(loggedOut.response.status, 204);
});

test('reusable authentication middleware rejects anonymous and deleted administrators', async (t) => {
  const session = sessionConfig();
  const main = await startServer({ session });
  t.after(main.close);
  await createTestAdmin();

  const loginResult = await login(main.base);
  const cookie = sessionCookieFrom(loginResult.setCookieValues);

  const probe = express();
  probe.use(session.middleware);
  probe.get('/api/probe', createRequireAuth(), (req, res) => {
    res.status(200).json({ data: { admin: req.admin } });
  });
  const probeServer = probe.listen(0, '127.0.0.1');
  await once(probeServer, 'listening');
  const { port } = probeServer.address();
  const base = `http://127.0.0.1:${port}`;
  t.after(() => new Promise((resolve) => probeServer.close(resolve)));

  const anonymous = await request(base, '/api/probe');
  assert.equal(anonymous.response.status, 401);
  assert.equal(anonymous.json?.error?.code, 'UNAUTHENTICATED');

  const authenticated = await request(base, '/api/probe', { cookie });
  assert.equal(authenticated.response.status, 200);
  assert.equal(authenticated.json?.data?.admin?.email, TEST_EMAIL);

  await Admin.deleteMany({});
  const deleted = await request(base, '/api/probe', { cookie });
  assert.equal(deleted.response.status, 401);
});

test('validates origins for state-changing authentication routes', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const legit = await login(server.base, { headers: { Origin: TEST_ORIGIN } });
  assert.equal(legit.response.status, 200);

  const absent = await login(server.base, { password: 'Wrong-Password-123!' });
  assert.equal(absent.response.status, 401);

  const sameOrigin = await login(server.base, {
    headers: { Origin: server.base },
  });
  assert.equal(sameOrigin.response.status, 200);

  const foreign = await login(server.base, { headers: { Origin: 'https://evil.example' } });
  assert.equal(foreign.response.status, 403);
  assert.equal(foreign.json?.error?.code, 'FORBIDDEN_ORIGIN');

  const foreignLogout = await request(server.base, LOGOUT_PATH, {
    method: 'POST',
    headers: { Origin: 'https://evil.example' },
  });
  assert.equal(foreignLogout.response.status, 403);
  assert.equal(foreignLogout.json?.error?.code, 'FORBIDDEN_ORIGIN');
});

test('sets the documented session cookie attributes', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const { setCookieValues } = await login(server.base);
  const cookieHeader = setCookieValues.join('; ');
  assert.match(cookieHeader, /HttpOnly/i);
  assert.match(cookieHeader, /SameSite=Lax/i);
  assert.match(cookieHeader, /Path=\//);
  assert.match(cookieHeader, /Expires=/i);
  assert.doesNotMatch(cookieHeader, /Domain=/i);
  assert.doesNotMatch(cookieHeader, /Secure/i);

  assert.equal(sessionCookieOptions(true).secure, true);
  assert.equal(sessionCookieOptions(false).maxAge, SESSION_TTL_MS);
});

test('does not use an in-memory session store', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  assert.equal(typeof server.session.store.get, 'function');
  assert.ok(server.session.store.constructor.name.toLowerCase().includes('mongo'));

  await login(server.base);
  const count = await mongoose.connection.collection('sessions').countDocuments();
  assert.ok(count >= 1, 'expected a MongoDB session document');
});

test('validates SESSION_SECRET and never logs it or submitted passwords', async (t) => {
  const baseEnv = { NODE_ENV: 'test', MONGODB_URI: TEST_URI };

  assert.throws(
    () => loadEnv({ ...baseEnv, SESSION_SECRET: 'x'.repeat(31) }),
    (error) => error instanceof ConfigError,
  );

  const config = loadEnv({ ...baseEnv, SESSION_SECRET: TEST_SECRET });
  assert.equal(config.sessionSecret, TEST_SECRET);
  assert.equal(config.clientOrigin, TEST_ORIGIN);

  const server = await startServer();
  t.after(server.close);
  await createTestAdmin();

  const passwordMarker = 'PRIVATE-PASSWORD-MARKER-123!';
  const captured = await captureProcessOutput(() =>
    login(server.base, { password: passwordMarker }),
  );

  assert.equal(captured.result.response.status, 401);
  assert.equal(captured.output().includes(passwordMarker), false);
  assert.equal(captured.output().includes(TEST_SECRET), false);
  assert.equal(captured.output().includes('passwordHash'), false);
});

function setCookieValuesEmpty(values) {
  return values.every((value) => value === null || value === undefined || value === '');
}
