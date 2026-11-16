import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { focusFirstError } from '../components/formFocus.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { ADMIN_AUTH_STATUS, useAdminAuth } from './AdminAuthContext.jsx';
import { adminDocumentTitle } from './adminTitles.js';
import {
  AdminBrand,
  AdminErrorState,
  AdminLoading,
  AdminPill,
  Notice,
  describeError,
  inputClass,
  labelClass,
} from './AdminUi.jsx';

/** Only ever return to another admin path, never back into the login form. */
function safeDestination(from) {
  const path = typeof from?.pathname === 'string' ? from.pathname : '';
  if (path.startsWith('/admin') && path !== '/admin/login') {
    return `${path}${typeof from?.search === 'string' ? from.search : ''}`;
  }
  return '/admin';
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SESSION_NOTICES = Object.freeze({
  expired: {
    tone: 'error',
    message:
      'Your session expired before the change was saved. Sign in again — your draft has been kept.',
  },
  remote: {
    tone: 'error',
    message: 'You signed out in another tab. Sign in again to continue where you left off.',
  },
  inactivity: {
    tone: 'error',
    message: 'You were signed out after a period of inactivity. Sign in again to continue.',
  },
  'signed-out': {
    tone: 'success',
    message: 'You have signed out.',
  },
});

function focusLoginError(errors) {
  focusFirstError(errors, ['email', 'password'], (key) =>
    document.getElementById(`admin-${key}`),
  );
}

export default function AdminLoginPage() {
  const { status, error, login, checkSession } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  // `submitting` only becomes true on the next render, so two clicks in the
  // same tick would both pass the state check. A ref flips synchronously.
  const submittingRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const destination = safeDestination(location.state?.from);
  const sessionNotice = SESSION_NOTICES[location.state?.reason] ?? null;

  useDocumentTitle(adminDocumentTitle('/admin/login'));

  useEffect(() => {
    if (status === ADMIN_AUTH_STATUS.unauthenticated) {
      emailRef.current?.focus();
    }
  }, [status]);

  function clearFieldError(name) {
    setFieldErrors((previous) => {
      if (!previous[name]) {
        return previous;
      }
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }

    const trimmedEmail = email.trim();
    const errors = {};
    if (trimmedEmail.length === 0) {
      errors.email = 'Enter your email address.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Enter a valid email address.';
    }
    if (password.length === 0) {
      errors.password = 'Enter your password.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError(
        errors.email && errors.password
          ? 'Enter your email address and password.'
          : 'Please fix the highlighted fields and try again.',
      );
      focusLoginError(errors);
      return;
    }

    setSubmitting(true);
    submittingRef.current = true;
    setFormError(null);
    try {
      await login({ email: trimmedEmail, password });
      // The provider is now authenticated; go to the intended admin page.
      navigate(destination, { replace: true });
    } catch (requestError) {
      if (requestError?.name === 'AbortError') {
        return;
      }
      setFormError(describeError(requestError, 'Sign-in failed. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (status === ADMIN_AUTH_STATUS.loading) {
    return (
      <main className="min-h-screen bg-sunken">
        <AdminLoading label="Checking your session…" />
      </main>
    );
  }

  if (status === ADMIN_AUTH_STATUS.error) {
    return (
      <main className="min-h-screen bg-sunken">
        <AdminErrorState
          title="We could not reach the sign-in service"
          message={describeError(error, 'We could not reach the sign-in service. Please try again.')}
          onRetry={checkSession}
        />
      </main>
    );
  }

  if (status === ADMIN_AUTH_STATUS.authenticated) {
    return <Navigate to={destination} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sunken px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between gap-2 sm:gap-3">
          <span className="inline-flex min-w-0 items-center gap-2">
            <AdminBrand />
            <AdminPill />
          </span>
          <a
            href="/"
            className="inline-flex min-h-[44px] shrink-0 items-center text-xs font-semibold text-muted underline decoration-transparent underline-offset-2 transition-ui hover:text-accent hover:decoration-current"
          >
            Back to site
          </a>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">Administrator sign-in</h1>
          <p className="mt-1.5 text-sm text-muted">
            This area is private. Sign in to manage portfolio content.
          </p>

          {sessionNotice ? (
            <div className="mt-5">
              <Notice tone={sessionNotice.tone}>{sessionNotice.message}</Notice>
            </div>
          ) : null}

          {formError ? (
            <div className="mt-5">
              <Notice tone="error">{formError}</Notice>
            </div>
          ) : null}

          <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className={labelClass} htmlFor="admin-email">
                Email address
              </label>
              <input
                ref={emailRef}
                id="admin-email"
                name="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFieldError('email');
                }}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'admin-email-error' : undefined}
              />
              {fieldErrors.email ? (
                <p id="admin-email-error" className="mt-1 text-xs font-medium text-[#b3261e]">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div>
              <label className={labelClass} htmlFor="admin-password">
                Password
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-20`}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFieldError('password');
                  }}
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'admin-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 mr-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-xs font-semibold text-muted transition-ui hover:text-accent"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.password ? (
                <p id="admin-password-error" className="mt-1 text-xs font-medium text-[#b3261e]">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <Button type="submit" variant="solid" disabled={submitting} className="w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Private administration area. There is no public registration.
        </p>
      </div>
    </main>
  );
}
