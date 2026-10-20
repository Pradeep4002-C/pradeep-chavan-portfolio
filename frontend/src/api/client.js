/**
 * Minimal JSON client for the same-origin API.
 *
 * - Relative `/api` paths in development (Vite proxy) and production.
 * - Non-2xx responses become ApiError with a safe message from the server.
 * - Network and unreadable-response failures are normalised into ApiError.
 * - Abort errors are rethrown unchanged so callers can ignore them.
 */
const API_ROOT = '/api';

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function getJson(path, { signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    throw new ApiError('The portfolio service could not be reached.', {
      code: 'NETWORK_ERROR',
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === 'string' && payload.error.message.length > 0
        ? payload.error.message
        : 'The portfolio service returned an error.';
    throw new ApiError(message, {
      status: response.status,
      code: payload?.error?.code ?? 'HTTP_ERROR',
    });
  }

  if (payload === null || typeof payload !== 'object') {
    throw new ApiError('The portfolio service returned an unreadable response.', {
      status: response.status,
      code: 'INVALID_RESPONSE',
    });
  }

  return payload;
}
