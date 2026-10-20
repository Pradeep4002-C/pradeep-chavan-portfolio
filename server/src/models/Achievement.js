import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    year: {
      type: Number,
      required: true,
      min: 1950,
      max: 2100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

achievementSchema.index({ order: 1 });

export const Achievement =
  mongoose.models.Achievement ?? mongoose.model('Achievement', achievementSchema);
