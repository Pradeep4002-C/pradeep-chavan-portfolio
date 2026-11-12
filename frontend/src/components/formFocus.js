/**
 * Move focus and the viewport to the first invalid control after React has
 * committed the error text and `aria-describedby` relationships.
 *
 * A zero-delay task is used instead of requestAnimationFrame because animation
 * frames are throttled in background tabs; a keyboard user who submits an
 * invalid form must still land on the offending field deterministically.
 */
export function focusFirstError(errors, order, resolveTarget) {
  const firstKey = order.find((key) => errors?.[key]);
  if (!firstKey) {
    return false;
  }

  const target = resolveTarget(firstKey);
  if (!target) {
    return false;
  }

  globalThis.setTimeout(() => {
    if (typeof target.isConnected === 'boolean' && !target.isConnected) {
      return;
    }

    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }

    // Omit `behavior` so the page's own `scroll-behavior` and the
    // prefers-reduced-motion guard decide whether the movement is animated.
    target.scrollIntoView?.({ block: 'center' });
  }, 0);

  return true;
}
