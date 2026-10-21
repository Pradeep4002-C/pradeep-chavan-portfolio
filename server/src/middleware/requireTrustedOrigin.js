/**
 * Normalises an Origin/Host value to scheme + host + port. Returns null for a
 * malformed or non-http(s) value so it can never accidentally match.
 */
export function normalizeOrigin(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Protects state-changing authentication routes against cross-origin browser
 * abuse.
 *
 * Policy:
 * - A request with no Origin header is allowed. This keeps non-browser clients
 *   and same-origin form navigation working; the JSON-only body contract and
 *   SameSite=Lax cookie still apply.
 * - A request whose Origin matches the request's own scheme+host is allowed
 *   (same-origin in production, or direct same-origin development).
 * - A request whose Origin matches the configured `clientOrigin` is allowed
 *   (the Vite dev server origin when the API is proxied).
 * - Every other Origin is rejected with 403.
 *
 * Wildcard CORS is deliberately not used.
 */
export function createRequireTrustedOrigin({ clientOrigin } = {}) {
  const trusted = new Set();

  if (clientOrigin) {
    const normalized = normalizeOrigin(clientOrigin);
    if (!normalized) {
      throw new Error('CLIENT_ORIGIN must be an absolute http(s) origin.');
    }
    trusted.add(normalized);
  }

  return function requireTrustedOrigin(req, res, next) {
    const origin = req.get('origin');

    // Non-browser clients and same-origin navigations may omit Origin.
    if (origin === undefined) {
      next();
      return;
    }

    const normalized = normalizeOrigin(origin);
    if (normalized === null) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_ORIGIN',
          message: 'Request origin is not allowed.',
        },
      });
      return;
    }

    const host = req.get('host');
    const sameOrigin = host ? normalizeOrigin(`${req.protocol}://${host}`) : null;

    if (sameOrigin !== null && normalized === sameOrigin) {
      next();
      return;
    }

    if (trusted.has(normalized)) {
      next();
      return;
    }

    res.status(403).json({
      error: {
        code: 'FORBIDDEN_ORIGIN',
        message: 'Request origin is not allowed.',
      },
    });
  };
}
