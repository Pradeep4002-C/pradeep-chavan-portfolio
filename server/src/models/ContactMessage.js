import mongoose from 'mongoose';
import { EMAIL_PATTERN } from '../lib/validators.js';

/**
 * Contact messages are private: they are never included in public portfolio
 * data and have no public read route. Only the admin API will read them.
 */
const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, 'must be a valid email address'],
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    read: {
      type: Boolean,
      default: false,
    },
    // Optional, non-reversible metadata for abuse handling.
    meta: {
      ipHash: {
        type: String,
        trim: true,
        maxlength: 128,
      },
    },
  },
  { timestamps: true },
);

// Inbox order and unread filtering.
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ read: 1, createdAt: -1 });

export const ContactMessage =
  mongoose.models.ContactMessage ?? mongoose.model('ContactMessage', contactMessageSchema);
