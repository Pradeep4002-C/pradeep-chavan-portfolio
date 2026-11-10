/**
 * Final middleware for unmatched routes. The frontend router runs before this
 * and answers browser navigations, including unknown public URLs (which get
 * index.html with a 404 status). Everything that reaches this point — API
 * paths, missing assets, non-GET requests, and non-HTML clients — receives
 * JSON instead of a substitute HTML document.
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
