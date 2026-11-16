/**
 * Pure contact-form contract shared by the UI and its tests.
 *
 * Mobile autocomplete frequently leaves a trailing space after an email
 * address. Validation and submission both operate on trimmed scalar values so
 * `"recruiter@company.com "` is accepted and sent without the stray space.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(values) {
  const errors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();

  if (!name) {
    errors.name = 'Enter your name.';
  } else if (name.length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }

  if (!email) {
    errors.email = 'Enter your email address.';
  } else if (email.length > 254) {
    errors.email = 'Email must be 254 characters or fewer.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (subject.length > 120) {
    errors.subject = 'Subject must be 120 characters or fewer.';
  }

  if (!message) {
    errors.message = 'Enter a message.';
  } else if (message.length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  } else if (message.length > 5000) {
    errors.message = 'Message must be 5000 characters or fewer.';
  }

  return errors;
}

export function buildContactPayload(values, { website = '', formStartedAt } = {}) {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    subject: values.subject.trim(),
    message: values.message.trim(),
    website,
    formStartedAt,
  };
}
