import { useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '../components/Button.jsx';
import { dangerButtonClass } from './AdminUi.jsx';
import { useDialogFocus } from './dialogFocus.js';

/**
 * Final warning before an idle administrator session is signed out.
 *
 * This is deliberately not dismissible by clicking the backdrop: the only two
 * outcomes are an explicit "Stay signed in" or an immediate sign-out. Escape is
 * treated as "Stay signed in" so keyboard users are never trapped.
 */
export default function InactivityWarningDialog({
  secondsRemaining,
  onStaySignedIn,
  onSignOut,
  busy = false,
}) {
  const dialogRef = useRef(null);
  const seconds = Math.max(0, Math.ceil(Number(secondsRemaining) || 0));

  useDialogFocus(dialogRef, {
    onEscape: onStaySignedIn,
    canDismiss: () => !busy,
  });

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/55 px-4 py-8">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="inactivity-warning-title"
        aria-describedby="inactivity-warning-description"
        aria-busy={busy}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl outline-none"
      >
        <p className="text-kicker font-bold uppercase tracking-[0.14em] text-accent-strong">
          Session timeout
        </p>
        <h2
          id="inactivity-warning-title"
          className="mt-2 text-lg font-semibold tracking-[-0.02em] text-ink"
        >
          Are you still there?
        </h2>
        <p id="inactivity-warning-description" className="mt-2 text-sm leading-relaxed text-muted">
          You have been inactive. For security, this session will sign out in{' '}
          <span
            role="timer"
            aria-live="off"
            className="inline-block min-w-[2.5ch] font-semibold tabular-nums text-ink"
          >
            {seconds}s
          </span>
          .
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={dangerButtonClass}
            onClick={onSignOut}
            disabled={busy}
          >
            {busy ? 'Signing out…' : 'Sign out now'}
          </button>
          <Button
            type="button"
            variant="solid"
            onClick={onStaySignedIn}
            disabled={busy}
            data-autofocus
          >
            Stay signed in
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
