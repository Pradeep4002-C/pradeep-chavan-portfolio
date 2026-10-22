import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePortfolio } from '../src/api/portfolio.js';
import { profile as fallbackProfile } from '../src/data/portfolio.js';

function normalized({ profile = {}, ...collections } = {}) {
  return normalizePortfolio({
    profile: {
      name: fallbackProfile.name,
      headline: '',
      intro: fallbackProfile.intro,
      bio: [],
      email: fallbackProfile.email,
      location: fallbackProfile.location,
      github: fallbackProfile.github,
      linkedin: fallbackProfile.linkedin,
      leetcode: fallbackProfile.leetcode,
      resumePath: fallbackProfile.resume,
      ...profile,
    },
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    achievements: [],
    ...collections,
  });
}

test('an empty database biography keeps the approved About copy', () => {
  const cases = [[], ['', '   '], [null, 42], 'not-an-array', null, undefined];

  for (const bio of cases) {
    const { profile } = normalized({ profile: { bio } });
    assert.deepEqual(profile.bio, fallbackProfile.bio);
  }

  assert.equal(fallbackProfile.bio.length, 2);
});

test('valid biography paragraphs replace the bundled copy, trimmed and without blanks', () => {
  const { profile } = normalized({
    profile: { bio: ['  First paragraph.  ', '', '   ', 'Second paragraph.', 'Third paragraph.'] },
  });

  assert.deepEqual(profile.bio, ['First paragraph.', 'Second paragraph.', 'Third paragraph.']);
});

test('over-long biography paragraphs are ignored rather than truncated', () => {
  const kept = 'b'.repeat(2000);
  const { profile } = normalized({ profile: { bio: ['a'.repeat(2001), kept] } });

  assert.deepEqual(profile.bio, [kept]);
});

test('a headline is exposed only when the database holds meaningful text', () => {
  assert.equal(normalized({ profile: { headline: '' } }).profile.headline, null);
  assert.equal(normalized({ profile: { headline: '   ' } }).profile.headline, null);
  assert.equal(normalized({ profile: { headline: 42 } }).profile.headline, null);
  assert.equal(
    normalized({ profile: { headline: '  Backend developer  ' } }).profile.headline,
    'Backend developer',
  );
});

test('education records are mapped, defaulted, and sorted by order', () => {
  const { education } = normalized({
    education: [
      {
        institution: 'B Institute',
        qualification: 'B.E.',
        field: 'Computer Science',
        startYear: 2021,
        endYear: 2025,
        score: '8.9 CGPA',
        location: 'Belgaum',
        order: 2,
      },
      {
        institution: 'A Institute',
        qualification: 'Diploma',
        startYear: 2018,
        endYear: 2021,
        order: 1,
      },
      { institution: 'C Institute' },
    ],
  });

  assert.deepEqual(
    education.map((record) => record.institution),
    ['A Institute', 'B Institute', 'C Institute'],
  );
  assert.deepEqual(education[0], {
    institution: 'A Institute',
    qualification: 'Diploma',
    field: null,
    startYear: 2018,
    endYear: 2021,
    score: null,
    location: null,
    order: 1,
  });
  // Records without an explicit order keep their response position.
  assert.equal(education[2].order, 3);
});

test('education records without an institution cannot be rendered', () => {
  const { education } = normalized({
    education: [
      null,
      'a string',
      {},
      { institution: '   ', qualification: 'B.E.' },
      { qualification: 'B.E.' },
      { institution: 'Kept' },
    ],
  });

  assert.equal(education.length, 1);
  assert.equal(education[0].institution, 'Kept');
});

test('education years outside the model bounds or in reverse are dropped', () => {
  const { education } = normalized({
    education: [
      { institution: 'Reverse', startYear: 2027, endYear: 2023 },
      { institution: 'Too early', startYear: 1800, endYear: 1900 },
      { institution: 'Too late', startYear: 2023, endYear: 2101 },
      { institution: 'Fractional', startYear: 2023.5 },
      { institution: 'Numeric strings', startYear: '2023' },
      { institution: 'Partial', startYear: 2023 },
    ],
  });

  assert.deepEqual(education[0].startYear, null);
  assert.deepEqual(education[0].endYear, null);
  assert.equal(education[1].startYear, null);
  assert.equal(education[2].endYear, null);
  assert.equal(education[3].startYear, null);
  assert.equal(education[4].startYear, null);
  assert.equal(education[5].startYear, 2023);
  assert.equal(education[5].endYear, null);
});

test('certifications keep only web links and sort by order', () => {
  const { certifications } = normalized({
    certifications: [
      { title: 'Second', issuer: 'Issuer', year: 2024, url: ' https://example.com/a ', order: 2 },
      { title: 'First', year: 2023, url: 'javascript:alert(1)', order: 1 },
      { title: 'Third', url: 'mailto:someone@example.com', order: 3 },
      { issuer: 'No title', order: 4 },
    ],
  });

  assert.deepEqual(
    certifications.map((record) => record.title),
    ['First', 'Second', 'Third'],
  );
  assert.equal(certifications[0].url, null);
  assert.equal(certifications[1].url, 'https://example.com/a');
  assert.equal(certifications[2].url, null);
  assert.equal(certifications[2].year, null);
  assert.equal(certifications[2].issuer, null);
});

test('achievements keep their description, year, and order without inventing fields', () => {
  const { achievements } = normalized({
    achievements: [
      {
        title: 'Departmental award',
        year: 2025,
        description: 'Recognised for academic performance.',
        order: 2,
      },
      { title: 'Merit recognition', year: 2024, order: 1 },
      { description: 'No title' },
      null,
    ],
  });

  assert.deepEqual(
    achievements.map((record) => record.title),
    ['Merit recognition', 'Departmental award'],
  );
  assert.equal(achievements[0].description, null);
  assert.equal(achievements[0].year, 2024);
  assert.equal(achievements[1].description, 'Recognised for academic performance.');
});

test('empty or missing background collections stay empty instead of borrowing content', () => {
  const result = normalized();

  assert.deepEqual(result.education, []);
  assert.deepEqual(result.certifications, []);
  assert.deepEqual(result.achievements, []);

  const missing = normalizePortfolio({ profile: {} });
  assert.deepEqual(missing.education, []);
  assert.deepEqual(missing.certifications, []);
  assert.deepEqual(missing.achievements, []);
});

test('background normalisation does not disturb projects, skills, or contact mappings', () => {
  const result = normalized({
    profile: { headline: 'Backend developer', bio: ['One.'] },
    education: [{ institution: 'Institute' }],
  });

  assert.equal(result.profile.headline, 'Backend developer');
  assert.equal(result.profile.github, fallbackProfile.github);
  assert.ok(result.projects.length > 0);
  assert.ok(result.skillGroups.length > 0);
});
