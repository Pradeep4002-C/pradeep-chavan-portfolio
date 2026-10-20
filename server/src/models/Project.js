import mongoose from 'mongoose';
import { isHttpUrl, isOptionalHttpUrl } from '../lib/validators.js';

// These three keys are the illustration renderers that actually exist in
// frontend/src/components/ProjectArtwork.jsx.
export const ARTWORK_KEYS = ['hostelcare', 'aquapredict', 'expense'];

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

// Public listing query: published projects in display order.
projectSchema.index({ published: 1, order: 1 });

export const Project = mongoose.models.Project ?? mongoose.model('Project', projectSchema);
