import { useEffect, useState } from 'react';
import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Button from '../components/Button.jsx';
import Container from '../components/Container.jsx';
import DownloadIcon from '../components/DownloadIcon.jsx';
import { withoutRepeatedName } from './heroCopy.js';

const TYPE_DELAY = 68;
const SPACE_DELAY = 115;
const START_DELAY = 220;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The first screen answers three questions without an animation delay: who this
 * is, what they build, and where to look next. The name is typed once, while the
 * actions and links render immediately.
 *
 * The heading reserves its final size with an invisible copy of the full name so
 * the page never reflows as characters arrive. Screen readers get the complete
 * name from the single `sr-only` copy; both the spacer and the animated text are
 * hidden from the accessibility tree.
 */
export default function Hero() {
  const { profile } = usePortfolio();
  const resumeHref = `${import.meta.env.BASE_URL}${profile.resume}`;
  const fullName = `${profile.name.trim().replace(/\.$/, '')}.`;
  const intro = withoutRepeatedName(profile.intro, profile.name);

  const [typedName, setTypedName] = useState(() =>
    prefersReducedMotion() ? fullName : '',
  );
  const [isTyping, setIsTyping] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Reduced motion shows the finished heading immediately.
    if (motionQuery.matches) {
      setTypedName(fullName);
      setIsTyping(false);
      return undefined;
    }

    let characterIndex = 0;
    let timerId;

    // Re-starting is deliberate: React StrictMode runs mount effects twice in
    // development, and the second run must replay the animation rather than jump
    // to the end. In production the effect runs once per name.
    setTypedName('');
    setIsTyping(true);

    const typeNextCharacter = () => {
      characterIndex += 1;
      setTypedName(fullName.slice(0, characterIndex));

      if (characterIndex >= fullName.length) {
        setIsTyping(false);
        return;
      }

      // A slightly longer beat after the space keeps the rhythm natural.
      timerId = window.setTimeout(
        typeNextCharacter,
        fullName[characterIndex - 1] === ' ' ? SPACE_DELAY : TYPE_DELAY,
      );
    };

    timerId = window.setTimeout(typeNextCharacter, START_DELAY);

    function handleMotionChange(event) {
      if (!event.matches) return;
      window.clearTimeout(timerId);
      setTypedName(fullName);
      setIsTyping(false);
    }

    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.clearTimeout(timerId);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, [fullName]);

  const showsFullStop = typedName.endsWith('.');
  const visibleName = showsFullStop ? typedName.slice(0, -1) : typedName;

  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      tabIndex={-1}
      className="pt-10 pb-12 focus:outline-none sm:pt-16 sm:pb-16 lg:pt-24 lg:pb-20"
    >
      <Container>
        <div className="max-w-[920px]">
          <p className="text-kicker font-bold uppercase tracking-[0.14em] text-subtle">
            Hello, I&rsquo;m
          </p>

          {/* The spacer is invisible but occupies the finished name, so the
              heading keeps its final two-line height from the first frame. */}
          <h1
            id="hero-title"
            className="relative mt-3 text-display font-medium leading-[0.92] tracking-[-0.075em]"
          >
            <span className="sr-only">{fullName}</span>
            <span aria-hidden="true" className="invisible block">
              {fullName}
            </span>
            <span aria-hidden="true" className="absolute inset-0 block">
              {visibleName}
              {showsFullStop ? <span className="text-accent">.</span> : null}
              {isTyping ? (
                <span className="ml-[0.06em] inline-block h-[0.74em] w-[2px] translate-y-[0.1em] animate-blink rounded-full bg-accent align-baseline sm:w-[3px]" />
              ) : null}
            </span>
          </h1>

          <p className="mt-4 text-[0.95rem] font-semibold tracking-[-0.01em] text-ink sm:text-[1.02rem]">
            Computer Science Engineering Student
            <span aria-hidden="true" className="px-1.5 text-subtle">
              ·
            </span>
            <span className="sr-only"> and </span>
            Full-Stack Developer
          </p>

          <p className="mt-4 max-w-[640px] text-[clamp(1.06rem,1.9vw,1.35rem)] font-medium leading-snug tracking-[-0.015em] text-ink">
            {intro}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-8">
            <Button href="#work">
              View projects <Arrow down />
            </Button>
            <Button
              href={resumeHref}
              variant="outline"
              download="Pradeep_Chavan_Resume.pdf"
            >
              Download resume <DownloadIcon />
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.82rem] font-semibold">
            <a
              className="group inline-flex items-center gap-1.5 text-ink transition-ui hover:text-accent"
              href={profile.github}
              target="_blank"
              rel="me noopener noreferrer"
            >
              GitHub <Arrow diagonal />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a
              className="group inline-flex items-center gap-1.5 text-ink transition-ui hover:text-accent"
              href={profile.linkedin}
              target="_blank"
              rel="me noopener noreferrer"
            >
              LinkedIn <Arrow diagonal />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
