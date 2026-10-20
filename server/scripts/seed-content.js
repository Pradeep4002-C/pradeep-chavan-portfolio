import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { loadEnv } from '../src/config/env.js';
import { logger } from '../src/lib/logger.js';
import { Profile, Project, SkillGroup, ensureModelIndexes } from '../src/models/index.js';
import { profile, projects, skillGroups } from '../../frontend/src/data/portfolio.js';

/*
 * Seeds the curated frontend data into MongoDB.
 *
 * Every document is keyed by a stable identifier (profile key, project slug,
 * skill-group label) and is only created when that identifier is absent:
 *
 *   - Re-running never inserts duplicates.
 *   - Existing documents are not written to at all, so values edited later in
 *     the admin dashboard are preserved (including createdAt/updatedAt).
 *   - Documents absent from the source file are never deleted.
 *   - A unique-index collision during a race is treated as "already exists".
 *
 * Education, certifications, and achievements are intentionally not seeded:
 * the repository does not yet contain confirmed wording for them.
 */
async function insertIfAbsent(Model, filter, document) {
  const existing = await Model.exists(filter);
  if (existing) {
    return false;
  }

  try {
    await Model.create(document);
    return true;
  } catch (error) {
    // Two seeds racing: the unique index keeps one row; keep that row as-is.
    if (error?.code === 11000) {
      return false;
    }
    throw error;
  }
}

async function seedContent() {
  const config = loadEnv();
  await connectDatabase(config.mongodbUri);

  try {
    // Unique indexes must exist before the inserts rely on them.
    await ensureModelIndexes([Profile, Project, SkillGroup]);

    const inserted = { profiles: 0, projects: 0, skillGroups: 0 };

    const profileCreated = await insertIfAbsent(Profile, { key: 'profile' }, {
      key: 'profile',
      name: profile.name,
      // The hero headline and About paragraphs live in components today,
      // not in the data file, so they are left empty rather than invented.
      headline: '',
      intro: profile.intro,
      bio: [],
      email: profile.email,
      location: profile.location,
      github: profile.github,
      linkedin: profile.linkedin,
      leetcode: profile.leetcode,
      resumePath: profile.resume,
    });
    inserted.profiles += profileCreated ? 1 : 0;

    for (const [index, project] of projects.entries()) {
      const created = await insertIfAbsent(Project, { slug: project.id }, {
        slug: project.id,
        title: project.name,
        category: project.category,
        summary: project.summary,
        description: project.description,
        technologies: project.technologies,
        repoUrl: project.href,
        featured: Boolean(project.featured),
        artwork: project.artwork,
        order: Number(project.number) || index + 1,
        published: true,
      });
      inserted.projects += created ? 1 : 0;
    }

    for (const [index, group] of skillGroups.entries()) {
      const created = await insertIfAbsent(SkillGroup, { label: group.label }, {
        label: group.label,
        items: group.items,
        order: index + 1,
      });
      inserted.skillGroups += created ? 1 : 0;
    }

    const counts = {
      profiles: await Profile.countDocuments(),
      projects: await Project.countDocuments(),
      skillGroups: await SkillGroup.countDocuments(),
    };

    logger.info('Content seed complete', {
      database: mongoose.connection.name,
      inserted,
      counts,
      note: 'Existing documents are never overwritten or deleted.',
    });
  } finally {
    await disconnectDatabase();
  }
}

try {
  await seedContent();
} catch (error) {
  logger.error('Content seed failed', { error: error.message });
  process.exitCode = 1;
  await disconnectDatabase().catch(() => {});
}
