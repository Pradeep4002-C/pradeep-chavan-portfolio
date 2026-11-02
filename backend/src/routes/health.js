import { Router } from 'express';
import { getDatabaseStatus } from '../config/db.js';

export const healthRouter = Router();

/**
 * GET /api/health
 *
 * 200 { status: "ok",       uptime, timestamp, database: { status: "connected", readyState: 1 } }
 * 503 { status: "degraded", uptime, timestamp, database: { status: "...",       readyState: n } }
 *
 * Exposes no environment values, connection strings, or stack traces.
 */
healthRouter.get('/', (req, res) => {
  const database = getDatabaseStatus();
  const healthy = database.status === 'connected';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptime: Number(process.uptime().toFixed(3)),
    timestamp: new Date().toISOString(),
    database,
  });
});
