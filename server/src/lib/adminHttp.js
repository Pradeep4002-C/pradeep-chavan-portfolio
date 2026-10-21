import mongoose from 'mongoose';
import { SafeError } from './safeError.js';

/**
 * Shared HTTP helpers for the administrator API. They keep every admin route
 * on the same response envelope (`{ data }` on success, `{ error }` on failure)
 * and the same safe error handling, so no route has to re-implement them.
 */

/** 400 envelope carrying a small field -> message map. */
export function validationResponse(fields) {
  return {
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Please check the highlighted fields and try again.',
      fields,
    },
  };
}

/** 400 envelope for a malformed route identifier. */
export function invalidIdResponse(message = 'Invalid identifier.') {
  return validationResponse({ id: message });
}

/** 404 envelope for a missing resource. */
export function notFoundResponse(code, message) {
  return { error: { code, message } };
}

/** A log-safe 500 error. The client sees a generic message only. */
export function internalError(error, logCode) {
  return new SafeError('Something went wrong.', {
    status: 500,
    code: 'INTERNAL_ERROR',
    logCode,
    cause: error,
  });
}

/** True for a value that can be used as a MongoDB ObjectId. */
export function isValidId(value) {
  return mongoose.isValidObjectId(value);
}

/**
 * Maps a Mongoose write failure onto a safe response.
 *
 * - A duplicate key (11000) becomes a 409 on `conflictField` (for example a
 *   skill-group label).
 * - A Mongoose ValidationError becomes a 400 with generic per-field messages;
 *   the raw validator text is never echoed because it can contain input.
 * - Anything else becomes a logged SafeError so no driver message can leak.
 */
export function writeError(
  error,
  res,
  next,
  { logCode, conflictField = 'field', conflictCode = 'CONFLICT', conflictMessage } = {},
) {
  if (error?.code === 11000) {
    const message = conflictMessage ?? `That ${conflictField} is already in use.`;
    res.status(409).json({
      error: {
        code: conflictCode,
        message,
        fields: { [conflictField]: message },
      },
    });
    return;
  }

  if (error?.name === 'ValidationError') {
    const fields = {};
    for (const key of Object.keys(error.errors ?? {})) {
      fields[key] ??= 'Invalid value.';
    }
    res.status(400).json(validationResponse(fields));
    return;
  }

  next(internalError(error, logCode));
}
