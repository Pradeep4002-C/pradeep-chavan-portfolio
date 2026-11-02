import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PROJECT_LIMITS,
  buildProjectPayload,
  createWorkflowStep,
  emptyProjectValues,
  formatTechnologies,
  moveWorkflowStep,
  parseTechnologies,
  removeWorkflowStep,
  slugify,
  validateProject,
  valuesFromProject,
  workflowStepsFromProject,
} from '../src/admin/projectForm.js';

function validValues(overrides = {}) {
  return {
    ...emptyProjectValues(),
    title: 'Workflow project',
    slug: 'workflow-project',
    technologies: 'React, Express, MongoDB',
    repoUrl: 'https://github.com/example/project',
    artwork: 'workflow',
    workflowSteps: [
      { id: 'step-1', title: 'Input', description: '', type: 'input' },
      { id: 'step-2', title: 'Output', description: '', type: 'output' },
    ],
    ...overrides,
  };
}

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

test('project validation mirrors the server and requires a real workflow', () => {
  assert.deepEqual(validateProject(validValues()), {});

  const oneStep = validateProject(validValues({ workflowSteps: validValues().workflowSteps.slice(0, 1) }));
  assert.match(oneStep.workflow, /at least 2/);

  const missingTitle = validateProject(
    validValues({
      workflowSteps: [
        { id: 'step-1', title: '   ', type: 'input' },
        { id: 'step-2', title: 'Output', type: 'output' },
      ],
    }),
  );
  assert.match(missingTitle.workflow, /Step 1 needs a title/);

  const markup = validateProject(
    validValues({
      workflowSteps: [
        { id: 'step-1', title: '<script>alert(1)</script>', type: 'input' },
        { id: 'step-2', title: 'Output', type: 'output' },
      ],
    }),
  );
  assert.match(markup.workflow, /angle brackets/);

  const duplicate = validateProject(
    validValues({
      workflowSteps: [
        { id: 'step-1', title: 'One', type: 'input' },
        { id: 'step-1', title: 'Two', type: 'output' },
      ],
    }),
  );
  assert.match(duplicate.workflow, /unique/);

  const tooMany = validateProject(
    validValues({
      workflowSteps: Array.from({ length: 11 }, (_, index) => ({
        id: `step-${index + 1}`,
        title: `Step ${index + 1}`,
        type: 'process',
      })),
    }),
  );
  assert.match(tooMany.workflow, /at most 10/);
});

test('project validation catches the ordinary field errors too', () => {
  const errors = validateProject(
    validValues({
      title: '',
      slug: 'Not A Slug',
      technologies: '',
      repoUrl: 'ftp://example.com/project',
      order: '-1',
    }),
  );

  assert.ok(errors.title);
  assert.ok(errors.slug);
  assert.ok(errors.technologies);
  assert.ok(errors.repoUrl);
  assert.ok(errors.order);
});

test('a single workflow draft is allowed for non-workflow artwork but not sent as a workflow', () => {
  const values = validValues({
    artwork: 'hostelcare',
    workflowSteps: [{ id: 'step-1', title: 'Only step', type: 'process' }],
  });

  assert.equal(validateProject(values).workflow, undefined);
  assert.equal(buildProjectPayload(values).workflow, null);
});

test('buildProjectPayload trims fields and preserves a valid workflow order', () => {
  const payload = buildProjectPayload(
    validValues({
      category: '  Web app  ',
      summary: '  Summary  ',
      description: '  Description  ',
      technologies: 'React, React, Express',
      workflowSteps: [
        { id: 'step-1', title: ' First ', description: ' First description ', type: 'input' },
        { id: 'step-2', title: ' Second ', description: '', type: 'output' },
      ],
    }),
  );

  assert.equal(payload.category, 'Web app');
  assert.equal(payload.summary, 'Summary');
  assert.deepEqual(payload.technologies, ['React', 'Express']);
  assert.deepEqual(payload.workflow.steps, [
    { id: 'step-1', title: 'First', description: 'First description', type: 'input' },
    { id: 'step-2', title: 'Second', description: '', type: 'output' },
  ]);
});

test('valuesFromProject loads saved workflow data and falls back safely', () => {
  const values = valuesFromProject({
    title: 'Saved',
    artwork: 'workflow',
    workflow: {
      steps: [
        { id: 'step-a', title: 'Saved one', description: 'One', type: 'frontend' },
        { id: 'step-b', title: 'Saved two', description: '', type: 'database' },
      ],
    },
  });

  assert.equal(values.title, 'Saved');
  assert.equal(values.workflowSteps.length, 2);
  assert.equal(values.workflowSteps[1].type, 'database');

  assert.deepEqual(workflowStepsFromProject(null), []);
  assert.equal(valuesFromProject({ artwork: 'not-real' }).artwork, 'hostelcare');
});

test('workflow step helpers create safe ids and do not mutate their input', () => {
  const first = createWorkflowStep('frontend');
  const second = createWorkflowStep('not-a-type');
  assert.match(first.id, /^step-[a-z0-9]+-[a-z0-9]+$/);
  assert.equal(first.id.length <= PROJECT_LIMITS.workflowIdMax, true);
  assert.notEqual(first.id, second.id);
  assert.equal(second.type, 'process');

  const steps = [
    { id: 'step-1', title: 'One', type: 'input' },
    { id: 'step-2', title: 'Two', type: 'output' },
    { id: 'step-3', title: 'Three', type: 'process' },
  ];
  const moved = moveWorkflowStep(steps, 1, -1);
  assert.deepEqual(moved.map((step) => step.id), ['step-2', 'step-1', 'step-3']);
  assert.deepEqual(steps.map((step) => step.id), ['step-1', 'step-2', 'step-3']);
  assert.deepEqual(removeWorkflowStep(steps, 1).map((step) => step.id), ['step-1', 'step-3']);
});
