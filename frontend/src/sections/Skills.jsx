import { PORTFOLIO_STATUS, usePortfolio } from '../PortfolioContext.jsx';
import Container from '../components/Container.jsx';
import { tagClass } from '../components/TechnologyTags.jsx';
import { hasSkillGroups } from './skillsContent.js';

/* Every Bento cell shares the same surface, border, radius, and shadow. The
   entrance is a native @starting-style transition: the card starts faded and
   slightly lower, then eases into place without any animation library. */
const cellBaseClass =
  'flex min-h-[144px] flex-col rounded-2xl border border-line-strong bg-surface p-6 shadow-sm transition-all duration-700 ease-out starting:opacity-0 starting:translate-y-4';

/**
 * Desktop Bento footprints for the skill groups. Every card receives half of
 * the 4-column grid, which keeps five-plus-item groups readable; only an odd
 * final card expands to the full row. No card spans multiple rows, so heights
 * follow content instead of creating empty vertical space. Mobile stays one
 * column.
 */
function getBentoSpan(index, total) {
  if (total === 1) return 'md:col-span-4';
  return total % 2 === 1 && index === total - 1
    ? 'md:col-span-4'
    : 'md:col-span-2';
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
          <div className="min-w-0">
            <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
              Technical toolkit
            </p>
            <h2
              id="skills-title"
              className="mt-3.5 text-headline font-medium leading-none tracking-[-0.06em] [overflow-wrap:anywhere]"
            >
              Skills that support the work<span className="text-accent">.</span>
            </h2>
          </div>
          <p className="max-w-[360px] text-[0.92rem] leading-relaxed text-muted lg:mb-1">
            Practical tools and technologies, organised by how I use them.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {skillGroups.map((group, index) => {
            const labelId = `skill-group-${index}`;

            return (
              <article
                key={`${group.label}-${index}`}
                className={`${cellBaseClass} min-w-0 ${getBentoSpan(index, skillGroups.length)}`}
                style={{ transitionDelay: `${Math.min(index, 4) * 70}ms` }}
              >
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <h3 id={labelId} className="min-w-0 text-[0.8rem] font-semibold text-subtle [overflow-wrap:anywhere]">
                    {group.label}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[0.68rem] font-bold tracking-[0.14em] text-subtle/60"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <ul
                  aria-labelledby={labelId}
                  className="mt-5 flex min-w-0 flex-1 flex-wrap content-start gap-2.5"
                >
                  {group.items.map((item, itemIndex) => (
                    <li key={`${group.label}-${item}-${itemIndex}`} className={tagClass}>
                      {item}
                    </li>
                  ))}
                </ul>

                <p
                  aria-hidden="true"
                  className="mt-auto pt-5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-subtle/70"
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
