/**
 * Final middleware for unmatched routes. API paths, missing assets, and
 * non-HTML requests always receive JSON; the frontend SPA fallback runs before
 * this and only answers browser navigations for `/` and `/admin/*`.
 */
export function notFound(req, res) {
  // A missing asset or unknown API path must not be cached by a browser or
  // intermediary; a later deploy may legitimately add the resource.
  res.setHeader('Cache-Control', 'no-store');
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
}
