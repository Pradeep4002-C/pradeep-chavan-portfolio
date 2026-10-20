import rateLimit from 'express-rate-limit';

export const CONTACT_RATE_LIMIT = Object.freeze({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

/**
 * Applies only to POST /api/contact. A fresh limiter (and therefore a fresh
 * in-memory store) is created per application instance, which keeps tests
 * isolated and matches the current single-process deployment.
 *
 * Set TRUST_PROXY=true only when the API sits behind exactly one trusted
 * reverse proxy (for example Render); otherwise req.ip would be the proxy's
 * address for every visitor. Do not enable it on a directly exposed server.
 */
export function createContactRateLimiter(options = {}) {
  return rateLimit({
    windowMs: CONTACT_RATE_LIMIT.windowMs,
    limit: CONTACT_RATE_LIMIT.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many messages have been sent. Please try again later.',
        },
      });
    },
    ...options,
  });
}
