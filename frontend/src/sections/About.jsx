import { usePortfolio } from '../PortfolioContext.jsx';
import Container from '../components/Container.jsx';

/**
 * Personal context only. Institution, qualification, years, CGPA, and location
 * are intentionally absent: education is presented once, in Background, from
 * the database records. The optional headline is a positioning line, not an
 * academic summary.
 */
export default function About() {
  const { profile } = usePortfolio();

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      tabIndex={-1}
      className="py-16 focus:outline-none sm:py-20 lg:py-28"
    >
      <Container className="grid gap-9 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-x-16 lg:gap-y-9">
        <div>
          <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
            A little about me
          </p>
          {/* The heading sits in a column that stops growing at the 1200px container
              width, so its size is capped to keep both sentences on one line each.
              Before, the clamp kept growing with the viewport and "Practical by
              design." broke after "by" from 1366px up. */}
          <h2
            id="about-title"
            className="mt-5 text-[clamp(2.15rem,4.6vw,3.9rem)] font-medium leading-none tracking-[-0.065em]"
          >
            Curious by nature.
            <br />
            <span className="text-accent">Practical by design.</span>
          </h2>
          {profile.headline ? (
            <p className="mt-5 max-w-[34ch] text-[0.98rem] leading-relaxed text-muted">
              {profile.headline}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          {profile.bio.map((paragraph, index) => (
            <p
              key={index}
              className={
                index === 0
                  ? 'text-[clamp(1.08rem,1.65vw,1.35rem)] leading-relaxed tracking-[-0.02em]'
                  : 'mt-4 text-[0.92rem] leading-relaxed text-muted'
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
      </Container>
    </section>
  );
}
