import { Suspense, lazy } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AdminAuthProvider } from './AdminAuthContext.jsx';
import AdminLayout from './AdminLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { AdminLoading } from './AdminUi.jsx';

/*
 * Every dashboard page is loaded on demand so the initial admin bundle stays
 * small, and so the public portfolio bundle never includes dashboard code.
 *
 * This uses a data router because the project editor relies on useBlocker to
 * prevent an unsaved edit from being discarded by sidebar or breadcrumb
 * navigation.
 */
const AdminLoginPage = lazy(() => import('./AdminLoginPage.jsx'));
const AdminOverviewPage = lazy(() => import('./AdminOverviewPage.jsx'));
const AdminProjectsPage = lazy(() => import('./AdminProjectsPage.jsx'));
const ProjectEditorPage = lazy(() => import('./ProjectEditorPage.jsx'));
const AdminMessagesPage = lazy(() => import('./AdminMessagesPage.jsx'));
const AdminSkillsPage = lazy(() => import('./AdminSkillsPage.jsx'));
const AdminEducationPage = lazy(() => import('./AdminEducationPage.jsx'));
const AdminCertificationsPage = lazy(() => import('./AdminCertificationsPage.jsx'));
const AdminAchievementsPage = lazy(() => import('./AdminAchievementsPage.jsx'));
const AdminProfilePage = lazy(() => import('./AdminProfilePage.jsx'));

const router = createBrowserRouter([
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={<AdminLoading label="Loading…" />}>
        <AdminLoginPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <AdminOverviewPage /> },
          { path: '/admin/projects', element: <AdminProjectsPage /> },
          { path: '/admin/projects/new', element: <ProjectEditorPage /> },
          { path: '/admin/projects/:id/edit', element: <ProjectEditorPage /> },
          { path: '/admin/messages', element: <AdminMessagesPage /> },
          { path: '/admin/skills', element: <AdminSkillsPage /> },
          { path: '/admin/education', element: <AdminEducationPage /> },
          { path: '/admin/certifications', element: <AdminCertificationsPage /> },
          { path: '/admin/achievements', element: <AdminAchievementsPage /> },
          { path: '/admin/profile', element: <AdminProfilePage /> },
        ],
      },
    ],
  },
  {
    path: '/admin/*',
    element: <Navigate to="/admin" replace />,
  },
]);

/**
 * Administrator application root. It is loaded lazily only for /admin/* paths,
 * so the router and dashboard code stay out of the public portfolio bundle.
 *
 * Routing note: this uses paths, not hashes. Deep links such as
 * /admin/projects/new require the host to fall back to index.html for unknown
 * paths. Vite provides that fallback in development, and the Express
 * production router provides the same SPA fallback for browser navigations.
 */
export default function AdminRoot() {
  return (
    <AdminAuthProvider>
      <RouterProvider router={router} />
    </AdminAuthProvider>
  );
}
