import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';

export default function Contact() {
  const { profile } = usePortfolio();

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      tabIndex={-1}
      className="bg-night py-16 text-[#f9f8f4] focus:outline-none sm:py-20 lg:py-28"
    >
      <Container>
        <p className="text-kicker font-bold uppercase tracking-[0.14em] text-night-soft">
          Have something in mind?
        </p>
        <h2
          id="contact-title"
          className="mt-5 text-[clamp(3rem,7vw,6.4rem)] font-medium leading-[0.98] tracking-[-0.065em]"
        >
          Let&rsquo;s build something <span className="text-[#b8abff]">useful.</span>
        </h2>

        <div className="mt-8 flex flex-col gap-6 border-t border-white/15 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[420px] text-[0.92rem] leading-relaxed text-night-soft">
            I&rsquo;m always glad to connect about software, projects, and opportunities to learn by
            building.
          </p>
          <div className="flex flex-col gap-1.5">
            <a
              className="group inline-flex max-w-full items-center gap-1.5 text-[clamp(0.98rem,1.8vw,1.3rem)] font-medium transition-ui hover:text-[#c3b7ff] [overflow-wrap:anywhere]"
              href={`mailto:${profile.email}`}
            >
              {profile.email} <Arrow />
            </a>
            <p className="text-[0.8rem] text-night-soft/80">Based in {profile.location}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
