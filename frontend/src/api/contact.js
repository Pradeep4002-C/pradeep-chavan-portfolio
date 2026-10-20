import { ApiError, postJson } from './client.js';

/**
 * Sends a contact message to the same-origin API. A successful response must
 * contain a human-readable confirmation; anything else is treated as an error
 * so the form can never show a false success.
 */
export async function sendContactMessage(payload, { signal } = {}) {
  const response = await postJson('/contact', payload, { signal });
  const message =
    typeof response?.data?.message === 'string' ? response.data.message.trim() : '';

  if (!message) {
    throw new ApiError('The contact service returned an unreadable response.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return message;
}
