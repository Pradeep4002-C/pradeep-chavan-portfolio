import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Admin } from '../src/models/Admin.js';
import { Project } from '../src/models/Project.js';
import { createSessionMiddleware, createSessionStore } from '../src/config/session.js';
import { hashPassword } from '../src/lib/password.js';

/*
 * Workflow tests are isolated from the real development database. The suite
 * refuses to run against any database whose name does not end in `_test`.
 */
const TEST_URI =
  process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/pradeep_portfolio_workflow_test';
const TEST_DB_NAME = TEST_URI.split('/').pop()?.split('?')[0] ?? '';

if (!TEST_DB_NAME.endsWith('_test') || TEST_DB_NAME === 'pradeep_portfolio') {
  throw new Error('Workflow tests require an isolated database whose name ends in `_test`.');
}

const TEST_SECRET = 'workflow-test-session-secret-0123456789abcdef';
const TEST_ORIGIN = 'http://localhost:5173';
const TEST_EMAIL = 'workflow-admin@example.com';
const TEST_PASSWORD = 'Workflow-Test-Password-123!';
const PROJECTS_PATH = '/api/admin/projects';

function step(overrides = {}) {
  return {
    id: 'step-1',
    title: 'User submits a request',
    description: 'The browser sends a validated form.',
    type: 'input',
    ...overrides,
  };
}

function steps() {
  return [
    step({ id: 'step-1', title: 'User submits a request', type: 'input' }),
    step({ id: 'step-2', title: 'React renders the dashboard', type: 'frontend' }),
    step({ id: 'step-3', title: 'Express validates the request', type: 'backend' }),
    step({ id: 'step-4', title: 'MongoDB stores the project', type: 'database' }),
  ];
}

function validProject(overrides = {}) {
  return {
    title: 'Workflow Project',
    slug: `workflow-${Math.random().toString(36).slice(2, 10)}`,
    category: 'Web application',
    summary: 'A data-driven workflow illustration.',
    description: 'The project demonstrates an administrator-authored workflow diagram.',
    technologies: ['React', 'Express', 'MongoDB'],
    repoUrl: 'https://github.com/example/workflow',
    demoUrl: '',
    featured: false,
    artwork: 'workflow',
    workflow: { steps: steps() },
    order: 1,
    published: true,
    ...overrides,
  };
}

async function startServer() {
  const store = createSessionStore({
    client: mongoose.connection.getClient(),
    dbName: mongoose.connection.name,
  });
  const app = createApp({
    session: {
      store,
      middleware: createSessionMiddleware({
        secret: TEST_SECRET,
        store,
        isProduction: false,
        trustProxy: false,
      }),
      isProduction: false,
      clientOrigin: TEST_ORIGIN,
    },
    loginRateLimit: { limit: 100, windowMs: 60 * 1000 },
    contactRateLimit: { limit: 100, windowMs: 60 * 1000 },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function request(base, path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
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

async function login(base) {
  await Admin.create({
    email: TEST_EMAIL,
    name: 'Workflow Test Administrator',
    passwordHash: await hashPassword(TEST_PASSWORD),
  });
  const result = await request(base, '/api/auth/login', {
    method: 'POST',
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  assert.equal(result.response.status, 200);
  return sessionCookieFrom(result.setCookieValues);
}

before(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Admin.init(), Project.init()]);
});

beforeEach(async () => {
  await Promise.all([
    Admin.deleteMany({}),
    Project.deleteMany({}),
    mongoose.connection.collection('sessions').deleteMany({}),
  ]);
});

after(async () => {
  await Promise.all([
    Admin.deleteMany({}),
    Project.deleteMany({}),
    mongoose.connection.collection('sessions').deleteMany({}),
  ]);
  await mongoose.disconnect();
});

test('creates a workflow project, persists every step, and returns it publicly', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await login(server.base);

  const created = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ slug: 'workflow-created' }),
    cookie,
  });

  assert.equal(created.response.status, 201);
  assert.equal(created.json.data.project.workflow.steps.length, 4);
  assert.equal(created.json.data.project.workflow.steps[2].title, 'Express validates the request');
  assert.equal(created.json.data.project.workflow.steps[3].type, 'database');

  const stored = await Project.findOne({ slug: 'workflow-created' }).lean();
  assert.equal(stored.workflow.steps.length, 4);
  assert.equal(stored.workflow.steps[0].description, 'The browser sends a validated form.');
  assert.equal(stored.workflow.steps[1].type, 'frontend');

  const publicResponse = await request(server.base, '/api/portfolio');
  assert.equal(publicResponse.response.status, 200);
  const publicProject = publicResponse.json.data.projects.find(
    (project) => project.slug === 'workflow-created',
  );
  assert.ok(publicProject, 'expected the published workflow project');
  assert.equal(publicProject.artwork, 'workflow');
  assert.deepEqual(
    publicProject.workflow.steps.map((entry) => entry.id),
    ['step-1', 'step-2', 'step-3', 'step-4'],
  );
  assert.equal(JSON.stringify(publicProject).includes('__v'), false);
});

test('editing steps and order persists, while an unrelated patch preserves workflow data', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await login(server.base);

  const created = await request(server.base, PROJECTS_PATH, {
    method: 'POST',
    body: validProject({ slug: 'workflow-edited' }),
    cookie,
  });
  const id = created.json.data.project.id;

  const reordered = [steps()[1], steps()[0], steps()[2], steps()[3]];
  reordered[0] = { ...reordered[0], title: 'React receives the event' };

  const edited = await request(server.base, `${PROJECTS_PATH}/${id}`, {
    method: 'PATCH',
    body: { workflow: { steps: reordered } },
    cookie,
  });
  assert.equal(edited.response.status, 200);
  assert.equal(edited.json.data.project.workflow.steps[0].title, 'React receives the event');
  assert.deepEqual(
    edited.json.data.project.workflow.steps.map((entry) => entry.id),
    ['step-2', 'step-1', 'step-3', 'step-4'],
  );

  const titlePatch = await request(server.base, `${PROJECTS_PATH}/${id}`, {
    method: 'PATCH',
    body: { title: 'Renamed without touching workflow' },
    cookie,
  });
  assert.equal(titlePatch.response.status, 200);
  assert.equal(titlePatch.json.data.project.workflow.steps.length, 4);
  assert.equal(
    titlePatch.json.data.project.workflow.steps[0].title,
    'React receives the event',
  );

  const reread = await request(server.base, `${PROJECTS_PATH}/${id}`, { cookie });
  assert.equal(reread.json.data.project.workflow.steps[3].title, 'MongoDB stores the project');
});

test('unpublishing hides a workflow project from the public API and republishing restores it', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await login(server.base);

  const created = await Project.create(validProject({ slug: 'workflow-visibility' }));
  const before = await request(server.base, '/api/portfolio');
  assert.ok(before.json.data.projects.some((project) => project.slug === 'workflow-visibility'));

  const hidden = await request(server.base, `${PROJECTS_PATH}/${created._id}`, {
    method: 'PATCH',
    body: { published: false },
    cookie,
  });
  assert.equal(hidden.response.status, 200);
  assert.equal(hidden.json.data.project.workflow.steps.length, 4);

  const afterHide = await request(server.base, '/api/portfolio');
  assert.equal(
    afterHide.json.data.projects.some((project) => project.slug === 'workflow-visibility'),
    false,
  );

  await request(server.base, `${PROJECTS_PATH}/${created._id}`, {
    method: 'PATCH',
    body: { published: true },
    cookie,
  });
  const afterRepublish = await request(server.base, '/api/portfolio');
  assert.ok(
    afterRepublish.json.data.projects.some((project) => project.slug === 'workflow-visibility'),
  );
});

test('legacy artwork works without workflow data and gains workflow only when explicitly set', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await login(server.base);

  const legacy = await Project.create(
    validProject({ slug: 'legacy-artwork', artwork: 'hostelcare', workflow: undefined }),
  );
  const publicLegacy = await request(server.base, '/api/portfolio');
  const publicProject = publicLegacy.json.data.projects.find(
    (project) => project.slug === 'legacy-artwork',
  );
  assert.equal(publicProject.artwork, 'hostelcare');
  assert.equal(publicProject.workflow, undefined);

  const withoutSteps = await request(server.base, `${PROJECTS_PATH}/${legacy._id}`, {
    method: 'PATCH',
    body: { artwork: 'workflow' },
    cookie,
  });
  assert.equal(withoutSteps.response.status, 400);
  assert.ok(withoutSteps.json.error.fields.workflow);

  const withWorkflow = await request(server.base, `${PROJECTS_PATH}/${legacy._id}`, {
    method: 'PATCH',
    body: { artwork: 'workflow', workflow: { steps: steps().slice(0, 2) } },
    cookie,
  });
  assert.equal(withWorkflow.response.status, 200);
  assert.equal(withWorkflow.json.data.project.workflow.steps.length, 2);

  const cleared = await request(server.base, `${PROJECTS_PATH}/${legacy._id}`, {
    method: 'PATCH',
    body: { artwork: 'hostelcare', workflow: null },
    cookie,
  });
  assert.equal(cleared.response.status, 200);
  assert.equal(cleared.json.data.project.workflow, null);
});

test('rejects unsafe or malformed workflow data without creating a project', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await login(server.base);

  const cases = [
    ['one step', { steps: steps().slice(0, 1) }],
    ['too many steps', { steps: Array.from({ length: 11 }, (_, index) => step({ id: `step-${index + 1}`, title: `Step ${index + 1}` })) }],
    ['unsupported type', { steps: [step(), step({ id: 'step-2', type: 'script' })] }],
    [
      'duplicate ids',
      { steps: [step(), step({ id: 'step-1', title: 'Duplicate id' })] },
    ],
    ['html in title', { steps: [step({ title: '<script>alert(1)</script>' }), step({ id: 'step-2' })] }],
    ['html in description', { steps: [step({ description: '<style>body{display:none}</style>' }), step({ id: 'step-2' })] }],
    ['blank title', { steps: [step({ title: '   ' }), step({ id: 'step-2' })] }],
    ['oversized title', { steps: [step({ title: 'x'.repeat(121) }), step({ id: 'step-2' })] }],
    ['missing id', { steps: [{ ...step(), id: undefined }, step({ id: 'step-2' })] }],
    ['unknown step field', { steps: [{ ...step(), svg: '<svg onload="alert(1)"/>' }, step({ id: 'step-2' })] }],
    ['empty workflow', { steps: [] }],
    ['null workflow', null],
  ];

  for (const [label, workflow] of cases) {
    const result = await request(server.base, PROJECTS_PATH, {
      method: 'POST',
      body: validProject({ workflow }),
      cookie,
    });
    assert.equal(result.response.status, 400, `${label} should be rejected`);
    assert.equal(result.json?.error?.code, 'VALIDATION_FAILED', `${label} should be a validation error`);
    assert.ok(result.json?.error?.fields?.workflow, `${label} should identify workflow`);
  }

  assert.equal(await Project.countDocuments(), 0);
});

test('cannot switch artwork to workflow with a cleared or missing stored workflow', async (t) => {
  const server = await startServer();
  t.after(server.close);
  const cookie = await login(server.base);

  const legacy = await Project.create(
    validProject({ slug: 'cannot-become-workflow', artwork: 'expense', workflow: null }),
  );

  const missing = await request(server.base, `${PROJECTS_PATH}/${legacy._id}`, {
    method: 'PATCH',
    body: { artwork: 'workflow' },
    cookie,
  });
  assert.equal(missing.response.status, 400);
  assert.equal(missing.json.error.code, 'VALIDATION_FAILED');

  const cleared = await request(server.base, `${PROJECTS_PATH}/${legacy._id}`, {
    method: 'PATCH',
    body: { artwork: 'workflow', workflow: null },
    cookie,
  });
  assert.equal(cleared.response.status, 400);
  assert.equal(cleared.json.error.code, 'VALIDATION_FAILED');

  const stored = await Project.findById(legacy._id).lean();
  assert.equal(stored.artwork, 'expense');
});
