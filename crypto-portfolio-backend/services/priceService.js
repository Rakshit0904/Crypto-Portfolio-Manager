const axios = require('axios');
const Transaction = require('../models/Transaction');

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// In-memory cache storing { coinId: usdPrice }
let priceCache = {};
let lastUpdated = null;

/**
 * Fetches live USD prices for all distinct coins present in the Transaction ledger
 * (plus baseline majors) and updates the in-memory priceCache.
 */
const refreshLivePrices = async () => {
  try {
    // Get every unique coinId across all portfolios
    const activeCoinIds = await Transaction.distinct('coinId');

    // Always include a few baseline coins so cache is never empty on fresh installs
    const baselineCoins = ['bitcoin', 'ethereum', 'solana'];
    const allCoins = [...new Set([...baselineCoins, ...activeCoinIds])];

    if (allCoins.length === 0) return priceCache;

    const idsParam = allCoins.join(',');
    const response = await axios.get(`${COINGECKO_BASE_URL}/simple/price`, {
      params: {
        ids: idsParam,
        vs_currencies: 'usd',
      },
      timeout: 10000,
    });

    // Update cache cleanly (preserving stale prices if a single coin omits data)
    for (const [coinId, priceObj] of Object.entries(response.data)) {
      if (priceObj && typeof priceObj.usd === 'number') {
        priceCache[coinId.toLowerCase()] = priceObj.usd;
      }
    }

    lastUpdated = new Date();
    console.log(
      `[PriceCache] Updated ${Object.keys(priceCache).length} coins at ${lastUpdated.toLocaleTimeString()}`
    );

    return priceCache;
  } catch (error) {
    console.error(`[PriceCache Error] Failed to fetch from CoinGecko: ${error.message}`);
    return priceCache; // Gracefully fall back to last known cached prices
  }
};

/**
 * Returns cached prices immediately; if a newly added coin isn't in cache yet,
 * triggers a targeted fetch so new transactions show live prices immediately.
 */
const getLivePrices = async (requiredCoinIds = []) => {
  const missingCoins = requiredCoinIds.filter(
    (id) => priceCache[id.toLowerCase()] === undefined
  );

  if (Object.keys(priceCache).length === 0 || missingCoins.length > 0) {
    await refreshLivePrices();
  }

  return {
    prices: priceCache,
    lastUpdated,
  };
};

module.exports = {
  refreshLivePrices,
  getLivePrices,
};