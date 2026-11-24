const axios = require('axios');
const PriceCache = require('../models/PriceCache');

const DEFAULT_COINS = [
  'bitcoin',
  'ethereum',
  'solana',
  'binancecoin',
  'cardano',
  'ripple',
  'dogecoin',
  'polkadot',
  'chainlink',
  'litecoin',
];

const refreshLivePrices = async (coinIds = DEFAULT_COINS, vsCurrencies = 'usd') => {
  try {
    const idsParam = Array.isArray(coinIds) ? coinIds.join(',') : coinIds;
    const url = 'https://api.coingecko.com/api/v3/simple/price';

    const headers = {};
    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }

    const { data } = await axios.get(url, {
      params: {
        ids: idsParam,
        vs_currencies: vsCurrencies,
        include_24hr_change: true,
      },
      headers,
      timeout: 10000,
    });

    const now = new Date();
    const ops = Object.entries(data).map(([coinId, marketData]) => ({
      updateOne: {
        filter: { coinId },
        update: {
          $set: {
            coinId,
            priceUsd: marketData.usd,
            change24h: marketData.usd_24h_change ?? 0,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await PriceCache.bulkWrite(ops);
    }

    return data;
  } catch (error) {
    const status = error.response?.status;
    console.warn(
      `[PriceCache Warning] CoinGecko refresh skipped (${status || error.message}). Using cached prices.`
    );
    return null;
  }
};

const getLivePrices = async () => {
  const cachedDocs = await PriceCache.find({});
  const prices = {};

  for (const doc of cachedDocs) {
    prices[doc.coinId] = {
      usd: doc.priceUsd,
      usd_24h_change: doc.change24h ?? 0,
      updatedAt: doc.updatedAt,
    };
  }

  return { prices, raw: cachedDocs };
};

module.exports = {
  refreshLivePrices,
  getLivePrices,
};