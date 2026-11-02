import { useId } from 'react';
import {
  WORKFLOW_STEP_META,
  WORKFLOW_STEP_TYPES,
  describeWorkflow,
  normalizeWorkflow,
} from './workflow.js';

/* Data-driven workflow illustration.
 *
 * The administrator supplies only step titles, optional descriptions, and a
 * semantic type. This component draws the nodes, arrows, and type treatments.
 * It renders as a semantic ordered list, so a screen reader reads the same
 * order a sighted visitor follows from top to bottom. No administrator text is
 * ever interpreted as HTML, SVG, CSS, or a URL. */

function StepGlyph({ type }) {
  const meta = WORKFLOW_STEP_META[type] ?? WORKFLOW_STEP_META.process;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d={meta.glyph} />
    </svg>
  );
}

function FlowArrow() {
  return (
    <div aria-hidden="true" className="flex justify-center py-1.5 text-[#a9aaa1]">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M12 4v16" />
        <path d="m6 14 6 6 6-6" />
      </svg>
    </div>
  );
}

function previewSteps(workflow) {
  if (!workflow || !Array.isArray(workflow.steps)) {
    return [];
  }

  return workflow.steps.slice(0, 10).map((step, index) => ({
    id: typeof step?.id === 'string' && step.id.length > 0 ? step.id : `preview-${index + 1}`,
    title:
      typeof step?.title === 'string' && step.title.trim().length > 0
        ? step.title.trim()
        : 'Untitled step',
    description: typeof step?.description === 'string' ? step.description.trim() : '',
    type: WORKFLOW_STEP_TYPES.includes(step?.type) ? step.type : 'process',
  }));
}

/**
 * @param {object|null} workflow Saved `{ steps }` data.
 * @param {boolean} preview True while the administrator is editing; incomplete
 *   drafts are shown with honest placeholders instead of being hidden.
 */
export default function WorkflowArtwork({ workflow, preview = false, className = '' }) {
  const labelId = useId();
  const steps = preview ? previewSteps(workflow) : normalizeWorkflow(workflow)?.steps ?? [];

  if (steps.length === 0) {
    return <NeutralProjectArtwork className={className} />;
  }

  return (
    <figure
      className={`relative isolate overflow-hidden rounded-2xl border border-line bg-[#fbfaf6] p-4 sm:p-5 ${className}`}
      aria-labelledby={labelId}
    >
      <figcaption
        id={labelId}
        className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3"
      >
        <span className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-subtle">
          <span aria-hidden="true" className="size-2 rounded-[2px] bg-accent" />
          Project workflow
        </span>
        <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[0.65rem] font-semibold text-muted">
          {steps.length} {steps.length === 1 ? 'step' : 'steps'}
        </span>
      </figcaption>

      <p className="sr-only">{describeWorkflow(steps)}</p>

      <ol className="mt-3 flex list-none flex-col">
        {steps.map((step, index) => {
          const meta = WORKFLOW_STEP_META[step.type] ?? WORKFLOW_STEP_META.process;

          return (
            <li key={`${step.id}-${index}`} className="min-w-0">
              {index > 0 ? <FlowArrow /> : null}

              <div
                className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 sm:p-3.5 ${meta.card}`}
              >
                <span
                  className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${meta.badge}`}
                >
                  <StepGlyph type={step.type} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] opacity-75">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </div>

                  <p className="mt-1 break-words text-[0.88rem] font-semibold leading-snug">
                    {step.title}
                  </p>

                  {step.description ? (
                    <p className="mt-1 break-words text-[0.72rem] leading-relaxed opacity-80">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-16 -z-10 size-48 rounded-full border border-line/70"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-28 -z-10 size-32 rounded-full border border-line/70"
      />
    </figure>
  );
}

/**
 * Neutral, deliberately non-narrative fallback. It never invents steps for a
 * project and never borrows another project's illustration.
 */
export function NeutralProjectArtwork({ className = '' }) {
  return (
    <div
      className={`relative isolate flex min-h-[180px] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-[#f1f0eb] p-4 text-[#4f514b] sm:p-5 ${className}`}
      role="img"
      aria-label="Neutral project illustration: an abstract stack of interface layers"
    >
      <div className="flex items-center justify-between gap-2 text-[0.6rem] font-bold uppercase tracking-[0.11em] text-[#66675f]">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-[7px] rounded-[2px] bg-current" /> Project
        </span>
        <span>Illustration</span>
      </div>

      <div aria-hidden="true" className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-xl border border-[#d4d4cc] bg-white/70 p-3">
          <span className="block h-2 w-2/3 rounded-full bg-[#c7c7bf]" />
          <span className="mt-2 block h-2 w-1/2 rounded-full bg-[#dedfd7]" />
          <span className="mt-2 block h-2 w-3/4 rounded-full bg-[#dedfd7]" />
        </div>
        <span className="size-2 rounded-full bg-[#a9aaa1]" />
        <div className="rounded-xl border border-[#d4d4cc] bg-white/70 p-3">
          <span className="block h-2 w-1/2 rounded-full bg-[#c7c7bf]" />
          <span className="mt-2 block h-2 w-3/4 rounded-full bg-[#dedfd7]" />
          <span className="mt-2 block h-2 w-2/3 rounded-full bg-[#dedfd7]" />
        </div>
      </div>

      <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#66675f]">
        Project details
      </p>
    </div>
  );
}
