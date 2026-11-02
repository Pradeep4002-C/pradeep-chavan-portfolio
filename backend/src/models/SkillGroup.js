import mongoose from 'mongoose';

const skillGroupSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 60,
    },
    items: {
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
        message: 'at least one skill is required',
      },
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

skillGroupSchema.index({ order: 1 });

export const SkillGroup =
  mongoose.models.SkillGroup ?? mongoose.model('SkillGroup', skillGroupSchema);
