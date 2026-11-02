/**
 * An error that is safe to pass to the central error handler.
 *
 * `SafeError` deliberately separates the client-facing message from the
 * operational log category. The error handler logs only `logCode` (and the
 * request context), never `message`, `stack`, or `cause`. This lets routes
 * report a useful diagnostic category without risking that a raw database or
 * driver message containing submitted data reaches the logs.
 */
export class SafeError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', logCode, cause } = {}) {
    super(message);
    this.name = 'SafeError';
    this.status = status;
    this.code = code;
    this.logCode = logCode ?? code;
    this.safe = true;
    this.expose = status < 500;

    if (cause !== undefined) {
      // Retained in memory only for debugging; never logged by the handler.
      this.cause = cause;
    }
  }
}
