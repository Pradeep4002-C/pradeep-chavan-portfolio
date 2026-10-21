/**
 * Minimal JSON client for the same-origin API.
 *
 * - Relative `/api` paths in development (Vite proxy) and production.
 * - Non-2xx responses become ApiError with a safe message from the server.
 * - Network and unreadable-response failures are normalised into ApiError.
 * - Abort errors are rethrown unchanged so callers can ignore them.
 * - Only string field messages are retained; arbitrary response objects are
 *   never exposed to the page.
 */
const API_ROOT = '/api';

export class ApiError extends Error {
  constructor(message, { status, code, fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function safeFieldMessages(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .filter(
      ([key, message]) =>
        typeof key === 'string' &&
        key.length > 0 &&
        typeof message === 'string' &&
        message.length > 0 &&
        message.length <= 500,
    )
    .slice(0, 20);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

async function requestJson(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const init = { method, headers, signal };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${API_ROOT}${path}`, init);
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

  if (response.status === 204) {
    // No Content: a successful delete with no body to read.
    return null;
  }

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === 'string' && payload.error.message.length > 0
        ? payload.error.message
        : 'The portfolio service returned an error.';
    throw new ApiError(message, {
      status: response.status,
      code: payload?.error?.code ?? 'HTTP_ERROR',
      fields: safeFieldMessages(payload?.error?.fields),
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

export function getJson(path, { signal } = {}) {
  return requestJson(path, { method: 'GET', signal });
}

export function postJson(path, body, { signal } = {}) {
  return requestJson(path, { method: 'POST', body, signal });
}

export function patchJson(path, body, { signal } = {}) {
  return requestJson(path, { method: 'PATCH', body, signal });
}

/** DELETE returns `null` on 204 No Content and the parsed body otherwise. */
export function deleteJson(path, { signal } = {}) {
  return requestJson(path, { method: 'DELETE', signal });
}
