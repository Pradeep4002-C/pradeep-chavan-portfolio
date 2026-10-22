import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { useAdminAuth } from './AdminAuthContext.jsx';
import { AdminBrand, AdminLoading, AdminPill, Notice, describeError } from './AdminUi.jsx';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/projects', label: 'Projects', end: false },
  { to: '/admin/messages', label: 'Messages', end: false },
  { to: '/admin/skills', label: 'Skills', end: false },
  { to: '/admin/education', label: 'Education', end: false },
  { to: '/admin/certifications', label: 'Certifications', end: false },
  { to: '/admin/achievements', label: 'Achievements', end: false },
  { to: '/admin/profile', label: 'Profile', end: false },
];

function navLinkClass({ isActive }) {
  return [
    'flex items-center rounded-xl px-3 py-2 text-sm font-semibold transition-ui',
    isActive
      ? 'bg-accent-soft text-accent'
      : 'text-muted hover:bg-paper hover:text-ink',
  ].join(' ');
}

function NavList({ onNavigate }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.end} className={navLinkClass} onClick={onNavigate}>
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Responsive administrator shell: sidebar on desktop, disclosure on mobile. */
export default function AdminLayout() {
  const { admin, logout, markUnauthenticated } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch (error) {
      if (error?.status === 401) {
        markUnauthenticated();
        return;
      }
      setLogoutError(describeError(error, 'We could not sign you out. Please try again.'));
    } finally {
      setLoggingOut(false);
    }
  }

  const identity = admin ?? { name: '', email: '' };

  return (
    <div className="min-h-screen bg-sunken">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <a
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-lg"
          aria-label="Pradeep Chavan admin — visit public site"
        >
          <AdminBrand />
          <AdminPill />
        </a>
        <nav aria-label="Admin sections" className="flex-1">
          <NavList />
        </nav>
        <div className="mt-6 border-t border-line pt-4">
          <p className="truncate text-sm font-semibold text-ink" title={identity.name}>
            {identity.name || 'Administrator'}
          </p>
          <p className="truncate text-xs text-muted" title={identity.email}>
            {identity.email}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
            <a
              href="/"
              className="text-center text-xs font-semibold text-muted underline decoration-transparent underline-offset-2 transition-ui hover:text-accent hover:decoration-current"
            >
              View public site
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg"
            aria-label="Pradeep Chavan admin — visit public site"
          >
            <AdminBrand />
            <AdminPill />
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-nav"
            className="inline-flex min-h-[40px] items-center rounded-full border border-line-strong px-3.5 text-sm font-semibold text-ink transition-ui hover:border-accent hover:text-accent"
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        {menuOpen ? (
          <div id="admin-mobile-nav" className="border-t border-line px-4 py-4">
            <nav aria-label="Admin sections">
              <NavList onNavigate={() => setMenuOpen(false)} />
            </nav>
            <div className="mt-4 border-t border-line pt-4">
              <p className="truncate text-sm font-semibold text-ink">{identity.name || 'Administrator'}</p>
              <p className="truncate text-xs text-muted">{identity.email}</p>
              <div className="mt-3 flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? 'Signing out…' : 'Sign out'}
                </Button>
                <a
                  href="/"
                  className="text-xs font-semibold text-muted underline decoration-transparent underline-offset-2 transition-ui hover:text-accent hover:decoration-current"
                >
                  View public site
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          {logoutError ? (
            <div className="mb-6">
              <Notice tone="error" onDismiss={() => setLogoutError(null)}>
                {logoutError}
              </Notice>
            </div>
          ) : null}
          <Suspense fallback={<AdminLoading label="Loading…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
