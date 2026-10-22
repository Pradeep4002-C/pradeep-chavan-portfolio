/**
 * Presentation helpers for the public Background section.
 *
 * They stay outside the component so the visibility rule, the date formatting,
 * and the compact education line can be checked without a DOM.
 */

function asText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * True when at least one background collection holds a record. The navigation
 * link and the section itself use this same rule, so neither can point at
 * content that is not there.
 */
export function hasBackgroundContent({ education, certifications, achievements } = {}) {
  return [education, certifications, achievements].some(
    (records) => Array.isArray(records) && records.length > 0,
  );
}

/** Formats a study period, tolerating a missing start or end year. */
export function formatPeriod(startYear, endYear) {
  const start = Number.isInteger(startYear) ? startYear : null;
  const end = Number.isInteger(endYear) ? endYear : null;

  if (start !== null && end !== null) {
    return `${start}–${end}`;
  }
  if (start !== null) {
    return String(start);
  }
  if (end !== null) {
    return String(end);
  }
  return null;
}

/**
 * One-line summary used by the About section. Mirrors the approved line
 * ("field · institution · years") and returns null when a record has no
 * institution to name, so the bundled copy can stay in place.
 */
export function summarizeEducation(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const institution = asText(record.institution);
  if (!institution) {
    return null;
  }

  const programme = asText(record.field) ?? asText(record.qualification);

  return [programme, institution, formatPeriod(record.startYear, record.endYear)]
    .filter(Boolean)
    .join(' · ');
}
