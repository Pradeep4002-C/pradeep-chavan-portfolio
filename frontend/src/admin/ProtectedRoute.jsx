import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ADMIN_AUTH_STATUS, useAdminAuth } from './AdminAuthContext.jsx';
import { AdminErrorState, AdminLoading, describeError } from './AdminUi.jsx';

/**
 * Front-end guard for administrator routes. It is a user-experience helper
 * only: every administrator API call is independently protected by requireAuth
 * on the server, so bypassing this guard grants no data.
 */
export default function ProtectedRoute() {
  const { status, error, checkSession, signOutReason } = useAdminAuth();
  const location = useLocation();

  if (status === ADMIN_AUTH_STATUS.loading) {
    return <AdminLoading label="Checking your session…" />;
  }

  if (status === ADMIN_AUTH_STATUS.error) {
    return (
      <AdminErrorState
        title="We could not verify your session"
        message={describeError(error, 'We could not verify your session. Please try again.')}
        onRetry={checkSession}
      />
    );
  }

  if (status === ADMIN_AUTH_STATUS.unauthenticated) {
    // Remember where the administrator wanted to go so login can return there.
    // The reason drives the session-expired / signed-out-in-another-tab notice.
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location, reason: signOutReason }}
      />
    );
  }

  return <Outlet />;
}
