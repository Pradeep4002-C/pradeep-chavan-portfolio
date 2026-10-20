import mongoose from 'mongoose';
import { EMAIL_PATTERN, isOptionalHttpUrl } from '../lib/validators.js';

/**
 * Singleton portfolio profile. The immutable, unique `key` guarantees at the
 * database level that only one profile document can ever exist, even if two
 * seed or admin processes race.
 */
const profileSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'profile',
      immutable: true,
      unique: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    intro: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    bio: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 2000,
        },
      ],
      default: [],
      validate: {
        validator: (paragraphs) => paragraphs.length <= 20,
        message: 'bio cannot contain more than 20 paragraphs',
      },
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, 'must be a valid email address'],
    },
    location: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    github: {
      type: String,
      trim: true,
      maxlength: 300,
      validate: { validator: isOptionalHttpUrl, message: 'must be a valid http(s) URL' },
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: 300,
      validate: { validator: isOptionalHttpUrl, message: 'must be a valid http(s) URL' },
    },
    leetcode: {
      type: String,
      trim: true,
      maxlength: 300,
      validate: { validator: isOptionalHttpUrl, message: 'must be a valid http(s) URL' },
    },
    resumePath: {
      type: String,
      trim: true,
      maxlength: 200,
      default: 'resume.pdf',
    },
  },
  { timestamps: true },
);

export const Profile = mongoose.models.Profile ?? mongoose.model('Profile', profileSchema);
