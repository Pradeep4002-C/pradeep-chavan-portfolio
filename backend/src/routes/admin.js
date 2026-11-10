import { Router } from 'express';
import { Project, SkillGroup, ContactMessage } from '../models/index.js';
import { createRequireAuth } from '../middleware/requireAuth.js';
import { createRequireTrustedOrigin } from '../middleware/requireTrustedOrigin.js';
import {
  internalError,
  invalidIdResponse,
  isValidId,
  notFoundResponse,
  validationResponse,
  writeError,
} from '../lib/adminHttp.js';
import { createAdminContentRouter } from './adminContent.js';
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
  'workflow',
  'order',
  'published',
  'createdAt',
  'updatedAt',
].join(' ');

/** Serialises a workflow subdocument without exposing Mongoose internals. */
export function toWorkflow(value) {
  if (!value || !Array.isArray(value.steps) || value.steps.length === 0) {
    return null;
  }

  return {
    steps: value.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description ?? '',
      type: step.type,
    })),
  };
}

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
    workflow: toWorkflow(value.workflow),
    order: Number.isFinite(value.order) ? value.order : 0,
    published: Boolean(value.published),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

const PROJECT_NOT_FOUND = notFoundResponse('PROJECT_NOT_FOUND', 'That project does not exist.');

// Duplicate slugs map to a 409 with an actionable field message.
const PROJECT_WRITE_ERROR = {
  conflictField: 'slug',
  conflictCode: 'SLUG_CONFLICT',
  conflictMessage: 'A project with that slug already exists.',
};

/**
 * The public Work section has one featured slot. After a project is saved with
 * `featured: true`, clear the flag on every other project so legacy data or two
 * concurrent administrators cannot leave multiple featured records visible.
 */
async function clearOtherFeaturedProjects(projectId) {
  await Project.updateMany(
    { _id: { $ne: projectId }, featured: true },
    { $set: { featured: false } },
  );
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
      if (created.featured) {
        await clearOtherFeaturedProjects(created._id);
      }
      res.status(201).json({ data: { project: toAdminProject(created) } });
    } catch (error) {
      writeError(error, res, next, {
        logCode: 'ADMIN_PROJECT_CREATE_FAILED',
        ...PROJECT_WRITE_ERROR,
      });
    }
  });

  // GET /api/admin/projects/:id
  router.get('/projects/:id', async (req, res, next) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      res.status(400).json(invalidIdResponse('Invalid project identifier.'));
      return;
    }

    try {
      const project = await Project.findById(id).select(ADMIN_PROJECT_FIELDS).lean();
      if (!project) {
        res.status(404).json(PROJECT_NOT_FOUND);
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
    if (!isValidId(id)) {
      res.status(400).json(invalidIdResponse('Invalid project identifier.'));
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
      const project = await Project.findById(id);
      if (!project) {
        res.status(404).json(PROJECT_NOT_FOUND);
        return;
      }

      // Assign only the submitted keys. In particular, a PATCH without a
      // `workflow` key leaves the stored workflow untouched.
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'workflow' && value === null) {
          project.set('workflow', undefined);
        } else {
          project.set(key, value);
        }
      }

      // A partial update such as `{ artwork: "workflow" }` must rely on the
      // workflow already stored on the document. Check the combined result,
      // not just the submitted patch.
      if (
        project.artwork === 'workflow' &&
        (!Array.isArray(project.workflow?.steps) || project.workflow.steps.length < 2)
      ) {
        res.status(400).json(
          validationResponse({
            workflow: 'A workflow illustration needs at least 2 steps.',
          }),
        );
        return;
      }

      const updated = await project.save();
      if (updated.featured) {
        await clearOtherFeaturedProjects(updated._id);
      }
      res.status(200).json({ data: { project: toAdminProject(updated) } });
    } catch (error) {
      writeError(error, res, next, {
        logCode: 'ADMIN_PROJECT_UPDATE_FAILED',
        ...PROJECT_WRITE_ERROR,
      });
    }
  });

  // DELETE /api/admin/projects/:id
  router.delete('/projects/:id', requireTrustedOrigin, async (req, res, next) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      res.status(400).json(invalidIdResponse('Invalid project identifier.'));
      return;
    }

    try {
      const deleted = await Project.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json(PROJECT_NOT_FOUND);
        return;
      }

      res.status(204).end();
    } catch (error) {
      next(internalError(error, 'ADMIN_PROJECT_DELETE_FAILED'));
    }
  });

  // Inbox, skill groups, education, certifications, achievements, and profile.
  // These inherit requireAuth from this router and share requireTrustedOrigin.
  router.use(createAdminContentRouter({ requireTrustedOrigin }));

  return router;
}
