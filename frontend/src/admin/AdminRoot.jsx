import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from './AdminAuthContext.jsx';
import AdminLayout from './AdminLayout.jsx';
import AdminLoginPage from './AdminLoginPage.jsx';
import AdminOverviewPage from './AdminOverviewPage.jsx';
import AdminProjectsPage from './AdminProjectsPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

/**
 * Administrator application root. It is loaded lazily only for /admin/* paths,
 * so the router and dashboard code stay out of the public portfolio bundle.
 *
 * Routing note: this uses paths, not hashes. Deep links such as
 * /admin/projects require the host to fall back to index.html for unknown
 * paths (Vite does this in development; production hosting must be configured
 * the same way in a later milestone).
 */
export default function AdminRoot() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/projects" element={<AdminProjectsPage />} />
            </Route>
          </Route>
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
