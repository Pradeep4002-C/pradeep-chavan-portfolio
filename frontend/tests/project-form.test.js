import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTechnologies, parseTechnologies, slugify } from '../src/admin/projectForm.js';

test('slugify produces model-compatible slugs', () => {
  assert.equal(slugify('HostelCare Portal!'), 'hostelcare-portal');
  assert.equal(slugify('  Multiple   Spaces  '), 'multiple-spaces');
  assert.equal(slugify('Café & Crème'), 'cafe-creme');
  assert.equal(slugify('--Leading and trailing--'), 'leading-and-trailing');
  assert.equal(slugify(''), '');
});

test('slugify caps the result at the model length limit', () => {
  assert.ok(slugify('a'.repeat(200)).length <= 120);
});

test('parseTechnologies trims, drops blanks, and de-duplicates case-insensitively', () => {
  assert.deepEqual(parseTechnologies('React, express , MongoDB'), ['React', 'express', 'MongoDB']);
  assert.deepEqual(parseTechnologies('React, react, REACT'), ['React']);
  assert.deepEqual(parseTechnologies('   '), []);
  assert.deepEqual(parseTechnologies(undefined), []);
});

test('formatTechnologies round-trips a technology list', () => {
  assert.equal(formatTechnologies(['React', 'Node.js']), 'React, Node.js');
  assert.equal(formatTechnologies(undefined), '');
  assert.equal(formatTechnologies([]), '');
});
