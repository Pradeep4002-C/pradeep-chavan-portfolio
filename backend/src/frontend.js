import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

/*
 * Serves the Vite production build from the same origin as the API.
 *
 * The directory is resolved from this module rather than process.cwd(), so the
 * server behaves identically when started from the repository root, from
 * backend/, or by a hosting platform with an arbitrary working directory.
 */
export const FRONTEND_DIST_DIR = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));

// Vite fingerprints every file in assets/, so those URLs can be cached
// forever. Everything else (index.html, favicon, resume, robots.txt) keeps its
// name and must be revalidated so a deploy is visible immediately.
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const REVALIDATE_CACHE = 'public, max-age=0, must-revalidate';

/** True when a Vite build is present in the expected directory. */
export function isFrontendBuilt(distDir = FRONTEND_DIST_DIR) {
  return fs.existsSync(path.join(distDir, 'index.html'));
}

/**
 * Builds a router that serves the built assets and the SPA entry document for
 * every browser navigation:
 *
 *   /            the public portfolio (hash links such as /#work)
 *   /admin/*     the administrator application, including /admin/login
 *   other HTML   index.html with status 404, so the SPA can render its branded
 *                NotFound view while crawlers receive a true 404 response.
 *
 * Requests for /api/*, paths that look like static files (anything under
 * /assets/ or with an extension in the final segment), non-GET/HEAD methods,
 * and clients that do not accept HTML fall through to the JSON 404 handler.
 * That keeps API clients and missing assets from ever receiving index.html.
 * Express 5 no longer accepts a bare '*' path, so a RegExp route is used for
 * the admin prefix and a final middleware supplies the public catch-all.
 */
export function createFrontendRouter({ distDir = FRONTEND_DIST_DIR } = {}) {
  const indexFile = path.join(distDir, 'index.html');
  const router = express.Router();

  router.use(
    express.static(distDir, {
      // index.html is sent explicitly below so its cache policy is never
      // confused with a fingerprinted asset.
      index: false,
      fallthrough: true,
      etag: true,
      lastModified: true,
      setHeaders(res, filePath) {
        const relative = path.relative(distDir, filePath).split(path.sep).join('/');
        res.setHeader(
          'Cache-Control',
          relative.startsWith('assets/') ? IMMUTABLE_CACHE : REVALIDATE_CACHE,
        );
      },
    }),
  );

  function sendIndex(req, res, next, status = 200) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    // A client that explicitly asks for JSON (rather than HTML) must not
    // receive a page. Browsers always accept text/html for navigations.
    if (!req.accepts('html')) {
      next();
      return;
    }

    if (status === 404) {
      // A 404 must never be cached: a later deploy may add the route. Tell
      // crawlers explicitly that this response is not an indexable page.
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex');
    } else {
      // Revalidate on every navigation so a new deploy is picked up while the
      // ETag still allows a cheap 304 response.
      res.setHeader('Cache-Control', REVALIDATE_CACHE);
    }

    res.status(status);
    res.sendFile(indexFile, (error) => {
      if (error) {
        next(error);
      }
    });
  }

  router.get('/', (req, res, next) => sendIndex(req, res, next, 200));
  router.get(/^\/admin(?:\/.*)?$/, (req, res, next) => sendIndex(req, res, next, 200));

  // Public catch-all. It only claims GET/HEAD HTML navigations; everything
  // else falls through so the final JSON notFound middleware can answer it.
  router.use((req, res, next) => {
    const pathname = req.path;

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      next();
      return;
    }

    if (pathname === '/assets' || pathname.startsWith('/assets/')) {
      next();
      return;
    }

    const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
    if (lastSegment.includes('.')) {
      next();
      return;
    }

    // A real 404 status with the SPA entry document: crawlers see a missing
    // page while the React NotFound view handles the visitor experience.
    sendIndex(req, res, next, 404);
  });

  return router;
}
