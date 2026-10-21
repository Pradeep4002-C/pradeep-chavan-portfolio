import { Router } from 'express';
import mongoose from 'mongoose';
import { Project, SkillGroup, ContactMessage } from '../models/index.js';
import { SafeError } from '../lib/safeError.js';
import { createRequireAuth } from '../middleware/requireAuth.js';
import { createRequireTrustedOrigin } from '../middleware/requireTrustedOrigin.js';
import {
  formatProjectIssues,
  projectCreateSchema,
  projectUpdateSchema,
} from '../validation/project.js';

/**
 * Explicit projection for administrator project reads. Timestamps are included
 * because the dashboard shows them; `__v` and any other internal field is not.
 */
const ADMIN_PROJECT_FIELDS = [
  'title',
  'slug',
  'category',
  'summary',
  'description',
  'technologies',
  'repoUrl',
  'demoUrl',
  'featured',
  'artwork',
  'order',
  'published',
  'createdAt',
  'updatedAt',
].join(' ');

/** The only project shape that leaves the administrator API. */
export function toAdminProject(doc) {
  const value = typeof doc?.toObject === 'function' ? doc.toObject() : doc ?? {};

  return {
    id: value._id === undefined ? undefined : String(value._id),
    title: value.title,
    slug: value.slug,
    category: value.category ?? '',
    summary: value.summary ?? '',
    description: value.description ?? '',
    technologies: Array.isArray(value.technologies) ? value.technologies.map(String) : [],
    repoUrl: value.repoUrl ?? '',
    demoUrl: value.demoUrl ?? '',
    featured: Boolean(value.featured),
    artwork: value.artwork,
    order: Number.isFinite(value.order) ? value.order : 0,
    published: Boolean(value.published),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function validationResponse(fields) {
  return {
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Please check the highlighted fields and try again.',
      fields,
    },
  };
}

const NOT_FOUND_RESPONSE = Object.freeze({
  error: {
    code: 'PROJECT_NOT_FOUND',
    message: 'That project does not exist.',
  },
});

/**
 * Maps a Mongoose write failure onto a safe response. Duplicate slugs and
 * schema validation errors become actionable 4xx responses; anything else is
 * reported as a logged SafeError so no raw driver message can leak.
 */
function writeError(error, res, next, logCode) {
  if (error?.code === 11000) {
    res.status(409).json({
      error: {
        code: 'SLUG_CONFLICT',
        message: 'A project with that slug already exists.',
        fields: { slug: 'That slug is already in use.' },
      },
    });
    return;
  }

  if (error?.name === 'ValidationError') {
    const fields = {};
    for (const key of Object.keys(error.errors ?? {})) {
      fields[key] ??= 'Invalid value.';
    }
    res.status(400).json(validationResponse(fields));
    return;
  }

  next(
    new SafeError('Something went wrong.', {
      status: 500,
      code: 'INTERNAL_ERROR',
      logCode,
      cause: error,
    }),
  );
}

function internalError(error, logCode) {
  return new SafeError('Something went wrong.', {
    status: 500,
    code: 'INTERNAL_ERROR',
    logCode,
    cause: error,
  });
}

/**
 * Administrator API. Every route is behind requireAuth; state-changing routes
 * additionally enforce the trusted-origin policy shared with the auth routes.
 * Administrator identity always comes from the session, never the request body.
 */
export function createAdminRouter({ clientOrigin } = {}) {
  const router = Router();
  const requireAuth = createRequireAuth();
  const requireTrustedOrigin = createRequireTrustedOrigin({ clientOrigin });

  router.use(requireAuth);

  // GET /api/admin/overview -> aggregate counts only, never message contents.
  router.get('/overview', async (req, res, next) => {
    try {
      const [totalProjects, publishedProjects, totalSkillGroups, unreadContactMessages] =
        await Promise.all([
          Project.countDocuments(),
          Project.countDocuments({ published: true }),
          SkillGroup.countDocuments(),
          ContactMessage.countDocuments({ read: false }),
        ]);

      res.status(200).json({
        data: {
          totalProjects,
          publishedProjects,
          unpublishedProjects: Math.max(totalProjects - publishedProjects, 0),
          totalSkillGroups,
          unreadContactMessages,
        },
      });
    } catch (error) {
      next(internalError(error, 'ADMIN_OVERVIEW_FAILED'));
    }
  });

  // GET /api/admin/projects -> every project, published or not.
  router.get('/projects', async (req, res, next) => {
    try {
      const projects = await Project.find()
        .select(ADMIN_PROJECT_FIELDS)
        .sort({ order: 1, title: 1, slug: 1 })
        .lean();

      res.status(200).json({ data: { projects: projects.map(toAdminProject) } });
    } catch (error) {
      next(internalError(error, 'ADMIN_PROJECT_LIST_FAILED'));
    }
  });

  // POST /api/admin/projects
  router.post('/projects', requireTrustedOrigin, async (req, res, next) => {
    const parsed = projectCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationResponse(formatProjectIssues(parsed.error)));
      return;
    }

    try {
      const created = await Project.create(parsed.data);
      res.status(201).json({ data: { project: toAdminProject(created) } });
    } catch (error) {
      writeError(error, res, next, 'ADMIN_PROJECT_CREATE_FAILED');
    }
  });

  // GET /api/admin/projects/:id
  router.get('/projects/:id', async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(validationResponse({ id: 'Invalid project identifier.' }));
      return;
    }

    try {
      const project = await Project.findById(id).select(ADMIN_PROJECT_FIELDS).lean();
      if (!project) {
        res.status(404).json(NOT_FOUND_RESPONSE);
        return;
      }

      res.status(200).json({ data: { project: toAdminProject(project) } });
    } catch (error) {
      next(internalError(error, 'ADMIN_PROJECT_READ_FAILED'));
    }
  });

  // PATCH /api/admin/projects/:id -> full edits and publish/unpublish.
  router.patch('/projects/:id', requireTrustedOrigin, async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(validationResponse({ id: 'Invalid project identifier.' }));
      return;
    }

    const parsed = projectUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationResponse(formatProjectIssues(parsed.error)));
      return;
    }

    // Drop absent keys so an update can never touch fields it was not sent.
    const updates = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json(validationResponse({ form: 'Provide at least one field to change.' }));
      return;
    }

    try {
      const updated = await Project.findByIdAndUpdate(
        id,
        { $set: updates },
        { returnDocument: 'after', runValidators: true, context: 'query' },
      );

      if (!updated) {
        res.status(404).json(NOT_FOUND_RESPONSE);
        return;
      }

      res.status(200).json({ data: { project: toAdminProject(updated) } });
    } catch (error) {
      writeError(error, res, next, 'ADMIN_PROJECT_UPDATE_FAILED');
    }
  });

  // DELETE /api/admin/projects/:id
  router.delete('/projects/:id', requireTrustedOrigin, async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(validationResponse({ id: 'Invalid project identifier.' }));
      return;
    }

    try {
      const deleted = await Project.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json(NOT_FOUND_RESPONSE);
        return;
      }

      res.status(204).end();
    } catch (error) {
      next(internalError(error, 'ADMIN_PROJECT_DELETE_FAILED'));
    }
  });

  return router;
}
