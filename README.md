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
