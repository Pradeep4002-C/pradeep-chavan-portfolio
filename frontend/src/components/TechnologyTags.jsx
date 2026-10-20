/* One tag recipe for the whole page. The project technology lists and the About
   skills list render the same pill: same radius, border, type size, weight, and
   text colour. Keep new tag-like lists on this class rather than adding a second
   near-identical treatment. */
export const tagClass =
  'rounded-full border border-line bg-paper px-2.5 py-1.5 text-[0.7rem] font-semibold text-[#56564f]';

/** Reusable list of technologies shown beneath a project description. */
export default function TechnologyTags({ items = [], label = 'Technologies used' }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-5 flex flex-wrap gap-1.5" aria-label={label}>
      {items.map((item) => (
        <li key={item} className={tagClass}>
          {item}
        </li>
      ))}
    </ul>
  );
}
