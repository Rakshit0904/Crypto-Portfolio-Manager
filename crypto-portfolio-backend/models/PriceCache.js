const mongoose = require('mongoose');

const priceCacheSchema = new mongoose.Schema(
  {
    coinId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    priceUsd: {
      type: Number,
      required: true,
    },
    change24h: {
      type: Number,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PriceCache', priceCacheSchema);