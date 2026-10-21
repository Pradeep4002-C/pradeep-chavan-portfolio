import { Router } from 'express';
import { getDatabaseStatus } from '../config/db.js';
import {
  clearSessionCookie,
  destroySession,
  regenerateSession,
  saveSession,
} from '../config/session.js';
import { LOCKOUT_MS, MAX_FAILED_ATTEMPTS } from '../config/auth.js';
import { Admin } from '../models/Admin.js';
import { toSafeAdmin } from '../lib/admin.js';
import { verifyAgainstDummyHash, verifyPassword } from '../lib/password.js';
import { SafeError } from '../lib/safeError.js';
import { createLoginRateLimiter } from '../middleware/authRateLimit.js';
import { createRequireAuth } from '../middleware/requireAuth.js';
import { createRequireTrustedOrigin } from '../middleware/requireTrustedOrigin.js';
import { formatAuthIssues, loginSchema } from '../validation/auth.js';

const INVALID_CREDENTIALS_RESPONSE = Object.freeze({
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password.',
  },
});

const DATABASE_UNAVAILABLE_RESPONSE = Object.freeze({
  error: {
    code: 'DATABASE_UNAVAILABLE',
    message: 'Sign-in is temporarily unavailable. Please try again later.',
  },
});

/**
 * Atomically records a credential failure and applies the lockout once the
 * threshold is reached. The aggregation pipeline resets an expired lockout
 * first, so a stale counter can never permanently lock an account.
 *
 * Running this as one server-side update keeps concurrent failures from
 * losing increments or bypassing the threshold.
 */
async function recordFailedAttempt(adminId, now) {
  const lockUntil = new Date(now.getTime() + LOCKOUT_MS);
  const lockExpired = {
    $and: [
      { $ne: [{ $ifNull: ['$lockedUntil', null] }, null] },
      { $lte: ['$lockedUntil', now] },
    ],
  };

  await Admin.findByIdAndUpdate(
    adminId,
    [
      {
        $set: {
          failedAttempts: { $cond: [lockExpired, 0, { $ifNull: ['$failedAttempts', 0] }] },
          lockedUntil: { $cond: [lockExpired, null, { $ifNull: ['$lockedUntil', null] }] },
        },
      },
      {
        $set: {
          failedAttempts: { $add: ['$failedAttempts', 1] },
        },
      },
      {
        $set: {
          lockedUntil: {
            $cond: [{ $gte: ['$failedAttempts', MAX_FAILED_ATTEMPTS] }, lockUntil, '$lockedUntil'],
          },
        },
      },
    ],
    { returnDocument: 'after', updatePipeline: true },
  );
}

async function resetLoginCounters(adminId, now) {
  await Admin.findByIdAndUpdate(adminId, {
    $set: { failedAttempts: 0, lockedUntil: null, lastLoginAt: now },
  });
}

/**
 * Authentication router.
 *
 * POST /api/auth/login   200 safe admin | 400 validation | 401 invalid | 429 rate limit
 * GET  /api/auth/me      200 safe admin | 401 unauthenticated
 * POST /api/auth/logout  204 always (or 500 if the server session cannot be destroyed)
 */
export function createAuthRouter({ isProduction = false, clientOrigin, loginRateLimit } = {}) {
  const router = Router();
  const requireAuth = createRequireAuth();
  const requireTrustedOrigin = createRequireTrustedOrigin({ clientOrigin });
  const loginLimiter = createLoginRateLimiter(loginRateLimit);

  router.post('/login', requireTrustedOrigin, loginLimiter, async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Please check the highlighted fields and try again.',
          fields: formatAuthIssues(parsed.error),
        },
      });
      return;
    }

    if (getDatabaseStatus().status !== 'connected') {
      res.status(503).json(DATABASE_UNAVAILABLE_RESPONSE);
      return;
    }

    const { email, password } = parsed.data;

    try {
      // passwordHash is select:false, so request it explicitly for verification.
      const admin = await Admin.findOne({ email }).select('+passwordHash');

      if (!admin) {
        // One dummy verification keeps unknown-account timing comparable.
        await verifyAgainstDummyHash(password);
        res.status(401).json(INVALID_CREDENTIALS_RESPONSE);
        return;
      }

      if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
        // The account is locked, but still perform the real verification so a
        // locked and a wrong-password response are not trivially distinguishable.
        await verifyPassword(admin.passwordHash, password);
        res.status(401).json(INVALID_CREDENTIALS_RESPONSE);
        return;
      }

      const passwordMatches = await verifyPassword(admin.passwordHash, password);

      if (!passwordMatches) {
        await recordFailedAttempt(admin._id, new Date());
        res.status(401).json(INVALID_CREDENTIALS_RESPONSE);
        return;
      }

      // Credentials are valid: rotate the session id before storing the admin
      // id, then persist the new session before reporting success.
      const now = new Date();
      await regenerateSession(req);
      req.session.adminId = String(admin._id);
      await resetLoginCounters(admin._id, now);
      await saveSession(req);

      res.status(200).json({
        data: {
          admin: toSafeAdmin({ _id: admin._id, email: admin.email, name: admin.name }),
        },
      });
    } catch (error) {
      next(
        new SafeError('Something went wrong.', {
          status: 500,
          code: 'INTERNAL_ERROR',
          logCode: 'AUTH_LOGIN_FAILED',
          cause: error,
        }),
      );
    }
  });

  router.get('/me', requireAuth, (req, res) => {
    res.status(200).json({ data: { admin: req.admin } });
  });

  router.post('/logout', requireTrustedOrigin, async (req, res, next) => {
    try {
      // Handle a missing/expired session safely. destroySession resolves when
      // there is no session, so this path cannot claim a false invalidation.
      await destroySession(req);
      clearSessionCookie(res, isProduction);
      res.status(204).end();
    } catch (error) {
      next(
        new SafeError('Something went wrong.', {
          status: 500,
          code: 'INTERNAL_ERROR',
          logCode: 'AUTH_LOGOUT_FAILED',
          cause: error,
        }),
      );
    }
  });

  return router;
}
