# Pradeep Chavan — Developer Portfolio

A project-first portfolio: a **React + Vite + Tailwind CSS v4** frontend and an **Express 5 + MongoDB (Mongoose)** API in one repository. The resume supplies factual details and repository destinations; the website is designed around selected work instead of repeating the full CV.

## Current status

| Area | State |
| --- | --- |
| Public frontend | Complete and verified — Home, Work, About, Contact, Footer, resume download |
| Backend foundation | Complete (M1) — configuration validation, MongoDB connection, security headers, health endpoint, error handling, graceful shutdown |
| Database models and seeding | Complete (M2) — eight Mongoose models, indexes, idempotent content seed, secure administrator creation |
| Public portfolio API and frontend integration | Complete (M3) — `GET /api/portfolio`, Vite development proxy, API client, and immediate static fallback |
| Authentication, admin dashboard, project CRUD, contact persistence, production SPA serving | **Not implemented yet** — planned for later milestones |

The React app renders the bundled content immediately, then replaces it with database-backed content when `GET /api/portfolio` succeeds. If the API is unavailable, the bundled content stays visible; the backend is not required merely to view the site. No part of the public design was redesigned during the backend work.

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
└── server/                      # Express API
    ├── package.json
    ├── scripts/
    │   ├── seed-content.js      # Idempotent portfolio content seed
    │   └── create-admin.js      # Secure first-administrator initialization
    └── src/
        ├── index.js             # Startup, shutdown, process-level error handling
        ├── app.js               # Express application (helmet, JSON parsing, routes)
        ├── config/
        │   ├── env.js           # dotenv + Zod validation
        │   └── db.js            # Mongoose connection and status
        ├── middleware/
        │   ├── notFound.js      # JSON 404 for unknown routes
        │   └── errorHandler.js  # Central error handler
        ├── models/              # Eight Mongoose models + ensureModelIndexes()
        ├── routes/
        │   ├── health.js        # GET /api/health
        │   └── portfolio.js     # GET /api/portfolio
        └── lib/
            ├── logger.js        # Structured JSON-line logger
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
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |

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
- Unexpected failures return `500 INTERNAL_ERROR` with a generic message. Stack traces are logged server-side and are never sent to a client, in development or production.
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
- **Education**, **certifications**, and **achievements** use the same explicit field projections and are returned as empty arrays when no records exist. No fallback content is fabricated on the server.
- Every query is a lean, read-only query with an explicit projection. Administrator records, password hashes, contact messages, sessions, `_id`, `__v`, and timestamps cannot appear in this response.
- If MongoDB is not connected, the endpoint returns `503` with `{"error":{"code":"DATABASE_UNAVAILABLE","message":"Portfolio content is temporarily unavailable."}}`. A query failure reaches the shared error middleware and returns `500 INTERNAL_ERROR` without data or a stack trace. A failed query never produces a successful response with invented content.

## Frontend data flow and fallback

- `frontend/src/api/client.js` is a small JSON client. It uses relative `/api` URLs, parses JSON safely, turns network and non-2xx responses into a safe `ApiError`, and exposes only the server's public error message.
- `frontend/src/api/portfolio.js` fetches `/api/portfolio` and normalises the payload into the shapes the existing components already expect: `project.name` from `title`, `project.id` from `slug`, `project.href` from `repoUrl`, `project.number` from `order`, and `skills` from skill groups.
- `frontend/src/PortfolioContext.jsx` initialises state from `frontend/src/data/portfolio.js`, so first paint never waits for the network. One request runs after mount, is aborted on unmount, and an unmounted component cannot be updated by a late response. There is no retry loop.
- Non-empty, valid API values replace their bundled counterparts. Empty `headline`/`bio` values do not blank the existing hero or About copy, the bundled `education` line remains because no confirmed education record exists, and invalid URLs or empty strings keep the bundled value. A collection only replaces the bundled list when at least one valid record survives normalisation.
- If the request fails, the bundled content remains on screen. The only diagnostic is one `console.warn` in development; production logs nothing and shows no error state, because the fallback is already the intended public experience.
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

**What is deliberately not seeded.** Education, certifications, and achievements have no confirmed wording in the repository yet, so seeding them would mean inventing content. The profile `headline` and `bio` are also left empty because that copy currently lives in the frontend components rather than the data file.

## Creating the administrator

There is no registration endpoint and no automatic account creation. Create the first administrator explicitly:

```powershell
npm run admin:create -- --email owner@example.com --name "Owner Name"
```

The script prompts for the password twice with hidden input. It requires **at least 12 characters**, hashes with **Argon2id**, stores only the hash, and refuses to create or overwrite an account whose email already exists. It never prints the password or the hash, and the password cannot be supplied as a command-line argument. For scripted local use, two password lines may be piped on stdin (see `npm run admin:create -- --help`), which is useful for testing against a disposable database.

`.env` stays untracked; `.env.example` contains placeholders only.

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
| The production preview shows bundled content instead of database content | Expected: `vite preview` does not apply the development proxy. Production same-origin API serving is a later milestone. |
| `E11000 duplicate key` while seeding | A document already uses that unique identifier (profile key, project slug, or skill-group label). The seed skips it and leaves it untouched; inspect it before changing anything. |
| `An administrator with that email already exists` | Working as designed. The script never replaces an account or its password; use a different email or manage the existing account deliberately. |
| Seeded content looks stale after editing `portfolio.js` | Seeding only creates missing records. Update already-seeded records through the admin workflow once it exists, or edit them in MongoDB deliberately. |

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
- Change a major page region in `frontend/src/sections/`.
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
- The contact area has one clear email action instead of competing duplicate buttons, with the location shown as a small secondary line. A database-backed contact form is a later milestone.
- The greeting types itself once, then stays visible. With `prefers-reduced-motion: reduce` it appears instantly with no cursor and no typing.
- Interface icons are inline SVG, never emoji or text glyphs. The arrow characters (`→`, `↗`, `↑`) were replaced because Windows renders some of them (such as `↗`, U+2197) with emoji presentation, which is why the resume button once showed a blue emoji tile.
- The resume button is labelled "Download resume" and downloads the PDF (`download` attribute on a same-origin link), so the label matches the action.
- The header brand is a "PC" monogram beside the name; the letters are generated content so they stay out of the link's accessible name.
- Nothing in the showcase stands in for an application screen: there is no screenshot, no placeholder box, no stock imagery, no imitation window, and no fabricated metric. The drawings are labelled diagrams, and each entry ends at one real repository link.
- The public site renders the bundled portfolio immediately, then hydrates from `GET /api/portfolio`; a failed request leaves the bundled content untouched. Authentication, the admin dashboard, CRUD endpoints, contact persistence, image uploads, and production same-origin SPA serving arrive later.

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
