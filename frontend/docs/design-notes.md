# Portfolio design notes

## Direction

This is a developer portfolio, not a web version of the full resume. The page
uses a clear Work → About → Background → Contact flow, with the work presented
as the primary evidence and supporting detail kept compact.

## Information hierarchy

1. A personal greeting, a statement of what is built, and a direct route to
   selected work.
2. A project gallery with one featured project and supporting entries, driven
   by the administrator-managed published projects.
3. A compact About section with the approved introduction, biography, education
   summary, and grouped technical skills.
4. A Background section for database-managed education, certifications, and
   achievements. It appears only when at least one record exists.
5. One clear contact section, closing with the location as a small secondary
   line.

The page does not attempt to reproduce every resume detail. The downloadable
resume remains the canonical full record. Education, certifications, and
achievements are shown on the page only when they have been entered in the
dashboard and are confirmed by the public API.

## Hero decisions

- The greeting is `Hello, I'm Pradeep Chavan`, revealed character by character
  at roughly one character per 45ms after a short pause.
- The cursor blinks only while typing and disappears when the greeting is
  complete. The greeting is never erased or retyped.
- The completed greeting stays visible, and a screen-reader-only copy always
  contains the full text.
- With `prefers-reduced-motion: reduce` the greeting is rendered complete
  immediately, with no cursor. Enabling the setting mid-animation completes it
  instantly.
- There is no category or eyebrow label above the greeting, and no violet dot.
- The hero counts on typography, spacing, and alignment. There are no decorative
  shapes, floating elements, or profile images.

## Visual system

- Warm paper background, off-white surfaces, near-black ink, one violet accent,
  and a single dark contact band.
- Headings use fluid `clamp()` sizes with tight negative tracking; body text
  stays at comfortable reading lengths.
- Content is capped at a 1200px container so the page does not stretch on
  ultrawide screens.
- Every text colour on the paper and sunken backgrounds clears 4.5:1 contrast.

## Project showcase

The showcase pairs each published project with a purpose-built illustration and
keeps the writing beside it. The drawings are diagrams, not captures: each panel
prints what it is in its own topline, each panel is a single `role="img"` with
one descriptive label, and no drawing contains a figure, filename, category
name, model output, or metric. No panel imitates an application window.

The gallery is database-driven. The seeded content provides a featured project
and supporting projects, but an administrator can publish, unpublish, reorder,
or delete records. The public UI does not substitute bundled project data when
the confirmed collection is empty or the API is unavailable.

Project summaries, descriptions, technology lists, and repository links come
from the administrator-managed records. There is no "Live demo" action unless a
project record provides one; the repository link is otherwise the only project
action.

### Data-driven workflow artwork

A project may use the `workflow` artwork instead of one of the three fixed
drawings. The administrator enters two to ten steps with a title, optional short
description, and one controlled type (`input`, `frontend`, `backend`, `database`,
`service`, `process`, or `output`). The renderer draws the nodes, arrows, type
colours, and glyphs from those values; it does not generate architecture from a
project name.

The diagram is an ordered list in the DOM, so its visual reading order and its
screen-reader order match. Administrator text is rendered as text, never as
HTML, SVG, CSS, or a URL. A `workflow` project with missing or malformed data
uses a neutral abstract fallback, not another project's illustration.

All interface icons are inline SVG rather than emoji or text arrows. The resume
button is labelled "Download resume" and downloads the real PDF. The header
brand is a "PC" monogram beside the name.

## Interaction decisions

- Navigation is anchor-based because this is a single-page site.
- Desktop nav links share one interaction model: muted text with no underline
  at rest, the accent colour plus a 1px accent underline that grows from the
  left on hover or keyboard focus, and full-contrast text with that underline
  for the current section. The underline is absolutely positioned, so it never
  shifts the text or the navbar.
- The current section is tracked with an `IntersectionObserver` watching a thin
  reading band placed midway between the sticky header and the bottom of the
  viewport. The topmost section overlapping the band wins.
- Colour feedback on interactive elements is animated by one `transition-ui`
  utility instead of Tailwind's built-in colour transition utility, so the
  keyboard focus ring reaches full contrast on the first frame.
- The mobile menu closes on navigation, Escape, and when resized to desktop.
  Escape returns focus to the toggle button. The active section is marked by
  full-contrast text, an accent divider on its row, and `aria-current`.
- The skip link and every in-page nav link land focus on the section they point
  at. Container targets suppress the focus ring where the scroll is the visible
  cue.
- Project entries use one repository link action to avoid duplicated controls,
  and the entry itself is not clickable.
- The showcase contains no image file and nothing that could be mistaken for an
  application screen. The inline SVG belongs to the drawings and the arrow
  inside each repository link.
- The only movement in the showcase is the arrow inside a repository link,
  which shifts 2px on hover through a transform. The global reduced-motion guard
  collapses that transition.
- The contact section uses a single visible email action rather than two
  competing buttons.

## Loading and unavailable states

The approved profile copy can render immediately because it is part of the
approved static presentation. Projects, skills, education, certifications, and
achievements are database-managed, so their initial state is empty and their
confirmed state comes from `GET /api/portfolio`.

The Work and About sections show concise, polite status messages during loading,
when the API is unavailable, and when a successful response contains no
records. This avoids reviving unpublished or deleted content and avoids a retry
loop. The rest of the public page remains usable.

## Styling approach

Tailwind CSS v4 is the styling system. Design tokens are declared once in the
`@theme` block in `src/index.css`. The global stylesheet holds only the Tailwind
import, tokens, a short base layer, one `transition-ui` utility, and the
reduced-motion guard, so there is no second hand-written design system to keep
in sync.
