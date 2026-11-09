import { useEffect } from 'react';
import Arrow from '../components/Arrow.jsx';
import Brand from '../components/Brand.jsx';
import Button from '../components/Button.jsx';
import Container from '../components/Container.jsx';

const DEFAULT_DOCUMENT_TITLE = 'Pradeep Chavan — Developer Portfolio';
const NOT_FOUND_DOCUMENT_TITLE = 'Page not found — Pradeep Chavan';

/**
 * Branded public 404 view.
 *
 * The Express frontend router serves this document with a real 404 status for
 * unknown public URLs, so search engines see the correct response while a
 * visitor still gets a page that belongs to the portfolio.
 */
export default function NotFound() {
  useEffect(() => {
    const previousTitle = document.title || DEFAULT_DOCUMENT_TITLE;
    document.title = NOT_FOUND_DOCUMENT_TITLE;

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line">
        <Container className="flex min-h-[73px] items-center">
          <Brand href="/" />
        </Container>
      </header>

      <main className="flex flex-1 items-center">
        <Container className="py-16 sm:py-24">
          <p className="text-kicker font-semibold uppercase tracking-[0.22em] text-accent-strong">
            404 — Page not found
          </p>
          <h1 className="mt-5 max-w-[15ch] text-headline font-semibold tracking-[-0.05em] text-ink">
            This page is off the map.
          </h1>
          <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-muted sm:text-lg">
            The address may be mistyped, or the page may have moved. Return to the
            portfolio to explore the projects, skills, background, and contact details.
          </p>
          <div className="mt-9">
            <Button href="/">
              Back to the homepage
              <Arrow />
            </Button>
          </div>
        </Container>
      </main>

      <footer className="border-t border-line">
        <Container className="py-6">
          <p className="text-[0.78rem] text-muted">Pradeep Chavan — developer portfolio</p>
        </Container>
      </footer>
    </div>
  );
}
