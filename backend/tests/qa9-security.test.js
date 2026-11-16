import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { createApp } from '../src/app.js';
import {
  clearSessionCookie,
  sessionCookieBaseOptions,
  sessionCookieOptions,
} from '../src/config/session.js';
import { privateNoIndex } from '../src/middleware/privateNoIndex.js';

/*
 * QA-Audit-9 security contracts.
 *
 * These assertions are intentionally independent of MongoDB: the header policy
 * is applied before any router, so it must hold for healthy API responses as
 * well as safe failure responses. The cookie contract is verified against the
 * production option factory without creating a session or touching Atlas.
 */

const INDEX_MARKER = '<div id="root">qa9-security-fixture</div>';

let distDir;
let base;
let server;

async function request(route, { accept = 'text/html' } = {}) {
  const response = await fetch(`${base}${route}`, {
    headers: { Accept: accept },
    redirect: 'manual',
  });
  const text = await response.text();
  return { response, text };
}

before(async () => {
  distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-qa9-security-'));
  await fs.writeFile(
    path.join(distDir, 'index.html'),
    `<!doctype html><html><body>${INDEX_MARKER}</body></html>`,
  );
  await fs.writeFile(path.join(distDir, 'robots.txt'), 'User-agent: *\nDisallow: /admin\n');

  const app = createApp({ frontendDist: distDir });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await fs.rm(distDir, { recursive: true, force: true });
});

test('every public and private response carries the baseline security headers', async () => {
  const routes = [
    '/',
    '/robots.txt',
    '/admin',
    '/admin/login',
    '/admin/projects',
    '/api/portfolio',
    '/api/health',
    '/api/unknown',
    '/api/auth/me',
  ];

  for (const route of routes) {
    const { response } = await request(route);

    assert.equal(
      response.headers.get('x-content-type-options'),
      'nosniff',
      `${route} must disable MIME sniffing`,
    );
    assert.equal(
      response.headers.get('x-frame-options'),
      'SAMEORIGIN',
      `${route} must deny cross-origin framing`,
    );
    assert.equal(
      response.headers.get('referrer-policy'),
      'no-referrer',
      `${route} must not leak referrers`,
    );
    assert.match(
      response.headers.get('content-security-policy') ?? '',
      /frame-ancestors 'self'/,
      `${route} must declare frame-ancestors`,
    );
  }
});

test('the public portfolio stays indexable while private areas are not', async () => {
  const home = await request('/');
  assert.equal(home.response.status, 200);
  assert.equal(home.response.headers.get('x-robots-tag'), null);
  assert.ok(home.text.includes(INDEX_MARKER));

  const robots = await request('/robots.txt');
  assert.equal(robots.response.status, 200);
  assert.equal(robots.response.headers.get('x-robots-tag'), null);

  for (const route of ['/admin', '/admin/login', '/admin/projects', '/admin/unknown']) {
    const { response } = await request(route);
    assert.equal(response.status, 200, `${route} should serve the SPA entry`);
    assert.equal(
      response.headers.get('x-robots-tag'),
      'noindex, nofollow',
      `${route} must be excluded from indexing and link following`,
    );
  }

  for (const route of ['/api/portfolio', '/api/health', '/api/unknown', '/api/auth/me']) {
    const { response } = await request(route, { accept: 'application/json' });
    assert.equal(
      response.headers.get('x-robots-tag'),
      'noindex, nofollow',
      `${route} must be excluded from indexing and link following`,
    );
  }
});

test('privateNoIndex sets the strict policy on every response it guards', () => {
  const headers = new Map();
  let nextCalled = false;

  privateNoIndex({}, { setHeader: (name, value) => headers.set(name, value) }, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(headers.get('X-Robots-Tag'), 'noindex, nofollow');
});

test('production session cookies are HttpOnly, SameSite, and Secure', () => {
  const baseOptions = sessionCookieBaseOptions(true);
  assert.equal(baseOptions.httpOnly, true);
  assert.equal(baseOptions.sameSite, 'lax');
  assert.match(baseOptions.sameSite, /^(lax|strict)$/);
  assert.equal(baseOptions.secure, true);
  assert.equal(baseOptions.path, '/');

  const options = sessionCookieOptions(true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.secure, true);
  assert.equal(options.path, '/');
  assert.ok(options.maxAge > 0);

  const developmentOptions = sessionCookieOptions(false);
  assert.equal(developmentOptions.httpOnly, true);
  assert.equal(developmentOptions.sameSite, 'lax');
  assert.equal(developmentOptions.secure, false);

  const cleared = [];
  clearSessionCookie(
    { clearCookie: (name, value) => cleared.push({ name, value }) },
    true,
  );
  assert.equal(cleared.length, 1);
  assert.equal(cleared[0].name, 'pradeep.sid');
  assert.equal(cleared[0].value.httpOnly, true);
  assert.equal(cleared[0].value.sameSite, 'lax');
  assert.equal(cleared[0].value.secure, true);
  assert.equal(cleared[0].value.path, '/');
});
