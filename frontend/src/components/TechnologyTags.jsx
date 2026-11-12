/* Tag recipes share one geometry: the same radius, padding, type size, and
   weight. The neutral `tagClass` is used by the About skills list; project
   technologies use `projectTagClass`, whose accent tint makes the stack read as
   part of the project's proof. Keep new tag-like lists on one of these two
   recipes rather than adding a third near-identical treatment. */
export const tagClass =
  'max-w-full rounded-full border border-line bg-paper px-2.5 py-1.5 text-[0.7rem] font-semibold text-[#56564f] [overflow-wrap:anywhere]';

/* Project pills use the accent tint so the technology stack reads as part of
   the project's proof rather than as a neutral metadata strip. */
export const projectTagClass =
  'max-w-full rounded-full border border-accent-soft bg-accent-soft/50 px-2.5 py-1.5 text-[0.7rem] font-semibold text-accent-strong [overflow-wrap:anywhere]';

/** Reusable list of technologies shown beneath a project description. */
export default function TechnologyTags({
  items = [],
  label = 'Technologies used',
  className = 'mt-5',
  tagClassName = tagClass,
}) {
  if (items.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label={label}>
      {items.map((item) => (
        <li key={item} className={tagClassName}>
          {item}
        </li>
      ))}
    </ul>
  );
}
