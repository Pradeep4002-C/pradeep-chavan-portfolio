import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { createApp } from '../src/app.js';
import { isFrontendBuilt } from '../src/frontend.js';

/*
 * Production-serving tests use a temporary frontend/dist fixture rather than
 * frontend/dist itself, so they do not require a Vite build and cannot be
 * affected by generated asset hashes. The real build is exercised separately
 * against the production server (see README, M9 checks).
 */
const INDEX_MARKER = '<div id="root">portfolio-fixture</div>';
const JS_BODY = 'console.log("fixture");';
const CSS_BODY = 'body { color: #111; }';
const PDF_BODY = '%PDF-1.4 fixture';

const REVALIDATE = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';

let distDir;
let base;
let fixtureServer;

async function writeFixture(root) {
  const files = {
    'index.html': `<!doctype html><html><body>${INDEX_MARKER}</body></html>`,
    'assets/app-abc123.js': JS_BODY,
    'assets/app-abc123.css': CSS_BODY,
    'favicon.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    'resume.pdf': PDF_BODY,
    'robots.txt': 'User-agent: *\nAllow: /\n',
    // Deliberately present to prove that /api/* can never be served from the
    // static directory, even if a file with that path exists.
    'api/leak.txt': 'must-not-be-served',
  };

  for (const [name, body] of Object.entries(files)) {
    const filePath = path.join(root, name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }
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

async function request(urlBase, route, { method = 'GET', accept } = {}) {
  const response = await fetch(`${urlBase}${route}`, {
    method,
    headers: accept ? { Accept: accept } : undefined,
    redirect: 'manual',
  });
  const text = await response.text();

  return { response, text, contentType: response.headers.get('content-type') ?? '' };
}

before(async () => {
  distDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-dist-'));
  await writeFixture(distDir);

  fixtureServer = await startServer({ frontendDist: distDir });
  base = fixtureServer.base;
});

after(async () => {
  await fixtureServer?.close();
  if (distDir) {
    await fs.rm(distDir, { recursive: true, force: true });
  }
});

test('serves the built index.html at / with a revalidating cache policy', async () => {
  const { response, text, contentType } = await request(base, '/', { accept: 'text/html' });

  assert.equal(response.status, 200);
  assert.match(contentType, /^text\/html/);
  assert.equal(response.headers.get('cache-control'), REVALIDATE);
  assert.ok(response.headers.get('etag'), 'expected an ETag for cheap revalidation');
  assert.ok(text.includes(INDEX_MARKER));
});

test('serves index.html for direct navigations to every admin route', async () => {
  const routes = [
    '/admin',
    '/admin/',
    '/admin/login',
    '/admin/projects',
    '/admin/messages',
    '/admin/skills',
    '/admin/education',
    '/admin/certifications',
    '/admin/achievements',
    '/admin/profile',
    '/admin/projects?page=2',
    '/admin/nested/unknown/route',
  ];

  for (const route of routes) {
    const { response, text, contentType } = await request(base, route, { accept: 'text/html' });
    assert.equal(response.status, 200, `${route} should return 200`);
    assert.match(contentType, /^text\/html/, `${route} should be HTML`);
    assert.equal(response.headers.get('cache-control'), REVALIDATE);
    assert.ok(text.includes(INDEX_MARKER), `${route} should return the SPA entry`);
  }
});

test('serves index.html directly and honours HEAD', async () => {
  const direct = await request(base, '/index.html', { accept: 'text/html' });
  assert.equal(direct.response.status, 200);
  assert.equal(direct.response.headers.get('cache-control'), REVALIDATE);
  assert.ok(direct.text.includes(INDEX_MARKER));

  const head = await request(base, '/', { method: 'HEAD', accept: 'text/html' });
  assert.equal(head.response.status, 200);
  assert.match(head.contentType, /^text\/html/);
  assert.equal(head.text, '');
});

test('serves fingerprinted assets with immutable caching and correct content types', async () => {
  const js = await request(base, '/assets/app-abc123.js');
  assert.equal(js.response.status, 200);
  assert.match(js.contentType, /^text\/javascript/);
  assert.equal(js.response.headers.get('cache-control'), IMMUTABLE);
  assert.equal(js.text, JS_BODY);

  const css = await request(base, '/assets/app-abc123.css');
  assert.equal(css.response.status, 200);
  assert.match(css.contentType, /^text\/css/);
  assert.equal(css.response.headers.get('cache-control'), IMMUTABLE);
  assert.equal(css.text, CSS_BODY);
});

test('serves favicon, resume, and robots.txt with revalidating caching', async () => {
  const favicon = await request(base, '/favicon.svg');
  assert.equal(favicon.response.status, 200);
  assert.match(favicon.contentType, /^image\/svg\+xml/);
  assert.equal(favicon.response.headers.get('cache-control'), REVALIDATE);

  const resume = await request(base, '/resume.pdf');
  assert.equal(resume.response.status, 200);
  assert.match(resume.contentType, /^application\/pdf/);
  assert.equal(resume.response.headers.get('cache-control'), REVALIDATE);
  assert.equal(resume.text, PDF_BODY);

  const robots = await request(base, '/robots.txt');
  assert.equal(robots.response.status, 200);
  assert.match(robots.contentType, /^text\/plain/);
  assert.equal(robots.response.headers.get('cache-control'), REVALIDATE);
  assert.ok(robots.text.includes('Allow: /'));
});

test('missing assets and unknown API paths return JSON 404, never index.html', async () => {
  const missingAsset = await request(base, '/assets/missing-123.js');
  assert.equal(missingAsset.response.status, 404);
  assert.match(missingAsset.contentType, /^application\/json/);
  assert.equal(missingAsset.response.headers.get('cache-control'), 'no-store');
  assert.equal(missingAsset.text.includes(INDEX_MARKER), false);
  assert.equal(missingAsset.text.includes('<html'), false);
  assert.equal(JSON.parse(missingAsset.text).error.code, 'NOT_FOUND');

  const missingFile = await request(base, '/missing-resume.pdf');
  assert.equal(missingFile.response.status, 404);
  assert.match(missingFile.contentType, /^application\/json/);
  assert.equal(missingFile.text.includes('<html'), false);

  const unknownApi = await request(base, '/api/unknown', { accept: 'application/json' });
  assert.equal(unknownApi.response.status, 404);
  assert.match(unknownApi.contentType, /^application\/json/);
  assert.equal(JSON.parse(unknownApi.text).error.code, 'NOT_FOUND');

  // Even a real file under dist/api/ must not be exposed as an API response.
  const apiStaticFile = await request(base, '/api/leak.txt', { accept: 'application/json' });
  assert.equal(apiStaticFile.response.status, 404);
  assert.match(apiStaticFile.contentType, /^application\/json/);
  assert.equal(apiStaticFile.text.includes('must-not-be-served'), false);
});

test('public portfolio content requires revalidation instead of staying stale', async () => {
  const { response, contentType } = await request(base, '/api/portfolio');

  assert.equal(response.status, 503);
  assert.match(contentType, /^application\/json/);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
});

test('does not return HTML to clients that explicitly request JSON', async () => {
  for (const route of ['/', '/admin', '/admin/login']) {
    const { response, text, contentType } = await request(base, route, {
      accept: 'application/json',
    });
    assert.equal(response.status, 404, `${route} should not be a JSON route`);
    assert.match(contentType, /^application\/json/);
    assert.equal(text.includes(INDEX_MARKER), false);
  }
});

test('SPA fallback matches the admin route prefix only', async () => {
  for (const route of ['/administrator', '/adminfoo', '/adminfoo/bar']) {
    const { response, contentType } = await request(base, route, { accept: 'text/html' });
    assert.equal(response.status, 404, `${route} must not match the admin SPA prefix`);
    assert.match(contentType, /^application\/json/);
  }

  const onlyGet = await request(base, '/admin', { method: 'POST', accept: 'text/html' });
  assert.equal(onlyGet.response.status, 404);
  assert.match(onlyGet.contentType, /^application\/json/);
});

test('an unbuilt frontend leaves the API and JSON 404 behaviour intact', async (t) => {
  const missingDir = path.join(distDir, 'not-built');
  assert.equal(isFrontendBuilt(missingDir), false);

  const server = await startServer({ frontendDist: missingDir });
  t.after(server.close);

  const page = await request(server.base, '/', { accept: 'text/html' });
  assert.equal(page.response.status, 404);
  assert.match(page.contentType, /^application\/json/);

  const admin = await request(server.base, '/admin/login', { accept: 'text/html' });
  assert.equal(admin.response.status, 404);
  assert.match(admin.contentType, /^application\/json/);

  // No database is connected, so health reports a safe degraded status but
  // still answers JSON rather than falling through to the frontend.
  const health = await request(server.base, '/api/health', { accept: 'application/json' });
  assert.equal(health.response.status, 503);
  assert.match(health.contentType, /^application\/json/);
  assert.equal(JSON.parse(health.text).status, 'degraded');
});
