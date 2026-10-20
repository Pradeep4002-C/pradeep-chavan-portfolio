import mongoose from 'mongoose';
import { EMAIL_PATTERN } from '../lib/validators.js';

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, 'must be a valid email address'],
    },
    // Never selected by default; authentication must opt in explicitly.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    lastLoginAt: {
      type: Date,
    },
    failedAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returned) {
        // Administrator security fields never leave the server.
        delete returned.passwordHash;
        delete returned.failedAttempts;
        delete returned.lockedUntil;
        return returned;
      },
    },
  },
);

export const Admin = mongoose.models.Admin ?? mongoose.model('Admin', adminSchema);
