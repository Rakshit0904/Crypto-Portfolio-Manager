const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const PortfolioSnapshot = require('../models/PortfolioSnapshot');
const { getLivePrices } = require('../services/priceService');
const { calculatePortfolioSummary } = require('../utils/portfolioCalculator');

// @desc    Create a new portfolio
// @route   POST /api/portfolios
// @access  Private
const createPortfolio = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Portfolio name is required' });
    }

    const portfolio = await Portfolio.create({
      user: req.user._id,
      name,
      description,
    });

    res.status(201).json(portfolio);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You already have a portfolio with this name' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all portfolios for the logged-in user
// @route   GET /api/portfolios
// @access  Private
const getPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single portfolio by ID
// @route   GET /api/portfolios/:id
// @access  Private
const getPortfolioById = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update portfolio name or description
// @route   PUT /api/portfolios/:id
// @access  Private
const updatePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    portfolio.name = req.body.name || portfolio.name;
    if (req.body.description !== undefined) {
      portfolio.description = req.body.description;
    }

    const updatedPortfolio = await portfolio.save();
    res.json(updatedPortfolio);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You already have a portfolio with this name' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a portfolio and all its transactions & snapshots
// @route   DELETE /api/portfolios/:id
// @access  Private
const deletePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    await Transaction.deleteMany({ portfolio: portfolio._id });
    await PortfolioSnapshot.deleteMany({ portfolio: portfolio._id });
    await portfolio.deleteOne();

    res.json({ message: 'Portfolio and all associated records deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get computed dashboard metrics for a portfolio
// @route   GET /api/portfolios/:id/dashboard
// @access  Private
const getPortfolioDashboard = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const transactions = await Transaction.find({ portfolio: portfolio._id });
    const coinIds = [...new Set(transactions.map((tx) => tx.coinId))];

    const { prices, lastUpdated } = await getLivePrices(coinIds);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const yesterdaySnapshot = await PortfolioSnapshot.findOne({
      portfolio: portfolio._id,
      snapshotDate: { $lt: todayStart },
    }).sort({ snapshotDate: -1 });

    const yesterdayValue = yesterdaySnapshot ? yesterdaySnapshot.totalValue : null;

    const summary = calculatePortfolioSummary(transactions, prices, yesterdayValue);

    res.json({
      portfolio,
      lastPriceUpdate: lastUpdated,
      ...summary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get historical daily snapshots for Recharts portfolio growth chart
// @route   GET /api/portfolios/:id/snapshots
// @access  Private
const getPortfolioSnapshots = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const snapshots = await PortfolioSnapshot.find({ portfolio: portfolio._id })
      .sort({ snapshotDate: 1 })
      .select('snapshotDate totalValue totalInvested -_id');

    res.json(snapshots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPortfolio,
  getPortfolios,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  getPortfolioDashboard,
  getPortfolioSnapshots,
};