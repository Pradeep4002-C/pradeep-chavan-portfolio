import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Button from '../components/Button.jsx';
import MenuIcon from '../components/MenuIcon.jsx';
import { lockBodyScroll } from '../components/bodyScrollLock.js';
import { useAdminAuth } from './AdminAuthContext.jsx';
import { AdminBrand, AdminLoading, AdminPill, Notice, describeError } from './AdminUi.jsx';
import InactivityWarningDialog from './InactivityWarningDialog.jsx';
import { INACTIVITY_TIMEOUT_MINUTES, INACTIVITY_WARNING_SECONDS } from './inactivity.js';
import { useInactivityLogout } from './useInactivityLogout.js';

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
    'flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm font-semibold transition-ui',
    isActive
      ? 'bg-accent-soft text-accent-strong'
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

function SignOutReminder({ className = '' }) {
  return (
    <p className={`text-xs leading-relaxed text-muted ${className}`}>
      For security, sign out when you&apos;re finished. Inactive sessions show a{' '}
      {INACTIVITY_WARNING_SECONDS}-second warning, then end automatically after{' '}
      {INACTIVITY_TIMEOUT_MINUTES} minutes.
    </p>
  );
}

/** Responsive administrator shell: sidebar on desktop, disclosure on mobile. */
export default function AdminLayout() {
  const { admin, logout, markUnauthenticated } = useAdminAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const menuButtonRef = useRef(null);
  const mainRef = useRef(null);

  // Lock the page behind the mobile drawer. The shared lock is ref-counted so a
  // dialog opened above the drawer cannot restore background scrolling early.
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    return lockBodyScroll();
  }, [menuOpen]);

  // Close with Escape or once the viewport reaches the desktop sidebar
  // breakpoint. Both paths return focus to the toggle when it is still visible.
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

    function handleResize() {
      if (window.matchMedia?.('(min-width: 1024px)').matches) {
        setMenuOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [menuOpen]);

  // Browser back/forward and programmatic route changes must never leave the
  // mobile drawer open over a different dashboard page.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  function closeMobileMenu() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  function handleMobileNavigate() {
    setMenuOpen(false);

    // The clicked NavLink is about to unmount with the drawer. Move focus to
    // the new page region after the route commits instead of dropping it on
    // <body> for keyboard and screen-reader users.
    window.setTimeout(() => {
      mainRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  const performLogout = useCallback(
    async ({ inactivity = false } = {}) => {
      if (loggingOut) {
        return;
      }
      setLoggingOut(true);
      setLogoutError(null);

      try {
        await logout();
      } catch (error) {
        if (!inactivity && error?.status !== 401) {
          setLogoutError(describeError(error, 'We could not sign you out. Please try again.'));
          return;
        }
        markUnauthenticated();
      } finally {
        setLoggingOut(false);
      }

      if (inactivity && typeof window !== 'undefined') {
        // A hard replace also bypasses an editor's unsaved-changes blocker.
        // Signing out must win over preserving an abandoned draft.
        window.location.replace('/admin/login');
      }
    },
    [loggingOut, logout, markUnauthenticated],
  );

  const { warningOpen, secondsRemaining, staySignedIn, signOutNow } = useInactivityLogout(
    () => performLogout({ inactivity: true }),
    {
      enabled: Boolean(admin),
    },
  );

  const identity = admin ?? { name: '', email: '' };

  return (
    <div className="min-h-screen bg-sunken">
      {menuOpen ? (
        <div
          aria-hidden="true"
          data-admin-menu-backdrop=""
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[1px] lg:hidden"
          onClick={closeMobileMenu}
        />
      ) : null}

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
            <Button variant="outline" size="sm" onClick={() => performLogout()} disabled={loggingOut}>
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
            <SignOutReminder className="text-center" />
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center text-xs font-semibold text-muted underline decoration-transparent underline-offset-2 transition-ui hover:text-accent hover:decoration-current"
            >
              View public site
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface lg:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <a
            href="/"
            className="inline-flex min-h-[44px] min-w-0 items-center gap-2 rounded-lg"
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
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="grid size-12 shrink-0 place-items-center rounded-full border border-line-strong text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui hover:border-accent hover:text-accent"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
        {menuOpen ? (
          <div
            id="admin-mobile-nav"
            data-admin-mobile-drawer=""
            className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-t border-line px-4 py-4 shadow-lg shadow-ink/5"
          >
            <nav aria-label="Admin sections">
              <NavList onNavigate={handleMobileNavigate} />
            </nav>
            <div className="mt-4 border-t border-line pt-4">
              <p className="truncate text-sm font-semibold text-ink">{identity.name || 'Administrator'}</p>
              <p className="truncate text-xs text-muted">{identity.email}</p>
              <div className="mt-3 flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => performLogout()} disabled={loggingOut}>
                  {loggingOut ? 'Signing out…' : 'Sign out'}
                </Button>
                <a
                  href="/"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg text-xs font-semibold text-muted underline decoration-transparent underline-offset-2 transition-ui hover:text-accent hover:decoration-current"
                >
                  View public site
                </a>
              </div>
              <SignOutReminder className="mt-2" />
            </div>
          </div>
        ) : null}
      </header>

      <div className="lg:pl-64">
        <main
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-5 py-8 outline-none sm:px-8 lg:px-10 lg:py-12"
        >
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

      {warningOpen ? (
        <InactivityWarningDialog
          secondsRemaining={secondsRemaining}
          onStaySignedIn={staySignedIn}
          onSignOut={signOutNow}
          busy={loggingOut}
        />
      ) : null}
    </div>
  );
}
