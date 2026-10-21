import rateLimit from 'express-rate-limit';

export const LOGIN_RATE_LIMIT = Object.freeze({
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

/**
 * IP limit for POST /api/auth/login. Defaults are production-safe (five
 * attempts per IP per fifteen minutes); tests may pass a stricter or looser
 * `options` object without changing the documented defaults.
 *
 * The limiter uses the application's trust-proxy setting, so X-Forwarded-For
 * is only honoured when a single trusted proxy has been configured.
 */
export function createLoginRateLimiter(options = {}) {
  return rateLimit({
    windowMs: LOGIN_RATE_LIMIT.windowMs,
    limit: LOGIN_RATE_LIMIT.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Please try again later.',
        },
      });
    },
    ...options,
  });
}
