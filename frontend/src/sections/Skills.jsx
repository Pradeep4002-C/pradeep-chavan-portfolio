import { PORTFOLIO_STATUS, usePortfolio } from '../PortfolioContext.jsx';
import Container from '../components/Container.jsx';
import { tagClass } from '../components/TechnologyTags.jsx';
import { hasSkillGroups } from './skillsContent.js';

/* Every Bento cell shares the same surface, border, radius, and shadow. The
   entrance is a native @starting-style transition: the card starts faded and
   slightly lower, then eases into place without any animation library. */
const cellClass =
  'flex min-h-0 flex-col rounded-2xl border border-line-strong bg-surface p-5 shadow-sm transition-all duration-700 ease-out starting:opacity-0 starting:translate-y-4 sm:p-6';

/**
 * Desktop Bento footprints for the skill groups. The first category is the
 * anchor: a 2x2 cell. The next categories fill the right side with smaller
 * cells, and any extra groups continue in balanced pairs so the grid stays
 * complete for every collection size. Mobile always uses one column.
 */
function bentoCellClass(index, total) {
  if (total === 1) return 'md:col-span-4';
  if (total === 2) {
    return index === 0
      ? 'md:col-span-3 md:row-span-2'
      : 'md:col-span-1 md:row-span-2';
  }
  if (index === 0) return 'md:col-span-2 md:row-span-2';
  if (index === 1) return 'md:col-span-2';
  if (total === 3) return 'md:col-span-2';
  if (index === 2) return 'md:col-span-1';
  if (index === 3) return 'md:col-span-1';

  const tailCount = total - 4;
  if (tailCount % 2 === 1 && index === total - 1) return 'md:col-span-4';
  return 'md:col-span-2';
}

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

        <div className="grid grid-cols-1 gap-4 md:grid-flow-row-dense md:auto-rows-[minmax(150px,auto)] md:grid-cols-4">
          {skillGroups.map((group, index) => {
            const labelId = `skill-group-${index}`;

            return (
              <article
                key={group.label}
                className={`${cellClass} ${bentoCellClass(index, skillGroups.length)}`}
                style={{ transitionDelay: `${Math.min(index, 4) * 70}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 id={labelId} className="text-[0.8rem] font-semibold text-subtle">
                    {group.label}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="text-[0.68rem] font-bold tracking-[0.14em] text-subtle/60"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <ul
                  aria-labelledby={labelId}
                  className="mt-5 flex flex-wrap content-start gap-1.5"
                >
                  {group.items.map((item) => (
                    <li key={item} className={tagClass}>
                      {item}
                    </li>
                  ))}
                </ul>

                <p
                  aria-hidden="true"
                  className="mt-auto pt-6 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-subtle/70"
                >
                  {group.items.length}{' '}
                  {group.items.length === 1 ? 'technology' : 'technologies'}
                </p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
