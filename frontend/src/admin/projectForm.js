/**
 * Pure project-editor helpers. Keeping validation and payload construction in
 * one plain JavaScript module makes the editor's contract testable without a
 * browser and keeps the server as the final authority.
 */

export const PROJECT_LIMITS = Object.freeze({
  titleMax: 140,
  slugMax: 120,
  categoryMax: 80,
  summaryMax: 300,
  descriptionMax: 2000,
  technologyMax: 40,
  technologiesMax: 30,
  urlMax: 300,
  orderMax: 100000,
  workflowMinSteps: 2,
  workflowMaxSteps: 10,
  workflowIdMax: 64,
  workflowTitleMax: 120,
  workflowDescriptionMax: 300,
});

export const ARTWORK_OPTIONS = Object.freeze([
  { value: 'hostelcare', label: 'HostelCare — workflow illustration' },
  { value: 'aquapredict', label: 'AquaPredict — diagram illustration' },
  { value: 'expense', label: 'Expense tracker — flow illustration' },
  { value: 'workflow', label: 'Workflow diagram — drawn from your steps' },
]);

export const WORKFLOW_STEP_TYPES = Object.freeze([
  { value: 'input', label: 'Input' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'database', label: 'Database' },
  { value: 'service', label: 'Service' },
  { value: 'process', label: 'Process' },
  { value: 'output', label: 'Output' },
]);

const WORKFLOW_TYPE_VALUES = new Set(WORKFLOW_STEP_TYPES.map((item) => item.value));
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let workflowStepSequence = 0;

/**
 * Turns a title into a URL-safe slug that matches the Project model's rule:
 * lowercase words separated by single hyphens.
 */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
}

/** Splits a comma separated technology input into a clean, de-duplicated list. */
export function parseTechnologies(value) {
  const seen = new Set();
  const result = [];

  for (const raw of String(value ?? '').split(',')) {
    const item = raw.trim();
    if (item.length === 0) {
      continue;
    }
    const key = item.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

/** Renders a technology list back into the comma separated input format. */
export function formatTechnologies(items) {
  return Array.isArray(items) ? items.join(', ') : '';
}

/** A unique, schema-compatible id for a workflow step created in the editor. */
export function createWorkflowStepId() {
  workflowStepSequence += 1;
  return `step-${Date.now().toString(36)}-${workflowStepSequence.toString(36)}`;
}

/** Creates one editable workflow step with safe defaults. */
export function createWorkflowStep(type = 'process') {
  return {
    id: createWorkflowStepId(),
    title: '',
    description: '',
    type: WORKFLOW_TYPE_VALUES.has(type) ? type : 'process',
  };
}

/** Copies API workflow data into the editor's flat step shape. */
export function workflowStepsFromProject(workflow) {
  if (!workflow || !Array.isArray(workflow.steps)) {
    return [];
  }

  return workflow.steps
    .filter((step) => step && typeof step === 'object')
    .map((step, index) => ({
      id: typeof step.id === 'string' && step.id.length > 0 ? step.id : `step-imported-${index + 1}`,
      title: typeof step.title === 'string' ? step.title : '',
      description: typeof step.description === 'string' ? step.description : '',
      type: WORKFLOW_TYPE_VALUES.has(step.type) ? step.type : 'process',
    }))
    .slice(0, PROJECT_LIMITS.workflowMaxSteps);
}

/** Returns a reordered copy; the original array is never mutated. */
export function moveWorkflowStep(steps, index, direction) {
  const target = index + direction;
  if (!Array.isArray(steps) || target < 0 || target >= steps.length) {
    return steps;
  }

  const next = steps.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Returns a copy with one step removed. */
export function removeWorkflowStep(steps, index) {
  if (!Array.isArray(steps) || index < 0 || index >= steps.length) {
    return steps;
  }
  return steps.filter((_, stepIndex) => stepIndex !== index);
}

export function emptyProjectValues() {
  return {
    title: '',
    slug: '',
    category: '',
    summary: '',
    description: '',
    technologies: '',
    repoUrl: '',
    demoUrl: '',
    featured: false,
    artwork: ARTWORK_OPTIONS[0].value,
    order: '0',
    published: true,
    workflowSteps: [],
  };
}

export function valuesFromProject(project) {
  return {
    title: project?.title ?? '',
    slug: project?.slug ?? '',
    category: project?.category ?? '',
    summary: project?.summary ?? '',
    description: project?.description ?? '',
    technologies: formatTechnologies(project?.technologies),
    repoUrl: project?.repoUrl ?? '',
    demoUrl: project?.demoUrl ?? '',
    featured: Boolean(project?.featured),
    artwork: ARTWORK_OPTIONS.some((option) => option.value === project?.artwork)
      ? project.artwork
      : ARTWORK_OPTIONS[0].value,
    order: String(project?.order ?? 0),
    published: Boolean(project?.published),
    workflowSteps: workflowStepsFromProject(project?.workflow),
  };
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateWorkflow(steps, requireMinimum = false) {
  if (!Array.isArray(steps)) {
    return 'Add workflow steps to draw the diagram.';
  }
  if (steps.length > PROJECT_LIMITS.workflowMaxSteps) {
    return `Use at most ${PROJECT_LIMITS.workflowMaxSteps} workflow steps.`;
  }
  if (requireMinimum && steps.length < PROJECT_LIMITS.workflowMinSteps) {
    return `Add at least ${PROJECT_LIMITS.workflowMinSteps} workflow steps.`;
  }

  const seen = new Set();
  for (const [index, step] of steps.entries()) {
    const title = String(step.title ?? '').trim();
    const description = String(step.description ?? '').trim();

    if (title.length === 0) {
      return `Step ${index + 1} needs a title.`;
    }
    if (title.length > PROJECT_LIMITS.workflowTitleMax) {
      return `Step ${index + 1} title must be ${PROJECT_LIMITS.workflowTitleMax} characters or fewer.`;
    }
    if (description.length > PROJECT_LIMITS.workflowDescriptionMax) {
      return `Step ${index + 1} description must be ${PROJECT_LIMITS.workflowDescriptionMax} characters or fewer.`;
    }
    if (/[<>]/.test(title) || /[<>]/.test(description)) {
      return 'Workflow text cannot contain HTML or angle brackets.';
    }
    if (!WORKFLOW_TYPE_VALUES.has(step.type)) {
      return `Step ${index + 1} has an unsupported type.`;
    }
    if (typeof step.id !== 'string' || !SLUG_PATTERN.test(step.id) || step.id.length > PROJECT_LIMITS.workflowIdMax) {
      return 'Workflow step ids must use lowercase words separated by hyphens.';
    }
    if (seen.has(step.id)) {
      return 'Workflow step ids must be unique.';
    }
    seen.add(step.id);
  }

  return null;
}

/** Mirrors the server contract for fast feedback; the server stays authoritative. */
export function validateProject(values) {
  const errors = {};
  const title = String(values.title ?? '').trim();
  const slug = String(values.slug ?? '').trim().toLowerCase();
  const technologies = parseTechnologies(values.technologies);

  if (title.length === 0) errors.title = 'Enter a project title.';
  else if (title.length > PROJECT_LIMITS.titleMax) {
    errors.title = `Title must be ${PROJECT_LIMITS.titleMax} characters or fewer.`;
  }

  if (slug.length === 0) errors.slug = 'Enter a slug.';
  else if (slug.length > PROJECT_LIMITS.slugMax) {
    errors.slug = `Slug must be ${PROJECT_LIMITS.slugMax} characters or fewer.`;
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = 'Use lowercase letters, numbers, and single hyphens.';
  }

  if (String(values.category ?? '').trim().length > PROJECT_LIMITS.categoryMax) {
    errors.category = `Category must be ${PROJECT_LIMITS.categoryMax} characters or fewer.`;
  }
  if (String(values.summary ?? '').trim().length > PROJECT_LIMITS.summaryMax) {
    errors.summary = `Summary must be ${PROJECT_LIMITS.summaryMax} characters or fewer.`;
  }
  if (String(values.description ?? '').trim().length > PROJECT_LIMITS.descriptionMax) {
    errors.description = `Description must be ${PROJECT_LIMITS.descriptionMax} characters or fewer.`;
  }

  if (technologies.length === 0) errors.technologies = 'Add at least one technology.';
  else if (technologies.length > PROJECT_LIMITS.technologiesMax) {
    errors.technologies = `Use ${PROJECT_LIMITS.technologiesMax} technologies or fewer.`;
  } else if (technologies.some((item) => item.length > PROJECT_LIMITS.technologyMax)) {
    errors.technologies = `Each technology must be ${PROJECT_LIMITS.technologyMax} characters or fewer.`;
  }

  if (!isHttpUrl(String(values.repoUrl ?? '').trim())) {
    errors.repoUrl = 'Enter a valid http or https repository URL.';
  }

  const demoUrl = String(values.demoUrl ?? '').trim();
  if (demoUrl.length > 0 && !isHttpUrl(demoUrl)) {
    errors.demoUrl = 'Enter a valid http or https demo URL, or leave it blank.';
  }

  const order = Number(values.order);
  if (!Number.isInteger(order) || order < 0 || order > PROJECT_LIMITS.orderMax) {
    errors.order = `Enter a whole number from 0 to ${PROJECT_LIMITS.orderMax}.`;
  }

  if (!ARTWORK_OPTIONS.some((option) => option.value === values.artwork)) {
    errors.artwork = 'Choose a project illustration.';
  }

  const workflowError = validateWorkflow(values.workflowSteps, values.artwork === 'workflow');
  if (workflowError) {
    errors.workflow = workflowError;
  }

  return errors;
}

/** Builds the exact JSON body sent to the authenticated project API. */
export function buildProjectPayload(values) {
  const steps = Array.isArray(values.workflowSteps)
    ? values.workflowSteps.map((step) => ({
        id: String(step.id ?? '').trim(),
        title: String(step.title ?? '').trim(),
        description: String(step.description ?? '').trim(),
        type: step.type,
      }))
    : [];

  return {
    title: String(values.title ?? '').trim(),
    slug: String(values.slug ?? '').trim().toLowerCase(),
    category: String(values.category ?? '').trim(),
    summary: String(values.summary ?? '').trim(),
    description: String(values.description ?? '').trim(),
    technologies: parseTechnologies(values.technologies),
    repoUrl: String(values.repoUrl ?? '').trim(),
    demoUrl: String(values.demoUrl ?? '').trim(),
    featured: Boolean(values.featured),
    artwork: values.artwork,
    // A one-step draft is not a usable workflow; null makes an explicit clear
    // possible while the server still rejects it for artwork="workflow".
    workflow: steps.length >= PROJECT_LIMITS.workflowMinSteps ? { steps } : null,
    order: Number(values.order),
    published: Boolean(values.published),
  };
}
