import express from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { portfolioRouter } from './routes/portfolio.js';
import { contactRouter } from './routes/contact.js';
import { createContactRateLimiter } from './middleware/contactRateLimit.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express application without starting it or touching the
 * database. Keeping this separate makes the app testable and keeps startup
 * concerns in index.js.
 */
export function createApp({ trustProxy = false, contactRateLimit } = {}) {
  const app = express();

  app.disable('x-powered-by');

  // Only enable this behind a known number of reverse proxies. Trusting
  // arbitrary X-Forwarded-For values would make the contact rate limiter
  // spoofable.
  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());

  // JSON-only API with a deliberately small body limit.
  app.use(express.json({ limit: '32kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/portfolio', portfolioRouter);
  app.use('/api/contact', createContactRateLimiter(contactRateLimit), contactRouter);

  // No SPA fallback yet: unknown paths get a JSON 404.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
