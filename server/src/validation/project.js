import { z } from 'zod';
import { ARTWORK_KEYS } from '../models/Project.js';
import { isHttpUrl } from '../lib/validators.js';

/**
 * Administrator project contract. Limits mirror the Project schema so a value
 * that passes validation is always something the model can store.
 *
 * Unknown keys are rejected (`.strict()`): a client cannot set `_id`, `__v`,
 * `createdAt`, `updatedAt`, or any other field the schema does not expose.
 */
export const PROJECT_LIMITS = Object.freeze({
  titleMax: 140,
  slugMax: 120,
  categoryMax: 80,
  summaryMax: 300,
  descriptionMax: 2000,
  technologyMax: 40,
  technologiesMax: 30,
  urlMax: 300,
  orderMax: 100000,
});

// Mirrors the `match` rule on Project.slug so both layers agree.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Field rules are declared once, without defaults, so the create and update
// schemas cannot drift. Create adds the defaults; update makes each optional.
const fields = {
  title: z
    .string({ error: 'Enter a project title.' })
    .trim()
    .min(1, 'Enter a project title.')
    .max(PROJECT_LIMITS.titleMax, `Title must be ${PROJECT_LIMITS.titleMax} characters or fewer.`),
  slug: z
    .string({ error: 'Enter a slug.' })
    .trim()
    .toLowerCase()
    .min(1, 'Enter a slug.')
    .max(PROJECT_LIMITS.slugMax, `Slug must be ${PROJECT_LIMITS.slugMax} characters or fewer.`)
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers, and single hyphens.'),
  category: z
    .string({ error: 'Category must be text.' })
    .trim()
    .max(
      PROJECT_LIMITS.categoryMax,
      `Category must be ${PROJECT_LIMITS.categoryMax} characters or fewer.`,
    ),
  summary: z
    .string({ error: 'Summary must be text.' })
    .trim()
    .max(PROJECT_LIMITS.summaryMax, `Summary must be ${PROJECT_LIMITS.summaryMax} characters or fewer.`),
  description: z
    .string({ error: 'Description must be text.' })
    .trim()
    .max(
      PROJECT_LIMITS.descriptionMax,
      `Description must be ${PROJECT_LIMITS.descriptionMax} characters or fewer.`,
    ),
  technologies: z
    .array(
      z
        .string({ error: 'Each technology must be text.' })
        .trim()
        .min(1, 'Technology names cannot be empty.')
        .max(
          PROJECT_LIMITS.technologyMax,
          `Each technology must be ${PROJECT_LIMITS.technologyMax} characters or fewer.`,
        ),
    )
    .min(1, 'Add at least one technology.')
    .max(
      PROJECT_LIMITS.technologiesMax,
      `Use ${PROJECT_LIMITS.technologiesMax} technologies or fewer.`,
    ),
  repoUrl: z
    .string({ error: 'Enter a repository URL.' })
    .trim()
    .max(PROJECT_LIMITS.urlMax, `Repository URL must be ${PROJECT_LIMITS.urlMax} characters or fewer.`)
    .refine(isHttpUrl, 'Repository URL must be a valid http or https URL.'),
  demoUrl: z
    .union([
      z.literal(''),
      z
        .string({ error: 'Demo URL must be text.' })
        .trim()
        .max(PROJECT_LIMITS.urlMax, `Demo URL must be ${PROJECT_LIMITS.urlMax} characters or fewer.`)
        .refine(isHttpUrl, 'Demo URL must be a valid http or https URL.'),
    ])
    .optional(),
  featured: z.boolean({ error: 'Featured must be true or false.' }),
  artwork: z
    .string({ error: 'Choose a project illustration.' })
    .refine(
      (value) => ARTWORK_KEYS.includes(value),
      'Choose one of the existing project illustrations.',
    ),
  order: z
    .number({ error: 'Display order must be a number.' })
    .int('Display order must be a whole number.')
    .min(0, 'Display order cannot be negative.')
    .max(PROJECT_LIMITS.orderMax, `Display order must be ${PROJECT_LIMITS.orderMax} or less.`),
  published: z.boolean({ error: 'Published must be true or false.' }),
};

/**
 * Creation contract. Required fields are title, slug, technologies, repoUrl,
 * and artwork; everything else falls back to a safe default exactly as the
 * Mongoose schema does.
 */
export const projectCreateSchema = z
  .object({
    title: fields.title,
    slug: fields.slug,
    category: fields.category.default(''),
    summary: fields.summary.default(''),
    description: fields.description.default(''),
    technologies: fields.technologies,
    repoUrl: fields.repoUrl,
    demoUrl: fields.demoUrl,
    featured: fields.featured.default(false),
    artwork: fields.artwork,
    order: fields.order.default(0),
    published: fields.published.default(true),
  })
  .strict();

/**
 * Update contract: the same fields, all optional, with at least one present.
 * No field carries a default here, so a PATCH only ever touches exactly the
 * fields the administrator sent and can never silently reset others.
 */
export const projectUpdateSchema = z
  .object({
    title: fields.title.optional(),
    slug: fields.slug.optional(),
    category: fields.category.optional(),
    summary: fields.summary.optional(),
    description: fields.description.optional(),
    technologies: fields.technologies.optional(),
    repoUrl: fields.repoUrl.optional(),
    demoUrl: fields.demoUrl.optional(),
    featured: fields.featured.optional(),
    artwork: fields.artwork.optional(),
    order: fields.order.optional(),
    published: fields.published.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to change.',
  });

/**
 * Converts Zod issues into a small field -> message map. Submitted values are
 * never echoed back. Unknown keys collapse to one `form` message instead of
 * naming every field a client tried to inject.
 */
export function formatProjectIssues(error) {
  const fields = {};

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      fields.form ??= 'The request contained unsupported fields.';
      continue;
    }

    const field = issue.path[0];
    if (typeof field !== 'string' || field === '') {
      fields.form ??= issue.message;
      continue;
    }

    fields[field] ??= issue.message;
  }

  return fields;
}
