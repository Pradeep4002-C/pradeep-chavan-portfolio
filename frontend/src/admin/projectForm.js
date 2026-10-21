/**
 * Turns a title into a URL-safe slug that matches the Project model's rule:
 * lowercase words separated by single hyphens.
 */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

/** Splits a comma separated technology input into a clean, de-duplicated list. */
export function parseTechnologies(value) {
  const seen = new Set();
  const result = [];

  for (const raw of String(value ?? '').split(',')) {
    const item = raw.trim();
    if (item.length === 0) {
      continue;
    }
    const key = item.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

/** Renders a technology list back into the comma separated input format. */
export function formatTechnologies(items) {
  return Array.isArray(items) ? items.join(', ') : '';
}
