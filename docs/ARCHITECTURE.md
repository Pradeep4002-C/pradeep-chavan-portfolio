# Architecture

This document describes the implementation in this repository. It separates
what exists from what is planned elsewhere in the guide. The source code is the
final authority.

## System context

```text
                           ┌────────────────────────────────────┐
                           │             Browser                │
                           │                                    │
                           │  Public React app   Admin React app│
                           │  /                  /admin/*        │
                           └──────────┬───────────────┬─────────┘
                                      │               │
                                GET /api/portfolio   /api/auth/*, /api/admin/*
                                      │               │
                           ┌──────────▼───────────────▼─────────┐
                           │          Express 5 API             │
                           │  public routes, auth, admin routes │
                           │  Zod validation, Helmet, sessions  │
                           └──────────┬───────────────┬─────────┘
                                      │               │
                           ┌──────────▼───────┐  ┌────▼────────────┐
                           │     MongoDB      │  │ MongoDB session │
                           │ content + admins │  │ store           │
                           └──────────────────┘  └─────────────────┘
```

In production one Express process serves:

- the built React entry and assets from `frontend/dist`;
- configured static files such as the resume and favicon;
- `/api/*` JSON routes;
- SPA fallback for public and `/admin/*` browser navigations.

The frontend is built into a public bundle and a lazily loaded admin bundle.
`frontend/src/main.jsx` decides which root to load from the current pathname, so
react-router and dashboard code are not part of the visitor's initial public
bundle.

## Runtime request paths

### Public portfolio

```text
Browser
  │
  ├─ GET /                              Express static/SPA router
  │     └─ frontend/dist/index.html
  │
  ├─ GET /assets/*                      immutable fingerprinted assets
  │
  └─ GET /api/portfolio                 portfolio router
        ├─ Profile.findOne(...)         approved public fields only
        ├─ Project.find({published})    sorted by order, then slug
        ├─ SkillGroup.find(...)         approved public fields only
        ├─ Education.find(...)          approved public fields only
        ├─ Certification.find(...)      approved public fields only
        └─ Achievement.find(...)        approved public fields only
```

`GET /api/portfolio` sets
`Cache-Control: public, max-age=0, must-revalidate`. A successful response can
contain no records. The frontend keeps those collections empty instead of
restoring seed data. If MongoDB is unavailable, the public API returns a
service-unavailable response and the dashboard remains the place to diagnose
content.

Published project serialization includes `title`, `slug`, `category`, `summary`,
`description`, `technologies`, `repoUrl`, `demoUrl`, `featured`, `artwork`,
`workflow`, and `order`. Workflow steps contain only `id`, `title`,
`description`, and `type`; Mongo subdocument ids are disabled.

`frontend/src/api/portfolio.js` normalises that payload before any component
sees it: text is trimmed, malformed records are dropped, and `demoUrl` becomes
`demoHref` only when it is a parseable HTTP(S) URL. A `javascript:`, `mailto:`,
or empty value therefore cannot produce a public demo button.

The public page is a single composition: `App` renders Hero, Work, Skills,
About, Background, Contact, and Footer; `PortfolioContext` supplies the
normalised collections; `Navbar` derives its links from the same visibility
helpers the sections use, so no link can point at a section that is not
rendered.

### Administrator sign-in

```text
Browser                    Express                          MongoDB
  │ POST /api/auth/login       │                                │
  │ email + password           │                                │
  ├───────────────────────────►│ validate with Zod              │
  │                            ├─ Admin.findOne().select(hash) ─►│
  │                            ├─ Argon2id verify               │
  │                            ├─ rotate session id             │
  │                            ├─ store session ───────────────►│
  │ ◄──────────────────────────┤ HTTP-only cookie               │
  │                            │                                │
  ├─ GET /api/auth/me          │                                │
  ├───────────────────────────►│ requireAuth + Admin lookup ───►│
  │ ◄──────────────────────────┤ { id, email, name }            │
```

The server session is the security boundary. `ProtectedRoute` is only a
convenience that avoids flashing dashboard content. Every administrator API
request independently runs `createRequireAuth`, which:

1. checks that a session and `adminId` exist;
2. looks up the administrator record;
3. destroys the session if the account no longer exists;
4. attaches only `{ id, email, name }` to `req.admin`.

State-changing administrator and authentication requests also pass the
trusted-origin middleware. Production cookies are HTTP-only, secure, same-site,
and backed by MongoDB. Sessions expire after approximately eight hours.

### Project create/update

```text
Admin editor
  │ values -> projectForm.js client validation
  │ POST /api/admin/projects  or  PATCH /api/admin/projects/:id
  ├──────────────────────────────────────────────────────────────►
  │                                                              Express
  │                                                              ├─ requireAuth
  │                                                              ├─ requireTrustedOrigin
  │                                                              ├─ Zod project schema
  │                                                              ├─ conditional workflow check
  │                                                              ├─ Mongoose document write
  │                                                              └─ toAdminProject
  │ ◄──────────────────────────────────────────────────────────────
  │ navigate back to /admin/projects with a one-time notice
```

The editor works on a saved record. An edit route loads the record from
`GET /api/admin/projects/:id` and converts it into editable values. It never
uses a stale list payload as the save source.

Create and update use the same field rules. Unknown top-level fields are
rejected. On update:

- a submitted field changes that field;
- an omitted field stays unchanged;
- an omitted `workflow` preserves the stored workflow;
- `workflow: null` explicitly clears it;
- `{ artwork: "workflow" }` with no submitted workflow is checked against the
  stored document, so an existing valid workflow can be reused, while an empty
  one is rejected.

The Mongoose model also validates direct model writes. The API re-checks the
combined stored document before saving an update, so a partial patch cannot
leave `artwork: "workflow"` without at least two steps.

### Workflow data flow

```text
Administrator
  ├─ title, optional description, controlled type
  ├─ add / edit / remove / reorder
  └─ live preview
           │
           ▼
  { steps: [{ id, title, description, type }] }
           │
           ├─ POST/PATCH validation: 2–10, unique ids, 120/300 character limits,
           │  supported enum, no angle brackets, unknown fields rejected
           │
           ▼
  Project.workflow.steps in MongoDB
           │
           ▼
  GET /api/portfolio (published projects only)
           │
           ▼
  frontend/src/api/portfolio.js
    └─ normalizeWorkflow: drops unusable steps; 2–10 or null
           │
           ▼
  ProjectArtwork
    ├─ hostelcare / aquapredict / expense: existing fixed drawings
    ├─ workflow + valid steps: WorkflowArtwork ordered list
    └─ workflow without valid data: neutral abstract fallback
```

The renderer never receives HTML, SVG, CSS, or URLs from workflow fields. React
renders titles and descriptions as text. Colours, glyphs, arrows, and spacing
come from code, keyed by the controlled type enum.

The editor preview calls the same `WorkflowArtwork` component. Drafts with blank
titles show honest "Untitled step" placeholders in the preview, but cannot be
saved until validation passes.

### Contact flow

```text
Visitor
  │ POST /api/contact
  ▼
Express
  ├─ JSON body limit
  ├─ rate limiter
  ├─ Zod contact validation
  ├─ honeypot + timing guard
  ├─ ContactMessage.create
  └─ generic confirmation
           │
           ▼
Dashboard
  ├─ GET /api/admin/messages
  ├─ PATCH /api/admin/messages/:id  (read flag)
  └─ DELETE /api/admin/messages/:id
```

Contact message bodies are not part of the public portfolio payload and are
never passed to the logger. Public contact errors are generic. The dashboard is
the only place a stored message body is displayed, and only to an authenticated
administrator.

## Data model

Models live in `backend/src/models/`.

| Model | Important fields | Notes |
| --- | --- | --- |
| `Admin` | `email`, `name`, `passwordHash`, `lastLoginAt`, `failedAttempts`, `lockedUntil` | Hash is `select: false`; login rotates sessions and supports lockout. |
| `Profile` | singleton content fields | Profile copy falls back to approved frontend copy when empty. |
| `Project` | title, slug, category, summary, description, technologies, URLs, featured, artwork, workflow, order, published | Unique slug. Artwork enum includes the three original types and `workflow`. |
| `SkillGroup` | label, items, order | Ordered public list. |
| `Education` | institution, qualification, years, order | Ordered public list. |
| `Certification` | title, issuer, year, URL, order | Public links are restricted to HTTP(S). |
| `Achievement` | title, description, year, order | Ordered public list. |
| `ContactMessage` | name, email, subject, message, read timestamps | Dashboard-managed; never public. |

MongoDB also stores `sessions` through `connect-mongo`.

## Validation boundaries

There are three deliberate layers:

1. **Editor helpers** — `frontend/src/admin/projectForm.js` validates required
   fields, URLs, technology count, workflow limits, markup characters, and step
   types for immediate feedback.
2. **API contracts** — Zod schemas in `backend/src/validation/` reject bad or
   unknown input and map issues to safe field messages.
3. **Persistence rules** — Mongoose schema types, enums, length limits, unique
   indexes, and the workflow artwork cross-field check protect direct model
   writes.

Client validation is never trusted as a security boundary. The editor's payload
builder trims values and sends only the known project fields.

## Authentication and authorization

- Password hashing uses Argon2id through `backend/src/lib/password.js`.
- `POST /api/auth/login` returns the same response for an unknown email and a
  wrong password.
- Failed attempts are tracked and can lock an account temporarily.
- Login is rate limited by IP; successful logins do not consume the failed-login
  allowance.
- Login rotates the session id.
- Logout destroys the server-side session and clears the browser cookie.
- Administrator and auth responses use private/no-store caching.
- Project and content writes require authentication and a trusted origin.
- Error handling never returns a server stack or raw database error to a client.

## Logging

`backend/src/lib/logger.js` is a small dependency-free logger with two output
modes.

**Production** — one JSON object per line:

```json
{"time":"...","level":"info","message":"API listening","url":"http://localhost:4000","env":"production"}
```

**Development** — readable output with labels:

```text
[10:48:12] SUCCESS MongoDB connected
                    Database: pradeep_portfolio
                    Host: 127.0.0.1
```

Development colour is only emitted to a TTY. `NO_COLOR` and redirected output
produce plain text. The formatter itself adds no ANSI codes when the stream is
not a terminal. Production always uses JSON, even on a terminal.

The logger redacts metadata keys associated with passwords, hashes, secrets,
cookies, authorization, sessions, tokens, request bodies, contact content,
emails, and MongoDB URIs. It also scrubs MongoDB URIs, Argon2 hashes, bearer
tokens, and `password=`-style assignments from strings. This is defence in depth;
callers must not deliberately pass private content.

## Static serving and caching

`backend/src/frontend.js` serves the built frontend when `frontend/dist` exists.

- `/` and admin navigations revalidate the HTML entry.
- Fingerprinted assets use a one-year immutable cache.
- Favicon, resume, and robots.txt use revalidation caching.
- Missing assets and unknown `/api/*` paths return JSON 404s, never HTML.
- Production refuses to start without a built frontend.

The SPA fallback is intentionally limited to known navigation paths. API and
asset requests do not fall back to `index.html`.

## Configuration

`backend/src/config/env.js` loads the root `.env` and validates:

| Variable | Role |
| --- | --- |
| `NODE_ENV` | development, production, or test behavior. |
| `PORT` | HTTP port. |
| `MONGODB_URI` | MongoDB connection. Never logged. |
| `SESSION_SECRET` | Session signing secret, at least 32 characters. |
| `TRUST_PROXY` | Trust exactly one configured proxy only when true. |
| `CLIENT_ORIGIN` | Optional separate-origin frontend. |

Configuration errors list variable names and safe messages, never values.

## Deployment shape

`render.yaml` describes a single Render web service. The intended shape is:

```text
Internet
  │
  ▼
Render TLS / one trusted proxy
  │
  ▼
Node 22 Express process
  ├─ frontend/dist
  ├─ /api/*
  └─ MongoDB Atlas
```

This repository has not been proven deployed by local checks. Do not claim that
a live deployment, custom domain, analytics, or uptime number exists unless it
was separately verified.

## Trade-offs and limits

- **Single-owner admin** — simple and appropriate for a portfolio, but no roles,
  password reset, or multi-user audit trail.
- **No image generation or upload** — the fixed SVG/CSS artwork and structured
  workflow keep the site fast and avoid untrusted media. The cost is less visual
  variety.
- **No AI workflow generation** — diagrams are deterministic and honest, but the
  owner must describe the real steps.
- **Two validation layers** — some duplication, but immediate UI feedback and an
  unbypassable server contract are both valuable.
- **Database-authoritative public content** — an empty database produces empty
  sections. This is honest, but it makes seeding and publishing deliberate
  operations.
- **Data-router requirement** — the admin router uses a data router for
  unsaved-change blocking. The public site remains a separate lazy root.
- **No full assistive-technology audit** — the implementation uses semantic
  controls, labels, focus management, and reduced-motion handling, but browser
  checks are not a substitute for a manual screen-reader review.

## Future work

Planned work is documented separately in `docs/PROJECT_GUIDE.md`. Potential next
steps include richer owner documentation, additional automated browser checks,
and deployment verification. None of those should be reported as complete until
implemented and tested.
