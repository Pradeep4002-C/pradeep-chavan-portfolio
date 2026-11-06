/**
 * Presentation helpers for the public Background section.
 *
 * They stay outside the component so the visibility rule, date formatting,
 * and score presentation can be checked without a DOM.
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
 * Presents a plain numeric CGPA with its scale. Existing non-numeric score
 * formats are preserved rather than guessed, and an existing scale is never
 * duplicated. This keeps the public presentation driven by stored data.
 */
export function formatCgpa(score) {
  const value = asText(score);
  if (!value) {
    return null;
  }

  const withoutLabel = value.replace(/^cgpa\s*:?\s*/i, '').trim();
  if (/^\d+(?:\.\d+)?$/.test(withoutLabel)) {
    return `${withoutLabel} / 10`;
  }
  if (/^\d+(?:\.\d+)?\s*\/\s*10$/.test(withoutLabel)) {
    return withoutLabel.replace(/\s*\/\s*/, ' / ');
  }
  return value;
}
