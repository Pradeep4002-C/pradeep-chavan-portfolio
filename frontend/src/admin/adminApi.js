import { ApiError, deleteJson, getJson, patchJson, postJson } from '../api/client.js';

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
