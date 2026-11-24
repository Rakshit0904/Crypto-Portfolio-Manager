/**
 * Calculates per-coin holdings, average buy price, cost basis,
 * realized P&L, unrealized P&L, and portfolio allocation percentages.
 *
 * @param {Array} transactions - Array of transaction objects ({ type, coinId, coinSymbol, quantity, pricePerCoin, date })
 * @param {Object} livePrices - Map of coinId -> current USD price (e.g., { bitcoin: 65000, ethereum: 3200 })
 * @returns {Array} Array of active holding objects
 */
const calculateHoldings = (transactions, livePrices = {}) => {
  // Sort chronologically so average cost basis stays accurate across buys and sells
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const coinMap = {};

  for (const tx of sortedTx) {
    const id = tx.coinId.toLowerCase();

    if (!coinMap[id]) {
      coinMap[id] = {
        coinId: id,
        coinSymbol: tx.coinSymbol.toUpperCase(),
        quantity: 0,
        costBasis: 0,
        realizedPnL: 0,
      };
    }

    const asset = coinMap[id];

    if (tx.type === 'BUY') {
      asset.quantity += tx.quantity;
      asset.costBasis += tx.quantity * tx.pricePerCoin;
    } else if (tx.type === 'SELL') {
      const avgBuyPrice = asset.quantity > 0 ? asset.costBasis / asset.quantity : 0;
      const costOfSoldUnits = tx.quantity * avgBuyPrice;

      asset.realizedPnL += (tx.pricePerCoin - avgBuyPrice) * tx.quantity;
      asset.costBasis = Math.max(0, asset.costBasis - costOfSoldUnits);
      asset.quantity = Math.max(0, asset.quantity - tx.quantity);

      // Prevent floating-point dust (e.g., 1e-16) from keeping sold-out coins active
      if (asset.quantity < 1e-8) {
        asset.quantity = 0;
        asset.costBasis = 0;
      }
    }
  }

  // Build active holdings with live valuation
  const holdings = Object.values(coinMap)
    .filter((asset) => asset.quantity > 0)
    .map((asset) => {
      const currentPrice = Number(livePrices[asset.coinId] || 0);
      const currentValue = asset.quantity * currentPrice;
      const avgBuyPrice = asset.costBasis / asset.quantity;
      const unrealizedPnL = currentValue - asset.costBasis;
      const unrealizedPnLPercent =
        asset.costBasis > 0 ? (unrealizedPnL / asset.costBasis) * 100 : 0;

      return {
        coinId: asset.coinId,
        coinSymbol: asset.coinSymbol,
        quantity: Number(asset.quantity.toFixed(8)),
        avgBuyPrice: Number(avgBuyPrice.toFixed(2)),
        costBasis: Number(asset.costBasis.toFixed(2)),
        currentPrice: Number(currentPrice.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
        unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
        realizedPnL: Number(asset.realizedPnL.toFixed(2)),
        allocationPercent: 0, // Populated once total portfolio value is summed
      };
    });

  // Calculate portfolio allocation % for each coin (for the Recharts Pie Chart)
  const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

  if (totalPortfolioValue > 0) {
    for (const holding of holdings) {
      holding.allocationPercent = Number(
        ((holding.currentValue / totalPortfolioValue) * 100).toFixed(2)
      );
    }
  }

  // Sort holdings by highest current value first
  return holdings.sort((a, b) => b.currentValue - a.currentValue);
};

/**
 * Computes complete dashboard summary metrics from transactions, live prices,
 * and yesterday's snapshot value.
 *
 * @param {Array} transactions - Portfolio transaction history
 * @param {Object} livePrices - Map of coinId -> current price
 * @param {Number|null} yesterdayValue - Yesterday's snapshot totalValue (null if no snapshot yet)
 * @returns {Object} Full dashboard summary
 */
const calculatePortfolioSummary = (transactions, livePrices = {}, yesterdayValue = null) => {
  const holdings = calculateHoldings(transactions, livePrices);

  // Total capital ever deployed into BUY trades minus capital recovered from SELL trades
  const totalInvested = transactions.reduce((sum, tx) => {
    const tradeAmount = tx.quantity * tx.pricePerCoin;
    return tx.type === 'BUY' ? sum + tradeAmount : sum - tradeAmount;
  }, 0);

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const currentCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);

  // Overall return compares current value against active cost basis (or total net invested)
  const overallReturn = totalValue - currentCostBasis;
  const overallReturnPercent =
    currentCostBasis > 0 ? (overallReturn / currentCostBasis) * 100 : 0;

  // Today's P&L compares current live value against yesterday's snapshot
  const hasYesterdaySnapshot = yesterdayValue !== null && yesterdayValue !== undefined;
  const todayPnL = hasYesterdaySnapshot ? totalValue - yesterdayValue : 0;
  const todayPnLPercent =
    hasYesterdaySnapshot && yesterdayValue > 0
      ? (todayPnL / yesterdayValue) * 100
      : 0;

  // Identify Top and Worst performing coins by % gain/loss
  let topPerformer = null;
  let worstPerformer = null;

  if (holdings.length > 0) {
    const sortedByPerformance = [...holdings].sort(
      (a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent
    );
    topPerformer = sortedByPerformance[0];
    worstPerformer = sortedByPerformance[sortedByPerformance.length - 1];
  }

  return {
    totalValue: Number(totalValue.toFixed(2)),
    totalInvested: Number(Math.max(0, totalInvested).toFixed(2)),
    currentCostBasis: Number(currentCostBasis.toFixed(2)),
    overallReturn: Number(overallReturn.toFixed(2)),
    overallReturnPercent: Number(overallReturnPercent.toFixed(2)),
    todayPnL: Number(todayPnL.toFixed(2)),
    todayPnLPercent: Number(todayPnLPercent.toFixed(2)),
    topPerformer,
    worstPerformer,
    holdings,
  };
};

module.exports = {
  calculateHoldings,
  calculatePortfolioSummary,
};