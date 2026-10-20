import { profile, projects } from '../data/portfolio.js';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';
import ProjectEntry from '../components/ProjectEntry.jsx';

export default function Work() {
  const featured = projects.find((project) => project.featured);
  const supportingProjects = projects.filter((project) => !project.featured);

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
            Web applications, workflow automation, and applied machine learning — each project
            starts with a problem worth solving.
          </p>
        </div>

        {featured && <ProjectEntry project={featured} featured />}

        <div className="mt-9 grid gap-y-9 border-t border-line pt-9 sm:mt-11 sm:gap-y-11 sm:pt-11 lg:mt-14 lg:grid-cols-2 lg:items-start lg:gap-x-12 lg:pt-14">
          {supportingProjects.map((project, index) => (
            <ProjectEntry
              key={project.id}
              project={project}
              className={index > 0 ? 'border-t border-line pt-9 sm:pt-11 lg:border-t-0 lg:pt-0' : ''}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start gap-4 border-t border-line-strong pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[0.82rem] text-muted">
            More experiments and code live on GitHub.
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
