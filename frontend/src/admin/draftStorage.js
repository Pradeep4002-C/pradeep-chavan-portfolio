/**
 * Session-scoped draft persistence for administrator forms.
 *
 * A session can expire between typing and pressing Save. The server rejects the
 * write with 401, the UI must leave for the sign-in page, and without a draft
 * the administrator would lose everything they just typed. These helpers keep
 * that draft in `sessionStorage` (per tab, cleared when the tab closes) so the
 * destination page can restore it after a successful re-login.
 *
 * Storage can be unavailable (private browsing, disabled cookies); every helper
 * degrades to a no-op instead of breaking the form.
 */

const DRAFT_PREFIX = 'pradeep-portfolio.admin.draft.';

function draftStore() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function storageKey(key) {
  return `${DRAFT_PREFIX}${key}`;
}

export function saveDraft(key, value) {
  const store = draftStore();
  if (!store) {
    return;
  }

  try {
    store.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // Quota or serialization failures must never block the redirect.
  }
}

/** Reads and removes a draft so it is restored exactly once. */
export function takeDraft(key) {
  const store = draftStore();
  if (!store) {
    return null;
  }

  try {
    const raw = store.getItem(storageKey(key));
    if (!raw) {
      return null;
    }
    store.removeItem(storageKey(key));
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  const store = draftStore();
  if (!store) {
    return;
  }

  try {
    store.removeItem(storageKey(key));
  } catch {
    // Nothing to do: a stale draft is harmless and is replaced on next save.
  }
}
