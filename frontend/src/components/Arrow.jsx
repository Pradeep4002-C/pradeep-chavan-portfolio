/**
 * Inline SVG arrow.
 *
 * This used to be a text glyph (→ / ↗ / ↓ / ↑). Characters such as U+2197
 * "↗" are emoji-capable, so Windows painted the resume arrow as a blue emoji
 * tile. Drawing the arrow as inline SVG gives one font-independent shape that
 * inherits the surrounding text colour via `currentColor`.
 */
const paths = {
  right: ['M5 12h14', 'm13 6 6 6-6 6'],
  down: ['M12 5v14', 'm6 13 6 6 6-6'],
  up: ['M12 19V5', 'm6 11 6-6 6 6'],
  diagonal: ['M7 17 17 7', 'M7 7h10v10'],
};

const hover = {
  right: 'group-hover:translate-x-0.5',
  down: 'group-hover:translate-y-0.5',
  up: 'group-hover:-translate-y-0.5',
  diagonal: 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
};

export default function Arrow({ diagonal = false, down = false, up = false, className = '' }) {
  const direction = down ? 'down' : up ? 'up' : diagonal ? 'diagonal' : 'right';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[1.05em] w-[1.05em] shrink-0 transition-transform ${hover[direction]} ${className}`}
    >
      {paths[direction].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
