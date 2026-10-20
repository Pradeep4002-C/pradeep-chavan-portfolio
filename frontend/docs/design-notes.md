# Portfolio design notes

## Direction

This is a developer portfolio, not a web version of the full resume. The resume supplies facts and repository links; the page structure is designed around selected work.

## References

- **Squarespace portfolio examples:** restrained typography, deliberate whitespace, and giving the work room to lead.
- **Hostinger portfolio guidance:** a clear Home/Work, About, and Contact flow that remains easy to use on smaller screens.
- **Developer portfolio reference:** a human introduction followed by project work and contact.

These references guide principles only. The implementation is original.

## Information hierarchy

1. A personal greeting that types itself once, a statement of what is built, and a direct route to selected work.
2. One featured project and two supporting projects, presented as a two-tier gallery rather than three identical cards.
3. A compact About section and grouped technical skills.
4. One clear contact section, closing with the location as a small secondary line.

Detailed grades, awards, and certifications remain in the downloadable resume so the main page does not become a CV.

## Hero decisions

- The greeting is `Hello, I'm Pradeep Chavan`, revealed character by character at roughly one character per 45ms after a short pause.
- The cursor blinks only while typing and disappears when the greeting is complete. The greeting is never erased or retyped.
- The completed greeting stays visible, and a screen-reader-only copy always contains the full text.
- With `prefers-reduced-motion: reduce` the greeting is rendered complete immediately, with no cursor. Enabling the setting mid-animation completes it instantly.
- There is no category or eyebrow label above the greeting, and no violet dot.
- The hero counts on typography, spacing, and alignment. There are no decorative shapes, floating elements, or profile images.

## Visual system

- Warm paper background, off-white surfaces, near-black ink, one violet accent, and a single dark contact band.
- Headings use fluid `clamp()` sizes with tight negative tracking; body text stays at comfortable reading lengths.
- Content is capped at a 1200px container so the page does not stretch on ultrawide screens.
- Every text colour on the paper and sunken backgrounds clears 4.5:1 contrast.

## Project showcase

The showcase pairs each project with a purpose-built illustration and keeps the writing beside it. The drawings are diagrams, not captures: each panel prints what it is in its own topline ("Illustrative workflow", "Illustrative diagram", "Illustrative flow"), each panel is a single `role="img"` with one descriptive label, and no drawing contains a figure, filename, category name, model output, or metric — only the real stage names, the three status bands the API returns, and the real automation steps. No panel imitates an application window.

The screenshots an earlier revision framed are gone for good. At the sizes that layout could give them those previews were too small and too heavily cropped to read, and enlarging a low-resolution screenshot or substituting a stock image would have been worse than showing nothing, so the covers and the two screenshot files were deleted rather than patched. Nothing image-shaped replaced them: the section renders zero `<img>` elements at every measured width, and every pixel of the drawings is CSS boxes and inline SVG.

The two tiers survive as one gallery. HostelCare leads as the featured project, with its panel beside the copy; AquaPredict and RPA Expense Tracker follow one type step down with the panel above the copy, and from 1024px up those two sit side by side. Each of the three panels shares one recipe — topline, middle, bottomline, with the middle carrying the height — which is what makes the two supporting panels exactly the same height wherever they share a row. Every palette is one family (a pale tint, a dark ink, one mid tone) and every text colour clears 4.5:1 against its own tint. Below 480px each drawing switches from its wide arrangement to a stacked one, with the connector arrows turned downward, because a three-up column at that width breaks words.

Project summaries, descriptions, and technology lists were checked against each repository's README, and repository links are sourced from the resume (all three resolve). Nothing is invented: none of the three projects has a live deployment, so there is no demo link and no "Live demo" button — the repository link is the only action on an entry.

All interface icons are inline SVG rather than emoji or text arrows. The resume button is labelled "Download resume" and downloads the real PDF. The header brand is a "PC" monogram beside the name.

## Interaction decisions

- Navigation is anchor-based because this is a single-page site.
- Desktop nav links share one interaction model: muted text with no underline at rest, the accent colour plus a 1px accent underline that grows from the left on hover or keyboard focus, and — for the current section — full-contrast text with that underline kept visible. The underline is an absolutely positioned pseudo-element, so it never shifts the text or the navbar.
- The current section is tracked with an `IntersectionObserver` watching a thin reading band placed midway between the sticky header (height measured at runtime) and the bottom of the viewport. The topmost section overlapping the band wins, so the handoff at each boundary is deterministic rather than flickering, and the short final section still becomes active when the page is scrolled to the end. Clicking a link still navigates normally; the observer itself never rewrites the URL. The band is measured in pixels, so a resize rebuilds the observer; that rebuild is debounced, because resize fires continuously while a window or mobile URL bar is moving.
- Colour feedback on interactive elements is animated by one `transition-ui` utility instead of Tailwind's built-in colour transition utility, which also transitions `outline-color` and would make the keyboard focus ring fade in from the element's own colour; leaving it out means the ring reaches full contrast on the first frame.
- The mobile menu closes on navigation, Escape, and when resized to desktop. Escape returns focus to the toggle button. Mobile has no underline to reuse, so the active section is marked by full-contrast text, an accent divider on its row, and `aria-current`.
- The skip link and every in-page nav link land focus on the section they point at: `<main>` and the four sections carry `tabindex="-1"`, so fragment navigation moves focus to the destination instead of leaving it on a link inside a menu that is about to be hidden. The focus ring is suppressed on those container targets, where the scroll itself is the visible cue. Starting a resume download from the open mobile menu returns focus to the toggle instead.
- Project entries use one repository link action to avoid duplicated controls, and the entry itself is not clickable, so the entry and its link cannot disagree about what a click does. Nothing inside an illustration is interactive either, so a drawing never invites a click.
- The showcase contains no image file and nothing that could be mistaken for an application screen: `#work` renders zero `<img>` elements at every width, and the inline SVG it does contain belongs to the drawings (arrows, waves, workflow connectors, small glyphs) plus the arrow inside each repository link. Every drawing hangs off an `aria-hidden` element or a presentational panel, so the accessible tree holds one image node per project.
- The only movement in the showcase is the arrow inside a repository link, which shifts 2px on hover through a transform. The global reduced-motion guard collapses that transition, so it never animates for a visitor who has asked for reduced motion. A repository action keeps a 123x42px target at every measured width.
- The contact section uses a single visible email action rather than two competing buttons.

## Styling approach

Tailwind CSS v4 is the styling system. Design tokens are declared once in the `@theme` block in `src/index.css`, which keeps repeated values honest and turns them into utilities. The global stylesheet holds only the Tailwind import, the tokens, a short base layer, one small `transition-ui` utility, and the reduced-motion guard, so there is no second hand-written design system to keep in sync.
