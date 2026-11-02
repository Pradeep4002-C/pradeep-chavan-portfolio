# Pradeep Chavan — Developer Portfolio

A full-stack portfolio with a public, content-managed site and a private
administrator dashboard. The React frontend and Express API share one origin in
production, and all portfolio content is stored in MongoDB.

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
│   │   └── validation/       Zod request schemas
│   └── tests/                API integration tests
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

## Security configuration

- Helmet security headers are enabled, and `x-powered-by` is disabled.
- Request bodies are JSON-only and limited to 32 KB.
- Administrator routes require both a valid session and authorization.
- State-changing authenticated requests require an allowed origin.
- Passwords are hashed with Argon2id; password hashes are never returned by the
  API.
- Sessions are stored in MongoDB and use secure, HTTP-only cookies in
  production.
- Login and contact endpoints are rate limited.
- Login responses are generic, and account lockout details are not exposed.
- Authentication and administrator responses are not cacheable.
- Public portfolio data is revalidated, so deleted or unpublished records do
  not remain visible indefinitely.
- Zod validates request payloads; public responses use explicit field
  projections so administrator data, messages, hashes, and internal IDs are not
  serialized.
- `.env` files are ignored. `.env.example` contains only placeholders.

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

- `frontend/docs/structure-guide.md` — frontend folders and ownership.
- `frontend/docs/design-notes.md` — visual and interaction decisions.
- `.env.example` — configuration reference with no secrets.
- `render.yaml` — Render Blueprint for the single-origin service.
