import { usePortfolio } from '../PortfolioContext.jsx';
import Container from '../components/Container.jsx';

/* Every Bento cell shares the same surface, border, radius, and shadow. The
   entrance is a native @starting-style transition: the card starts faded and
   slightly lower, then eases into place without any animation library. */
const cellClass =
  'flex flex-col rounded-2xl border border-line-strong bg-surface p-6 shadow-sm transition-all duration-700 ease-out starting:opacity-0 starting:translate-y-4 sm:p-7';

/**
 * Personal context only. Institution, qualification, years, CGPA, and location
 * are intentionally absent: education is presented once, in Background, from
 * the database records. The optional headline is a positioning line, not an
 * academic summary.
 *
 * The heading and Profile bio occupy two half-width cells that stretch equally
 * on the top row, and any continued bio spans the full width beneath them. The
 * optional headline stays inside the Profile cell so the section keeps three
 * clear Bento footprints. The whole arrangement collapses to one column on
 * mobile.
 */
export default function About() {
  const { profile } = usePortfolio();
  const bio = Array.isArray(profile.bio) ? profile.bio : [];
  const leadParagraph = bio[0] ?? null;
  const remainingBio = bio.slice(1);
  const hasBio = bio.length > 0;
  const hasHeadline = Boolean(profile.headline);
  const hasProfileCell = hasBio || hasHeadline;

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      tabIndex={-1}
      className="py-16 focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <div
            className={`${cellClass} ${
              hasProfileCell ? 'md:col-span-2' : 'md:col-span-4'
            }`}
            style={{ transitionDelay: '0ms' }}
          >
            <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
              A little about me
            </p>
            {/* The heading sits in a column that stops growing at the 1200px container
                width, so its size is capped to keep both sentences on one line each.
                Before, the clamp kept growing with the viewport and "Practical by
                design." broke after "by" from 1366px up. */}
            <h2
              id="about-title"
              className="mt-5 text-[clamp(2.15rem,4.6vw,3.9rem)] font-medium leading-none tracking-[-0.065em] [overflow-wrap:anywhere]"
            >
              Curious by nature.
              <br />
              <span className="text-accent">Practical by design.</span>
            </h2>
          </div>

          {hasProfileCell ? (
            <div
              className={`${cellClass} md:col-span-2`}
              style={{ transitionDelay: '70ms' }}
            >
              <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
                Profile
              </p>
              {hasBio ? (
                <p className="mt-5 text-[clamp(1.08rem,1.65vw,1.35rem)] leading-relaxed tracking-[-0.02em] [overflow-wrap:anywhere]">
                  {leadParagraph}
                </p>
              ) : null}
              {hasHeadline ? (
                <div className={hasBio ? 'mt-6 border-t border-line pt-5' : 'mt-5'}>
                  <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
                    Current focus
                  </p>
                  <p className="mt-3 text-[clamp(1.08rem,1.65vw,1.35rem)] leading-relaxed tracking-[-0.02em] [overflow-wrap:anywhere]">
                    {profile.headline}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {remainingBio.length > 0 ? (
            <div
              className={`${cellClass} md:col-span-4`}
              style={{ transitionDelay: '140ms' }}
            >
              <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
                Continued
              </p>
              <div className="mt-4 max-w-[68ch]">
                {remainingBio.map((paragraph, index) => (
                  <p
                    key={index}
                    className={`${index === 0 ? '' : 'mt-4 '}text-[0.92rem] leading-relaxed text-muted [overflow-wrap:anywhere]`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
