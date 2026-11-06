import Arrow from './Arrow.jsx';
import Button from './Button.jsx';
import ProjectArtwork from './ProjectArtwork.jsx';
import TechnologyTags from './TechnologyTags.jsx';

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

/* The written half of an entry, in one place so the featured arrangement and the
   supporting arrangement cannot drift apart in wording, order, or spacing. */
function ProjectCopy({ project, featured = false }) {
  const paragraphs = descriptionParagraphs(project.description);
  return (
    <>
      <p className="text-kicker font-bold uppercase tracking-[0.12em] text-subtle">
        <span className="text-accent">{project.number}</span>
        <span aria-hidden="true"> / </span>
        {project.category}
      </p>

      <h3
        className={`mt-2.5 font-medium leading-tight tracking-[-0.05em] ${
          featured ? 'text-title' : 'text-[clamp(1.3rem,1.9vw,1.65rem)]'
        }`}
      >
        {project.name}
      </h3>

      <p
        className={`mt-3 font-medium leading-snug text-ink ${
          featured ? 'text-[1.05rem] sm:text-[1.15rem]' : 'text-[0.98rem]'
        }`}
      >
        {project.summary}
      </p>

      {paragraphs.length > 0 ? (
        <div className="mt-2.5 max-w-[600px] space-y-2.5">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-[0.95rem] leading-relaxed text-muted">
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
          />
        </div>
      ) : null}

      {project.href || project.demoHref ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {project.demoHref ? (
            <Button
              className="self-start"
              href={project.demoHref}
              size="sm"
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
              className="self-start"
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

   Two arrangements share that copy. The featured project is a wide row: its panel
   on the left, the writing beside it and vertically centred against the panel. The
   supporting projects stack - panel above, writing below - so the pair reads as a
   smaller tier instead of three identical cards, and the panels there are narrow
   enough to sit side by side from 1024px up.

   The panel is an illustration, never a capture, so nothing here fakes an
   application screen: it is a drawing that names what it shows. */
export default function ProjectEntry({ project, featured = false, className = '' }) {
  if (featured) {
    return (
      <article
        className={`grid gap-6 border-t border-line pt-9 sm:pt-11 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch lg:gap-12 lg:pt-14 ${className}`}
      >
        <ProjectArtwork type={project.artwork} workflow={project.workflow} />

        <div className="flex min-w-0 flex-col justify-center">
          <ProjectCopy project={project} featured />
        </div>
      </article>
    );
  }

  return (
    <article className={`grid gap-5 sm:gap-6 ${className}`}>
      <ProjectArtwork type={project.artwork} workflow={project.workflow} />

      <div className="min-w-0">
        <ProjectCopy project={project} />
      </div>
    </article>
  );
}
