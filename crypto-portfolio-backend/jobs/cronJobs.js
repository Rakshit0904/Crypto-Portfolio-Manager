const cron = require('node-cron');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const PortfolioSnapshot = require('../models/PortfolioSnapshot');
const { refreshLivePrices, getLivePrices } = require('../services/priceService');
const { calculatePortfolioSummary } = require('../utils/portfolioCalculator');

/**
 * Computes current value for every portfolio and saves a daily PortfolioSnapshot.
 * Upserts for today's UTC date so running it multiple times won't create duplicate daily points.
 */
const takePortfolioSnapshots = async () => {
  try {
    console.log('[SnapshotJob] Capturing daily portfolio snapshots...');
    const { prices } = await getLivePrices();
    const portfolios = await Portfolio.find({});

    // Normalize snapshotDate to start of current UTC day (00:00:00.000)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    for (const portfolio of portfolios) {
      const transactions = await Transaction.find({ portfolio: portfolio._id });
      const summary = calculatePortfolioSummary(transactions, prices);

      await PortfolioSnapshot.findOneAndUpdate(
        {
          portfolio: portfolio._id,
          snapshotDate: todayStart,
        },
        {
          portfolio: portfolio._id,
          totalValue: summary.totalValue,
          totalInvested: summary.totalInvested,
          snapshotDate: todayStart,
        },
        { upsert: true, new: true }
      );
    }

    console.log(`[SnapshotJob] Saved snapshots for ${portfolios.length} portfolios.`);
  } catch (error) {
    console.error(`[SnapshotJob Error] ${error.message}`);
  }
};

/**
 * Initializes all background cron schedules when the server starts.
 */
const startCronJobs = () => {
  // 1. Fetch initial prices immediately on server boot
  refreshLivePrices();

  // 2. Refresh live market prices every 45 seconds
  cron.schedule('*/45 * * * * *', async () => {
    await refreshLivePrices();
  });

  // 3. Take daily portfolio value snapshots every day at 00:00 UTC
  cron.schedule('0 0 * * *', async () => {
    await takePortfolioSnapshots();
  });

  console.log('[Cron] Background jobs initialized (45s price cache + daily snapshots).');
};

module.exports = {
  startCronJobs,
  takePortfolioSnapshots,
};