# Interview preparation

This guide is based on the code in this repository. It is written so the owner
can explain the project without claiming features that do not exist or results
that were not measured.

## 60-second explanation

> This is a full-stack portfolio with a public React site and a private
> administrator dashboard. The public page reads published content from an
> Express API backed by MongoDB. The dashboard uses a MongoDB-backed session and
> an Argon2id-hashed owner account, and it can manage projects, a profile, skills,
> education, certifications, achievements, and contact messages.
>
> I recently replaced a clipped project modal with a dedicated, page-scrolling
> editor at `/admin/projects/new` and `/admin/projects/:id/edit`. The editor
> protects unsaved changes and supports a structured workflow builder. The owner
> enters two to ten steps with a controlled type, and a reusable CSS/SVG renderer
> draws the same diagram in the editor preview and on the public site. It does not
> use AI or invent architecture. The three original illustrations remain
> compatible, and missing workflow data falls back to a neutral drawing.
>
> I also made development logs human-readable while keeping production logs as
> JSON, with redaction for secrets and MongoDB URIs. The backend and frontend have
> automated tests, including isolated MongoDB tests for workflow persistence and
> public serialization.

## Two-minute architecture walkthrough

```text
Browser
  ├─ public React app
  │    └─ GET /api/portfolio
  └─ lazy admin React app
       ├─ POST /api/auth/login
       ├─ GET /api/auth/me
       └─ /api/admin/*
              │
              ▼
           Express 5
              ├─ Helmet, JSON limit, rate limits, origin checks
              ├─ Zod validation
              ├─ session authentication
              ├─ Mongoose models
              └─ MongoDB content + sessions
```

In production, Express serves the built `frontend/dist` files and the API from
one origin. That avoids cross-origin cookies and gives a single deployable web
service. The admin bundle is loaded only for `/admin/*`, so public visitors do not
download router or dashboard code.

The public site treats the database as authoritative. If there are no published
projects, it shows an empty state; it does not restore seed data. That prevents a
deleted or unpublished project from reappearing.

## Public presentation decisions

- The page order is Hero → Work → Skills → About → Background → Contact, and the
  navigation repeats it. Projects come first because they are the evidence.
- The hero is static. I removed the typewriter greeting because it delayed the
  name, added no information, and pushed the actions below the fold on a small
  phone. The name is the `h1`, the role is a kicker, and the profile introduction
  says what I build.
- About is biography only. The degree, years, CGPA, and location live in
  Background, from the education record, so the same facts are not stated twice
  in two visual styles.
- Skills are grouped by category and rendered as text. There are no percentage
  bars or invented proficiency levels; the database stores names, not scores.
- A project shows a live-demo action only when its record has a valid HTTP(S)
  demo URL. Repository links are always real. I do not claim users, metrics,
  business impact, or deployment that the record does not contain.
- Responsive checks measured horizontal overflow, section heights, and hero
  action positions at 320×568, 375×667, 768×600, 1024×768, 1280×720, 1366×768,
  and 1440×900. I can describe the method without claiming a native device or a
  screen reader I did not use.

## Data and control flow questions

### Why did you replace the modal with a page?

The modal had a fixed viewport height and internal scrolling. On short or narrow
screens, fields and the save action could be clipped. A dedicated page can use
normal document scrolling, a clear heading and breadcrumb, visible sections, and
a sticky save bar. It also gives the workflow builder enough space to be usable.

### How do you prevent unsaved edits from being lost?

The editor tracks a serialized copy of the initial values and compares it with
the current values. It uses React Router's `useBlocker` in the admin data router,
so sidebar links, breadcrumb links, the Cancel button, and browser back trigger a
confirmation dialog. A `beforeunload` handler covers refresh and tab close. After
a successful save, a ref allows the intentional navigation back to the list.

### Why is the admin router a data router?

`useBlocker` requires a data router. `AdminRoot.jsx` now uses
`createBrowserRouter` and `RouterProvider`. The public app is unaffected and
still has its own separate React root.

### How does the editor load an existing project?

It calls `GET /api/admin/projects/:id` through `fetchProject` in
`frontend/src/admin/adminApi.js`. The server returns the approved admin project
shape, including workflow steps. The editor converts it to editable strings with
`valuesFromProject`. It does not rely on a stale list payload or bundled content.

### How does a project save work?

The editor validates locally, builds a payload containing only known fields, and
sends `POST` or `PATCH` to the authenticated admin API. Zod validates again.
Mongoose writes the document. The editor navigates back to `/admin/projects`
with a one-time success notice.

### Why validate on both client and server?

The client gives immediate feedback and highlights the right field. The server is
the security and data-integrity boundary; a caller can bypass the React form. The
Mongoose model adds persistence constraints such as enums, lengths, and a unique
slug index. The duplication is intentional, not accidental.

### How do partial updates preserve workflow data?

The update schema allows `workflow` to be omitted. The route assigns only keys
present in the request. If `workflow` is omitted, the stored workflow remains. If
`workflow: null` is sent, the route explicitly clears it. If `artwork` is changed
to `workflow` without sending a workflow, the route checks the stored document's
steps before saving.

## Workflow questions

### Why structured workflow steps instead of arbitrary SVG or HTML?

Arbitrary markup would be a security risk, hard to make accessible, and visually
inconsistent. A controlled vocabulary gives the owner enough expression while
keeping the renderer deterministic. The public renderer never interprets
administrator text as HTML, CSS, SVG, or a URL.

### What are the step types and why those?

`input`, `frontend`, `backend`, `database`, `service`, `process`, and `output`.
They cover common full-stack stages without implying a specific architecture.
The type selects a label, colour treatment, and glyph. It does not claim that a
project uses a particular technology.

### How do you prevent bad workflow data?

The client and server enforce:

- 2–10 steps;
- unique, lowercase-hyphen ids;
- title up to 120 characters;
- optional description up to 300 characters;
- a supported type enum;
- no `<` or `>` in titles or descriptions;
- no unknown step fields.

The Mongoose model also validates the subdocuments, and the update route checks
the combined stored document for `artwork: "workflow"`.

### What happens if workflow data is missing or malformed?

`normalizeWorkflow` in `frontend/src/components/workflow.js` drops unusable
steps. If fewer than two remain, the public renderer uses a neutral abstract
fallback. It does not borrow another project's illustration and does not invent
steps.

### How is the diagram accessible?

It is a `<figure>` with a caption and a semantic `<ol>`. Each step is a list
item containing the type, title, and optional description. The visual arrows are
`aria-hidden`. A screen-reader summary describes the step order. Colours are
paired with type labels and glyphs, not used as the only meaning. The editor
preview uses the same renderer.

### Why is the workflow not generated from the project name?

A generated diagram could look authoritative while being false. The owner knows
the real stages. The application stores only what the owner enters. That is an
honest-content decision, not just a technical one.

### How did you preserve existing artwork?

`ARTWORK_KEYS` retains `hostelcare`, `aquapredict`, and `expense` and adds
`workflow`. The original components are untouched. Old project documents without
a workflow field remain valid, and the public normalizer returns `null` for their
workflow.

## Security questions

### How are administrator sessions protected?

Login verifies an Argon2id hash. The server rotates the session id, stores the
session in MongoDB, and sets an HTTP-only cookie. `requireAuth` checks the session
and the administrator record on every admin request. Production cookies are
secure. Auth and admin responses use no-store caching.

### How do you stop CSRF?

State-changing admin and auth requests require an allowed origin through
`createRequireTrustedOrigin`. Cookies are same-site. The server does not rely on
the frontend route guard for authorization.

### What do you do with secrets in logs?

Callers must not pass secrets. The logger also redacts sensitive keys and scrubs
MongoDB URIs, Argon2 hashes, bearer tokens, cookie values, and password
assignments. The `.env` file is ignored. Documentation uses placeholders only.

### Why is the login response generic?

An unknown email and a wrong password return the same public response, so the
endpoint does not confirm which accounts exist. Lockout details are not exposed.
Failed attempts are rate limited by IP.

### What about the contact form?

The backend limits body size, validates with Zod, rate limits, checks a honeypot
and timing guard, and returns a generic confirmation. Contact bodies are stored
for the dashboard but never included in the public portfolio response or logs.

## Logging questions

### Why not use a logging library?

The requirements were modest: structured production output, readable development
output, redaction, and no ANSI when redirected. A small dependency-free logger
kept the dependency surface and configuration simple. A library would be
reasonable if the project needed transports, rotation, or sampling.

### How does development output differ from production?

Production always emits one JSON object per line. Development emits a timestamp,
level, message, and labelled metadata. Colour is used only on a TTY, never when
`NO_COLOR` is set or output is redirected. The log API is the same in both modes.

### What are the risks of custom redaction?

It cannot infer that arbitrary free text is private. The primary rule is still
“do not pass sensitive data to the logger.” Redaction is a second layer for
common keys and patterns. Tests cover passwords, hashes, cookies, bearer tokens,
emails, contact content, and MongoDB URIs.

## Testing questions

### What do the tests cover?

Backend tests cover public and admin APIs, authentication, authorization, origin
checks, contact handling, project CRUD, workflow validation and persistence,
public workflow serialization, existing artwork compatibility, production
serving, logger formatting, and secret redaction. Frontend tests cover API
wrappers, project editor validation and payloads, workflow normalization, and
public portfolio normalization.

### How are database tests isolated?

Every database-writing suite requires a database name ending in `_test`. The
suites create temporary administrators only in those databases. They never use
the real `pradeep_portfolio` database.

### What did you not test?

A full screen-reader or WCAG audit, every browser, every zoom level, Linux-native
Argon2 installation, and a live production deployment. The final report records
which viewports and tools were actually used. I do not claim more coverage than
that.

## Debugging scenarios

### The public Projects section is empty

Check `/api/health` and `/api/portfolio`. If the API is healthy, inspect the
database counts read-only and confirm at least one project is published. Do not
run a seed command against real content without owner approval. Do not restore
bundled projects in the frontend; that would hide the real database state.

### Saving a project returns a 400

Read the returned field map. Common causes are an invalid slug, a non-HTTP URL,
fewer than two workflow steps, an unsupported step type, or angle brackets in
workflow text. Compare `frontend/src/admin/projectForm.js` and
`backend/src/validation/project.js` if the client did not catch it first.

### The workflow card shows a neutral drawing

Open the project editor. Confirm there are 2–10 valid steps with titles, unique
ids, and supported types. The live preview uses the public renderer, so if it
looks wrong there, the saved data is wrong.

### The dashboard returns 401

The browser has no valid session, or the administrator record was removed. Sign
in again. If the account was deleted, create a new administrator deliberately;
do not disable authentication.

### The dashboard returns 503

The session middleware or database may be unavailable. Check startup logs,
`.env`, MongoDB reachability, and `/api/health`. A production startup without a
frontend build also refuses to run.

### Development logs look plain

That is expected when output is redirected or `NO_COLOR` is set. ANSI codes must
not be written into log files. Use the labels instead.

## Behavioural questions

### What was the hardest part?

The hard part was not drawing a workflow; it was keeping the data honest and
consistent. The editor, Zod schema, Mongoose model, admin serialization, public
projection, normalization, renderer, and tests all had to agree. Partial updates
and old records added edge cases. I treated the server as authoritative and
checked the combined stored document before saving an artwork change.

### What trade-off did you make?

I chose a controlled workflow vocabulary over arbitrary SVG. It is less flexible,
but it is safer, more accessible, and visually consistent. I also chose a larger
dedicated editor over a compact modal; it takes more screen space but never
clips the fields or save action.

### What would you do next?

I would add deeper automated browser coverage across viewports and a manual
screen-reader review. I would also verify the Render/Atlas deployment path rather
than implying it from a local build. These are planned improvements, not
completed features.

## Honest limitations to state

- This is a single-owner portfolio, not a multi-tenant product.
- There is no password reset, role hierarchy, or audit trail.
- Artwork is CSS/SVG code, not uploaded media.
- Workflow diagrams are owner-authored, not automatically generated.
- Local checks do not prove a remote deployment or Linux-native dependency
  installation.
- Browser checks are not a full assistive-technology audit.
- No traffic, user, revenue, or performance numbers are claimed because none were
  measured.

## Questions to ask the interviewer

- How does your team balance client-side UX validation with server-side
  contracts?
- How do you handle database-authoritative content when a collection is empty?
- What is your approach to accessible data visualizations?
- How do you test responsive admin flows without making tests brittle?
- What deployment and observability checks do you require before calling a
  release complete?
