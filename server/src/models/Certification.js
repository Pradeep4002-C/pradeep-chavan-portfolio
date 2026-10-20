import mongoose from 'mongoose';
import { isOptionalHttpUrl } from '../lib/validators.js';

const certificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    issuer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    year: {
      type: Number,
      required: true,
      min: 1950,
      max: 2100,
    },
    url: {
      type: String,
      trim: true,
      maxlength: 300,
      validate: { validator: isOptionalHttpUrl, message: 'must be a valid http(s) URL' },
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

certificationSchema.index({ order: 1 });

export const Certification =
  mongoose.models.Certification ?? mongoose.model('Certification', certificationSchema);
