import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema } from '../src/validation/auth.js';
import { contactSchema } from '../src/validation/contact.js';
import {
  certificationCreateSchema,
  profileUpdateSchema,
} from '../src/validation/content.js';
import { projectCreateSchema } from '../src/validation/project.js';

/*
 * QA-Audit-8 backend contracts: every scalar input is trimmed before it is
 * validated or stored, and every link field accepts only http(s) after that
 * trim. These schemas are the last line of defence, so the assertions run
 * against the parsed output rather than only checking that parsing succeeded.
 */

const DANGEROUS_SCHEMES = [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
];

function failedPaths(result) {
  assert.equal(result.success, false, 'expected validation to reject the payload');
  return result.error.issues.map((issue) => issue.path.join('.'));
}

test('contact input is trimmed and normalised before validation', () => {
  const result = contactSchema.safeParse({
    name: '  Pradeep Chavan  ',
    email: '  Recruiter@Company.com  ',
    subject: '  Project enquiry  ',
    message: '  I would like to discuss a project with you.  ',
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    name: 'Pradeep Chavan',
    email: 'recruiter@company.com',
    subject: 'Project enquiry',
    message: 'I would like to discuss a project with you.',
  });

  assert.deepEqual(
    failedPaths(
      contactSchema.safeParse({
        name: '   ',
        email: '  not-an-email  ',
        message: '  too short  ',
      }),
    ),
    ['name', 'email', 'message'],
  );
});

test('admin login trims and lowercases the email but keeps the password verbatim', () => {
  const result = loginSchema.safeParse({
    email: '  Owner@Example.com  ',
    password: '  secret with spaces  ',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.email, 'owner@example.com');
  assert.equal(result.data.password, '  secret with spaces  ');
});

test('profile links are trimmed and only http(s) survives', () => {
  const padded = profileUpdateSchema.safeParse({
    name: '  Pradeep Chavan  ',
    email: '  owner@example.com  ',
    github: '  https://github.com/example  ',
    linkedin: '   ',
    leetcode: '  https://leetcode.com/u/example  ',
  });

  assert.equal(padded.success, true);
  assert.equal(padded.data.github, 'https://github.com/example');
  assert.equal(padded.data.linkedin, '');
  assert.equal(padded.data.name, 'Pradeep Chavan');

  for (const scheme of DANGEROUS_SCHEMES) {
    for (const field of ['github', 'linkedin', 'leetcode']) {
      assert.deepEqual(
        failedPaths(
          profileUpdateSchema.safeParse({
            name: 'Pradeep Chavan',
            email: 'owner@example.com',
            [field]: `  ${scheme}  `,
          }),
        ),
        [field],
        `${field} must reject ${scheme}`,
      );
    }
  }
});

test('certification URLs are trimmed and dangerous schemes are rejected', () => {
  const accepted = certificationCreateSchema.safeParse({
    title: '  Meta certificate  ',
    issuer: '  Meta  ',
    year: '2024',
    url: '  https://example.com/certificate  ',
  });

  assert.equal(accepted.success, true);
  assert.equal(accepted.data.title, 'Meta certificate');
  assert.equal(accepted.data.url, 'https://example.com/certificate');

  const blank = certificationCreateSchema.safeParse({
    title: 'Certificate',
    issuer: 'Meta',
    year: 2024,
    url: '   ',
  });
  assert.equal(blank.success, true);
  assert.equal(blank.data.url, '');

  for (const scheme of DANGEROUS_SCHEMES) {
    assert.deepEqual(
      failedPaths(
        certificationCreateSchema.safeParse({
          title: 'Certificate',
          issuer: 'Meta',
          year: 2024,
          url: `  ${scheme}  `,
        }),
      ),
      ['url'],
    );
  }
});

test('project links are trimmed, blank optional demos are allowed, and dangerous schemes fail', () => {
  const base = {
    title: '  Workflow project  ',
    slug: '  workflow-project  ',
    technologies: ['  React  ', '  Express  '],
    repoUrl: '  https://github.com/example/project  ',
    demoUrl: '   ',
    artwork: 'hostelcare',
  };

  const accepted = projectCreateSchema.safeParse(base);
  assert.equal(accepted.success, true);
  assert.equal(accepted.data.title, 'Workflow project');
  assert.equal(accepted.data.repoUrl, 'https://github.com/example/project');
  assert.equal(accepted.data.demoUrl, '');
  assert.deepEqual(accepted.data.technologies, ['React', 'Express']);

  for (const scheme of DANGEROUS_SCHEMES) {
    assert.deepEqual(
      failedPaths(
        projectCreateSchema.safeParse({ ...base, repoUrl: `  ${scheme}  ` }),
      ),
      ['repoUrl'],
    );
    assert.deepEqual(
      failedPaths(
        projectCreateSchema.safeParse({ ...base, demoUrl: `  ${scheme}  ` }),
      ),
      ['demoUrl'],
    );
  }
});
