import { profile } from '../data/portfolio.js';
import Arrow from '../components/Arrow.jsx';
import Container from '../components/Container.jsx';

const socials = [
  { label: 'GitHub', href: profile.github },
  { label: 'LinkedIn', href: profile.linkedin },
  { label: 'LeetCode', href: profile.leetcode },
];

/** Footer holds the profile links and a small copyright line.
    The brand mark lives only in the header, so it is not repeated here. */
export default function Footer() {
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-6 sm:py-7">
        <p className="text-[0.78rem] text-muted">
          &copy; {new Date().getFullYear()} {profile.name}
        </p>

        <nav aria-label="Social links" className="flex flex-wrap gap-5">
          {socials.map((social) => (
            <a
              key={social.label}
              className="group inline-flex cursor-pointer items-center gap-1 text-[0.78rem] text-muted transition-ui hover:text-accent"
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {social.label} <Arrow diagonal />
            </a>
          ))}
        </nav>

        <a
          className="group ml-auto inline-flex cursor-pointer items-center gap-1 text-[0.78rem] text-muted transition-ui hover:text-accent sm:ml-0"
          href="#home"
        >
          Back to top <Arrow up />
        </a>
      </Container>
    </footer>
  );
}
