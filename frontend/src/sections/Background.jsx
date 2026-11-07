import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';
import { formatCgpa, formatPeriod, hasBackgroundContent } from './backgroundContent.js';

const linkClass =
  'group -mb-3 inline-flex min-h-[48px] min-w-[48px] items-start gap-1.5 font-semibold underline decoration-line-strong decoration-1 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui hover:text-accent hover:decoration-accent focus-visible:text-accent focus-visible:decoration-accent';
const cardClass = 'rounded-2xl border border-line-strong bg-surface';
const metaLabelClass =
  'block text-[0.64rem] font-bold uppercase tracking-[0.12em] text-subtle';

function Subsection({ title, description, listClassName = '', children }) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-[0.95rem] font-bold">{title}</h3>
        {description ? (
          <p className="mt-1 text-[0.8rem] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      <ul className={listClassName}>{children}</ul>
    </div>
  );
}

function EducationList({ items }) {
  return (
    <Subsection
      title="Education"
      description="Academic foundation and current study."
      listClassName="grid gap-4"
    >
      {items.map((item, index) => {
        const period = formatPeriod(item.startYear, item.endYear);
        const score = formatCgpa(item.score);
        const hasMeta = Boolean(period || item.location);

        return (
          <li key={`${item.institution}-${index}`} className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-[clamp(1.25rem,2vw,1.55rem)] font-semibold leading-tight tracking-[-0.035em]">
                  {item.institution}
                </h4>
                {item.qualification ? (
                  <p className="mt-2 text-[1rem] font-medium leading-relaxed text-ink">
                    {item.qualification}
                  </p>
                ) : null}
                {item.field ? (
                  <p className="mt-0.5 text-[0.92rem] leading-relaxed text-muted">
                    {item.field}
                  </p>
                ) : null}
              </div>

              {/* Ink on the soft accent keeps the score at 14:1; accent-on-soft
                  only reaches 4.28:1 at this size. */}
              {score ? (
                <p className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-[0.76rem] font-semibold text-ink">
                  CGPA · {score}
                </p>
              ) : null}
            </div>

            {hasMeta ? (
              <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t border-line pt-4">
                {period ? (
                  <div>
                    <dt className={metaLabelClass}>Duration</dt>
                    <dd className="mt-1 text-[0.82rem] font-medium tabular-nums text-ink">
                      {period}
                    </dd>
                  </div>
                ) : null}
                {item.location ? (
                  <div>
                    <dt className={metaLabelClass}>Location</dt>
                    <dd className="mt-1 text-[0.82rem] leading-relaxed text-muted">
                      {item.location}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </li>
        );
      })}
    </Subsection>
  );
}

function CertificationList({ items, listClassName = '' }) {
  return (
    <Subsection
      title="Certifications"
      description="Focused coursework and verified learning."
      listClassName={`grid gap-4 ${listClassName}`}
    >
      {items.map((item, index) => {
        const meta = [item.issuer, item.year === null ? null : String(item.year)]
          .filter(Boolean)
          .join(' · ');

        return (
          <li
            key={`${item.title}-${index}`}
            className={`${cardClass} flex flex-col p-5`}
          >
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.12em] text-subtle">
              Certificate {String(index + 1).padStart(2, '0')}
            </p>
            <h4 className="mt-2.5 text-[1.02rem] font-semibold leading-snug tracking-[-0.015em]">
              {item.title}
            </h4>
            {meta ? <p className="mt-1.5 text-[0.82rem] text-muted">{meta}</p> : null}
            {item.url ? (
              <a
                className={`${linkClass} mt-auto pt-4 text-[0.8rem]`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View credential
                <Arrow diagonal className="mt-[2px]" />
                <span className="sr-only">: {item.title} (opens in a new tab)</span>
              </a>
            ) : null}
          </li>
        );
      })}
    </Subsection>
  );
}

function AchievementList({ items, listClassName = '' }) {
  return (
    <Subsection
      title="Achievements"
      description="Recognitions and milestones."
      listClassName={`grid gap-4 ${listClassName}`}
    >
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className={`${cardClass} p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h4 className="text-[0.98rem] font-semibold leading-relaxed">{item.title}</h4>
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
 *
 * With the usual single degree and two certificates, education forms the wider
 * left column and the certificates stack beside it. The layout collapses to one
 * column on smaller screens, and optional subsections stay hidden when empty.
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
  const hasTwoColumns = hasEducation && hasAwards;

  const certificationGrid = hasTwoColumns
    ? 'sm:grid-cols-2 lg:grid-cols-1'
    : 'sm:grid-cols-2';
  const achievementGrid = hasTwoColumns
    ? 'sm:grid-cols-2 lg:grid-cols-1'
    : 'sm:grid-cols-2';

  return (
    <section
      id="background"
      aria-labelledby="background-title"
      tabIndex={-1}
      className="bg-sunken py-16 focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <div className="mb-9 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-9">
          <div>
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
          <p className="max-w-[360px] text-[0.92rem] leading-relaxed text-muted lg:mb-1">
            The academic foundation and certifications behind the work above.
          </p>
        </div>

        <div
          className={
            hasTwoColumns
              ? 'grid gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:gap-12'
              : 'space-y-10'
          }
        >
          {hasEducation ? <EducationList items={education} /> : null}

          {hasAwards ? (
            <div className="space-y-10">
              {hasCertifications ? (
                <CertificationList
                  items={certifications}
                  listClassName={
                    certifications.length > 1 ? certificationGrid : ''
                  }
                />
              ) : null}
              {hasAchievements ? (
                <AchievementList
                  items={achievements}
                  listClassName={
                    achievements.length > 1 ? achievementGrid : ''
                  }
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
