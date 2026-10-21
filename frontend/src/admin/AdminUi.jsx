import Button from '../components/Button.jsx';

/* Small, shared administrator UI pieces. They reuse the portfolio's design
   tokens (paper/surface/ink/muted/line/accent) so the admin area stays visually
   part of the same site without copying a generic dashboard theme. */

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink transition-ui placeholder:text-subtle focus:border-accent';

export const labelClass = 'mb-1.5 block text-[0.8rem] font-semibold text-ink';

export const fieldErrorClass = 'mt-1 text-xs font-medium text-[#b3261e]';

export const hintClass = 'mt-1 text-xs text-muted';

export const DANGER_TEXT = 'text-[#b3261e]';
export const SUCCESS_TEXT = 'text-[#1f6f43]';

export function Spinner({ className = 'size-5' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-line border-t-accent ${className}`}
    />
  );
}

/** The portfolio monogram with the site wordmark, for the admin area. */
export function AdminBrand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center gap-px rounded-[11px] bg-accent text-[0.8rem] font-bold leading-none tracking-[-0.02em] text-white before:content-['P'] after:content-['C']"
      />
      <span className="text-sm font-semibold tracking-[-0.035em] text-ink">Pradeep Chavan</span>
    </span>
  );
}

/** Small "Admin" pill so the private area is visually distinct. */
export function AdminPill() {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-accent">
      Admin
    </span>
  );
}

/** Full-area loading indicator used while a session or dataset is fetched. */
export function AdminLoading({ label = 'Loading…' }) {
  return (
    <div
      className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-sm text-muted"
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-6" />
      <span>{label}</span>
    </div>
  );
}

/** Describes an ApiError without ever claiming a false state. */
export function describeError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) {
    return fallback;
  }
  if (error.code === 'NETWORK_ERROR') {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (error.status === 503) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }
  return typeof error.message === 'string' && error.message.length > 0 ? error.message : fallback;
}

/** Inline message used for both errors (role=alert) and success (role=status). */
export function Notice({ tone = 'error', children, onDismiss }) {
  const isError = tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
        isError
          ? 'border-[#e6b4b0] bg-[#fdf1f0] text-[#8f1d15]'
          : 'border-[#b7dcc4] bg-[#eef8f1] text-[#1f6f43]'
      }`}
    >
      <span>{children}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded text-xs font-semibold underline decoration-transparent underline-offset-2 hover:decoration-current focus:decoration-current"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

/** Shared destructive-action button styling (delete, remove, …). */
export const dangerButtonClass =
  'inline-flex min-h-[38px] items-center justify-center rounded-full border border-[#e0a9a3] px-3.5 text-[0.84rem] font-semibold text-[#8f1d15] transition-ui hover:border-[#8f1d15] hover:bg-[#fdf1f0] disabled:cursor-not-allowed disabled:opacity-60';

/** Page heading with optional description and action buttons. */
export function PageHeader({ title, description, children }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}

/** Neutral empty state for a collection with no records yet. */
export function EmptyState({ title, message, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {message ? <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{message}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * Modal shell shared by the content dialogs and the delete confirmation. It
 * closes on backdrop click and Escape, and marks itself busy while a request is
 * in flight so the dialog cannot be dismissed mid-write.
 */
export function Dialog({
  labelledBy,
  role = 'dialog',
  describedBy,
  busy = false,
  onClose,
  children,
  className = 'max-w-xl',
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 px-4 py-8 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-busy={busy}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) {
            event.stopPropagation();
            onClose();
          }
        }}
        className={`w-full rounded-2xl border border-line bg-surface shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Accessible confirmation dialog for a destructive action. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  busyLabel = 'Deleting…',
  busy = false,
  onCancel,
  onConfirm,
}) {
  return (
    <Dialog role="alertdialog" labelledBy="confirm-heading" describedBy="confirm-message" busy={busy} onClose={onCancel} className="max-w-sm">
      <div className="p-6">
        <h2 id="confirm-heading" className="text-lg font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        <p id="confirm-message" className="mt-2 text-sm text-muted">
          {message}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button autoFocus type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <button type="button" className={dangerButtonClass} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** Compact previous/next pagination with a page count. */
export function Pagination({ page, pages, hasPrev, hasNext, onPage, busy = false }) {
  const total = Math.max(pages, 1);
  return (
    <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={!hasPrev || busy}
        className="inline-flex min-h-[38px] items-center rounded-full border border-line-strong px-3.5 text-sm font-semibold text-ink transition-ui hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <p className="text-sm text-muted" aria-live="polite">
        Page {page} of {total}
      </p>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={!hasNext || busy}
        className="inline-flex min-h-[38px] items-center rounded-full border border-line-strong px-3.5 text-sm font-semibold text-ink transition-ui hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}

/** Full-area recoverable error state with a retry affordance. */
export function AdminErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again' }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-center" role="alert">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex min-h-[40px] items-center rounded-full border border-line-strong px-4 text-sm font-semibold text-ink transition-ui hover:border-accent hover:text-accent"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
