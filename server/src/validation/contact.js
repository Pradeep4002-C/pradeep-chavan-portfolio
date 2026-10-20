import { z } from 'zod';
import { EMAIL_PATTERN } from '../lib/validators.js';

/**
 * Public contact form contract. Unknown keys are rejected so a request cannot
 * smuggle database fields such as `read`, `meta`, or timestamps into the model.
 *
 * `website` and `formStartedAt` are anti-spam fields. Their types are
 * deliberately unconstrained here: the route treats missing, malformed, or
 * hostile values as a spam signal rather than returning a message that reveals
 * which check failed.
 */
export const CONTACT_LIMITS = Object.freeze({
  nameMin: 1,
  nameMax: 80,
  emailMax: 254,
  subjectMax: 120,
  messageMin: 10,
  messageMax: 5000,
});

export const MIN_FORM_AGE_MS = 2000;

export const contactSchema = z
  .object({
    name: z
      .string({ error: 'Enter your name.' })
      .trim()
      .min(CONTACT_LIMITS.nameMin, 'Enter your name.')
      .max(CONTACT_LIMITS.nameMax, `Name must be ${CONTACT_LIMITS.nameMax} characters or fewer.`),
    email: z
      .string({ error: 'Enter your email address.' })
      .trim()
      .toLowerCase()
      .min(1, 'Enter your email address.')
      .max(
        CONTACT_LIMITS.emailMax,
        `Email must be ${CONTACT_LIMITS.emailMax} characters or fewer.`,
      )
      .regex(EMAIL_PATTERN, 'Enter a valid email address.'),
    subject: z
      .string({ error: 'Subject must be text.' })
      .trim()
      .max(
        CONTACT_LIMITS.subjectMax,
        `Subject must be ${CONTACT_LIMITS.subjectMax} characters or fewer.`,
      )
      .optional(),
    message: z
      .string({ error: 'Enter a message.' })
      .trim()
      .min(CONTACT_LIMITS.messageMin, `Message must be at least ${CONTACT_LIMITS.messageMin} characters.`)
      .max(
        CONTACT_LIMITS.messageMax,
        `Message must be ${CONTACT_LIMITS.messageMax} characters or fewer.`,
      ),
    website: z.unknown().optional(),
    formStartedAt: z.unknown().optional(),
  })
  .strict();

/**
 * Converts Zod issues into a small field -> message map. Values from the
 * request are never echoed back. Unknown keys collapse to one `form` message
 * instead of naming every field a bot tried to inject.
 */
export function formatContactIssues(error) {
  const fields = {};

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      fields.form ??= 'The request contained unsupported fields.';
      continue;
    }

    const field = issue.path[0];
    if (typeof field !== 'string' || field === 'website' || field === 'formStartedAt') {
      fields.form ??= 'The request could not be accepted.';
      continue;
    }

    fields[field] ??= issue.message;
  }

  return fields;
}

/** A missing, malformed, future, or too-recent timestamp is treated as spam. */
export function isSubmissionTimingValid(value, now = Date.now()) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= now &&
    now - value >= MIN_FORM_AGE_MS
  );
}

/** A non-empty honeypot, including a non-string value, is treated as spam. */
export function isHoneypotFilled(value) {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}
