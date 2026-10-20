# Frontend code review

> **Historical note.** This report covers an earlier React + hand-written-CSS phase of the project. That single `src/styles.css` design system has since been replaced by Tailwind CSS v4, configured through `@tailwindcss/vite` with tokens in the `@theme` block of `src/index.css`. References to `styles.css` below describe the state at the time of that review. The project covers were changed again later: AquaPredict and RPA Expense Tracker then showed genuine screenshots taken from their own public repositories, so `ProjectArtwork.jsx` held only the HostelCare illustration and `ProjectCover.jsx` chose between a screenshot and an illustration. Statements below about "three illustrative artwork components" describe the reviewed revision, not the current one. The supporting tier of the same gallery was changed again after that: AquaPredict and RPA Expense Tracker became full-width rows rather than a two-up grid. Finally the screenshots were dropped altogether — they could not be shown at a readable size — and the showcase was rebuilt around purpose-built illustrations: `ProjectCard.jsx` and `ProjectCover.jsx` are deleted, `ProjectEntry.jsx` renders each project, the `cover` field is gone from the data, and `ProjectArtwork.jsx` was re-created to hold one labelled CSS/SVG diagram per project. Any statement below about a grid of project cards, framing or cropping, screenshot ratios, or how a cover image was fitted to its frame describes the reviewed revision only.

## Scope

Reviewed the React/Vite source files, content data, stylesheet, public assets, and project documentation. The review focused on maintainability, inaccurate/contradictory project data, navigation behavior, accessibility basics, responsive rules, and reducing duplicate UI actions.

## Changes made

### Application structure

- Split the original large `App.jsx` into `components/` and `sections/` so each file has a clearer responsibility. `App.jsx` now only defines page order and the skip link.
- Kept project content in `src/data/portfolio.js`, styling in `src/styles.css`, and static assets under `public/`.

### Functionality and correctness

- Added a guard in `main.jsx` so a missing `#root` mount element gives a readable error.
- Made the resume path respect Vite's `BASE_URL` and used Vite's `%BASE_URL%` token for the favicon path.
- Improved mobile menu behavior: Escape closes it and restores focus to the toggle; selecting a link closes it; resizing to desktop closes it. Removed unnecessary body scroll locking that could leave the page locked if the viewport changed.
- Added `rel="noopener noreferrer"` to links opening a new tab.
- Corrected the artwork mapper so each project gets its matching illustration; unknown artwork types do not silently show the expense illustration.
- Used a unique ID for AquaPredict's SVG gradient so multiple copies of the artwork would not share the same SVG ID.
- Added the RPA Expense Tracker repository link from the hyperlink embedded in the supplied resume. The former data/comment said no verified project link existed; that was inconsistent with the resume.
- Consolidated duplicate project repository actions into one clear text link and removed the duplicate circular email action from Contact.
- Filled in `VS Code` and `MongoDB Compass` within the skill groups to match the resume's tools section.
- Kept the email as `chavanpradeep096@gmail.com` and construct its `mailto:` URL from the address text, instead of copying the resume PDF's malformed `mailto:mailto...` hyperlink target.

### Visual and maintainability improvements

- Made CSS readable with one declaration per line and section comments.
- Darkened the small muted label color for improved text contrast.
- Added a beginner-friendly structure guide and updated the README.

## Files reviewed

- `package.json`: parsed successfully; dependencies kept stable and Node >=18 requirement documented.
- `vite.config.js`: standard React plugin configuration; no unnecessary build configuration added.
- `index.html`: metadata, title, favicon path, root element, and entry point checked.
- `src/main.jsx`: React entry point and root element check.
- `src/App.jsx`: page composition only.
- `src/components/Arrow.jsx`: shared decorative arrow.
- `src/components/Brand.jsx`: reusable site wordmark.
- `src/components/Navbar.jsx`: navigation, mobile state, Escape, resize, focus, and resume link.
- `src/components/ProjectArtwork.jsx`: the three illustrative artwork components and SVG gradient.
- `src/components/ProjectCard.jsx`: project content and one repository action.
- `src/components/TechnologyTags.jsx`: reusable technology list.
- `src/sections/Hero.jsx`: title and primary calls to action.
- `src/sections/Work.jsx`: featured and supporting projects.
- `src/sections/About.jsx`: short bio and grouped toolkit.
- `src/sections/Contact.jsx`: single email action.
- `src/sections/Footer.jsx`: profile navigation links.
- `src/data/portfolio.js`: profile, education, project descriptions, links, technologies.
- `src/styles.css`: design tokens, component layouts, responsive breakpoints, focus and reduced-motion styles.
- `public/favicon.svg`: syntax/structure checked.
- `public/resume.pdf`: retained from the supplied resume.
- `README.md`, `docs/design-notes.md`, and `docs/structure-guide.md`: updated to match the actual code.

## Validation performed

- JavaScript syntax checks passed for `src/data/portfolio.js` and `vite.config.js`.
- TypeScript's JSX parser/transpiler reported no JSX syntax errors for all `.jsx` and `.js` source files; generated syntax was parsed.
- All local source imports were checked to ensure their target files exist.
- `styles.css` parsed with PostCSS.
- `package.json` parsed as valid JSON.
- `index.html` parsed with Python's standard HTML parser.
- All in-page anchor references (`#home`, `#work`, `#about`, `#contact`, `#main-content`) have matching IDs.
- Every project artwork type in data has a matching renderer.
- Required public files `favicon.svg` and `resume.pdf` exist.
- Project repository URL destinations were compared against hyperlinks embedded in the supplied resume.

## Limitations

The network/DNS environment was unavailable and `npm install` timed out. Therefore, a real Vite production build and live browser interaction test could not be completed here. The user should run `npm install`, `npm run dev`, and `npm run build` on their machine and verify that the external links open. This report does not claim that those unrun checks passed.
