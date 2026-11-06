import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSkillGroups } from '../src/sections/skillsContent.js';

test('skill groups require a label and at least one non-blank item', () => {
  assert.equal(hasSkillGroups(), false);
  assert.equal(hasSkillGroups([]), false);
  assert.equal(hasSkillGroups([{ label: 'Frontend', items: [] }]), false);
  assert.equal(hasSkillGroups([{ label: ' ', items: ['React'] }]), false);
  assert.equal(hasSkillGroups([{ label: 'Frontend', items: ['  '] }]), false);
  assert.equal(hasSkillGroups([{ label: 'Frontend', items: ['React'] }]), true);
});
