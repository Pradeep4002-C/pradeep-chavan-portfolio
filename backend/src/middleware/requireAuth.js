import { getDatabaseStatus } from '../config/db.js';
import { destroySession } from '../config/session.js';
import { Admin } from '../models/Admin.js';
import { toSafeAdmin } from '../lib/admin.js';

export const UNAUTHENTICATED_RESPONSE = Object.freeze({
  error: {
    code: 'UNAUTHENTICATED',
    message: 'Authentication required.',
  },
});

function isSessionExpired(req) {
  const expires = req.session?.cookie?.expires;
  if (!expires) {
    return false;
  }
  const time = new Date(expires).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

/**
 * Reusable administrator-session guard for current and future admin APIs.
 *
 * It is intentionally independent of any frontend route guard: the server
 * verifies the stored session and the administrator record on every request.
 * The middleware attaches only `{ id, email, name }` to `req.admin`.
 */
export function createRequireAuth() {
  return async function requireAuth(req, res, next) {
    try {
      if (!req.session || !req.session.adminId) {
        res.status(401).json(UNAUTHENTICATED_RESPONSE);
        return;
      }

      if (isSessionExpired(req)) {
        await destroySession(req).catch(() => {});
        res.status(401).json(UNAUTHENTICATED_RESPONSE);
        return;
      }

      if (getDatabaseStatus().status !== 'connected') {
        res.status(503).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Authentication is temporarily unavailable.',
          },
        });
        return;
      }

      const admin = await Admin.findById(req.session.adminId).select('email name').lean();

      if (!admin) {
        // The administrator was deleted or the id is stale: invalidate the
        // session so it can never be reused.
        await destroySession(req).catch(() => {});
        res.status(401).json(UNAUTHENTICATED_RESPONSE);
        return;
      }

      req.admin = toSafeAdmin(admin);
      next();
    } catch (error) {
      next(error);
    }
  };
}
