import { ApiError, deleteJson, getJson, patchJson, postJson, putJson } from '../api/client.js';

/**
 * Administrator API wrapper. It reuses the shared JSON client (same relative
 * `/api` root, same safe error envelope) and validates the small response
 * shapes the dashboard depends on so a malformed payload can never render as
 * if it were real data.
 */

function requireAdmin(admin) {
  if (!admin || typeof admin !== 'object' || typeof admin.id !== 'string') {
    throw new ApiError('The admin service returned an unreadable response.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return {
    id: admin.id,
    email: typeof admin.email === 'string' ? admin.email : '',
    name: typeof admin.name === 'string' ? admin.name : '',
  };
}

function requireProject(project) {
  if (!project || typeof project !== 'object' || typeof project.id !== 'string') {
    throw new ApiError('The admin service returned an unreadable project.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return project;
}

/* ------------------------------- session ------------------------------- */

export async function fetchSession({ signal } = {}) {
  const payload = await getJson('/auth/me', { signal });
  return requireAdmin(payload?.data?.admin);
}

export async function loginAdmin({ email, password }, { signal } = {}) {
  const payload = await postJson('/auth/login', { email, password }, { signal });
  return requireAdmin(payload?.data?.admin);
}

export async function logoutAdmin({ signal } = {}) {
  await postJson('/auth/logout', undefined, { signal });
}

/* ------------------------------- overview ------------------------------- */

export async function fetchOverview({ signal } = {}) {
  const payload = await getJson('/admin/overview', { signal });
  const data = payload?.data;

  if (!data || typeof data !== 'object') {
    throw new ApiError('The admin service returned an unreadable overview.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return data;
}

/* ------------------------------- projects ------------------------------- */

export async function fetchProjects({ signal } = {}) {
  const payload = await getJson('/admin/projects', { signal });
  const projects = payload?.data?.projects;

  if (!Array.isArray(projects)) {
    throw new ApiError('The admin service returned an unreadable project list.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return projects;
}

export async function createProject(values, { signal } = {}) {
  const payload = await postJson('/admin/projects', values, { signal });
  return requireProject(payload?.data?.project);
}

export async function updateProject(id, values, { signal } = {}) {
  const payload = await patchJson(`/admin/projects/${encodeURIComponent(id)}`, values, { signal });
  return requireProject(payload?.data?.project);
}

export async function deleteProject(id, { signal } = {}) {
  await deleteJson(`/admin/projects/${encodeURIComponent(id)}`, { signal });
}

/* ------------------------------- messages ------------------------------- */

function requireMessage(message) {
  if (!message || typeof message !== 'object' || typeof message.id !== 'string') {
    throw new ApiError('The admin service returned an unreadable message.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return message;
}

export async function fetchMessages({ read = 'all', page = 1, limit = 20 } = {}, { signal } = {}) {
  const query = new URLSearchParams({ read, page: String(page), limit: String(limit) });
  const payload = await getJson(`/admin/messages?${query.toString()}`, { signal });

  const messages = payload?.data?.messages;
  const pagination = payload?.data?.pagination;

  if (!Array.isArray(messages) || !pagination || typeof pagination !== 'object') {
    throw new ApiError('The admin service returned an unreadable inbox.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return { messages, pagination };
}

export async function updateMessage(id, values, { signal } = {}) {
  const payload = await patchJson(`/admin/messages/${encodeURIComponent(id)}`, values, { signal });
  return requireMessage(payload?.data?.message);
}

export async function deleteMessage(id, { signal } = {}) {
  await deleteJson(`/admin/messages/${encodeURIComponent(id)}`, { signal });
}

/* --------------------------- content collections --------------------------- */

/**
 * Builds the list/create/update/delete wrappers for one ordered collection.
 * The response shape is validated once here instead of in every page.
 */
function createResourceApi({ path, listKey, itemKey }) {
  function requireItem(item) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string') {
      throw new ApiError(`The admin service returned an unreadable ${itemKey}.`, {
        code: 'INVALID_RESPONSE',
      });
    }
    return item;
  }

  return {
    async list({ signal } = {}) {
      const payload = await getJson(`/admin/${path}`, { signal });
      const items = payload?.data?.[listKey];

      if (!Array.isArray(items)) {
        throw new ApiError(`The admin service returned an unreadable ${listKey} list.`, {
          code: 'INVALID_RESPONSE',
        });
      }

      return items;
    },
    async create(values, { signal } = {}) {
      const payload = await postJson(`/admin/${path}`, values, { signal });
      return requireItem(payload?.data?.[itemKey]);
    },
    async update(id, values, { signal } = {}) {
      const payload = await patchJson(`/admin/${path}/${encodeURIComponent(id)}`, values, { signal });
      return requireItem(payload?.data?.[itemKey]);
    },
    async remove(id, { signal } = {}) {
      await deleteJson(`/admin/${path}/${encodeURIComponent(id)}`, { signal });
    },
  };
}

export const skillGroupsApi = createResourceApi({
  path: 'skill-groups',
  listKey: 'skillGroups',
  itemKey: 'skillGroup',
});

export const educationApi = createResourceApi({
  path: 'education',
  listKey: 'education',
  itemKey: 'education',
});

export const certificationsApi = createResourceApi({
  path: 'certifications',
  listKey: 'certifications',
  itemKey: 'certification',
});

export const achievementsApi = createResourceApi({
  path: 'achievements',
  listKey: 'achievements',
  itemKey: 'achievement',
});

/* ------------------------------- profile ------------------------------- */

export async function fetchProfile({ signal } = {}) {
  const payload = await getJson('/admin/profile', { signal });
  const profile = payload?.data?.profile;

  if (profile === null) {
    return null;
  }
  if (!profile || typeof profile !== 'object') {
    throw new ApiError('The admin service returned an unreadable profile.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return profile;
}

export async function updateProfile(values, { signal } = {}) {
  const payload = await putJson('/admin/profile', values, { signal });
  const profile = payload?.data?.profile;

  if (!profile || typeof profile !== 'object') {
    throw new ApiError('The admin service returned an unreadable profile.', {
      code: 'INVALID_RESPONSE',
    });
  }

  return profile;
}
