import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import { createServer } from 'vite';
import { adminDocumentTitle } from '../src/admin/adminTitles.js';
import { buildContactPayload, validateContact } from '../src/sections/contactForm.js';
import {
  buildProjectPayload,
  emptyProjectValues,
  validateProject,
} from '../src/admin/projectForm.js';
import { buildPayload, emptyValues, validateFields } from '../src/admin/resourceForm.js';

/*
 * QA-Audit-8 regression contracts: deterministic titles, whitespace-normalised
 * validation/payloads, and the source-level guarantees that tie the session
 * expiry, cross-tab sign-out, and drawer cleanup behaviours together.
 */

const frontendRootUrl = new URL('..', import.meta.url);
const frontendRoot = fileURLToPath(frontendRootUrl);

function source(relativePath) {
  return readFileSync(new URL(`src/${relativePath}`, frontendRootUrl), 'utf8');
}

let vite;
let validateProfile;
let buildProfilePayload;

before(async () => {
  vite = await createServer({
    root: frontendRoot,
    configFile: false,
    esbuild: { jsx: 'automatic' },
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
    resolve: {
      alias: [
        {
          find: /^react-router-dom$/,
          replacement: fileURLToPath(import.meta.resolve('react-router-dom')),
        },
        {
          find: /^react-router\/dom$/,
          replacement: fileURLToPath(import.meta.resolve('react-router/dom')),
        },
        {
          find: /^react-router$/,
          replacement: fileURLToPath(import.meta.resolve('react-router')),
        },
      ],
    },
  });

  const profileModule = await vite.ssrLoadModule('/src/admin/AdminProfilePage.jsx');
  validateProfile = profileModule.validateProfile;
  buildProfilePayload = profileModule.buildProfilePayload;
});

after(async () => {
  await vite?.close();
});

function profileValues(overrides = {}) {
  return {
    name: 'Pradeep Chavan',
    email: 'owner@example.com',
    headline: 'Full-stack developer',
    intro: 'I build useful software.',
    location: 'Pune, India',
    github: 'https://github.com/example',
    linkedin: 'https://www.linkedin.com/in/example',
    leetcode: 'https://leetcode.com/u/example',
    resumePath: 'resume.pdf',
    ...overrides,
  };
}

test('every admin route has a deterministic human-readable document title', () => {
  const expected = new Map([
    ['/admin', 'Admin overview — Pradeep Chavan'],
    ['/admin/', 'Admin overview — Pradeep Chavan'],
    ['/admin/login', 'Admin sign-in — Pradeep Chavan'],
    ['/admin/projects', 'Projects — Admin — Pradeep Chavan'],
    ['/admin/messages', 'Messages — Admin — Pradeep Chavan'],
    ['/admin/skills', 'Skills — Admin — Pradeep Chavan'],
    ['/admin/education', 'Education — Admin — Pradeep Chavan'],
    ['/admin/certifications', 'Certifications — Admin — Pradeep Chavan'],
    ['/admin/achievements', 'Achievements — Admin — Pradeep Chavan'],
    ['/admin/profile', 'Profile — Admin — Pradeep Chavan'],
    ['/admin/projects/new', 'Add project — Admin — Pradeep Chavan'],
    ['/admin/projects/abc123/edit', 'Edit project — Admin — Pradeep Chavan'],
    ['/admin/something-else', 'Admin — Pradeep Chavan'],
  ]);

  for (const [pathname, title] of expected) {
    assert.equal(adminDocumentTitle(pathname), title);
  }

  for (const title of expected.values()) {
    assert.ok(title.length > 0);
    assert.doesNotMatch(title, /undefined|null/);
  }
});

test('route error views own explicit public and admin titles', () => {
  const view = source('components/RouteErrorView.jsx');
  assert.match(view, /title: 'Something went wrong — Pradeep Chavan'/);
  assert.match(view, /title: 'Admin error — Pradeep Chavan'/);
  assert.match(view, /document\.title = copy\.title/);
});

test('contact validation and payload trim every scalar field', () => {
  const padded = {
    name: '  Pradeep Chavan  ',
    email: '  recruiter@company.com  ',
    subject: '  Project enquiry  ',
    message: '  I would like to discuss a project with you.  ',
  };

  assert.deepEqual(validateContact(padded), {});
  assert.deepEqual(buildContactPayload(padded, { website: 'bot-trap', formStartedAt: 123 }), {
    name: 'Pradeep Chavan',
    email: 'recruiter@company.com',
    subject: 'Project enquiry',
    message: 'I would like to discuss a project with you.',
    website: 'bot-trap',
    formStartedAt: 123,
  });

  assert.equal(
    validateContact({ ...padded, name: '   ' }).name,
    'Enter your name.',
    'a whitespace-only name must not pass',
  );
  assert.equal(
    validateContact({ ...padded, email: '  not-an-email  ' }).email,
    'Enter a valid email address.',
  );
});

test('profile validation and payload trim text and reject dangerous URL schemes', () => {
  const padded = profileValues({
    name: '  Pradeep Chavan  ',
    email: '  owner@example.com  ',
    headline: '  Full-stack developer  ',
    github: '  https://github.com/example  ',
  });

  assert.deepEqual(validateProfile(padded, ['  First paragraph.  ', '   ']), {});

  const payload = buildProfilePayload(padded, ['  First paragraph.  ', '   ', '  Second.  ']);
  assert.equal(payload.name, 'Pradeep Chavan');
  assert.equal(payload.email, 'owner@example.com');
  assert.equal(payload.headline, 'Full-stack developer');
  assert.equal(payload.github, 'https://github.com/example');
  assert.deepEqual(payload.bio, ['First paragraph.', 'Second.']);

  for (const scheme of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)']) {
    for (const field of ['github', 'linkedin', 'leetcode']) {
      const errors = validateProfile(profileValues({ [field]: `  ${scheme}  ` }), []);
      assert.equal(errors[field], 'Enter a valid http or https URL.');
    }
  }
});

test('project validation trims URLs and rejects javascript, data, and vbscript schemes', () => {
  const valid = {
    ...emptyProjectValues(),
    title: '  Workflow project  ',
    slug: '  workflow-project  ',
    technologies: '  React , Express  ',
    repoUrl: '  https://github.com/example/project  ',
  };

  assert.equal(validateProject(valid).repoUrl, undefined);

  const payload = buildProjectPayload(valid);
  assert.equal(payload.title, 'Workflow project');
  assert.equal(payload.slug, 'workflow-project');
  assert.equal(payload.repoUrl, 'https://github.com/example/project');
  assert.deepEqual(payload.technologies, ['React', 'Express']);

  for (const scheme of ['javascript:alert(1)', 'data:text/html,hello', 'vbscript:msgbox(1)']) {
    assert.equal(
      validateProject({ ...valid, repoUrl: `  ${scheme}  ` }).repoUrl,
      'Enter a valid http or https repository URL.',
    );
    assert.equal(
      validateProject({ ...valid, demoUrl: `  ${scheme}  ` }).demoUrl,
      'Enter a valid http or https demo URL, or leave it blank.',
    );
  }
});

test('resource validation trims text and rejects dangerous URL schemes', () => {
  const fields = [
    { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 200 },
    { name: 'url', label: 'Certificate URL', type: 'url', maxLength: 300 },
  ];

  assert.deepEqual(
    validateFields(fields, { title: '  Meta certificate  ', url: '  https://example.com/cert  ' }),
    {},
  );
  assert.deepEqual(
    buildPayload(fields, { title: '  Meta certificate  ', url: '  https://example.com/cert  ' }),
    { title: 'Meta certificate', url: 'https://example.com/cert' },
  );

  for (const scheme of ['javascript:alert(1)', 'data:text/html,hello', 'vbscript:msgbox(1)']) {
    assert.equal(
      validateFields(fields, { title: 'Certificate', url: `  ${scheme}  ` }).url,
      'Enter a valid http or https URL.',
    );
  }

  assert.deepEqual(emptyValues(fields), { title: '', url: '' });
});

test('session expiry preserves drafts, bypasses blockers, and forwards the reason', () => {
  for (const file of [
    'admin/AdminProfilePage.jsx',
    'admin/ProjectEditorPage.jsx',
    'admin/ResourceManager.jsx',
  ]) {
    const text = source(file);
    assert.match(
      text,
      /authStatus === ADMIN_AUTH_STATUS\.authenticated/,
      `${file} must evaluate its blocker against the current auth status`,
    );
    assert.match(text, /persistDraft\(\)/, `${file} must persist typed work on 401`);
    assert.match(
      text,
      /authStatus === ADMIN_AUTH_STATUS\.unauthenticated && dirty/,
      `${file} must snapshot dirty work when the session ends`,
    );
  }

  const protectedRoute = source('admin/ProtectedRoute.jsx');
  assert.match(protectedRoute, /reason: signOutReason/);

  const login = source('admin/AdminLoginPage.jsx');
  assert.match(login, /SESSION_NOTICES/);
  assert.match(login, /your draft has been kept/);
  assert.match(login, /signed out in another tab/);
  assert.match(login, /const trimmedEmail = email\.trim\(\)/);
});

test('cross-tab auth signal and document titles are wired into the app shell', () => {
  const auth = source('admin/AdminAuthContext.jsx');
  assert.match(auth, /pradeep-portfolio\.admin\.auth/);
  assert.match(auth, /addEventListener\('storage'/);
  assert.match(auth, /type: 'signed-out'/);

  const layout = source('admin/AdminLayout.jsx');
  assert.match(layout, /useDocumentTitle\(adminDocumentTitle\(location\.pathname\)\)/);
  assert.match(layout, /\[location\.key, location\.pathname\]/);
  assert.match(layout, /addEventListener\('popstate'/);

  const navbar = source('components/Navbar.jsx');
  assert.match(navbar, /initialHashRef/);
  assert.match(navbar, /hashAlignmentDoneRef/);
  assert.match(navbar, /addEventListener\('wheel'/);
  assert.match(navbar, /addEventListener\('popstate'/);
  assert.match(navbar, /addEventListener\('hashchange'/);

  const lock = source('components/bodyScrollLock.js');
  assert.match(lock, /export function getBodyScrollLockCount/);

  const contact = source('sections/Contact.jsx');
  assert.match(contact, /validateContact\(values\)/);
  assert.match(contact, /buildContactPayload\(values/);
});
