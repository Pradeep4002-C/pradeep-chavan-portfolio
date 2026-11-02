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
 * Builds a router that serves the built assets and adds an SPA fallback for
 * the client-side route families that exist in this application:
 *
 *   /            the public portfolio (hash links such as /#work)
 *   /admin/*     the administrator application, including /admin/login
 *
 * The fallback only answers GET/HEAD requests that prefer HTML, so an API
 * client asking for JSON never receives index.html. Unknown assets and API
 * paths therefore continue to the JSON 404 handler instead of being replaced
 * with HTML. Express 5 no longer accepts a bare '*' path, so a RegExp route is
 * used for the admin prefix.
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

  function sendIndex(req, res, next) {
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

    // Revalidate on every navigation so a new deploy is picked up while the
    // ETag still allows a cheap 304 response.
    res.setHeader('Cache-Control', REVALIDATE_CACHE);
    res.sendFile(indexFile, (error) => {
      if (error) {
        next(error);
      }
    });
  }

  router.get('/', sendIndex);
  router.get(/^\/admin(?:\/.*)?$/, sendIndex);

  return router;
}
