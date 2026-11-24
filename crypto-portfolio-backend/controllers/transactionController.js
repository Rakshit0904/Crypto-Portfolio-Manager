const Transaction = require('../models/Transaction');
const Portfolio = require('../models/Portfolio');

// Helper: Calculate current held quantity for a specific coin in a portfolio
const getCurrentCoinQuantity = async (portfolioId, coinId, excludeTxId = null) => {
  const query = { portfolio: portfolioId, coinId: coinId.toLowerCase() };
  if (excludeTxId) {
    query._id = { $ne: excludeTxId };
  }

  const transactions = await Transaction.find(query);
  return transactions.reduce((total, tx) => {
    return tx.type === 'BUY' ? total + tx.quantity : total - tx.quantity;
  }, 0);
};

// @desc    Add a BUY or SELL transaction to a portfolio
// @route   POST /api/transactions
// @access  Private
const addTransaction = async (req, res) => {
  try {
    const { portfolioId, type, coinId, coinSymbol, quantity, pricePerCoin, date } = req.body;

    if (!portfolioId || !type || !coinId || !coinSymbol || !quantity || pricePerCoin === undefined) {
      return res.status(400).json({ message: 'Please provide all required transaction fields' });
    }

    // Verify portfolio exists and belongs to the logged-in user
    const portfolio = await Portfolio.findOne({ _id: portfolioId, user: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const normalizedType = type.toUpperCase();
    const numQty = Number(quantity);

    // Prevent overselling coins not owned
    if (normalizedType === 'SELL') {
      const currentHeld = await getCurrentCoinQuantity(portfolioId, coinId);
      if (numQty > currentHeld) {
        return res.status(400).json({
          message: `Insufficient balance: you only hold ${currentHeld} ${coinSymbol.toUpperCase()}`,
        });
      }
    }

    const transaction = await Transaction.create({
      portfolio: portfolioId,
      user: req.user._id,
      type: normalizedType,
      coinId,
      coinSymbol,
      quantity: numQty,
      pricePerCoin: Number(pricePerCoin),
      date: date || Date.now(),
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all transactions for a specific portfolio (optional ?coinId= filter)
// @route   GET /api/transactions/portfolio/:portfolioId
// @access  Private
const getPortfolioTransactions = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { coinId } = req.query;

    const portfolio = await Portfolio.findOne({ _id: portfolioId, user: req.user._id });
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const filter = { portfolio: portfolioId, user: req.user._id };
    if (coinId) {
      filter.coinId = coinId.toLowerCase();
    }

    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an existing transaction (how holdings are edited)
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const updatedType = req.body.type ? req.body.type.toUpperCase() : transaction.type;
    const updatedCoinId = req.body.coinId ? req.body.coinId.toLowerCase() : transaction.coinId;
    const updatedQty = req.body.quantity !== undefined ? Number(req.body.quantity) : transaction.quantity;

    // Re-validate balance excluding the current transaction before updating
    if (updatedType === 'SELL') {
      const heldWithoutThisTx = await getCurrentCoinQuantity(
        transaction.portfolio,
        updatedCoinId,
        transaction._id
      );
      if (updatedQty > heldWithoutThisTx) {
        return res.status(400).json({
          message: `Insufficient balance for this edit: available balance is ${heldWithoutThisTx}`,
        });
      }
    }

    transaction.type = updatedType;
    transaction.coinId = updatedCoinId;
    transaction.coinSymbol = req.body.coinSymbol || transaction.coinSymbol;
    transaction.quantity = updatedQty;
    transaction.pricePerCoin =
      req.body.pricePerCoin !== undefined ? Number(req.body.pricePerCoin) : transaction.pricePerCoin;
    transaction.date = req.body.date || transaction.date;

    const updatedTransaction = await transaction.save();
    res.json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a transaction (how holdings are removed)
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // If deleting a BUY transaction, ensure remaining BUYs still cover existing SELLs
    if (transaction.type === 'BUY') {
      const remainingBalance = await getCurrentCoinQuantity(
        transaction.portfolio,
        transaction.coinId,
        transaction._id
      );
      if (remainingBalance < 0) {
        return res.status(400).json({
          message: 'Cannot delete this BUY transaction because subsequent SELL transactions depend on it',
        });
      }
    }

    await transaction.deleteOne();
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addTransaction,
  getPortfolioTransactions,
  updateTransaction,
  deleteTransaction,
};