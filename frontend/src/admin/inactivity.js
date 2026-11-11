/** Shared inactivity policy for authenticated administrator views. */
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const INACTIVITY_TIMEOUT_MINUTES = INACTIVITY_TIMEOUT_MS / 60000;
export const INACTIVITY_WARNING_MS = 60 * 1000;
export const INACTIVITY_WARNING_SECONDS = INACTIVITY_WARNING_MS / 1000;

/** localStorage key used to mirror activity between open administrator tabs. */
export const INACTIVITY_STORAGE_KEY = 'pradeep.admin.last-activity';
export const INACTIVITY_ACTIVITY_TYPE = 'admin-activity';

export const INACTIVITY_EVENTS = Object.freeze([
  'mousemove',
  'mousedown',
  'keypress',
  'scroll',
]);

/**
 * Drives the full idle lifecycle:
 *
 * 1. Wait `timeoutMs` with no activity.
 * 2. Show a warning `warningMs` before the deadline.
 * 3. Tick the remaining seconds once per `tickMs`.
 * 4. Call `onIdle` exactly once when the deadline is reached.
 *
 * Scheduling and time are injectable so the complete fifteen-minute lifecycle
 * can be tested synchronously instead of waiting in real time.
 */
export function createInactivityController({
  timeoutMs = INACTIVITY_TIMEOUT_MS,
  warningMs = INACTIVITY_WARNING_MS,
  onWarning = () => {},
  onTick = () => {},
  onIdle,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
  now = Date.now,
  tickMs = 1000,
} = {}) {
  if (typeof onIdle !== 'function') {
    throw new TypeError('createInactivityController requires an onIdle callback.');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('timeoutMs must be a positive number.');
  }
  if (!Number.isFinite(warningMs) || warningMs <= 0 || warningMs >= timeoutMs) {
    throw new RangeError('warningMs must be positive and shorter than timeoutMs.');
  }
  if (!Number.isFinite(tickMs) || tickMs <= 0) {
    throw new RangeError('tickMs must be a positive number.');
  }

  let deadline = 0;
  let warningHandle = null;
  let tickHandle = null;

  function clearHandles() {
    if (warningHandle !== null) {
      cancel(warningHandle);
      warningHandle = null;
    }
    if (tickHandle !== null) {
      cancel(tickHandle);
      tickHandle = null;
    }
  }

  function fireIdle() {
    clearHandles();
    onIdle();
  }

  function tick() {
    tickHandle = null;
    const remaining = Math.max(0, deadline - now());

    if (remaining === 0) {
      fireIdle();
      return;
    }

    onTick(Math.ceil(remaining / 1000));
    tickHandle = schedule(tick, Math.min(tickMs, remaining));
  }

  function warn() {
    warningHandle = null;
    const remaining = Math.max(0, deadline - now());

    if (remaining === 0) {
      fireIdle();
      return;
    }

    onWarning(Math.ceil(remaining / 1000));
    tickHandle = schedule(tick, Math.min(tickMs, remaining));
  }

  return {
    /** Restart the full idle window and discard any warning/countdown. */
    reset() {
      clearHandles();
      deadline = now() + timeoutMs;
      warningHandle = schedule(warn, timeoutMs - warningMs);
    },
    /** Cancel every pending callback without calling `onIdle`. */
    stop() {
      clearHandles();
      deadline = 0;
    },
  };
}

/** Serialize one cross-tab activity heartbeat. */
export function createActivitySignal(
  at = Date.now(),
  nonce = Math.random().toString(36).slice(2),
) {
  return JSON.stringify({ type: INACTIVITY_ACTIVITY_TYPE, at, nonce });
}

/** Return the heartbeat timestamp, or null for unrelated/malformed values. */
export function parseActivitySignal(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }

  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      value.type !== INACTIVITY_ACTIVITY_TYPE ||
      !Number.isFinite(value.at) ||
      value.at < 0
    ) {
      return null;
    }
    return value.at;
  } catch {
    return null;
  }
}

/** Ignore stale heartbeats so a delayed storage event cannot revive a timer. */
export function acceptActivitySignal(raw, lastAppliedAt = -1) {
  const at = parseActivitySignal(raw);
  return at !== null && at > lastAppliedAt ? at : null;
}
