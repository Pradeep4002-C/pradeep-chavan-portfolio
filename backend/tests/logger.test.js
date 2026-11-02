import assert from 'node:assert/strict';
import test from 'node:test';
import { createLogger } from '../src/lib/logger.js';

const FIXED_TIME = new Date(Date.UTC(2026, 10, 2, 10, 48, 12));

function capture({ tty = false } = {}) {
  const stdoutChunks = [];
  const stderrChunks = [];

  return {
    stdout: {
      isTTY: tty,
      write(chunk) {
        stdoutChunks.push(chunk);
      },
    },
    stderr: {
      isTTY: tty,
      write(chunk) {
        stderrChunks.push(chunk);
      },
    },
    out() {
      return stdoutChunks.join('');
    },
    err() {
      return stderrChunks.join('');
    },
    all() {
      return `${stdoutChunks.join('')}${stderrChunks.join('')}`;
    },
  };
}

function developmentLogger(sink, env = {}) {
  return createLogger({
    env: { NODE_ENV: 'development', ...env },
    stdout: sink.stdout,
    stderr: sink.stderr,
    now: () => FIXED_TIME,
    color: false,
  });
}

test('development output is readable, labelled, and free of ANSI when redirected', () => {
  const sink = capture();
  const logger = developmentLogger(sink);

  logger.info('Environment loaded', { env: 'development', port: 4000 });
  logger.success('MongoDB connected', { database: 'pradeep_portfolio', host: '127.0.0.1' });
  logger.error('Database connection failed', {
    code: 'DATABASE_UNAVAILABLE',
    hint: 'Check your MongoDB service and configuration.',
  });

  assert.match(
    sink.out(),
    /^\[\d{2}:\d{2}:\d{2}\] INFO {4}Environment loaded\n {20}Mode: development\n {20}Port: 4000\n/,
  );
  assert.match(
    sink.out(),
    /\[\d{2}:\d{2}:\d{2}\] SUCCESS MongoDB connected\n {20}Database: pradeep_portfolio\n {20}Host: 127\.0\.0\.1\n/,
  );
  assert.match(
    sink.err(),
    /\[\d{2}:\d{2}:\d{2}\] ERROR {3}Database connection failed\n {20}Code: DATABASE_UNAVAILABLE\n {20}Hint: Check your MongoDB service and configuration\.\n/,
  );
  assert.equal(sink.all().includes('\u001b['), false);
});

test('development colour is used only for a terminal and respects NO_COLOR', () => {
  const colourSink = capture({ tty: true });
  createLogger({
    env: { NODE_ENV: 'development' },
    stdout: colourSink.stdout,
    stderr: colourSink.stderr,
    now: () => FIXED_TIME,
  }).info('Colour on');

  assert.ok(colourSink.out().includes('\u001b['), 'expected ANSI on a TTY');

  const noColourSink = capture({ tty: true });
  createLogger({
    env: { NODE_ENV: 'development', NO_COLOR: '1' },
    stdout: noColourSink.stdout,
    stderr: noColourSink.stderr,
    now: () => FIXED_TIME,
  }).info('No colour');

  assert.equal(noColourSink.out().includes('\u001b['), false);
});

test('production output is one JSON line per entry even on a terminal', () => {
  const sink = capture({ tty: true });
  const logger = createLogger({
    env: { NODE_ENV: 'production' },
    stdout: sink.stdout,
    stderr: sink.stderr,
    now: () => FIXED_TIME,
  });

  logger.info('Environment loaded', { env: 'production', port: 4000 });
  logger.success('API listening', { url: 'http://localhost:4000' });
  logger.warn('Production is running without TRUST_PROXY', { hint: 'Set TRUST_PROXY=true.' });
  logger.debug('Cache warmed', { entries: 3 });

  assert.equal(sink.all().includes('\u001b['), false);
  const stdoutLines = sink.out().trim().split('\n').map((line) => JSON.parse(line));
  const stderrLines = sink.err().trim().split('\n').map((line) => JSON.parse(line));

  assert.equal(stdoutLines.length, 3);
  assert.equal(stderrLines.length, 1);
  assert.equal(stdoutLines[0].time, '2026-11-02T10:48:12.000Z');
  assert.equal(stdoutLines[0].level, 'info');
  assert.equal(stdoutLines[0].message, 'Environment loaded');
  assert.equal(stdoutLines[0].port, 4000);
  assert.equal(stdoutLines[1].level, 'info');
  assert.equal(stdoutLines[1].message, 'API listening');
  assert.equal(stderrLines[0].level, 'warn');
  assert.equal(stdoutLines[2].level, 'debug');
});

test('development output never leaks secrets, hashes, cookies, or MongoDB URIs', () => {
  const sink = capture();
  const logger = developmentLogger(sink);

  logger.error('Connection failed', {
    password: 'hunter2',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$secret-hash-value',
    sessionSecret: 'super-secret-session-value',
    cookie: 'pradeep.sid=abcdef',
    authorization: 'Bearer abc.def.ghi',
    email: 'visitor@example.com',
    body: 'Contact message body marker',
    mongoUri: 'mongodb://user:password@127.0.0.1:27017/database',
    error:
      'failed to connect to mongodb://user:password@127.0.0.1:27017/database with password=hunter2',
  });

  const output = sink.err();
  assert.equal(output.includes('hunter2'), false);
  assert.equal(output.includes('secret-hash-value'), false);
  assert.equal(output.includes('super-secret-session-value'), false);
  assert.equal(output.includes('pradeep.sid=abcdef'), false);
  assert.equal(output.includes('Bearer abc.def.ghi'), false);
  assert.equal(output.includes('visitor@example.com'), false);
  assert.equal(output.includes('Contact message body marker'), false);
  assert.equal(output.includes('mongodb://user:password'), false);
  assert.equal(output.includes('[redacted]'), true);
});

test('production JSON redacts sensitive keys and scrubs secrets embedded in strings', () => {
  const sink = capture();
  const logger = createLogger({
    env: { NODE_ENV: 'production' },
    stdout: sink.stdout,
    stderr: sink.stderr,
    now: () => FIXED_TIME,
  });

  logger.info('Request completed', {
    headers: {
      authorization: 'Bearer top-secret-token',
      cookie: 'pradeep.sid=session-value',
    },
    contact: {
      email: 'visitor@example.com',
      message: 'Private contact message.',
    },
    error: 'mongodb://user:pass@host/db password=top-secret',
    stack: '$argon2id$v=19$m=65536,t=3,p=4$hash-value',
  });

  const parsed = JSON.parse(sink.out().trim());
  assert.equal(sink.out().includes('top-secret-token'), false);
  assert.equal(sink.out().includes('session-value'), false);
  assert.equal(sink.out().includes('visitor@example.com'), false);
  assert.equal(sink.out().includes('Private contact message.'), false);
  assert.equal(sink.out().includes('mongodb://user:pass'), false);
  assert.equal(sink.out().includes('hash-value'), false);
  assert.equal(parsed.level, 'info');
  assert.equal(parsed.headers.authorization, '[redacted]');
  assert.match(parsed.error, /\[redacted-mongodb-uri\]/);
  assert.match(parsed.stack, /redacted-password-hash/);
});

test('circular metadata is contained rather than crashing the logger', () => {
  const sink = capture();
  const logger = developmentLogger(sink);
  const circular = { label: 'root' };
  circular.self = circular;

  assert.doesNotThrow(() => logger.info('Circular context', { context: circular }));
  assert.match(sink.out(), /Circular context/);
  assert.match(sink.out(), /\[circular\]/);
});
