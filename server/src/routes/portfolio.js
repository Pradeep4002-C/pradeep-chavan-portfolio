import { Router } from 'express';
import { getDatabaseStatus } from '../config/db.js';
import { Profile } from '../models/Profile.js';
import { Project } from '../models/Project.js';
import { SkillGroup } from '../models/SkillGroup.js';
import { Education } from '../models/Education.js';
import { Certification } from '../models/Certification.js';
import { Achievement } from '../models/Achievement.js';

export const portfolioRouter = Router();

/**
 * GET /api/portfolio
 *
 * Public, read-only portfolio content. Every model uses an explicit field
 * projection, so administrator records, password hashes, contact messages,
 * timestamps, versions, and internal ids can never be serialised here.
 */
portfolioRouter.get('/', async (req, res) => {
  // Fail fast and honestly when the connection has dropped, instead of
  // buffering queries for the driver timeout.
  if (getDatabaseStatus().status !== 'connected') {
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Portfolio content is temporarily unavailable.',
      },
    });
    return;
  }

  const [profile, projects, skills, education, certifications, achievements] = await Promise.all([
    Profile.findOne({ key: 'profile' })
      .select('name headline intro bio email location github linkedin leetcode resumePath -_id')
      .lean(),
    Project.find({ published: true })
      .select(
        'title slug category summary description technologies repoUrl demoUrl featured artwork order -_id',
      )
      .sort({ order: 1, slug: 1 })
      .lean(),
    SkillGroup.find()
      .select('label items order -_id')
      .sort({ order: 1, label: 1 })
      .lean(),
    Education.find()
      .select('institution qualification field startYear endYear score location order -_id')
      .sort({ order: 1, institution: 1 })
      .lean(),
    Certification.find()
      .select('title issuer year url order -_id')
      .sort({ order: 1, title: 1 })
      .lean(),
    Achievement.find()
      .select('title year description order -_id')
      .sort({ order: 1, title: 1 })
      .lean(),
  ]);

  res.json({
    data: {
      profile: profile ?? {},
      projects,
      skills,
      education,
      certifications,
      achievements,
    },
  });
});
