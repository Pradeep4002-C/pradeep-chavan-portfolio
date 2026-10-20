# Copy/paste source code — Pradeep Chavan Portfolio

Each heading gives the exact path where that file belongs. In VS Code, open the existing file, select all, paste the matching code, and save. Binary assets (`frontend/public/resume.pdf`, `frontend/package-lock.json`) are not source code and are not reproduced here. The project illustrations are drawn in CSS and inline SVG inside `frontend/src/components/ProjectArtwork.jsx`, so no project image file ships with this site.

## Recommended use

1. Open the project folder in VS Code.
2. Use the folder tree in `frontend/docs/structure-guide.md` to understand the layout.
3. Replace a file only at the matching path; do not paste component code into the wrong file.
4. Run `npm install` and `npm run dev` from inside `frontend/`.

## `.gitignore`

```gitignore
# Dependencies and generated build output
frontend/node_modules/
frontend/dist/

# Local logs and environment files
*.log
.env
.env.*
!.env.example

# Operating-system files
.DS_Store
Thumbs.db
```

## `README.md`

````markdown
# Pradeep Chavan — Developer Portfolio

A project-first portfolio built with React, Vite, and Tailwind CSS v4. The resume supplies factual details and repository destinations; the website is designed around selected work instead of repeating the full CV.

## Run locally

Open a terminal **inside `frontend/`** and run:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173/`).

Build for production:

```powershell
npm run build
```

Preview the production build:

```powershell
npm run preview
```

## Project structure

```text
frontend/
├── index.html                  # Browser metadata and React mount point
├── package.json                # Dependencies and npm commands
├── vite.config.js              # Vite + React + Tailwind configuration
├── public/
│   ├── favicon.svg              # Browser-tab icon
│   ├── resume.pdf               # Downloadable resume
│   └── robots.txt               # Crawler rules
├── src/
│   ├── components/              # Reusable UI components
│   ├── data/portfolio.js        # Profile, project, and skill content
│   ├── sections/                # Hero, Work, About, Contact, Footer
│   ├── App.jsx                  # Composes page sections
│   ├── main.jsx                 # React entry point
│   └── index.css                # Tailwind import, tokens, base layer, focus utility
└── docs/                        # Design and code structure notes
```

Read `frontend/docs/structure-guide.md` for the role of each file and how the parts fit together. `CODE-COPY-PASTE.md` at the project root contains the editable text/code of each source file grouped by its path.

## Styling with Tailwind CSS v4

Tailwind is the primary styling system. It is wired in through the first-party Vite plugin, not PostCSS or a CLI build step:

- `vite.config.js` registers `@tailwindcss/vite`.
- `src/index.css` starts with `@import "tailwindcss";` and defines the design tokens in an `@theme` block.
- Components and sections are styled with Tailwind utilities in their `className` values.

Design tokens live in one place. Adding to `@theme` in `src/index.css` automatically creates matching utilities:

| Token | Utility it creates |
| --- | --- |
| `--color-ink`, `--color-accent`, `--color-line`, … | `text-ink`, `bg-accent`, `border-line`, … |
| `--container-content` | `max-w-content` |
| `--text-display`, `--text-headline`, `--text-kicker` | `text-display`, `text-headline`, `text-kicker` |
| `--breakpoint-xs` | the `xs:` responsive variant |
| `--animate-blink` | `animate-blink` |

`src/index.css` stays deliberately small: the Tailwind import, the token block, a short base layer, one small `transition-ui` utility, and a reduced-motion guard. Everything else is utility classes in the components.

## Design direction

- **Squarespace** informed the restrained typography, whitespace, and work-led composition.
- **Hostinger** informed the straightforward work/about/contact flow and mobile-friendly layout.
- The developer portfolio reference informed a personal introduction followed by visual project work.

These are design principles, not copied templates.

## Where to edit

- Change name, email, profile links, project descriptions, repository destinations, and skill groups in `frontend/src/data/portfolio.js`.
- Change the page order in `frontend/src/App.jsx`.
- Change colors, fonts, spacing scale, or breakpoints in the `@theme` block in `frontend/src/index.css`.
- Change a specific reusable UI piece in `frontend/src/components/` (`Container`, `Button`, `Brand`, `Arrow`, `DownloadIcon`, `Navbar`, `ProjectArtwork`, `ProjectEntry`, `TechnologyTags`).
- Change a major page region in `frontend/src/sections/`.

Project repository destinations are sourced from the hyperlinks in the supplied resume, and all three resolve. The showcase pairs each project with a purpose-built illustration — a drawing, never a screenshot — alongside its index, category, title, one-line summary, detail, technologies, and repository link. Change the `artwork` key on a project to switch which drawing that entry gets. Confirm links in your browser before publishing.

## Technical decisions

- The mobile menu closes when a navigation item is selected, Escape is pressed, or the viewport changes back to desktop size. Escape returns focus to the toggle. Mobile has no underline to reuse, so the current section is marked by full-contrast text and an accent divider on its row.
- Desktop nav links share one interaction model: muted text at rest, the accent colour plus a 1px accent underline that grows from the left on hover or keyboard focus, and — for the current section — full-contrast text with that underline kept visible. The underline is an absolutely positioned pseudo-element, so hovering never moves text or resizes the navbar.
- The current section is tracked with an `IntersectionObserver` watching a thin reading band placed midway between the sticky header (height measured at runtime) and the bottom of the viewport, so the marker follows manual scrolling. The topmost section in the band wins, which keeps the handoff at each boundary stable and still lets the short final section become active at the end of the page. Clicking a link navigates normally; the observer never rewrites the URL. The band is measured in pixels, so a resize rebuilds the observer; that rebuild is debounced so a burst of resize events only causes one.
- Interactive elements animate colour, background, border, and underline through one `transition-ui` utility. Tailwind's built-in colour transition utility would also animate `outline-color`, which makes the keyboard focus ring fade in from the element's own colour; leaving it out keeps the ring at full contrast from the first frame.
- A single global `:focus-visible` rule provides a 3px accent outline with a 3px offset, so keyboard focus is never removed without an equally visible replacement.
- Project entries have one repository action rather than duplicated icon and text links.
- The showcase is one gallery in two tiers: HostelCare leads as the featured project — its illustration beside the copy, with the largest title — and AquaPredict and RPA Expense Tracker follow one type step down with the illustration above the copy, side by side from 1024px up. Every entry keeps the same anatomy — numbered index, category, title, one-line summary, detail, technologies, repository action — so three projects scan the same way.
- Each project is drawn rather than screenshotted. `frontend/src/components/ProjectArtwork.jsx` holds one purpose-built CSS/SVG illustration per project, chosen by the `artwork` field in the data: a report → prioritize → resolve complaint workflow for HostelCare, the eight water-quality measurements and the three status bands for AquaPredict, and the Excel → summary report → email flow for the expense tracker. No drawing contains a figure, filename, category name, model output, or metric, so nothing in the section claims more than the project data already says.
- Every panel states what it is. Its topline prints "Illustrative workflow", "Illustrative diagram", or "Illustrative flow", the panel is a single `role="img"` carrying one descriptive label, and the drawing inside is presentational — a screen reader hears one sentence per project instead of a stream of drawing fragments.
- An earlier revision framed screenshots taken from the projects' own repositories inside aspect-ratio covers. At the sizes that layout could give them those previews were too small and too heavily cropped to read, and enlarging a low-resolution screenshot or substituting a stock image would have been worse than showing nothing, so the covers and the two screenshot files were deleted rather than patched. The section renders zero `<img>` elements at every width and ships no project image file.
- Entries are separated by a hairline rule instead of being boxed into cards, and the featured row ends level because its panel stretches to the height of the copy from 1024px up. Below 480px every drawing switches to a stacked arrangement — rows instead of columns, the workflow connectors turned downward — because a three-up column at that width breaks words.
- The only movement in the showcase is the arrow glyph inside a repository link, which shifts 2px on hover through a transform. The drawings have no hover state, and nothing in an entry is clickable except that one repository action. The global reduced-motion guard collapses the arrow transition, so it never animates for a visitor who has asked for reduced motion, and the repository action reuses the outline pill from the design system (the same 42px-tall target as the resume button).
- Clicking a project entry does nothing and the one repository action is a real link, so the entry and its link never compete. There is no "Live demo" button, because none of the three projects has a public deployment.
- The contact area has one clear email action instead of competing duplicate buttons, with the location shown as a small secondary line.
- The greeting types itself once, then stays visible. With `prefers-reduced-motion: reduce` it appears instantly with no cursor and no typing.
- Interface icons are inline SVG, never emoji or text glyphs. The arrow characters (`→`, `↗`, `↑`) were replaced because Windows renders some of them (such as `↗`, U+2197) with emoji presentation, which is why the resume button once showed a blue emoji tile.
- The resume button is labelled "Download resume" and downloads the PDF (`download` attribute on a same-origin link), so the label matches the action.
- The header brand is a "PC" monogram beside the name; the letters are generated content so they stay out of the link's accessible name.
- Nothing in the showcase stands in for an application screen: there is no screenshot, no placeholder box, no stock imagery, no imitation window, and no fabricated metric. The drawings are labelled diagrams, and each entry ends at one real repository link.
- No backend, API, database, authentication, fake contact form, or ML service is part of this frontend phase.

## Accessibility and quality checks

Measured with Lighthouse against the production build, re-run after the gallery was redesigned:

| Category | Score |
| --- | --- |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

Layout was also measured inside same-origin frames at 320, 360, 375, 390, 414, 430, 540, 640, 768, 820, 1024, 1280, 1366, 1440, 1600, and 1920 pixels wide: no page reported horizontal overflow, the mobile menu appears below 768px, and content stays capped at a 1200px container on large screens.

The gallery was re-measured after the redesign, inside same-origin frames at 320, 360, 375, 414, 430, 480, 640, 768, 900, 1023, 1024, 1100, 1280, 1440, and 1920 pixels wide — once against the development server and again against the production build, which agreed to the pixel. No width reported horizontal overflow, `#work` rendered zero images, no text inside an illustration escaped its panel, every technology list stayed on one row, and each repository link measured 123x42px. The smallest label in any drawing measured 9.6px. The two supporting panels matched exactly wherever they share a row (528x250 at 1280px, 432x250 at 1024px) and their top edges aligned, while the featured panel measured 607x357 and stayed taller than either supporting panel. Section height runs from 2757px at 320px, where all three drawings stack, down to 1549px at 1280px.
````

## `frontend/package.json`

```json
{
  "name": "pradeep-portfolio",
  "private": true,
  "version": "1.0.1",
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.3.3",
    "vite": "^6.1.0"
  }
}
```

## `frontend/vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tailwind CSS v4 is wired in through its first-party Vite plugin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

## `frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f7f6f2" />
    <meta
      name="description"
      content="Pradeep Chavan is a Computer Science Engineering student building full-stack applications, workflow automations, and data-driven tools."
    />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Pradeep Chavan — Developer Portfolio" />
    <meta
      property="og:description"
      content="Selected software projects, workflow automation, and applied machine learning."
    />
    <title>Pradeep Chavan — Developer Portfolio</title>
    <link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## `frontend/public/robots.txt`

```text
User-agent: *
Allow: /
```

## `frontend/src/main.jsx`

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('React could not start because the #root element is missing from index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## `frontend/src/App.jsx`

```jsx
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
```

## `frontend/src/index.css`

```css
@import "tailwindcss";

/* Design tokens. Tailwind v4 turns these into utilities such as
   bg-paper, text-muted, border-line, max-w-content, text-display. */
@theme {
  --color-paper: #f7f6f2;
  --color-surface: #fffefa;
  --color-sunken: #eeede7;
  --color-ink: #1c1d1b;
  --color-muted: #66675f;
  /* Dark enough to clear 4.5:1 on both the paper and sunken backgrounds. */
  --color-subtle: #6a6b64;
  --color-line: #dedfd7;
  --color-line-strong: #cfd0c7;
  --color-accent: #6c55e8;
  --color-accent-soft: #ece8ff;
  --color-night: #222126;
  --color-night-soft: #c5c3ca;

  --container-content: 1200px;
  --breakpoint-xs: 30rem;

  --text-kicker: 0.68rem;
  --text-display: clamp(3.25rem, 8.4vw, 7rem);
  --text-headline: clamp(2.6rem, 5.4vw, 4.75rem);
  --text-title: clamp(1.65rem, 2.7vw, 2.5rem);

  --animate-blink: blink 1s step-end infinite;

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
}

/* Hover/focus colour transition for interactive elements.

   Tailwind's built-in colour transition utility also lists `outline-color`, so the keyboard
   focus ring fades in from the element's own colour instead of appearing at
   full contrast straight away. This utility animates the same properties
   without `outline-color`. */
@utility transition-ui {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: var(--default-transition-timing-function);
  transition-duration: var(--default-transition-duration);
}

/* Base layer: genuinely global concerns only. */
@layer base {
  html {
    scroll-behavior: smooth;
    /* Keep anchored sections clear of the sticky header. */
    scroll-padding-top: 6rem;
    -webkit-text-size-adjust: 100%;
  }

  body {
    @apply bg-paper font-sans text-ink antialiased;
    font-synthesis: none;
  }

  ::selection {
    color: #fff;
    background: var(--color-accent);
  }

  :focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 3px;
  }

  img,
  svg {
    max-width: 100%;
  }

  /* Global reduced-motion guard: the only animation on the site is the
     typewriter cursor (hidden here and via JS); this stops hover transitions. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

## `frontend/src/components/Arrow.jsx`

```jsx
/**
 * Inline SVG arrow.
 *
 * This used to be a text glyph (→ / ↗ / ↓ / ↑). Characters such as U+2197
 * "↗" are emoji-capable, so Windows painted the resume arrow as a blue emoji
 * tile. Drawing the arrow as inline SVG gives one font-independent shape that
 * inherits the surrounding text colour via `currentColor`.
 */
const paths = {
  right: ['M5 12h14', 'm13 6 6 6-6 6'],
  down: ['M12 5v14', 'm6 13 6 6 6-6'],
  up: ['M12 19V5', 'm6 11 6-6 6 6'],
  diagonal: ['M7 17 17 7', 'M7 7h10v10'],
};

const hover = {
  right: 'group-hover:translate-x-0.5',
  down: 'group-hover:translate-y-0.5',
  up: 'group-hover:-translate-y-0.5',
  diagonal: 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
};

export default function Arrow({ diagonal = false, down = false, up = false, className = '' }) {
  const direction = down ? 'down' : up ? 'up' : diagonal ? 'diagonal' : 'right';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[1.05em] w-[1.05em] shrink-0 transition-transform ${hover[direction]} ${className}`}
    >
      {paths[direction].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
```

## `frontend/src/components/Brand.jsx`

```jsx
/** The site wordmark. `onNavigate` lets the mobile menu close when it is clicked. */
export default function Brand({ onNavigate }) {
  return (
    <a
      className="inline-flex shrink-0 items-center gap-2.5"
      href="#home"
      aria-label="Pradeep Chavan — home"
      onClick={onNavigate}
    >
      {/* "PC" monogram: a compact accent tile with two centered, tightly
          tracked letters. The letters are drawn with generated content so the
          mark stays decorative and does not clash with the link's accessible
          name ("Pradeep Chavan — home"). */}
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center gap-px rounded-[11px] bg-accent text-[0.8rem] font-bold leading-none tracking-[-0.02em] text-white before:content-['P'] after:content-['C']"
      />
      <span className="text-sm font-semibold tracking-[-0.035em]">Pradeep Chavan</span>
    </a>
  );
}
```

## `frontend/src/components/Button.jsx`

```jsx
/** Link/button styling shared by the hero actions and the resume pill. */
const variants = {
  solid: 'bg-ink text-white hover:bg-accent active:bg-accent/85',
  outline:
    'border border-line-strong text-ink hover:border-accent hover:text-accent active:bg-accent-soft',
};

const sizes = {
  md: 'min-h-[47px] px-5 text-sm',
  sm: 'px-3.5 py-2.5 text-[0.84rem]',
};

export default function Button({
  href,
  variant = 'solid',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <a
      href={href}
      className={`group inline-flex max-w-full cursor-pointer items-center justify-center gap-1.5 rounded-full text-center font-semibold transition-ui ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}
```

## `frontend/src/components/Container.jsx`

```jsx
/** Shared max-width and responsive page padding for every section. */
export default function Container({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag
      className={`mx-auto w-full max-w-content px-5 sm:px-8 lg:px-12 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```

## `frontend/src/components/DownloadIcon.jsx`

```jsx
/**
 * Inline SVG download icon (tray + down arrow), matching the Arrow component's
 * 2px stroke. Inherits the button's text colour through `currentColor`, so it
 * never reads as a separate control.
 */
export default function DownloadIcon({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[1.05em] w-[1.05em] shrink-0 transition-transform group-hover:translate-y-0.5 ${className}`}
    >
      <path d="M12 15V3" />
      <path d="m7 10 5 5 5-5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  );
}
```

## `frontend/src/components/Navbar.jsx`

```jsx
import { useEffect, useRef, useState } from 'react';
import { profile } from '../data/portfolio.js';
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
```

## `frontend/src/components/ProjectArtwork.jsx`

```jsx
import { Fragment } from 'react';

/* Purpose-built illustrations, one per project.

   These are diagrams, not captures. None of the three is a screenshot, and none is
   presented as the running application: each panel states what it is in its own
   topline ("Illustrative workflow", "Illustrative diagram", "Illustrative flow"),
   and each panel is a single `role="img"` carrying one descriptive label, so a
   screen reader hears one sentence per project instead of a stream of decorative
   fragments.

   Nothing inside is a claim the project data does not already make. There are no
   figures, filenames, category names, model outputs, or metrics anywhere in these
   drawings - the shapes are blank, and the only words are the real stage names
   (Report / Prioritize / Resolve), the three status bands the API returns, the real
   automation steps, and the honest illustration label.

   Each panel is CSS boxes and inline SVG: no image file, no new dependency. Every
   palette is one family - pale tint, dark ink, one mid tone - and every text colour
   clears 4.5:1 against its own tint, which is what keeps the small labels legible.

   The three panels share one recipe: topline, middle, bottomline, with the middle
   carrying the height. That is deliberate. It makes the two supporting panels come
   out exactly the same height wherever they sit side by side, and it makes each
   drawing fill the width the layout hands it instead of sitting in a fixed frame.

   Below 480px every drawing switches from its wide arrangement to a stacked one -
   tickets and automation cards become full-width rows, and the connector arrows
   turn downward - because a three-up column at that width would break words. */

const panel =
  'relative isolate flex flex-col justify-between overflow-hidden rounded-2xl p-4 sm:p-5';
const topline =
  'flex flex-col gap-1 text-[0.6rem] font-bold uppercase tracking-[0.11em] xs:flex-row xs:items-center xs:justify-between xs:gap-2 sm:text-[0.63rem]';
const bottomline =
  'flex justify-between gap-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] sm:text-[0.62rem]';
const middle = 'relative my-4';

const glyphs = {
  report: <path d="M5 7h14M5 12h14M5 17h9" />,
  prioritize: (
    <>
      <path d="M6 21V5" />
      <path d="M6 5h11l-2.6 4L17 13H6" />
    </>
  ),
  resolve: <path d="m20 6-11 11-5-5" />,
  workbook: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 10h16M11 5v14" />
    </>
  ),
  summary: <path d="M6 16v3M12 11v8M18 6v13" />,
};

/** One consistent 2px-stroke glyph, matching the arrows elsewhere on the page. */
function Glyph({ name, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {glyphs[name]}
    </svg>
  );
}

/** A workflow connector: points right in the wide arrangement, down when stacked. */
function Connector({ className = '' }) {
  return (
    <span aria-hidden="true" className={`grid place-items-center ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5 rotate-90 xs:rotate-0 sm:size-4"
      >
        <path d="M5 12h13" />
        <path d="m12 6 6 6-6 6" />
      </svg>
    </span>
  );
}

/** The brand mark and the honest label that keeps a drawing from reading as a capture. */
function PanelTop({ name, note, className }) {
  return (
    <div className={`${topline} ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-[7px] rounded-[2px] bg-current" /> {name}
      </span>
      <span>{note}</span>
    </div>
  );
}

/* The three real stages of a HostelCare complaint, in order. The roles in the
   bottomline are the three the project description names. */
const hostelStages = [
  { number: '01', stage: 'Report', note: 'Submit a complaint', glyph: 'report', pip: 'bg-[#7564c7]/25' },
  { number: '02', stage: 'Prioritize', note: 'Route to the right team', glyph: 'prioritize', pip: 'bg-[#7564c7]/60' },
  { number: '03', stage: 'Resolve', note: 'Track progress', glyph: 'resolve', pip: 'bg-[#7564c7]' },
];

function HostelCareArtwork() {
  return (
    <div
      className={`${panel} bg-[#e9e5ff] text-[#302b51]`}
      role="img"
      aria-label="Illustration of the HostelCare complaint workflow: a student reports a complaint, an administrator prioritizes and routes it, and maintenance resolves it with tracked progress"
    >
      <PanelTop name="HostelCare" note="Illustrative workflow" className="text-[#5b5677]" />

      <div
        className={`${middle} grid grid-cols-1 gap-1.5 xs:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] xs:items-stretch`}
      >
        {hostelStages.map((item, index) => (
          <Fragment key={item.number}>
            {index > 0 && <Connector className="text-[#8d80d2]" />}

            <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#433977]/15 bg-white/70 px-3 py-2.5 xs:min-h-[132px] xs:flex-col xs:items-stretch xs:gap-0 xs:py-3 lg:min-h-[148px]">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#e6e0ff] text-[#5b46c0] sm:size-7">
                <Glyph name={item.glyph} className="size-3.5 sm:size-4" />
              </span>

              <div className="min-w-0 flex-1 xs:mt-2.5 xs:flex-none">
                <b className="block text-[0.8rem] font-semibold tracking-[-0.02em] sm:text-[0.85rem]">
                  {item.stage}
                </b>
                <small className="mt-1 hidden text-[0.6rem] leading-snug text-[#55516e] xs:block">
                  {item.note}
                </small>
              </div>

              <span className="ml-auto flex shrink-0 items-center gap-1.5 xs:order-first xs:ml-0 xs:justify-between">
                <span className="hidden text-[0.6rem] font-bold tracking-[0.08em] text-[#5b5677] xs:inline">
                  {item.number}
                </span>
                <i className={`size-[6px] rounded-full ${item.pip}`} />
              </span>
            </div>
          </Fragment>
        ))}
      </div>

      <div className={`${bottomline} text-[#5b5677]`}>
        <span>Student</span>
        <span>Admin</span>
        <span>Staff</span>
      </div>

      <span
        aria-hidden="true"
        className="absolute -right-32 top-8 -z-10 size-[360px] rounded-full border border-[#433977]/10"
      />
      <span
        aria-hidden="true"
        className="absolute -right-20 top-20 -z-10 size-[260px] rounded-full border border-[#433977]/10"
      />
    </div>
  );
}

/* AquaPredict: the eight water-quality measurements the model reads, the quantity it
   predicts, and the three status bands the API returns. No values and no plotted
   output - the scale names the bands and stops there. */
function AquaPredictArtwork() {
  const measurements = Array.from({ length: 8 }, (_, index) => index);

  return (
    <div
      className={`${panel} bg-[#e2f2ee] text-[#1d5c55]`}
      role="img"
      aria-label="Illustration for AquaPredict: eight water-quality measurements are read by a trained model, which returns an estimated biological oxygen demand and one of three status bands - safe, moderate, or polluted"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 600 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-20 w-full text-[#8fc9c0] opacity-25"
      >
        <path d="M0 58c70-26 118 8 190-6s132-34 214-16 132 30 196 24v60H0Z" fill="currentColor" />
        <path d="M0 86c84-22 132 4 214-10s150-20 386 6v38H0Z" fill="currentColor" />
      </svg>

      <PanelTop name="AquaPredict" note="Illustrative diagram" className="text-[#35564f]" />

      <div
        className={`${middle} grid grid-cols-1 items-center gap-4 xs:min-h-[132px] xs:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xs:gap-3 sm:gap-5 lg:min-h-[148px]`}
      >
        <div className="min-w-0">
          <span className="block text-[0.6rem] font-bold uppercase tracking-[0.11em] text-[#35564f]">
            Water sample
          </span>
          <strong className="mt-1 block text-[1.9rem] font-semibold leading-[0.9] tracking-[-0.08em] sm:text-[2.3rem]">
            BOD
          </strong>
          <span aria-hidden="true" className="mt-2.5 grid w-fit grid-cols-4 gap-1">
            {measurements.map((index) => (
              <i key={index} className="h-1.5 w-4 rounded-full bg-[#5fa79a]" />
            ))}
          </span>
          <small className="mt-2 block max-w-[190px] text-[0.6rem] leading-snug text-[#35564f]">
            Eight water-quality measurements
          </small>
        </div>

        <div className="min-w-0">
          <span className="block text-[0.6rem] font-bold uppercase tracking-[0.11em] text-[#35564f]">
            Status band
          </span>
          <span aria-hidden="true" className="mt-2 flex h-2.5 overflow-hidden rounded-full">
            <i className="flex-1 bg-[#8fd0c4]" />
            <i className="flex-1 bg-[#4f9a8d]" />
            <i className="flex-1 bg-[#2b6f66]" />
          </span>
          <span className="mt-1.5 flex justify-between gap-1 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[#35564f]">
            <span>Safe</span>
            <span>Moderate</span>
            <span>Polluted</span>
          </span>
          <small className="mt-2.5 block max-w-[200px] text-[0.6rem] leading-snug text-[#35564f]">
            The estimate comes back with one of these three bands
          </small>
        </div>
      </div>

      <div className={`${bottomline} text-[#35564f]`}>
        <span>Sample</span>
        <span>Model</span>
        <span>Estimate</span>
      </div>
    </div>
  );
}

/* RPA Expense Tracker: the real automation steps, with blank cells rather than
   invented figures or category names. */
function ExpenseArtwork() {
  const cells = Array.from({ length: 12 }, (_, index) => index);

  return (
    <div
      className={`${panel} bg-[#fbefd7] text-[#5b4216]`}
      role="img"
      aria-label="Illustration of the RPA expense tracker: expense rows in an Excel workbook are processed into a summary report, which is then emailed as an attachment"
    >
      <PanelTop name="Expense Tracker" note="Illustrative flow" className="text-[#6b5225]" />

      <div
        className={`${middle} grid grid-cols-1 gap-1.5 xs:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.05fr)] xs:items-stretch xs:gap-2 sm:gap-3`}
      >
        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#ddcda8] bg-[#fffef9]/80 p-2.5 xs:min-h-[132px] xs:flex-col xs:items-stretch xs:gap-0 xs:p-3 lg:min-h-[148px]">
          <span className="flex items-center gap-2">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-[#e3efe0] text-[#3d6b4f]">
              <Glyph name="workbook" className="size-3.5" />
            </span>
            <b className="min-w-0 text-[0.68rem] font-semibold tracking-[-0.01em]">Excel rows</b>
          </span>

          <span aria-hidden="true" className="mt-3 grid flex-1 grid-cols-4 content-start gap-[4px]">
            {cells.map((index) => (
              <i
                key={index}
                className={`h-3 rounded-[2px] border ${
                  index < 4
                    ? 'border-[#d3e2d3] bg-[#e3efe0]'
                    : index % 5 === 2
                      ? 'border-transparent bg-[#f2e6c9]'
                      : 'border-[#e3dbc8] bg-[#f4edde]'
                }`}
              />
            ))}
          </span>
        </div>

        <Connector className="text-[#b8974c]" />

        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#e7d8b8] bg-[#fffef9]/70 p-2.5 xs:min-h-[132px] xs:flex-col xs:items-stretch xs:gap-0 xs:p-3 lg:min-h-[148px]">
          <span className="flex items-center gap-2">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-[#f4e4bd] text-[#8a6a26]">
              <Glyph name="summary" className="size-3.5" />
            </span>
            <b className="min-w-0 text-[0.68rem] font-semibold tracking-[-0.01em]">Summary report</b>
          </span>

          <span aria-hidden="true" className="flex flex-1 items-center gap-2">
            <i className="my-2.5 hidden w-full border-t border-dashed border-[#ddcda8] xs:block" />
          </span>

          <span className="flex items-center gap-2">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-[#b88f3e] text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3"
                aria-hidden="true"
              >
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </span>
            <b className="min-w-0 text-[0.68rem] font-semibold tracking-[-0.01em]">Email delivery</b>
          </span>
        </div>
      </div>

      <div className={`${bottomline} text-[#6b5225]`}>
        <span>Process</span>
        <span>Summarize</span>
        <span>Send</span>
      </div>
    </div>
  );
}

/** Chooses the illustration named by the project data. */
export default function ProjectArtwork({ type }) {
  switch (type) {
    case 'hostelcare':
      return <HostelCareArtwork />;
    case 'aquapredict':
      return <AquaPredictArtwork />;
    case 'expense':
      return <ExpenseArtwork />;
    default:
      return null;
  }
}
```

## `frontend/src/components/ProjectEntry.jsx`

```jsx
import Arrow from './Arrow.jsx';
import Button from './Button.jsx';
import ProjectArtwork from './ProjectArtwork.jsx';
import TechnologyTags from './TechnologyTags.jsx';

/* The written half of an entry, in one place so the featured arrangement and the
   supporting arrangement cannot drift apart in wording, order, or spacing. */
function ProjectCopy({ project, featured = false }) {
  return (
    <>
      <p className="text-kicker font-bold uppercase tracking-[0.12em] text-subtle">
        <span className="text-accent">{project.number}</span>
        <span aria-hidden="true"> / </span>
        {project.category}
      </p>

      <h3
        className={`mt-2.5 font-medium leading-tight tracking-[-0.05em] ${
          featured ? 'text-title' : 'text-[clamp(1.3rem,1.9vw,1.65rem)]'
        }`}
      >
        {project.name}
      </h3>

      <p
        className={`mt-3 font-medium leading-snug text-ink ${
          featured ? 'text-[1.05rem] sm:text-[1.15rem]' : 'text-[0.98rem]'
        }`}
      >
        {project.summary}
      </p>

      <p className="mt-2.5 max-w-[600px] text-[0.95rem] leading-relaxed text-muted">
        {project.description}
      </p>

      <TechnologyTags
        items={project.technologies}
        label={`Technologies used in ${project.name}`}
      />

      {project.href && (
        <Button
          className="mt-6 self-start"
          href={project.href}
          size="sm"
          variant="outline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {project.linkLabel} <Arrow diagonal />
        </Button>
      )}
    </>
  );
}

/* One project in the showcase.

   Two arrangements share that copy. The featured project is a wide row: its panel
   on the left, the writing beside it and vertically centred against the panel. The
   supporting projects stack - panel above, writing below - so the pair reads as a
   smaller tier instead of three identical cards, and the panels there are narrow
   enough to sit side by side from 1024px up.

   The panel is an illustration, never a capture, so nothing here fakes an
   application screen: it is a drawing that names what it shows. */
export default function ProjectEntry({ project, featured = false, className = '' }) {
  if (featured) {
    return (
      <article
        className={`grid gap-6 border-t border-line pt-9 sm:pt-11 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch lg:gap-12 lg:pt-14 ${className}`}
      >
        <ProjectArtwork type={project.artwork} />

        <div className="flex min-w-0 flex-col justify-center">
          <ProjectCopy project={project} featured />
        </div>
      </article>
    );
  }

  return (
    <article className={`grid gap-5 sm:gap-6 ${className}`}>
      <ProjectArtwork type={project.artwork} />

      <div className="min-w-0">
        <ProjectCopy project={project} />
      </div>
    </article>
  );
}
```

## `frontend/src/components/TechnologyTags.jsx`

```jsx
/* One tag recipe for the whole page. The project technology lists and the About
   skills list render the same pill: same radius, border, type size, weight, and
   text colour. Keep new tag-like lists on this class rather than adding a second
   near-identical treatment. */
export const tagClass =
  'rounded-full border border-line bg-paper px-2.5 py-1.5 text-[0.7rem] font-semibold text-[#56564f]';

/** Reusable list of technologies shown beneath a project description. */
export default function TechnologyTags({ items = [], label = 'Technologies used' }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-5 flex flex-wrap gap-1.5" aria-label={label}>
      {items.map((item) => (
        <li key={item} className={tagClass}>
          {item}
        </li>
      ))}
    </ul>
  );
}
```

## `frontend/src/sections/About.jsx`

```jsx
import { profile, skillGroups } from '../data/portfolio.js';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';
import { tagClass } from '../components/TechnologyTags.jsx';

export default function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      tabIndex={-1}
      className="bg-sunken py-16 focus:outline-none sm:py-20 lg:py-28"
    >
      <Container className="grid gap-9 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-x-16 lg:gap-y-9">
        <div>
          <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
            A little about me
          </p>
          {/* The heading sits in a column that stops growing at the 1200px container
              width, so its size is capped to keep both sentences on one line each.
              Before, the clamp kept growing with the viewport and "Practical by
              design." broke after "by" from 1366px up. */}
          <h2
            id="about-title"
            className="mt-5 text-[clamp(2.15rem,4.6vw,3.9rem)] font-medium leading-none tracking-[-0.065em]"
          >
            Curious by nature.
            <br />
            <span className="text-accent">Practical by design.</span>
          </h2>
        </div>

        <div className="min-w-0">
          <p className="text-[clamp(1.08rem,1.65vw,1.35rem)] leading-relaxed tracking-[-0.02em]">
            I learn best by making things — figuring out how interfaces, backend systems,
            automation, and data-driven ideas come together.
          </p>
          <p className="mt-4 text-[0.92rem] leading-relaxed text-muted">
            I&rsquo;m building my foundations in software engineering while turning what I learn
            into projects. I care about clear problem-solving, maintainable code, and making
            software that is genuinely useful.
          </p>

          <p className="mt-6 flex items-start gap-2.5 border-t border-line-strong pt-5 text-[0.8rem] leading-relaxed text-muted">
            <Arrow diagonal className="mt-[3px] text-accent" />
            {profile.education}
          </p>

          <div className="mt-10">
            <h3 className="mb-4 text-[0.92rem] font-bold">Tools I work with</h3>
            <div className="border-t border-line-strong">
              {skillGroups.map((group, index) => {
                const labelId = `skill-group-${index}`;
                return (
                  <div
                    key={group.label}
                    className="grid gap-2 border-b border-line-strong py-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3.5"
                  >
                    <span id={labelId} className="pt-0.5 text-[0.74rem] text-subtle sm:pt-1">
                      {group.label}
                    </span>
                    <ul aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <li key={item} className={tagClass}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
```

## `frontend/src/sections/Contact.jsx`

```jsx
import { profile } from '../data/portfolio.js';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';

export default function Contact() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      tabIndex={-1}
      className="bg-night py-16 text-[#f9f8f4] focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <p className="text-kicker font-bold uppercase tracking-[0.14em] text-night-soft">
          Have something in mind?
        </p>
        <h2
          id="contact-title"
          className="mt-5 text-[clamp(3rem,7vw,6.4rem)] font-medium leading-[0.98] tracking-[-0.065em]"
        >
          Let&rsquo;s build something <span className="text-[#b8abff]">useful.</span>
        </h2>

        <div className="mt-8 flex flex-col gap-6 border-t border-white/15 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[420px] text-[0.92rem] leading-relaxed text-night-soft">
            I&rsquo;m always glad to connect about software, projects, and opportunities to learn by
            building.
          </p>
          <div className="flex flex-col gap-1.5">
            <a
              className="group inline-flex max-w-full items-center gap-1.5 text-[clamp(0.98rem,1.8vw,1.3rem)] font-medium transition-ui hover:text-[#c3b7ff] [overflow-wrap:anywhere]"
              href={`mailto:${profile.email}`}
            >
              {profile.email} <Arrow />
            </a>
            <p className="text-[0.8rem] text-night-soft/80">Based in {profile.location}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
```

## `frontend/src/sections/Footer.jsx`

```jsx
import { profile } from '../data/portfolio.js';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';

const socials = [
  { label: 'GitHub', href: profile.github },
  { label: 'LinkedIn', href: profile.linkedin },
  { label: 'LeetCode', href: profile.leetcode },
];

/** Footer holds the profile links and a small copyright line.
    The brand mark lives only in the header, so it is not repeated here. */
export default function Footer() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-6 sm:py-7">
        <p className="text-[0.78rem] text-muted">
          &copy; {new Date().getFullYear()} {profile.name}
        </p>

        <nav aria-label="Social links" className="flex flex-wrap gap-5">
          {socials.map((social) => (
            <a
              key={social.label}
              className="group inline-flex cursor-pointer items-center gap-1 text-[0.78rem] text-muted transition-ui hover:text-accent"
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {social.label} <Arrow diagonal />
            </a>
          ))}
        </nav>

        <a
          className="group ml-auto inline-flex cursor-pointer items-center gap-1 text-[0.78rem] text-muted transition-ui hover:text-accent sm:ml-0"
          href="#home"
        >
          Back to top <Arrow up />
        </a>
      </Container>
    </footer>
  );
}
```

## `frontend/src/sections/Hero.jsx`

```jsx
import { useEffect, useState } from 'react';
import { profile } from '../data/portfolio.js';
import Arrow from '../components/Arrow.jsx';
import Button from '../components/Button.jsx';
import Container from '../components/Container.jsx';

const greeting = "Hello, I'm Pradeep Chavan";
const TYPE_DELAY = 45;
const START_DELAY = 150;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function Hero() {
  const [typedGreeting, setTypedGreeting] = useState(() =>
    prefersReducedMotion() ? greeting : '',
  );
  const [isTyping, setIsTyping] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (motionQuery.matches) {
      setTypedGreeting(greeting);
      setIsTyping(false);
      return undefined;
    }

    let characterIndex = 0;
    let timerId;

    const typeNextCharacter = () => {
      characterIndex += 1;
      setTypedGreeting(greeting.slice(0, characterIndex));

      if (characterIndex < greeting.length) {
        timerId = window.setTimeout(typeNextCharacter, TYPE_DELAY);
      } else {
        setIsTyping(false);
      }
    };

    timerId = window.setTimeout(typeNextCharacter, START_DELAY);

    // If reduced motion is enabled mid-animation, reveal the greeting at once.
    function handleMotionChange(event) {
      if (event.matches) {
        window.clearTimeout(timerId);
        setTypedGreeting(greeting);
        setIsTyping(false);
      }
    }

    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.clearTimeout(timerId);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      tabIndex={-1}
      className="pt-14 pb-10 focus:outline-none sm:pt-20 sm:pb-14 lg:pt-24"
    >
      <Container>
        <p className="min-h-[1.6em] text-lg font-semibold tracking-[-0.02em] text-accent sm:text-xl">
          <span aria-hidden="true">
            {typedGreeting}
            {isTyping && (
              <span className="ml-0.5 inline-block h-[1.05em] w-px translate-y-[0.14em] bg-current align-baseline animate-blink motion-reduce:hidden" />
            )}
          </span>
          <span className="sr-only">{greeting}</span>
        </p>

        <h1
          id="hero-title"
          className="mt-6 max-w-[16ch] text-display font-medium leading-[0.98] tracking-[-0.075em] text-balance"
        >
          I build digital tools that <span className="text-accent">make work easier.</span>
        </h1>

        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <p className="max-w-[560px] text-base leading-relaxed text-muted sm:text-lg">
            {profile.intro}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button href="#work">
              Explore selected work <Arrow down />
            </Button>
            <Button
              href={profile.github}
              variant="outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub profile <Arrow diagonal />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
```

## `frontend/src/sections/Work.jsx`

```jsx
import { profile, projects } from '../data/portfolio.js';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';
import ProjectEntry from '../components/ProjectEntry.jsx';

export default function Work() {
  const featured = projects.find((project) => project.featured);
  const supportingProjects = projects.filter((project) => !project.featured);

  return (
    <section
      id="work"
      aria-labelledby="work-title"
      tabIndex={-1}
      className="py-16 focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <div className="mb-9 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-9">
          <div>
            <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
              A few things I&rsquo;ve built
            </p>
            <h2
              id="work-title"
              className="mt-3.5 text-headline font-medium leading-none tracking-[-0.06em]"
            >
              Selected work<span className="text-accent">.</span>
            </h2>
          </div>
          <p className="max-w-[350px] text-[0.92rem] leading-relaxed text-muted lg:mb-1">
            Web applications, workflow automation, and applied machine learning — each project
            starts with a problem worth solving.
          </p>
        </div>

        {featured && <ProjectEntry project={featured} featured />}

        <div className="mt-9 grid gap-y-9 border-t border-line pt-9 sm:mt-11 sm:gap-y-11 sm:pt-11 lg:mt-14 lg:grid-cols-2 lg:items-start lg:gap-x-12 lg:pt-14">
          {supportingProjects.map((project, index) => (
            <ProjectEntry
              key={project.id}
              project={project}
              className={index > 0 ? 'border-t border-line pt-9 sm:pt-11 lg:border-t-0 lg:pt-0' : ''}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 border-t border-line-strong pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[0.82rem] text-muted">
            More experiments and code live on GitHub.
          </span>
          <a
            className="group inline-flex items-center gap-1.5 text-[0.82rem] font-bold text-ink transition-ui hover:text-accent"
            href={profile.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            Browse GitHub <Arrow diagonal />
          </a>
        </div>
      </Container>
    </section>
  );
}
```

## `frontend/src/data/portfolio.js`

```js
export const profile = {
  name: 'Pradeep Chavan',
  email: 'chavanpradeep096@gmail.com',
  intro: 'I’m Pradeep, a Computer Science Engineering student who turns practical problems into full-stack applications, workflow automations, and data-driven tools.',
  location: 'Belgaum, Karnataka, India',
  github: 'https://github.com/Pradeep4002-C',
  linkedin: 'https://www.linkedin.com/in/pradeep-chavan-268329337/',
  leetcode: 'https://leetcode.com/u/Pradeep_Chavan/',
  // Files inside public/ are served from the site's base URL.
  resume: 'resume.pdf',
  education: 'Computer Science Engineering · K.L.S. Gogte Institute of Technology · 2023–2027',
};

/* Repository links match the hyperlinks in the supplied resume. Every summary,
   description, and technology list below was checked against that project's own
   public README; nothing here is estimated.

   `artwork` names the purpose-built illustration the showcase draws for that
   project. The illustrations are diagrams, not screenshots - none of these projects
   has a public deployment, so no demo link exists and none is invented, and no
   project ships an image file. */
export const projects = [
  {
    id: 'hostelcare',
    number: '01',
    category: 'Full-stack web app',
    name: 'HostelCare',
    summary: 'Hostel maintenance platform for reporting, triaging, and resolving room issues.',
    description:
      'Students raise complaints with optional image evidence, administrators triage and assign work with ML-assisted priority suggestions, and maintenance staff update progress with completion proof.',
    technologies: ['React', 'Node.js', 'Express', 'MongoDB'],
    href: 'https://github.com/Pradeep4002-C/hostel-management-system',
    linkLabel: 'View source',
    artwork: 'hostelcare',
    featured: true,
  },
  {
    id: 'aquapredict',
    number: '02',
    category: 'Applied machine learning',
    name: 'AquaPredict',
    summary: 'Dashboard that predicts wastewater BOD from eight water-quality measurements.',
    description:
      'A Flask API loads a saved scikit-learn HistGradientBoostingRegressor and returns an estimated biological oxygen demand with a safe, moderate, or polluted status band.',
    technologies: ['Python', 'Flask', 'scikit-learn', 'React'],
    href: 'https://github.com/Pradeep4002-C/AquaPredict-BOD-Monitoring-System',
    linkLabel: 'View source',
    artwork: 'aquapredict',
  },
  {
    id: 'expense-tracker',
    number: '03',
    category: 'Workflow automation',
    name: 'RPA Expense Tracker',
    summary: 'UiPath automation that turns Excel expense data into summary reports and email.',
    description:
      'The workflow reads expense rows from Excel, processes and categorizes them, generates a summary report, and emails the formatted report as an attachment.',
    technologies: ['UiPath', 'Excel', 'Email automation'],
    href: 'https://github.com/Pradeep4002-C/rpa-expense-tracker',
    linkLabel: 'View source',
    artwork: 'expense',
  },
];

export const skillGroups = [
  { label: 'Languages', items: ['C', 'C++', 'JavaScript', 'Python', 'SQL', 'HTML', 'CSS'] },
  { label: 'Frameworks', items: ['React', 'Node.js', 'Express.js', 'Flask', 'EJS'] },
  { label: 'Databases', items: ['MongoDB', 'MySQL'] },
  { label: 'Tools', items: ['VS Code', 'Git', 'GitHub', 'MongoDB Compass', 'UiPath', 'Excel'] },
];
```

## `frontend/docs/design-notes.md`

```markdown
# Portfolio design notes

## Direction

This is a developer portfolio, not a web version of the full resume. The resume supplies facts and repository links; the page structure is designed around selected work.

## References

- **Squarespace portfolio examples:** restrained typography, deliberate whitespace, and giving the work room to lead.
- **Hostinger portfolio guidance:** a clear Home/Work, About, and Contact flow that remains easy to use on smaller screens.
- **Developer portfolio reference:** a human introduction followed by project work and contact.

These references guide principles only. The implementation is original.

## Information hierarchy

1. A personal greeting that types itself once, a statement of what is built, and a direct route to selected work.
2. One featured project and two supporting projects, presented as a two-tier gallery rather than three identical cards.
3. A compact About section and grouped technical skills.
4. One clear contact section, closing with the location as a small secondary line.

Detailed grades, awards, and certifications remain in the downloadable resume so the main page does not become a CV.

## Hero decisions

- The greeting is `Hello, I'm Pradeep Chavan`, revealed character by character at roughly one character per 45ms after a short pause.
- The cursor blinks only while typing and disappears when the greeting is complete. The greeting is never erased or retyped.
- The completed greeting stays visible, and a screen-reader-only copy always contains the full text.
- With `prefers-reduced-motion: reduce` the greeting is rendered complete immediately, with no cursor. Enabling the setting mid-animation completes it instantly.
- There is no category or eyebrow label above the greeting, and no violet dot.
- The hero counts on typography, spacing, and alignment. There are no decorative shapes, floating elements, or profile images.

## Visual system

- Warm paper background, off-white surfaces, near-black ink, one violet accent, and a single dark contact band.
- Headings use fluid `clamp()` sizes with tight negative tracking; body text stays at comfortable reading lengths.
- Content is capped at a 1200px container so the page does not stretch on ultrawide screens.
- Every text colour on the paper and sunken backgrounds clears 4.5:1 contrast.

## Project showcase

The showcase pairs each project with a purpose-built illustration and keeps the writing beside it. The drawings are diagrams, not captures: each panel prints what it is in its own topline ("Illustrative workflow", "Illustrative diagram", "Illustrative flow"), each panel is a single `role="img"` with one descriptive label, and no drawing contains a figure, filename, category name, model output, or metric — only the real stage names, the three status bands the API returns, and the real automation steps. No panel imitates an application window.

The screenshots an earlier revision framed are gone for good. At the sizes that layout could give them those previews were too small and too heavily cropped to read, and enlarging a low-resolution screenshot or substituting a stock image would have been worse than showing nothing, so the covers and the two screenshot files were deleted rather than patched. Nothing image-shaped replaced them: the section renders zero `<img>` elements at every measured width, and every pixel of the drawings is CSS boxes and inline SVG.

The two tiers survive as one gallery. HostelCare leads as the featured project, with its panel beside the copy; AquaPredict and RPA Expense Tracker follow one type step down with the panel above the copy, and from 1024px up those two sit side by side. Each of the three panels shares one recipe — topline, middle, bottomline, with the middle carrying the height — which is what makes the two supporting panels exactly the same height wherever they share a row. Every palette is one family (a pale tint, a dark ink, one mid tone) and every text colour clears 4.5:1 against its own tint. Below 480px each drawing switches from its wide arrangement to a stacked one, with the connector arrows turned downward, because a three-up column at that width breaks words.

Project summaries, descriptions, and technology lists were checked against each repository's README, and repository links are sourced from the resume (all three resolve). Nothing is invented: none of the three projects has a live deployment, so there is no demo link and no "Live demo" button — the repository link is the only action on an entry.

All interface icons are inline SVG rather than emoji or text arrows. The resume button is labelled "Download resume" and downloads the real PDF. The header brand is a "PC" monogram beside the name.

## Interaction decisions

- Navigation is anchor-based because this is a single-page site.
- Desktop nav links share one interaction model: muted text with no underline at rest, the accent colour plus a 1px accent underline that grows from the left on hover or keyboard focus, and — for the current section — full-contrast text with that underline kept visible. The underline is an absolutely positioned pseudo-element, so it never shifts the text or the navbar.
- The current section is tracked with an `IntersectionObserver` watching a thin reading band placed midway between the sticky header (height measured at runtime) and the bottom of the viewport. The topmost section overlapping the band wins, so the handoff at each boundary is deterministic rather than flickering, and the short final section still becomes active when the page is scrolled to the end. Clicking a link still navigates normally; the observer itself never rewrites the URL. The band is measured in pixels, so a resize rebuilds the observer; that rebuild is debounced, because resize fires continuously while a window or mobile URL bar is moving.
- Colour feedback on interactive elements is animated by one `transition-ui` utility instead of Tailwind's built-in colour transition utility, which also transitions `outline-color` and would make the keyboard focus ring fade in from the element's own colour; leaving it out means the ring reaches full contrast on the first frame.
- The mobile menu closes on navigation, Escape, and when resized to desktop. Escape returns focus to the toggle button. Mobile has no underline to reuse, so the active section is marked by full-contrast text, an accent divider on its row, and `aria-current`.
- The skip link and every in-page nav link land focus on the section they point at: `<main>` and the four sections carry `tabindex="-1"`, so fragment navigation moves focus to the destination instead of leaving it on a link inside a menu that is about to be hidden. The focus ring is suppressed on those container targets, where the scroll itself is the visible cue. Starting a resume download from the open mobile menu returns focus to the toggle instead.
- Project entries use one repository link action to avoid duplicated controls, and the entry itself is not clickable, so the entry and its link cannot disagree about what a click does. Nothing inside an illustration is interactive either, so a drawing never invites a click.
- The showcase contains no image file and nothing that could be mistaken for an application screen: `#work` renders zero `<img>` elements at every width, and the inline SVG it does contain belongs to the drawings (arrows, waves, workflow connectors, small glyphs) plus the arrow inside each repository link. Every drawing hangs off an `aria-hidden` element or a presentational panel, so the accessible tree holds one image node per project.
- The only movement in the showcase is the arrow inside a repository link, which shifts 2px on hover through a transform. The global reduced-motion guard collapses that transition, so it never animates for a visitor who has asked for reduced motion. A repository action keeps a 123x42px target at every measured width.
- The contact section uses a single visible email action rather than two competing buttons.

## Styling approach

Tailwind CSS v4 is the styling system. Design tokens are declared once in the `@theme` block in `src/index.css`, which keeps repeated values honest and turns them into utilities. The global stylesheet holds only the Tailwind import, the tokens, a short base layer, one small `transition-ui` utility, and the reduced-motion guard, so there is no second hand-written design system to keep in sync.
```

## `frontend/docs/structure-guide.md`

````markdown
# Folder and file guide

This is a small React + Vite + Tailwind CSS v4 frontend. The structure separates content, reusable UI pieces, page sections, and design tokens so changes are easier to understand.

## Project tree

```text
frontend/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── public/
│   ├── favicon.svg
│   ├── resume.pdf
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── Arrow.jsx
│   │   ├── Brand.jsx
│   │   ├── Button.jsx
│   │   ├── Container.jsx
│   │   ├── DownloadIcon.jsx
│   │   ├── Navbar.jsx
│   │   ├── ProjectArtwork.jsx
│   │   ├── ProjectEntry.jsx
│   │   └── TechnologyTags.jsx
│   ├── data/
│   │   └── portfolio.js
│   ├── sections/
│   │   ├── About.jsx
│   │   ├── Contact.jsx
│   │   ├── Footer.jsx
│   │   ├── Hero.jsx
│   │   └── Work.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── docs/
    ├── code-review.md
    ├── design-notes.md
    └── structure-guide.md
```

## Files at the `frontend/` root

- **`package.json`** — lists the React/Vite/Tailwind dependencies and commands. Run npm commands from this folder.
- **`vite.config.js`** — registers Vite's React plugin and the `@tailwindcss/vite` plugin.
- **`index.html`** — the browser document, page metadata, favicon link, and `#root` mount point for React.
- **`public/`** — static files served as-is: `resume.pdf`, `favicon.svg`, and `robots.txt`.

## `src/`: application source

- **`main.jsx`** — the entry point. It checks for the `#root` element, renders the app with React `StrictMode`, and imports the global stylesheet.
- **`App.jsx`** — composes the page sections and holds the skip link. `<main>` carries `tabindex="-1"` so the skip link moves focus into the content instead of only scrolling. Keep this file focused on page order rather than putting every detail here.
- **`index.css`** — the whole global stylesheet. It contains only the Tailwind import, the `@theme` design tokens, a short `@layer base` block, the `transition-ui` utility, and the reduced-motion guard.

### `src/components/`: reusable building blocks

- **`Container.jsx`** — the shared max-width and responsive page padding used by every section.
- **`Button.jsx`** — the link styled as a button, with `solid`/`outline` variants and `md`/`sm` sizes.
- **`Arrow.jsx`** — the one consistent arrow shape (inline SVG, not a text glyph), used across buttons and links. It inherits the surrounding text colour and nudges on its `group` parent's hover.
- **`DownloadIcon.jsx`** — the inline SVG download icon used by the resume button, matching `Arrow`'s 2px stroke.
- **`Brand.jsx`** — the portfolio wordmark, used only in the sticky header (the footer deliberately does not repeat it). The "PC" monogram is drawn with generated content so the mark stays decorative and never clashes with the link's accessible name.
- **`Navbar.jsx`** — desktop/mobile navigation with the resume link, the shared hover/focus underline, `aria-current` active state driven by an `IntersectionObserver` reading band, Escape-to-close, resize handling, and menu state. It also restores deep links (`/#about`): the browser looks for the fragment before React has rendered the section, so after mount the matching target is scrolled into view with `scroll-padding-top` still applied.
- **`ProjectArtwork.jsx`** — the purpose-built illustration for a project, selected by the `artwork` field in the data: a report → prioritize → resolve complaint workflow (HostelCare), the eight water-quality measurements and the three status bands the API returns (AquaPredict), and the Excel → summary report → email flow (RPA Expense Tracker). Each panel is one `role="img"` with a descriptive label, prints what it is in its topline so it can never read as a capture, and is built from CSS boxes and inline SVG — no image file and no new dependency. Every palette clears 4.5:1 on its own tint. Below 480px each drawing switches from its wide arrangement to a stacked one.
- **`ProjectEntry.jsx`** — one project in the gallery: the illustration and the writing, in one of two arrangements. `featured` places the panel beside the copy in a wide row that stretches both halves to one height from 1024px up; a supporting entry stacks the panel above the copy. Both arrangements render the same copy block — numbered index and category, title, one-line summary, detail, technology list, and a single repository action — so the two cannot drift apart. Entries are separated by a hairline rule, not boxed into a card.
- **`TechnologyTags.jsx`** — reusable list for a project's tech stack.

### `src/sections/`: large page regions

- **`Hero.jsx`** — the typewriter greeting, the main statement, and links into the portfolio.
- **`Work.jsx`** — the two-tier gallery: it picks the project flagged `featured` and renders it as the wide leading row, then renders the remaining projects one type step down in a two-column tier from 1024px up (a single column below). Rows are divided by hairline rules rather than boxed into cards, and the section closes with a line to the GitHub profile.
- **`About.jsx`** — a brief bio, education line, and skill groups.
- **`Contact.jsx`** — a single clear email action plus the location line; there is no pretend contact form.
- **`Footer.jsx`** — copyright line, profile links, and a link back to the top of the page.

### `src/data/`: content, not layout

- **`portfolio.js`** — profile details, verified-from-resume project repository URLs, project summaries/descriptions, technology tags, the `artwork` key that names each project's illustration, and skill groups. A project has no image field: it names a drawing, and the drawing itself lives in `ProjectArtwork.jsx`. Change this file to update content without editing the JSX structure.

## Styling rules

1. Style with Tailwind utility classes in the component's `className`.
2. Add a new color, font size, container width, or breakpoint to the `@theme` block in `src/index.css` rather than hard-coding it in several places.
3. Only reach for `src/index.css` when something cannot be expressed as a utility (currently: tokens, base element styles, the `transition-ui` utility, and the reduced-motion guard).
4. Do not create one CSS file per component, and do not reintroduce a large hand-written stylesheet.

## A useful mental model

- **Data says what to show.** Example: project name, summary, description, technologies, and link in `data/portfolio.js`.
- **Components say how a reusable piece works.** Example: a `ProjectEntry` renders any project object.
- **Sections say where page content belongs.** Example: `Work.jsx` arranges the featured and supporting projects.
- **Tokens say what the design values are.** Example: `--color-accent` in `index.css` powers every `text-accent`, `bg-accent`, and `border-accent`.

## Safe workflow for a content change

1. Update `src/data/portfolio.js`.
2. Save and inspect the browser.
3. Check the browser console.
4. Run `npm run build` before sharing/deploying.

## Safe workflow for a component or style change

1. Find the relevant component under `src/components/` or section under `src/sections/`.
2. Change its Tailwind classes in place. Prefer adjusting the shared token when the same value repeats.
3. Check desktop and mobile widths.
4. Run `npm run build`.
````

## `frontend/docs/code-review.md`

```markdown
# Frontend code review

> **Historical note.** This report covers an earlier React + hand-written-CSS phase of the project. That single `src/styles.css` design system has since been replaced by Tailwind CSS v4, configured through `@tailwindcss/vite` with tokens in the `@theme` block of `src/index.css`. References to `styles.css` below describe the state at the time of that review. The project covers were changed again later: AquaPredict and RPA Expense Tracker then showed genuine screenshots taken from their own public repositories, so `ProjectArtwork.jsx` held only the HostelCare illustration and `ProjectCover.jsx` chose between a screenshot and an illustration. Statements below about "three illustrative artwork components" describe the reviewed revision, not the current one. The supporting tier of the same gallery was changed again after that: AquaPredict and RPA Expense Tracker became full-width rows rather than a two-up grid. Finally the screenshots were dropped altogether — they could not be shown at a readable size — and the showcase was rebuilt around purpose-built illustrations: `ProjectCard.jsx` and `ProjectCover.jsx` are deleted, `ProjectEntry.jsx` renders each project, the `cover` field is gone from the data, and `ProjectArtwork.jsx` was re-created to hold one labelled CSS/SVG diagram per project. Any statement below about a grid of project cards, framing or cropping, screenshot ratios, or how a cover image was fitted to its frame describes the reviewed revision only.

## Scope

Reviewed the React/Vite source files, content data, stylesheet, public assets, and project documentation. The review focused on maintainability, inaccurate/contradictory project data, navigation behavior, accessibility basics, responsive rules, and reducing duplicate UI actions.

## Changes made

### Application structure

- Split the original large `App.jsx` into `components/` and `sections/` so each file has a clearer responsibility. `App.jsx` now only defines page order and the skip link.
- Kept project content in `src/data/portfolio.js`, styling in `src/styles.css`, and static assets under `public/`.

### Functionality and correctness

- Added a guard in `main.jsx` so a missing `#root` mount element gives a readable error.
- Made the resume path respect Vite's `BASE_URL` and used Vite's `%BASE_URL%` token for the favicon path.
- Improved mobile menu behavior: Escape closes it and restores focus to the toggle; selecting a link closes it; resizing to desktop closes it. Removed unnecessary body scroll locking that could leave the page locked if the viewport changed.
- Added `rel="noopener noreferrer"` to links opening a new tab.
- Corrected the artwork mapper so each project gets its matching illustration; unknown artwork types do not silently show the expense illustration.
- Used a unique ID for AquaPredict's SVG gradient so multiple copies of the artwork would not share the same SVG ID.
- Added the RPA Expense Tracker repository link from the hyperlink embedded in the supplied resume. The former data/comment said no verified project link existed; that was inconsistent with the resume.
- Consolidated duplicate project repository actions into one clear text link and removed the duplicate circular email action from Contact.
- Filled in `VS Code` and `MongoDB Compass` within the skill groups to match the resume's tools section.
- Kept the email as `chavanpradeep096@gmail.com` and construct its `mailto:` URL from the address text, instead of copying the resume PDF's malformed `mailto:mailto...` hyperlink target.

### Visual and maintainability improvements

- Made CSS readable with one declaration per line and section comments.
- Darkened the small muted label color for improved text contrast.
- Added a beginner-friendly structure guide and updated the README.

## Files reviewed

- `package.json`: parsed successfully; dependencies kept stable and Node >=18 requirement documented.
- `vite.config.js`: standard React plugin configuration; no unnecessary build configuration added.
- `index.html`: metadata, title, favicon path, root element, and entry point checked.
- `src/main.jsx`: React entry point and root element check.
- `src/App.jsx`: page composition only.
- `src/components/Arrow.jsx`: shared decorative arrow.
- `src/components/Brand.jsx`: reusable site wordmark.
- `src/components/Navbar.jsx`: navigation, mobile state, Escape, resize, focus, and resume link.
- `src/components/ProjectArtwork.jsx`: the three illustrative artwork components and SVG gradient.
- `src/components/ProjectCard.jsx`: project content and one repository action.
- `src/components/TechnologyTags.jsx`: reusable technology list.
- `src/sections/Hero.jsx`: title and primary calls to action.
- `src/sections/Work.jsx`: featured and supporting projects.
- `src/sections/About.jsx`: short bio and grouped toolkit.
- `src/sections/Contact.jsx`: single email action.
- `src/sections/Footer.jsx`: profile navigation links.
- `src/data/portfolio.js`: profile, education, project descriptions, links, technologies.
- `src/styles.css`: design tokens, component layouts, responsive breakpoints, focus and reduced-motion styles.
- `public/favicon.svg`: syntax/structure checked.
- `public/resume.pdf`: retained from the supplied resume.
- `README.md`, `docs/design-notes.md`, and `docs/structure-guide.md`: updated to match the actual code.

## Validation performed

- JavaScript syntax checks passed for `src/data/portfolio.js` and `vite.config.js`.
- TypeScript's JSX parser/transpiler reported no JSX syntax errors for all `.jsx` and `.js` source files; generated syntax was parsed.
- All local source imports were checked to ensure their target files exist.
- `styles.css` parsed with PostCSS.
- `package.json` parsed as valid JSON.
- `index.html` parsed with Python's standard HTML parser.
- All in-page anchor references (`#home`, `#work`, `#about`, `#contact`, `#main-content`) have matching IDs.
- Every project artwork type in data has a matching renderer.
- Required public files `favicon.svg` and `resume.pdf` exist.
- Project repository URL destinations were compared against hyperlinks embedded in the supplied resume.

## Limitations

The network/DNS environment was unavailable and `npm install` timed out. Therefore, a real Vite production build and live browser interaction test could not be completed here. The user should run `npm install`, `npm run dev`, and `npm run build` on their machine and verify that the external links open. This report does not claim that those unrun checks passed.
```

## `frontend/public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#6c55e8"/>
  <path d="M19 45V19h7v4c2-3 5-5 9-5 8 0 13 6 13 14s-5 14-13 14c-4 0-7-2-9-5v4h-7Zm14-6c5 0 8-3 8-8s-3-8-8-8-8 3-8 8 3 8 8 8Z" fill="#fff"/>
</svg>
```
