import { useEffect } from 'react';
import Arrow from './Arrow.jsx';
import Brand from './Brand.jsx';
import Button from './Button.jsx';
import Container from './Container.jsx';

const COPY = {
  public: {
    kicker: 'Unexpected error',
    description:
      'Something interrupted this page while it was loading. Reload to try again, or return to the portfolio to keep exploring.',
    backLabel: 'Back to portfolio',
    backHref: '/',
    title: 'Something went wrong — Pradeep Chavan',
  },
  admin: {
    kicker: 'Administrator error',
    description:
      'Something interrupted the administrator area while it was loading. Reload to try again, or return to the dashboard.',
    backLabel: 'Back to admin',
    backHref: '/admin',
    title: 'Admin error — Pradeep Chavan',
  },
};

/**
 * Branded recovery surface shared by the public error boundary and the admin
 * router's errorElement. It deliberately shows no stack trace or framework
 * debugging text: neither helps a visitor or the site owner in production.
 *
 * `onReload` exists so DOM tests can observe the recovery action without
 * reloading jsdom; the default is the real browser reload.
 */
export default function RouteErrorView({ scope = 'public', onReload }) {
  const copy = COPY[scope] ?? COPY.public;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = copy.title;
    return () => {
      document.title = previousTitle;
    };
  }, [copy.title]);

  function reloadPage() {
    if (onReload) {
      onReload();
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line">
        <Container className="flex min-h-[73px] items-center">
          <Brand href="/" />
        </Container>
      </header>

      <main id="main-content" className="flex flex-1 items-center">
        <Container className="py-16 sm:py-24">
          <p className="text-kicker font-semibold uppercase tracking-[0.22em] text-accent-strong">
            {copy.kicker}
          </p>
          <h1 className="mt-5 max-w-[15ch] text-headline font-semibold tracking-[-0.05em] text-ink">
            This page hit a snag.
          </h1>
          <p
            role="alert"
            className="mt-6 max-w-[54ch] text-base leading-relaxed text-muted sm:text-lg"
          >
            {copy.description}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button type="button" onClick={reloadPage}>
              Reload page
            </Button>
            <Button href={copy.backHref} variant="outline">
              {copy.backLabel}
              <Arrow />
            </Button>
          </div>
        </Container>
      </main>

      <footer className="border-t border-line">
        <Container className="py-6">
          <p className="text-[0.78rem] text-muted">
            Pradeep Chavan — developer portfolio
          </p>
        </Container>
      </footer>
    </div>
  );
}
