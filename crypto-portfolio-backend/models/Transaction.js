const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    portfolio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      required: [true, 'Transaction must belong to a portfolio'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['BUY', 'SELL'],
        message: 'Transaction type must be either BUY or SELL',
      },
      required: [true, 'Transaction type is required'],
    },
    coinId: {
      type: String,
      required: [true, 'CoinGecko Coin ID is required'],
      lowercase: true,
      trim: true,
    },
    coinSymbol: {
      type: String,
      required: [true, 'Coin symbol is required'],
      uppercase: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.00000001, 'Quantity must be greater than zero'],
    },
    pricePerCoin: {
      type: Number,
      required: [true, 'Price per coin is required'],
      min: [0, 'Price per coin cannot be negative'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ portfolio: 1, coinId: 1 });
transactionSchema.index({ portfolio: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);