import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';

/** Footer closes with an oversized contact CTA, then the profile links and a
    small copyright line. The brand mark lives only in the header, so it is not
    repeated here. */
export default function Footer() {
  const { profile } = usePortfolio();
  const socials = [
    { label: 'GitHub', href: profile.github },
    { label: 'LinkedIn', href: profile.linkedin },
    { label: 'LeetCode', href: profile.leetcode },
  ].filter((social) => social.href);
  const contactHref = profile.email ? `mailto:${profile.email}` : '#contact';

  return (
    <footer className="border-t border-line">
      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="border-b border-line pb-10 sm:pb-12">
          <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
            Have a project in mind?
          </p>
          <a
            className="group mt-4 inline-flex min-h-[48px] min-w-[48px] max-w-full items-center gap-2 text-balance text-5xl font-bold leading-tight tracking-tight text-ink outline-none transition-ui focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 hover:text-accent md:text-7xl"
            href={contactHref}
          >
            <span>
              Let&rsquo;s work together<span className="text-accent">.</span>
            </span>
            <Arrow diagonal />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 pt-6 sm:pt-7">
          <p className="text-[0.78rem] text-muted">
            &copy; {new Date().getFullYear()} {profile.name}
          </p>

          {socials.length > 0 ? (
            <nav aria-label="Social links" className="flex flex-wrap gap-5">
              {socials.map((social) => (
                <a
                  key={social.label}
                  className="group -mx-2 -my-3.5 inline-flex min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center gap-1 px-2 text-[0.78rem] text-muted outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui hover:text-accent"
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {social.label} <Arrow diagonal />
                </a>
              ))}
            </nav>
          ) : null}

          <a
            className="group -my-3.5 ml-auto inline-flex min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center gap-1 text-[0.78rem] text-muted outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 transition-ui hover:text-accent sm:ml-0"
            href="#home"
          >
            Back to top <Arrow up />
          </a>
        </div>
      </Container>
    </footer>
  );
}
