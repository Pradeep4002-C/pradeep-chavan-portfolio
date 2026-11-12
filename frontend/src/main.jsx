import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import RouteErrorBoundary from './components/RouteErrorBoundary.jsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('React could not start because the #root element is missing from index.html.');
}

/* The public portfolio and the administrator area are two separate roots.
   Only /admin/* loads the admin bundle, so react-router-dom and the dashboard
   never enter the public portfolio's JavaScript. */
const ADMIN_PATH = /^\/admin(?:\/|$)/;
const isAdminPath = ADMIN_PATH.test(window.location.pathname);
const AdminRoot = isAdminPath ? lazy(() => import('./admin/AdminRoot.jsx')) : null;

function AdminBootFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-sunken text-sm text-muted"
      role="status"
      aria-live="polite"
    >
      Loading administrator area…
    </div>
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <RouteErrorBoundary scope={isAdminPath ? 'admin' : 'public'}>
      {AdminRoot ? (
        <Suspense fallback={<AdminBootFallback />}>
          <AdminRoot />
        </Suspense>
      ) : (
        <App />
      )}
    </RouteErrorBoundary>
  </StrictMode>,
);
