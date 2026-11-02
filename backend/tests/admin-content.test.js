import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Admin } from '../src/models/Admin.js';
import { Profile } from '../src/models/Profile.js';
import { Project } from '../src/models/Project.js';
import { SkillGroup } from '../src/models/SkillGroup.js';
import { Education } from '../src/models/Education.js';
import { Certification } from '../src/models/Certification.js';
import { Achievement } from '../src/models/Achievement.js';
import { ContactMessage } from '../src/models/ContactMessage.js';
import { createSessionMiddleware, createSessionStore } from '../src/config/session.js';
import { hashPassword } from '../src/lib/password.js';

/*
 * Administrator content tests (inbox, skills, education, certifications,
 * achievements, profile) require a local MongoDB (or TEST_MONGODB_URI). The
 * default is a disposable database ending in `_test`; the suite refuses to run
 * against the development portfolio database.
 */
const TEST_URI =
  process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/pradeep_portfolio_m7_test';
const TEST_DB_NAME = TEST_URI.split('/').pop()?.split('?')[0] ?? '';

if (!TEST_DB_NAME.endsWith('_test') || TEST_DB_NAME === 'pradeep_portfolio') {
  throw new Error('Administrator content tests require an isolated database ending in `_test`.');
}

const TEST_SECRET = 'm7-test-session-secret-0123456789abcdef';
const TEST_ORIGIN = 'http://localhost:5173';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'M7-Test-Password-123!';

const MESSAGES_PATH = '/api/admin/messages';
const SKILLS_PATH = '/api/admin/skill-groups';
const EDUCATION_PATH = '/api/admin/education';
const CERTIFICATIONS_PATH = '/api/admin/certifications';
const ACHIEVEMENTS_PATH = '/api/admin/achievements';
const PROFILE_PATH = '/api/admin/profile';
const OVERVIEW_PATH = '/api/admin/overview';
const LOGIN_PATH = '/api/auth/login';

async function createTestAdmin(overrides = {}) {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  return Admin.create({
    email: TEST_EMAIL,
    name: 'Test Administrator',
    passwordHash,
    ...overrides,
  });
}

function sessionConfig() {
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
  };
}

async function startServer() {
  const app = createApp({
    session: sessionConfig(),
    loginRateLimit: { limit: 100, windowMs: 60 * 1000 },
    contactRateLimit: { limit: 100, windowMs: 60 * 1000 },
  });
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

function sessionCookieFrom(setCookieValues) {
  for (const header of setCookieValues) {
    const match = /(?:^|,\s*)pradeep\.sid=([^;]+)/.exec(header);
    if (match) {
      return `pradeep.sid=${match[1]}`;
    }
  }
  return null;
}

async function loginAsAdmin(base) {
  await createTestAdmin();
  const result = await request(base, LOGIN_PATH, {
    method: 'POST',
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  assert.equal(result.response.status, 200, 'expected the test administrator to sign in');
  return sessionCookieFrom(result.setCookieValues);
}

function validSkillGroup(overrides = {}) {
  return {
    label: `Group ${Math.random().toString(36).slice(2, 8)}`,
    items: ['JavaScript', 'TypeScript'],
    order: 1,
    ...overrides,
  };
}

function validEducation(overrides = {}) {
  return {
    institution: 'Example Institute of Technology',
    qualification: 'B.Tech',
    field: 'Computer Engineering',
    startYear: 2021,
    endYear: 2025,
    score: '',
    location: 'Pune, India',
    order: 1,
    ...overrides,
  };
}

function validCertification(overrides = {}) {
  return {
    title: 'Example Certificate',
    issuer: 'Example Issuer',
    year: 2024,
    url: '',
    order: 1,
    ...overrides,
  };
}

function validAchievement(overrides = {}) {
  return {
    title: 'Example Achievement',
    year: 2024,
    description: 'A short description.',
    order: 1,
    ...overrides,
  };
}

function validProfile(overrides = {}) {
  return {
    name: 'Pradeep Chavan',
    email: 'owner@example.com',
    headline: '',
    intro: '',
    bio: [],
    location: '',
    github: '',
    linkedin: '',
    leetcode: '',
    resumePath: 'resume.pdf',
    ...overrides,
  };
}

/** Inserts inbox rows with explicit createdAt so ordering is deterministic. */
async function insertMessages(docs) {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  await ContactMessage.collection.insertMany(
    docs.map((doc, index) => ({
      name: doc.name ?? `Sender ${index}`,
      email: doc.email ?? `sender${index}@example.com`,
      subject: doc.subject ?? '',
      message: doc.message ?? `Message body ${index}`,
      read: doc.read ?? false,
      createdAt: new Date(base + index * 60_000),
      updatedAt: new Date(base + index * 60_000),
    })),
  );
}

before(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([
    Admin.init(),
    Profile.init(),
    Project.init(),
    SkillGroup.init(),
    Education.init(),
    Certification.init(),
    Achievement.init(),
    ContactMessage.init(),
  ]);
});

beforeEach(async () => {
  await Promise.all([
    Admin.deleteMany({}),
    Profile.deleteMany({}),
    Project.deleteMany({}),
    SkillGroup.deleteMany({}),
    Education.deleteMany({}),
    Certification.deleteMany({}),
    Achievement.deleteMany({}),
    ContactMessage.deleteMany({}),
    mongoose.connection.collection('sessions').deleteMany({}),
  ]);
});

after(async () => {
  await Promise.all([
    Admin.deleteMany({}),
    Profile.deleteMany({}),
    Project.deleteMany({}),
    SkillGroup.deleteMany({}),
    Education.deleteMany({}),
    Certification.deleteMany({}),
    Achievement.deleteMany({}),
    ContactMessage.deleteMany({}),
    mongoose.connection.collection('sessions').deleteMany({}),
  ]);
  await mongoose.disconnect();
});

/* ------------------------------------------------------------------ *
 * Authorization across every new route
 * ------------------------------------------------------------------ */

test('rejects unauthenticated requests to every content endpoint with 401', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const id = new mongoose.Types.ObjectId().toString();
  const calls = [
    request(server.base, MESSAGES_PATH),
    request(server.base, `${MESSAGES_PATH}/${id}`, { method: 'PATCH', body: { read: true } }),
    request(server.base, `${MESSAGES_PATH}/${id}`, { method: 'DELETE' }),
    request(server.base, SKILLS_PATH),
    request(server.base, SKILLS_PATH, { method: 'POST', body: validSkillGroup() }),
    request(server.base, `${SKILLS_PATH}/${id}`, { method: 'PATCH', body: { order: 2 } }),
    request(server.base, `${SKILLS_PATH}/${id}`, { method: 'DELETE' }),
    request(server.base, EDUCATION_PATH),
    request(server.base, EDUCATION_PATH, { method: 'POST', body: validEducation() }),
    request(server.base, `${EDUCATION_PATH}/${id}`, { method: 'PATCH', body: { order: 2 } }),
    request(server.base, `${EDUCATION_PATH}/${id}`, { method: 'DELETE' }),
    request(server.base, CERTIFICATIONS_PATH),
    request(server.base, CERTIFICATIONS_PATH, { method: 'POST', body: validCertification() }),
    request(server.base, `${CERTIFICATIONS_PATH}/${id}`, { method: 'PATCH', body: { order: 2 } }),
    request(server.base, `${CERTIFICATIONS_PATH}/${id}`, { method: 'DELETE' }),
    request(server.base, ACHIEVEMENTS_PATH),
    request(server.base, ACHIEVEMENTS_PATH, { method: 'POST', body: validAchievement() }),
    request(server.base, `${ACHIEVEMENTS_PATH}/${id}`, { method: 'PATCH', body: { order: 2 } }),
    request(server.base, `${ACHIEVEMENTS_PATH}/${id}`, { method: 'DELETE' }),
    request(server.base, PROFILE_PATH),
    request(server.base, PROFILE_PATH, { method: 'PUT', body: validProfile() }),
  ];

  for (const result of await Promise.all(calls)) {
    assert.equal(result.response.status, 401);
    assert.equal(result.json?.error?.code, 'UNAUTHENTICATED');
    assert.equal(result.response.headers.get('cache-control'), 'no-store');
    assert.match(result.response.headers.get('vary') ?? '', /Cookie/i);
  }

  assert.equal(await SkillGroup.countDocuments(), 0);
  assert.equal(await Profile.countDocuments(), 0);
});

test('authenticated and unknown admin responses are private and never cacheable', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const overview = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(overview.response.status, 200);
  assert.equal(overview.response.headers.get('cache-control'), 'no-store');
  assert.match(overview.response.headers.get('vary') ?? '', /Cookie/i);

  const unknown = await request(server.base, '/api/admin/not-a-route', { cookie });
  assert.equal(unknown.response.status, 404);
  assert.equal(unknown.json?.error?.code, 'NOT_FOUND');
  assert.equal(unknown.response.headers.get('cache-control'), 'no-store');
  assert.match(unknown.response.headers.get('vary') ?? '', /Cookie/i);
});

test('rejects unexpected origins on state-changing content requests', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const rejected = await Promise.all([
    request(server.base, SKILLS_PATH, {
      method: 'POST',
      body: validSkillGroup(),
      cookie,
      headers: { Origin: 'https://evil.example' },
    }),
    request(server.base, PROFILE_PATH, {
      method: 'PUT',
      body: validProfile(),
      cookie,
      headers: { Origin: 'https://evil.example' },
    }),
  ]);

  for (const result of rejected) {
    assert.equal(result.response.status, 403);
    assert.equal(result.json?.error?.code, 'FORBIDDEN_ORIGIN');
  }

  assert.equal(await SkillGroup.countDocuments(), 0);

  // A trusted origin is accepted.
  const allowed = await request(server.base, SKILLS_PATH, {
    method: 'POST',
    body: validSkillGroup({ label: 'Allowed' }),
    cookie,
    headers: { Origin: TEST_ORIGIN },
  });
  assert.equal(allowed.response.status, 201);
});

/* ------------------------------------------------------------------ *
 * Contact inbox
 * ------------------------------------------------------------------ */

test('lists messages newest first with pagination metadata', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  await insertMessages([
    { name: 'First', message: 'one' },
    { name: 'Second', message: 'two' },
    { name: 'Third', message: 'three' },
    { name: 'Fourth', message: 'four' },
    { name: 'Fifth', message: 'five' },
  ]);

  const page1 = await request(server.base, `${MESSAGES_PATH}?read=all&page=1&limit=2`, { cookie });
  assert.equal(page1.response.status, 200);
  assert.equal(page1.json.data.messages.length, 2);
  assert.deepEqual(
    page1.json.data.messages.map((message) => message.name),
    ['Fifth', 'Fourth'],
  );
  assert.deepEqual(page1.json.data.pagination, {
    total: 5,
    page: 1,
    limit: 2,
    pages: 3,
    hasNext: true,
    hasPrev: false,
  });

  const page3 = await request(server.base, `${MESSAGES_PATH}?page=3&limit=2`, { cookie });
  assert.equal(page3.json.data.messages.length, 1);
  assert.equal(page3.json.data.messages[0].name, 'First');
  assert.equal(page3.json.data.pagination.hasNext, false);
  assert.equal(page3.json.data.pagination.hasPrev, true);

  // No internal fields leak.
  assert.equal(page1.text.includes('__v'), false);
  assert.equal(page1.text.includes('ipHash'), false);
  assert.equal('meta' in page1.json.data.messages[0], false);
});

test('filters messages by read state and validates query parameters', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  await insertMessages([
    { read: true, message: 'read-1' },
    { read: true, message: 'read-2' },
    { read: false, message: 'unread-1' },
    { read: false, message: 'unread-2' },
    { read: false, message: 'unread-3' },
  ]);

  const unread = await request(server.base, `${MESSAGES_PATH}?read=unread`, { cookie });
  assert.equal(unread.json.data.pagination.total, 3);
  assert.equal(unread.json.data.messages.every((message) => message.read === false), true);

  const read = await request(server.base, `${MESSAGES_PATH}?read=read`, { cookie });
  assert.equal(read.json.data.pagination.total, 2);

  const all = await request(server.base, `${MESSAGES_PATH}?read=all`, { cookie });
  assert.equal(all.json.data.pagination.total, 5);

  const badFilter = await request(server.base, `${MESSAGES_PATH}?read=maybe`, { cookie });
  assert.equal(badFilter.response.status, 400);
  assert.equal(badFilter.json?.error?.code, 'VALIDATION_FAILED');

  const badLimit = await request(server.base, `${MESSAGES_PATH}?limit=999`, { cookie });
  assert.equal(badLimit.response.status, 400);
  assert.ok(badLimit.json.error.fields.limit);

  const unknownQuery = await request(server.base, `${MESSAGES_PATH}?unexpected=1`, { cookie });
  assert.equal(unknownQuery.response.status, 400);
});

test('marks a message read and unread and persists the change', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const stored = await ContactMessage.create({
    name: 'Visitor',
    email: 'visitor@example.com',
    message: 'Please read me.',
  });

  const read = await request(server.base, `${MESSAGES_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: { read: true },
    cookie,
  });
  assert.equal(read.response.status, 200);
  assert.equal(read.json.data.message.read, true);
  assert.equal((await ContactMessage.findById(stored._id).lean()).read, true);

  const unread = await request(server.base, `${MESSAGES_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: { read: false },
    cookie,
  });
  assert.equal(unread.response.status, 200);
  assert.equal(unread.json.data.message.read, false);
  assert.equal((await ContactMessage.findById(stored._id).lean()).read, false);
});

test('rejects unexpected or invalid message update bodies', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const stored = await ContactMessage.create({
    name: 'Visitor',
    email: 'visitor@example.com',
    message: 'Body',
  });

  const extra = await request(server.base, `${MESSAGES_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: { read: true, message: 'tampered' },
    cookie,
  });
  assert.equal(extra.response.status, 400);
  assert.ok(extra.json.error.fields.form);
  assert.equal((await ContactMessage.findById(stored._id).lean()).read, false);

  const wrongType = await request(server.base, `${MESSAGES_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: { read: 'yes' },
    cookie,
  });
  assert.equal(wrongType.response.status, 400);
  assert.ok(wrongType.json.error.fields.read);
});

test('deletes messages and rejects missing ids with 404 and malformed ids with 400', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const stored = await ContactMessage.create({
    name: 'Visitor',
    email: 'visitor@example.com',
    message: 'Delete me.',
  });

  const deleted = await request(server.base, `${MESSAGES_PATH}/${stored._id}`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(deleted.response.status, 204);
  assert.equal(deleted.text, '');
  assert.equal(await ContactMessage.countDocuments(), 0);

  const missing = new mongoose.Types.ObjectId().toString();
  const notFound = await request(server.base, `${MESSAGES_PATH}/${missing}`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(notFound.response.status, 404);
  assert.equal(notFound.json?.error?.code, 'MESSAGE_NOT_FOUND');

  const malformed = await request(server.base, `${MESSAGES_PATH}/not-an-id`, {
    method: 'PATCH',
    body: { read: true },
    cookie,
  });
  assert.equal(malformed.response.status, 400);
});

test('never exposes contact messages through the public portfolio API', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const marker = 'PRIVATE-INBOX-MARKER-4a91';
  await ContactMessage.create({
    name: 'Private Sender',
    email: 'private@example.com',
    subject: 'Private subject',
    message: marker,
  });

  const portfolio = await request(server.base, '/api/portfolio');
  assert.equal(portfolio.response.status, 200);
  assert.equal(portfolio.text.includes(marker), false);
  assert.equal(portfolio.text.includes('private@example.com'), false);
  assert.equal('messages' in portfolio.json.data, false);
  assert.equal('contact' in portfolio.json.data, false);
  assert.equal('contactMessages' in portfolio.json.data, false);
});

test('overview unread count follows read/unread changes and deletions', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const first = await ContactMessage.create({
    name: 'A',
    email: 'a@example.com',
    message: 'one',
  });
  await ContactMessage.create({ name: 'B', email: 'b@example.com', message: 'two' });

  const before = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(before.json.data.unreadContactMessages, 2);

  await request(server.base, `${MESSAGES_PATH}/${first._id}`, {
    method: 'PATCH',
    body: { read: true },
    cookie,
  });
  const afterRead = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(afterRead.json.data.unreadContactMessages, 1);

  const unreadOne = await ContactMessage.findOne({ read: false }).lean();
  await request(server.base, `${MESSAGES_PATH}/${unreadOne._id}`, { method: 'DELETE', cookie });
  const afterDelete = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(afterDelete.json.data.unreadContactMessages, 0);
});

/* ------------------------------------------------------------------ *
 * Skill groups
 * ------------------------------------------------------------------ */

test('creates, lists, updates, reorders, and deletes skill groups', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const created = await request(server.base, SKILLS_PATH, {
    method: 'POST',
    body: { label: 'Languages', items: ['JavaScript', 'Python'], order: 2 },
    cookie,
  });
  assert.equal(created.response.status, 201);
  const group = created.json.data.skillGroup;
  assert.equal(typeof group.id, 'string');
  assert.equal(group.label, 'Languages');
  assert.deepEqual(group.items, ['JavaScript', 'Python']);
  assert.equal('_id' in group, false);
  assert.equal('__v' in group, false);

  const stored = await SkillGroup.findOne({ label: 'Languages' }).lean();
  assert.deepEqual(stored.items, ['JavaScript', 'Python']);

  const second = await request(server.base, SKILLS_PATH, {
    method: 'POST',
    body: { label: 'Databases', items: ['MongoDB'], order: 1 },
    cookie,
  });
  assert.equal(second.response.status, 201);

  const list = await request(server.base, SKILLS_PATH, { cookie });
  assert.deepEqual(
    list.json.data.skillGroups.map((item) => item.label),
    ['Databases', 'Languages'],
  );

  const renamed = await request(server.base, `${SKILLS_PATH}/${group.id}`, {
    method: 'PATCH',
    body: { label: 'Programming Languages', items: ['JavaScript', 'Python', 'Go'] },
    cookie,
  });
  assert.equal(renamed.response.status, 200);
  assert.equal(renamed.json.data.skillGroup.label, 'Programming Languages');
  assert.equal(renamed.json.data.skillGroup.items.length, 3);

  const reordered = await request(server.base, `${SKILLS_PATH}/${group.id}`, {
    method: 'PATCH',
    body: { order: 0 },
    cookie,
  });
  assert.equal(reordered.json.data.skillGroup.order, 0);

  const deleted = await request(server.base, `${SKILLS_PATH}/${group.id}`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(deleted.response.status, 204);
  assert.equal(await SkillGroup.countDocuments({ label: 'Programming Languages' }), 0);
});

test('validates skill-group labels, items, order, and duplicates', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const blankLabel = await request(server.base, SKILLS_PATH, {
    method: 'POST',
    body: { label: '   ', items: ['JavaScript'] },
    cookie,
  });
  assert.equal(blankLabel.response.status, 400);
  assert.ok(blankLabel.json.error.fields.label);

  const emptyItems = await request(server.base, SKILLS_PATH, {
    method: 'POST',
    body: { label: 'Empty', items: [] },
    cookie,
  });
  assert.equal(emptyItems.response.status, 400);
  assert.ok(emptyItems.json.error.fields.items);

  const badOrder = await request(server.base, SKILLS_PATH, {
    method: 'POST',
    body: { label: 'Order', items: ['X'], order: -3 },
    cookie,
  });
  assert.equal(badOrder.response.status, 400);
  assert.ok(badOrder.json.error.fields.order);

  await SkillGroup.create({ label: 'Taken', items: ['X'], order: 1 });
  const duplicate = await request(server.base, SKILLS_PATH, {
    method: 'POST',
    body: { label: 'Taken', items: ['Y'] },
    cookie,
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.json?.error?.code, 'LABEL_CONFLICT');
  assert.ok(duplicate.json.error.fields.label);
  assert.equal(await SkillGroup.countDocuments({ label: 'Taken' }), 1);

  const malformed = await request(server.base, `${SKILLS_PATH}/not-an-id`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(malformed.response.status, 400);

  const missing = await request(
    server.base,
    `${SKILLS_PATH}/${new mongoose.Types.ObjectId().toString()}`,
    { method: 'DELETE', cookie },
  );
  assert.equal(missing.response.status, 404);
  assert.equal(missing.json?.error?.code, 'SKILL_GROUP_NOT_FOUND');
});

test('reflects skill-group changes through the public portfolio API', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const created = await request(server.base, SKILLS_PATH, {
    method: 'POST',
    body: { label: 'Tooling', items: ['Vite', 'Vitest'], order: 1 },
    cookie,
  });

  const portfolio = await request(server.base, '/api/portfolio');
  const group = portfolio.json.data.skills.find((item) => item.label === 'Tooling');
  assert.ok(group, 'expected the new skill group in the public payload');
  assert.deepEqual(group.items, ['Vite', 'Vitest']);

  await request(server.base, `${SKILLS_PATH}/${created.json.data.skillGroup.id}`, {
    method: 'DELETE',
    cookie,
  });
  const afterDelete = await request(server.base, '/api/portfolio');
  assert.equal(afterDelete.json.data.skills.some((item) => item.label === 'Tooling'), false);
});

/* ------------------------------------------------------------------ *
 * Education
 * ------------------------------------------------------------------ */

test('creates, lists, updates, reorders, and deletes education entries', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const created = await request(server.base, EDUCATION_PATH, {
    method: 'POST',
    body: validEducation({ institution: 'Second Institute', order: 2 }),
    cookie,
  });
  assert.equal(created.response.status, 201);
  const entry = created.json.data.education;
  assert.equal(entry.institution, 'Second Institute');
  assert.equal(entry.startYear, 2021);
  assert.equal('_id' in entry, false);

  await request(server.base, EDUCATION_PATH, {
    method: 'POST',
    body: validEducation({ institution: 'First Institute', order: 1 }),
    cookie,
  });

  const list = await request(server.base, EDUCATION_PATH, { cookie });
  assert.deepEqual(
    list.json.data.education.map((item) => item.institution),
    ['First Institute', 'Second Institute'],
  );

  const updated = await request(server.base, `${EDUCATION_PATH}/${entry.id}`, {
    method: 'PATCH',
    body: { qualification: 'M.Tech', score: '8.5 CGPA' },
    cookie,
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.json.data.education.qualification, 'M.Tech');
  assert.equal(updated.json.data.education.score, '8.5 CGPA');

  const reordered = await request(server.base, `${EDUCATION_PATH}/${entry.id}`, {
    method: 'PATCH',
    body: { order: 0 },
    cookie,
  });
  assert.equal(reordered.json.data.education.order, 0);

  const deleted = await request(server.base, `${EDUCATION_PATH}/${entry.id}`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(deleted.response.status, 204);
  assert.equal(await Education.countDocuments(), 1);
});

test('validates education required fields, years, and identifiers', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const missing = await request(server.base, EDUCATION_PATH, {
    method: 'POST',
    body: { qualification: 'B.Tech' },
    cookie,
  });
  assert.equal(missing.response.status, 400);
  assert.ok(missing.json.error.fields.institution);

  const badYears = await request(server.base, EDUCATION_PATH, {
    method: 'POST',
    body: validEducation({ startYear: 2025, endYear: 2021 }),
    cookie,
  });
  assert.equal(badYears.response.status, 400);
  assert.ok(badYears.json.error.fields.endYear);

  const outOfRange = await request(server.base, EDUCATION_PATH, {
    method: 'POST',
    body: validEducation({ startYear: 1899 }),
    cookie,
  });
  assert.equal(outOfRange.response.status, 400);
  assert.ok(outOfRange.json.error.fields.startYear);

  const stored = await Education.create(validEducation());
  const badUpdate = await request(server.base, `${EDUCATION_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: { endYear: 2019 },
    cookie,
  });
  assert.equal(badUpdate.response.status, 400);
  assert.ok(badUpdate.json.error.fields.endYear);

  const malformed = await request(server.base, `${EDUCATION_PATH}/nope`, {
    method: 'PATCH',
    body: { order: 1 },
    cookie,
  });
  assert.equal(malformed.response.status, 400);

  const missingId = await request(
    server.base,
    `${EDUCATION_PATH}/${new mongoose.Types.ObjectId().toString()}`,
    { method: 'DELETE', cookie },
  );
  assert.equal(missingId.response.status, 404);
  assert.equal(missingId.json?.error?.code, 'EDUCATION_NOT_FOUND');
});

/* ------------------------------------------------------------------ *
 * Certifications
 * ------------------------------------------------------------------ */

test('creates, lists, updates, and deletes certifications', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const created = await request(server.base, CERTIFICATIONS_PATH, {
    method: 'POST',
    body: validCertification({
      title: 'Advanced Node',
      issuer: 'Example Academy',
      year: 2023,
      url: 'https://example.com/cert',
    }),
    cookie,
  });
  assert.equal(created.response.status, 201);
  const cert = created.json.data.certification;
  assert.equal(cert.title, 'Advanced Node');
  assert.equal(cert.url, 'https://example.com/cert');

  const list = await request(server.base, CERTIFICATIONS_PATH, { cookie });
  assert.equal(list.json.data.certifications.length, 1);

  const updated = await request(server.base, `${CERTIFICATIONS_PATH}/${cert.id}`, {
    method: 'PATCH',
    body: { year: 2024, url: '' },
    cookie,
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.json.data.certification.year, 2024);
  assert.equal(updated.json.data.certification.url, '');

  const deleted = await request(server.base, `${CERTIFICATIONS_PATH}/${cert.id}`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(deleted.response.status, 204);
  assert.equal(await Certification.countDocuments(), 0);
});

test('validates certification fields and optional URL', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const missingTitle = await request(server.base, CERTIFICATIONS_PATH, {
    method: 'POST',
    body: { issuer: 'X', year: 2024 },
    cookie,
  });
  assert.equal(missingTitle.response.status, 400);
  assert.ok(missingTitle.json.error.fields.title);

  const missingYear = await request(server.base, CERTIFICATIONS_PATH, {
    method: 'POST',
    body: { title: 'X', issuer: 'Y' },
    cookie,
  });
  assert.equal(missingYear.response.status, 400);
  assert.ok(missingYear.json.error.fields.year);

  const badUrl = await request(server.base, CERTIFICATIONS_PATH, {
    method: 'POST',
    body: validCertification({ url: 'javascript:alert(1)' }),
    cookie,
  });
  assert.equal(badUrl.response.status, 400);
  assert.ok(badUrl.json.error.fields.url);

  const malformed = await request(server.base, `${CERTIFICATIONS_PATH}/nope`, {
    method: 'PATCH',
    body: { year: 2024 },
    cookie,
  });
  assert.equal(malformed.response.status, 400);
});

/* ------------------------------------------------------------------ *
 * Achievements
 * ------------------------------------------------------------------ */

test('creates, lists, updates, and deletes achievements', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const created = await request(server.base, ACHIEVEMENTS_PATH, {
    method: 'POST',
    body: validAchievement({
      title: 'Departmental Award',
      year: 2022,
      description: 'Recognised for academic performance.',
    }),
    cookie,
  });
  assert.equal(created.response.status, 201);
  const achievement = created.json.data.achievement;
  assert.equal(achievement.title, 'Departmental Award');
  assert.equal(achievement.year, 2022);

  const list = await request(server.base, ACHIEVEMENTS_PATH, { cookie });
  assert.equal(list.json.data.achievements.length, 1);

  const updated = await request(server.base, `${ACHIEVEMENTS_PATH}/${achievement.id}`, {
    method: 'PATCH',
    body: { description: 'Updated description.' },
    cookie,
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.json.data.achievement.description, 'Updated description.');

  const deleted = await request(server.base, `${ACHIEVEMENTS_PATH}/${achievement.id}`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(deleted.response.status, 204);
  assert.equal(await Achievement.countDocuments(), 0);
});

test('validates achievement required fields and order', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const missing = await request(server.base, ACHIEVEMENTS_PATH, {
    method: 'POST',
    body: { description: 'No title or year' },
    cookie,
  });
  assert.equal(missing.response.status, 400);
  assert.ok(missing.json.error.fields.title);
  assert.ok(missing.json.error.fields.year);

  const badOrder = await request(server.base, ACHIEVEMENTS_PATH, {
    method: 'POST',
    body: validAchievement({ order: 'first' }),
    cookie,
  });
  assert.equal(badOrder.response.status, 400);
  assert.ok(badOrder.json.error.fields.order);

  const malformed = await request(server.base, `${ACHIEVEMENTS_PATH}/nope`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(malformed.response.status, 400);
});

/* ------------------------------------------------------------------ *
 * Profile singleton
 * ------------------------------------------------------------------ */

test('creates the profile singleton and never creates a duplicate', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const empty = await request(server.base, PROFILE_PATH, { cookie });
  assert.equal(empty.response.status, 200);
  assert.equal(empty.json.data.profile, null);

  const created = await request(server.base, PROFILE_PATH, {
    method: 'PUT',
    body: validProfile({
      name: 'Pradeep Chavan',
      headline: 'Backend developer',
      intro: 'I build tools.',
      bio: ['First paragraph.', 'Second paragraph.'],
      github: 'https://github.com/Pradeep4002-C',
    }),
    cookie,
  });
  assert.equal(created.response.status, 200);
  assert.equal(created.json.data.profile.name, 'Pradeep Chavan');
  assert.deepEqual(created.json.data.profile.bio, ['First paragraph.', 'Second paragraph.']);
  assert.equal(await Profile.countDocuments(), 1);

  // A partial body omits `bio` and `headline` entirely; the route must keep
  // the stored values rather than blanking them.
  const updated = await request(server.base, PROFILE_PATH, {
    method: 'PUT',
    body: { name: 'Pradeep C', email: 'owner@example.com' },
    cookie,
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.json.data.profile.name, 'Pradeep C');
  assert.deepEqual(updated.json.data.profile.bio, ['First paragraph.', 'Second paragraph.']);
  assert.equal(updated.json.data.profile.headline, 'Backend developer');
  assert.equal(updated.json.data.profile.github, 'https://github.com/Pradeep4002-C');
  assert.equal(await Profile.countDocuments(), 1, 'editing must not create a second profile');

  const reread = await request(server.base, PROFILE_PATH, { cookie });
  assert.equal(reread.json.data.profile.name, 'Pradeep C');
  assert.equal('key' in reread.json.data.profile, false);
  assert.equal('_id' in reread.json.data.profile, false);
});

test('validates profile URLs and rejects forbidden internal fields', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const badUrl = await request(server.base, PROFILE_PATH, {
    method: 'PUT',
    body: validProfile({ github: 'ftp://example.com' }),
    cookie,
  });
  assert.equal(badUrl.response.status, 400);
  assert.ok(badUrl.json.error.fields.github);

  const badEmail = await request(server.base, PROFILE_PATH, {
    method: 'PUT',
    body: validProfile({ email: 'not-an-email' }),
    cookie,
  });
  assert.equal(badEmail.response.status, 400);
  assert.ok(badEmail.json.error.fields.email);

  const forbidden = await request(server.base, PROFILE_PATH, {
    method: 'PUT',
    body: { ...validProfile(), key: 'hacked', _id: '123456789012345678901234' },
    cookie,
  });
  assert.equal(forbidden.response.status, 400);
  assert.ok(forbidden.json.error.fields.form);
  assert.equal(await Profile.countDocuments(), 0);
});

test('reflects profile changes through the public portfolio API', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  await request(server.base, PROFILE_PATH, {
    method: 'PUT',
    body: validProfile({
      name: 'Pradeep Chavan',
      headline: 'Full-stack developer',
      location: 'Pune, India',
      email: 'hello@example.com',
    }),
    cookie,
  });

  const portfolio = await request(server.base, '/api/portfolio');
  assert.equal(portfolio.json.data.profile.name, 'Pradeep Chavan');
  assert.equal(portfolio.json.data.profile.headline, 'Full-stack developer');
  assert.equal(portfolio.json.data.profile.location, 'Pune, India');
  assert.equal(portfolio.json.data.profile.email, 'hello@example.com');
  assert.equal('_id' in portfolio.json.data.profile, false);
});

/* ------------------------------------------------------------------ *
 * Regression
 * ------------------------------------------------------------------ */

test('keeps the public health, portfolio, and contact endpoints working', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const health = await request(server.base, '/api/health');
  assert.equal(health.response.status, 200);

  const portfolio = await request(server.base, '/api/portfolio');
  assert.equal(portfolio.response.status, 200);
  assert.ok(Array.isArray(portfolio.json.data.projects));

  const contact = await request(server.base, '/api/contact', {
    method: 'POST',
    body: {
      name: 'Visitor',
      email: 'visitor@example.com',
      subject: 'Hello',
      message: 'This is a valid message body.',
      formStartedAt: Date.now() - 5000,
    },
  });
  assert.equal(contact.response.status, 201);
});

test('serves 503 for the admin API when no session is configured', async (t) => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const result = await request(`http://127.0.0.1:${port}`, MESSAGES_PATH);
  assert.equal(result.response.status, 503);
  assert.equal(result.json?.error?.code, 'SESSION_UNAVAILABLE');
});
