# Project guide

This is the practical owner's guide to the Pradeep Chavan portfolio. It explains
what the application does, how to use the dashboard safely, and how to debug the
most common failures. The source code is the final authority; this guide points
to the files that implement each behaviour.

## What this project is

A full-stack portfolio with two frontends built from the same repository:

1. A public, single-page portfolio for visitors.
2. A private administrator dashboard for the owner.

Both are React applications. The public site and dashboard call an Express API,
which stores content and administrator sessions in MongoDB. In production,
Express serves the built React files and the API from one origin.

The project deliberately does not invent content. If a database collection is
empty, the public site shows an honest empty state instead of restoring old seed
records. If a project has no valid workflow data, its illustration falls back to
a neutral drawing instead of borrowing another project's diagram.

## Repository map

```text
.
├── frontend/                 React + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── admin/            Dashboard pages, editor, API wrappers
│   │   ├── api/              Public API clients and normalization
│   │   ├── components/       Shared UI and artwork renderers
│   │   ├── data/             Seed source and approved profile fallback
│   │   └── sections/         Public page sections
│   ├── tests/                Node test-runner unit tests
│   └── docs/                 Frontend structure and design notes
├── backend/
│   ├── scripts/              Content seed and administrator creation
│   ├── src/
│   │   ├── config/           Environment, database, session, auth settings
│   │   ├── lib/              Logger, HTTP helpers, password helpers
│   │   ├── middleware/       Auth, origin, rate limit, cache, errors
│   │   ├── models/           Mongoose models
│   │   ├── routes/           Public and administrator APIs
│   │   └── validation/       Zod request contracts
│   └── tests/                API, logger, and serving integration tests
└── docs/                     This guide, architecture notes, interview notes
```

Keep the `frontend/` and `backend/` folder names. The root scripts and deployment
configuration depend on them.

## First local start

1. Install dependencies from the repository root:

   ```bash
   npm run install:all
   ```

2. Ensure `.env` exists and contains a reachable `MONGODB_URI`, a
   `SESSION_SECRET` of at least 32 characters, and the desired `NODE_ENV`.
   Never commit `.env`.

3. Start the API and frontend in two terminals:

   ```bash
   npm run dev:server
   npm run dev:frontend
   ```

4. Open the Vite URL, normally `http://localhost:5173`.

5. Sign in at `/admin/login`. The first administrator is created only with the
   interactive command described below; the application never creates one
   automatically.

## The public site

The page order is Hero → Work → Skills → About → Background → Contact, and the
navigation lists Work, Skills, About, Background, and Contact in the same order.

- **Hero** opens with "HELLO, I'M" and types the name once, at about 68 ms per
  character, with a cursor that blinks while typing and disappears at the final
  full stop. The finished name is exposed once to assistive technology, and an
  invisible copy reserves its height so the page does not shift. With
  `prefers-reduced-motion`, the full name appears immediately. The positioning
  line, approved introduction, "View projects" and "Download resume" actions,
  and GitHub/LinkedIn links render on the first paint; none of them wait for the
  animation. A stored introduction that opens with the name is shown without
  that repeated leading clause, and the record is never edited.
- **Work** is database-driven. Published projects appear in `order`, with one
  featured project and supporting entries. The section does not revive bundled
  seed projects when the API returns an empty collection. Each entry shows a
  one-line summary, the stored description, a labelled "Built with" technology
  list, and a repository link. A "View live demo" action is rendered only when
  the record contains a valid HTTP(S) demo URL; no demo address is invented.
- **Skills** appears only when the public API confirms at least one valid,
  administrator-managed skill group. Groups stay scannable; there are no
  percentage bars or proficiency ratings. It does not restore seed data when the
  collection is empty or unavailable.
- **About** uses the approved profile fallback while loading, then the database
  headline and biography when present. It deliberately renders no institution,
  qualification, years, score, or location: education belongs only in the
  dedicated Background section, so it is stated once.
- **Background** appears only when at least one education, certification, or
  achievement record exists. With one degree and two certificates, the degree
  card sits in the wider left column and the certificates stack beside it;
  below the large breakpoint the cards form one column. Scores stored as
  `8.61`, `CGPA: 8.61`, or `8.61/10` are presented as `8.61 / 10`.
- **Contact** posts to `/api/contact`. It validates input, uses a honeypot and
  timing guard, and keeps values after a failed request.
- **Resume** is the PDF in `frontend/public/resume.pdf`.

## Administrator dashboard

All dashboard routes except `/admin/login` require an authenticated MongoDB
session.

| Route | Purpose |
| --- | --- |
| `/admin` | Real counts from the database. No fake charts. |
| `/admin/projects` | List, create, edit, publish, unpublish, and delete projects. |
| `/admin/projects/new` | Full-page project editor for a new project. |
| `/admin/projects/:id/edit` | Full-page editor for a saved project. |
| `/admin/messages` | Contact inbox with filters, read state, and delete. |
| `/admin/skills` | Skill-group management. |
| `/admin/education` | Education management. |
| `/admin/certifications` | Certification management. |
| `/admin/achievements` | Achievement management. |
| `/admin/profile` | Profile details and biography paragraphs. |

### Why the project form is a page, not a modal

The previous project form was an oversized dialog. On short or narrow screens,
fields and the save action could be clipped and the dialog's internal scrolling
was easy to lose. The replacement uses two dedicated routes and ordinary
document scrolling. The editor has:

- a breadcrumb and visible heading;
- sections for basic information, description, technologies and links, artwork,
  workflow steps, and publication;
- a sticky save/cancel bar;
- unsaved-change protection for sidebar, breadcrumb, cancel, and browser
  navigation;
- server field errors mapped back to the relevant inputs.

The data router in `frontend/src/admin/AdminRoot.jsx` is required because the
editor uses React Router's `useBlocker`.

### Creating or editing a project

1. Open **Projects** and choose **Add project** or **Edit**.
2. Enter a title. Use **Use title** to generate a URL-safe slug.
3. Add a category, display order, summary, and description. The summary is one
   sentence; the description may hold several paragraphs separated by a blank
   line, and each renders as its own paragraph. Describe only what the repository
   actually implements.
4. Enter technologies separated by commas and a valid `http(s)` repository URL.
5. Choose an illustration.
6. If using **Workflow diagram**, add at least two real workflow steps.
7. Choose whether the project is featured and published.
8. Choose **Create project** or **Save changes**.

Successful saves return to the project list with a one-time notice. Existing
records are loaded from `GET /api/admin/projects/:id`, not from unsaved local
state.

### Workflow illustrations

The workflow artwork is data-driven. It is not AI-generated and it is not
inferred from the project name.

Each step has:

- a stable `id` generated by the editor;
- a title;
- an optional description;
- one controlled type: `input`, `frontend`, `backend`, `database`, `service`,
  `process`, or `output`.

Limits are enforced in both the editor and the server:

- 2–10 steps;
- 120 characters per title;
- 300 characters per description;
- 64 characters per step id;
- unique ids within a workflow;
- no `<` or `>` characters, so administrator text is never treated as markup;
- unknown step fields are rejected.

The public renderer is
`frontend/src/components/WorkflowArtwork.jsx`. It draws nodes, down arrows,
type colours, type labels, and inline SVG glyphs. The diagram is a semantic
ordered list, so screen-reader reading order matches the visual order. A
`workflow` project with no valid data shows
`frontend/src/components/WorkflowArtwork.jsx`'s `NeutralProjectArtwork`
fallback.

The three original artworks (`hostelcare`, `aquapredict`, and `expense`) remain
unchanged. Existing project documents without workflow data remain valid.

### Publication and order

- **Published** controls whether a project appears in `GET /api/portfolio`.
- **Draft** records stay visible in the dashboard only.
- **Featured** selects the larger project entry in the public Work section.
- **Display order** sorts published projects ascending. Title is the secondary
  sort when two projects share an order.

Public portfolio responses are revalidated (`max-age=0, must-revalidate`), so a
dashboard edit is visible on the next reload rather than remaining cached for an
arbitrary period.

### Contact messages

The contact form stores submissions in MongoDB. The dashboard can filter by read
state, mark messages read or unread, open the message body, and delete a message.
Message bodies never appear in the public portfolio response and are never sent
to the logger.

## Databases, seeding, and the administrator

### Test databases

Backend tests refuse to run against `pradeep_portfolio` and require a database
name ending in `_test`. The suites create temporary administrators only inside
those isolated databases.

Examples:

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/pradeep_portfolio_workflow_test npm run test:server
```

On PowerShell:

```powershell
$env:TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/pradeep_portfolio_workflow_test"
npm run test:server
Remove-Item Env:TEST_MONGODB_URI
```

### Content seed

The exact command is:

```bash
npm run seed:content
```

It imports `frontend/src/data/portfolio.js` and creates a profile, projects, and
skill groups only when their stable key is absent. It does not overwrite records
edited in the dashboard, does not delete records missing from the source file,
and does not touch administrator accounts. Education, certifications, and
achievements are not seeded.

**Do not run it against the real database until the owner has reviewed the
current database state and explicitly approved it.** The repository does not run
this command automatically.

At the time this cycle was documented, the configured local database contained
one administrator and zero profile, project, skill-group, education,
certification, achievement, and contact-message records. The seed source
contains one profile, three projects, and four skill groups. A read-only count
check is enough to confirm whether seeding is still needed; never print the
connection string while doing it.

### Creating the first administrator

```bash
npm run admin:create
```

The password is entered at a hidden prompt, must be at least 12 characters, and
is never accepted as a command-line argument or logged. The command writes to the
database configured by `MONGODB_URI`.

## Tests and verification

From the repository root:

```bash
npm test
npm run build:frontend
```

The backend suite covers API authorization, project CRUD, workflow validation
and persistence, public serialization, logging, secret redaction, contact
handling, production serving, and database safety checks. It runs with
`--test-concurrency=1` because the files share one `_test` database and create
the same administrator address; parallel files raced on that index. The frontend
suite covers API wrappers, project editor validation and payloads, workflow
normalization, public portfolio normalization, and server-rendered checks of the
public page order, navigation, hero, About/Background separation, project
actions, and demo-link normalization.

Browser viewport coverage is recorded in the final cycle report. Do not claim
coverage for a viewport, zoom level, browser, or assistive technology that was
not actually tested.

## Owner learning guide

### Public portfolio request

**WHAT** — The browser asks `GET /api/portfolio` for published content.

**WHY** — One confirmed API response keeps projects, profile, skills, and
background records consistent, and prevents deleted records from lingering as
stale seed data.

**HOW** — `frontend/src/PortfolioContext.jsx` starts in `loading` with approved
profile copy only. `frontend/src/api/portfolio.js` fetches and normalizes the
response. `backend/src/routes/portfolio.js` queries MongoDB with explicit field
projections and returns published projects sorted by order and title.

**TRADE-OFFS** — The page shows an empty state until data is confirmed. It is
slightly slower than rendering bundled projects immediately, but it never shows
content the database says is unpublished or deleted.

**HOW TO DEBUG** — Check `/api/health`, then `/api/portfolio` in the browser or a
network tool. If the API is healthy but Projects is empty, check whether the
project is published and whether the configured database contains projects.
Never fix an empty database by restoring backup data without approval.

### Administrator authentication

**WHAT** — A single owner signs in with email and password.

**WHY** — Content changes must be unavailable to public visitors.

**HOW** — `POST /api/auth/login` verifies an Argon2id hash, rotates the session,
and stores the session in MongoDB through `connect-mongo`. The browser receives
an HTTP-only cookie. `createRequireAuth` checks the session and the administrator
record on every admin API request. `AdminAuthContext` only drives UI state; it is
not the security boundary.

**TRADE-OFFS** — A single-owner account keeps operations simple, but there is no
role hierarchy, password reset, or self-service registration.

**HOW TO DEBUG** — A 401 means the browser has no valid session; sign in again.
A 403 on a state-changing request means the trusted-origin check rejected the
origin. A 503 on admin routes means session middleware was not configured. Never
disable authorization to make a local request work.

### Project CRUD and the editor

**WHAT** — The owner creates and edits project records, including artwork and
workflow data.

**WHY** — Project content is database-authoritative and should be editable
without changing React source or redeploying a new build.

**HOW** — `ProjectEditorPage.jsx` loads real saved values from the admin API,
validates locally through `projectForm.js`, and sends a payload to the
authenticated project endpoint. Zod validates again. Mongoose stores the
document. `toAdminProject` serializes only approved fields.

**TRADE-OFFS** — Validation exists in two places. The duplication is deliberate:
the client gives immediate feedback, while the server remains authoritative and
cannot be bypassed. The editor is a larger page, but it avoids clipped modal
content and lost save buttons.

**HOW TO DEBUG** — If a save fails, read the field errors. If the server rejects
a field the client accepted, compare `frontend/src/admin/projectForm.js` with
`backend/src/validation/project.js`. If the list is stale, use **Refresh**. If
the editor shows “No unsaved changes” but you expected a warning, check whether
the value actually changed.

### Workflow rendering

**WHAT** — A project card can show an administrator-authored workflow diagram.

**WHY** — Some projects are best explained by their stages, not a fixed
illustration. Structured steps keep the drawing honest and reusable.

**HOW** — The editor stores `{ steps: [...] }` with a controlled type for each
step. `frontend/src/api/portfolio.js` normalizes the data and drops unusable
steps. `WorkflowArtwork.jsx` renders the same data in the editor preview and the
public card.

**TRADE-OFFS** — A controlled step vocabulary is less flexible than arbitrary
SVG or HTML, but it is safe, accessible, consistent, and requires no design work
from the owner for each project.

**HOW TO DEBUG** — If the public card shows the neutral fallback, inspect the
stored workflow: there must be 2–10 steps, unique valid ids, supported types,
non-blank titles, and no angle brackets. The editor preview is useful because it
uses the same renderer as the public site.

### Logging

**WHAT** — The server writes operational logs.

**WHY** — Development needs readable diagnostics; production needs machine-
readable JSON without leaking secrets.

**HOW** — `backend/src/lib/logger.js` keeps one logger API. Production emits one
JSON object per line. Development emits a timestamp, level, message, and indented
labels. ANSI colours are used only on a real terminal and are disabled when
`NO_COLOR` is set or output is redirected. Known sensitive keys are redacted and
MongoDB URIs, Argon2 hashes, bearer tokens, cookies, and password assignments are
scrubbed from strings.

**TRADE-OFFS** — Redaction is defence in depth, not permission to log sensitive
data. A log formatter cannot reliably know which arbitrary text is private.

**HOW TO DEBUG** — In development, read the labels and hint. In production,
parse the JSON line and look at `level`, `message`, `code`, and safe context
fields. Never paste a real `.env`, connection string, cookie, or password hash
into an issue or chat.

## Implemented versus planned

### Implemented

- Public portfolio sections and confirmed empty/loading/unavailable states.
- Single-owner dashboard, session authentication, logout, and rate-limited login.
- Project CRUD at `/admin/projects`, with dedicated `/admin/projects/new` and
  `/admin/projects/:id/edit` pages.
- Add, edit, remove, and reorder workflow steps with 2–10 limit and live preview.
- Workflow persistence, public serialization, generic rendering, and neutral
  fallback.
- Existing `hostelcare`, `aquapredict`, and `expense` artwork compatibility.
- Contact inbox, profile, skills, education, certifications, and achievements.
- Isolated database tests, production build tests, and structured/readable
  logging.
- Documentation in `docs/`.

### Planned or intentionally not built

- Multiple administrator roles and permissions.
- Password reset and account recovery.
- Image or file uploads for project artwork.
- Automatic or AI-generated workflow diagrams.
- A public analytics dashboard or fabricated traffic charts.
- Automated production deployment from this agent session.

Do not describe a planned feature as complete in an interview, README, or
resume.

## Common failures

| Symptom | Likely cause | Safe next step |
| --- | --- | --- |
| Public projects are empty | No published projects in the configured database | Check counts read-only; do not seed without approval. |
| Dashboard returns 401 | Session missing or expired | Sign in again. |
| Dashboard returns 503 | Session middleware or database unavailable | Check `.env`, MongoDB, and server startup logs. |
| Save rejected with a workflow error | Fewer than two steps or invalid step data | Fix the highlighted steps; the server will reject invalid data too. |
| Workflow card shows neutral fallback | Saved workflow is missing or malformed | Open Edit and repair the steps. |
| Project edit is not visible publicly | Project is still a draft, or the browser has an old tab | Publish it, refresh, and confirm `/api/portfolio`. |
| Production page shows only API JSON | `frontend/dist` is missing or stale | Run `npm run build:frontend` and restart. |
| Development logs are hard to read | Output is redirected, so colour is correctly disabled | Use the labelled fields; do not force ANSI into a file. |

## Safety rules for the owner

- Never commit `.env` or paste real secrets into documentation.
- Do not drop the real database to make tests pass.
- Do not overwrite or delete the administrator to reset a flow.
- Test writes belong in databases whose names end in `_test`.
- Review the seed command and current database counts before running it against
  real content.
- Keep the repository history; do not force-push or rewrite reviewed commits.
