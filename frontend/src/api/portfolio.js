import { profile as fallbackProfile } from '../data/portfolio.js';
import { normalizeWorkflow } from '../components/workflow.js';
import { getJson } from './client.js';

// Mirrors the enum on the Project model and the renderers in ProjectArtwork.
const ARTWORK_KEYS = new Set(['hostelcare', 'aquapredict', 'expense', 'workflow']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ASSET_PATH_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._~/-]+$/;

// Bounds shared with the Mongoose models and the admin validation schemas.
const YEAR_MIN = 1950;
const YEAR_MAX = 2100;
const BIO_MAX_PARAGRAPHS = 20;
const BIO_MAX_PARAGRAPH_LENGTH = 2000;

/**
 * Safe starting content while the public API is loading. The approved profile
 * copy can render immediately, but database-managed projects and skills stay
 * empty until the API confirms their current state.
 */
export const EMPTY_PORTFOLIO = Object.freeze({
  profile: fallbackProfile,
  projects: [],
  skillGroups: [],
  education: [],
  certifications: [],
  achievements: [],
});

function asText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asHttpUrl(value) {
  const text = asText(value);
  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : null;
  } catch {
    return null;
  }
}

function asEmail(value) {
  const text = asText(value);
  return text && EMAIL_PATTERN.test(text) ? text : null;
}

function asAssetPath(value) {
  const text = asText(value);
  return text && ASSET_PATH_PATTERN.test(text) ? text : null;
}

function asYear(value) {
  return Number.isInteger(value) && value >= YEAR_MIN && value <= YEAR_MAX ? value : null;
}

function asOrder(value, index) {
  return Number.isFinite(value) ? Math.trunc(value) : index + 1;
}

/** Trims biography paragraphs and drops blanks, over-long entries, and non-strings. */
function asParagraphs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(asText)
    .filter((paragraph) => paragraph !== null && paragraph.length <= BIO_MAX_PARAGRAPH_LENGTH)
    .slice(0, BIO_MAX_PARAGRAPHS);
}

/**
 * Merges API profile fields over the bundled profile. Empty or invalid values
 * never replace approved copy, so a blank database field cannot erase the About
 * text or the contact links.
 */
function normalizeProfile(apiProfile) {
  if (!apiProfile || typeof apiProfile !== 'object') {
    return fallbackProfile;
  }

  const next = { ...fallbackProfile };
  const replacements = {
    name: asText(apiProfile.name),
    intro: asText(apiProfile.intro),
    location: asText(apiProfile.location),
    email: asEmail(apiProfile.email),
    github: asHttpUrl(apiProfile.github),
    linkedin: asHttpUrl(apiProfile.linkedin),
    leetcode: asHttpUrl(apiProfile.leetcode),
    resume: asAssetPath(apiProfile.resumePath),
  };

  Object.entries(replacements).forEach(([key, value]) => {
    if (value) {
      next[key] = value;
    }
  });

  // A database biography replaces the bundled copy only when at least one
  // usable paragraph survives normalisation.
  const bio = asParagraphs(apiProfile.bio);
  if (bio.length > 0) {
    next.bio = bio;
  }

  // No headline is bundled, so it is displayed only when the database supplies
  // meaningful text.
  next.headline = asText(apiProfile.headline);

  return next;
}

function normalizeProject(apiProject, index) {
  if (!apiProject || typeof apiProject !== 'object') {
    return null;
  }

  const slug = asText(apiProject.slug);
  const title = asText(apiProject.title);
  const repoUrl = asHttpUrl(apiProject.repoUrl);
  // A demo is optional, but it must be a real http(s) address before the public
  // card offers a button. No fallback demo link is ever invented.
  const demoUrl = asHttpUrl(apiProject.demoUrl);

  // A project without a stable key, a title, or a genuine repository link is
  // not renderable, so keep it out rather than showing a broken card.
  if (!slug || !title || !repoUrl) {
    return null;
  }

  const order = Number.isFinite(apiProject.order) ? apiProject.order : index + 1;
  const technologies = Array.isArray(apiProject.technologies)
    ? apiProject.technologies.map(asText).filter(Boolean)
    : [];

  return {
    id: slug,
    number: String(Math.max(0, Math.trunc(order))).padStart(2, '0'),
    category: asText(apiProject.category) ?? '',
    name: title,
    summary: asText(apiProject.summary) ?? '',
    description: asText(apiProject.description) ?? '',
    technologies,
    href: repoUrl,
    demoHref: demoUrl,
    linkLabel: 'View source code',
    artwork: ARTWORK_KEYS.has(apiProject.artwork) ? apiProject.artwork : null,
    workflow: normalizeWorkflow(apiProject.workflow),
    featured: Boolean(apiProject.featured),
  };
}

function normalizeSkillGroup(apiGroup, index) {
  if (!apiGroup || typeof apiGroup !== 'object') {
    return null;
  }

  const label = asText(apiGroup.label);
  const items = Array.isArray(apiGroup.items)
    ? apiGroup.items.map(asText).filter(Boolean)
    : [];

  if (!label || items.length === 0) {
    return null;
  }

  return {
    label,
    items,
    order: Number.isFinite(apiGroup.order) ? apiGroup.order : index + 1,
  };
}

/**
 * Education, certifications, and achievements are database-only content: there
 * is no bundled fallback for them, so an empty collection simply hides its
 * public subsection. Each normaliser drops records without the one field that
 * makes them meaningful, and clears values the models would never store.
 */
function normalizeEducation(apiEducation, index) {
  if (!apiEducation || typeof apiEducation !== 'object') {
    return null;
  }

  const institution = asText(apiEducation.institution);
  if (!institution) {
    return null;
  }

  let startYear = asYear(apiEducation.startYear);
  let endYear = asYear(apiEducation.endYear);

  // Keep the record but drop a backwards range rather than printing "2027–2023".
  if (startYear !== null && endYear !== null && endYear < startYear) {
    startYear = null;
    endYear = null;
  }

  return {
    institution,
    qualification: asText(apiEducation.qualification),
    field: asText(apiEducation.field),
    startYear,
    endYear,
    score: asText(apiEducation.score),
    location: asText(apiEducation.location),
    order: asOrder(apiEducation.order, index),
  };
}

function normalizeCertification(apiCertification, index) {
  if (!apiCertification || typeof apiCertification !== 'object') {
    return null;
  }

  const title = asText(apiCertification.title);
  if (!title) {
    return null;
  }

  return {
    title,
    issuer: asText(apiCertification.issuer),
    year: asYear(apiCertification.year),
    // Only genuine web links become links; anything else renders as plain text.
    url: asHttpUrl(apiCertification.url),
    order: asOrder(apiCertification.order, index),
  };
}

function normalizeAchievement(apiAchievement, index) {
  if (!apiAchievement || typeof apiAchievement !== 'object') {
    return null;
  }

  const title = asText(apiAchievement.title);
  if (!title) {
    return null;
  }

  return {
    title,
    year: asYear(apiAchievement.year),
    description: asText(apiAchievement.description),
    order: asOrder(apiAchievement.order, index),
  };
}

function normalizeCollection(value, normalize, compare) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((record, index) => normalize(record, index))
    .filter(Boolean)
    .sort(compare);
}

const byOrderThenInstitution = (a, b) =>
  a.order - b.order || a.institution.localeCompare(b.institution);

const byOrderThenTitle = (a, b) => a.order - b.order || a.title.localeCompare(b.title);

/**
 * Normalises the API payload into the exact shapes the existing components
 * expect. Projects and skills are administrator-managed resources, so the
 * published database response is authoritative: an empty or malformed
 * collection stays empty rather than borrowing bundled seed data. The
 * background collections follow the same empty-means-hidden rule.
 */
export function normalizePortfolio(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Portfolio response did not include a data object.');
  }

  const apiProjects = Array.isArray(data.projects)
    ? data.projects
        .map((project, index) => normalizeProject(project, index))
        .filter(Boolean)
    : [];
  const apiSkillGroups = Array.isArray(data.skills)
    ? data.skills
        .map((group, index) => normalizeSkillGroup(group, index))
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)
        .map(({ label, items }) => ({ label, items }))
    : [];

  return {
    profile: normalizeProfile(data.profile),
    projects: apiProjects,
    skillGroups: apiSkillGroups,
    education: normalizeCollection(data.education, normalizeEducation, byOrderThenInstitution),
    certifications: normalizeCollection(
      data.certifications,
      normalizeCertification,
      byOrderThenTitle,
    ),
    achievements: normalizeCollection(data.achievements, normalizeAchievement, byOrderThenTitle),
  };
}

export async function fetchPortfolio({ signal } = {}) {
  const payload = await getJson('/portfolio', { signal });
  return normalizePortfolio(payload?.data);
}
