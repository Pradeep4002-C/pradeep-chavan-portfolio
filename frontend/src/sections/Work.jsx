import { PORTFOLIO_STATUS, usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';
import ProjectEntry from '../components/ProjectEntry.jsx';

function WorkStatus({ children }) {
  return (
    <div
      className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-line-strong px-5 py-8 text-center text-sm text-muted"
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

export default function Work() {
  const { profile, projects, status } = usePortfolio();
  const featured = projects.find((project) => project.featured) ?? null;
  // Keep every other project visible, including a legacy second featured
  // record, instead of filtering the whole featured flag out of the grid.
  const supportingProjects = projects.filter((project) => project.id !== featured?.id);
  const showProjects = status === PORTFOLIO_STATUS.ready && projects.length > 0;

  return (
    <section
      id="work"
      aria-labelledby="work-title"
      tabIndex={-1}
      className="py-16 focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <div className="mb-9 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-9">
          <div>
            <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
              A few things I&rsquo;ve built
            </p>
            <h2
              id="work-title"
              className="mt-3.5 text-headline font-medium leading-none tracking-[-0.06em]"
            >
              Selected work<span className="text-accent">.</span>
            </h2>
          </div>
          <p className="max-w-[350px] text-[0.92rem] leading-relaxed text-muted lg:mb-1">
            Full-stack development, applied machine learning, and workflow automation. Source
            code is linked for every project.
          </p>
        </div>

        {status === PORTFOLIO_STATUS.loading ? (
          <WorkStatus>Loading selected work…</WorkStatus>
        ) : null}

        {status === PORTFOLIO_STATUS.unavailable ? (
          <WorkStatus>
            Selected work is temporarily unavailable. The rest of the portfolio is still available.
          </WorkStatus>
        ) : null}

        {status === PORTFOLIO_STATUS.ready && projects.length === 0 ? (
          <WorkStatus>No projects are published yet.</WorkStatus>
        ) : null}

        {showProjects ? (
          <div className="grid gap-6">
            {featured ? <ProjectEntry project={featured} featured /> : null}

            {supportingProjects.map((project, index) => (
              <ProjectEntry
                key={project.id}
                project={project}
                entranceDelay={(featured ? index + 1 : index) * 70}
              />
            ))}
          </div>
        ) : null}

        {profile.github ? (
          <div className="mt-8 flex flex-col items-start gap-4 border-t border-line-strong pt-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[0.82rem] text-muted">
              More projects and code are on GitHub.
            </span>
            <a
              className="group -mx-2 -my-3.5 inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-1.5 px-2 text-[0.82rem] font-bold text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui hover:text-accent"
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse GitHub <Arrow diagonal />
            </a>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
