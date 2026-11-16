/**
 * Deterministic, human-readable document titles for every administrator route.
 *
 * The dashboard is a single-page app, so `index.html`'s public title would
 * otherwise stay in the browser tab. Keeping the mapping in one pure module
 * makes it easy to assert that no route falls back to `undefined` or leaks a
 * stale title back to the portfolio.
 */

const SECTION_TITLES = Object.freeze({
  '/admin/projects': 'Projects',
  '/admin/messages': 'Messages',
  '/admin/skills': 'Skills',
  '/admin/education': 'Education',
  '/admin/certifications': 'Certifications',
  '/admin/achievements': 'Achievements',
  '/admin/profile': 'Profile',
});

function normalizePath(pathname) {
  if (typeof pathname !== 'string' || pathname.length === 0) {
    return '/admin';
  }

  const withoutTrailing = pathname.replace(/\/+$/, '');
  return withoutTrailing.length === 0 ? '/admin' : withoutTrailing;
}

export function adminDocumentTitle(pathname) {
  const path = normalizePath(pathname);

  if (path === '/admin/login') {
    return 'Admin sign-in — Pradeep Chavan';
  }

  if (path === '/admin' || path === '/admin/index.html') {
    return 'Admin overview — Pradeep Chavan';
  }

  if (path === '/admin/projects/new') {
    return 'Add project — Admin — Pradeep Chavan';
  }

  if (/^\/admin\/projects\/[^/]+\/edit$/.test(path)) {
    return 'Edit project — Admin — Pradeep Chavan';
  }

  const section = SECTION_TITLES[path];
  if (section) {
    return `${section} — Admin — Pradeep Chavan`;
  }

  return 'Admin — Pradeep Chavan';
}
