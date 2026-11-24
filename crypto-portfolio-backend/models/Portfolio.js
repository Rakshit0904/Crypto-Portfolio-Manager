const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Portfolio must belong to a user'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Portfolio name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

portfolioSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);