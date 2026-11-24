const axios = require('axios');
const { takePortfolioSnapshots } = require('../jobs/cronJobs');

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// @desc    Search coins on CoinGecko (returns id, name, symbol, thumb)
// @route   GET /api/market/search?query=bit
// @access  Private
const searchCoins = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const response = await axios.get(`${COINGECKO_BASE_URL}/search`, {
      params: { query: query.trim() },
      timeout: 10000,
    });

    // Return top 10 matching coins formatted cleanly for frontend dropdowns
    const coins = (response.data.coins || []).slice(0, 10).map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      thumb: coin.thumb,
      marketCapRank: coin.market_cap_rank,
    }));

    res.json(coins);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search coins from CoinGecko' });
  }
};

// @desc    Get historical price chart points for a single coin (for Recharts)
// @route   GET /api/market/chart/:coinId?days=7
// @access  Private
const getCoinMarketChart = async (req, res) => {
  try {
    const { coinId } = req.params;
    const days = req.query.days || '7'; // Supports '1', '7', '30', '90', '365'

    const response = await axios.get(
      `${COINGECKO_BASE_URL}/coins/${coinId.toLowerCase()}/market_chart`,
      {
        params: {
          vs_currency: 'usd',
          days,
        },
        timeout: 10000,
      }
    );

    // Format [timestamp, price] pairs into Recharts-ready objects
    const formattedPrices = (response.data.prices || []).map(([timestamp, price]) => ({
      timestamp,
      date: new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(days === '1' ? { hour: '2-digit', minute: '2-digit' } : {}),
      }),
      price: Number(price.toFixed(price < 1 ? 6 : 2)),
    }));

    res.json({
      coinId: coinId.toLowerCase(),
      days,
      prices: formattedPrices,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch historical chart data from CoinGecko' });
  }
};

// @desc    Manually trigger a daily snapshot (handy for testing charts right away)
// @route   POST /api/market/trigger-snapshot
// @access  Private
const triggerManualSnapshot = async (req, res) => {
  await takePortfolioSnapshots();
  res.json({ message: 'Portfolio snapshots captured successfully' });
};

module.exports = {
  searchCoins,
  getCoinMarketChart,
  triggerManualSnapshot,
};