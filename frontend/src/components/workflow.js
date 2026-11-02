/*
 * Shared, renderer-agnostic workflow metadata. Keeping the controlled type
 * vocabulary and validation here means the public renderer and tests agree on
 * what a valid diagram is without importing any admin code.
 */

export const WORKFLOW_STEP_TYPES = Object.freeze([
  'input',
  'frontend',
  'backend',
  'database',
  'service',
  'process',
  'output',
]);

export const WORKFLOW_STEP_META = Object.freeze({
  input: {
    label: 'Input',
    card: 'border-[#b7cbe6] bg-[#eef5fd] text-[#24466b]',
    badge: 'bg-[#d9e8fa] text-[#24466b]',
    accent: 'bg-[#5d86b5]',
    glyph: 'M6 4h12v16H6z M9 8h6 M9 12h6 M9 16h4',
  },
  frontend: {
    label: 'Frontend',
    card: 'border-[#c9bff0] bg-[#f2effc] text-[#40336d]',
    badge: 'bg-[#e3dcfa] text-[#40336d]',
    accent: 'bg-[#7564c7]',
    glyph: 'M4 5h16v14H4z M4 9h16 M7 12h4 M7 15h7',
  },
  backend: {
    label: 'Backend',
    card: 'border-[#b5d9d2] bg-[#edf8f5] text-[#1d5c55]',
    badge: 'bg-[#d5eee7] text-[#1d5c55]',
    accent: 'bg-[#4f9a8d]',
    glyph: 'M5 6h14v4H5z M5 14h14v4H5z M8 8h.01 M8 16h.01',
  },
  database: {
    label: 'Database',
    card: 'border-[#e2cfa7] bg-[#fbf4e5] text-[#5b4216]',
    badge: 'bg-[#f2e5c9] text-[#5b4216]',
    accent: 'bg-[#b88f3e]',
    glyph: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6 M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6',
  },
  service: {
    label: 'Service',
    card: 'border-[#e4bfca] bg-[#fceff3] text-[#6b273b]',
    badge: 'bg-[#f5dbe3] text-[#6b273b]',
    accent: 'bg-[#b45b76]',
    glyph: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M18.4 5.6l-2.1 2.1 M7.7 16.3l-2.1 2.1 M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  },
  process: {
    label: 'Process',
    card: 'border-[#c8ced3] bg-[#f3f5f6] text-[#364047]',
    badge: 'bg-[#e4e8eb] text-[#364047]',
    accent: 'bg-[#71808b]',
    glyph: 'M4 7h5l2-3h9v16H4z M9 11h6 M9 15h6',
  },
  output: {
    label: 'Output',
    card: 'border-[#b9d9c2] bg-[#eef8f1] text-[#1f6f43]',
    badge: 'bg-[#d9eddf] text-[#1f6f43]',
    accent: 'bg-[#4f9366]',
    glyph: 'M4 12h13 M12 7l5 5-5 5 M20 4v16',
  },
});

const STEP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates and trims API workflow data. Anything unrenderable is dropped
 * rather than guessed, and fewer than two surviving steps means the caller
 * should use the neutral fallback.
 */
export function normalizeWorkflow(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.steps)) {
    return null;
  }

  const seen = new Set();
  const steps = [];

  for (const raw of value.steps) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const type = typeof raw.type === 'string' ? raw.type : '';
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';

    if (
      title.length === 0 ||
      title.length > 120 ||
      !STEP_ID_PATTERN.test(id) ||
      id.length > 64 ||
      seen.has(id) ||
      !WORKFLOW_STEP_TYPES.includes(type)
    ) {
      continue;
    }

    const description = typeof raw.description === 'string' ? raw.description.trim() : '';
    if (description.length > 300 || /[<>]/.test(title) || /[<>]/.test(description)) {
      continue;
    }

    seen.add(id);
    steps.push({ id, title, description, type });
  }

  return steps.length >= 2 && steps.length <= 10 ? { steps } : null;
}

/** One sentence a screen reader can use before the ordered steps. */
export function describeWorkflow(steps) {
  const titles = steps.map((step) => step.title);
  return `Workflow diagram with ${steps.length} steps: ${titles.join(', then ')}.`;
}
