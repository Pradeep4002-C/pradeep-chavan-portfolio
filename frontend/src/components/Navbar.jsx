import { useEffect, useRef, useState } from 'react';
import { PORTFOLIO_STATUS, usePortfolio } from '../PortfolioContext.jsx';
import { hasBackgroundContent } from '../sections/backgroundContent.js';
import { hasSkillGroups } from '../sections/skillsContent.js';
import Brand from './Brand.jsx';
import Button from './Button.jsx';
import Container from './Container.jsx';
import DownloadIcon from './DownloadIcon.jsx';
import MenuIcon from './MenuIcon.jsx';
import { lockBodyScroll } from './bodyScrollLock.js';

const SECTION_LABELS = {
  work: 'Work',
  skills: 'Skills',
  about: 'About',
  background: 'Background',
  contact: 'Contact',
};

/* Shared link styling.
   - Default: muted text, no underline. The underline pseudo-element stays at
     scale-x-0 on every non-active link.
   - Hover / keyboard focus on a non-active link: text shifts to the accent.
     Keyboard focus also keeps the shared accent ring. Neither state grows the
     underline, so a passing pointer or focus can never impersonate the active
     section marker.
   - Active section: full-contrast ink text with a crisp 2px accent bar kept
     visible. The bar is exclusively driven by `aria-current`, and it grows
     with a transform transition only when motion is allowed.
   - Below `md` the active row instead gets a vertical accent bar in the drawer
     gutter plus semibold ink text. The bar is absolutely positioned, so the
     48px touch target and text alignment stay untouched. */
function linkClass(isActive) {
  return [
    'relative block min-h-[48px] min-w-[48px] cursor-pointer border-b py-[15px] text-base outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui',
    "before:absolute before:-left-2 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent before:opacity-0 before:content-[''] motion-safe:before:transition-opacity motion-safe:before:duration-200",
    'md:inline-flex md:items-center md:border-0 md:px-2 md:-mx-2 md:py-0 md:text-[0.84rem] md:before:hidden',
    "md:after:absolute md:after:bottom-[8px] md:after:left-2 md:after:right-2 md:after:h-0.5 md:after:origin-left md:after:rounded-full md:after:bg-accent md:after:content-[''] md:motion-safe:after:transition-transform md:motion-safe:after:duration-200",
    isActive
      ? 'border-accent font-semibold text-ink before:opacity-100 md:font-normal md:after:scale-x-100'
      : 'border-line text-muted hover:text-accent focus-visible:text-accent md:after:scale-x-0',
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
  // A section tapped from the mobile drawer is scrolled only after the drawer
  // closes and the body scroll lock is released.
  const pendingSectionRef = useRef(null);
  // The hash present on the very first render is the deep-link target. Later
  // hash changes belong to the browser's own anchor/history handling.
  const initialHashRef = useRef(
    typeof window === 'undefined' ? '' : window.location.hash.slice(1),
  );
  const hashAlignmentDoneRef = useRef(false);
  const userScrolledRef = useRef(false);
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
    // The reading band cannot activate the final section on very tall
    // viewports: #contact can begin below the band while #background still
    // overlaps it, and navigation order gives the earlier section the win.
    // Absolute scroll limits are unambiguous, so a boundary override wins
    // while the page is pinned at the very top or bottom.
    let boundaryId = null;
    let boundaryFrame = 0;

    function applyBoundary() {
      boundaryFrame = 0;
      const page = document.documentElement;
      const viewportHeight = window.innerHeight || 1;
      const maxScroll = Math.max(0, page.scrollHeight - viewportHeight);
      const scrollY = Math.max(0, window.scrollY || page.scrollTop || 0);
      let nextBoundary = null;

      if (maxScroll > 0) {
        if (scrollY <= 1) {
          // `home` has no navigation link; selecting it clears the marker.
          nextBoundary = observedIds[0];
        } else if (scrollY >= maxScroll - 1) {
          nextBoundary = observedIds[observedIds.length - 1];
        }
      }

      if (nextBoundary === boundaryId) return;
      const previousBoundary = boundaryId;
      boundaryId = nextBoundary;
      if (nextBoundary) {
        setActiveId(nextBoundary);
        return;
      }

      // Leaving a pinned boundary must immediately repaint the marker from the
      // sections under the reading band. Waiting for the observer is racy: its
      // callback may have already run (and returned) while the boundary was
      // still pinned, leaving no active link until the next intersection.
      if (previousBoundary) {
        const header = document.querySelector('header');
        const headerOffset = header ? Math.ceil(header.getBoundingClientRect().height) : 80;
        const readingLine = Math.round(headerOffset + (viewportHeight - headerOffset) / 2);
        const current = elements.find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top <= readingLine && rect.bottom > readingLine;
        });
        const currentId = current?.id ?? observedIds.find((id) => visible.has(id));
        if (currentId) setActiveId(currentId);
      }
    }

    function scheduleBoundary() {
      if (boundaryFrame) return;
      boundaryFrame = window.requestAnimationFrame(applyBoundary);
    }

    function connect() {
      if (observer) observer.disconnect();
      visible.clear();

      // Re-read the boundary after any relayout (async content, resize).
      applyBoundary();

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

          // A boundary is a stronger signal than the band; never let an
          // observer callback replace #home or the final section while the
          // page cannot scroll any further in that direction.
          if (boundaryId) return;

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
    window.addEventListener('scroll', scheduleBoundary, { passive: true });
    window.addEventListener('resize', scheduleReconnect);

    return () => {
      clearTimeout(resizeTimer);
      if (boundaryFrame) window.cancelAnimationFrame(boundaryFrame);
      window.removeEventListener('scroll', scheduleBoundary);
      window.removeEventListener('resize', scheduleReconnect);
      if (observer) observer.disconnect();
    };
  }, [sectionKey, status]);

  /* Align deep links once async content has settled. The homepage initially
     renders Work's loading panel and omits optional sections; scrolling as soon
     as #about exists would strand the viewport after Work and Skills expand
     above it. Waiting for a non-loading status and one animation frame lets the
     final section heights commit before the jump.

     If the visitor starts reading before the request settles, their scroll wins:
     the deep link is only honoured while they have not moved the page
     themselves. `scrollIntoView` honours the html `scroll-padding-top`, so the
     sticky header still keeps its distance. */
  useEffect(() => {
    if (status === PORTFOLIO_STATUS.loading || hashAlignmentDoneRef.current) {
      return undefined;
    }

    const id = initialHashRef.current;
    if (!id) {
      hashAlignmentDoneRef.current = true;
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      hashAlignmentDoneRef.current = true;
      if (userScrolledRef.current) return;

      const target = document.getElementById(id);
      if (!target) return;

      // Match the navigation marker immediately; the scroll spy will keep it
      // in sync if the visitor continues scrolling.
      setActiveId(id);
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sectionKey, status]);

  /* Wheel, touch, and scroll-key input are unambiguous user intent. They only
     matter while the cold-boot deep link is still waiting for data. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    function markUserScroll() {
      if (!hashAlignmentDoneRef.current) {
        userScrolledRef.current = true;
      }
    }

    function handleKeyDown(event) {
      // Scroll keys typed into a form control are editing, not page movement.
      const target = event.target;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'PageDown' ||
        event.key === 'PageUp' ||
        event.key === 'Home' ||
        event.key === 'End' ||
        event.key === ' '
      ) {
        markUserScroll();
      }
    }

    window.addEventListener('wheel', markUserScroll, { passive: true });
    window.addEventListener('touchmove', markUserScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', markUserScroll);
      window.removeEventListener('touchmove', markUserScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lock background scrolling while the drawer covers the viewport. The shared
  // reference-counted lock also keeps a modal dialog open above this drawer
  // from restoring body scrolling too early.
  useEffect(() => {
    if (!menuOpen) return undefined;
    return lockBodyScroll();
  }, [menuOpen]);

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

  /* Browser back/forward can land on a hash entry while the drawer is open.
     Closing here releases the shared body lock immediately, before any native
     anchor scrolling for the new history entry. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    function handleHistoryNavigation() {
      setMenuOpen(false);
    }

    window.addEventListener('popstate', handleHistoryNavigation);
    window.addEventListener('hashchange', handleHistoryNavigation);

    return () => {
      window.removeEventListener('popstate', handleHistoryNavigation);
      window.removeEventListener('hashchange', handleHistoryNavigation);
    };
  }, []);

  /* Mobile drawer links close the drawer themselves instead of relying on the
     browser's hash jump: while the body is locked the native jump can be
     swallowed, and the drawer's closing transition can leave the heading under
     the sticky header. The pending id is consumed after menuOpen becomes false,
     so the body is unlocked and the final layout committed before scrolling.
     The global html scroll-padding-top keeps the heading clear of the header. */
  useEffect(() => {
    if (menuOpen) return undefined;

    const id = pendingSectionRef.current;
    if (!id) return undefined;
    pendingSectionRef.current = null;

    const frame = window.requestAnimationFrame(() => {
      if (window.location.hash !== `#${id}`) {
        window.history.pushState(null, '', `#${id}`);
      }
      setActiveId(id);

      const target = document.getElementById(id);
      if (!target) return;
      // Sections already carry tabIndex="-1", so moving focus there keeps
      // keyboard and screen-reader users at the destination instead of leaving
      // focus on the link that just disappeared with the drawer.
      if (typeof target.focus === 'function') target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [menuOpen]);

  function handleSectionNavigate(event, id) {
    // Desktop links and a closed drawer keep the browser's native anchor jump.
    if (!menuOpen) return;

    event.preventDefault();
    pendingSectionRef.current = id;
    setMenuOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <>
      {menuOpen ? (
        <div
          aria-hidden="true"
          data-mobile-menu-backdrop=""
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[1px] md:hidden"
          onClick={closeMenu}
        />
      ) : null}
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
        <Container
          as="nav"
          aria-label="Main navigation"
          className="flex min-h-[68px] items-center justify-between gap-6 md:min-h-[78px]"
        >
          <Brand onNavigate={(event) => handleSectionNavigate(event, 'home')} />

          <button
            ref={menuButtonRef}
            type="button"
            className="grid size-12 cursor-pointer place-items-center rounded-full border border-line-strong outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui hover:border-ink md:hidden"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon open={menuOpen} />
          </button>

          <div
            id="primary-navigation"
            className={`absolute inset-x-0 top-full flex-col overflow-y-auto overscroll-contain border-b border-line bg-paper px-5 pb-6 pt-3 shadow-lg shadow-ink/5 max-h-[calc(100dvh-4.5rem)] md:static md:flex md:max-h-none md:flex-row md:items-center md:gap-8 md:overflow-y-visible md:border-0 md:bg-transparent md:p-0 md:shadow-none ${
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
                  onClick={(event) => handleSectionNavigate(event, section.id)}
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
    </>
  );
}
