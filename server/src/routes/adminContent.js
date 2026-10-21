import { Router } from 'express';
import {
  Achievement,
  Certification,
  ContactMessage,
  Education,
  Profile,
  SkillGroup,
} from '../models/index.js';
import {
  internalError,
  invalidIdResponse,
  isValidId,
  notFoundResponse,
  validationResponse,
  writeError,
} from '../lib/adminHttp.js';
import {
  achievementCreateSchema,
  achievementUpdateSchema,
  certificationCreateSchema,
  certificationUpdateSchema,
  educationCreateSchema,
  educationUpdateSchema,
  formatIssues,
  messageListSchema,
  messageUpdateSchema,
  profileUpdateSchema,
  skillGroupCreateSchema,
  skillGroupUpdateSchema,
} from '../validation/content.js';

/**
 * Administrator content API: contact inbox, skill groups, education,
 * certifications, achievements, and the singleton profile.
 *
 * Every route here inherits `requireAuth` from the parent admin router. Routes
 * that change data additionally require the trusted-origin policy, which is
 * passed in from the parent so both routers share one implementation.
 */

/** Serialises a Mongoose document to `{ id, ...fields }` without internals. */
function serialize(doc, fields) {
  const value = typeof doc?.toObject === 'function' ? doc.toObject() : (doc ?? {});
  const out = { id: value._id === undefined ? undefined : String(value._id) };
  for (const field of fields) {
    out[field] = value[field];
  }
  return out;
}

/**
 * Builds a small CRUD router for one ordered collection. The four content
 * collections share their shape, so their validation and persistence live here
 * once instead of four times.
 */
function createOrderedResource({
  Model,
  listKey,
  itemKey,
  fields,
  sortKey,
  createSchema,
  updateSchema,
  notFoundCode,
  notFoundMessage,
  conflictField,
  conflictCode,
  logCode,
  crossValidate,
  requireTrustedOrigin,
}) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const docs = await Model.find()
        .select(fields.join(' '))
        .sort({ order: 1, [sortKey]: 1 })
        .lean();
      res.status(200).json({ data: { [listKey]: docs.map((doc) => serialize(doc, fields)) } });
    } catch (error) {
      next(internalError(error, `${logCode}_LIST_FAILED`));
    }
  });

  router.post('/', requireTrustedOrigin, async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationResponse(formatIssues(parsed.error)));
      return;
    }

    try {
      const doc = new Model(parsed.data);
      await doc.save();
      res.status(201).json({ data: { [itemKey]: serialize(doc, fields) } });
    } catch (error) {
      writeError(error, res, next, {
        logCode: `${logCode}_CREATE_FAILED`,
        conflictField,
        conflictCode,
      });
    }
  });

  router.patch('/:id', requireTrustedOrigin, async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      res.status(400).json(invalidIdResponse());
      return;
    }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationResponse(formatIssues(parsed.error)));
      return;
    }

    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) {
        res.status(404).json(notFoundResponse(notFoundCode, notFoundMessage));
        return;
      }

      // Only the fields that were sent are written; the rest are untouched.
      for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) {
          doc[key] = value;
        }
      }

      if (typeof crossValidate === 'function') {
        const errors = crossValidate(doc);
        if (Object.keys(errors).length > 0) {
          res.status(400).json(validationResponse(errors));
          return;
        }
      }

      await doc.save();
      res.status(200).json({ data: { [itemKey]: serialize(doc, fields) } });
    } catch (error) {
      writeError(error, res, next, {
        logCode: `${logCode}_UPDATE_FAILED`,
        conflictField,
        conflictCode,
      });
    }
  });

  router.delete('/:id', requireTrustedOrigin, async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      res.status(400).json(invalidIdResponse());
      return;
    }

    try {
      const deleted = await Model.findByIdAndDelete(req.params.id);
      if (!deleted) {
        res.status(404).json(notFoundResponse(notFoundCode, notFoundMessage));
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(internalError(error, `${logCode}_DELETE_FAILED`));
    }
  });

  return router;
}

/* ------------------------------------------------------------------ *
 * Contact inbox
 * ------------------------------------------------------------------ */

const MESSAGE_FIELDS = 'name email subject message read createdAt updatedAt';

function serializeMessage(doc) {
  const value = typeof doc?.toObject === 'function' ? doc.toObject() : (doc ?? {});
  return {
    id: String(value._id),
    name: value.name ?? '',
    email: value.email ?? '',
    subject: value.subject ?? '',
    message: value.message ?? '',
    read: Boolean(value.read),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

const MESSAGE_NOT_FOUND = notFoundResponse('MESSAGE_NOT_FOUND', 'That message does not exist.');

function createMessageRoutes(requireTrustedOrigin) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    const parsed = messageListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(validationResponse(formatIssues(parsed.error)));
      return;
    }

    const { read, page, limit } = parsed.data;
    const filter = read === 'all' ? {} : { read: read === 'read' };

    try {
      const total = await ContactMessage.countDocuments(filter);
      const pages = Math.max(Math.ceil(total / limit), 1);
      const currentPage = Math.min(page, pages);

      const docs = await ContactMessage.find(filter)
        .select(MESSAGE_FIELDS)
        .sort({ createdAt: -1, _id: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit)
        .lean();

      res.status(200).json({
        data: {
          messages: docs.map(serializeMessage),
          pagination: {
            total,
            page: currentPage,
            limit,
            pages,
            hasNext: currentPage < pages,
            hasPrev: currentPage > 1,
          },
        },
      });
    } catch (error) {
      next(internalError(error, 'ADMIN_MESSAGE_LIST_FAILED'));
    }
  });

  router.patch('/:id', requireTrustedOrigin, async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      res.status(400).json(invalidIdResponse('Invalid message identifier.'));
      return;
    }

    const parsed = messageUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationResponse(formatIssues(parsed.error)));
      return;
    }

    try {
      const updated = await ContactMessage.findByIdAndUpdate(
        req.params.id,
        { $set: { read: parsed.data.read } },
        { returnDocument: 'after' },
      )
        .select(MESSAGE_FIELDS)
        .lean();

      if (!updated) {
        res.status(404).json(MESSAGE_NOT_FOUND);
        return;
      }

      res.status(200).json({ data: { message: serializeMessage(updated) } });
    } catch (error) {
      next(internalError(error, 'ADMIN_MESSAGE_UPDATE_FAILED'));
    }
  });

  router.delete('/:id', requireTrustedOrigin, async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      res.status(400).json(invalidIdResponse('Invalid message identifier.'));
      return;
    }

    try {
      const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
      if (!deleted) {
        res.status(404).json(MESSAGE_NOT_FOUND);
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(internalError(error, 'ADMIN_MESSAGE_DELETE_FAILED'));
    }
  });

  return router;
}

/* ------------------------------------------------------------------ *
 * Profile singleton
 * ------------------------------------------------------------------ */

const PROFILE_FIELDS = [
  'name',
  'headline',
  'intro',
  'bio',
  'email',
  'location',
  'github',
  'linkedin',
  'leetcode',
  'resumePath',
];

function serializeProfile(doc) {
  if (!doc) {
    return null;
  }
  const value = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
  const out = {};
  for (const field of PROFILE_FIELDS) {
    if (field === 'bio') {
      out.bio = Array.isArray(value.bio) ? value.bio.map(String) : [];
    } else {
      out[field] = value[field] ?? '';
    }
  }
  return out;
}

function createProfileRoutes(requireTrustedOrigin) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const profile = await Profile.findOne({ key: 'profile' })
        .select(PROFILE_FIELDS.join(' '))
        .lean();
      res.status(200).json({ data: { profile: serializeProfile(profile) } });
    } catch (error) {
      next(internalError(error, 'ADMIN_PROFILE_READ_FAILED'));
    }
  });

  router.put('/', requireTrustedOrigin, async (req, res, next) => {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationResponse(formatIssues(parsed.error)));
      return;
    }

    try {
      // Merge over the stored profile so omitted fields keep their value. The
      // filter on the immutable `key` plus the unique index keeps this a
      // singleton even if the profile has never been created.
      const existing = await Profile.findOne({ key: 'profile' })
        .select(PROFILE_FIELDS.join(' '))
        .lean();

      const update = {};
      if (existing) {
        for (const field of PROFILE_FIELDS) {
          update[field] = existing[field];
        }
      }
      for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) {
          update[key] = value;
        }
      }

      const profile = await Profile.findOneAndUpdate(
        { key: 'profile' },
        { $set: update },
        {
          upsert: true,
          returnDocument: 'after',
          runValidators: true,
          context: 'query',
          setDefaultsOnInsert: true,
        },
      )
        .select(PROFILE_FIELDS.join(' '))
        .lean();

      res.status(200).json({ data: { profile: serializeProfile(profile) } });
    } catch (error) {
      writeError(error, res, next, {
        logCode: 'ADMIN_PROFILE_UPDATE_FAILED',
        conflictField: 'key',
        conflictCode: 'PROFILE_CONFLICT',
      });
    }
  });

  return router;
}

/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

export function createAdminContentRouter({ requireTrustedOrigin } = {}) {
  const router = Router();

  router.use('/messages', createMessageRoutes(requireTrustedOrigin));
  router.use('/profile', createProfileRoutes(requireTrustedOrigin));

  router.use(
    '/skill-groups',
    createOrderedResource({
      Model: SkillGroup,
      listKey: 'skillGroups',
      itemKey: 'skillGroup',
      fields: ['label', 'items', 'order'],
      sortKey: 'label',
      createSchema: skillGroupCreateSchema,
      updateSchema: skillGroupUpdateSchema,
      notFoundCode: 'SKILL_GROUP_NOT_FOUND',
      notFoundMessage: 'That skill group does not exist.',
      conflictField: 'label',
      conflictCode: 'LABEL_CONFLICT',
      logCode: 'ADMIN_SKILL_GROUP',
      requireTrustedOrigin,
    }),
  );

  router.use(
    '/education',
    createOrderedResource({
      Model: Education,
      listKey: 'education',
      itemKey: 'education',
      fields: [
        'institution',
        'qualification',
        'field',
        'startYear',
        'endYear',
        'score',
        'location',
        'order',
      ],
      sortKey: 'institution',
      createSchema: educationCreateSchema,
      updateSchema: educationUpdateSchema,
      notFoundCode: 'EDUCATION_NOT_FOUND',
      notFoundMessage: 'That education entry does not exist.',
      logCode: 'ADMIN_EDUCATION',
      crossValidate: (doc) =>
        doc.startYear != null && doc.endYear != null && doc.endYear < doc.startYear
          ? { endYear: 'End year cannot be earlier than start year.' }
          : {},
      requireTrustedOrigin,
    }),
  );

  router.use(
    '/certifications',
    createOrderedResource({
      Model: Certification,
      listKey: 'certifications',
      itemKey: 'certification',
      fields: ['title', 'issuer', 'year', 'url', 'order'],
      sortKey: 'title',
      createSchema: certificationCreateSchema,
      updateSchema: certificationUpdateSchema,
      notFoundCode: 'CERTIFICATION_NOT_FOUND',
      notFoundMessage: 'That certification does not exist.',
      logCode: 'ADMIN_CERTIFICATION',
      requireTrustedOrigin,
    }),
  );

  router.use(
    '/achievements',
    createOrderedResource({
      Model: Achievement,
      listKey: 'achievements',
      itemKey: 'achievement',
      fields: ['title', 'year', 'description', 'order'],
      sortKey: 'title',
      createSchema: achievementCreateSchema,
      updateSchema: achievementUpdateSchema,
      notFoundCode: 'ACHIEVEMENT_NOT_FOUND',
      notFoundMessage: 'That achievement does not exist.',
      logCode: 'ADMIN_ACHIEVEMENT',
      requireTrustedOrigin,
    }),
  );

  return router;
}
