import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Admin } from '../src/models/Admin.js';
import { Project } from '../src/models/Project.js';
import { SkillGroup } from '../src/models/SkillGroup.js';
import { ContactMessage } from '../src/models/ContactMessage.js';
import {
  createSessionMiddleware,
  createSessionStore,
} from '../src/config/session.js';
import { hashPassword } from '../src/lib/password.js';

/*
 * Administrator API tests require a local MongoDB (or TEST_MONGODB_URI). The
 * default is a disposable database ending in `_test`; the suite refuses to run
 * against the development portfolio database.
 */
const TEST_URI =
  process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/pradeep_portfolio_m6_test';
const TEST_DB_NAME = TEST_URI.split('/').pop()?.split('?')[0] ?? '';

if (!TEST_DB_NAME.endsWith('_test') || TEST_DB_NAME === 'pradeep_portfolio') {
  throw new Error('Administrator tests require an isolated database whose name ends in `_test`.');
}

const TEST_SECRET = 'm6-test-session-secret-0123456789abcdef';
const TEST_ORIGIN = 'http://localhost:5173';
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'M6-Test-Password-123!';

const OVERVIEW_PATH = '/api/admin/overview';
const PROJECTS_PATH = '/api/admin/projects';
const LOGIN_PATH = '/api/auth/login';

function validProject(overrides = {}) {
  return {
    title: 'Sample Project',
    slug: `sample-${Math.random().toString(36).slice(2, 10)}`,
    category: 'Web Application',
    summary: 'A short summary.',
    description: 'A longer description of the project.',
    technologies: ['React', 'Node.js'],
    repoUrl: 'https://github.com/example/sample',
    featured: false,
    artwork: 'hostelcare',
    order: 1,
    published: true,
    ...overrides,
  };
}

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

before(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Project.init(), Admin.init(), SkillGroup.init(), ContactMessage.init()]);
});

beforeEach(async () => {
  await Promise.all([
    Admin.deleteMany({}),
    Project.deleteMany({}),
    SkillGroup.deleteMany({}),
    ContactMessage.deleteMany({}),
    mongoose.connection.collection('sessions').deleteMany({}),
  ]);
});

after(async () => {
  await Promise.all([
    Admin.deleteMany({}),
    Project.deleteMany({}),
    SkillGroup.deleteMany({}),
    ContactMessage.deleteMany({}),
    mongoose.connection.collection('sessions').deleteMany({}),
  ]);
  await mongoose.disconnect();
});

/* ------------------------------------------------------------------ *
 * Authorization
 * ------------------------------------------------------------------ */

test('rejects unauthenticated overview, list, create, update, and delete with 401', async (t) => {
  const server = await startServer();
  t.after(server.close);

  const existing = await Project.create(validProject());
  const payload = validProject();

  const responses = await Promise.all([
    request(server.base, OVERVIEW_PATH),
    request(server.base, PROJECTS_PATH),
    request(server.base, PROJECTS_PATH, { method: 'POST', body: payload }),
    request(server.base, `${PROJECTS_PATH}/${existing._id}`, {
      method: 'PATCH',
      body: { title: 'Renamed' },
    }),
    request(server.base, `${PROJECTS_PATH}/${existing._id}`, { method: 'DELETE' }),
  ]);

  for (const result of responses) {
    assert.equal(result.response.status, 401);
    assert.equal(result.json?.error?.code, 'UNAUTHENTICATED');
  }

  assert.equal(await Project.countDocuments(), 1, 'no project should have been created');
  const untouched = await Project.findById(existing._id).lean();
  assert.equal(untouched.title, 'Sample Project');
});

test('rejects unexpected origins for state-changing admin requests', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const created = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ slug: 'origin-allowed' }),
    cookie,
    headers: { Origin: 'https://evil.example' },
  });
  assert.equal(created.response.status, 403);
  assert.equal(created.json?.error?.code, 'FORBIDDEN_ORIGIN');
  assert.equal(await Project.countDocuments(), 0);

  const allowed = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ slug: 'origin-allowed' }),
    cookie,
    headers: { Origin: TEST_ORIGIN },
  });
  assert.equal(allowed.response.status, 201);

  const foreignPatch = await request(server.base, `${PROJECTS_PATH}/${allowed.json.data.project.id}`, {
    method: 'PATCH',
    body: { title: 'Nope' },
    cookie,
    headers: { Origin: 'https://evil.example' },
  });
  assert.equal(foreignPatch.response.status, 403);

  const foreignDelete = await request(server.base, `${PROJECTS_PATH}/${allowed.json.data.project.id}`, {
    method: 'DELETE',
    cookie,
    headers: { Origin: 'https://evil.example' },
  });
  assert.equal(foreignDelete.response.status, 403);
});

test('serves the overview and project list for an authenticated administrator', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const overview = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(overview.response.status, 200);
  assert.deepEqual(overview.json.data, {
    totalProjects: 0,
    publishedProjects: 0,
    unpublishedProjects: 0,
    totalSkillGroups: 0,
    unreadContactMessages: 0,
  });

  const list = await request(server.base, PROJECTS_PATH, { cookie });
  assert.equal(list.response.status, 200);
  assert.deepEqual(list.json.data.projects, []);
});

/* ------------------------------------------------------------------ *
 * Project CRUD
 * ------------------------------------------------------------------ */

test('lists every project, including unpublished, ordered by order then title', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  await Project.create(validProject({ slug: 'second', title: 'Second', order: 2 }));
  await Project.create(validProject({ slug: 'first-b', title: 'Bravo', order: 1, published: false }));
  await Project.create(validProject({ slug: 'first-a', title: 'Alpha', order: 1 }));

  const list = await request(server.base, PROJECTS_PATH, { cookie });
  assert.equal(list.response.status, 200);
  assert.deepEqual(
    list.json.data.projects.map((project) => project.slug),
    ['first-a', 'first-b', 'second'],
  );
  assert.equal(list.json.data.projects[1].published, false);
  assert.equal(list.text.includes('__v'), false);
});

test('creates a project and persists the exact MongoDB document', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const payload = validProject({
    slug: 'created-project',
    title: 'Created Project',
    technologies: ['React', 'Express'],
    featured: true,
    order: 4,
    demoUrl: 'https://example.com/demo',
  });

  const created = await request(server.base, PROJECTS_PATH, { method: 'POST', body: payload, cookie });
  assert.equal(created.response.status, 201);
  const project = created.json.data.project;
  assert.equal(typeof project.id, 'string');
  assert.equal(project.slug, 'created-project');
  assert.deepEqual(project.technologies, ['React', 'Express']);
  assert.equal('__v' in project, false);
  assert.equal('_id' in project, false);

  const stored = await Project.findOne({ slug: 'created-project' }).lean();
  assert.ok(stored, 'expected the project to be persisted');
  assert.equal(stored.title, 'Created Project');
  assert.equal(stored.featured, true);
  assert.deepEqual(stored.technologies, ['React', 'Express']);
  assert.equal(stored.demoUrl, 'https://example.com/demo');
});

test('retrieves a single project by id', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const stored = await Project.create(validProject({ slug: 'single', title: 'Single' }));

  const found = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, { cookie });
  assert.equal(found.response.status, 200);
  assert.equal(found.json.data.project.title, 'Single');
  assert.equal(found.json.data.project.id, String(stored._id));
});

test('updates the title, description, and technologies', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const stored = await Project.create(validProject({ slug: 'editable' }));

  const updated = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: {
      title: 'Renamed Project',
      description: 'A brand new description.',
      technologies: ['TypeScript', 'MongoDB'],
    },
    cookie,
  });

  assert.equal(updated.response.status, 200);
  assert.equal(updated.json.data.project.title, 'Renamed Project');

  const fresh = await Project.findById(stored._id).lean();
  assert.equal(fresh.title, 'Renamed Project');
  assert.equal(fresh.description, 'A brand new description.');
  assert.deepEqual(fresh.technologies, ['TypeScript', 'MongoDB']);

  const reread = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, { cookie });
  assert.equal(reread.json.data.project.title, 'Renamed Project');
});

test('publishes and unpublishes a project and hides unpublished projects from the public API', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const stored = await Project.create(validProject({ slug: 'toggled', published: true }));

  const publicBefore = await request(server.base, '/api/portfolio');
  assert.ok(publicBefore.json.data.projects.some((project) => project.slug === 'toggled'));

  const unpublished = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: { published: false },
    cookie,
  });
  assert.equal(unpublished.response.status, 200);
  assert.equal(unpublished.json.data.project.published, false);

  const publicAfter = await request(server.base, '/api/portfolio');
  assert.equal(publicAfter.json.data.projects.some((project) => project.slug === 'toggled'), false);

  const adminList = await request(server.base, PROJECTS_PATH, { cookie });
  assert.ok(adminList.json.data.projects.some((project) => project.slug === 'toggled'));

  const republished = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: { published: true },
    cookie,
  });
  assert.equal(republished.json.data.project.published, true);
});

test('rejects invalid slugs', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const result = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ slug: 'Not A Valid Slug!' }),
    cookie,
  });

  assert.equal(result.response.status, 400);
  assert.equal(result.json?.error?.code, 'VALIDATION_FAILED');
  assert.ok(result.json.error.fields.slug);
});

test('rejects invalid repository and demo URLs', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const badRepo = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ repoUrl: 'ftp://example.com/repo' }),
    cookie,
  });
  assert.equal(badRepo.response.status, 400);
  assert.ok(badRepo.json.error.fields.repoUrl);

  const badDemo = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ demoUrl: 'javascript:alert(1)' }),
    cookie,
  });
  assert.equal(badDemo.response.status, 400);
  assert.ok(badDemo.json.error.fields.demoUrl);
});

test('rejects invalid artwork values', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const result = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ artwork: 'not-a-real-illustration' }),
    cookie,
  });

  assert.equal(result.response.status, 400);
  assert.ok(result.json.error.fields.artwork);
});

test('rejects boolean and numeric fields sent with the wrong type', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const result = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: { ...validProject(), featured: 'yes', order: 'first' },
    cookie,
  });

  assert.equal(result.response.status, 400);
  assert.ok(result.json.error.fields.featured);
  assert.ok(result.json.error.fields.order);
});

test('rejects malformed ObjectId route parameters', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const results = await Promise.all([
    request(server.base, `${PROJECTS_PATH}/not-an-object-id`, { cookie }),
    request(server.base, `${PROJECTS_PATH}/not-an-object-id`, {
      method: 'PATCH',
      body: { title: 'X' },
      cookie,
    }),
    request(server.base, `${PROJECTS_PATH}/not-an-object-id`, { method: 'DELETE', cookie }),
  ]);

  for (const result of results) {
    assert.equal(result.response.status, 400);
    assert.equal(result.json?.error?.code, 'VALIDATION_FAILED');
  }
});

test('rejects duplicate slugs with 409 on create and update', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  await Project.create(validProject({ slug: 'taken-slug' }));
  const other = await Project.create(validProject({ slug: 'other-slug' }));

  const duplicateCreate = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ slug: 'taken-slug' }),
    cookie,
  });
  assert.equal(duplicateCreate.response.status, 409);
  assert.equal(duplicateCreate.json?.error?.code, 'SLUG_CONFLICT');

  const duplicateUpdate = await request(server.base, `${PROJECTS_PATH}/${other._id}`, {
    method: 'PATCH',
    body: { slug: 'taken-slug' },
    cookie,
  });
  assert.equal(duplicateUpdate.response.status, 409);
  assert.equal(duplicateUpdate.json?.error?.code, 'SLUG_CONFLICT');
  assert.equal(await Project.countDocuments({ slug: 'taken-slug' }), 1);
});

test('rejects forbidden fields such as _id, __v, and timestamps', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const forbiddenCreate = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: { ...validProject(), _id: '123456789012345678901234', __v: 9 },
    cookie,
  });
  assert.equal(forbiddenCreate.response.status, 400);
  assert.ok(forbiddenCreate.json.error.fields.form);

  const stored = await Project.create(validProject({ slug: 'protected' }));
  const forbiddenUpdate = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: { title: 'New', createdAt: '2000-01-01T00:00:00.000Z' },
    cookie,
  });
  assert.equal(forbiddenUpdate.response.status, 400);
  assert.ok(forbiddenUpdate.json.error.fields.form);
});

test('rejects an empty update body', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const stored = await Project.create(validProject({ slug: 'no-changes' }));
  const result = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, {
    method: 'PATCH',
    body: {},
    cookie,
  });

  assert.equal(result.response.status, 400);
  assert.equal(result.json?.error?.code, 'VALIDATION_FAILED');
});

test('returns 404 for a nonexistent but well-formed project id', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);
  const missingId = new mongoose.Types.ObjectId().toString();

  const results = await Promise.all([
    request(server.base, `${PROJECTS_PATH}/${missingId}`, { cookie }),
    request(server.base, `${PROJECTS_PATH}/${missingId}`, {
      method: 'PATCH',
      body: { title: 'X' },
      cookie,
    }),
    request(server.base, `${PROJECTS_PATH}/${missingId}`, { method: 'DELETE', cookie }),
  ]);

  for (const result of results) {
    assert.equal(result.response.status, 404);
    assert.equal(result.json?.error?.code, 'PROJECT_NOT_FOUND');
  }
});

test('deletes a project and confirms it no longer exists', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const stored = await Project.create(validProject({ slug: 'doomed' }));

  const deleted = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, {
    method: 'DELETE',
    cookie,
  });
  assert.equal(deleted.response.status, 204);
  assert.equal(deleted.text, '');

  assert.equal(await Project.countDocuments({ _id: stored._id }), 0);
  const reread = await request(server.base, `${PROJECTS_PATH}/${stored._id}`, { cookie });
  assert.equal(reread.response.status, 404);
});

test('enforces the unique slug index at the database level', async (t) => {
  const server = await startServer();
  t.after(server.close);
  await loginAsAdmin(server.base);

  await Project.create(validProject({ slug: 'unique-slug' }));
  await assert.rejects(
    () => Project.create(validProject({ slug: 'unique-slug' })),
    (error) => error?.code === 11000,
  );
});

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */

test('calculates overview counts from real records and never exposes message bodies', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const secretBody = 'PRIVATE-MESSAGE-BODY-MARKER-9f3a';
  await Project.create(validProject({ slug: 'published-one', published: true }));
  await Project.create(validProject({ slug: 'published-two', published: true }));
  await Project.create(validProject({ slug: 'draft-one', published: false }));
  await SkillGroup.create({ label: 'Languages', items: ['JavaScript'], order: 1 });
  await SkillGroup.create({ label: 'Databases', items: ['MongoDB'], order: 2 });
  await ContactMessage.create({
    name: 'Visitor',
    email: 'visitor@example.com',
    message: secretBody,
    read: false,
  });
  await ContactMessage.create({
    name: 'Other',
    email: 'other@example.com',
    message: 'An already-read message.',
    read: true,
  });

  const overview = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(overview.response.status, 200);
  assert.deepEqual(overview.json.data, {
    totalProjects: 3,
    publishedProjects: 2,
    unpublishedProjects: 1,
    totalSkillGroups: 2,
    unreadContactMessages: 1,
  });

  assert.equal(overview.text.includes(secretBody), false, 'message bodies must never be returned');
  assert.equal(overview.text.includes('visitor@example.com'), false);
  assert.equal('messages' in overview.json.data, false);

  await Project.deleteOne({ slug: 'draft-one' });
  const afterDelete = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(afterDelete.json.data.totalProjects, 2);
  assert.equal(afterDelete.json.data.unpublishedProjects, 0);
});

test('overview counts change when the admin API creates and deletes projects', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await loginAsAdmin(server.base);

  const created = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ slug: 'counted', published: false }),
    cookie,
  });
  assert.equal(created.response.status, 201);

  const afterCreate = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(afterCreate.json.data.totalProjects, 1);
  assert.equal(afterCreate.json.data.publishedProjects, 0);
  assert.equal(afterCreate.json.data.unpublishedProjects, 1);

  await request(server.base, `${PROJECTS_PATH}/${created.json.data.project.id}`, {
    method: 'DELETE',
    cookie,
  });

  const afterDelete = await request(server.base, OVERVIEW_PATH, { cookie });
  assert.equal(afterDelete.json.data.totalProjects, 0);
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

  const result = await request(`http://127.0.0.1:${port}`, OVERVIEW_PATH);
  assert.equal(result.response.status, 503);
  assert.equal(result.json?.error?.code, 'SESSION_UNAVAILABLE');
});
