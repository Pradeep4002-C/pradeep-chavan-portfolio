import Navbar from './components/Navbar.jsx';
import About from './sections/About.jsx';
import Background from './sections/Background.jsx';
import Contact from './sections/Contact.jsx';
import Footer from './sections/Footer.jsx';
import Hero from './sections/Hero.jsx';
import Skills from './sections/Skills.jsx';
import Work from './sections/Work.jsx';
import NotFound from './pages/NotFound.jsx';
import { PortfolioProvider } from './PortfolioContext.jsx';

/**
 * The public portfolio is intentionally router-free: it is one page at `/`
 * whose sections use hash links. A direct request for any other public URL is
 * answered by the production SPA fallback with a 404 status, so this helper
 * provides the equivalent of a trailing `*` route without adding
 * react-router-dom to the public bundle (the admin area still owns the router).
 */
export function isKnownPublicPath(pathname) {
  return pathname === '/' || pathname === '/index.html';
}

function currentPathname() {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

/** App composes the page sections. Content and styling live in separate files. */
export default function App({ pathname }) {
  // The `pathname` prop exists for server-side rendering tests; browsers use
  // the real location and never need to pass it.
  if (!isKnownPublicPath(pathname ?? currentPathname())) {
    return <NotFound />;
  }

  return (
    <PortfolioProvider>
      <a
        className="sr-only outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:min-h-[48px] focus:min-w-[48px] focus:rounded-md focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:text-white"
        href="#main-content"
      >
        Skip to content
      </a>
      <Navbar />
      {/* tabIndex -1 lets the skip link move focus here, not just scroll. */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <Work />
        <Skills />
        <About />
        <Background />
        <Contact />
      </main>
      <Footer />
    </PortfolioProvider>
  );
}
