import { useState } from 'react';
import Button from '../components/Button.jsx';
import WorkflowArtwork from '../components/WorkflowArtwork.jsx';
import { ConfirmDialog, fieldErrorClass, hintClass, inputClass, labelClass } from './AdminUi.jsx';
import {
  PROJECT_LIMITS,
  WORKFLOW_STEP_TYPES,
  createWorkflowStep,
  moveWorkflowStep,
  removeWorkflowStep,
} from './projectForm.js';

function StepEditor({ step, index, total, onChange, onRemove, onMove }) {
  const baseId = `project-workflow-step-${step.id}`;

  function update(key, value) {
    onChange(index, { ...step, [key]: value });
  }

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Step {index + 1}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {WORKFLOW_STEP_TYPES.find((item) => item.value === step.type)?.label ?? 'Process'} node
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label={`Move step ${index + 1} up`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line-strong px-3 text-xs font-semibold text-ink transition-ui hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Move up
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label={`Move step ${index + 1} down`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line-strong px-3 text-xs font-semibold text-ink transition-ui hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Move down
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove step ${index + 1}`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-[#e0a9a3] px-3 text-xs font-semibold text-[#8f1d15] transition-ui hover:border-[#8f1d15] hover:bg-[#fdf1f0]"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div>
          <label className={labelClass} htmlFor={`${baseId}-title`}>
            Title
          </label>
          <input
            id={`${baseId}-title`}
            className={inputClass}
            value={step.title}
            maxLength={PROJECT_LIMITS.workflowTitleMax}
            onChange={(event) => update('title', event.target.value)}
            placeholder="e.g. Express API validates the request"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor={`${baseId}-type`}>
            Step type
          </label>
          <select
            id={`${baseId}-type`}
            className={inputClass}
            value={step.type}
            onChange={(event) => update('type', event.target.value)}
          >
            {WORKFLOW_STEP_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor={`${baseId}-description`}>
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id={`${baseId}-description`}
            className={inputClass}
            rows={2}
            maxLength={PROJECT_LIMITS.workflowDescriptionMax}
            value={step.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="A short explanation of what happens at this stage."
          />
        </div>
      </div>
    </li>
  );
}

/**
 * Editor and live preview for the saved workflow. It only edits structured
 * values; the renderer decides the layout, colours, arrows, and glyphs.
 */
export default function WorkflowStepBuilder({ steps, onChange, error }) {
  const [removeTargetId, setRemoveTargetId] = useState(null);
  const atLimit = steps.length >= PROJECT_LIMITS.workflowMaxSteps;
  const removeTarget = steps.find((step) => step.id === removeTargetId) ?? null;

  function updateStep(index, nextStep) {
    onChange(steps.map((step, stepIndex) => (stepIndex === index ? nextStep : step)));
  }

  function addStep() {
    if (!atLimit) {
      onChange([...steps, createWorkflowStep()]);
    }
  }

  function requestRemoveStep(index) {
    const step = steps[index];
    if (!step) {
      return;
    }

    // Removing an untouched row is an ordinary editor action. Removing typed
    // copy is destructive, so it asks first; the project page's route blocker
    // then protects the rest of the draft.
    if (step.title.trim() || step.description.trim()) {
      setRemoveTargetId(step.id);
      return;
    }

    onChange(removeWorkflowStep(steps, index));
  }

  function confirmRemoveStep() {
    const index = steps.findIndex((step) => step.id === removeTargetId);
    setRemoveTargetId(null);
    if (index === -1) {
      return;
    }
    onChange(removeWorkflowStep(steps, index));
  }

  return (
    <div id="project-workflow-section" tabIndex={-1} className="scroll-mt-24 focus:outline-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Workflow steps</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Add the real stages of this project. The public illustration is drawn from these
            steps; it is not generated automatically or inferred from the project name.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStep}
          disabled={atLimit}
          className="shrink-0"
        >
          Add step
        </Button>
      </div>

      <p className={hintClass}>
        {steps.length} of {PROJECT_LIMITS.workflowMaxSteps} steps · at least{' '}
        {PROJECT_LIMITS.workflowMinSteps} required for the workflow illustration
      </p>

      {error ? (
        <p className={`${fieldErrorClass} mt-2`} id="project-workflow-error" role="alert">
          {error}
        </p>
      ) : null}

      {steps.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center">
          <p className="text-sm font-semibold text-ink">No workflow steps yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Add at least two steps to use the workflow illustration. Nothing is filled in for you.
          </p>
          <Button type="button" variant="solid" size="sm" className="mt-4" onClick={addStep}>
            Add the first step
          </Button>
        </div>
      ) : (
        <ol className="mt-4 flex list-none flex-col gap-3">
          {steps.map((step, index) => (
            <StepEditor
              key={step.id}
              step={step}
              index={index}
              total={steps.length}
              onChange={updateStep}
              onRemove={requestRemoveStep}
              onMove={(stepIndex, direction) =>
                onChange(moveWorkflowStep(steps, stepIndex, direction))
              }
            />
          ))}
        </ol>
      )}

      <section className="mt-6 border-t border-line pt-5" aria-labelledby="workflow-preview-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="workflow-preview-title" className="text-sm font-semibold text-ink">
              Live preview
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              This is the same renderer the public project card uses.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted">SVG &amp; CSS only</span>
        </div>

        <div className="mt-3">
          {steps.length > 0 ? (
            <WorkflowArtwork preview workflow={{ steps }} />
          ) : (
            <div className="rounded-2xl border border-dashed border-line-strong bg-sunken/60 p-8 text-center text-sm text-muted">
              Add a step to preview the diagram.
            </div>
          )}
        </div>
      </section>

      {removeTarget ? (
        <ConfirmDialog
          title="Remove this workflow step?"
          message={`“${
            removeTarget.title.trim() || 'Untitled step'
          }” will be removed from this project draft. You can still cancel or discard your changes before saving.`}
          confirmLabel="Remove step"
          busyLabel="Removing…"
          busy={false}
          onCancel={() => setRemoveTargetId(null)}
          onConfirm={confirmRemoveStep}
        />
      ) : null}
    </div>
  );
}
