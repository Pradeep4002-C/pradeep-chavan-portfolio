# Pradeep Chavan — Developer Portfolio

A project-first portfolio: a **React + Vite + Tailwind CSS v4** frontend and an **Express 5 + MongoDB (Mongoose)** API in one repository. The resume supplies factual details and repository destinations; the website is designed around selected work instead of repeating the full CV.

## Current status

| Area | State |
| --- | --- |
| Public frontend | Complete and verified — Home, Work, About, Background, Contact form, Footer, resume download |
| Backend foundation | Complete (M1) — configuration validation, MongoDB connection, security headers, health endpoint, error handling, graceful shutdown |
| Database models and seeding | Complete (M2) — eight Mongoose models, indexes, idempotent content seed, secure administrator creation |
| Public portfolio API and frontend integration | Complete (M3) — `GET /api/portfolio`, Vite development proxy, API client, and immediate static fallback |
| Contact form and message persistence | Complete (M4) — `POST /api/contact`, inline validation, MongoDB storage, honeypot and timing checks, IP rate limiting |
| Administrator authentication | Complete (M5) — MongoDB-backed sessions, Argon2id login, lockout and login rate limiting, origin checks, reusable auth middleware |
| Admin dashboard and project management | Complete (M6) — protected `/admin` React routes, database-backed overview, administrator project CRUD API and UI, publish/unpublish, validation and tests |
| Message inbox and content management | Complete (M7) — contact-message inbox (filter, read/unread, delete), skill-group/education/certification/achievement CRUD with ordering, profile editing, protected APIs, validation and tests |
| Public background and profile presentation | Complete (M8) — database-backed About headline and biography, conditional Background section for education/certifications/achievements, navigation and deep-link integration, tests and fallback |
| Email notifications, image and resume uploads, production SPA serving | **Not implemented yet** — planned for later milestones |

The React app renders the bundled content immediately, then replaces it with database-backed content when `GET /api/portfolio` succeeds. If the API is unavailable, the bundled content stays visible; the backend is not required merely to view the site. The existing public design, copy, illustrations, and navigation remain in place; M4 adds the contact form inside the existing Contact section and changes no other section. M6 adds a separate administrator application under `/admin` that is loaded lazily, so the public portfolio bundle and design are unaffected. M7 adds administrator pages and APIs for the message inbox and the remaining content collections. M8 renders that content publicly: the About section can use the database headline and biography, and a new Background section presents education, certifications, and achievements. Both disappear or fall back cleanly when the database holds no such content.

## Repository layout

```text
Portfolio_new/
├── .env.example                 # Documented environment placeholders (safe to commit)
├── .gitignore
├── package.json                 # Root convenience scripts
├── README.md
├── CODE-COPY-PASTE.md           # Snapshot of the frontend source (files in frontend/ are authoritative)
├── frontend/                    # React + Vite + Tailwind app
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/                  # favicon.svg, resume.pdf, robots.txt
│   ├── docs/                    # Design and structure notes
│   └── src/                     # components, sections, api, context, data, styles
│       └── admin/               # Lazy-loaded administrator application (M6)
└── server/                      # Express API
    ├── package.json
    ├── scripts/
    │   ├── seed-content.js      # Idempotent portfolio content seed
    │   └── create-admin.js      # Secure first-administrator initialization
    ├── tests/
    │   ├── contact.test.js      # Isolated contact API tests
    │   ├── auth.test.js         # Isolated authentication and session tests
    │   ├── admin.test.js        # Isolated admin overview and project CRUD tests
    │   └── admin-content.test.js # Isolated inbox and content-management tests (M7)
    └── src/
        ├── index.js             # Startup, shutdown, process-level error handling
        ├── app.js               # Express application (helmet, JSON parsing, routes)
        ├── config/
        │   ├── env.js           # dotenv + Zod validation
        │   ├── db.js            # Mongoose connection and status
        │   ├── session.js       # MongoDB session store, cookie, helpers
        │   └── auth.js          # Lockout policy constants
        ├── middleware/
        │   ├── notFound.js      # JSON 404 for unknown routes
        │   ├── errorHandler.js  # Central error handler (SafeError aware)
        │   ├── contactRateLimit.js # Five-per-hour contact limiter
        │   ├── authRateLimit.js    # Five-per-15-minute login limiter
        │   ├── requireAuth.js      # Reusable admin session guard
        │   └── requireTrustedOrigin.js # Origin validation for auth POSTs
        ├── models/              # Eight Mongoose models + ensureModelIndexes()
        ├── routes/
        │   ├── health.js        # GET /api/health
        │   ├── portfolio.js     # GET /api/portfolio
        │   ├── contact.js       # POST /api/contact
        │   ├── auth.js          # POST /api/auth/login, GET /me, POST /logout
        │   ├── admin.js         # /api/admin overview and project CRUD (M6)
        │   └── adminContent.js  # /api/admin inbox, content collections, profile (M7)
        ├── validation/
        │   ├── contact.js       # Zod contact schema and anti-spam helpers
        │   ├── auth.js          # Zod login schema
        │   ├── project.js       # Zod project create/update schemas
        │   └── content.js       # Zod schemas for messages, collections, profile
        └── lib/
            ├── admin.js         # Safe admin response shape
            ├── adminHttp.js     # Shared admin response/error/id helpers
            ├── logger.js        # Structured JSON-line logger
            ├── password.js      # Shared Argon2id helpers
            ├── safeError.js     # Log-safe operational error category
            └── validators.js    # Shared email and http(s) URL checks
```

The frontend keeps its existing entry points, sections, illustrations, and styling. Public content now flows through `frontend/src/PortfolioContext.jsx`; read `frontend/docs/structure-guide.md` for the role of each frontend file.

## Prerequisites

- **Node.js 20 or newer** — developed and tested on Node 22.20 with npm 10.9.
- **MongoDB** — either a local server (`mongod` on `127.0.0.1:27017`) or a MongoDB Atlas cluster.
- npm (bundled with Node.js).

## Environment configuration

1. Copy the example file to the repository root:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Set the values for your machine. `.env` is ignored by Git; `.env.example` is not.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `4000` | Port the Express API listens on |
| `TRUST_PROXY` | No | `false` | Set `true` only behind exactly one trusted reverse proxy; required for correct client IPs and HTTPS cookies in that deployment |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `SESSION_SECRET` | **Yes** | — | Random secret (at least 32 bytes) used to sign the administrator session cookie |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` in development; empty in production | Trusted browser origin for state-changing authentication requests, in addition to same-origin |

Generate `SESSION_SECRET` with a cryptographically secure random source and never commit it:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

The copied placeholder in `.env.example` is deliberately rejected by validation, so a real value must be set. The server never logs the secret.

`TRUST_PROXY` is deliberately off by default. When it is `false`, Express uses the socket address for `req.ip`; enabling it behind a proxy would otherwise let a caller spoof `X-Forwarded-For` and bypass the contact limiter. For a single-proxy host such as Render, set `TRUST_PROXY=true` so the limiter sees the visitor's IP. Do not enable it when the API is directly exposed to the internet.

The server loads `.env` from the repository root by resolving the path relative to `server/src/config/env.js`, so it behaves the same whether it is started from the repository root or from `server/`. Variables already present in the process environment take precedence over the file.

Configuration is validated with Zod before anything else starts. Missing or invalid values stop the process with exit code `1` and a JSON error naming each variable — values themselves are never echoed, so credentials cannot leak into logs:

```json
{"level":"error","message":"Invalid environment configuration","issues":[{"variable":"MONGODB_URI","message":"must start with mongodb:// or mongodb+srv://"}]}
```

## MongoDB setup

**Local MongoDB.** Install MongoDB Community Server, make sure the service is running, and use the default connection string:

```text
mongodb://127.0.0.1:27017/pradeep_portfolio
```

**MongoDB Atlas (free tier).**

1. Create a free M0 cluster.
2. Create a database user with a strong password.
3. Allow your current IP address in **Network Access**.
4. Copy the driver connection string and replace the database name:

```text
mongodb+srv://<username>:<password>@<cluster-host>/pradeep_portfolio?retryWrites=true&w=majority
```

The API refuses to start until the database connection succeeds. Mongoose creates missing collections and the seed script creates the indexes it needs; starting the API does not insert or overwrite portfolio content. Run `npm run seed:content` once to populate the database.

## Install

```powershell
npm --prefix frontend ci
npm --prefix server ci
```

Or in one step: `npm run install:all`.

## Development commands

Run the two applications in separate terminals.

| Command (from the repository root) | What it does |
| --- | --- |
| `npm run dev:frontend` | Vite dev server at `http://localhost:5173/` |
| `npm run dev:server` | API with Node's watch mode at `http://localhost:4000/` |
| `npm run build:frontend` | Production build into `frontend/dist/` |
| `npm run preview:frontend` | Preview the production build |
| `npm run start:server` | Start the API without watch mode |
| `npm run seed:content` | Create missing portfolio records (safe to repeat) |
| `npm run admin:create` | Create the first administrator interactively |
| `npm test` | Run backend and frontend automated tests |
| `npm run test:server` | Contact API tests against an isolated MongoDB database |
| `npm run test:frontend` | Contact API client tests (Node test runner) |

The same commands work directly inside `frontend/` (`npm run dev`, `npm run build`, `npm run preview`) and `server/` (`npm run dev`, `npm start`).

There is deliberately no combined `dev` script: the frontend and API are separate processes, and running them in two terminals gives clearer logs.

### Run the frontend and backend together

Start MongoDB, then run these in two terminals from the repository root:

```powershell
npm run dev:server
```

```powershell
npm run dev:frontend
```

Open `http://localhost:5173/`. The page renders the bundled content immediately and requests `GET /api/portfolio` through Vite's development proxy. Vite forwards `/api` to `http://localhost:4000` (configured in `frontend/vite.config.js`), so the browser makes same-origin requests and no CORS setup is required. If the API is not running, the page still shows the bundled content and logs one development-only warning.

The administrator area is served by the same Vite server at `http://localhost:5173/admin/login`. Sign-in requires an administrator created with `npm run admin:create`; there is no registration.

`npm run preview:frontend` serves the production build, but **Vite preview does not apply the development proxy**. Opening the preview without a same-origin API therefore exercises the fallback path, not the proxy path. Production same-origin serving belongs to a later milestone.

## Health endpoint

```powershell
curl.exe http://localhost:4000/api/health
```

Healthy response — `200 OK`:

```json
{
  "status": "ok",
  "uptime": 6.999,
  "timestamp": "2026-10-20T14:52:38.388Z",
  "database": { "status": "connected", "readyState": 1 }
}
```

If the connection drops after startup, the same endpoint returns `503 Service Unavailable` with `"status": "degraded"`. It exposes no environment values, connection strings, hostnames, or stack traces.

## API behaviour

- JSON-only requests with a **32 KB** body limit.
- Unknown routes return a JSON `404`:

  ```json
  { "error": { "code": "NOT_FOUND", "message": "The requested resource was not found." } }
  ```

- Malformed JSON returns `400 INVALID_JSON`; an oversized body returns `413 PAYLOAD_TOO_LARGE`.
- Unexpected failures return `500 INTERNAL_ERROR` with a generic message. Stack traces are logged server-side and are never sent to a client, in development or production. Routes that can handle visitor or credential data (contact persistence, login, logout) pass a `SafeError` so only a safe diagnostic category is logged, never a raw database message that could contain submitted content.
- Helmet sets security headers on every response; `X-Powered-By` is disabled.
- There is **no SPA fallback and no CORS configuration**. Development uses Vite's same-origin proxy; serving the production frontend from Express belongs to a later milestone.

## Public portfolio API

```powershell
curl.exe http://localhost:4000/api/portfolio
```

Success — `200 OK`:

```json
{
  "data": {
    "profile": {
      "name": "Pradeep Chavan",
      "headline": "",
      "intro": "I’m Pradeep, a Computer Science Engineering student ...",
      "bio": [],
      "email": "chavanpradeep096@gmail.com",
      "location": "Belgaum, Karnataka, India",
      "github": "https://github.com/Pradeep4002-C",
      "linkedin": "https://www.linkedin.com/in/pradeep-chavan-268329337/",
      "leetcode": "https://leetcode.com/u/Pradeep_Chavan/",
      "resumePath": "resume.pdf"
    },
    "projects": [
      {
        "title": "HostelCare",
        "slug": "hostelcare",
        "category": "Full-stack web app",
        "summary": "...",
        "description": "...",
        "technologies": ["React", "Node.js", "Express", "MongoDB"],
        "repoUrl": "https://github.com/Pradeep4002-C/hostel-management-system",
        "featured": true,
        "artwork": "hostelcare",
        "order": 1
      }
    ],
    "skills": [
      { "label": "Languages", "items": ["C", "C++", "JavaScript", "Python"], "order": 1 }
    ],
    "education": [],
    "certifications": [],
    "achievements": []
  }
}
```

The exact project copy lives in the database; the example is abbreviated. Retrieval rules:

- **Profile** is the single singleton document. `key`, `_id`, timestamps, and internal fields are not selected.
- **Projects** are filtered to `published: true` and sorted by `order`, then `slug`. The endpoint returns `title`, `slug`, `category`, `summary`, `description`, `technologies`, `repoUrl`, `demoUrl` (when present), `featured`, `artwork`, and `order`.
- **Skills** are skill groups sorted by `order`, then `label`, with `label`, `items`, and `order`.
- **Education**, **certifications**, and **achievements** use the same explicit field projections and are returned as empty arrays when no records exist. No fallback content is fabricated on the server. The public frontend presents these records in its [Background section](#public-background-and-profile-presentation-m8).
- Every query is a lean, read-only query with an explicit projection. Administrator records, password hashes, contact messages, sessions, `_id`, `__v`, and timestamps cannot appear in this response.
- If MongoDB is not connected, the endpoint returns `503` with `{"error":{"code":"DATABASE_UNAVAILABLE","message":"Portfolio content is temporarily unavailable."}}`. A query failure reaches the shared error middleware and returns `500 INTERNAL_ERROR` without data or a stack trace. A failed query never produces a successful response with invented content.

## Contact API

The public form posts JSON to the same-origin endpoint:

```text
POST /api/contact
Content-Type: application/json
```

Request body:

```json
{
  "name": "Visitor name",
  "email": "visitor@example.com",
  "subject": "Optional subject",
  "message": "The visitor's message",
  "website": "",
  "formStartedAt": 1760980000000
}
```

`website` and `formStartedAt` are anti-spam support fields, not part of the stored message. `website` is an off-screen honeypot; `formStartedAt` is the browser timestamp captured when the form component mounts. Unknown fields are rejected with `400`, so a request cannot set `read`, `meta`, timestamps, or any other database field.

Accepted response — `201 Created`:

```json
{ "data": { "message": "Your message has been received." } }
```

Validation rules (trimmed first):

| Field | Rule |
| --- | --- |
| `name` | Required, 1–80 characters |
| `email` | Required, valid email shape, maximum 254 characters; stored lower-case |
| `subject` | Optional, maximum 120 characters; stored as `''` when omitted |
| `message` | Required, 10–5000 characters |
| `website` | Honeypot; must be empty for a normal visitor |
| `formStartedAt` | Integer millisecond timestamp; at least two seconds old |

Validation failure — `400 Bad Request` with field messages:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please check the highlighted fields and try again.",
    "fields": {
      "email": "Enter a valid email address."
    }
  }
}
```

The response never echoes submitted values. A body that is not valid JSON returns `400 INVALID_JSON`; a body over the 32 KB limit returns `413 PAYLOAD_TOO_LARGE`.

For a legitimate submission the route validates the request, applies the honeypot and timing checks, checks the database connection, then creates one `ContactMessage` with `read: false` and Mongoose-managed timestamps. It returns success only after the save resolves. The honeypot value, timing value, IP address, and unrelated request fields are never written to the database. Contact message bodies and email addresses are not logged. `meta.ipHash` is intentionally left unset in this milestone.

**Spam handling.** A filled honeypot or an invalid/too-fast timestamp is silently suppressed: the endpoint returns the same `201` body as an accepted message but stores nothing. This deliberately does not tell the caller which check failed. Timing checks are a speed bump, not a complete spam defence.

**Rate limiting.** `POST /api/contact` is limited to **5 requests per IP address per hour**, using `express-rate-limit`'s in-memory store and standard `RateLimit` response headers. Limit responses are JSON:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many messages have been sent. Please try again later."
  }
}
```

The limiter is applied only to the contact route, not to portfolio browsing. The in-memory store resets when the API process restarts and is per-process; a multi-instance deployment would need a shared store. See `TRUST_PROXY` above before deploying behind a proxy.

If MongoDB is disconnected, the endpoint returns `503 DATABASE_UNAVAILABLE` without pretending the message was sent. An unexpected save failure returns `500 INTERNAL_ERROR` through the central handler, with no database details or stack trace.

There is **no public message-read endpoint**. Contact messages are not included in `GET /api/portfolio` or any other public route; an admin inbox belongs to a later milestone. **Email notifications are not implemented in M4** — messages are stored only in MongoDB and no external email provider is called.

## Administrator authentication

M5 adds cookie-based administrator sessions. There is still **no dashboard, no CRUD, and no message inbox**; those belong to later milestones. All authentication is enforced by the backend independently of any frontend route guard.

### Session architecture

- Sessions are stored in MongoDB in the `sessions` collection through `connect-mongo`, reusing the Mongoose connection's MongoClient. The Express `MemoryStore` is never used, in development or production.
- `resave: false` and `saveUninitialized: false`; an anonymous request never creates a stored session.
- The session lifetime is approximately **8 hours**. The cookie carries the same maximum age, so an expired cookie no longer authorizes a request; the store also expires the record.
- A successful login calls `session.regenerate()` first, then stores only the administrator's `_id` in the session. The session id in the browser cookie therefore changes on every login, which prevents session fixation.
- Logout destroys the server-side session and clears the cookie with the same `HttpOnly`, `SameSite=Lax`, `Secure` (production), and `Path=/` attributes used to set it. No `Domain` attribute is used.
- Session responses never include the session id, session data, password hash, lockout counters, or internal database fields.

Cookie configuration:

| Attribute | Value |
| --- | --- |
| `httpOnly` | `true` |
| `sameSite` | `Lax` |
| `secure` | `true` when `NODE_ENV=production` (requires HTTPS) |
| `path` | `/` |
| `maxAge` | 8 hours |
| `domain` | not set (host-only cookie) |

### Endpoints

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

**Login** accepts only JSON:

```json
{ "email": "owner@example.com", "password": "provided by the administrator" }
```

On success — `200 OK`:

```json
{
  "data": {
    "admin": { "id": "…", "email": "owner@example.com", "name": "Owner Name" }
  }
}
```

Invalid credentials, an unknown email, and a locked account all return the same response:

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password." } }
```

The response deliberately does not reveal whether an account exists. The handler performs one Argon2id verification against a stored hash or a fixed dummy hash so unknown-account and wrong-password timing stay comparable. Passwords and request bodies are never logged.

**Current administrator** (`GET /api/auth/me`) returns the same safe admin shape when the session is valid. Without a session it returns `401 UNAUTHENTICATED`. If the administrator referenced by the session no longer exists, the session is destroyed and `401` is returned. The reusable `requireAuth` middleware is ready for the M6 dashboard and CRUD routes; it is tested with an isolated probe route, not a production endpoint.

**Logout** (`POST /api/auth/logout`) returns `204 No Content`, destroys the server-side session, and clears the cookie. Logging out without an active session is also `204`. If the server session cannot be destroyed, the endpoint returns a safe `500` rather than claiming the session was invalidated.

### Login rate limiting and account lockout

Login protection is layered:

- **IP limit:** five login requests per IP per fifteen minutes, with JSON `429 RATE_LIMITED` and standard rate-limit headers.
- **Account lockout:** ten failed credential attempts set `lockedUntil` about fifteen minutes into the future. The counter and lockout are updated atomically on the server, and the counter resets after a successful login or once the lockout window has expired. Accounts are never permanently locked by ordinary login failures.

`TRUST_PROXY` must be set consistently with the contact limiter. When it is `false` (the default), Express uses the socket address and ignores `X-Forwarded-For`. Set it to `true` only behind exactly one trusted reverse proxy. The login limiter can be given test-specific limits without changing the production defaults.

### Origin protection

State-changing authentication requests (`POST /api/auth/login` and `POST /api/auth/logout`) validate the `Origin` header:

- an `Origin` matching the request's own scheme and host is allowed (same-origin);
- an `Origin` matching `CLIENT_ORIGIN` is allowed (the Vite dev server origin by default);
- a request with no `Origin` is allowed for non-browser clients — the JSON-only body and `SameSite=Lax` cookie still apply;
- any other `Origin` is rejected with `403 FORBIDDEN_ORIGIN`.

No wildcard CORS is configured. In production, serve the API and frontend from the same HTTPS origin; if they must differ, set `CLIENT_ORIGIN` to the exact frontend origin and set `TRUST_PROXY=true` behind the TLS-terminating proxy so `req.protocol` and the session cookie are correct.

## Administrator dashboard, projects, and content management

M6 adds the first usable administrator UI and database-backed project management, built on the M5 sessions. M7 completes the rest of the content surface: the contact-message inbox, skill groups, education, certifications, achievements, and the profile. **The backend remains the security boundary**; the frontend route guard is a convenience only.

### Admin routes (frontend)

| Route | Access | Purpose |
| --- | --- | --- |
| `/admin/login` | Public | Sign-in form |
| `/admin` | Protected | Dashboard overview |
| `/admin/projects` | Protected | Project management |
| `/admin/messages` | Protected | Contact-message inbox |
| `/admin/skills` | Protected | Skill groups |
| `/admin/education` | Protected | Education entries |
| `/admin/certifications` | Protected | Certifications |
| `/admin/achievements` | Protected | Achievements |
| `/admin/profile` | Protected | Profile editing |

The administrator application is a second React root, loaded lazily only when `window.location.pathname` starts with `/admin`. The public portfolio bundle therefore contains no router and no dashboard code, and the public navigation, footer, sections, illustrations, and the `/#work`, `/#about`, `/#contact` anchors are unchanged. The admin area has its own responsive shell — a desktop sidebar and a mobile disclosure menu — shows the signed-in administrator's name and email, and offers sign-out. Every admin page is itself lazy-loaded, so a page's code is fetched only when it is first opened. No admin route is linked from the public site.

`frontend/src/admin/` holds the admin application:

| File | Role |
| --- | --- |
| `AdminRoot.jsx` | Browser router and route tree (lazy pages) |
| `AdminAuthContext.jsx` | Session state (`loading`, `authenticated`, `unauthenticated`, `error`) |
| `ProtectedRoute.jsx` | Redirects unauthenticated visitors to `/admin/login` |
| `AdminLayout.jsx` | Responsive shell, navigation, identity, sign-out |
| `AdminLoginPage.jsx` | Sign-in form with show/hide password |
| `AdminOverviewPage.jsx` | Database-backed counts |
| `AdminProjectsPage.jsx` | Project list and row actions |
| `ProjectFormDialog.jsx` | Create/edit form |
| `AdminMessagesPage.jsx` | Inbox with filters, read/unread, delete |
| `AdminProfilePage.jsx` | Profile editor with a paragraph-by-paragraph biography |
| `ResourceManager.jsx` | Shared list/create/edit/delete/reorder UI for ordered collections |
| `resourceConfigs.js` | Field descriptors for skills, education, certifications, achievements |
| `resourceForm.js` | Pure helpers: values ↔ payload, list parsing, client validation |
| `AdminSkillsPage.jsx`, `AdminEducationPage.jsx`, `AdminCertificationsPage.jsx`, `AdminAchievementsPage.jsx` | Thin wrappers around `ResourceManager` |
| `adminApi.js` | Wrappers over the shared JSON client |
| `projectForm.js` | Slug and technology helpers |
| `AdminUi.jsx` | Shared admin controls, dialog, pagination, and states |

### Session handling in the UI

- `AdminAuthContext` initialises by calling `GET /api/auth/me`. A `401` means signed out; a network or server failure becomes an `error` state rather than falsely claiming the administrator was signed out.
- A `401` from a protected admin request clears the session and returns to the login page. The guard never loops on the login or session-check request.
- Submission is blocked while a login request is in flight, and success navigates to `/admin` only after the backend confirms. A failed login shows the server's generic message; an unreachable server shows a distinct "could not reach" message.
- No session identifier, credential, or password is written to local storage, session storage, the URL, or the console. The cookie stays `HttpOnly`.

### Backend endpoints

Every administrator endpoint requires a valid session (`requireAuth`). State-changing requests (`POST`, `PATCH`, `DELETE`) also enforce the trusted-origin policy. Administrator identity always comes from the session, never the request body.

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/api/admin/overview` | Aggregate counts | `200` |
| `GET` | `/api/admin/projects` | Every project, published or not | `200` |
| `POST` | `/api/admin/projects` | Create a project | `201` |
| `GET` | `/api/admin/projects/:id` | Read one project | `200` |
| `PATCH` | `/api/admin/projects/:id` | Update fields, including `published` | `200` |
| `DELETE` | `/api/admin/projects/:id` | Delete a project | `204` |

**Overview** returns only aggregates — `totalProjects`, `publishedProjects`, `unpublishedProjects`, `totalSkillGroups`, and `unreadContactMessages`. It never returns contact-message bodies or visitor details:

```json
{
  "data": {
    "totalProjects": 3,
    "publishedProjects": 3,
    "unpublishedProjects": 0,
    "totalSkillGroups": 4,
    "unreadContactMessages": 0
  }
}
```

**Project list** returns `id`, `title`, `slug`, `category`, `summary`, `description`, `technologies`, `repoUrl`, `demoUrl`, `featured`, `artwork`, `order`, `published`, and timestamps. It never returns `_id`, `__v`, or other internal fields, and it includes unpublished projects so they can be managed. It is sorted by `order`, then `title`, then `slug`.

### Project validation

Project writes use the same rules as the model, applied with Zod before the database is touched:

| Field | Rule |
| --- | --- |
| `title` | Required, 1–140 characters, trimmed |
| `slug` | Required, lowercase words separated by single hyphens, ≤120 characters, unique |
| `category`, `summary`, `description` | Optional, trimmed, ≤80 / ≤300 / ≤2000 characters |
| `technologies` | Required array of 1–30 non-empty strings, each ≤40 characters |
| `repoUrl` | Required HTTP/HTTPS URL, ≤300 characters |
| `demoUrl` | Optional HTTP/HTTPS URL, or empty |
| `featured`, `published` | Booleans |
| `artwork` | One of `hostelcare`, `aquapredict`, `expense` (the illustrations that exist) |
| `order` | Integer, 0–100000 |

Unknown or forbidden fields (`_id`, `__v`, `createdAt`, `updatedAt`) are rejected. `PATCH` changes only the fields that were sent: there are no hidden defaults, so a project's other fields are preserved. Publishing and unpublishing use the same validated update endpoint. The public `GET /api/portfolio` returns only projects with `published: true`; unpublished projects remain visible to the administrator.

### Status codes

| Status | Meaning |
| --- | --- |
| `200` | Successful read or update |
| `201` | Project created |
| `204` | Project deleted |
| `400` | Validation failed (field messages in `error.fields`) |
| `401` | No valid session |
| `403` | Origin not trusted (state-changing requests) |
| `404` | Project not found |
| `409` | Slug already exists (`SLUG_CONFLICT`) |
| `503` | Database or session store unavailable |
| `500` | Unexpected failure (generic message, no stack trace) |

There are no public project-write endpoints.

### Project management UI

`/admin/projects` lists real database records with their title, slug, category, technology summary, published state, featured state, order, and row actions, with loading, empty, error, and retry states and a Refresh action (a table on desktop, stacked cards on narrow screens). The create/edit form supports every sensible project field: title, slug (with a "Use title" helper), category, summary, description, comma-separated technologies, repository URL, optional demo URL, illustration, numeric order, and the featured and published checkboxes. Client-side validation mirrors the server for fast feedback, but the server is authoritative and its field errors are shown inline; duplicate slugs produce a clear slug error. Every create, update, publish toggle, and delete refreshes the list from the backend and shows a truthful message, and the public site picks up changes on its next load. Deleting requires an explicit confirmation dialog, and unsaved form changes prompt before the dialog closes.

### Message inbox, content collections, and profile (M7)

Every M7 endpoint sits behind the same `requireAuth` guard as the project routes, and every state-changing request also requires a trusted origin. Identity always comes from the session.

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/api/admin/messages` | Paginated inbox | `200` |
| `PATCH` | `/api/admin/messages/:id` | Mark read or unread | `200` |
| `DELETE` | `/api/admin/messages/:id` | Delete a message | `204` |
| `GET` | `/api/admin/skill-groups` | List skill groups | `200` |
| `POST` | `/api/admin/skill-groups` | Create a skill group | `201` |
| `PATCH` | `/api/admin/skill-groups/:id` | Update a skill group | `200` |
| `DELETE` | `/api/admin/skill-groups/:id` | Delete a skill group | `204` |
| `GET` | `/api/admin/education` | List education entries | `200` |
| `POST` | `/api/admin/education` | Create an education entry | `201` |
| `PATCH` | `/api/admin/education/:id` | Update an education entry | `200` |
| `DELETE` | `/api/admin/education/:id` | Delete an education entry | `204` |
| `GET` | `/api/admin/certifications` | List certifications | `200` |
| `POST` | `/api/admin/certifications` | Create a certification | `201` |
| `PATCH` | `/api/admin/certifications/:id` | Update a certification | `200` |
| `DELETE` | `/api/admin/certifications/:id` | Delete a certification | `204` |
| `GET` | `/api/admin/achievements` | List achievements | `200` |
| `POST` | `/api/admin/achievements` | Create an achievement | `201` |
| `PATCH` | `/api/admin/achievements/:id` | Update an achievement | `200` |
| `DELETE` | `/api/admin/achievements/:id` | Delete an achievement | `204` |
| `GET` | `/api/admin/profile` | Read the profile (or `null`) | `200` |
| `PUT` | `/api/admin/profile` | Create or update the profile | `200` |

**Inbox.** `GET /api/admin/messages` accepts `read=all|unread|read` (default `all`), `page` (default `1`) and `limit` (default `20`, maximum `50`), and rejects any other query parameter. Messages are newest first (`createdAt` then `_id`, descending). The response is `{ "data": { "messages": [...], "pagination": { "total", "page", "limit", "pages", "hasNext", "hasPrev" } } }`; a page beyond the end is clamped to the last page. Each message exposes only `id`, `name`, `email`, `subject`, `message`, `read`, `createdAt`, and `updatedAt` — the anti-spam `meta.ipHash` and every other internal field stay in the database. `PATCH` accepts exactly one field, `read: true|false`; `DELETE` returns `204`. An unknown id returns `404` (`MESSAGE_NOT_FOUND`), while a malformed id is rejected with `400` before the database is queried. Message bodies and email addresses are never written to logs.

The inbox UI (`/admin/messages`) shows sender, email, subject, date, and a read/unread badge, with All / Unread / Read filters, the total count, and previous/next paging. A message body opens and collapses in place (`View message` / `Hide message`, `aria-expanded`), the read state can be toggled explicitly (`Mark read` / `Mark unread`), and the badge always reflects the stored value. Deleting uses a confirmation dialog that names the sender. Every mutation refreshes the list from the API, so the counts can never drift from the database. Loading, empty, error-with-retry, and success/error messages are all present.

**Ordered collections.** Skill groups, education, certifications, and achievements share one implementation (`createOrderedResource`): a full `save()` so Mongoose validates the document, an explicit projection, and a deterministic sort of `{ order, <label/title/institution> }`. Updates are partial (`PATCH` with `.strict()` and at least one field), creations fill sensible defaults, and unknown fields are rejected. Ordering is plain numeric `order`; the UI's Move up / Move down issues two `PATCH` requests that swap the two `order` values (equal values are separated first), then reloads the list. There is no separate bulk-reorder endpoint.

| Collection | Fields and rules |
| --- | --- |
| Skill groups | `label` required, ≤60, unique (`409 LABEL_CONFLICT`); `items` 1–30 non-empty strings, each ≤40; `order` integer 0–100000 |
| Education | `institution` required ≤200; `qualification` required ≤120; `field` ≤120; `startYear`/`endYear` in 1950–2100 with `endYear >= startYear` (also checked on partial updates); `score` ≤60; `location` ≤160; `order` 0–100000 |
| Certifications | `title` required ≤200; `issuer` required ≤160; `year` required, 1950–2100; `url` optional HTTP/HTTPS ≤300; `order` 0–100000 |
| Achievements | `title` required ≤200; `year` required, 1950–2100; `description` ≤1000; `order` 0–100000 |

Skill groups are presented as labels plus a plain list of skills — no ratings, percentages, or progress bars, because the model stores none.

**Profile.** `GET /api/admin/profile` returns `{ "data": { "profile": null } }` when no profile exists. `PUT` is the only write: it merges the submitted fields over the stored document, so a partial body cannot blank fields the administrator did not touch, then upserts on the immutable `key: "profile"`. There is no way to create a second profile, and `key`/`_id` are rejected in the body. `name` (≤120) and `email` must be valid; `headline` (≤200), `intro` (≤1000), `location` (≤160), `github`, `linkedin`, `leetcode` (HTTP/HTTPS, ≤300) and `resumePath` are optional. `bio` is an array of paragraphs (≤20 paragraphs, each ≤2000 characters), edited as individual accessible text areas in the UI rather than raw JSON. The response always reflects the stored document immediately after the write.

**Status codes.** The project table above applies unchanged. `409` now also covers duplicate skill-group labels (`LABEL_CONFLICT`); `404` uses `MESSAGE_NOT_FOUND`, `SKILL_GROUP_NOT_FOUND`, `EDUCATION_NOT_FOUND`, `CERTIFICATION_NOT_FOUND`, or `ACHIEVEMENT_NOT_FOUND` depending on the route.

**Public effect.** Skill-group and profile changes appear in `GET /api/portfolio` immediately. Education, certification, and achievement records are also included in that payload and are now presented by the public Background section (M8). Contact messages never appear in any public response.

### Public background and profile presentation (M8)

M8 is a frontend milestone: it consumes the existing `GET /api/portfolio` payload and adds no API, model, or admin-CRUD behaviour.

**About.** `profile.bio` is rendered as the About paragraphs. The approved two-paragraph copy now lives in `frontend/src/data/portfolio.js` as the bundled fallback; a database biography replaces it only when at least one paragraph survives normalisation (trimmed, non-empty, at most 20 paragraphs of 2,000 characters). If the database biography is empty, malformed, or missing, the bundled copy stays on screen. `profile.headline` is rendered as a short supporting line under the About statement only when it contains meaningful text; there is no bundled headline and no generic label is substituted. The hero greeting, name, and `profile.intro` are unchanged. The one-line education summary under the About copy is derived from the primary education record when one exists and otherwise keeps the approved bundled `profile.education` string.

**Background section.** `frontend/src/sections/Background.jsx` sits between About and Contact with `id="background"` and `aria-labelledby="background-title"`. It contains up to three subsections:

| Subsection | Fields rendered |
| --- | --- |
| Education | `institution` (required to render), `qualification` and `field` on one line, `startYear–endYear` (either year alone when only one is known), and `score` / `location` when supplied |
| Certifications | `title`, `issuer · year`, and the optional `url` |
| Achievements | `title`, `year`, and the optional `description` |

Records are sorted by the numeric `order`, then by institution or title, matching the backend sort. Optional fields are omitted rather than printed as empty labels. Education uses full-width editorial rows (main details on the left, period/score/location on the right from 640px); certifications and achievements share a two-column row from 768px. There are no cards, badges, progress bars, icons, statistics, or animations, and nothing in the section is invented: a collection with no records simply has no subsection.

**Empty collections.** `hasBackgroundContent()` in `frontend/src/sections/backgroundContent.js` is the single visibility rule for both the section and the navbar link. When all three collections are empty, `Background` renders nothing, no `#background` element exists, and the navigation has no Background item. The same happens if the API is unavailable, because background records have no bundled fallback. As soon as a real record is created in the admin dashboard, the section and its link appear on the next page load.

**Certification links.** A URL is used only after it parses as `http:` or `https:`; the normaliser discards anything else (including `javascript:` and `mailto:`), and the record then renders as ordinary text. Valid links open in a new tab with `rel="noopener noreferrer"` and include a visually hidden "(opens in a new tab)" suffix.

**Navigation.** The navbar adds `Background` between About and Contact only while the section exists. Section observation, the scroll-spy reading band, and deep-link restoration all key off the resulting section order, so the link never targets a missing element. `/#background` waits for the API content before scrolling and lands at the same 96px sticky-header offset as the other sections; a hash that has already been applied is never re-applied when late content arrives. The mobile menu still closes on navigation and Escape, and returns focus to its toggle.

**Managing the content.** Education, certifications, achievements, and the profile headline/biography are edited at `/admin/education`, `/admin/certifications`, `/admin/achievements`, and `/admin/profile` (see [Message inbox, content collections, and profile](#message-inbox-content-collections-and-profile-m7)). The public site reads the result from the API on its next load; there are no public write routes and no caching layer to invalidate.

### Real administrator account

No account is created automatically and there are no default credentials. Create the owner account explicitly (see [Creating the administrator](#creating-the-administrator)) before signing in at `/admin/login`.

## Frontend data flow and fallback

- `frontend/src/api/client.js` is a small JSON client. It uses relative `/api` URLs, parses JSON safely, turns network and non-2xx responses into a safe `ApiError`, and exposes only the server's public error message.
- `frontend/src/api/portfolio.js` fetches `/api/portfolio` and normalises the payload into the shapes the existing components already expect: `project.name` from `title`, `project.id` from `slug`, `project.href` from `repoUrl`, `project.number` from `order`, and `skills` from skill groups. The same normaliser maps `profile.headline` and `profile.bio` and validates every education, certification, and achievement record before the About and Background sections receive it.
- `frontend/src/PortfolioContext.jsx` initialises state from `frontend/src/data/portfolio.js`, so first paint never waits for the network. One request runs after mount, is aborted on unmount, and an unmounted component cannot be updated by a late response. There is no retry loop.
- Non-empty, valid API values replace their bundled counterparts. Empty profile fields never blank approved copy: an empty or malformed `bio` keeps the bundled biography, an empty `headline` renders nothing, invalid URLs or empty strings keep the bundled value, and the bundled education line stays until a real education record exists. Projects and skills only replace the bundled list when at least one valid record survives normalisation. Education, certifications, and achievements have no bundled fallback, so they remain empty arrays unless the database supplies valid records.
- The admin pages never treat local state as the source of truth: every create, update, reorder, and delete reloads from the relevant admin endpoint, and the message inbox re-reads the list after each read/unread toggle. Errors keep the previous data visible and offer a retry. The profile form is refilled from the `PUT` response, so a saved edit is never cached from a stale copy.
- The About section renders `profile.bio` — the database paragraphs when valid, otherwise the bundled approved copy — and shows `profile.headline` as a supporting line only when the database supplies meaningful text. The Background section renders the three database collections and, with its navigation link, disappears entirely when they are empty.
- If the request fails, the bundled profile, projects, and skills remain on screen, About keeps its approved biography, and the Background section stays hidden. The only diagnostic is one `console.warn` in development; production logs nothing and shows no error state, because the fallback is already the intended public experience.
- The contact form uses `frontend/src/api/contact.js`, which posts through the shared `postJson` helper in `client.js`. It requires a confirmation message in a successful response; a malformed success response becomes an error, so the form can never show a false success.
- Contact form state is local to `Contact.jsx`: validation messages sit beside the affected fields, the submit button is disabled while a request is in flight, a synchronous guard prevents double requests, and the `role="status"` region reports progress, success, or failure. Success clears the form; failure preserves every entered value for a retry. The request is aborted on unmount and late responses cannot update an unmounted component.
- The Vite development proxy is the only proxy in this milestone. Relative URLs are used everywhere, so production can later serve the API and frontend from one origin without hard-coded `localhost` addresses.

## Database models

The API uses the database named in `MONGODB_URI` (`pradeep_portfolio` in the example). Mongoose pluralises collection names.

| Model | Collection | Purpose | Notable fields and indexes |
| --- | --- | --- | --- |
| `Admin` | `admins` | Dashboard account | `email` unique + normalised; `passwordHash` excluded from queries and JSON; login counters are server-only |
| `Profile` | `profiles` | Single portfolio profile | Immutable unique `key` prevents a second document; name/email required; social links validated as http(s) |
| `Project` | `projects` | Showcase entries | `slug` unique; `artwork` limited to `hostelcare`, `aquapredict`, `expense`; index on `{ published, order }` |
| `SkillGroup` | `skillgroups` | Skills by category | `label` unique; index on `{ order }` |
| `Education` | `educations` | Education history | Optional years validated as a range; index on `{ order }` |
| `Certification` | `certifications` | Certificates | Required title, issuer, year; optional http(s) URL; index on `{ order }` |
| `Achievement` | `achievements` | Honours and awards | Required title and year; index on `{ order }` |
| `ContactMessage` | `contactmessages` | Private contact inbox | `read` defaults to false; indexes on `{ createdAt: -1 }` and `{ read, createdAt: -1 }`; never exposed publicly |

Shared rules: `timestamps` on every model, length limits on strings, email normalisation, http(s)-only URLs, and a small set of collection-specific indexes. `ensureModelIndexes()` calls each model's `init()`, which **creates missing indexes only** — it never drops a collection, index, or document, and it does not run `syncIndexes()`.

## Seeding portfolio content

```powershell
npm run seed:content
```

The script imports `frontend/src/data/portfolio.js` directly — there is no second copy of the content — and creates:

| Record | Expected count |
| --- | --- |
| Profile | 1 |
| Projects | 3 |
| Skill groups | 4 |
| Education | 0 |
| Certifications | 0 |
| Achievements | 0 |
| Contact messages | 0 |
| Administrators | unchanged |

**Why it is safe to repeat.** Each record is keyed by a stable identifier (`profile` key, project `slug`, skill-group `label`). The script checks for that identifier and only creates the document when it is missing. Existing documents are not written to at all, so edits made later in the admin dashboard are preserved, including their timestamps. Documents that are absent from the source file are never deleted, and administrators are never touched. If two seeds race, the unique index keeps one record and the script treats the duplicate-key error as “already exists”.

**What is deliberately not seeded.** Education, certifications, and achievements have no confirmed wording in the repository yet, so seeding them would mean inventing content. The profile `headline` remains empty for the same reason. The approved About paragraphs are bundled in `frontend/src/data/portfolio.js` as the public fallback, but the seed still writes `bio: []` so no unconfirmed text is stored in the database.

## Creating the administrator

There is no registration endpoint and no automatic account creation. Create the first administrator explicitly:

```powershell
npm run admin:create -- --email owner@example.com --name "Owner Name"
```

The script prompts for the password twice with hidden input. It requires **at least 12 characters**, hashes with **Argon2id**, stores only the hash, and refuses to create or overwrite an account whose email already exists. It never prints the password or the hash, and the password cannot be supplied as a command-line argument. For scripted local use, two password lines may be piped on stdin (see `npm run admin:create -- --help`), which is useful for testing against a disposable database.

The administrator is never created automatically at application startup. The owner must run this script explicitly after configuring a real `MONGODB_URI` and `SESSION_SECRET`. Keep the password in a password manager; the API only stores the Argon2id hash.

`.env` stays untracked; `.env.example` contains placeholders only (including a placeholder session secret that validation rejects).

## Running tests

```powershell
npm test
```

Or run one side at a time:

```powershell
npm run test:server
npm run test:frontend
```

The backend suite uses Node's built-in test runner and the real Mongoose model against **isolated** databases. By default it connects to:

```text
mongodb://127.0.0.1:27017/pradeep_portfolio_m4_test   # contact tests
mongodb://127.0.0.1:27017/pradeep_portfolio_m5_test   # authentication tests
mongodb://127.0.0.1:27017/pradeep_portfolio_m6_test   # admin overview and project CRUD tests
mongodb://127.0.0.1:27017/pradeep_portfolio_m7_test   # admin inbox, content, and profile tests
```

Override any of them with `TEST_MONGODB_URI`. Each suite refuses to run unless the database name ends in `_test`; they delete only their own collections (`contactmessages`, `admins`, `sessions`, `projects`, `skillgroups`, `educations`, `certifications`, `achievements`, and `profiles`) before and after the run. They never connect to, clear, drop, or write to `pradeep_portfolio`. MongoDB must be running.

The backend tests cover valid persistence, `read: false`, required fields, email shape and normalisation, subject-optional handling, length limits, unknown-field rejection, honeypot suppression, timing suppression, rate-limit `429` and headers, spoofed `X-Forwarded-For` handling, disconnected-database `503`, write-failure `500` with a log-safety assertion, safe error bodies, invalid JSON, oversized bodies, health, portfolio, and the absence of a public contact-read route.

The M5 authentication tests cover valid login, wrong password, unknown account, locked account, identical public errors for unknown/wrong credentials, safe admin fields, session-id rotation, `lastLoginAt`, MongoDB session persistence, login rate limiting, lockout at the configured threshold, expired-lockout recovery, counter reset on success, `/me` with and without a session, deleted-administrator rejection, logout and cookie clearing, the reusable `requireAuth` middleware, origin validation, cookie attributes, absence of an in-memory session store, and session-secret/password log safety.

The M6 admin tests cover unauthenticated rejection of the overview and every project route, the trusted-origin requirement on state-changing routes, the overview aggregate counts from the test database, listing seeded and newly created projects, creation with the stored document verified directly, reading one project, updating title/description/technologies, publishing and unpublishing, the public endpoint hiding unpublished projects while the admin list keeps them, rejection of invalid slugs, URLs, artwork, malformed ObjectIds, duplicate slugs, and forbidden fields, `404` for a nonexistent project, deletion followed by a confirming read, and the unique-slug index.

The M7 admin-content tests cover unauthenticated rejection of every new route, the trusted-origin requirement on every new mutation, inbox pagination metadata, newest-first ordering, the three read filters, the `50` limit cap, strict query rejection, read/unread persistence, strict update bodies, delete plus `404` for missing and malformed ids, the overview unread count following reads and deletes, and the absence of messages from the public payload. They also cover CRUD, ordering, and validation for skill groups (including duplicate labels and the public reflection of changes), education (required fields and the `endYear >= startYear` rule on create and partial update), certifications (including optional URLs), and achievements, plus profile creation and update without a duplicate document, partial-update preservation, URL/email validation, rejection of `key`/`_id`, and reflection through `GET /api/portfolio`. A final group re-checks health, portfolio, contact, and `503` behaviour.

The frontend suite uses Node's test runner with a mocked `fetch`; it does not render React. It covers the relative endpoint, request payload, success confirmation, validation-field propagation, malformed success responses, network failures, abort handling, and the absence of contact values in console output. It also covers the admin API client (relative admin paths, method and body wiring, `204` handling, field-error propagation, and shape validation that rejects malformed payloads), the project form helpers (slug generation and technology parsing), the M7 inbox and collection wrappers (query building, response-shape validation, `PUT` profile updates), and the shared content-form helpers (list parsing, record ↔ form conversion, payload building, numeric/year/URL validation, and the education cross-field rule). The M8 tests cover profile headline and biography normalisation (empty, malformed, over-long, and valid input), education/certification/achievement mapping (required fields, sorting by `order`, year bounds, reversed ranges, HTTP(S)-only certificate URLs, dropped malformed records), empty and missing collections, and the Background visibility, period-formatting, and About summary helpers. React components are additionally exercised in a browser (see below), not by a DOM test runner.

## Inspecting the database

With a local MongoDB:

```powershell
mongosh "mongodb://127.0.0.1:27017/pradeep_portfolio"
db.getCollectionNames()
db.projects.find().sort({ order: 1 }).pretty()
db.profiles.findOne()
db.skillgroups.find().sort({ order: 1 }).pretty()
db.admins.countDocuments()
db.contactmessages.find().sort({ createdAt: -1 })
db.sessions.countDocuments()
```

With Atlas, open the cluster in the Atlas UI or connect with your own connection string. Never paste a credential-bearing URI into documentation, screenshots, or logs.

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| `Invalid environment configuration` with `MONGODB_URI` | `.env` is missing at the repository root, or the variable is unset. Copy `.env.example` and fill it in. |
| `must start with mongodb://` | The URI uses the wrong scheme or is a placeholder that was not replaced. |
| `Database connection failed — the API was not started` (`ECONNREFUSED 127.0.0.1:27017`) | MongoDB is not running, or the host/port is wrong. Start the MongoDB service or check the URI. |
| Atlas connection times out or authentication fails | The cluster host, database user, password, or IP allowlist is wrong. Verify all four in Atlas. |
| `EADDRINUSE` on port 4000 | Another process is listening on 4000. Stop it or set a different `PORT`. |
| The API exits with code `1` and never listens | Working as designed: configuration or the database connection failed. Read the JSON log line for the cause. |
| Frontend looks out of date | Rebuild with `npm run build:frontend` and reload; `dist/` is generated and ignored by Git. |
| `GET /api/portfolio` returns `503 DATABASE_UNAVAILABLE` | MongoDB is not connected. Start MongoDB and check `/api/health`; the API refuses to serve content with a disconnected database. |
| Vite logs a proxy error for `/api/portfolio` and the browser gets a 500 | The API is not running on port 4000. Start it with `npm run dev:server` (or change the proxy target and API port together). |
| The page shows a development warning `[portfolio] API content unavailable` | Working as designed when the API is down: the bundled content remains visible. Start the API to serve database content, or ignore the warning if you only need the static site. |
| `POST /api/contact` returns `429 RATE_LIMITED` | Working as designed: five submissions from one IP address per hour. Wait for the window to pass or restart the development API to clear the in-memory limiter. |
| `POST /api/contact` returns `503 DATABASE_UNAVAILABLE` | MongoDB is not connected. Start MongoDB and check `/api/health`; the form will not report success without a save. |
| `npm run test:server` fails with `ECONNREFUSED 127.0.0.1:27017` | Start MongoDB, or set `TEST_MONGODB_URI` to a reachable isolated database whose name ends in `_test`. |
| The contact form says it could not reach the service while the API is stopped | Expected: Vite's proxy returns a failed request, and the form preserves the entered values so you can retry after starting `npm run dev:server`. |
| Rate limiting blocks every visitor behind a proxy | Set `TRUST_PROXY=true` on a single-proxy deployment so `req.ip` uses the forwarded client address; leave it `false` when the API is directly exposed. |
| The production preview shows bundled content instead of database content | Expected: `vite preview` does not apply the development proxy. Production same-origin API serving is a later milestone. |
| `E11000 duplicate key` while seeding | A document already uses that unique identifier (profile key, project slug, or skill-group label). The seed skips it and leaves it untouched; inspect it before changing anything. |
| `An administrator with that email already exists` | Working as designed. The script never replaces an account or its password; use a different email or manage the existing account deliberately. |
| Seeded content looks stale after editing `portfolio.js` | Seeding only creates missing records. Update already-seeded records through the admin workflow once it exists, or edit them in MongoDB deliberately. |
| `Invalid environment configuration` with `SESSION_SECRET` | `.env` is missing a session secret, the value is shorter than 32 characters, or the `.env.example` placeholder was not replaced. Generate a random value with the command in the environment table. |
| The API exits before listening after a valid `MONGODB_URI` | The session store or session configuration could not be created. Check the JSON log line; the API deliberately refuses to listen without valid authentication configuration. |
| `POST /api/auth/login` returns `403 FORBIDDEN_ORIGIN` | The `Origin` header is neither same-origin nor `CLIENT_ORIGIN`. Add the exact frontend origin to `CLIENT_ORIGIN` or serve both from one origin. |
| `POST /api/auth/login` returns `429 RATE_LIMITED` | Working as designed: five login requests per IP per fifteen minutes. Wait for the window or restart the development API to clear the in-memory limiter. |
| A correct password is rejected after several failed attempts | The account lockout is active (ten failed attempts, about fifteen minutes). Wait for the lockout to expire, or inspect and clear `failedAttempts`/`lockedUntil` deliberately if an administrator is locked out. |
| Login works but the browser does not keep the session behind a proxy | Set `TRUST_PROXY=true` behind exactly one HTTPS reverse proxy and ensure the proxy forwards `X-Forwarded-Proto`; production cookies are `Secure`. |
| Visiting `/admin` shows the sign-in page | Expected when there is no valid session. Sign in at `/admin/login`; the guard redirects unauthenticated visitors there. |
| `/admin/projects` shows "No projects yet" although the public site lists projects | Expected until the shared database has projects, or until you add them. The admin list shows the same records as the public site plus unpublished drafts; it never shows sample data. |
| Creating a project fails with "That slug is already in use" | Slugs are unique. Choose a different slug, or edit the existing project. |
| An admin request fails immediately after a long idle period | The session expired. The UI returns to `/admin/login`; sign in again. The cookie is `HttpOnly`, so no token exists in browser storage to refresh manually. |
| Opening `http://localhost:5173/admin/projects` directly in a fresh browser tab works, but a production host returns 404 | Expected limitation: the development server rewrites unknown paths to `index.html`, but a production static host must be configured to serve `index.html` for `/admin/*`. See the routing limitation note. |

## Frontend

### Run locally

```powershell
npm --prefix frontend run dev
```

Open the URL printed by Vite (usually `http://localhost:5173/`).

To view database-backed content through the Vite proxy, also run `npm run dev:server`. Without it, the proxy request fails and the bundled content stays visible.

Build and preview:

```powershell
npm --prefix frontend run build
npm --prefix frontend run preview
```

### Styling with Tailwind CSS v4

Tailwind is the primary styling system. It is wired in through the first-party Vite plugin, not PostCSS or a CLI build step:

- `frontend/vite.config.js` registers `@tailwindcss/vite`.
- `frontend/src/index.css` starts with `@import "tailwindcss";` and defines the design tokens in an `@theme` block.
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

### Design direction

- **Squarespace** informed the restrained typography, whitespace, and work-led composition.
- **Hostinger** informed the straightforward work/about/contact flow and mobile-friendly layout.
- The developer portfolio reference informed a personal introduction followed by visual project work.

These are design principles, not copied templates.

### Where to edit

- **Runtime content** comes from MongoDB through `GET /api/portfolio`. The React components read it from `PortfolioContext`, not directly from the data file.
- `frontend/src/data/portfolio.js` remains the bundled fallback **and** the source for the idempotent seed. Editing it changes the offline content immediately; run `npm run seed:content` to create any newly added records. Already-seeded database records are not overwritten, so update those deliberately (through the admin workflow once it exists, or in MongoDB) if the API should serve the change.
- Change the page order in `frontend/src/App.jsx`.
- Change the API request, response normalisation, or error handling in `frontend/src/api/`.
- Change colors, fonts, spacing scale, or breakpoints in the `@theme` block in `frontend/src/index.css`.
- Change a specific reusable UI piece in `frontend/src/components/` (`Container`, `Button`, `Brand`, `Arrow`, `DownloadIcon`, `Navbar`, `ProjectArtwork`, `ProjectEntry`, `TechnologyTags`).
- Change a major page region in `frontend/src/sections/`. The public background section is `Background.jsx`; its visibility rule, date formatting, and About education summary live in `backgroundContent.js` next to it.
- Change backend retrieval rules or field projections in `server/src/routes/portfolio.js`.

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
- The contact area pairs a direct email link with one accessible form: visible labels, required-field markers, inline error messages tied to their fields, a polite live status region, and a 47px submit target. Name and email share a row from 640px up; the message stays full width. The form panel uses the existing dark-section palette and a light button variant instead of introducing a second visual system.
- A filled honeypot or a submission timestamp younger than two seconds is accepted with the same `201` body as a real message but is not stored. The frontend hides the honeypot off-screen, removes it from the accessibility tree, and keeps it out of the tab order. These checks are layered with a five-per-hour IP limiter; they are not presented as complete spam prevention.
- The contact limiter uses an in-memory store and `TRUST_PROXY` is opt-in, so a deployment must explicitly declare that it sits behind one trusted proxy. This avoids both a shared-proxy IP bucket and blind trust of `X-Forwarded-For`.
- Contact messages are stored in MongoDB with `read: false` and are never exposed by a public read route. Email notification is intentionally deferred; a database outage returns `503` rather than a false success.
- Administrator authentication uses a MongoDB session store, an 8-hour host-only `HttpOnly`/`SameSite=Lax` cookie (`Secure` in production), and session-id rotation on login. The same `requireAuth` middleware will guard the M6 dashboard and CRUD routes; a frontend route guard is never treated as security.
- Login failures are deliberately indistinguishable: unknown email, wrong password, and lockout return the same `401 INVALID_CREDENTIALS` body, and one Argon2id verification runs in every path so timing does not reveal account existence. Ten failures lock an account for about fifteen minutes, reset by a successful login or an expired window.
- Authentication POSTs validate `Origin` against the request origin and `CLIENT_ORIGIN`; absent `Origin` is allowed for non-browser clients, and there is no wildcard CORS. `TRUST_PROXY` remains opt-in for exactly one trusted proxy so both the rate limiters and the production cookie see the real deployment.
- The greeting types itself once, then stays visible. With `prefers-reduced-motion: reduce` it appears instantly with no cursor and no typing.
- Interface icons are inline SVG, never emoji or text glyphs. The arrow characters (`→`, `↗`, `↑`) were replaced because Windows renders some of them (such as `↗`, U+2197) with emoji presentation, which is why the resume button once showed a blue emoji tile.
- The resume button is labelled "Download resume" and downloads the PDF (`download` attribute on a same-origin link), so the label matches the action.
- The header brand is a "PC" monogram beside the name; the letters are generated content so they stay out of the link's accessible name.
- Nothing in the showcase stands in for an application screen: there is no screenshot, no placeholder box, no stock imagery, no imitation window, and no fabricated metric. The drawings are labelled diagrams, and each entry ends at one real repository link.
- The public site renders the bundled portfolio immediately, then hydrates from `GET /api/portfolio`; a failed request leaves the bundled content untouched. Administrator authentication exists as an API-only milestone; the admin dashboard, CRUD endpoints, an admin message inbox, email notifications, image uploads, and production same-origin SPA serving arrive later.

## Accessibility and quality checks

Measured with Lighthouse against the production build:

| Category | Score |
| --- | --- |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

Layout was also measured inside same-origin frames at 320, 360, 375, 390, 414, 430, 540, 640, 768, 820, 1024, 1280, 1366, 1440, 1600, and 1920 pixels wide: no page reported horizontal overflow, the mobile menu appears below 768px, and content stays capped at a 1200px container on large screens.

The gallery was re-measured after the redesign, inside same-origin frames at 320, 360, 375, 414, 430, 480, 640, 768, 900, 1023, 1024, 1100, 1280, 1440, and 1920 pixels wide — once against the development server and again against the production build, which agreed to the pixel. No width reported horizontal overflow, `#work` rendered zero images, no text inside an illustration escaped its panel, every technology list stayed on one row, and each repository link measured 123x42px. The smallest label in any drawing measured 9.6px. The two supporting panels matched exactly wherever they share a row (528x250 at 1280px, 432x250 at 1024px) and their top edges aligned, while the featured panel measured 607x357 and stayed taller than either supporting panel. Section height runs from 2757px at 320px, where all three drawings stack, down to 1549px at 1280px.

M3 integration checks were run against the actual application:

- `GET /api/health` and `GET /api/portfolio` were exercised directly and through the Vite proxy; the proxied response matched the direct response.
- An isolated database verified that unpublished projects are excluded, education/certification/achievement records are shaped correctly, and administrator/contact records and password hashes never appear.
- Query failure and disconnected-database paths returned safe JSON (`500 INTERNAL_ERROR` and `503 DATABASE_UNAVAILABLE`) with no data and no stack trace.
- Swapping the development proxy to a deliberately modified test database changed the visible profile intro, project title, and skill item, proving the page was rendering API data rather than only the bundled fallback. The unpublished draft stayed hidden.
- Stopping the API and reloading left the full bundled portfolio visible, with one development warning and no retry loop. The same fallback was verified against the production preview, which has no development proxy.
- The integrated page was measured at 320, 375, 768, 1024, and 1440 pixels wide: no horizontal overflow, three projects, four skill groups, zero `<img>` elements, the mobile menu below 768px, and no text escaping an illustration panel. The mobile menu opened, closed on Escape, and returned focus to its toggle.
- The resume link returned `200` with `application/pdf`.

M4 contact checks were run against the actual application with an isolated `pradeep_portfolio_m4_live_test` database:

- `npm test` passed: **12 backend tests** and **6 frontend API-client tests**. The backend suite covered persistence, `read: false`, required fields, email shape/normalisation, subject-optional handling, length limits, unknown-field rejection, honeypot suppression, timing suppression, rate-limit `429` and headers, spoofed `X-Forwarded-For` handling, disconnected-database `503`, write-failure `500`, safe error bodies, invalid JSON, oversized bodies, health, portfolio, and the absence of a public contact-read route.
- Five live form submissions were saved in the isolated database with `read: false`, correct timestamps, and no `website`, `formStartedAt`, or `meta` fields. The documents were then deleted with `deleteMany`; the database was not dropped. The real `pradeep_portfolio` database still had **0** contact messages after the checks.
- Empty submission showed three inline errors, set `aria-invalid` on the affected fields, and moved focus to Name. The honeypot measured 1×1px, was clipped, had `aria-hidden="true"`, and had `tabIndex="-1"`. The focused field showed the accent focus ring.
- A successful submission returned `201` through the Vite proxy, showed “Your message has been received.” in the live region, and cleared all four fields. A stopped API showed “Could not reach the contact service…” and preserved every entered value. A held request showed `disabled`, `aria-busy="true"`, “Sending…”, and two synchronous `requestSubmit()` calls still produced exactly one request.
- The page was measured at 320, 360, 375, 390, 414, 480, 540, 640, 768, 820, 1024, 1280, and 1440 pixels wide: no horizontal overflow at any width, the form stayed inside its panel, the submit target stayed 47px tall, the mobile menu appeared below 768px, all three project cards remained, `#work` still rendered zero `<img>` elements, and the resume link still returned `200 application/pdf`.
- The production build passed: **46 modules**, JS `index-CwX6RrHn.js` (184.36 kB), CSS `index-Cl1eassL.css` (34.89 kB). The CSS hash changed because the contact form added styles; the existing public sections were not redesigned.
- Lighthouse against the production preview at `#contact` returned **100** for Accessibility, Best Practices, and SEO with no reported failures.

M6 admin checks were run against the actual application with an isolated `pradeep_portfolio_m6_browser_test` database and a disposable administrator created through `npm run admin:create`:

- `npm test` passed: **54 backend tests** (M1–M5 plus 23 new admin tests) and **20 frontend tests** (contact, auth API, admin API, and project-form helpers). The admin tests ran only against the `_test` database.
- A direct API run against the running server confirmed: unauthenticated admin requests → `401`; a foreign `Origin` → `403`; login → `200` with an `HttpOnly` cookie; create → `201`; the created project appeared in the public portfolio; read by id → `200`; unpublish → the public portfolio excluded it while the admin list kept it; duplicate slug → `409 SLUG_CONFLICT`; invalid artwork → `400` with an `artwork` field error; update → `200`; delete → `204` followed by `404`; logout → `204` and the next admin request → `401`.
- In the browser, `/admin/login` rendered labelled email and password fields (proper `<label for>` associations), a show/hide password control, and a visible focus ring. A wrong password stayed on the login page with the generic message "Invalid email or password." and disclosed nothing about whether the account exists.
- Signing in landed on `/admin` (Overview) with real counts from the database. The session survived a full page reload, and `GET /api/auth/me` returned `200` afterwards.
- `/admin/projects` listed database records (title, slug, category, technology summary, published state, featured state, order). The create form carried every field, rejected an empty submission with a form-level message plus four inline field errors marked `aria-invalid`, generated the slug `hostelcare-portal` from the title, and created the project, which then appeared in the admin list and in `/api/portfolio`.
- The row actions were exercised end to end: unpublish (the project left the public portfolio, stayed in the admin list, and the button changed to Publish), republish (the public portfolio included it again), edit (the updated title persisted and reached `/api/portfolio`), and delete (a confirmation dialog appeared, Cancel preserved the project, and confirming removed it with a `204`, an empty state, and an empty public portfolio).
- Signing out returned to `/admin/login` with `GET /api/auth/me` → `401` and **no entries** in `localStorage` or `sessionStorage`. Visiting `/admin/projects` while signed out redirected to `/admin/login`, and no protected content was shown.
- The public site still rendered its hero, `#work`, `#about`, and `#contact` sections, the `resume.pdf` link, the GitHub/LinkedIn/LeetCode links, and the footer; clicking Work set the URL to `/#work`. The `AdminRoot` chunk was **not** loaded on the public page, confirming the lazy split.
- The admin shell's responsive markup was verified (`lg:flex` desktop sidebar, `lg:hidden` mobile header, `lg:pl-64` content offset) at the available viewport widths. The desktop sidebar rendering at ≥1024px was not visually captured in this environment because the test browser viewport could not be resized; the mobile/tablet layout, the disclosure menu, the identity block, and sign-out were all exercised.

M7 admin checks were run against the actual application with an isolated `pradeep_portfolio_m7_browser_test` database, the existing content seed, and a disposable administrator created through `npm run admin:create`:

- `npm test` passed: **77 backend tests** (M1–M6 plus 23 new M7 tests) and **36 frontend tests** (contact, auth API, admin API, project-form and content-form helpers). The new backend tests ran only against the `_test` database.
- Signing in landed on `/admin` with live counts (3 projects, 3 published, 4 skill groups, 0 unread messages), and all eight navigation items were present. The session survived a full reload and no credential was written to `localStorage` or `sessionStorage`.
- `/admin/messages` listed three real contact submissions newest first with sender, email, subject, timestamp, and an Unread badge. Expanding a message revealed its full body and switched the control to `Hide message` (`aria-expanded`). Marking a message read flipped the badge and the button to `Mark unread` and showed a success message. The Unread filter then reported "2 messages" and hid the read one. Deleting opened a confirmation dialog with focus on Cancel, named the sender, and on confirm removed the message (`204`), closed the dialog, and left the remaining count correct. The overview then reported one unread message, matching the database.
- `/admin/skills` listed the four seeded groups in order with `Order n` badges; Move up was disabled on the first row and Move down on the last. Submitting the empty create form produced the form-level message plus "Enter a label." and "Add at least one skill." inline. Creating a group produced `201`, a success message, and a new row; editing it pre-filled every field, changed the label and order, and moved it to the top; Move down swapped it with the next row (two `PATCH` requests) and the new order was confirmed by re-reading `/api/admin/skill-groups`; deleting it required confirmation and restored the four seeded groups.
- `/admin/education` showed its empty state and created an entry with institution, qualification, field, and years. Entering an end year earlier than the start year was rejected in the form with "End year cannot be earlier than start year."; correcting it created the entry, which rendered the secondary line `B.Tech · Computer Engineering · 2025–2029`.
- `/admin/certifications` and `/admin/achievements` showed their empty states and created entries (a certification with an optional `https://` URL, and an achievement with a description); both rendered the expected summaries, confirmed with `201` and a success message.
- `/admin/profile` loaded the seeded profile with its real name, email, intro, location, links, and resume path. Submitting an invalid GitHub URL produced the inline "Enter a valid http or https URL." error and did not save. Correcting it, adding a headline and a biography paragraph, and saving showed "Your profile was saved."; the values survived a full page reload, and `GET /api/portfolio` returned the new headline and bio. Changing the location to a distinctive value and reloading the public site updated "Based in …" on the contact section, proving the public integration.
- `/admin/projects` still listed the three database projects with Edit / Unpublish / Delete, so the M6 flow was unaffected by the new pages. Every navigation item resolved to its own lazy chunk.
- The public site still rendered the hero, `#work` with the three published projects, `#about`, `#contact`, the resume link, and the social links, with no admin link in the public navigation or footer. No `Admin*` chunk was requested on the public page, confirming that dashboard code is still not part of the public bundle.
- Signing out returned to `/admin/login`; visiting `/admin/messages` while signed out redirected to the login page with no protected content, and `GET /api/auth/me` returned `401`.
- The isolated database and the temporary administrator were removed afterwards, and the real `pradeep_portfolio` database was re-checked: `admins: 0`, `contactmessages: 0`, `profiles: 1`, `projects: 3`, `skillgroups: 4`, `educations: 0`, `certifications: 0`, `achievements: 0` — unchanged.
- The test browser viewport was fixed at 1000px (the window could not be resized and no device-emulation tool was available). At that width the desktop table was rendered (`md:block`) and the stacked card list hidden (`md:hidden`), while the desktop sidebar was hidden and the mobile header plus disclosure menu were active (below the `lg` breakpoint). The ≥1024px desktop sidebar markup is unchanged from M6 and was not re-captured visually in this environment.
- The production build passed: 79 modules, with the public entry chunk unchanged in size and one lazy chunk per admin page (`AdminSkillsPage`, `AdminEducationPage`, `AdminCertificationsPage`, `AdminAchievementsPage`, `AdminMessagesPage`, `AdminProfilePage`, `AdminOverviewPage`, `AdminLoginPage`, plus the shared admin chunk).

M8 public-presentation checks were run against the actual application with an isolated `pradeep_portfolio_m8_test` database. The seeded profile, projects, and skills were reused; education, certification, achievement, and profile-biography records were inserted **directly into that test database** as clearly labelled sample content (no administrator was created and the admin UI was not re-exercised, since M7 already covers that CRUD path):

- `npm test` passed: **77 backend tests** and **52 frontend tests** (36 existing plus 16 new M8 tests), with **0 failures**. The backend suite still ran only against its own `_test` databases.
- With sample records present, `/` rendered the `Background.` region between About and Contact with the Education, Certifications, and Achievements subsections in that order. Education showed `B.E. · Computer Science Engineering`, `2023–2027`, the sample score and location; the deliberately long institution name wrapped instead of clipping. The certification with a URL rendered `target="_blank"` and `rel="noopener noreferrer"` with a visually hidden "(opens in a new tab)"; the certification without a URL rendered as plain text and produced no link. The achievement description appeared, and the achievement without one rendered only its title and year. Records followed the database `order`.
- The About section rendered the database biography paragraphs instead of the bundled copy, showed the sample headline under the About statement, kept the hero greeting/name/intro unchanged, and derived the one-line education summary (`Computer Science Engineering · Sample Institute of Technology · 2023–2027`) from the primary education record. There were no empty paragraphs.
- Clearing those records (leaving the profile headline and biography empty) and reloading removed the `#background` element and the `Background` navigation item entirely, restored the approved two-paragraph About copy and the bundled education line, and showed no empty heading. The hero, three projects, and four skill groups still rendered.
- With the API stopped, a fresh load kept the bundled biography, hero, projects, skills, and contact form visible, hid the Background section, and invented no records. Console output held one resource error and one development warning, with no uncaught error. Three `/api/portfolio` resource-timing entries were recorded during startup in development and the count was unchanged three seconds later, so there is no retry loop.
- Deep-linking to `/#background` with records present scrolled the section to `top: 96px` — the same `scroll-padding-top` used by the existing sections — and marked Background as the current item (`aria-current="location"`).
- Clicking the Background navigation item scrolled to the section with the same offset and active state. Scrolling to Work, About, Background, and Contact in turn moved the active marker to each, and at the very top no section link was marked (Home has no link), matching the existing behaviour.
- In a 375px-wide same-origin frame the mobile menu opened (`aria-expanded="true"`, links visible with 55px-tall touch targets), closed when the Background link was chosen, and closed on Escape with focus returned to the toggle. Because CSS smooth scrolling is throttled inside non-focused frames, the anchor's scroll itself was verified in the main viewport rather than asserted from the frame.
- Keyboard testing: pressing Tab from the last project link moved focus to the certification link, which matched `:focus-visible` and showed the accent focus ring.
- The page was measured inside same-origin frames at **320, 360, 375, 390, 430, 540, 640, 768, 820, 1024, 1280, 1366, 1440, and 1920 pixels** wide with the sample records present. No width reported horizontal overflow, no element in the header, About, or Background crossed either viewport edge, and no Background heading or paragraph was clipped. Education rows switched to the two-column layout at 768px, and certifications/achievements formed two columns from 768px.
- The production build passed: **81 modules**, public entry `index-*.js` **192.24 kB** (60.85 kB gzip), CSS **43.81 kB**, and the public page still requested no `Admin*` chunk.
- The test database was dropped afterwards, the temporary seed script, frame page, and Vite config were deleted, and the real `pradeep_portfolio` database was re-checked: `admins: 0`, `achievements: 0`, `certifications: 0`, `contactmessages: 0`, `educations: 0`, `profiles: 1`, `projects: 3`, `skillgroups: 4` — unchanged.

The test browser viewport was **785 CSS pixels** wide (a 1000px window at 80% zoom), so screenshots were not available and visual inspection relied on DOM text, computed styles, and the frame measurements above. The listed widths were genuinely measured through same-origin frames; widths above 1024px therefore exercise the responsive CSS but were not viewed on a physical monitor.

## Routing limitation for `/admin/*`

The administrator area is a client-side route. Vite's development server rewrites unknown paths to `index.html`, so `/admin`, `/admin/login`, `/admin/projects`, `/admin/messages`, `/admin/skills`, `/admin/education`, `/admin/certifications`, `/admin/achievements`, and `/admin/profile` work directly during development. A production static host **must** be configured to serve `index.html` for `/admin/*` (a single-page-application fallback), otherwise a direct visit or refresh on a deep admin path returns the host's `404`. This milestone does not include production hosting; the history-fallback rule is documented here so the owner configures it when the site is deployed. The same rule applies to any future client-side route.
