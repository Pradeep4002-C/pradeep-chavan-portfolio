/**
 * The hero prints the name once, as the heading. A database introduction that
 * opens with the same self-introduction ("I'm Pradeep, ...") would repeat it, so
 * the leading greeting and name are removed at render time. The stored record is
 * never changed; the rest of the sentence is preserved word for word.
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function withoutRepeatedName(intro, name) {
  const text = typeof intro === 'string' ? intro.trim() : '';
  const fullName = typeof name === 'string' ? name.trim() : '';

  if (!text || !fullName) {
    return text;
  }

  const firstName = fullName.split(/\s+/)[0];
  const names = [...new Set([fullName, firstName])].filter(Boolean).map(escapeRegExp);

  // Only a leading self-introduction is removed: an optional greeting, an
  // optional "I'm / I am / my name is", the name, and the punctuation that
  // closes the clause. A name used anywhere else in the sentence is untouched.
  const leading = new RegExp(
    `^(?:(?:hi|hello|hey)[,]?\\s+)?(?:i['’]m|i am|my name is)?\\s*(?:${names.join('|')})\\s*[,:–—-]\\s*`,
    'i',
  );

  if (!leading.test(text)) {
    return text;
  }

  const rest = text.replace(leading, '').trim();
  if (!rest) {
    return text;
  }

  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
