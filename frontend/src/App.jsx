import Navbar from './components/Navbar.jsx';
import About from './sections/About.jsx';
import Contact from './sections/Contact.jsx';
import Footer from './sections/Footer.jsx';
import Hero from './sections/Hero.jsx';
import Work from './sections/Work.jsx';

/** App composes the page sections. Content and styling live in separate files. */
export default function App() {
  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:text-white"
        href="#main-content"
      >
        Skip to content
      </a>
      <Navbar />
      {/* tabIndex -1 lets the skip link move focus here, not just scroll. */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <Work />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
