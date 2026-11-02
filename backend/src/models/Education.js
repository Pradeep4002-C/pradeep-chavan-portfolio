import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
  {
    institution: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    qualification: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    field: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    startYear: {
      type: Number,
      min: 1950,
      max: 2100,
    },
    endYear: {
      type: Number,
      min: 1950,
      max: 2100,
      validate: {
        validator(value) {
          return value == null || this.startYear == null || value >= this.startYear;
        },
        message: 'endYear cannot be earlier than startYear',
      },
    },
    score: {
      type: String,
      trim: true,
      maxlength: 60,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

educationSchema.index({ order: 1 });

export const Education =
  mongoose.models.Education ?? mongoose.model('Education', educationSchema);
