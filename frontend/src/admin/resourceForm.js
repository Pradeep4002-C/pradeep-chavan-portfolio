/**
 * Generic form helpers for the administrator content collections (skill
 * groups, education, certifications, achievements).
 *
 * Each collection is described by an array of field descriptors, and these
 * pure functions turn descriptors + a record into editable string values, turn
 * the edited values back into a request payload, and validate them. Keeping the
 * logic here (rather than inside the React component) means one implementation
 * is shared by every collection and can be unit tested without a DOM.
 *
 * Field descriptor: {
 *   name, label,
 *   type: 'text' | 'textarea' | 'stringList' | 'number' | 'year' | 'url',
 *   required?: boolean,
 *   requiredMessage?: string,
 *   maxLength?: number,
 *   min?: number, max?: number,        // number fields
 *   maxItems?: number, itemMaxLength?: number,  // stringList
 *   default?: number,                  // number fields
 *   placeholder?, hint?, rows?, span?, inputMode?,
 * }
 */

/** True for absolute http:// and https:// URLs only. */
export function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Splits a comma separated input into a trimmed, de-duplicated list. */
export function parseList(value) {
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

function isNumericField(field) {
  return field.type === 'number' || field.type === 'year';
}

/** A fresh, empty values object for a create form. */
export function emptyValues(fields) {
  const values = {};

  for (const field of fields) {
    if (isNumericField(field)) {
      values[field.name] = field.default != null ? String(field.default) : '';
    } else {
      values[field.name] = '';
    }
  }

  return values;
}

/** Editable string values for an existing record. */
export function valuesFromItem(fields, item) {
  const values = {};
  const record = item ?? {};

  for (const field of fields) {
    const raw = record[field.name];

    if (field.type === 'stringList') {
      values[field.name] = Array.isArray(raw) ? raw.join(', ') : '';
    } else if (isNumericField(field)) {
      values[field.name] = raw == null ? '' : String(raw);
    } else {
      values[field.name] = typeof raw === 'string' ? raw : '';
    }
  }

  return values;
}

/**
 * Turns edited values into a request payload. Empty optional numbers are
 * omitted entirely so they never overwrite a stored value with 0.
 */
export function buildPayload(fields, values) {
  const payload = {};

  for (const field of fields) {
    const raw = values[field.name];
    const text = String(raw ?? '').trim();

    if (field.type === 'stringList') {
      payload[field.name] = parseList(raw);
      continue;
    }

    if (isNumericField(field)) {
      if (text === '') {
        if (field.required) {
          // Validation runs first; this only keeps the payload shaped.
          payload[field.name] = Number.NaN;
        }
        continue;
      }
      payload[field.name] = Number(text);
      continue;
    }

    payload[field.name] = text;
  }

  return payload;
}

/** Client-side validation mirroring the server rules. */
export function validateFields(fields, values, crossValidate) {
  const errors = {};

  for (const field of fields) {
    const text = String(values[field.name] ?? '').trim();
    const label = field.label ?? field.name;

    if (field.type === 'stringList') {
      const items = parseList(values[field.name]);

      if (field.required && items.length === 0) {
        errors[field.name] = field.requiredMessage ?? 'Add at least one entry.';
        continue;
      }
      if (field.maxItems != null && items.length > field.maxItems) {
        errors[field.name] = `Use at most ${field.maxItems} entries.`;
        continue;
      }
      if (field.itemMaxLength != null && items.some((item) => item.length > field.itemMaxLength)) {
        errors[field.name] = `Each entry must be ${field.itemMaxLength} characters or fewer.`;
      }
      continue;
    }

    if (isNumericField(field)) {
      if (text === '') {
        if (field.required) {
          errors[field.name] = field.requiredMessage ?? `Enter a ${label.toLowerCase()}.`;
        }
        continue;
      }

      const numeric = Number(text);
      if (!Number.isInteger(numeric)) {
        errors[field.name] = `${label} must be a whole number.`;
        continue;
      }

      const min = field.type === 'year' ? 1950 : field.min;
      const max = field.type === 'year' ? 2100 : field.max;
      if (min != null && numeric < min) {
        errors[field.name] = `${label} must be ${min} or more.`;
        continue;
      }
      if (max != null && numeric > max) {
        errors[field.name] = `${label} must be ${max} or less.`;
      }
      continue;
    }

    if (field.type === 'url') {
      if (text === '') {
        if (field.required) {
          errors[field.name] = field.requiredMessage ?? `Enter a ${label.toLowerCase()}.`;
        }
        continue;
      }
      if (!isHttpUrl(text)) {
        errors[field.name] = 'Enter a valid http or https URL.';
        continue;
      }
      if (field.maxLength != null && text.length > field.maxLength) {
        errors[field.name] = `${label} must be ${field.maxLength} characters or fewer.`;
      }
      continue;
    }

    // text / textarea
    if (field.required && text === '') {
      errors[field.name] = field.requiredMessage ?? `Enter ${label.toLowerCase()}.`;
      continue;
    }
    if (field.maxLength != null && text.length > field.maxLength) {
      errors[field.name] = `${label} must be ${field.maxLength} characters or fewer.`;
    }
  }

  if (typeof crossValidate === 'function') {
    crossValidate(values, errors);
  }

  return errors;
}
