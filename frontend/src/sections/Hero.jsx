import { useEffect, useState } from 'react';
import { usePortfolio } from '../PortfolioContext.jsx';
import Arrow from '../components/Arrow.jsx';
import Button from '../components/Button.jsx';
import Container from '../components/Container.jsx';

const greeting = "Hello, I'm Pradeep Chavan";
const TYPE_DELAY = 45;
const START_DELAY = 150;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function Hero() {
  const { profile } = usePortfolio();
  const [typedGreeting, setTypedGreeting] = useState(() =>
    prefersReducedMotion() ? greeting : '',
  );
  const [isTyping, setIsTyping] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (motionQuery.matches) {
      setTypedGreeting(greeting);
      setIsTyping(false);
      return undefined;
    }

    let characterIndex = 0;
    let timerId;

    const typeNextCharacter = () => {
      characterIndex += 1;
      setTypedGreeting(greeting.slice(0, characterIndex));

      if (characterIndex < greeting.length) {
        timerId = window.setTimeout(typeNextCharacter, TYPE_DELAY);
      } else {
        setIsTyping(false);
      }
    };

    timerId = window.setTimeout(typeNextCharacter, START_DELAY);

    // If reduced motion is enabled mid-animation, reveal the greeting at once.
    function handleMotionChange(event) {
      if (event.matches) {
        window.clearTimeout(timerId);
        setTypedGreeting(greeting);
        setIsTyping(false);
      }
    }

    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.clearTimeout(timerId);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <section
      id="home"
      aria-labelledby="hero-title"
      tabIndex={-1}
      className="pt-14 pb-10 focus:outline-none sm:pt-20 sm:pb-14 lg:pt-24"
    >
      <Container>
        <p className="min-h-[1.6em] text-lg font-semibold tracking-[-0.02em] text-accent sm:text-xl">
          <span aria-hidden="true">
            {typedGreeting}
            {isTyping && (
              <span className="ml-0.5 inline-block h-[1.05em] w-px translate-y-[0.14em] bg-current align-baseline animate-blink motion-reduce:hidden" />
            )}
          </span>
          <span className="sr-only">{greeting}</span>
        </p>

        <h1
          id="hero-title"
          className="mt-6 max-w-[16ch] text-display font-medium leading-[0.98] tracking-[-0.075em] text-balance"
        >
          I build digital tools that <span className="text-accent">make work easier.</span>
        </h1>

        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <p className="max-w-[560px] text-base leading-relaxed text-muted sm:text-lg">
            {profile.intro}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button href="#work">
              Explore selected work <Arrow down />
            </Button>
            <Button
              href={profile.github}
              variant="outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub profile <Arrow diagonal />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
