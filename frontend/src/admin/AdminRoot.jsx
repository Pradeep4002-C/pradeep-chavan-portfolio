import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from './AdminAuthContext.jsx';
import AdminLayout from './AdminLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { AdminLoading } from './AdminUi.jsx';

/*
 * Every dashboard page is loaded on demand so the initial admin bundle stays
 * small, and so the public portfolio bundle never includes dashboard code.
 */
const AdminLoginPage = lazy(() => import('./AdminLoginPage.jsx'));
const AdminOverviewPage = lazy(() => import('./AdminOverviewPage.jsx'));
const AdminProjectsPage = lazy(() => import('./AdminProjectsPage.jsx'));
const AdminMessagesPage = lazy(() => import('./AdminMessagesPage.jsx'));
const AdminSkillsPage = lazy(() => import('./AdminSkillsPage.jsx'));
const AdminEducationPage = lazy(() => import('./AdminEducationPage.jsx'));
const AdminCertificationsPage = lazy(() => import('./AdminCertificationsPage.jsx'));
const AdminAchievementsPage = lazy(() => import('./AdminAchievementsPage.jsx'));
const AdminProfilePage = lazy(() => import('./AdminProfilePage.jsx'));

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
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<AdminLoading label="Loading…" />}>
                <AdminLoginPage />
              </Suspense>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/projects" element={<AdminProjectsPage />} />
              <Route path="/admin/messages" element={<AdminMessagesPage />} />
              <Route path="/admin/skills" element={<AdminSkillsPage />} />
              <Route path="/admin/education" element={<AdminEducationPage />} />
              <Route path="/admin/certifications" element={<AdminCertificationsPage />} />
              <Route path="/admin/achievements" element={<AdminAchievementsPage />} />
              <Route path="/admin/profile" element={<AdminProfilePage />} />
            </Route>
          </Route>
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
