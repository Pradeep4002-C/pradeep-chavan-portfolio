import express from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { portfolioRouter } from './routes/portfolio.js';
import { contactRouter } from './routes/contact.js';
import { createAuthRouter } from './routes/auth.js';
import { createAdminRouter } from './routes/admin.js';
import { createContactRateLimiter } from './middleware/contactRateLimit.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  FRONTEND_DIST_DIR,
  createFrontendRouter,
  isFrontendBuilt,
} from './frontend.js';

/**
 * Builds the Express application without starting it or touching the
 * database. Keeping this separate makes the app testable and keeps startup
 * concerns in index.js.
 *
 * `session` is expected to be an object built by config/session.js:
 *   { middleware, isProduction, clientOrigin }
 * When it is absent the auth endpoints answer 503 rather than silently
 * falling back to an in-memory session store.
 */
export function createApp({
  trustProxy = false,
  contactRateLimit,
  session,
  loginRateLimit,
  frontendDist = FRONTEND_DIST_DIR,
} = {}) {
  const app = express();

  app.disable('x-powered-by');

  // Only enable this behind a known number of reverse proxies. Trusting
  // arbitrary X-Forwarded-For values would make the rate limiters spoofable.
  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());

  // JSON-only API with a deliberately small body limit.
  app.use(express.json({ limit: '32kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/portfolio', portfolioRouter);
  app.use('/api/contact', createContactRateLimiter(contactRateLimit), contactRouter);

  if (session?.middleware) {
    app.use(session.middleware);
    app.use(
      '/api/auth',
      createAuthRouter({
        isProduction: Boolean(session.isProduction),
        clientOrigin: session.clientOrigin,
        loginRateLimit,
      }),
    );
    // Administrator API: requireAuth guards every route; the trusted-origin
    // policy is shared with the auth routes for state-changing requests.
    app.use('/api/admin', createAdminRouter({ clientOrigin: session.clientOrigin }));
  } else {
    // No session configuration: authentication is unavailable. This is a safe
    // failure mode for isolated tests and for a misconfigured direct listener.
    app.use(['/api/auth', '/api/admin'], (req, res) => {
      res.status(503).json({
        error: {
          code: 'SESSION_UNAVAILABLE',
          message: 'Authentication is not configured.',
        },
      });
    });
  }

  // Unknown API paths terminate here as JSON. Handling them before the static
  // middleware guarantees that a file placed under dist/api/ can never turn an
  // unknown API route into an HTML document or an asset download.
  app.use('/api', notFound);

  // The built frontend is optional: development normally uses Vite, and an
  // API-only process must still start when dist/ has not been built. Static
  // files and the SPA fallback are mounted after the API, so /api/* can never
  // be answered with index.html. In production, index.js refuses to start
  // without a build rather than silently serving an API-only site.
  if (isFrontendBuilt(frontendDist)) {
    app.use(createFrontendRouter({ distDir: frontendDist }));
  }

  // Unknown paths reach this point: API clients and missing assets get JSON,
  // never a substitute HTML document. The frontend router above has already
  // handled / and /admin/* for browser navigations.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
