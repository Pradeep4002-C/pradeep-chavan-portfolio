import express from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { portfolioRouter } from './routes/portfolio.js';
import { contactRouter } from './routes/contact.js';
import { createAuthRouter } from './routes/auth.js';
import { createContactRateLimiter } from './middleware/contactRateLimit.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

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
  } else {
    // No session configuration: authentication is unavailable. This is a safe
    // failure mode for isolated tests and for a misconfigured direct listener.
    app.use('/api/auth', (req, res) => {
      res.status(503).json({
        error: {
          code: 'SESSION_UNAVAILABLE',
          message: 'Authentication is not configured.',
        },
      });
    });
  }

  // No SPA fallback yet: unknown paths get a JSON 404.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
