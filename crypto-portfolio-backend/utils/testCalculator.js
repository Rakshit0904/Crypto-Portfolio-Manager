const { calculatePortfolioSummary } = require('./portfolioCalculator');

// Sample transaction history
const sampleTransactions = [
  {
    type: 'BUY',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    quantity: 0.5,
    pricePerCoin: 50000, // $25,000
    date: '2026-01-10T10:00:00Z',
  },
  {
    type: 'BUY',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    quantity: 0.5,
    pricePerCoin: 60000, // $30,000 -> Avg buy price becomes $55,000 for 1.0 BTC
    date: '2026-02-15T10:00:00Z',
  },
  {
    type: 'SELL',
    coinId: 'bitcoin',
    coinSymbol: 'BTC',
    quantity: 0.2,
    pricePerCoin: 65000, // Sold 0.2 BTC -> Remaining: 0.8 BTC @ $55,000 avg ($44,000 cost basis)
    date: '2026-03-01T10:00:00Z',
  },
  {
    type: 'BUY',
    coinId: 'ethereum',
    coinSymbol: 'ETH',
    quantity: 5,
    pricePerCoin: 3000, // $15,000 cost basis
    date: '2026-02-20T10:00:00Z',
  },
  {
    type: 'BUY',
    coinId: 'solana',
    coinSymbol: 'SOL',
    quantity: 40,
    pricePerCoin: 150, // $6,000 cost basis
    date: '2026-03-05T10:00:00Z',
  },
];

// Simulated live market prices from CoinGecko
const mockLivePrices = {
  bitcoin: 70000,   // +27.27% from $55,000 avg
  ethereum: 2700,   // -10.00% from $3,000 avg
  solana: 210,      // +40.00% from $150 avg (Top performer!)
};

// Simulated yesterday snapshot value
const mockYesterdaySnapshot = 75500;

const result = calculatePortfolioSummary(
  sampleTransactions,
  mockLivePrices,
  mockYesterdaySnapshot
);

console.log('=== PORTFOLIO DASHBOARD SUMMARY ===');
console.dir(result, { depth: null });