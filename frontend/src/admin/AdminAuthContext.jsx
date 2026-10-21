import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSession, loginAdmin, logoutAdmin } from './adminApi.js';

export const ADMIN_AUTH_STATUS = Object.freeze({
  loading: 'loading',
  authenticated: 'authenticated',
  unauthenticated: 'unauthenticated',
  error: 'error',
});

const AdminAuthContext = createContext(null);

/**
 * Small administrator session layer.
 *
 * The backend session is the security boundary; this only drives what the UI
 * shows. It exposes:
 * - `status`: loading | authenticated | unauthenticated | error
 * - `admin`:  { id, email, name } once authenticated
 * - `login`, `logout`, `checkSession`, `markUnauthenticated`
 *
 * A network or server failure becomes `error`, never `unauthenticated`, so the
 * UI never falsely tells an administrator they signed out.
 */
export function AdminAuthProvider({ children }) {
  const [status, setStatus] = useState(ADMIN_AUTH_STATUS.loading);
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState(null);
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
      setStatus(ADMIN_AUTH_STATUS.authenticated);
    } catch (requestError) {
      if (requestError?.name === 'AbortError' || !isMounted.current) {
        return;
      }
      if (requestError?.status === 401) {
        setAdmin(null);
        setError(null);
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

  useEffect(() => {
    isMounted.current = true;
    checkSession();
    return () => {
      isMounted.current = false;
      activeRequest.current?.abort();
    };
  }, [checkSession]);

  const login = useCallback(async (credentials) => {
    const sessionAdmin = await loginAdmin(credentials);
    if (isMounted.current) {
      setAdmin(sessionAdmin);
      setError(null);
      setStatus(ADMIN_AUTH_STATUS.authenticated);
    }
    return sessionAdmin;
  }, []);

  const logout = useCallback(async () => {
    await logoutAdmin();
    if (isMounted.current) {
      setAdmin(null);
      setError(null);
      setStatus(ADMIN_AUTH_STATUS.unauthenticated);
    }
  }, []);

  const markUnauthenticated = useCallback(() => {
    if (isMounted.current) {
      setAdmin(null);
      setError(null);
      setStatus(ADMIN_AUTH_STATUS.unauthenticated);
    }
  }, []);

  const value = useMemo(
    () => ({ status, admin, error, login, logout, checkSession, markUnauthenticated }),
    [status, admin, error, login, logout, checkSession, markUnauthenticated],
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
