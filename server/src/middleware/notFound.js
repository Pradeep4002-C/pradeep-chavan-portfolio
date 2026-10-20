/**
 * Final middleware for unmatched routes. It returns JSON for every unknown
 * path (there is no frontend SPA fallback in this milestone).
 */
export function notFound(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
}
