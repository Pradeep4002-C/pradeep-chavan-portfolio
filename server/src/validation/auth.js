import { z } from 'zod';
import { EMAIL_PATTERN } from '../lib/validators.js';

export const AUTH_LIMITS = Object.freeze({
  emailMax: 254,
});

/**
 * Login body contract. Unknown fields are rejected so an authentication
 * request cannot smuggle extra data into the handler. Passwords are never
 * trimmed: whitespace may be intentional and changing it would break valid
 * credentials.
 */
export const loginSchema = z
  .object({
    email: z
      .string({ error: 'Enter your email address.' })
      .trim()
      .toLowerCase()
      .min(1, 'Enter your email address.')
      .max(AUTH_LIMITS.emailMax, `Email must be ${AUTH_LIMITS.emailMax} characters or fewer.`)
      .regex(EMAIL_PATTERN, 'Enter a valid email address.'),
    password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.'),
  })
  .strict();

/**
 * Converts Zod issues into a small field -> message map. Submitted values are
 * never echoed back, even on validation failure.
 */
export function formatAuthIssues(error) {
  const fields = {};

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      fields.form ??= 'The request contained unsupported fields.';
      continue;
    }

    const field = issue.path[0];
    if (typeof field !== 'string') {
      fields.form ??= 'The request could not be accepted.';
      continue;
    }

    fields[field] ??= issue.message;
  }

  return fields;
}
