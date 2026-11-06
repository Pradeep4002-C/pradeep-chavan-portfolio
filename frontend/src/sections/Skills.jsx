import { PORTFOLIO_STATUS, usePortfolio } from '../PortfolioContext.jsx';
import Container from '../components/Container.jsx';
import { tagClass } from '../components/TechnologyTags.jsx';
import { hasSkillGroups } from './skillsContent.js';

/** Database-managed technologies, grouped for quick scanning after the work. */
export default function Skills() {
  const { skillGroups, status } = usePortfolio();

  // Skills are optional public content. Do not show an empty state or a link
  // until the API has confirmed that useful, publishable groups exist.
  if (status !== PORTFOLIO_STATUS.ready || !hasSkillGroups(skillGroups)) {
    return null;
  }

  return (
    <section
      id="skills"
      aria-labelledby="skills-title"
      tabIndex={-1}
      className="bg-sunken py-16 focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <div className="mb-9 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-9">
          <div>
            <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
              Technical toolkit
            </p>
            <h2
              id="skills-title"
              className="mt-3.5 text-headline font-medium leading-none tracking-[-0.06em]"
            >
              Skills that support the work<span className="text-accent">.</span>
            </h2>
          </div>
          <p className="max-w-[360px] text-[0.92rem] leading-relaxed text-muted lg:mb-1">
            Practical tools and technologies, organised by how I use them.
          </p>
        </div>

        <div className="border-t border-line-strong">
          {skillGroups.map((group, index) => {
            const labelId = `skill-group-${index}`;

            return (
              <div
                key={group.label}
                className="grid gap-3 border-b border-line-strong py-5 sm:grid-cols-[minmax(130px,0.28fr)_minmax(0,1fr)] sm:gap-7 sm:py-6"
              >
                <h3 id={labelId} className="pt-1 text-[0.8rem] font-semibold text-subtle">
                  {group.label}
                </h3>
                <ul aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <li key={item} className={tagClass}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
