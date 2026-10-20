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
├── tests/
│   └── contact-api.test.js
├── src/
│   ├── api/
│   │   ├── client.js
│   │   ├── contact.js
│   │   └── portfolio.js
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
- **`App.jsx`** — composes the page sections, wraps them in `PortfolioProvider`, and holds the skip link. `<main>` carries `tabindex="-1"` so the skip link moves focus into the content instead of only scrolling. Keep this file focused on page order rather than putting every detail here.
- **`PortfolioContext.jsx`** — initialises content from `data/portfolio.js`, fetches `/api/portfolio` once after mount, aborts the request on unmount, ignores late responses, and exposes `profile`, `projects`, and `skillGroups` through `usePortfolio()`. Sections never import the API directly.
- **`index.css`** — the whole global stylesheet. It contains only the Tailwind import, the `@theme` design tokens, a short `@layer base` block, the `transition-ui` utility, and the reduced-motion guard.

### `src/api/`: the public API boundary

- **`client.js`** — minimal same-origin JSON client. It uses relative `/api` paths, parses JSON safely, normalises network/non-2xx failures into `ApiError` (including safe field messages), preserves abort errors, and never renders a server stack trace.
- **`portfolio.js`** — fetches `/api/portfolio`, validates and normalises the payload into the shapes the existing components already expect, and applies the bundled fallback rules for empty or invalid fields.
- **`contact.js`** — posts `/api/contact` through the shared client and requires a human-readable confirmation in the response; a malformed success response is treated as an error so the form cannot show a false success.

### `src/components/`: reusable building blocks

- **`Container.jsx`** — the shared max-width and responsive page padding used by every section.
- **`Button.jsx`** — shared pill styling for links and real buttons, with `solid`/`outline`/`light` variants and `md`/`sm` sizes. An `href` renders an anchor; without one it renders a `button`, so the contact submit control reuses the same target and focus treatment.
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
- **`Contact.jsx`** — the contact heading and direct email link plus an accessible form for name, email, optional subject, and message. It keeps values on failure, clears them only after the API confirms a save, disables the button and guards against double requests while submitting, and exposes progress in a polite live region. The honeypot is off-screen, `aria-hidden`, and outside the tab order.
- **`Footer.jsx`** — copyright line, profile links, and a link back to the top of the page.

### `src/data/`: fallback content, not runtime layout

- **`portfolio.js`** — profile details, verified-from-resume project repository URLs, project summaries/descriptions, technology tags, the `artwork` key that names each project's illustration, and skill groups. It is rendered immediately as the offline fallback and is also imported directly by the server seed script. Once the API responds, non-empty valid database fields replace their bundled counterparts. A project has no image field: it names a drawing, and the drawing itself lives in `ProjectArtwork.jsx`.

## Styling rules

1. Style with Tailwind utility classes in the component's `className`.
2. Add a new color, font size, container width, or breakpoint to the `@theme` block in `src/index.css` rather than hard-coding it in several places.
3. Only reach for `src/index.css` when something cannot be expressed as a utility (currently: tokens, base element styles, the `transition-ui` utility, and the reduced-motion guard).
4. Do not create one CSS file per component, and do not reintroduce a large hand-written stylesheet.

## A useful mental model

- **Data says what to show.** Runtime content arrives from `GET /api/portfolio` through `PortfolioContext`; `data/portfolio.js` supplies the immediate fallback and the seed source.
- **Components say how a reusable piece works.** Example: a `ProjectEntry` renders any project object.
- **Sections say where page content belongs.** Example: `Work.jsx` arranges the featured and supporting projects.
- **Tokens say what the design values are.** Example: `--color-accent` in `index.css` powers every `text-accent`, `bg-accent`, and `border-accent`.

## Safe workflow for a content change

1. For the bundled/offline content and seed source, update `src/data/portfolio.js`.
2. Run `npm run seed:content` from the repository root to create newly added records; existing database records are not overwritten.
3. With the API running, check that the database-backed page still renders correctly; without it, check that the fallback still renders.
4. Check the browser console and network response.
5. Run `npm test` and `npm run build` before sharing/deploying.

## Safe workflow for a component or style change

1. Find the relevant component under `src/components/` or section under `src/sections/`.
2. Change its Tailwind classes in place. Prefer adjusting the shared token when the same value repeats.
3. Check desktop and mobile widths.
4. Run `npm run build`.
