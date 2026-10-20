import {
  profile as fallbackProfile,
  projects as fallbackProjects,
  skillGroups as fallbackSkillGroups,
} from '../data/portfolio.js';
import { getJson } from './client.js';

// Mirrors the enum on the Project model and the renderers in ProjectArtwork.
const ARTWORK_KEYS = new Set(['hostelcare', 'aquapredict', 'expense']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ASSET_PATH_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._~/-]+$/;

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

/**
 * Merges API profile fields over the bundled profile. Empty or invalid values
 * never replace approved copy, and `education` stays bundled because the
 * database has no confirmed education content yet.
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

  return next;
}

function normalizeProject(apiProject, index, fallbackBySlug) {
  if (!apiProject || typeof apiProject !== 'object') {
    return null;
  }

  const slug = asText(apiProject.slug);
  const title = asText(apiProject.title);
  const repoUrl = asHttpUrl(apiProject.repoUrl);

  // A project without a stable key, a title, or a genuine repository link is
  // not renderable, so keep it out rather than showing a broken card.
  if (!slug || !title || !repoUrl) {
    return null;
  }

  const fallback = fallbackBySlug.get(slug);
  const order = Number.isFinite(apiProject.order) ? apiProject.order : index + 1;
  const technologies = Array.isArray(apiProject.technologies)
    ? apiProject.technologies.map(asText).filter(Boolean)
    : [];

  return {
    id: slug,
    number: String(Math.max(0, Math.trunc(order))).padStart(2, '0'),
    category: asText(apiProject.category) ?? fallback?.category ?? '',
    name: title,
    summary: asText(apiProject.summary) ?? fallback?.summary ?? '',
    description: asText(apiProject.description) ?? fallback?.description ?? '',
    technologies: technologies.length > 0 ? technologies : (fallback?.technologies ?? []),
    href: repoUrl,
    linkLabel: fallback?.linkLabel ?? 'View source',
    artwork: ARTWORK_KEYS.has(apiProject.artwork)
      ? apiProject.artwork
      : (fallback?.artwork ?? null),
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
 * Normalises the API payload into the exact shapes the existing components
 * expect. Collections only replace the bundled content when at least one valid
 * record survives normalisation, so a malformed response cannot blank a
 * section.
 */
export function normalizePortfolio(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Portfolio response did not include a data object.');
  }

  const fallbackBySlug = new Map(fallbackProjects.map((project) => [project.id, project]));
  const apiProjects = Array.isArray(data.projects)
    ? data.projects
        .map((project, index) => normalizeProject(project, index, fallbackBySlug))
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
    projects: apiProjects.length > 0 ? apiProjects : fallbackProjects,
    skillGroups: apiSkillGroups.length > 0 ? apiSkillGroups : fallbackSkillGroups,
  };
}

export async function fetchPortfolio({ signal } = {}) {
  const payload = await getJson('/portfolio', { signal });
  return normalizePortfolio(payload?.data);
}
