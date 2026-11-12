import { useEffect, useRef } from 'react';
import { lockBodyScroll } from '../components/bodyScrollLock.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/*
 * Every dialog registers here. Only the top entry may handle Escape or Tab, so
 * an inactivity warning opened above a confirmation dialog cannot fight the
 * dialog underneath for focus. Lower portal wrappers are made inert while a
 * higher dialog exists, which also disables their backdrops.
 */
const dialogStack = [];
let nextDialogId = 1;
let backgroundRoot = null;
let backgroundWasInert = false;
/* Triggers belonging to lower dialogs that unmounted while a higher layer was
   still open. A discard confirmation and its form can close in one commit; the
   final cleanup then restores the page control that opened the stack. */
let pendingOpeners = [];

function topDialog() {
  return dialogStack[dialogStack.length - 1] ?? null;
}

function isTopDialog(id) {
  return topDialog()?.id === id;
}

function syncInertState() {
  const top = topDialog();

  for (const entry of dialogStack) {
    if (!entry.wrapper) {
      continue;
    }

    if (entry === top) {
      entry.wrapper.removeAttribute('inert');
    } else {
      entry.wrapper.setAttribute('inert', '');
    }
  }
}

function registerDialog(entry) {
  if (dialogStack.length === 0) {
    pendingOpeners = [];
  }

  if (dialogStack.length === 0 && typeof document !== 'undefined') {
    backgroundRoot = document.getElementById('root');
    if (backgroundRoot) {
      backgroundWasInert = backgroundRoot.hasAttribute('inert');
      backgroundRoot.setAttribute('inert', '');
    }
  }

  dialogStack.push(entry);
  syncInertState();
}

function unregisterDialog(id) {
  const index = dialogStack.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return;
  }

  const [removed] = dialogStack.splice(index, 1);
  removed.wrapper?.removeAttribute('inert');
  syncInertState();

  if (dialogStack.length === 0 && backgroundRoot) {
    if (!backgroundWasInert) {
      backgroundRoot.removeAttribute('inert');
    }
    backgroundRoot = null;
    backgroundWasInert = false;
  }
}

function isUsable(element) {
  return (
    element instanceof HTMLElement &&
    !element.hasAttribute('disabled') &&
    element.getAttribute('aria-hidden') !== 'true' &&
    element.getClientRects().length > 0
  );
}

function focusableElements(container) {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isUsable);
}

function focusFirst(container, initialFocusRef) {
  const preferred = initialFocusRef?.current;
  if (isUsable(preferred)) {
    preferred.focus();
    return;
  }

  const marked = container?.querySelector('[data-autofocus]');
  if (isUsable(marked)) {
    marked.focus();
    return;
  }

  const first = focusableElements(container)[0];
  if (first) {
    first.focus();
  } else if (container) {
    container.focus();
  }
}

/**
 * Shared modal focus lifecycle: remember the opener, move focus into the top
 * dialog, trap Tab/Shift+Tab there, make every lower layer inert, lock page
 * scrolling, and restore focus only when the opener is still reachable.
 */
export function useDialogFocus(
  containerRef,
  { onEscape, initialFocusRef, canDismiss = () => true } = {},
) {
  const onEscapeRef = useRef(onEscape);
  const canDismissRef = useRef(canDismiss);
  onEscapeRef.current = onEscape;
  canDismissRef.current = canDismiss;

  useEffect(() => {
    const id = nextDialogId++;
    const opener = typeof document !== 'undefined' ? document.activeElement : null;
    const container = containerRef.current;
    const entry = {
      id,
      container,
      wrapper: container?.parentElement ?? null,
    };

    registerDialog(entry);
    const releaseScrollLock = lockBodyScroll();
    const focusTimer = window.setTimeout(() => {
      if (isTopDialog(id)) {
        focusFirst(container, initialFocusRef);
      }
    }, 0);

    function handleKeyDown(event) {
      // A lower dialog must stay completely passive while another one is above
      // it. Without this guard both capture listeners would consume Escape and
      // Tab, closing or focusing the wrong layer.
      if (!isTopDialog(id)) {
        return;
      }

      if (event.key === 'Escape') {
        if (!canDismissRef.current()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements(container);
      if (elements.length === 0) {
        event.preventDefault();
        container?.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (!container?.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);

      const wasTop = isTopDialog(id);
      unregisterDialog(id);
      releaseScrollLock();

      if (!wasTop) {
        // A lower dialog can unmount in the same React commit as the dialog
        // above it. Keep its trigger so the final cleanup can return focus to
        // the control that opened the whole stack.
        if (opener?.isConnected && typeof opener.focus === 'function') {
          pendingOpeners.push(opener);
        }
        return;
      }

      const nextTop = topDialog();
      if (nextTop) {
        if (
          opener?.isConnected &&
          typeof opener.focus === 'function' &&
          nextTop.wrapper?.contains(opener)
        ) {
          opener.focus();
        } else if (!nextTop.container?.contains(document.activeElement)) {
          nextTop.container?.focus();
        }
        return;
      }

      // The entire stack is gone. Prefer this dialog's opener, then the most
      // recently unmounted lower layer's opener. A trigger can already be
      // detached when both dialogs closed together, so skip disconnected ones.
      const candidates = [opener, ...pendingOpeners.slice().reverse()];
      pendingOpeners = [];

      for (const candidate of candidates) {
        if (candidate?.isConnected && typeof candidate.focus === 'function') {
          candidate.focus();
          break;
        }
      }
    };
  }, [containerRef, initialFocusRef]);
}
