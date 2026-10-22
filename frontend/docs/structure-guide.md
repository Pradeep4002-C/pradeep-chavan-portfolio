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
│   ├── contact-api.test.js
│   ├── auth-api.test.js
│   ├── admin-api.test.js
│   ├── admin-content-api.test.js
│   ├── project-form.test.js
│   ├── resource-form.test.js
│   ├── portfolio-content.test.js
│   └── background-content.test.js
├── src/
│   ├── admin/
│   │   ├── AdminRoot.jsx
│   │   ├── AdminAuthContext.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── AdminLayout.jsx
│   │   ├── AdminLoginPage.jsx
│   │   ├── AdminOverviewPage.jsx
│   │   ├── AdminProjectsPage.jsx
│   │   ├── ProjectFormDialog.jsx
│   │   ├── AdminMessagesPage.jsx
│   │   ├── AdminProfilePage.jsx
│   │   ├── ResourceManager.jsx
│   │   ├── resourceConfigs.js
│   │   ├── resourceForm.js
│   │   ├── AdminSkillsPage.jsx
│   │   ├── AdminEducationPage.jsx
│   │   ├── AdminCertificationsPage.jsx
│   │   ├── AdminAchievementsPage.jsx
│   │   ├── AdminUi.jsx
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

- **`main.jsx`** — the entry point. It checks for the `#root` element, renders the app with React `StrictMode`, and imports the global stylesheet. It also branches on the URL: when `window.location.pathname` starts with `/admin`, it lazily imports `admin/AdminRoot.jsx` and renders the administrator application instead of the public portfolio. Both branches share the same `#root` element and stylesheet, and the admin code stays in a separate bundle that a public visitor never downloads.
- **`App.jsx`** — composes the page sections, wraps them in `PortfolioProvider`, and holds the skip link. `<main>` carries `tabindex="-1"` so the skip link moves focus into the content instead of only scrolling. Keep this file focused on page order rather than putting every detail here.
- **`PortfolioContext.jsx`** — initialises content from `data/portfolio.js`, fetches `/api/portfolio` once after mount, aborts the request on unmount, ignores late responses, and exposes `profile`, `projects`, `skillGroups`, `education`, `certifications`, and `achievements` through `usePortfolio()`. Profile, projects, and skills start from bundled content; the three background collections start empty because no records are invented offline. Sections never import the API directly.
- **`index.css`** — the whole global stylesheet. It contains only the Tailwind import, the `@theme` design tokens, a short `@layer base` block, the `transition-ui` utility, and the reduced-motion guard.

### `src/api/`: the public API boundary

- **`client.js`** — minimal same-origin JSON client. It uses relative `/api` paths, parses JSON safely, normalises network/non-2xx failures into `ApiError` (including safe field messages), preserves abort errors, and never renders a server stack trace. It exposes `getJson`, `postJson`, `patchJson`, `putJson`, and `deleteJson`; a `204 No Content` response resolves to `null`, which is what project, message, and collection deletion return.
- **`portfolio.js`** — fetches `/api/portfolio`, validates and normalises the payload into the shapes the existing components already expect, and applies the bundled fallback rules for empty or invalid fields. It maps `profile.headline` and `profile.bio` and converts the three background collections into render-ready records, dropping malformed entries, clearing out-of-range years, and accepting only HTTP/HTTPS certificate URLs.
- **`contact.js`** — posts `/api/contact` through the shared client and requires a human-readable confirmation in the response; a malformed success response is treated as an error so the form cannot show a false success.

### `src/admin/`: the administrator application

This folder is the whole `/admin` area. It is imported lazily from `main.jsx`, so none of it is in the public bundle. It reuses the shared `Button`, `Container`, and design tokens; it introduces no second UI framework.

- **`AdminRoot.jsx`** — the router and route tree. It renders `AdminAuthProvider`, then `/admin/login` publicly and every other page behind `ProtectedRoute` and `AdminLayout`. Each page is lazy-loaded, so a page chunk is requested only when it is first opened. An unknown `/admin/*` path redirects to `/admin`.
- **`AdminAuthContext.jsx`** — the session state machine (`loading`, `authenticated`, `unauthenticated`, `error`). It initialises from `GET /api/auth/me`, treats `401` as signed out, treats a network/server failure as an error instead of a false sign-out, and exposes `login`, `logout`, and `markUnauthenticated` for reacting to a `401` from a later protected request.
- **`ProtectedRoute.jsx`** — shows a loading state while the session is checked, redirects unauthenticated visitors to `/admin/login`, and offers a retry on error. It never flashes protected content.
- **`AdminLayout.jsx`** — the responsive shell: a fixed sidebar from 1024px up, a disclosure menu below it, the links to Overview, Projects, Messages, Skills, Education, Certifications, Achievements, and Profile, the signed-in identity, and sign-out. It wraps the page outlet in `Suspense` so the shell stays visible while a page chunk loads.
- **`AdminLoginPage.jsx`** — the labelled email/password form with show/hide password, a distinct message when the server is unreachable, a generic message for bad credentials, and no success claim before the backend confirms.
- **`AdminOverviewPage.jsx`** — reads `GET /api/admin/overview` and shows the aggregate counts.
- **`AdminProjectsPage.jsx`** — reads `GET /api/admin/projects`, renders a table on wide screens and stacked cards on narrow ones, and offers Refresh, Add, Edit, Publish/Unpublish, and Delete with a confirmation dialog.
- **`ProjectFormDialog.jsx`** — the create/edit form for every sensible project field, with inline server field errors mapped back to the right inputs.
- **`AdminMessagesPage.jsx`** — the inbox: All/Unread/Read filters, pagination, expandable message bodies, explicit read/unread toggles, delete with confirmation, and loading/empty/error states.
- **`AdminProfilePage.jsx`** — the profile editor. Text fields mirror the model, the biography is a list of individual text areas (add/remove up to 20), and the saved values are refilled from the `PUT` response.
- **`ResourceManager.jsx`** — the shared list/create/edit/delete/reorder UI for the four ordered collections: ordered rows with Move up / Move down, a field-driven dialog, inline validation, and destructive confirmation.
- **`resourceConfigs.js`** — the field descriptors, labels, empty-state copy, and summary renderers for skills, education, certifications, and achievements, plus the education year cross-check.
- **`resourceForm.js`** — pure helpers shared by every collection: record → editable strings, strings → request payload, comma-list parsing, and client-side validation. Kept DOM-free so it can be unit tested.
- **`AdminSkillsPage.jsx`**, **`AdminEducationPage.jsx`**, **`AdminCertificationsPage.jsx`**, **`AdminAchievementsPage.jsx`** — thin wrappers that pass a config to `ResourceManager`.
- **`AdminUi.jsx`** — the shared admin controls, states, and overlays (page header, notices, field styles, dialog, confirmation dialog, pagination, empty/error/loading blocks).
- **`adminApi.js`** — typed wrappers over the shared client for the overview, project, inbox, collection, and profile endpoints, validating response shapes so a malformed payload becomes an error rather than broken UI. The four ordered collections are built from one `createResourceApi` factory.
- **`projectForm.js`** — pure helpers: slug generation from a title and comma-separated technology parsing.

### `src/components/`: reusable building blocks

- **`Container.jsx`** — the shared max-width and responsive page padding used by every section.
- **`Button.jsx`** — shared pill styling for links and real buttons, with `solid`/`outline`/`light` variants and `md`/`sm` sizes. An `href` renders an anchor; without one it renders a `button`, so the contact submit control reuses the same target and focus treatment.
- **`Arrow.jsx`** — the one consistent arrow shape (inline SVG, not a text glyph), used across buttons and links. It inherits the surrounding text colour and nudges on its `group` parent's hover.
- **`DownloadIcon.jsx`** — the inline SVG download icon used by the resume button, matching `Arrow`'s 2px stroke.
- **`Brand.jsx`** — the portfolio wordmark, used only in the sticky header (the footer deliberately does not repeat it). The "PC" monogram is drawn with generated content so the mark stays decorative and never clashes with the link's accessible name.
- **`Navbar.jsx`** — desktop/mobile navigation with the resume link, the shared hover/focus underline, `aria-current` active state driven by an `IntersectionObserver` reading band, Escape-to-close, resize handling, and menu state. The Background item appears only while the public background section exists, and the observer and deep-link effects re-initialise when that changes. It also restores deep links (`/#about`, `/#background`): the browser looks for the fragment before React has rendered the section, so the matching target is scrolled into view with `scroll-padding-top` still applied; a hash that was already applied is not applied again when late API content arrives.
- **`ProjectArtwork.jsx`** — the purpose-built illustration for a project, selected by the `artwork` field in the data: a report → prioritize → resolve complaint workflow (HostelCare), the eight water-quality measurements and the three status bands the API returns (AquaPredict), and the Excel → summary report → email flow (RPA Expense Tracker). Each panel is one `role="img"` with a descriptive label, prints what it is in its topline so it can never read as a capture, and is built from CSS boxes and inline SVG — no image file and no new dependency. Every palette clears 4.5:1 on its own tint. Below 480px each drawing switches from its wide arrangement to a stacked one.
- **`ProjectEntry.jsx`** — one project in the gallery: the illustration and the writing, in one of two arrangements. `featured` places the panel beside the copy in a wide row that stretches both halves to one height from 1024px up; a supporting entry stacks the panel above the copy. Both arrangements render the same copy block — numbered index and category, title, one-line summary, detail, technology list, and a single repository action — so the two cannot drift apart. Entries are separated by a hairline rule, not boxed into a card.
- **`TechnologyTags.jsx`** — reusable list for a project's tech stack.

### `src/sections/`: large page regions

- **`Hero.jsx`** — the typewriter greeting, the main statement, and links into the portfolio.
- **`Work.jsx`** — the two-tier gallery: it picks the project flagged `featured` and renders it as the wide leading row, then renders the remaining projects one type step down in a two-column tier from 1024px up (a single column below). Rows are divided by hairline rules rather than boxed into cards, and the section closes with a line to the GitHub profile.
- **`About.jsx`** — the approved About statement, the database headline (when present), the biography paragraphs (database copy or the bundled fallback), a one-line education summary, and the skill groups. The summary comes from the primary education record when one exists; otherwise the approved bundled line is kept.
- **`Background.jsx`** — the public education, certification, and achievement presentation. It renders only when at least one collection holds a record and then shows just the subsections that have content: full-width education rows, then certifications and achievements side by side from 768px. Optional fields are omitted, certificate links are HTTP/HTTPS-only and open safely in a new tab, and no fallback records are fabricated.
- **`backgroundContent.js`** — pure presentation helpers used by `Background`, `Navbar`, and `About`: the shared visibility rule, study-period formatting, and the compact education summary. Kept DOM-free so it can be unit tested.
- **`Contact.jsx`** — the contact heading and direct email link plus an accessible form for name, email, optional subject, and message. It keeps values on failure, clears them only after the API confirms a save, disables the button and guards against double requests while submitting, and exposes progress in a polite live region. The honeypot is off-screen, `aria-hidden`, and outside the tab order.
- **`Footer.jsx`** — copyright line, profile links, and a link back to the top of the page.

### `src/data/`: fallback content, not runtime layout

- **`portfolio.js`** — profile details (including the approved biography used as the About fallback), verified-from-resume project repository URLs, project summaries/descriptions, technology tags, the `artwork` key that names each project's illustration, and skill groups. It is rendered immediately as the offline fallback and is also imported directly by the server seed script. Once the API responds, non-empty valid database fields replace their bundled counterparts. Education, certification, and achievement records are intentionally absent: they exist only in the database. A project has no image field: it names a drawing, and the drawing itself lives in `ProjectArtwork.jsx`.

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
3. Education, certifications, achievements, and the profile headline/biography have no bundled records: manage them at `/admin/education`, `/admin/certifications`, `/admin/achievements`, and `/admin/profile`. The public Background section and its navigation link appear only when at least one real record exists.
4. With the API running, check that the database-backed page still renders correctly; without it, check that the fallback still renders.
5. Check the browser console and network response.
6. Run `npm test` and `npm run build` before sharing/deploying.

## Safe workflow for a component or style change

1. Find the relevant component under `src/components/` or section under `src/sections/`.
2. Change its Tailwind classes in place. Prefer adjusting the shared token when the same value repeats.
3. Check desktop and mobile widths.
4. Run `npm run build`.
