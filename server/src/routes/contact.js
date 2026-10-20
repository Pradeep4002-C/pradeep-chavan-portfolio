import { Router } from 'express';
import { getDatabaseStatus } from '../config/db.js';
import { ContactMessage } from '../models/ContactMessage.js';
import {
  contactSchema,
  formatContactIssues,
  isHoneypotFilled,
  isSubmissionTimingValid,
} from '../validation/contact.js';

export const contactRouter = Router();

/**
 * The same body is returned for accepted messages and suppressed spam. The
 * difference is intentionally not observable to the caller.
 */
const ACCEPTED_RESPONSE = Object.freeze({
  data: {
    message: 'Your message has been received.',
  },
});

/**
 * POST /api/contact
 *
 * 201 accepted or suppressed spam
 * 400 validation failure with field-level messages
 * 429 rate limit exceeded
 * 503 database unavailable
 * 500 unexpected failure (shared error middleware)
 *
 * Only name, email, subject, and message are written. The honeypot and timing
 * fields, IP address, and any other request metadata are never stored.
 */
contactRouter.post('/', async (req, res, next) => {
  const parsed = contactSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Please check the highlighted fields and try again.',
        fields: formatContactIssues(parsed.error),
      },
    });
    return;
  }

  const { name, email, subject = '', message, website, formStartedAt } = parsed.data;

  // Suppress obvious automation without storing anything and without revealing
  // whether the honeypot or the timing check triggered the decision.
  if (isHoneypotFilled(website) || !isSubmissionTimingValid(formStartedAt)) {
    res.status(201).json(ACCEPTED_RESPONSE);
    return;
  }

  if (getDatabaseStatus().status !== 'connected') {
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Messages are temporarily unavailable. Please try again later.',
      },
    });
    return;
  }

  try {
    await ContactMessage.create({
      name,
      email,
      subject,
      message,
      read: false,
    });
  } catch (error) {
    // The central handler logs the error server-side and returns a generic 500.
    next(error);
    return;
  }

  res.status(201).json(ACCEPTED_RESPONSE);
});
