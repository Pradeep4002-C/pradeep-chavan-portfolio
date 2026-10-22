import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';
import { formatPeriod, hasBackgroundContent } from './backgroundContent.js';

const linkClass =
  'group inline-flex items-start gap-1.5 font-semibold underline decoration-line-strong decoration-1 underline-offset-4 transition-ui hover:text-accent hover:decoration-accent focus-visible:text-accent focus-visible:decoration-accent';

function Subsection({ title, children }) {
  return (
    <div>
      <h3 className="mb-4 text-[0.92rem] font-bold">{title}</h3>
      <ul className="border-t border-line-strong">{children}</ul>
    </div>
  );
}

function EducationList({ items }) {
  return (
    <Subsection title="Education">
      {items.map((item, index) => {
        const period = formatPeriod(item.startYear, item.endYear);
        const programme = [item.qualification, item.field].filter(Boolean).join(' · ');

        return (
          <li
            key={`${item.institution}-${index}`}
            className="grid gap-1.5 border-b border-line-strong py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-8"
          >
            <div className="min-w-0">
              <h4 className="text-[1.02rem] font-semibold tracking-[-0.015em]">
                {item.institution}
              </h4>
              {programme ? (
                <p className="mt-1 text-[0.9rem] leading-relaxed text-muted">{programme}</p>
              ) : null}
            </div>

            {period || item.score || item.location ? (
              <div className="text-[0.8rem] leading-relaxed text-subtle sm:text-right">
                {period ? (
                  <p className="font-medium tabular-nums text-ink">{period}</p>
                ) : null}
                {item.score ? <p className={period ? 'mt-0.5' : ''}>{item.score}</p> : null}
                {item.location ? (
                  <p className={period || item.score ? 'mt-0.5' : ''}>{item.location}</p>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </Subsection>
  );
}

function CertificationList({ items }) {
  return (
    <Subsection title="Certifications">
      {items.map((item, index) => {
        const meta = [item.issuer, item.year === null ? null : String(item.year)]
          .filter(Boolean)
          .join(' · ');

        return (
          <li key={`${item.title}-${index}`} className="border-b border-line-strong py-4">
            <h4 className="text-[0.95rem] leading-relaxed">
              {item.url ? (
                <a className={linkClass} href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                  <Arrow diagonal className="mt-[3px]" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className="font-semibold">{item.title}</span>
              )}
            </h4>
            {meta ? <p className="mt-1 text-[0.8rem] text-muted">{meta}</p> : null}
          </li>
        );
      })}
    </Subsection>
  );
}

function AchievementList({ items }) {
  return (
    <Subsection title="Achievements">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="border-b border-line-strong py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h4 className="text-[0.95rem] leading-relaxed">
              <span className="font-semibold">{item.title}</span>
            </h4>
            {item.year === null ? null : (
              <span className="text-[0.78rem] tabular-nums text-subtle">{item.year}</span>
            )}
          </div>
          {item.description ? (
            <p className="mt-1.5 max-w-[62ch] text-[0.86rem] leading-relaxed text-muted">
              {item.description}
            </p>
          ) : null}
        </li>
      ))}
    </Subsection>
  );
}

/**
 * Public presentation of the database-managed education, certification, and
 * achievement records. Nothing is rendered (and the navbar link disappears)
 * while all three collections are empty, so the section only exists when there
 * is genuine content to show.
 */
export default function Background() {
  const { education, certifications, achievements } = usePortfolio();

  if (!hasBackgroundContent({ education, certifications, achievements })) {
    return null;
  }

  const hasEducation = education.length > 0;
  const hasCertifications = certifications.length > 0;
  const hasAchievements = achievements.length > 0;
  const hasAwards = hasCertifications || hasAchievements;
  const splitAwards = hasCertifications && hasAchievements;

  return (
    <section
      id="background"
      aria-labelledby="background-title"
      tabIndex={-1}
      className="py-16 focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <div className="mb-9">
          <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
            Education and recognition
          </p>
          <h2
            id="background-title"
            className="mt-3.5 text-headline font-medium leading-none tracking-[-0.06em]"
          >
            Background<span className="text-accent">.</span>
          </h2>
        </div>

        <div className="space-y-10">
          {hasEducation ? <EducationList items={education} /> : null}

          {hasAwards ? (
            <div className={splitAwards ? 'grid gap-x-16 gap-y-10 md:grid-cols-2' : ''}>
              {hasCertifications ? <CertificationList items={certifications} /> : null}
              {hasAchievements ? <AchievementList items={achievements} /> : null}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
