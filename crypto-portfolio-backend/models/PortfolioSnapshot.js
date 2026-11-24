const mongoose = require('mongoose');

const portfolioSnapshotSchema = new mongoose.Schema(
  {
    portfolio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      required: [true, 'Snapshot must belong to a portfolio'],
      index: true,
    },
    totalValue: {
      type: Number,
      required: [true, 'Total value is required'],
      min: [0, 'Total value cannot be negative'],
    },
    totalInvested: {
      type: Number,
      required: [true, 'Total invested is required'],
      min: [0, 'Total invested cannot be negative'],
    },
    snapshotDate: {
      type: Date,
      required: [true, 'Snapshot date is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

portfolioSnapshotSchema.index({ portfolio: 1, snapshotDate: -1 });

module.exports = mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);