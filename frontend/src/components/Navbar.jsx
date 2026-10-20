import { useEffect, useRef, useState } from 'react';
import { usePortfolio } from '../PortfolioContext.jsx';
import Brand from './Brand.jsx';
import Button from './Button.jsx';
import Container from './Container.jsx';
import DownloadIcon from './DownloadIcon.jsx';

const navSections = [
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

// Every section that can be "current"; `home` is included so the reading band
// behaves at the very top, even though it has no navigation link of its own.
const observedIds = ['home', ...navSections.map((section) => section.id)];

/* Shared link styling.
   - Default: muted text, no underline.
   - Hover / keyboard focus: text shifts to the accent and a 1px accent
     underline grows from the left. The bar is absolutely positioned, so it
     never moves the text or resizes the navbar.
   - Active section: full-contrast text with the same accent underline kept
     visible, so a permanent marker is never confused with a passing hover.
   - Below `md` there is no underline; the active row instead takes the accent
     as its divider, which keeps the marker visible on touch layouts. */
function linkClass(isActive) {
  return [
    'relative block cursor-pointer border-b py-[15px] text-base transition-ui',
    'md:inline-block md:border-0 md:py-0 md:text-[0.84rem]',
    "md:after:absolute md:after:-bottom-1 md:after:left-0 md:after:h-px md:after:w-full md:after:origin-left md:after:bg-accent md:after:transition-transform md:after:duration-200 md:after:content-['']",
    isActive
      ? 'border-accent text-ink md:after:scale-x-100'
      : 'border-line text-muted hover:text-accent focus-visible:text-accent md:after:scale-x-0 md:hover:after:scale-x-100 md:focus-visible:after:scale-x-100',
  ].join(' ');
}

export default function Navbar() {
  const { profile } = usePortfolio();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.hash.slice(1),
  );
  const menuButtonRef = useRef(null);
  const resumeHref = `${import.meta.env.BASE_URL}${profile.resume}`;

  /* Track the section the visitor is actually looking at, so the marker follows
     manual scrolling and not just clicks.

     An IntersectionObserver watches a thin reading band placed midway between the
     sticky header and the bottom of the viewport. Placing the line using the
     measured header height keeps the sticky nav out of the way, and putting it
     below the middle lets the short final section (Contact) become active once
     the page is scrolled to the end. The topmost section overlapping the band
     wins, which makes the handoff at each boundary deterministic instead of
     flickering. A resize rebuilds the observer (debounced) because the band is
     measured in pixels. */
  useEffect(() => {
    const elements = observedIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const visible = new Set();
    let observer;

    function connect() {
      if (observer) observer.disconnect();
      visible.clear();

      const header = document.querySelector('header');
      const headerOffset = header ? Math.ceil(header.getBoundingClientRect().height) : 80;
      const viewportHeight = window.innerHeight || 1;
      const readingLine = Math.round(headerOffset + (viewportHeight - headerOffset) / 2);
      const bandHeight = Math.max(1, Math.round(viewportHeight * 0.08));
      const bandTop = readingLine - Math.floor(bandHeight / 2);

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
          });

          const currentId = observedIds.find((id) => visible.has(id));
          if (currentId) setActiveId(currentId);
        },
        {
          rootMargin: `-${bandTop}px 0px -${viewportHeight - bandTop - bandHeight}px 0px`,
          threshold: 0,
        },
      );

      elements.forEach((element) => observer.observe(element));
    }

    let resizeTimer;

    // Resize fires continuously (window drags, mobile URL bars), so rebuild once
    // the size settles rather than creating an observer for every event.
    function scheduleReconnect() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(connect, 150);
    }

    connect();
    window.addEventListener('resize', scheduleReconnect);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', scheduleReconnect);
      if (observer) observer.disconnect();
    };
  }, []);

  /* Restore deep links. The sections are rendered by React, so a URL such as
     /#about reaches the browser before the target exists and the native fragment
     scroll finds nothing. Once the section is in the DOM, put the visitor on it.
     `scrollIntoView` honours the html `scroll-padding-top`, so the sticky header
     still keeps its distance. */
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return undefined;

    const target = document.getElementById(id);
    if (!target) return undefined;

    // A deep link is a jump, not an animation, and timers keep working in tabs
    // where animation frames are paused.
    const timer = window.setTimeout(() => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Close the mobile menu with Escape or when the viewport returns to desktop.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    const desktopQuery = window.matchMedia('(min-width: 768px)');

    function handleResize() {
      if (desktopQuery.matches) {
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

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
      <Container
        as="nav"
        aria-label="Main navigation"
        className="flex min-h-[68px] items-center justify-between gap-6 md:min-h-[78px]"
      >
        <Brand onNavigate={() => setMenuOpen(false)} />

        <button
          ref={menuButtonRef}
          type="button"
          className="grid size-[42px] cursor-pointer place-items-center gap-1.5 rounded-full border border-line-strong transition-ui hover:border-ink md:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={`block h-[1.5px] w-[15px] bg-ink transition-transform ${
              menuOpen ? 'translate-y-[3.75px] rotate-45' : ''
            }`}
          />
          <span
            className={`block h-[1.5px] w-[15px] bg-ink transition-transform ${
              menuOpen ? '-translate-y-[3.75px] -rotate-45' : ''
            }`}
          />
        </button>

        <div
          id="primary-navigation"
          className={`absolute inset-x-0 top-full flex-col border-b border-line bg-paper px-5 pb-6 pt-3 shadow-lg shadow-ink/5 md:static md:flex md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none ${
            menuOpen ? 'flex' : 'hidden'
          }`}
        >
          {navSections.map((section) => {
            const isActive = activeId === section.id;
            return (
              <a
                key={section.id}
                className={linkClass(isActive)}
                href={`#${section.id}`}
                aria-current={isActive ? 'location' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {section.label}
              </a>
            );
          })}
          <Button
            className="mt-3.5 self-start md:mt-0"
            href={resumeHref}
            size="sm"
            variant="outline"
            download="Pradeep-Chavan-Resume.pdf"
            onClick={() => {
              setMenuOpen(false);
              // The panel is hidden as the download starts, so keep focus in the
              // header instead of dropping it on <body>. On desktop the toggle is
              // display:none and this is skipped.
              if (menuOpen) menuButtonRef.current?.focus();
            }}
          >
            Download resume <DownloadIcon />
          </Button>
        </div>
      </Container>
    </header>
  );
}
