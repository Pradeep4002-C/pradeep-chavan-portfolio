import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPeriod,
  hasBackgroundContent,
  summarizeEducation,
} from '../src/sections/backgroundContent.js';

test('background content exists only when a collection holds a record', () => {
  assert.equal(hasBackgroundContent(), false);
  assert.equal(hasBackgroundContent({}), false);
  assert.equal(
    hasBackgroundContent({ education: [], certifications: [], achievements: [] }),
    false,
  );
  assert.equal(hasBackgroundContent({ education: [{}] }), true);
  assert.equal(hasBackgroundContent({ certifications: [{}] }), true);
  assert.equal(hasBackgroundContent({ achievements: [{}] }), true);
});

test('formatPeriod renders complete, partial, and missing periods', () => {
  assert.equal(formatPeriod(2023, 2027), '2023–2027');
  assert.equal(formatPeriod(2023), '2023');
  assert.equal(formatPeriod(null, 2027), '2027');
  assert.equal(formatPeriod(null, null), null);
  assert.equal(formatPeriod(undefined, undefined), null);
  assert.equal(formatPeriod('2023', 2027), '2027');
});

test('summarizeEducation mirrors the approved one-line format', () => {
  assert.equal(
    summarizeEducation({
      institution: 'K.L.S. Gogte Institute of Technology',
      field: 'Computer Science Engineering',
      startYear: 2023,
      endYear: 2027,
    }),
    'Computer Science Engineering · K.L.S. Gogte Institute of Technology · 2023–2027',
  );
});

test('summarizeEducation falls back to the qualification and omits empty parts', () => {
  assert.equal(
    summarizeEducation({ institution: 'Institute', qualification: 'B.E.' }),
    'B.E. · Institute',
  );
  assert.equal(summarizeEducation({ institution: 'Institute' }), 'Institute');
  assert.equal(
    summarizeEducation({ institution: 'Institute', field: '   ', qualification: 'B.E.' }),
    'B.E. · Institute',
  );
});

test('summarizeEducation refuses records without an institution', () => {
  assert.equal(summarizeEducation(null), null);
  assert.equal(summarizeEducation({}), null);
  assert.equal(summarizeEducation({ institution: '   ', qualification: 'B.E.' }), null);
});
