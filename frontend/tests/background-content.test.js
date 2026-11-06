import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCgpa,
  formatPeriod,
  hasBackgroundContent,
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

test('formatCgpa adds the ten-point scale only to a plain numeric score', () => {
  assert.equal(formatCgpa('8.61'), '8.61 / 10');
  assert.equal(formatCgpa('CGPA: 8.61'), '8.61 / 10');
  assert.equal(formatCgpa('8.61/10'), '8.61 / 10');
  assert.equal(formatCgpa('First class'), 'First class');
  assert.equal(formatCgpa('   '), null);
  assert.equal(formatCgpa(null), null);
});
