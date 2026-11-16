import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSession, loginAdmin, logoutAdmin } from './adminApi.js';

export const ADMIN_AUTH_STATUS = Object.freeze({
  loading: 'loading',
  authenticated: 'authenticated',
  unauthenticated: 'unauthenticated',
  error: 'error',
});

/**
 * Cross-tab sign-out signal. `localStorage` is used (rather than an in-memory
 * bus) because the `storage` event fires in every other tab of the same origin,
 * including tabs that were opened before this one.
 */
export const ADMIN_AUTH_STORAGE_KEY = 'pradeep-portfolio.admin.auth';

const AdminAuthContext = createContext(null);

function broadcastSignOut(reason) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      ADMIN_AUTH_STORAGE_KEY,
      JSON.stringify({
        type: 'signed-out',
        reason,
        at: Date.now(),
        // A fresh nonce guarantees the stored value changes even for two
        // sign-outs in the same millisecond, so the storage event fires.
        nonce: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      }),
    );
  } catch {
    // Storage can be unavailable; the local tab still signs out correctly.
  }
}

/**
 * Small administrator session layer.
 *
 * The backend session is the security boundary; this only drives what the UI
 * shows. It exposes:
 * - `status`: loading | authenticated | unauthenticated | error
 * - `admin`:  { id, email, name } once authenticated
 * - `signOutReason`: why the UI left the authenticated state
 * - `login`, `logout`, `checkSession`, `markUnauthenticated`
 *
 * A network or server failure becomes `error`, never `unauthenticated`, so the
 * UI never falsely tells an administrator they signed out.
 */
export function AdminAuthProvider({ children }) {
  const [status, setStatus] = useState(ADMIN_AUTH_STATUS.loading);
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState(null);
  const [signOutReason, setSignOutReason] = useState(null);
  const activeRequest = useRef(null);
  const isMounted = useRef(true);

  const checkSession = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setStatus(ADMIN_AUTH_STATUS.loading);
    setError(null);

    try {
      const sessionAdmin = await fetchSession({ signal: controller.signal });
      if (!isMounted.current) {
        return;
      }
      setAdmin(sessionAdmin);
      setSignOutReason(null);
      setStatus(ADMIN_AUTH_STATUS.authenticated);
    } catch (requestError) {
      if (requestError?.name === 'AbortError' || !isMounted.current) {
        return;
      }
      if (requestError?.status === 401) {
        setAdmin(null);
        setError(null);
        setSignOutReason(null);
        setStatus(ADMIN_AUTH_STATUS.unauthenticated);
        return;
      }
      // The session could not be verified for a reason other than "signed
      // out" (offline, 5xx, malformed response). Keep the user informed.
      setAdmin(null);
      setError(requestError);
      setStatus(ADMIN_AUTH_STATUS.error);
    }
  }, []);

  /**
   * One transition shared by local sign-out, inactivity, 401 recovery, and
   * cross-tab broadcasts. `broadcast: false` is used by the receiving tab so
   * two tabs cannot echo the signal back and forth.
   */
  const applyUnauthenticated = useCallback((reason, { broadcast = true } = {}) => {
    if (isMounted.current) {
      activeRequest.current?.abort();
      setAdmin(null);
      setError(null);
      setSignOutReason(reason);
      setStatus(ADMIN_AUTH_STATUS.unauthenticated);
    }

    if (broadcast) {
      broadcastSignOut(reason);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    checkSession();
    return () => {
      isMounted.current = false;
      activeRequest.current?.abort();
    };
  }, [checkSession]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== ADMIN_AUTH_STORAGE_KEY || typeof event.newValue !== 'string') {
        return;
      }

      let message;
      try {
        message = JSON.parse(event.newValue);
      } catch {
        return;
      }

      if (message?.type !== 'signed-out') {
        return;
      }

      applyUnauthenticated('remote', { broadcast: false });
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [applyUnauthenticated]);

  const login = useCallback(async (credentials) => {
    const sessionAdmin = await loginAdmin(credentials);
    if (isMounted.current) {
      setAdmin(sessionAdmin);
      setError(null);
      setSignOutReason(null);
      setStatus(ADMIN_AUTH_STATUS.authenticated);
    }
    return sessionAdmin;
  }, []);

  const logout = useCallback(async () => {
    await logoutAdmin();
    applyUnauthenticated('signed-out');
  }, [applyUnauthenticated]);

  const markUnauthenticated = useCallback(
    (reason = 'expired') => applyUnauthenticated(reason),
    [applyUnauthenticated],
  );

  const value = useMemo(
    () => ({
      status,
      admin,
      error,
      signOutReason,
      login,
      logout,
      checkSession,
      markUnauthenticated,
    }),
    [status, admin, error, signOutReason, login, logout, checkSession, markUnauthenticated],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider.');
  }
  return value;
}
