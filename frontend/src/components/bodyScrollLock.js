/**
 * Reference-counted body scroll lock shared by drawers and modal dialogs.
 *
 * A drawer can be open when an inactivity or confirmation dialog appears, and
 * either one can close first. Reference counting keeps the page locked until
 * the last owner releases it, then restores the exact inline styles that were
 * present before the first lock.
 */
let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

export function lockBodyScroll() {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const { body, documentElement } = document;

  if (lockCount === 0) {
    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = Math.max(
      0,
      window.innerWidth - documentElement.clientWidth,
    );

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }
    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0) {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    }
  };
}
