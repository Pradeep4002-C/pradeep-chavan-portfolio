# Pre-Deployment Audit — Pradeep Chavan Portfolio

**Audit date:** 2026-11-06  
**Repository:** `C:\Users\Dell\Desktop\Portfolio_new`  
**Revision reviewed:** dirty working tree at `HEAD 4bb38ce`  
**Scope:** deployment readiness, security, correctness, performance/SEO/UX, code quality, and documentation.

This audit describes the **working tree**, not `HEAD`. At the start of the audit, `git status --porcelain` showed **26 modified and 8 untracked paths** (this report is the ninth untracked file). A Git-based deployment from the current branch will not include those changes unless they are committed. No source file was modified during the audit. `.env` was not opened, printed, copied, or quoted. No commit, push, deploy, seed, or real-database write was performed.

## Severity summary

| Severity | Count | IDs |
| --- | ---: | --- |
| Critical | 0 | — |
| High | 1 | F-01 |
| Medium | 4 | F-02, F-03, F-04, F-05 |
| Low | 6 | F-06, F-07, F-08, F-09, F-10, F-11 |
| **Total** | **11** | |

**Deployment gate:** F-01 is a deploy blocker. F-02 and F-03 should be fixed before treating the public work section and contact form as reliable.

## Findings

### F-01 — Production files are uncommitted, so the tested tree is not what Git deploys

| Field | Value |
| --- | --- |
| ID | F-01 |
| Severity | High |
| Area | Deployment / release integrity |
| File:line | `backend/src/index.js:3`; `frontend/src/App.jsx:7`; `frontend/src/sections/Hero.jsx:7`; `frontend/src/sections/Skills.jsx:4`; `frontend/public/resume.pdf` |
| Status | Open |

**What is wrong:** The working tree contains 26 modified and 8 untracked paths. The current entrypoints import untracked production source:

- `backend/src/index.js:3` imports `./startServer.js`, which is untracked.
- `frontend/src/App.jsx:7` imports `./sections/Skills.jsx`, which is untracked.
- `frontend/src/sections/Hero.jsx:7` imports `./heroCopy.js`, which is untracked.
- `frontend/src/sections/Skills.jsx:4` imports `./skillsContent.js`, which is untracked.
- `frontend/public/resume.pdf` is modified (409,999 bytes) and is therefore not in the deployed commit.

`git status` also shows untracked tests (`backend/tests/startup.test.js`, `frontend/tests/hero-copy.test.js`, `frontend/tests/public-page.test.js`, `frontend/tests/skills-content.test.js`) and modified tracked files including `Work.jsx`, `PortfolioContext.jsx`, `api/portfolio.js`, `AdminOverviewPage.jsx`, and several docs.

**Why it matters:** Render builds from a Git commit. Uncommitted files are absent from that build. If only the modified tracked files are committed, the imports above fail and the backend or frontend build breaks. If `HEAD` is deployed instead, the live site runs the older implementation and does not include the modified resume or the current fixes. The tested state and the deployed state are different.

**Recommended fix:** Review the full diff, stage every production-relevant tracked and untracked file (source, tests, docs, and the reviewed resume), and exclude `.env` and any secret. Then verify from a clean clone of the commit:

```bash
npm run install:all
npm test
npm run build:frontend
```

Commit and deploy that exact commit. Check the Render build log for missing-module or startup errors.

**Estimated risk of fix:** **Low** for the Git operation itself; **Medium** procedurally, because a partial stage can omit an untracked import or accidentally include a local secret. Use `git status` and a fresh-clone build as the gate.

---

### F-02 — More than one featured project silently drops projects from the public Work section

| Field | Value |
| --- | --- |
| ID | F-02 |
| Severity | Medium |
| Area | Correctness / content management |
| File:line | `frontend/src/sections/Work.jsx:20-21,66`; `frontend/src/admin/ProjectEditorPage.jsx:596-604`; `backend/src/validation/project.js:182,214`; `backend/src/models/Project.js:159-162` |
| Status | Open |

**What is wrong:** `Work.jsx` selects only the first featured project with `projects.find((project) => project.featured)`, then filters **all** featured projects out of the supporting list with `projects.filter((project) => !project.featured)`. The administrator editor offers a `Featured project` checkbox independently for every project (`ProjectEditorPage.jsx:596-604`), and both create and update validation accept `featured` (`validation/project.js:182,214`). The Mongoose field is a plain Boolean with no uniqueness rule (`models/Project.js:159-162`). If two published projects are marked featured, only the first one renders and the second disappears entirely.

The design intent is one featured project (`frontend/docs/design-notes.md:15`), but that intent is not enforced by the API or the editor. Existing tests only exercise one featured project (`frontend/tests/public-page.test.js:73,87,101,194-204`).

**Why it matters:** An administrator can publish a project that never appears on the public site. The dashboard gives no warning, so content loss is silent. It also makes ordering and "featured" semantics ambiguous.

**Recommended fix:** Choose and enforce one invariant.

- **Preferred:** allow at most one featured project. When a project is saved with `featured: true`, unset `featured` on all other projects in the same operation (transaction or ordered `updateMany` plus save). Handle concurrent writes. Add a partial unique index on `featured` if the data model supports it, after checking for existing duplicates.
- **Alternative:** render every featured project, and change the design/docs to match.

In either case, add a test with two featured published projects and update the editor copy to explain the behavior.

**Estimated risk of fix:** **Medium** — changes write semantics and concurrency behavior; a unique index can fail on existing duplicate data and needs a cleanup/migration step.

---

### F-03 — Client-clock contact timing can silently discard legitimate messages

| Field | Value |
| --- | --- |
| ID | F-03 |
| Severity | Medium |
| Area | Correctness / contact form |
| File:line | `frontend/src/sections/Contact.jsx:83,169`; `backend/src/validation/contact.js:88-96`; `backend/src/routes/contact.js:52-56`; `backend/tests/contact.test.js:194-223` |
| Status | Open |

**What is wrong:** `Contact.jsx:83` captures `Date.now()` when the component mounts and sends it as `formStartedAt` at submit (`Contact.jsx:169`). The backend requires an integer timestamp that is not in the future and is at least 2 seconds old:

- `backend/src/validation/contact.js:88-96` rejects `value > now` and `now - value < MIN_FORM_AGE_MS` (2,000 ms).
- `backend/src/routes/contact.js:52-56` returns `201` with the normal success message and stores nothing when the timing check fails.
- `backend/tests/contact.test.js:194-223` explicitly asserts that future and too-fast values receive 201 and leave zero stored messages.

A client clock that is even slightly ahead of the server, or a user who submits within two seconds of page load, is therefore treated as spam. The UI shows the same success message as a stored message.

**Why it matters:** Legitimate messages are lost without any way for the visitor or owner to know. Device clock skew is common, and fast submissions are possible with autofill. The check is also weak anti-bot protection: an automated client can simply send an old timestamp.

**Recommended fix:** Make the timing signal server-issued or tolerant.

- Prefer a server-issued challenge/timestamp (for example, a signed value returned by a `GET` endpoint or set in a short-lived cookie) that the client echoes back.
- If a client value must be used, tolerate reasonable clock skew (for example, `value <= now + 5 minutes`) and reduce the minimum age to a value that real users can meet. Treat only grossly future, missing, or malformed values as spam.
- Keep the honeypot and rate limit as the primary anti-automation controls.
- Add tests for a clock-ahead client and a fast real submission, and monitor suppressed submissions without logging personal content.

**Estimated risk of fix:** **Medium** — changes anti-spam behavior, contact validation, tests, and possibly a new endpoint or cookie; needs staging verification.

---

### F-04 — Clearing optional profile fields does not clear them on the public site

| Field | Value |
| --- | --- |
| ID | F-04 |
| Severity | Medium |
| Area | Correctness / content management |
| File:line | `frontend/src/api/portfolio.js:82-121`; `frontend/src/admin/AdminProfilePage.jsx:217-228`; `backend/src/validation/content.js:89-99,355-380`; `backend/tests/admin-content.test.js:192-194`; `frontend/tests/portfolio-content.test.js:212-220` |
| Status | Open |

**What is wrong:** `normalizeProfile` starts with the bundled `fallbackProfile` and only applies an API value when it is truthy (`api/portfolio.js:104-108`). The administrator form sends empty strings for cleared optional fields (`AdminProfilePage.jsx:217-228`), and the backend explicitly permits `''` for URLs and resume paths (`validation/content.js:355-380`; `optionalUrlField` accepts `''`). As a result, clearing `intro`, `location`, `github`, `linkedin`, `leetcode`, or `resumePath` in the dashboard leaves the bundled fallback value visible on the public site. An empty biography likewise keeps the approved About copy, which is explicitly tested (`portfolio-content.test.js:212-220`). `headline` is the exception because it has no bundled fallback.

**Why it matters:** The dashboard appears to save the change, but the public page still shows the old introduction, location, social links, or resume path. Stale personal or contact information can remain public even after the owner tries to remove it. The behavior is inconsistent across fields.

**Recommended fix:** Define clear empty-value semantics. Prefer using fallback copy only when no profile record exists (`apiProfile === null`), and when a profile exists, treat an empty optional field as intentionally empty and hide it in the UI. Keep `name` and `email` required. For `bio`, decide explicitly whether an empty array hides the paragraphs or restores approved copy; if fallback is intentional, label it in the editor and keep the test. Add tests that clear each optional field and assert the public result.

**Estimated risk of fix:** **Medium** — changes public copy and existing tests; the biography behavior is a product decision.

---

### F-05 — Profile editor has no unsaved-changes guard

| Field | Value |
| --- | --- |
| ID | F-05 |
| Severity | Medium |
| Area | UX / administrator safety |
| File:line | `frontend/src/admin/AdminProfilePage.jsx:176-178,196-258,274-280`; compare `frontend/src/admin/ProjectEditorPage.jsx:111-132`; `frontend/src/admin/AdminRoot.jsx:12-14,27` |
| Status | Open |

**What is wrong:** The profile page has no dirty tracking, `useBlocker`, or `beforeunload` guard. The `Reload` button (`AdminProfilePage.jsx:274-280`) and sidebar/breadcrumb navigation can discard edits without confirmation. The project editor already implements the pattern: a `dirty` comparison, `useBlocker`, and a `beforeunload` listener (`ProjectEditorPage.jsx:111-132`). `ResourceManager.jsx:120` also warns with `window.confirm` before discarding unsaved changes. The admin uses a data router specifically so `useBlocker` is available (`AdminRoot.jsx:12-14,27`).

**Why it matters:** The owner can lose a long profile or biography edit by clicking a navigation link or reloading. The inconsistency with the project editor makes the risk easy to overlook.

**Recommended fix:** Track the loaded snapshot and compare it with current values and paragraphs. Block router navigation with `useBlocker` and warn on tab close with `beforeunload`. Confirm before the `Reload` action replaces local edits. Reset the snapshot after a successful save. Reuse or extract the project editor's pattern. Add a focused UI test or a manual acceptance step.

**Estimated risk of fix:** **Low** — localized UI change; watch for false positives and clear the guard after save.

---

### F-06 — SEO and social metadata are incomplete; robots policy is too broad

| Field | Value |
| --- | --- |
| ID | F-06 |
| Severity | Low |
| Area | SEO / social sharing |
| File:line | `frontend/index.html:7-18`; `frontend/public/robots.txt:1-2` |
| Status | Open |

**What is wrong:** `frontend/index.html` has a description and basic `og:type`, `og:title`, and `og:description`, but no canonical URL, `og:url`, `og:image` (including dimensions/alt), or Twitter card metadata. `frontend/public/robots.txt` is only:

```text
User-agent: *
Allow: /
```

It allows crawling of `/admin` and `/api` and does not reference a sitemap. There is no `frontend/public/sitemap.xml`; the public directory contains only `favicon.svg`, `resume.pdf`, and `robots.txt`.

**Why it matters:** Link previews on social platforms are plain or missing images, search engines receive weaker canonical signals, and crawl budget is spent on private dashboard and API paths. There is no sitemap for discovery.

**Recommended fix:** After the final public origin is known, add an absolute canonical link, `og:url`, a real 1200×630 `og:image`, and Twitter `summary_large_image` metadata. Update `robots.txt` to disallow `/admin` and `/api`, reference the sitemap, and add a sitemap containing the public sections only. Note that `robots.txt` is not access control; the admin remains protected by authentication. Validate with the major social debuggers and Lighthouse.

**Estimated risk of fix:** **Low** — static metadata; requires the final domain and an image asset.

---

### F-07 — Admin accent text on the soft accent background fails WCAG AA contrast

| Field | Value |
| --- | --- |
| ID | F-07 |
| Severity | Low |
| Area | Accessibility / visual design |
| File:line | `frontend/src/index.css:15-16`; `frontend/src/admin/AdminLayout.jsx:21-22`; `frontend/src/admin/AdminMessagesPage.jsx:37,196-199`; `frontend/src/admin/AdminUi.jsx:47` |
| Status | Open |

**What is wrong:** `--color-accent: #6c55e8` on `--color-accent-soft: #ece8ff` computes to **4.28:1**, below the WCAG AA 4.5:1 threshold for normal text. The combination is used for:

- the active admin navigation link (`AdminLayout.jsx:21-22`, `text-sm` semibold),
- the unread message badge (`AdminMessagesPage.jsx:37`, `text-xs` semibold),
- the selected message filter (`AdminMessagesPage.jsx:196-199`, `text-sm` semibold),
- the `Admin` pill (`AdminUi.jsx:47`, `0.65rem` bold).

All are normal-size text, not large text. The accent on the paper background is 4.73:1 and passes, so the failure is specific to the soft accent background.

**Why it matters:** Low-vision users may not be able to read active navigation, filters, or status badges. This is a WCAG AA failure in the private dashboard.

**Recommended fix:** Use a darker text color on `bg-accent-soft` (for example `text-ink`, or a new `--color-accent-strong` checked against the soft background), or lighten the background. Keep the brand accent for large text and graphics. Recheck hover/focus states and measure with a contrast tool.

**Estimated risk of fix:** **Low** — token/class change; visually verify all four locations.

---

### F-08 — Documentation drift: project sort order and frontend file tree are inaccurate

| Field | Value |
| --- | --- |
| ID | F-08 |
| Severity | Low |
| Area | Documentation / maintainability |
| File:line | `backend/src/routes/portfolio.js:45`; `docs/ARCHITECTURE.md:57`; `docs/PROJECT_GUIDE.md:208-209,315`; `frontend/docs/structure-guide.md:20-31,60-84` |
| Status | Open |

**What is wrong:** The docs say published projects are sorted by order and then **title** (`docs/ARCHITECTURE.md:57`; `docs/PROJECT_GUIDE.md:208-209,315`). The implementation sorts by `{ order: 1, slug: 1 }` (`backend/src/routes/portfolio.js:45`). Separately, the frontend structure tree omits existing files: `frontend/tests/hero-copy.test.js`, `frontend/src/components/WorkflowArtwork.jsx`, `frontend/src/components/workflow.js`, and `frontend/src/sections/heroCopy.js`.

**Why it matters:** A maintainer debugging ordering will look for title sorting that does not exist. The structure guide is the entry point for new contributors and is now incomplete.

**Recommended fix:** Decide whether slug or title is the intended secondary sort. Either change `portfolio.js:45` to `{ order: 1, title: 1 }` or update the three doc references to slug. Add the missing files to `structure-guide.md`. Keep the docs and tests aligned.

**Estimated risk of fix:** **Low** — documentation-only, unless the sort order is changed in code.

---

### F-09 — No lint, formatting, or CI gate

| Field | Value |
| --- | --- |
| ID | F-09 |
| Severity | Low |
| Area | Code quality / release process |
| File:line | `package.json:10-24`; `frontend/package.json:9-14`; `backend/package.json:10-14`; no `.github/workflows`, ESLint, or Prettier configuration exists |
| Status | Open |

**What is wrong:** The root, frontend, and backend scripts contain dev, build, start, seed, and test commands, but no `lint` or `format:check` command. There is no `.github/workflows` directory and no ESLint or Prettier configuration. Tests and the production build are run manually.

**Why it matters:** Nothing enforces that a commit compiles, passes tests, or follows the existing style before deployment. The uncommitted-tree issue in F-01 is an example of a release-integrity gap that CI would surface.

**Recommended fix:** Add an ESLint flat config and Prettier config, with `lint` and `format:check` scripts in each package. Add a CI workflow that runs `npm run install:all`, `npm test`, and `npm run build:frontend` on pushes and pull requests, and make deployment depend on it. Introduce rules incrementally if the initial backlog is large.

**Estimated risk of fix:** **Low** — tooling only; initial lint output may require cleanup.

---

### F-10 — Account lockout can be abused to deny the owner dashboard access

| Field | Value |
| --- | --- |
| ID | F-10 |
| Severity | Low |
| Area | Security / availability |
| File:line | `backend/src/config/auth.js:1-3`; `backend/src/routes/auth.js:50-73,127-139`; `backend/src/middleware/authRateLimit.js:3-6` |
| Status | Open |

**What is wrong:** After 10 failed attempts, the administrator account is locked for 15 minutes (`config/auth.js:2-3`; `routes/auth.js:50-73`). The login IP limiter allows 5 failed attempts per IP per 15 minutes (`middleware/authRateLimit.js:3-6`). An attacker who knows the owner's email can use multiple source IPs, or a second window, to reach 10 failures and lock the account. While locked, the route performs a hash verification and returns a generic 401 (`routes/auth.js:127-139`); there is no owner notification or documented self-service or CLI unlock path.

**Why it matters:** Repeated lockouts deny the owner access to the dashboard and can be triggered cheaply. This is an availability issue rather than a data breach, but it can block content updates or incident response.

**Recommended fix:** Keep generic login responses, but add an owner notification and a documented recovery path (for example, `npm run admin:unlock`). Consider per-account-plus-IP throttling, progressive delays, or a shorter initial lockout with exponential backoff instead of a flat 15-minute denial. Document the policy and test recovery against an isolated database.

**Estimated risk of fix:** **Medium** — changes authentication policy and security trade-offs; test carefully in a disposable database.

---

### F-11 — Unknown public URLs return raw JSON instead of a branded 404 page

| Field | Value |
| --- | --- |
| ID | F-11 |
| Severity | Low |
| Area | UX / SEO |
| File:line | `backend/src/frontend.js:84-85`; `backend/src/app.js:99-102`; `backend/tests/production-serving.test.js:169-239` |
| Status | Open |

**What is wrong:** The SPA fallback only matches `/` and `/^\/admin(?:\/.*)?$/` (`frontend.js:84-85`). Every other unknown public URL falls through to the JSON `notFound` middleware (`app.js:99-102`). A visitor who follows a stale, mistyped, or bookmarked URL such as `/projects/hostelcare` receives a JSON error body rather than a branded page. Existing tests intentionally assert JSON 404 for unknown paths (`production-serving.test.js:169-239`).

**Why it matters:** Visitors see what looks like a broken API response instead of a useful "page not found" page. Search engines may index or report the JSON error, and the site loses an opportunity to route visitors back to real content.

**Recommended fix:** Add a branded public 404 response for HTML navigations, returned with status 404 (a static `404.html`, or a catch-all SPA route that renders a not-found page and sets `noindex`). Keep JSON 404s for `/api/*` and missing static assets. Add tests for an unknown public page, an unknown API path, and a missing asset.

**Estimated risk of fix:** **Low** — routing-only change; be careful to avoid soft-404s by preserving the 404 status.

---

## Verified OK

| Area | Result | Evidence |
| --- | --- | --- |
| Secrets in the current tree | OK | `.gitignore:8-12` ignores `.env` and `.env.*` while keeping `.env.example`; `.env.example:21-39` contains placeholders only. A source scan found no hardcoded credentials. `backend/src/config/env.js:34` is a MongoDB URI validation regex, not a credential. `.env` was not opened. |
| Environment validation | OK | `SESSION_SECRET` must be at least 32 characters and rejects common placeholders (`backend/src/config/env.js:36-42`); `MONGODB_URI` is required and scheme-checked; `TRUST_PROXY` is an explicit boolean. |
| Security headers and body limits | OK | Helmet is enabled, `x-powered-by` is disabled, and JSON bodies are limited to 32 KB (`backend/src/app.js:37-48`). Trust proxy is applied only when configured (`backend/src/app.js:39-43`). |
| Session security | OK | Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production (`backend/src/config/session.js:39-46`). Sessions use a MongoDB store with no in-memory fallback, 8-hour TTL, `resave: false`, and `saveUninitialized: false` (`session.js:5,29-36,95-114`). Login rotates the session ID before storing the admin ID and saves before responding (`backend/src/routes/auth.js:143-149`). |
| Authentication | OK | Passwords are Argon2id; unknown accounts use a dummy verification to reduce timing differences (`backend/src/routes/auth.js:120-125`). Responses are generic. `requireAuth` checks session expiry, database availability, and that the administrator still exists (`backend/src/middleware/requireAuth.js:29-60`). |
| Origin / CSRF protection | OK | No wildcard CORS. The trusted-origin middleware allows same-origin, configured client origin, and requests without an Origin header, and rejects everything else (`backend/src/middleware/requireTrustedOrigin.js:25-35`). State-changing admin routes use it. |
| Validation and error handling | OK | Zod schemas are strict and reject unknown keys. Public responses use explicit field projections (`backend/src/routes/portfolio.js:37-63`). 5xx responses are generic (`backend/src/middleware/errorHandler.js:26-40`), and log metadata is redacted/scrubbed (`backend/src/lib/logger.js:77-135`). |
| Public content fallback | OK | When the database is empty, projects and skills stay empty instead of restoring bundled seed data (`frontend/src/PortfolioContext.jsx:14-33`; `frontend/src/api/portfolio.js:21-28`). Background records are hidden when all three collections are empty (`frontend/src/sections/backgroundContent.js:21-25`). |
| XSS and unsafe links | OK | No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `new Function`, `eval(`, `localStorage`, `sessionStorage`, or `document.cookie` in frontend source. React escapes rendered text. External links use `rel="noopener noreferrer"` or `rel="noreferrer"` where relevant (`ProjectEntry.jsx:73-101`; `Footer.jsx:22-33`; `Hero.jsx:155-167`). URLs are restricted to `http`/`https` and asset paths to relative, non-escaping paths (`frontend/src/api/portfolio.js:38-60`). |
| Caching and serving | OK | Public portfolio responses revalidate (`backend/src/routes/portfolio.js:19-23`); authenticated/admin responses are `no-store` with `Vary: Cookie` (`backend/src/middleware/privateApiCache.js:9-12`). Fingerprinted assets are immutable while `index.html`, favicon, resume, and robots are revalidated (`backend/src/frontend.js:15-19,74-85`). Unknown API paths are handled before static serving (`backend/src/app.js:85-96`). |
| Startup and production fail-closed behavior | OK | Production refuses to start without a frontend build (`backend/src/startServer.js:90-98`), connects to MongoDB before listening, and has graceful shutdown handling. `/api/health` is the Render health check. |
| Render configuration | OK | `render.yaml:10-33` defines a single-origin Node web service, the correct build/start commands, `/api/health`, `NODE_ENV=production`, `TRUST_PROXY=true`, a secret `MONGODB_URI` with `sync: false`, and a generated `SESSION_SECRET`. `PORT` is not set, as Render supplies it. No secret is committed. |
| Build chain and lockfiles | OK | Root scripts orchestrate install/build/start (`package.json:10-24`). Both packages have lockfiles; `npm ci --dry-run --ignore-scripts` reported the lockfiles are in sync (the frontend dry-run only listed platform-specific optional packages). `.node-version` is `22.20.0`. |
| Dependency health | OK | `npm audit` reported **0 vulnerabilities** in both packages; `npm ls --depth=0` was clean. |
| Existing tests | OK | Backend: **106 passing**. Frontend: **86 passing**. Production frontend build: **passing**. Backend API tests use isolated databases ending in `_test` and explicitly refuse `pradeep_portfolio` (`backend/tests/admin.test.js:22-26`; `backend/tests/admin-content.test.js:24-28`). |
| Production serving coverage | OK | Existing tests cover `/` and all admin routes, immutable assets, revalidation, missing assets, unknown API paths, and the unbuilt-frontend case (`backend/tests/production-serving.test.js:89-239`). |

## Needs verification

| Item | Why it needs verification | How to verify |
| --- | --- | --- |
| Resume PDF content and version | `frontend/public/resume.pdf` is modified and 409,999 bytes; the audit did not open it. It may contain outdated or private information. | The owner should review the PDF, confirm contact details and links, then commit the exact version intended for publication. |
| Actual Render deployment | Configuration was reviewed statically; no deployment was performed. | Deploy from the clean commit, watch the build log, and open `/api/health`, `/`, `/admin/login`, and `/api/portfolio`. Confirm no missing-module or startup errors. |
| Atlas connectivity and network access | No production database was contacted. | In Atlas, confirm the database user, role, database name, TLS, and network access rule. Confirm Render logs show a successful connection. |
| Production seed and owner account | No seed or admin creation was run, and no real database was changed. | After review, run `npm run seed:content` and `npm run admin:create` against the intended production database from a trusted environment. Never put these in the build command. Confirm counts and that no duplicate profile was created. |
| Contact delivery after F-03 | Timing behavior depends on client clocks and submission speed. | In staging, test a clock-ahead client, a clock-behind client, a fast submit, and a normal submit. Confirm the message is stored and visible in the dashboard; verify rate limiting. |
| Cookie and proxy behavior on Render | The code and Blueprint are correct statically, but the live headers depend on Render. | In browser devtools, confirm `Set-Cookie` has `Secure`, `HttpOnly`, and `SameSite=Lax`; confirm HTTPS and no redirect loop; check `req.protocol` behavior through the proxy. |
| Rate limiting and real client IP | `TRUST_PROXY=true` is set; actual `req.ip` behavior must be confirmed. | On staging, verify 429 responses and that `X-Forwarded-For` cannot be spoofed to bypass the limiter. Do not brute-force production. |
| SEO canonical/OG/sitemap | The final public origin and social image do not exist yet. | After F-06, validate with the Facebook, X/Twitter, and LinkedIn debuggers, Lighthouse, and a sitemap validator. |
| Accessibility fix F-07 | The contrast ratio was computed statically; rendered states still need review. | Run axe or Lighthouse, check keyboard focus states, and measure the new token combination with a contrast checker. |
| Browser, mobile, and reduced-motion UX | The audit was static; no cross-browser session was run. | Test Chrome, Firefox, and Safari at mobile widths, with keyboard navigation, 200% zoom, and `prefers-reduced-motion`. |
| Admin lockout recovery | No production lockout was attempted. | In an isolated/staging database, trigger the lock, confirm the response, and test the documented unlock or notification path. |
| Backups, restore, and monitoring | These are hosting/operational settings, not repository code. | Enable Atlas backups, perform a restore test, configure Render alerts/log streaming, and document the recovery procedure. |
| CI enforcement | No CI configuration exists. | Add the workflow from F-09 and verify it runs on a pull request before enabling branch protection. |
| Deployed asset freshness | Local `frontend/dist` exists, but Render rebuilds it. | Confirm the deployed `index.html` references the current hashed asset names and that a new deploy changes them. |
| Secrets in Git history | The current tree is clean, but history was not scanned. | Run a secret scanner over the repository history before making the repository public or connecting a new host. |
| Privacy/retention for contact messages | Messages are stored in MongoDB; no retention policy was found. | Decide how long messages are kept, document deletion, and ensure the dashboard owner knows how to delete them. |

## Render deployment checklist

### Exact service settings

| Setting | Required value or action |
| --- | --- |
| Service type | Web Service |
| Runtime | Node |
| Plan | `free` per `render.yaml:14`; choose a paid plan if cold-start latency or availability matters |
| Repository / branch | The repository and branch containing the committed source from F-01 |
| Root directory | Repository root (default; leave blank) |
| Build command | `npm run install:all && npm run build:frontend` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Node version | `22.20.0` via `.node-version` (or set `NODE_VERSION=22.20.0` in the dashboard) |
| Auto-deploy | On commits to the chosen branch, ideally after CI passes |
| Persistent disk | Not required; the app is stateless and stores content/sessions in MongoDB |

### Exact environment variables

| Variable | Value / handling |
| --- | --- |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` |
| `MONGODB_URI` | Secret. Atlas connection string including the intended database name. Enter in the Render dashboard; `sync: false` in the Blueprint. Never commit it. |
| `SESSION_SECRET` | Secret. Let Render generate a 256-bit value (`generateValue: true`) or supply at least 32 random characters. Never commit it. |
| `PORT` | **Do not set.** Render supplies it. |
| `CLIENT_ORIGIN` | Leave unset/empty for the single-origin production setup. Set it only if the frontend is moved to a different origin. |

### Pre-deploy steps

1. Resolve F-01. Review `git status`, stage all production source, tests, docs, and the reviewed resume, and confirm `.env` is untracked.
2. From a clean clone of the exact commit, run `npm run install:all`, `npm test`, and `npm run build:frontend`.
3. Confirm `frontend/dist/index.html` exists and references the expected hashed assets.
4. Confirm the Atlas cluster, database user, database name, TLS, and network access rule. Confirm the URI targets the intended database.
5. Enter `MONGODB_URI` and `SESSION_SECRET` in Render. Confirm `NODE_ENV`, `TRUST_PROXY`, build command, start command, health check, and Node version. Leave `PORT` unset and `CLIENT_ORIGIN` empty.
6. Deploy the clean commit and watch the build and startup logs.

### Post-deploy steps

1. `GET /api/health` returns 200.
2. `/` returns the HTML portfolio; `/admin/login` returns the admin login page; `/api/portfolio` returns the expected public data.
3. `/api/<unknown>` returns JSON 404; a missing asset returns a non-HTML 404.
4. Sign in as the owner, confirm the session cookie is `Secure`, `HttpOnly`, and `SameSite=Lax`, and confirm logout invalidates the session.
5. Submit a contact message and confirm it is stored and visible in the dashboard; verify the rate limit without abusing it.
6. Check response headers for Helmet protections and confirm `x-powered-by` is absent.
7. Review Render logs for startup errors, 5xx responses, and accidental secret output.
8. If production content is needed, run the seed and owner-creation commands intentionally against the production database from a trusted environment. Verify no duplicates. Do not run them automatically in the build.
9. After F-06, configure the custom domain/TLS and update canonical, Open Graph, Twitter, and sitemap URLs to the final origin.
10. Enable Atlas backups and Render alerts; monitor the first 24 hours.

## Fix order

### Must fix before deploy

| Order | Finding | Why it blocks or gates deployment |
| ---: | --- | --- |
| 1 | F-01 | The tested working tree is not in Git. Deploying `HEAD` ships older code; committing only tracked files can break imports. |
| 2 | F-02 | A second featured project silently disappears from the public site. |
| 3 | F-03 | Legitimate contact messages can be silently discarded because of client clock skew or a fast submit. |

### Should fix next

| Order | Finding | Why it should follow promptly |
| ---: | --- | --- |
| 4 | F-04 | The dashboard cannot reliably clear optional profile fields, so stale public information can remain. |
| 5 | F-05 | Profile edits can be lost without warning; the project editor already has the right pattern. |
| 6 | F-06 | Social previews and search discovery are weak, and robots currently allows private paths. |
| 7 | F-07 | The admin dashboard has a WCAG AA contrast failure in active navigation, filters, and badges. |

### Nice to have

| Order | Finding | Why it can wait |
| ---: | --- | --- |
| 8 | F-08 | Documentation drift does not affect runtime, but it slows maintenance and debugging. |
| 9 | F-09 | CI and linting are process improvements; they should be added before the next feature cycle. |
| 10 | F-10 | Lockout abuse is an availability concern; add notification and recovery before relying on the dashboard for urgent updates. |
| 11 | F-11 | Unknown public URLs show JSON; a branded 404 improves polish and SEO but is not a release blocker. |

## Verification performed

| Check | Result |
| --- | --- |
| `git status --porcelain=v1` / `git log -1 --oneline` | 26 modified, 8 untracked before this report was created; `HEAD` is `4bb38ce` |
| `npm audit --json` in `backend/` and `frontend/` | 0 vulnerabilities in both |
| `npm ls --depth=0` in both packages | Clean dependency trees |
| `npm ci --dry-run --ignore-scripts` in both packages | Lockfiles and `package.json` are in sync; frontend dry-run listed only platform-specific optional packages |
| `npm run test:server` | 106 passing |
| `npm run test:frontend` | 86 passing |
| `npm run build:frontend` | Production build passing |
| Contrast calculation for the admin accent pair | `#6c55e8` on `#ece8ff` = 4.28:1 |
| Frontend source scan | No unsafe HTML injection APIs, browser storage, or cookie access found |
| Secret scan of tracked source | No hardcoded credentials; only validation regexes and documented placeholders |

## Audit limitations

- No live deployment, Atlas connection, production seed, or real database write was performed.
- `.env` was deliberately not read. Only `.env.example` and documented placeholders were reviewed.
- The resume PDF was not opened; its content and metadata need owner review.
- Browser, screen-reader, Lighthouse, and cross-device testing were not run.
- Test counts and the production build reflect the working tree at the time of the audit; any later source change requires a rerun.
- The report cites the working tree. Line numbers can move after fixes; re-check them when applying changes.
