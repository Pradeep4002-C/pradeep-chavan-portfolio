/**
 * Pure state transitions for the administrator message inbox.
 *
 * The API persists `hidden`, where true means the message body is collapsed.
 * Messages created before the field existed also default to collapsed.
 */

/** True when the message body should be collapsed in the inbox. */
export function isMessageHidden(message) {
  return message?.hidden !== false;
}

/** The value to persist when the administrator clicks View or Hide. */
export function nextHiddenValue(message) {
  return !isMessageHidden(message);
}

/**
 * Applies a successful PATCH response to the current page immediately, so the
 * row updates without waiting for the background inbox refresh. The refresh
 * still reconciles pagination and filter membership with the server.
 */
export function applyMessageUpdate(inbox, updated) {
  if (!inbox || !Array.isArray(inbox.messages) || !updated || typeof updated.id !== 'string') {
    return inbox;
  }

  let matched = false;
  const messages = inbox.messages.map((message) => {
    if (message?.id !== updated.id) {
      return message;
    }
    matched = true;
    return { ...message, ...updated };
  });

  return matched ? { ...inbox, messages } : inbox;
}
