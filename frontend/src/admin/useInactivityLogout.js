import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INACTIVITY_EVENTS,
  INACTIVITY_STORAGE_KEY,
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
  createActivitySignal,
  createInactivityController,
  parseActivitySignal,
} from './inactivity.js';

const CLOSED_WARNING = Object.freeze({ open: false, secondsRemaining: 0 });

/** Avoid writing to localStorage on every mousemove across several tabs. */
export const ACTIVITY_SYNC_INTERVAL_MS = 5000;

/**
 * Tracks administrator activity, exposes the sixty-second warning state, and
 * signs the user out after the idle deadline.
 *
 * Activity is mirrored through localStorage so an active tab keeps every other
 * open tab alive. Incoming heartbeats never echo back, which prevents an
 * infinite storage-event loop.
 */
export function useInactivityLogout(
  onIdle,
  {
    enabled = true,
    timeoutMs = INACTIVITY_TIMEOUT_MS,
    warningMs = INACTIVITY_WARNING_MS,
    storageKey = INACTIVITY_STORAGE_KEY,
    syncIntervalMs = ACTIVITY_SYNC_INTERVAL_MS,
    schedule = globalThis.setTimeout,
    cancel = globalThis.clearTimeout,
    now = Date.now,
    tickMs = 1000,
  } = {},
) {
  const onIdleRef = useRef(onIdle);
  const controllerRef = useRef(null);
  const warningRef = useRef(CLOSED_WARNING);
  const lastSignalRef = useRef(0);
  const lastWriteRef = useRef(0);
  const [warning, setWarningState] = useState(CLOSED_WARNING);

  const setWarning = useCallback((next) => {
    warningRef.current = next;
    setWarningState(next);
  }, []);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const persistActivity = useCallback(
    (at) => {
      if (typeof window === 'undefined') {
        return;
      }
      try {
        window.localStorage.setItem(storageKey, createActivitySignal(at));
      } catch {
        // Storage may be blocked in private browsing. The local timer still
        // works; only the cross-tab heartbeat is unavailable.
      }
    },
    [storageKey],
  );

  const staySignedIn = useCallback(() => {
    const at = now();
    lastSignalRef.current = at;
    lastWriteRef.current = at;
    controllerRef.current?.reset();
    setWarning(CLOSED_WARNING);
    persistActivity(at);
  }, [now, persistActivity, setWarning]);

  const signOutNow = useCallback(() => {
    controllerRef.current?.stop();
    setWarning(CLOSED_WARNING);
    onIdleRef.current?.();
  }, [setWarning]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      controllerRef.current = null;
      setWarning(CLOSED_WARNING);
      return undefined;
    }

    const controller = createInactivityController({
      timeoutMs,
      warningMs,
      schedule,
      cancel,
      now,
      tickMs,
      onWarning: (secondsRemaining) => setWarning({ open: true, secondsRemaining }),
      onTick: (secondsRemaining) => setWarning({ open: true, secondsRemaining }),
      onIdle: () => {
        setWarning(CLOSED_WARNING);
        onIdleRef.current?.();
      },
    });
    controllerRef.current = controller;

    function handleActivity() {
      // While the warning is open, only its two explicit buttons may resolve
      // it. Otherwise moving the pointer toward a button would dismiss the
      // dialog before the click lands.
      if (warningRef.current.open) {
        return;
      }

      const at = now();
      lastSignalRef.current = at;
      controller.reset();

      if (at - lastWriteRef.current >= syncIntervalMs) {
        lastWriteRef.current = at;
        persistActivity(at);
      }
    }

    function handleStorage(event) {
      if (event.key !== storageKey || !event.newValue) {
        return;
      }

      const at = parseActivitySignal(event.newValue);
      if (at === null || at <= lastSignalRef.current) {
        return;
      }

      // Another tab is active: restart this tab's timer without rewriting the
      // heartbeat, which would bounce between tabs forever.
      lastSignalRef.current = at;
      controller.reset();
      setWarning(CLOSED_WARNING);
    }

    for (const eventName of INACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    window.addEventListener('storage', handleStorage);
    controller.reset();

    return () => {
      for (const eventName of INACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      window.removeEventListener('storage', handleStorage);
      controller.stop();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [
    cancel,
    enabled,
    now,
    persistActivity,
    schedule,
    setWarning,
    storageKey,
    syncIntervalMs,
    tickMs,
    timeoutMs,
    warningMs,
  ]);

  return {
    warningOpen: warning.open,
    secondsRemaining: warning.secondsRemaining,
    staySignedIn,
    signOutNow,
  };
}
