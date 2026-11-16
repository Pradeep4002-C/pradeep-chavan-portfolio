# Pradeep Chavan — Developer Portfolio

A production-ready **MERN** portfolio: MongoDB, Express, React, and Node.js.
The public site is editorial and content-managed; the administrator dashboard is
private. The React frontend and Express API share one origin in production, and
all portfolio content is stored in MongoDB.

### Release highlights

- **Public portfolio:** responsive editorial layout, accessible hash navigation,
  project case studies, workflow artwork, and a contact form.
- **Private dashboard:** session-authenticated project, profile, skills,
  education, certification, achievement, and message management.
- **Security hardening:** strict request schemas, XSS-safe rendering, Helmet
  headers, trusted-origin checks, rate limits, Argon2id passwords, and hardened
  session cookies.
- **Accessibility:** WCAG 2.2 AA target, keyboard-complete flows, managed dialog
  focus, reduced-motion support, and contrast-checked design tokens.
- **Performance:** measured CLS of approximately **0.0001** on the production
  build at mobile and desktop widths, well below the **0.05** target.
- **Quality:** nine QA audit gates plus a final UI-polish regression pass.
  Current suites: **196 frontend + 122 backend = 318 automated tests**.

## Architecture

```text
Browser
  ├── /                React public portfolio (Vite build)
  ├── /admin/*         Lazily loaded administrator dashboard
  └── /api/*           Express API
                         ├── MongoDB (content and sessions)
                         └── Argon2id administrator accounts
```

The public site is rendered by React from `GET /api/portfolio`. The
administrator area is a separate lazy-loaded bundle, protected by a
MongoDB-backed session and server-side authorization on every admin route.
In production, Express serves both the API and the built frontend so cookies
stay same-origin and no CORS configuration is required.

Projects can use one of three fixed CSS/SVG illustrations or a data-driven
workflow diagram. The workflow is built in the dedicated project editor from
two to ten administrator-entered steps; it is not generated from the project
name and does not use AI. See `docs/ARCHITECTURE.md` for the full data flow.

### Folder structure

```text
.
├── frontend/                 React + Vite + Tailwind CSS v4
│   ├── public/               favicon, resume.pdf, robots.txt
│   ├── src/
│   │   ├── admin/            Dashboard pages, forms, API wrappers
│   │   ├── api/              Public API client and normalization
│   │   ├── components/       Reusable UI
│   │   ├── data/             Seed source and approved profile fallback
│   │   ├── sections/         Public page sections
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tests/                Node test-runner unit tests
│   └── docs/                 Design and structure notes
├── backend/                  Express 5 API
│   ├── scripts/              Seed content and create first administrator
│   ├── src/
│   │   ├── config/           Environment, database, session, auth settings
│   │   ├── middleware/       Auth, origin, rate limit, cache, errors
│   │   ├── models/           Mongoose models
│   │   ├── routes/           Public and administrator API routes
│   │   ├── scripts/          Administrator lockout recovery CLI
│   │   └── validation/       Zod request schemas
│   └── tests/                API, logger, and serving tests
├── docs/                     Owner, architecture, and interview guides
├── .env.example
├── .node-version
├── render.yaml
└── package.json              Root commands only
```

Keep the `frontend/` and `backend/` folder names; deployment and scripts depend
on them.

## Technology stack

- React 18 and Vite 6
- Tailwind CSS v4
- Node.js 22 (tested), with a declared minimum of 20.19.0
- Express 5
- MongoDB and Mongoose 9
- MongoDB-backed sessions
- Argon2id password hashing
- Zod request validation
- Node's built-in test runner

## Prerequisites

- **Minimum supported Node.js: 20.19.0.** This floor comes from the installed
  Mongoose 9 dependency.
- **Tested Node.js: 22.20.0**, as recorded in `.node-version`.
- npm with lockfile support.
- A local MongoDB server, or a MongoDB Atlas cluster.
- A modern browser for the dashboard.

Check installed versions:

```bash
node --version
npm --version
```

## Installation

From the repository root:

```bash
npm run install:all
```

This runs `npm ci` in `frontend/` and `backend/`. It does not install
dependencies at the root because the root package contains only orchestration
scripts.

For normal development, you can also install each package separately:

```bash
npm --prefix frontend ci --include=dev
npm --prefix backend ci
```

## Environment configuration

Copy the example file and edit the local values:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

The server reads `.env` from the repository root regardless of the directory
from which it is started. Never commit `.env`; it is ignored by Git.

Required and optional variables:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `production`, or `test`. |
| `PORT` | API port. Defaults to `4000` locally; Render supplies it in production. |
| `MONGODB_URI` | Local or Atlas MongoDB connection string. |
| `SESSION_SECRET` | Required signing secret for administrator sessions. Use at least 32 random bytes. |
| `TRUST_PROXY` | `true` only behind exactly one trusted reverse proxy, such as Render. |
| `CLIENT_ORIGIN` | Optional trusted frontend origin when frontend and API are on different origins. |

Generate a session secret locally without writing it to source:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Do not use the example placeholder in production.

## Local MongoDB

Start MongoDB locally, then use a local URI such as:

```text
mongodb://127.0.0.1:27017/pradeep_portfolio
```

The default in `.env.example` points at this local database and contains no
credentials. Keep the database name distinct for disposable test runs; test
databases must end in `_test` because the test suites enforce that guard.

For Atlas, create a database user and network access rule, then use a URI of
this form with your own values:

```text
mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
```

Enter real credentials only in your local `.env` or the hosting dashboard.

## Running locally

Use two terminals from the repository root.

Terminal 1 — API:

```bash
npm run dev:server
```

Terminal 2 — frontend:

```bash
npm run dev:frontend
```

Open the Vite URL shown in the terminal (normally
`http://localhost:5173`). Vite proxies `/api` to `http://localhost:4000`, so the
public site and dashboard work without a CORS exception.

Useful root commands:

```bash
npm run dev:frontend
npm run dev:server
npm run build:frontend
npm run preview:frontend
npm start
```

In development the server prints readable timestamps, levels, and indented
details. Colour is used only in a real terminal and is disabled when `NO_COLOR`
is set or output is redirected. In production every log entry is one JSON object
per line. The logger redacts common secret fields and scrubs MongoDB URIs,
Argon2 hashes, bearer tokens, cookies, and password assignments, but callers
still must not pass private content.

## Database seeding

Seed the curated profile, projects, and skill groups:

```bash
npm run seed:content
```

The script is idempotent:

- It creates a record only when its stable key is absent.
- It does not overwrite records edited in the dashboard.
- It does not delete records removed from the source file.
- Re-running it never inserts duplicates.

Education, certifications, and achievements are managed through the dashboard
and are not part of the seed file.

The seed command does not reset or delete administrator accounts. Before running
it against a real database, review the current content read-only and obtain owner
approval. Running it with an empty content database restores the initial profile,
projects, and skill groups; it does not overwrite manually edited records whose
stable key already exists.

## Create the first administrator

Administrator accounts are never created automatically. Run the interactive
command from the repository root:

```bash
npm run admin:create
```

You can supply the identity non-interactively while still entering the password
at the hidden prompt:

```bash
npm run admin:create -- --email <your-email> --name "<your-name>"
```

The password must be at least 12 characters and is never accepted as a command
line argument or logged. The account is written to the database configured by
`MONGODB_URI`.

Then open `/admin/login` on the public origin and sign in.

## Recover a locked administrator

Ten consecutive failed sign-ins lock the administrator account for 15 minutes.
If the lockout is triggered repeatedly, clear it from a trusted deployment
terminal where `MONGODB_URI` is already set in the environment:

```bash
npm run admin:unlock -- --email <your-email>
```

The command runs `backend/src/scripts/unlockAdmin.js` and only resets
`failedAttempts` and `lockedUntil`. It does not change the password, sessions,
or `lastLoginAt`. Never pass the connection string on the command line, because
shell history may retain it.

## Project editor and workflow artwork

`/admin/projects` lists projects. Create and edit actions open dedicated pages:

- `/admin/projects/new`
- `/admin/projects/:id/edit`

The editor uses normal document scrolling, keeps save/cancel reachable, loads
saved values from the admin API, and confirms before discarding unsaved changes.
Selecting the `workflow` artwork opens a builder with add, edit, remove, and
reorder controls plus a live preview. Each of the 2–10 steps has a title,
optional description, and one controlled type: `input`, `frontend`, `backend`,
`database`, `service`, `process`, or `output`.

The three existing artwork keys (`hostelcare`, `aquapredict`, and `expense`)
still work unchanged. A workflow project with missing or malformed data uses a
neutral fallback illustration rather than another project's drawing. See
`docs/PROJECT_GUIDE.md` for owner instructions and `docs/ARCHITECTURE.md` for the
data flow.

## Accessibility and WCAG

The interface targets **WCAG 2.2 AA**. Automated contracts and browser checks
cover the behaviours that are practical to verify in this repository:

- Semantic `header`, `nav`, `main`, and `footer` landmarks, one page-level `h1`,
  and a sequential heading outline with no skipped levels.
- A skip link that moves both scroll position and keyboard focus to `main`.
- Visible `:focus-visible` rings for every interactive control; the shared public
  and admin form focus state is one zinc border plus one zinc ring, with no
  browser-default blue or purple outline.
- Minimum 48 by 48 pixel targets for navigation and primary actions, with 44
  pixel targets retained in compact admin controls.
- Active-section navigation exposed through `aria-current="location"`. The
  underline indicator belongs only to that link; hover and keyboard focus on a
  non-active link change text colour but never grow a competing bar.
- Managed dialogs and drawers: focus moves into the layer, Tab is trapped,
  Escape closes it, the background becomes inert, and focus returns to the
  opener. Stacked inactivity and confirmation dialogs release one layer at a
  time.
- Form errors connected with `aria-invalid` and `aria-describedby`; asynchronous
  results announced through `role="status"` or `role="alert"`.
- A global `prefers-reduced-motion` guard that removes entrance, hover, and
  smooth-scroll animation while preserving content.
- Contrast checks for normal text (4.5:1), large text (3:1), status colours, and
  the dark Contact surface. The darker `accent-strong` token is used where the
  brand accent alone would miss AA on the soft accent background.

These checks do not replace a manual screen-reader, zoom, or assistive-technology
audit. Treat WCAG 2.2 AA as the engineering target and verify it with real users
and devices before making a compliance claim.

## Performance and Core Web Vitals

The release was measured against the production build in Chromium using a
`PerformanceObserver` for layout shifts. API responses were delayed so loading
states were exercised rather than only the settled page.

| Check | Target | Measured |
| --- | --- | --- |
| Cumulative Layout Shift, 375 px | `< 0.05` | **0.000147** |
| Cumulative Layout Shift, 1440 px | `< 0.05` | **0.000100** |
| Horizontal overflow, 280 / 375 / 1440 / 2560 px | None | **None** |

The editorial background mesh uses only painted gradients with fixed
attachment, so it creates no layout boxes and no shift. The only observed shift
source was the pre-existing hero typing cursor, at roughly 0.0001 total. Build
assets are fingerprinted and immutable, the HTML entry is revalidated, and the
public portfolio API is revalidated so content edits appear on the next load.

LCP and INP should still be validated with field data or Lighthouse after a real
deployment; this README records only the locally verified CLS and overflow
results.

## Nine-stage QA methodology

The release was hardened through nine QA gates. Each gate combines automated
regression contracts with targeted browser or production-serving checks.

| Gate | Focus | Representative coverage |
| --- | --- | --- |
| 1. Static integrity | Build health, unsafe DOM sinks, route and configuration contracts | Source scan for `dangerouslySetInnerHTML`, `innerHTML`, `eval`, and `Function`; Vite production build |
| 2. Public experience | Content, responsive layout, navigation, anchors, and fallback states | `public-page`, `responsive-layout`, `portfolio-content` |
| 3. Admin authentication | Login, session rotation, expiry warning, cross-tab logout, protected routes | `admin-login-focus`, `inactivity`, `inactivity-dialog`, `admin-api` |
| 4. Content administration | CRUD flows, validation, dirty-state guards, draft preservation, destructive confirmations | `admin-profile`, `project-form`, `resource-form`, `resource-manager-discard` |
| 5. Production serving and SEO | SPA 404s, JSON API fallbacks, robots policy, private `noindex`, cache headers | `production-serving`, `qa9-security` |
| 6. Resilience | Slow or failed requests, duplicate submits, in-flight guards, contact failures | `contact-failure`, `in-flight-guards`, `route-error-boundary` |
| 7. Accessibility | Landmarks, heading order, focus management, state attributes, contrast, reduced motion | `accessibility-contracts`, `qa9-contracts`, dialog suites |
| 8. Data normalization and URL safety | Trimming, email normalization, strict objects, `javascript:` / `data:` / `vbscript:` rejection | `qa8-validation`, `qa8-contracts` |
| 9. Security and release | CSP and security headers, cookie attributes, XSS inert rendering, test/build/CRLF checks, health verification | `qa9-security`, `qa9-contracts`, live Chromium and production health checks |

A final **UI-polish regression pass** in `ui-polish-10.test.js` protects the
exclusive active-nav indicator, the single zinc focus treatment, the contact
copy-email interaction, motion-safe card polish, and the fixed editorial mesh.

## Tests

Run both suites from the repository root:

```bash
npm test
```

Run them separately:

```bash
npm run test:server
npm run test:frontend
```

Current release verification:

| Suite | Tests | Result |
| --- | --- | --- |
| Frontend (`frontend/`) | 196 | **Passed** |
| Backend (`backend/`) | 122 | **Passed** |
| Total | **318** | **318/318 passed** |

The frontend suite uses Node's test runner with jsdom and Vite's SSR module
loader, so component markup, focus behaviour, and API-client contracts are
exercised without a browser. The backend suite uses Node's runner with
concurrency 1 and integration routes against an isolated test database. Browser
and production checks are documented in the QA gates above.

The API integration tests need MongoDB. By default they use a disposable
database whose name ends in `_test`; the suite refuses to run against the real
`pradeep_portfolio` database. You can point the tests at another isolated
cluster with `TEST_MONGODB_URI`, but the database name must still end in
`_test`.

Do not use the real database for test writes. Tests create temporary
administrators only inside isolated test databases.

## Build and production mode

Build the frontend:

```bash
npm run build:frontend
```

Start Express in production mode:

```bash
npm start
```

Express serves the built `frontend/dist` directory, the API, and the SPA
fallback from one origin. The API-only process can start without a build for
development, but production startup refuses to run without a frontend build.

Before production:

1. Set `NODE_ENV=production`.
2. Set a real `MONGODB_URI`.
3. Set a strong `SESSION_SECRET`.
4. Build the frontend.
5. Start the server and verify `/api/health`.

Static fingerprinted assets are cached for a year and are immutable. The HTML
entry point is revalidated. Public portfolio API content is revalidated with
`public, max-age=0, must-revalidate` so dashboard edits become visible without
waiting for an arbitrary cache lifetime. Authentication and administrator API
responses use `Cache-Control: no-store` and `Vary: Cookie`.

## API overview

Public endpoints are read-only except the contact form:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service and database health. |
| `GET` | `/api/portfolio` | Published projects, profile, skills, education, certifications, and achievements. |
| `POST` | `/api/contact` | Validate and store a contact message. Rate limited. |

Authentication endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Start an administrator session. |
| `GET` | `/api/auth/me` | Return the authenticated administrator. |
| `POST` | `/api/auth/logout` | End the session. |

Administrator endpoints require authentication. State-changing requests also
require the trusted-origin check:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/overview` | Dashboard counts. |
| `GET/POST` | `/api/admin/projects` | List or create projects. |
| `GET/PATCH/DELETE` | `/api/admin/projects/:id` | Read, update, or delete a project. |
| `GET` | `/api/admin/messages` | Paginated contact inbox. |
| `PATCH/DELETE` | `/api/admin/messages/:id` | Mark read or delete a message. |
| `GET/POST` | `/api/admin/skill-groups` | List or create skill groups. |
| `PATCH/DELETE` | `/api/admin/skill-groups/:id` | Update or delete a skill group. |
| `GET/POST` | `/api/admin/education` | List or create education records. |
| `PATCH/DELETE` | `/api/admin/education/:id` | Update or delete education. |
| `GET/POST` | `/api/admin/certifications` | List or create certifications. |
| `PATCH/DELETE` | `/api/admin/certifications/:id` | Update or delete a certification. |
| `GET/POST` | `/api/admin/achievements` | List or create achievements. |
| `PATCH/DELETE` | `/api/admin/achievements/:id` | Update or delete an achievement. |
| `GET/PUT` | `/api/admin/profile` | Read or replace the singleton profile. |

Unknown `/api/*` routes return JSON errors, not the SPA HTML. Missing static
assets also return a 404 rather than `index.html`.

## Deploying to Render and MongoDB Atlas

The repository includes `render.yaml` for a single-origin Render web service.

1. Create an Atlas cluster, database user, and network access rule.
2. Connect the repository to Render and create a Blueprint from
   `render.yaml`.
3. Enter `MONGODB_URI` as a secret when Render requests it.
4. Let Render generate `SESSION_SECRET`, or provide a strong value yourself.
5. Keep `TRUST_PROXY=true`; Render terminates TLS at one trusted proxy.
6. Deploy. The build command installs both packages and builds the frontend.
7. Verify `/api/health`, the public page, and `/admin/login`.
8. Seed production and create the owner administrator using the deployed
   database configuration. Never commit those credentials.

Render supplies `PORT`. Do not hard-code it in the Blueprint.

Manual production checklist:

```bash
npm run install:all
npm run build:frontend
npm start
```

Use only safe, verified deployment commands. A healthy local build does not
prove that a remote deployment succeeded.

## Security hardening

### XSS-safe rendering and input validation

- All content is rendered through React text nodes. Application source contains no
  `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write`, `eval`,
  or `new Function`.
- Regression tests feed `<script>`, `<img onerror>`, and `<svg onload>` payloads
  through public content and administrator message bodies, then assert that no
  script, image, or inline event handler is created. Hostile values remain inert
  text.
- Link fields are validated on both the client and the server. Only absolute
  `http:` and `https:` URLs are accepted; `javascript:`, `data:`, and `vbscript:`
  schemes are rejected.
- Zod request schemas are strict: unknown keys, mass-assignment fields such as
  `_id` or `__v`, and unsupported nested objects are rejected. Scalar text is
  trimmed before validation and storage.
- Public responses use explicit field projections, so password hashes,
  administrator records, contact messages, and internal fields are never
  serialized.

### Headers and transport

- Helmet is enabled and `x-powered-by` is disabled.
- Responses include a Content Security Policy with
  `frame-ancestors 'self'`, plus `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: no-referrer`.
- JSON bodies are limited to 32 KB and the API only accepts JSON.
- `/api/*` and `/admin/*` are marked `noindex, nofollow`; the public portfolio
  stays indexable.
- Authentication and administrator responses use `Cache-Control: no-store` and
  `Vary: Cookie`. Public content is revalidated so deleted or unpublished
  records do not remain visible indefinitely.

### Authentication and sessions

- Administrator routes require both a valid MongoDB-backed session and
  server-side authorization.
- Passwords are hashed with Argon2id. Password hashes are never returned by the
  API, and unknown-account logins perform a dummy verification to reduce timing
  differences.
- Sessions use the `pradeep.sid` cookie with `HttpOnly`, `SameSite=Lax`, and
  `Secure` in production. The session ID is regenerated after successful login,
  sessions expire after approximately eight hours, and no in-memory store is
  used as a fallback.
- State-changing authentication and administrator requests pass a
  trusted-origin check. Wildcard CORS is not used.
- Login is limited to five failed attempts per IP per fifteen minutes. Ten
  consecutive failures lock the account for fifteen minutes; generic responses
  do not reveal which condition failed. `npm run admin:unlock` clears a lockout
  without changing credentials or sessions.

### Abuse and data protection

- Contact submissions are limited to five per IP per hour, with a hidden
  honeypot and a minimum form age. Suppressed spam receives the same response as
  an accepted message and is not stored.
- Request metadata, IP addresses, and anti-spam fields are never written to the
  contact collection.
- The logger redacts common secret fields and scrubs MongoDB URIs, Argon2 hashes,
  bearer tokens, cookies, and password assignments. Callers must still avoid
  passing private content.
- `.env` files are ignored. `.env.example` contains only placeholders, and the
  environment loader rejects short, placeholder, or malformed session secrets.
- Set `TRUST_PROXY=true` only behind exactly one trusted reverse proxy; otherwise
  rate-limit identities are spoofable.

## Known limitations and troubleshooting

- **MongoDB is required for content and authentication.** Without it, the
  public page keeps its approved profile copy but does not invent projects or
  skills. It shows a stable unavailable state instead of stale seed records.
- **Public content is database-authoritative.** Seed data is used by
  `backend/scripts/seed-content.js`; it is not a runtime substitute for
  unpublished or deleted projects and skill groups.
- **The administrator area is a single-owner tool.** There is no public
  registration, password-reset flow, or role hierarchy.
- **Rate limiting counts failed login attempts by IP.** Repeated successful
  sign-ins do not consume the login allowance. If a legitimate user is locked
  out, wait for the configured window or adjust the limit deliberately; do not
  disable it.
- **Browser verification is not a full screen-reader or WCAG audit.** Automated
  keyboard checks and responsive browser checks do not replace manual assistive
  technology testing.
- **Linux native module builds are not verified by local Windows checks.**
  `argon2` must install on the deployment runtime.
- **No live deployment is implied by this repository.** Verify the actual URL
  and health endpoint before announcing a release.

If the server exits at startup, check that `.env` exists, `MONGODB_URI` is
reachable, and `SESSION_SECRET` is set. If the dashboard returns 503, check
that the session middleware is configured. If the production site returns only
API responses, confirm that `frontend/dist` exists and was built before startup.

## Documentation

- `docs/PROJECT_GUIDE.md` — owner workflow, editor, seeding, troubleshooting,
  and the learning guide.
- `docs/ARCHITECTURE.md` — request, auth, contact, and workflow diagrams plus
  model and deployment notes.
- `docs/INTERVIEW_PREPARATION.md` — grounded explanations and interview Q&A.
- `frontend/docs/structure-guide.md` — frontend folders and ownership.
- `frontend/docs/design-notes.md` — visual and interaction decisions.
- `.env.example` — configuration reference with no secrets.
- `render.yaml` — Render Blueprint for the single-origin service.
