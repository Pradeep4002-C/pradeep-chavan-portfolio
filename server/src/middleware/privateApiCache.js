/**
 * Private API responses must never be stored by browsers or shared caches.
 *
 * Authentication and administrator routes contain session-dependent data
 * (administrator identity, drafts, and contact messages). Applying this before
 * the routers means the policy also covers validation failures, authorization
 * errors, unknown sub-routes, and the no-session fallback.
 */
export function privateApiCache(req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.vary('Cookie');
  next();
}
