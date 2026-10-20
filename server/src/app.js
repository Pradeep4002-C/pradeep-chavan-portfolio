import express from 'express';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * Builds the Express application without starting it or touching the
 * database. Keeping this separate makes the app testable and keeps startup
 * concerns in index.js.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());

  // JSON-only API with a deliberately small body limit.
  app.use(express.json({ limit: '32kb' }));

  app.use('/api/health', healthRouter);

  // No SPA fallback yet: unknown paths get a JSON 404.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
