/**
 * Private application areas must never be indexed, and their links must never
 * be followed. This covers the administrator SPA routes and every API route,
 * including validation failures and unknown sub-routes answered before a
 * router is reached.
 *
 * `noindex` alone still lets a crawler follow links found in a response, so the
 * private policy is deliberately stricter than the generic 404 policy.
 */
export function privateNoIndex(req, res, next) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
}
