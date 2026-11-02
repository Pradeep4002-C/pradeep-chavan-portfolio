import mongoose from 'mongoose';
import { isHttpUrl, isOptionalHttpUrl } from '../lib/validators.js';

// These keys mirror the renderers in frontend/src/components/ProjectArtwork.jsx.
// The first three are purpose-built illustrations; `workflow` is drawn from the
// administrator-supplied workflow data below.
export const ARTWORK_KEYS = ['hostelcare', 'aquapredict', 'expense', 'workflow'];

// A controlled vocabulary keeps the renderer data-driven. Administrators choose
// a semantic role for a step, never a colour, SVG path, or HTML fragment.
export const WORKFLOW_STEP_TYPES = Object.freeze([
  'input',
  'frontend',
  'backend',
  'database',
  'service',
  'process',
  'output',
]);

export const WORKFLOW_LIMITS = Object.freeze({
  minSteps: 2,
  maxSteps: 10,
  idMax: 64,
  titleMax: 120,
  descriptionMax: 300,
});

const STEP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const containsMarkup = (value) => /[<>]/.test(value);

const workflowStepSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      maxlength: WORKFLOW_LIMITS.idMax,
      match: [STEP_ID_PATTERN, 'must be lowercase words separated by hyphens'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: WORKFLOW_LIMITS.titleMax,
      validate: {
        validator: (value) => !containsMarkup(value),
        message: 'cannot contain HTML or angle brackets',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: WORKFLOW_LIMITS.descriptionMax,
      default: '',
      validate: {
        validator: (value) => !containsMarkup(value),
        message: 'cannot contain HTML or angle brackets',
      },
    },
    type: {
      type: String,
      required: true,
      enum: {
        values: WORKFLOW_STEP_TYPES,
        message: 'must be a supported workflow step type',
      },
    },
  },
  { _id: false },
);

const workflowSchema = new mongoose.Schema(
  {
    steps: {
      type: [workflowStepSchema],
      default: undefined,
      validate: [
        {
          validator: (steps) =>
            Array.isArray(steps) &&
            steps.length >= WORKFLOW_LIMITS.minSteps &&
            steps.length <= WORKFLOW_LIMITS.maxSteps,
          message: `must contain ${WORKFLOW_LIMITS.minSteps}-${WORKFLOW_LIMITS.maxSteps} steps`,
        },
        {
          validator: (steps) =>
            !Array.isArray(steps) || new Set(steps.map((step) => step.id)).size === steps.length,
          message: 'step ids must be unique',
        },
      ],
    },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase words separated by hyphens'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    technologies: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 40,
        },
      ],
      default: [],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'at least one technology is required',
      },
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
      validate: { validator: isHttpUrl, message: 'must be a valid http(s) URL' },
    },
    demoUrl: {
      type: String,
      trim: true,
      maxlength: 300,
      validate: { validator: isOptionalHttpUrl, message: 'must be a valid http(s) URL' },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    artwork: {
      type: String,
      required: true,
      enum: {
        values: ARTWORK_KEYS,
        message: 'must be one of the existing illustration keys',
      },
    },
    // Optional for the three legacy illustrations. A project whose artwork is
    // `workflow` is required to carry at least two valid steps by the validator
    // below, so the public renderer never has to invent a diagram.
    workflow: {
      type: workflowSchema,
      default: undefined,
    },
    order: {
      type: Number,
      default: 0,
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Cross-field rule for direct model writes. The API validates the same rule
// before writing, and the update route re-checks it against the stored document.
projectSchema.pre('validate', function workflowArtworkRequired() {
  if (
    this.artwork === 'workflow' &&
    (!Array.isArray(this.workflow?.steps) ||
      this.workflow.steps.length < WORKFLOW_LIMITS.minSteps)
  ) {
    this.invalidate(
      'workflow',
      `A workflow illustration needs at least ${WORKFLOW_LIMITS.minSteps} steps.`,
    );
  }
});

// Public listing query: published projects in display order.
projectSchema.index({ published: 1, order: 1 });

export const Project = mongoose.models.Project ?? mongoose.model('Project', projectSchema);
