/**
 * A skill section exists only when the public API has supplied at least one
 * complete group. Keeping this rule in one place lets the section and its
 * navigation link appear and disappear together.
 */
export function hasSkillGroups(groups) {
  return (
    Array.isArray(groups) &&
    groups.some(
      (group) =>
        group &&
        typeof group.label === 'string' &&
        group.label.trim().length > 0 &&
        Array.isArray(group.items) &&
        group.items.some((item) => typeof item === 'string' && item.trim().length > 0),
    )
  );
}
