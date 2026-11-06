import assert from 'node:assert/strict';
import test from 'node:test';
import { startServer } from '../src/startServer.js';

const TEST_CONFIG = Object.freeze({
  nodeEnv: 'test',
  isProduction: false,
  trustProxy: false,
  port: 0,
  mongodbUri: 'mongodb://127.0.0.1:27017/pradeep_portfolio_startup_test',
  sessionSecret: 'test-session-secret-at-least-32-characters',
  clientOrigin: '',
  envFilePath: 'test-env-file',
  envFileExists: false,
});

function createTestLogger() {
  return {
    info() {},
    success() {},
    warn() {},
    error() {},
  };
}

function createFakeServer() {
  return {
    listeners: new Map(),
    on(event, handler) {
      this.listeners.set(event, handler);
      return this;
    },
  };
}

function baseOptions(overrides = {}) {
  return {
    loadConfig: () => TEST_CONFIG,
    connect: async () => {},
    disconnect: async () => {},
    ensureIndexes: async () => {},
    createStore: () => ({}),
    createSession: () => (req, res, next) => next(),
    createApplication: () => ({}),
    checkFrontend: () => true,
    listen: () => createFakeServer(),
    onFailure: () => {},
    log: createTestLogger(),
    ...overrides,
  };
}

test('waits for model indexes before creating the app or listening', async () => {
  const events = [];
  let releaseIndexes;
  let markIndexesStarted;
  const indexesPending = new Promise((resolve) => {
    releaseIndexes = resolve;
  });
  const indexesStarted = new Promise((resolve) => {
    markIndexesStarted = resolve;
  });

  const startup = startServer(
    baseOptions({
      connect: async () => {
        events.push('database');
      },
      ensureIndexes: async () => {
        events.push('indexes:start');
        markIndexesStarted();
        await indexesPending;
        events.push('indexes:done');
      },
      createStore: () => {
        events.push('session-store');
        return {};
      },
      createSession: () => {
        events.push('session-middleware');
        return () => {};
      },
      createApplication: () => {
        events.push('application');
        return {};
      },
      listen: () => {
        events.push('listen');
        return createFakeServer();
      },
      onServerCreated: () => {
        events.push('server-created');
      },
    }),
  );

  await indexesStarted;

  assert.deepEqual(events, ['database', 'indexes:start']);
  assert.equal(events.includes('session-store'), false);
  assert.equal(events.includes('application'), false);
  assert.equal(events.includes('listen'), false);

  releaseIndexes();
  const started = await startup;

  assert.ok(started?.httpServer);
  assert.deepEqual(events, [
    'database',
    'indexes:start',
    'indexes:done',
    'session-store',
    'session-middleware',
    'application',
    'listen',
    'server-created',
  ]);
});

test('does not listen or create the app when index initialization fails', async () => {
  const events = [];
  const failures = [];
  let listened = false;
  let disconnected = false;

  const started = await startServer(
    baseOptions({
      connect: async () => {
        events.push('database');
      },
      ensureIndexes: async () => {
        events.push('indexes');
        throw new Error('index build rejected');
      },
      createStore: () => {
        events.push('session-store');
        return {};
      },
      createApplication: () => {
        events.push('application');
        return {};
      },
      listen: () => {
        listened = true;
        return createFakeServer();
      },
      disconnect: async () => {
        disconnected = true;
        events.push('disconnect');
      },
      onFailure: (message, context) => {
        failures.push({ message, context });
      },
    }),
  );

  assert.equal(started, null);
  assert.equal(listened, false);
  assert.equal(disconnected, true);
  assert.deepEqual(events, ['database', 'indexes', 'disconnect']);
  assert.equal(failures.length, 1);
  assert.match(failures[0].message, /index initialization failed/i);
  assert.equal(failures[0].context.code, 'DATABASE_INDEX_INITIALIZATION_FAILED');
  assert.match(failures[0].context.error, /index build rejected/);
});

test('does not initialize indexes or listen when the database connection fails', async () => {
  const failures = [];
  let indexesRan = false;
  let listened = false;
  let disconnected = false;

  const started = await startServer(
    baseOptions({
      connect: async () => {
        throw new Error('connection refused');
      },
      ensureIndexes: async () => {
        indexesRan = true;
      },
      listen: () => {
        listened = true;
        return createFakeServer();
      },
      disconnect: async () => {
        disconnected = true;
      },
      onFailure: (message, context) => {
        failures.push({ message, context });
      },
    }),
  );

  assert.equal(started, null);
  assert.equal(indexesRan, false);
  assert.equal(listened, false);
  assert.equal(disconnected, true);
  assert.equal(failures.length, 1);
  assert.match(failures[0].message, /database connection failed/i);
  assert.equal(failures[0].context.code, 'DATABASE_UNAVAILABLE');
  assert.match(failures[0].context.error, /connection refused/);
});

test('closes the database and does not listen when session setup fails', async () => {
  const failures = [];
  let listened = false;
  let disconnected = false;

  const started = await startServer(
    baseOptions({
      createStore: () => {
        throw new Error('session store unavailable');
      },
      listen: () => {
        listened = true;
        return createFakeServer();
      },
      disconnect: async () => {
        disconnected = true;
      },
      onFailure: (message, context) => {
        failures.push({ message, context });
      },
    }),
  );

  assert.equal(started, null);
  assert.equal(listened, false);
  assert.equal(disconnected, true);
  assert.equal(failures.length, 1);
  assert.match(failures[0].message, /session configuration failed/i);
  assert.equal(failures[0].context.code, 'SESSION_CONFIGURATION_FAILED');
});
