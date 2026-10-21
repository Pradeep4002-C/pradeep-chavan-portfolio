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
