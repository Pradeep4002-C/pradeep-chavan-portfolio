import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WORKFLOW_STEP_META,
  WORKFLOW_STEP_TYPES,
  describeWorkflow,
  normalizeWorkflow,
} from '../src/components/workflow.js';

function step(overrides = {}) {
  return {
    id: 'step-1',
    title: 'User submits a request',
    description: 'Optional explanation',
    type: 'input',
    ...overrides,
  };
}

test('every supported workflow type has visual metadata', () => {
  assert.equal(WORKFLOW_STEP_TYPES.length, 7);
  for (const type of WORKFLOW_STEP_TYPES) {
    assert.ok(WORKFLOW_STEP_META[type], `missing metadata for ${type}`);
    assert.ok(WORKFLOW_STEP_META[type].label);
    assert.ok(WORKFLOW_STEP_META[type].glyph);
    assert.match(WORKFLOW_STEP_META[type].card, /border-/);
  }
});

test('normalizeWorkflow keeps two to ten valid, ordered steps', () => {
  const workflow = normalizeWorkflow({
    steps: [
      step(),
      step({ id: 'step-2', title: 'Express API', description: '', type: 'backend' }),
      step({ id: 'step-3', title: 'MongoDB', type: 'database' }),
    ],
  });

  assert.equal(workflow.steps.length, 3);
  assert.deepEqual(
    workflow.steps.map((entry) => entry.title),
    ['User submits a request', 'Express API', 'MongoDB'],
  );
  assert.equal(workflow.steps[1].description, '');
});

test('normalizeWorkflow drops malformed records rather than inventing nodes', () => {
  const workflow = normalizeWorkflow({
    steps: [
      step(),
      step({ id: 'step-2', title: '   ', type: 'backend' }),
      step({ id: 'step-3', title: 'Bad type', type: 'script' }),
      step({ id: 'Not Valid', title: 'Bad id', type: 'input' }),
      step({ id: 'step-4', title: '<script>alert(1)</script>', type: 'frontend' }),
      step({ id: 'step-5', title: 'Kept', type: 'output' }),
    ],
  });

  assert.deepEqual(
    workflow.steps.map((entry) => entry.id),
    ['step-1', 'step-5'],
  );
});

test('normalizeWorkflow returns null when fewer than two usable steps survive', () => {
  assert.equal(normalizeWorkflow(null), null);
  assert.equal(normalizeWorkflow({ steps: [] }), null);
  assert.equal(normalizeWorkflow({ steps: [step()] }), null);
  assert.equal(
    normalizeWorkflow({
      steps: [step(), step({ id: 'step-2', title: '', type: 'output' })],
    }),
    null,
  );
});

test('normalizeWorkflow rejects duplicate ids and more than ten steps', () => {
  assert.equal(
    normalizeWorkflow({
      steps: [step(), step({ id: 'step-1', title: 'Duplicate', type: 'output' })],
    }),
    null,
  );

  assert.equal(
    normalizeWorkflow({
      steps: Array.from({ length: 11 }, (_, index) =>
        step({ id: `step-${index + 1}`, title: `Step ${index + 1}`, type: 'process' }),
      ),
    }),
    null,
  );
});

test('describeWorkflow gives a concise reading-order summary', () => {
  const steps = [
    { id: 'a', title: 'First title', description: '', type: 'input' },
    { id: 'b', title: 'Second title', description: '', type: 'output' },
  ];

  assert.equal(
    describeWorkflow(steps),
    'Workflow diagram with 2 steps: First title, then Second title.',
  );
});
