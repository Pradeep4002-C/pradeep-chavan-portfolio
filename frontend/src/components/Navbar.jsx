import { useEffect, useRef, useState } from 'react';
import { PORTFOLIO_STATUS, usePortfolio } from '../PortfolioContext.jsx';
import { hasBackgroundContent } from '../sections/backgroundContent.js';
import { hasSkillGroups } from '../sections/skillsContent.js';
import Brand from './Brand.jsx';
import Button from './Button.jsx';
import Container from './Container.jsx';
import DownloadIcon from './DownloadIcon.jsx';

const SECTION_LABELS = {
  work: 'Work',
  skills: 'Skills',
  about: 'About',
  background: 'Background',
  contact: 'Contact',
};

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
    'relative block min-h-[48px] min-w-[48px] cursor-pointer border-b py-[15px] text-base outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui',
    'md:inline-flex md:items-center md:border-0 md:px-2 md:-mx-2 md:py-0 md:text-[0.84rem]',
    "md:after:absolute md:after:bottom-[9px] md:after:left-2 md:after:right-2 md:after:h-px md:after:origin-left md:after:bg-accent md:after:transition-transform md:after:duration-200 md:after:content-['']",
    isActive
      ? 'border-accent text-ink md:after:scale-x-100'
      : 'border-line text-muted hover:text-accent focus-visible:text-accent md:after:scale-x-0 md:hover:after:scale-x-100 md:focus-visible:after:scale-x-100',
  ].join(' ');
}

export default function Navbar() {
  const {
    profile,
    skillGroups,
    education,
    certifications,
    achievements,
    status,
  } = usePortfolio();
  const isLoading = status === PORTFOLIO_STATUS.loading;
  // Optional sections join the navigation once their public content exists.
  // While the API request is pending, reserve their slots instead of letting
  // them pop into the header after the response and shifting every link.
  const sectionKey = [
    'work',
    isLoading || hasSkillGroups(skillGroups) ? 'skills' : null,
    'about',
    isLoading || hasBackgroundContent({ education, certifications, achievements })
      ? 'background'
      : null,
    'contact',
  ]
    .filter(Boolean)
    .join(' ');
  const navSections = sectionKey.split(' ').map((id) => ({ id, label: SECTION_LABELS[id] }));
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.hash.slice(1),
  );
  const menuButtonRef = useRef(null);
  const resumeHref = profile.resume
    ? `${import.meta.env.BASE_URL}${profile.resume}`
    : null;

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
    // `home` is included so the reading band behaves correctly at the very top,
    // even though it has no navigation link of its own.
    const observedIds = ['home', ...sectionKey.split(' ')];
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
  }, [sectionKey, status]);

  /* Align deep links once async content has settled. The homepage initially
     renders Work's loading panel and omits optional sections; scrolling as soon
     as #about exists would strand the viewport after Work and Skills expand
     above it. Waiting for a non-loading status and one animation frame lets the
     final section heights commit before the jump.

     `scrollIntoView` honours the html `scroll-padding-top`, so the sticky header
     still keeps its distance. */
  useEffect(() => {
    if (status === PORTFOLIO_STATUS.loading) return undefined;

    const id = window.location.hash.slice(1);
    if (!id) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sectionKey, status]);

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
          className="grid size-12 cursor-pointer place-items-center gap-1.5 rounded-full border border-line-strong outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui hover:border-ink md:hidden"
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
          {resumeHref ? (
            <Button
              className="mt-3.5 self-start md:mt-0"
              href={resumeHref}
              size="sm"
              variant="outline"
              download="Pradeep_Chavan_Resume.pdf"
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
          ) : null}
        </div>
      </Container>
    </header>
  );
}
