import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let openDialogCount = 0;
let backgroundRoot = null;
let backgroundWasInert = false;

function lockBackground() {
  if (openDialogCount === 0 && typeof document !== 'undefined') {
    backgroundRoot = document.getElementById('root');
    if (backgroundRoot) {
      backgroundWasInert = backgroundRoot.hasAttribute('inert');
      backgroundRoot.setAttribute('inert', '');
    }
  }
  openDialogCount += 1;
}

function unlockBackground() {
  openDialogCount = Math.max(0, openDialogCount - 1);
  if (openDialogCount === 0 && backgroundRoot) {
    if (!backgroundWasInert) {
      backgroundRoot.removeAttribute('inert');
    }
    backgroundRoot = null;
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
 * Shared modal focus lifecycle: remember the opener, move focus into the
 * dialog, trap Tab/Shift+Tab, make the rest of the app inert, and restore focus
 * only when the opener is still connected.
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
    const opener = typeof document !== 'undefined' ? document.activeElement : null;
    const container = containerRef.current;

    lockBackground();
    const focusTimer = window.setTimeout(() => focusFirst(container, initialFocusRef), 0);

    function handleKeyDown(event) {
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
      unlockBackground();

      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus();
      }
    };
  }, [containerRef, initialFocusRef]);
}
