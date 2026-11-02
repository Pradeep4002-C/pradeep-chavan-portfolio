# Folder and file guide

This is a React + Vite + Tailwind CSS v4 frontend with a public portfolio and a
lazy-loaded administrator dashboard. The structure separates public content,
administrator code, reusable UI, and design tokens so each file has a clear
ownership boundary.

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
│   ├── admin-api.test.js
│   ├── admin-content-api.test.js
│   ├── background-content.test.js
│   ├── contact-api.test.js
│   ├── portfolio-content.test.js
│   ├── project-form.test.js
│   ├── resource-form.test.js
│   ├── workflow-render.test.js
│   └── workflow.test.js
├── src/
│   ├── admin/
│   │   ├── AdminRoot.jsx
│   │   ├── AdminAuthContext.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── AdminLayout.jsx
│   │   ├── AdminLoginPage.jsx
│   │   ├── AdminOverviewPage.jsx
│   │   ├── AdminProjectsPage.jsx
│   │   ├── ProjectEditorPage.jsx
│   │   ├── WorkflowStepBuilder.jsx
│   │   ├── AdminMessagesPage.jsx
│   │   ├── AdminProfilePage.jsx
│   │   ├── AdminSkillsPage.jsx
│   │   ├── AdminEducationPage.jsx
│   │   ├── AdminCertificationsPage.jsx
│   │   ├── AdminAchievementsPage.jsx
│   │   ├── ResourceManager.jsx
│   │   ├── resourceConfigs.js
│   │   ├── resourceForm.js
│   │   ├── AdminUi.jsx
│   │   ├── dialogFocus.js
│   │   ├── adminApi.js
│   │   └── projectForm.js
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
│   │   ├── Background.jsx
│   │   ├── backgroundContent.js
│   │   ├── Contact.jsx
│   │   ├── Footer.jsx
│   │   ├── Hero.jsx
│   │   └── Work.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── docs/
    ├── design-notes.md
    └── structure-guide.md
```

## Files at the `frontend/` root

- **`package.json`** — the `pradeep-portfolio-frontend` package. Run npm
  commands from this folder or use the root aliases.
- **`vite.config.js`** — registers the React and Tailwind Vite plugins and
  proxies `/api` to the local Express server.
- **`index.html`** — the browser document, metadata, favicon link, and `#root`
  mount point.
- **`public/`** — files served as-is: the resume PDF, favicon, and
  `robots.txt`.

## `src/`: application source

- **`main.jsx`** — checks for `#root`, renders React in `StrictMode`, and
  chooses the public app or the lazily imported administrator app from the URL.
  The admin code is a separate bundle that a public visitor does not download.
- **`App.jsx`** — page order, skip link, and the `PortfolioProvider`.
- **`PortfolioContext.jsx`** — exposes `profile`, `projects`, `skillGroups`,
  the background collections, and a `status` value (`loading`, `ready`, or
  `unavailable`). The approved profile copy may render immediately, but
  projects and skills remain empty until `GET /api/portfolio` confirms their
  current database state. A failed request does not restore bundled records.
- **`index.css`** — Tailwind import, `@theme` tokens, base layer,
  `transition-ui`, and the reduced-motion guard.

### `src/api/`: public API boundary

- **`client.js`** — same-origin JSON client. It parses safely, normalizes
  network and non-2xx failures, preserves abort errors, and never renders a
  server stack trace.
- **`portfolio.js`** — fetches and normalizes `/api/portfolio`. It maps profile
  fields and converts background records into render-ready values, dropping
  malformed records and out-of-range years. Projects and skills are
  database-authoritative: empty or malformed collections stay empty. The
  exported `EMPTY_PORTFOLIO` is the safe loading state with no projects or
  skills.
- **`contact.js`** — posts to `/api/contact` and treats a malformed success
  response as an error so the form cannot claim a false success.

### `src/admin/`: administrator application

This folder is the whole `/admin` area. It is imported lazily from `main.jsx`,
reuses the shared design tokens and `Button`, and introduces no second UI
framework.

- **`AdminRoot.jsx`** — the data router and route tree. It renders
  `AdminAuthProvider`, keeps `/admin/login` public, and puts every other page
  behind `ProtectedRoute` and `AdminLayout`. Project editor routes are
  `/admin/projects/new` and `/admin/projects/:id/edit`. Unknown `/admin/*`
  paths redirect to `/admin`.
- **`AdminAuthContext.jsx`** — the session state machine (`loading`,
  `authenticated`, `unauthenticated`, `error`). It initializes from
  `GET /api/auth/me` and exposes `login`, `logout`, and `markUnauthenticated`.
- **`ProtectedRoute.jsx`** — waits for the session check, redirects
  unauthenticated visitors to `/admin/login`, and offers a retry on errors. It
  never flashes protected content.
- **`AdminLayout.jsx`** — responsive shell with a desktop sidebar, a mobile
  disclosure menu, navigation, identity, and sign-out. Escape closes the mobile
  menu and returns focus to its toggle; selecting a link closes it without
  stealing focus back.
- **`AdminLoginPage.jsx`** — labeled email/password form with show/hide
  password, distinct unreachable/server messaging, and a generic bad-credentials
  message.
- **`AdminOverviewPage.jsx`** — aggregate counts from `/api/admin/overview`.
- **`AdminProjectsPage.jsx`** — project table/cards with refresh, create,
  edit, publish/unpublish, and confirmed delete. Create and edit navigate to the
  dedicated editor page instead of opening a modal.
- **`ProjectEditorPage.jsx`** — full-page project editor with a breadcrumb,
  visible heading, normal document scrolling, server field errors mapped back to
  inputs, a sticky save/cancel bar, and a data-router blocker that prevents
  unsaved edits from being discarded silently.
- **`WorkflowStepBuilder.jsx`** — add, edit, remove, and reorder two to ten
  workflow steps, choose a controlled step type, and see the same public
  renderer in a live preview.
- **`AdminMessagesPage.jsx`** — inbox with filters, pagination, expandable
  bodies, read toggles, and confirmed delete.
- **`AdminProfilePage.jsx`** — profile editor with a list of biography
  paragraphs.
- **`ResourceManager.jsx`** — shared list/create/edit/delete/reorder UI for
  ordered collections.
- **`resourceConfigs.js`** — field descriptors, labels, empty-state copy, and
  summary renderers for skills, education, certifications, and achievements.
- **`resourceForm.js`** — pure record/payload/list parsing and validation
  helpers.
- **`AdminSkillsPage.jsx`**, **`AdminEducationPage.jsx`**,
  **`AdminCertificationsPage.jsx`**, **`AdminAchievementsPage.jsx`** — thin
  wrappers around `ResourceManager`.
- **`AdminUi.jsx`** — shared controls, notices, field styles, dialog, confirm
  dialog, pagination, and loading/error/empty states.
- **`dialogFocus.js`** — shared modal focus lifecycle: remembers the opener,
  focuses the dialog, traps Tab/Shift+Tab, makes the background inert, supports
  Escape, and restores focus only when the opener still exists.
- **`adminApi.js`** — typed wrappers over the shared client for overview,
  project, inbox, collection, and profile endpoints, with response validation.
- **`projectForm.js`** — pure project values, slug generation, technology
  parsing, client-side validation, workflow-step helpers, and API payload
  construction. The server validates every value again.

### `src/components/`: reusable public building blocks

- **`Container.jsx`** — shared max width and responsive page padding.
- **`Button.jsx`** — shared pill styles for links and buttons.
- **`Arrow.jsx`** and **`DownloadIcon.jsx`** — inline SVG interface icons.
- **`Brand.jsx`** — the portfolio wordmark.
- **`Navbar.jsx`** — desktop/mobile public navigation, resume link,
  `aria-current` tracking, Escape-to-close, and deep-link handling. The
  Background item appears only when public background content exists.
- **`ProjectArtwork.jsx`** — the artwork switch. The original three
  illustrations are unchanged; `workflow` renders the administrator's steps;
  an unknown or unavailable illustration uses a neutral fallback.
- **`WorkflowArtwork.jsx`** — accessible, CSS/SVG-only workflow diagram. It
  renders a semantic ordered list, never interprets administrator text as HTML,
  and uses a neutral fallback when no valid workflow exists.
- **`workflow.js`** — controlled workflow type vocabulary, visual metadata,
  validation, and reading-order summary used by the renderer and tests.
- **`ProjectEntry.jsx`** — one project in the gallery, in featured or
  supporting arrangement. It passes the saved workflow to the artwork switch.
- **`TechnologyTags.jsx`** — reusable project technology list.

### `src/sections/`: public page regions

- **`Hero.jsx`** — typewriter greeting, main statement, and portfolio links.
- **`Work.jsx`** — selected projects. It renders a stable loading, unavailable,
  or empty state while projects are not confirmed, and never falls back to seed
  records.
- **`About.jsx`** — approved About statement, database headline and biography
  when present, education summary, and database skill groups with the same
  confirmed/empty/unavailable handling.
- **`Background.jsx`** — public education, certification, and achievement
  presentation. It renders only when at least one collection has a record.
- **`backgroundContent.js`** — pure formatting and visibility helpers used by
  `Background`, `Navbar`, and `About`.
- **`Contact.jsx`** — accessible contact form with a honeypot, double-submit
  guard, progress live region, and values retained on failure.
- **`Footer.jsx`** — copyright, profile links, and back-to-top link.

### `src/data/`: seed source and approved profile fallback

- **`portfolio.js`** — profile details, the approved About copy, project data,
  technology tags, artwork keys, and skill groups. The server seed script
  imports this file. The frontend uses only the profile copy as a safe runtime
  fallback; projects and skills are never restored from here after an empty or
  failed API response. Education, certifications, and achievements exist only
  in the database.

## Styling rules

1. Style with Tailwind utility classes in the component's `className`.
2. Add a new color, font size, container width, or breakpoint to `@theme` in
   `src/index.css` rather than hard-coding it in several places.
3. Only reach for `src/index.css` for tokens, base element styles,
   `transition-ui`, and the reduced-motion guard.
4. Do not create one CSS file per component or reintroduce a second
   hand-written stylesheet.

## Content workflow

1. Update approved seed content in `src/data/portfolio.js`.
2. Run `npm run seed:content` from the repository root. Existing records are
   never overwritten, and nothing is deleted.
3. Manage projects, skills, education, certifications, achievements, and the
   profile at their `/admin/*` pages.
4. Confirm the public API and the affected public section render the current
   database state.
5. Run `npm test` and `npm run build:frontend` before sharing or deploying.

## Component or style workflow

1. Find the relevant component in `src/components/` or section in
   `src/sections/`.
2. Change Tailwind classes in place and prefer a shared token when a value
   repeats.
3. Check desktop and mobile widths.
4. Run `npm run build:frontend`.
