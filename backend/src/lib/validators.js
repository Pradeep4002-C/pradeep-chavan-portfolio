/**
 * Shared field validators. Kept intentionally small: these are the only two
 * rules repeated across models.
 */

// Practical email shape check (the authoritative check is delivery, not regex).
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accepts absolute http:// and https:// URLs only. */
export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** For optional URL fields: empty, null, and undefined are allowed. */
export function isOptionalHttpUrl(value) {
  return value == null || value === '' || isHttpUrl(value);
}
