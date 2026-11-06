import assert from 'node:assert/strict';
import test from 'node:test';
import { withoutRepeatedName } from '../src/sections/heroCopy.js';

test('removes a leading self-introduction that repeats the displayed name', () => {
  assert.equal(
    withoutRepeatedName(
      'I’m Pradeep, a Computer Science Engineering student who turns practical problems into full-stack applications.',
      'Pradeep Chavan',
    ),
    'A Computer Science Engineering student who turns practical problems into full-stack applications.',
  );

  assert.equal(
    withoutRepeatedName(
      'I am Pradeep Chavan, a developer who builds practical tools.',
      'Pradeep Chavan',
    ),
    'A developer who builds practical tools.',
  );

  assert.equal(
    withoutRepeatedName(
      'Hello, I’m Pradeep — a developer who builds practical tools.',
      'Pradeep Chavan',
    ),
    'A developer who builds practical tools.',
  );

  assert.equal(
    withoutRepeatedName(
      'My name is Pradeep Chavan: full-stack developer.',
      'Pradeep Chavan',
    ),
    'Full-stack developer.',
  );
});

test('leaves introductions without a leading name untouched', () => {
  const intro =
    'I turn practical problems into full-stack applications, workflow automations, and data-driven tools.';
  assert.equal(withoutRepeatedName(intro, 'Pradeep Chavan'), intro);
});

test('does not rewrite a name used inside the sentence', () => {
  const intro = 'Pradeep Chavan is the name behind this portfolio.';
  assert.equal(withoutRepeatedName(intro, 'Pradeep Chavan'), intro);
});

test('handles missing or blank values without inventing copy', () => {
  assert.equal(withoutRepeatedName('', 'Pradeep Chavan'), '');
  assert.equal(withoutRepeatedName('I’m Pradeep, a developer.', ''), 'I’m Pradeep, a developer.');
  assert.equal(withoutRepeatedName('I’m Pradeep,', 'Pradeep Chavan'), 'I’m Pradeep,');
});
