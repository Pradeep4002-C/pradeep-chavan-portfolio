import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { ADMIN_AUTH_STATUS, useAdminAuth } from './AdminAuthContext.jsx';
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

export default function AdminLoginPage() {
  const { status, error, login, checkSession } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const emailRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const destination = safeDestination(location.state?.from);

  useEffect(() => {
    if (status === ADMIN_AUTH_STATUS.unauthenticated) {
      emailRef.current?.focus();
    }
  }, [status]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0 || password.length === 0) {
      setFormError('Enter your email address and password.');
      return;
    }

    setSubmitting(true);
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
      setSubmitting(false);
    }
  }

  if (status === ADMIN_AUTH_STATUS.loading) {
    return (
      <div className="min-h-screen bg-sunken">
        <AdminLoading label="Checking your session…" />
      </div>
    );
  }

  if (status === ADMIN_AUTH_STATUS.error) {
    return (
      <div className="min-h-screen bg-sunken">
        <AdminErrorState
          title="We could not reach the sign-in service"
          message={describeError(error, 'We could not reach the sign-in service. Please try again.')}
          onRetry={checkSession}
        />
      </div>
    );
  }

  if (status === ADMIN_AUTH_STATUS.authenticated) {
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sunken px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <AdminBrand />
            <AdminPill />
          </span>
          <a
            href="/"
            className="text-xs font-semibold text-muted underline decoration-transparent underline-offset-2 transition-ui hover:text-accent hover:decoration-current"
          >
            Back to site
          </a>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">Administrator sign-in</h1>
          <p className="mt-1.5 text-sm text-muted">
            This area is private. Sign in to manage portfolio content.
          </p>

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
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="admin-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-20`}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 my-1 mr-1 rounded-lg px-3 text-xs font-semibold text-muted transition-ui hover:text-accent"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
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
    </div>
  );
}
