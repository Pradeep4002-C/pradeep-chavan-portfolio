import Arrow from './Arrow.jsx';
import Button from './Button.jsx';
import ProjectArtwork from './ProjectArtwork.jsx';
import TechnologyTags, { projectTagClass } from './TechnologyTags.jsx';

/* Every project is a surface card. From md up the artwork and the written proof
   sit side by side; below md they stack with the artwork first. The native
   @starting-style transition makes each card ease in on first paint. */
const cardClass =
  'grid gap-6 rounded-3xl border border-line-strong bg-surface p-5 shadow-sm transition-all duration-700 ease-out starting:opacity-0 starting:translate-y-4 sm:p-6 md:items-center md:gap-8 md:p-7';
const artworkFrameClass = 'min-w-0 overflow-hidden rounded-2xl shadow-md';

/* The public API normalizes demo links to `demoHref`, while imported or raw
   project payloads may still use the backend field name. Accept either without
   ever passing a non-http(s) value through to the action. */
function liveDemoHref(project) {
  return (
    [project.demoHref, project.demoUrl, project.liveLink, project.liveUrl].find(
      (value) => typeof value === 'string' && /^https?:\/\//i.test(value.trim()),
    )?.trim() ?? null
  );
}

/* Both project actions keep the 48px ergonomic target and the shared focus
   treatment explicit at the call site, independent of Button's own defaults. */
const actionClass =
  'max-w-full self-start min-h-[48px] min-w-[48px] outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 [overflow-wrap:anywhere]';

/* A stored description is one field, but an administrator may write several
   paragraphs in it separated by a blank line. Splitting there keeps a long
   problem/solution/implementation description readable without a schema change,
   while a single-paragraph description renders exactly as before. */
function descriptionParagraphs(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return [];

  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

/* The written half of an entry, in one place so the featured and supporting
   variants cannot drift apart in wording, order, or spacing. */
function ProjectCopy({ project, featured = false }) {
  const paragraphs = descriptionParagraphs(project.description);
  const demoHref = liveDemoHref(project);
  return (
    <>
      <p className="text-kicker font-bold uppercase tracking-[0.12em] text-subtle [overflow-wrap:anywhere]">
        <span className="text-accent">{project.number}</span>
        <span aria-hidden="true"> / </span>
        {project.category}
      </p>

      <h3
        className={`mt-2.5 font-medium leading-tight tracking-[-0.05em] [overflow-wrap:anywhere] ${
          featured ? 'text-title' : 'text-[clamp(1.3rem,1.9vw,1.65rem)]'
        }`}
      >
        {project.name}
      </h3>

      <p
        className={`mt-3 font-medium leading-snug text-ink [overflow-wrap:anywhere] ${
          featured ? 'text-[1.05rem] sm:text-[1.15rem]' : 'text-[0.98rem]'
        }`}
      >
        {project.summary}
      </p>

      {paragraphs.length > 0 ? (
        <div className="mt-2.5 max-w-[600px] space-y-2.5">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-[0.95rem] leading-relaxed text-muted [overflow-wrap:anywhere]">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {project.technologies.length > 0 ? (
        <div className="mt-5">
          <p className="text-[0.64rem] font-bold uppercase tracking-[0.12em] text-subtle">
            Built with
          </p>
          <TechnologyTags
            items={project.technologies}
            label={`Technologies used in ${project.name}`}
            className="mt-2"
            tagClassName={projectTagClass}
          />
        </div>
      ) : null}

      {project.href || demoHref ? (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {demoHref ? (
            <Button
              className={actionClass}
              href={demoHref}
              size="sm"
              variant="solid"
              target="_blank"
              rel="noopener noreferrer"
            >
              View live demo <Arrow diagonal />
              <span className="sr-only">
                {' '}
                for {project.name} (opens in a new tab)
              </span>
            </Button>
          ) : null}

          {project.href ? (
            <Button
              className={actionClass}
              href={project.href}
              size="sm"
              variant="outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {project.linkLabel} <Arrow diagonal />
              <span className="sr-only">
                {' '}
                for {project.name} (opens in a new tab)
              </span>
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/* One project in the showcase.

   Every project is one card with the same proof hierarchy: the illustration on
   the left, then the title, summary, case-study description, technology stack,
   and the live-demo/repository actions on the right. The featured project gives
   slightly more width to its panel and a larger title; the supporting projects
   use an even two-column split. Below md the artwork stacks above the details,
   so the card reads in the same order on a phone.

   The panel is an illustration, never a capture, so nothing here fakes an
   application screen: it is a drawing that names what it shows. */
export default function ProjectEntry({
  project,
  featured = false,
  className = '',
  entranceDelay = 0,
}) {
  const layoutClass = featured
    ? 'md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]'
    : 'md:grid-cols-2';

  return (
    <article
      className={`${cardClass} ${layoutClass} ${className}`}
      style={{ transitionDelay: `${entranceDelay}ms` }}
    >
      <div className={artworkFrameClass}>
        <ProjectArtwork type={project.artwork} workflow={project.workflow} />
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        <ProjectCopy project={project} featured={featured} />
      </div>
    </article>
  );
}
