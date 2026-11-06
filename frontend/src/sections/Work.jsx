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
  const featured = projects.find((project) => project.featured);
  const supportingProjects = projects.filter((project) => !project.featured);
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
          <>
            {featured ? <ProjectEntry project={featured} featured /> : null}

            {supportingProjects.length > 0 ? (
              <div className="mt-9 grid gap-y-9 border-t border-line pt-9 sm:mt-11 sm:gap-y-11 sm:pt-11 lg:mt-14 lg:grid-cols-2 lg:items-start lg:gap-x-12 lg:pt-14">
                {supportingProjects.map((project, index) => (
                  <ProjectEntry
                    key={project.id}
                    project={project}
                    className={
                      index > 0
                        ? 'border-t border-line pt-9 sm:pt-11 lg:border-t-0 lg:pt-0'
                        : ''
                    }
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="mt-8 flex flex-col items-start gap-4 border-t border-line-strong pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[0.82rem] text-muted">
            More projects and code are on GitHub.
          </span>
          <a
            className="group inline-flex items-center gap-1.5 text-[0.82rem] font-bold text-ink transition-ui hover:text-accent"
            href={profile.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            Browse GitHub <Arrow diagonal />
          </a>
        </div>
      </Container>
    </section>
  );
}
