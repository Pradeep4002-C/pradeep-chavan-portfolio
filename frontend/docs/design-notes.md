# Portfolio design notes

## Direction

This is a developer portfolio, not a web version of the full resume. The page
runs Hero → Selected work → Technical skills → About → Background → Contact,
with the work presented as the primary evidence and supporting detail kept
compact. The navigation uses the same order: Work, Skills, About, Background,
Contact.

## Information hierarchy

1. A static hero: the name, the role, a statement of what is built, the two
   primary actions, and the professional links.
2. A project gallery with one featured project and supporting entries, driven
   by the administrator-managed published projects.
3. A concise, database-driven Skills section that groups the technologies used
   to support the project evidence.
4. A compact, biography-only About section. Education metadata does not appear
   here, so the degree is not stated twice.
5. A Background section for database-managed education, certifications, and
   achievements. It appears only when at least one record exists. With the
   usual one degree and two certificates it uses a wider education card beside
   two stacked certificate cards.
6. One clear contact section, closing with the location as a small secondary
   line.

The page does not attempt to reproduce every resume detail. The downloadable
resume remains the canonical full record. Education, certifications, and
achievements are shown on the page only when they have been entered in the
dashboard and are confirmed by the public API.

## Hero decisions

- The hero opens with "HELLO, I'M" and types the name once at roughly 68 ms per
  character, with a slightly longer beat after the space. The cursor blinks only
  while typing and is removed at the final full stop, which keeps the accent.
- The name is the `h1` and the largest element. An invisible copy of the finished
  name reserves its final height, so the two-line heading at 320 px never
  reflows as characters arrive.
- The complete name is exposed once through an `sr-only` span; the spacer and the
  animated text are hidden from the accessibility tree. The heading therefore
  reads as "Pradeep Chavan." regardless of animation progress.
- `prefers-reduced-motion` shows the finished name immediately with no cursor,
  and switching the setting on mid-animation completes it at once.
- The greeting, positioning line, introduction, actions, and links render on the
  first paint. Nothing is gated behind the animation, and no timer is cleared
  without a fallback.
- A small positioning line separates the student identity from the full-stack
  work: "Computer Science Engineering Student · Full-Stack Developer". A
  database introduction that opens with the name is displayed without that
  repeated leading clause; the stored record is never edited.
- The primary action opens selected work and the secondary action downloads the
  resume. Compact GitHub and LinkedIn links follow, with a screen-reader note
  that they open in a new tab.
- The hero counts on typography, spacing, and alignment. There are no decorative
  shapes, floating elements, or profile images.
- At 320×568 the primary action is visible on the first screen. A longer
  database-supplied introduction can push the resume action and the profile
  links just below it; the sticky header keeps the resume action reachable
  without scrolling back.

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

Project summaries, descriptions, technology lists, repository links, and demo
links come from the administrator-managed records. An entry reads in one order:
category, name, one-line summary, description, a labelled "Built with" list, then
the available actions. A description containing blank-line-separated paragraphs
renders as separate paragraphs, so problem, solution, and implementation can be
read as distinct beats. A "View live demo" action appears only when the record
supplies a valid HTTP(S) demo URL; the "View source code" action is otherwise the
only project action. The site never invents a demo address, a deployment, or a
user count.

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
- Project entries offer at most two actions — a live demo when one exists and
  the repository — and the entry itself is not clickable. Each action carries a
  project-specific screen-reader label, so "View source code" is never announced
  three times without context.
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

The Work section shows concise, polite status messages during loading, when the
API is unavailable, and when a successful response contains no records. Skills
is optional and stays hidden until the API confirms useful groups. This avoids
reviving unpublished or deleted content and avoids a retry loop. The rest of
the public page remains usable.

## Styling approach

Tailwind CSS v4 is the styling system. Design tokens are declared once in the
`@theme` block in `src/index.css`. The global stylesheet holds only the Tailwind
import, tokens, a short base layer, one `transition-ui` utility, and the
reduced-motion guard, so there is no second hand-written design system to keep
in sync.
