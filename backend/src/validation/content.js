import { z } from 'zod';
import { EMAIL_PATTERN, isHttpUrl } from '../lib/validators.js';

/**
 * Administrator content contract for the inbox, skills, education,
 * certifications, achievements, and the singleton profile.
 *
 * Limits mirror the Mongoose schemas so a value that passes validation is
 * always something the model can store. Every object schema is `.strict()`:
 * a client cannot set `_id`, `__v`, `createdAt`, `updatedAt`, or any other
 * field the schema does not deliberately expose.
 *
 * Field rules are declared once per field, without defaults, and reused by the
 * create and update schemas so the two cannot drift. Create adds defaults;
 * update makes each field optional and requires at least one field.
 */
export const CONTENT_LIMITS = Object.freeze({
  orderMax: 100000,
  yearMin: 1950,
  yearMax: 2100,
  skillLabelMax: 60,
  skillItemMax: 40,
  skillItemsMax: 30,
  institutionMax: 200,
  qualificationMax: 120,
  fieldMax: 120,
  scoreMax: 60,
  locationMax: 160,
  titleMax: 200,
  issuerMax: 160,
  urlMax: 300,
  descriptionMax: 1000,
  nameMax: 120,
  headlineMax: 200,
  introMax: 1000,
  bioParagraphMax: 2000,
  bioParagraphsMax: 20,
  emailMax: 254,
  messageLimitMax: 50,
  messageLimitDefault: 20,
});

/** Relative, non-escaping file path (matches the public portfolio's rule). */
export const ASSET_PATH_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._~/-]+$/;

export const MESSAGE_READ_FILTERS = ['all', 'unread', 'read'];

/**
 * Converts Zod issues into a small field -> message map. Submitted values are
 * never echoed back. Unknown keys collapse to one `form` message instead of
 * naming every field a client tried to inject.
 */
export function formatIssues(error) {
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

const ORDER_MAX = CONTENT_LIMITS.orderMax;

const orderField = z
  .coerce.number({ error: 'Display order must be a number.' })
  .int('Display order must be a whole number.')
  .min(0, 'Display order cannot be negative.')
  .max(ORDER_MAX, `Display order must be ${ORDER_MAX} or less.`);

const yearField = z
  .coerce.number({ error: 'Enter a year.' })
  .int('Year must be a whole number.')
  .min(CONTENT_LIMITS.yearMin, `Year must be ${CONTENT_LIMITS.yearMin} or later.`)
  .max(CONTENT_LIMITS.yearMax, `Year must be ${CONTENT_LIMITS.yearMax} or earlier.`);

/** Required or optional absolute http(s) URL, where '' means "not set". */
function optionalUrlField(label, max = CONTENT_LIMITS.urlMax) {
  return z
    .string({ error: `${label} must be text.` })
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .refine((value) => value === '' || isHttpUrl(value), `${label} must be a valid http or https URL.`)
    .optional();
}

const atLeastOneField = {
  message: 'Provide at least one field to change.',
};

/* ------------------------------------------------------------------ *
 * Contact inbox
 * ------------------------------------------------------------------ */

export const messageListSchema = z
  .object({
    read: z
      .enum(MESSAGE_READ_FILTERS, { error: 'Choose all, unread, or read.' })
      .default('all'),
    page: z.coerce
      .number({ error: 'Page must be a number.' })
      .int('Page must be a whole number.')
      .min(1, 'Page must be 1 or more.')
      .default(1),
    limit: z.coerce
      .number({ error: 'Limit must be a number.' })
      .int('Limit must be a whole number.')
      .min(1, 'Limit must be 1 or more.')
      .max(
        CONTENT_LIMITS.messageLimitMax,
        `Limit must be ${CONTENT_LIMITS.messageLimitMax} or less.`,
      )
      .default(CONTENT_LIMITS.messageLimitDefault),
  })
  .strict();

export const messageUpdateSchema = z
  .object({
    read: z.boolean({ error: 'Read must be true or false.' }).optional(),
    hidden: z.boolean({ error: 'Hidden must be true or false.' }).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, atLeastOneField);

/* ------------------------------------------------------------------ *
 * Skill groups
 * ------------------------------------------------------------------ */

const skillLabelField = z
  .string({ error: 'Label must be text.' })
  .trim()
  .min(1, 'Enter a label.')
  .max(CONTENT_LIMITS.skillLabelMax, `Label must be ${CONTENT_LIMITS.skillLabelMax} characters or fewer.`);

const skillItemsField = z
  .array(
    z
      .string({ error: 'Each skill must be text.' })
      .trim()
      .min(1, 'Skill names cannot be empty.')
      .max(CONTENT_LIMITS.skillItemMax, `Each skill must be ${CONTENT_LIMITS.skillItemMax} characters or fewer.`),
  )
  .min(1, 'Add at least one skill.')
  .max(CONTENT_LIMITS.skillItemsMax, `Use ${CONTENT_LIMITS.skillItemsMax} skills or fewer.`);

export const skillGroupCreateSchema = z
  .object({
    label: skillLabelField,
    items: skillItemsField,
    order: orderField.default(0),
  })
  .strict();

export const skillGroupUpdateSchema = z
  .object({
    label: skillLabelField.optional(),
    items: skillItemsField.optional(),
    order: orderField.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, atLeastOneField);

/* ------------------------------------------------------------------ *
 * Education
 * ------------------------------------------------------------------ */

const institutionField = z
  .string({ error: 'Institution must be text.' })
  .trim()
  .min(1, 'Enter the institution.')
  .max(CONTENT_LIMITS.institutionMax, `Institution must be ${CONTENT_LIMITS.institutionMax} characters or fewer.`);

const qualificationField = z
  .string({ error: 'Qualification must be text.' })
  .trim()
  .min(1, 'Enter the qualification.')
  .max(CONTENT_LIMITS.qualificationMax, `Qualification must be ${CONTENT_LIMITS.qualificationMax} characters or fewer.`);

const fieldOfStudyField = z
  .string({ error: 'Field of study must be text.' })
  .trim()
  .max(CONTENT_LIMITS.fieldMax, `Field of study must be ${CONTENT_LIMITS.fieldMax} characters or fewer.`);

const scoreField = z
  .string({ error: 'Score must be text.' })
  .trim()
  .max(CONTENT_LIMITS.scoreMax, `Score must be ${CONTENT_LIMITS.scoreMax} characters or fewer.`);

const locationField = z
  .string({ error: 'Location must be text.' })
  .trim()
  .max(CONTENT_LIMITS.locationMax, `Location must be ${CONTENT_LIMITS.locationMax} characters or fewer.`);

export const educationCreateSchema = z
  .object({
    institution: institutionField,
    qualification: qualificationField,
    field: fieldOfStudyField.default(''),
    startYear: yearField.optional(),
    endYear: yearField.optional(),
    score: scoreField.default(''),
    location: locationField.default(''),
    order: orderField.default(0),
  })
  .strict()
  .refine(
    (data) => data.startYear == null || data.endYear == null || data.endYear >= data.startYear,
    { message: 'End year cannot be earlier than start year.', path: ['endYear'] },
  );

export const educationUpdateSchema = z
  .object({
    institution: institutionField.optional(),
    qualification: qualificationField.optional(),
    field: fieldOfStudyField.optional(),
    startYear: yearField.optional(),
    endYear: yearField.optional(),
    score: scoreField.optional(),
    location: locationField.optional(),
    order: orderField.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, atLeastOneField);

/* ------------------------------------------------------------------ *
 * Certifications
 * ------------------------------------------------------------------ */

const certificationTitleField = z
  .string({ error: 'Title must be text.' })
  .trim()
  .min(1, 'Enter a title.')
  .max(CONTENT_LIMITS.titleMax, `Title must be ${CONTENT_LIMITS.titleMax} characters or fewer.`);

const certificationIssuerField = z
  .string({ error: 'Issuer must be text.' })
  .trim()
  .min(1, 'Enter the issuer.')
  .max(CONTENT_LIMITS.issuerMax, `Issuer must be ${CONTENT_LIMITS.issuerMax} characters or fewer.`);

const certificationUrlField = optionalUrlField('Certificate URL');

export const certificationCreateSchema = z
  .object({
    title: certificationTitleField,
    issuer: certificationIssuerField,
    year: yearField,
    url: certificationUrlField,
    order: orderField.default(0),
  })
  .strict();

export const certificationUpdateSchema = z
  .object({
    title: certificationTitleField.optional(),
    issuer: certificationIssuerField.optional(),
    year: yearField.optional(),
    url: certificationUrlField,
    order: orderField.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, atLeastOneField);

/* ------------------------------------------------------------------ *
 * Achievements
 * ------------------------------------------------------------------ */

const achievementTitleField = z
  .string({ error: 'Title must be text.' })
  .trim()
  .min(1, 'Enter a title.')
  .max(CONTENT_LIMITS.titleMax, `Title must be ${CONTENT_LIMITS.titleMax} characters or fewer.`);

const achievementDescriptionField = z
  .string({ error: 'Description must be text.' })
  .trim()
  .max(
    CONTENT_LIMITS.descriptionMax,
    `Description must be ${CONTENT_LIMITS.descriptionMax} characters or fewer.`,
  );

export const achievementCreateSchema = z
  .object({
    title: achievementTitleField,
    year: yearField,
    description: achievementDescriptionField.default(''),
    order: orderField.default(0),
  })
  .strict();

export const achievementUpdateSchema = z
  .object({
    title: achievementTitleField.optional(),
    year: yearField.optional(),
    description: achievementDescriptionField.optional(),
    order: orderField.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, atLeastOneField);

/* ------------------------------------------------------------------ *
 * Profile (singleton)
 * ------------------------------------------------------------------ */

const profileNameField = z
  .string({ error: 'Name must be text.' })
  .trim()
  .min(1, 'Enter a name.')
  .max(CONTENT_LIMITS.nameMax, `Name must be ${CONTENT_LIMITS.nameMax} characters or fewer.`);

const profileEmailField = z
  .string({ error: 'Email must be text.' })
  .trim()
  .toLowerCase()
  .min(1, 'Enter an email address.')
  .max(CONTENT_LIMITS.emailMax, `Email must be ${CONTENT_LIMITS.emailMax} characters or fewer.`)
  .regex(EMAIL_PATTERN, 'Enter a valid email address.');

const profileHeadlineField = z
  .string({ error: 'Headline must be text.' })
  .trim()
  .max(CONTENT_LIMITS.headlineMax, `Headline must be ${CONTENT_LIMITS.headlineMax} characters or fewer.`);

const profileIntroField = z
  .string({ error: 'Introduction must be text.' })
  .trim()
  .max(CONTENT_LIMITS.introMax, `Introduction must be ${CONTENT_LIMITS.introMax} characters or fewer.`);

const profileBioField = z
  .array(
    z
      .string({ error: 'Each paragraph must be text.' })
      .trim()
      .min(1, 'Paragraphs cannot be empty.')
      .max(
        CONTENT_LIMITS.bioParagraphMax,
        `Each paragraph must be ${CONTENT_LIMITS.bioParagraphMax} characters or fewer.`,
      ),
  )
  .max(CONTENT_LIMITS.bioParagraphsMax, `Use ${CONTENT_LIMITS.bioParagraphsMax} paragraphs or fewer.`);

const profileResumeField = z
  .string({ error: 'Resume path must be text.' })
  .trim()
  .max(200, 'Resume path must be 200 characters or fewer.')
  .refine(
    (value) => value === '' || ASSET_PATH_PATTERN.test(value),
    'Resume path must be a relative file path, for example resume.pdf.',
  );

/**
 * PUT contract. `name` and `email` are required because the model requires
 * them; every other field is optional, and the route merges omitted fields with
 * the stored profile so a partial edit can never blank existing content.
 */
export const profileUpdateSchema = z
  .object({
    name: profileNameField,
    email: profileEmailField,
    headline: profileHeadlineField.optional(),
    intro: profileIntroField.optional(),
    bio: profileBioField.optional(),
    location: locationField.optional(),
    github: optionalUrlField('GitHub URL'),
    linkedin: optionalUrlField('LinkedIn URL'),
    leetcode: optionalUrlField('LeetCode URL'),
    resumePath: profileResumeField.optional(),
  })
  .strict();
