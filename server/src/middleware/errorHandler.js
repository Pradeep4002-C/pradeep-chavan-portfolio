import { logger } from '../lib/logger.js';

const SAFE_ERROR_CODES = new Set(['INVALID_JSON', 'PAYLOAD_TOO_LARGE', 'REQUEST_ERROR']);

/**
 * Central error handler. Express 5 recognises this by its four parameters.
 *
 * - 4xx errors keep a short, safe message.
 * - 5xx errors never expose the underlying message or stack to a client.
 * - Request bodies are never logged.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  let status = Number(err.status ?? err.statusCode);
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    status = 500;
  }

  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong.';

  if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body must be valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large.';
  } else if (status >= 500) {
    code = 'INTERNAL_ERROR';
    message = 'Something went wrong.';
  } else {
    code = SAFE_ERROR_CODES.has(err.code) ? err.code : 'REQUEST_ERROR';
    message = err.expose ? err.message : 'The request could not be completed.';
  }

  const context = {
    method: req.method,
    path: req.originalUrl,
    status,
    code,
  };

  if (status >= 500) {
    if (err.safe === true) {
      // Routes use SafeError to supply a safe diagnostic category instead of
      // a raw message that could contain submitted personal data.
      logger.error('Unhandled request error', {
        ...context,
        errorCode: err.logCode ?? code,
      });
    } else {
      logger.error('Unhandled request error', {
        ...context,
        error: err.message,
        stack: err.stack,
      });
    }
  } else {
    logger.warn('Request rejected', context);
  }

  // Stack traces are logged above but never returned to a client: this API
  // serves public portfolio data and must not expose internals in any
  // environment.
  res.status(status).json({ error: { code, message } });
}
