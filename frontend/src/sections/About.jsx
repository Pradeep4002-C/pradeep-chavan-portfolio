import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';
import { tagClass } from '../components/TechnologyTags.jsx';

export default function About() {
  const { profile, skillGroups } = usePortfolio();

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      tabIndex={-1}
      className="bg-sunken py-16 focus:outline-none sm:py-20 lg:py-28"
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
        </div>

        <div className="min-w-0">
          <p className="text-[clamp(1.08rem,1.65vw,1.35rem)] leading-relaxed tracking-[-0.02em]">
            I learn best by making things — figuring out how interfaces, backend systems,
            automation, and data-driven ideas come together.
          </p>
          <p className="mt-4 text-[0.92rem] leading-relaxed text-muted">
            I&rsquo;m building my foundations in software engineering while turning what I learn
            into projects. I care about clear problem-solving, maintainable code, and making
            software that is genuinely useful.
          </p>

          <p className="mt-6 flex items-start gap-2.5 border-t border-line-strong pt-5 text-[0.8rem] leading-relaxed text-muted">
            <Arrow diagonal className="mt-[3px] text-accent" />
            {profile.education}
          </p>

          <div className="mt-10">
            <h3 className="mb-4 text-[0.92rem] font-bold">Tools I work with</h3>
            <div className="border-t border-line-strong">
              {skillGroups.map((group, index) => {
                const labelId = `skill-group-${index}`;
                return (
                  <div
                    key={group.label}
                    className="grid gap-2 border-b border-line-strong py-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3.5"
                  >
                    <span id={labelId} className="pt-0.5 text-[0.74rem] text-subtle sm:pt-1">
                      {group.label}
                    </span>
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
          </div>
        </div>
      </Container>
    </section>
  );
}
