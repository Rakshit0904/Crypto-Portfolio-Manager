import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import TransactionForm from '../components/TransactionForm';
import PortfolioCharts from '../components/PortfolioCharts';
import { Plus, Trash2, Edit2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

export default function DashboardPage() {
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolioId, setActivePortfolioId] = useState('');
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [editingTx, setEditingTx] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async (portfolioId) => {
    if (!portfolioId) return;
    setLoading(true);
    try {
      const [dashRes, txRes] = await Promise.all([
        api.get(`/portfolios/${portfolioId}/dashboard`),
        api.get(`/transactions/portfolio/${portfolioId}`),
      ]);
      setDashboard(dashRes.data);
      setTransactions(txRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/portfolios')
      .then(({ data }) => {
        if (!isMounted) return;
        setPortfolios(data);
        if (data.length > 0) {
          setActivePortfolioId(data[0]._id);
          fetchDashboardData(data[0]._id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchDashboardData]);

  const handlePortfolioChange = (newId) => {
    setActivePortfolioId(newId);
    setEditingTx(null);
    fetchDashboardData(newId);
  };

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;
    const { data } = await api.post('/portfolios', { name: newPortfolioName.trim() });
    setPortfolios([data, ...portfolios]);
    setActivePortfolioId(data._id);
    setNewPortfolioName('');
    setShowNewPortfolio(false);
    fetchDashboardData(data._id);
  };

  const handleDeletePortfolio = async () => {
    if (!window.confirm('Delete this portfolio and all its transactions?')) return;
    await api.delete(`/portfolios/${activePortfolioId}`);
    const remaining = portfolios.filter((p) => p._id !== activePortfolioId);
    setPortfolios(remaining);
    const nextId = remaining[0]?._id || '';
    setActivePortfolioId(nextId);
    if (nextId) {
      fetchDashboardData(nextId);
    } else {
      setDashboard(null);
      setTransactions([]);
    }
  };

  const handleDeleteTx = async (txId) => {
    if (!window.confirm('Delete this transaction? Holdings will recalculate automatically.')) return;
    try {
      await api.delete(`/transactions/${txId}`);
      fetchDashboardData(activePortfolioId);
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete transaction');
    }
  };

  const formatMoney = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Portfolio Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          {portfolios.length > 0 && (
            <select
              value={activePortfolioId}
              onChange={(e) => handlePortfolioChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 font-semibold text-base"
            >
              {portfolios.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowNewPortfolio(!showNewPortfolio)}
            className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New Portfolio</span>
          </button>

          {activePortfolioId && (
            <>
              <button
                onClick={() => fetchDashboardData(activePortfolioId)}
                title="Refresh live values"
                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeletePortfolio}
                title="Delete portfolio"
                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {showNewPortfolio && (
          <form onSubmit={handleCreatePortfolio} className="flex gap-2">
            <input
              type="text"
              placeholder="Portfolio name..."
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="bg-emerald-500 text-slate-950 font-semibold px-4 py-1.5 rounded-lg text-sm"
            >
              Create
            </button>
          </form>
        )}
      </div>

      {!activePortfolioId && !loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-4">You don't have any portfolios yet.</p>
          <button
            onClick={() => setShowNewPortfolio(true)}
            className="bg-emerald-500 text-slate-950 font-semibold px-5 py-2.5 rounded-lg"
          >
            Create Your First Portfolio
          </button>
        </div>
      ) : (
        dashboard && (
          <>
            {/* 4 Computed KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                  Total Portfolio Value
                </p>
                <p className="text-2xl font-bold">{formatMoney(dashboard.totalValue)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Invested: {formatMoney(dashboard.currentCostBasis)}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Today's P&L</p>
                <p
                  className={`text-2xl font-bold ${
                    dashboard.todayPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {dashboard.todayPnL >= 0 ? '+' : ''}
                  {formatMoney(dashboard.todayPnL)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {dashboard.todayPnLPercent >= 0 ? '+' : ''}
                  {dashboard.todayPnLPercent}% vs yesterday
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                  Overall Returns
                </p>
                <p
                  className={`text-2xl font-bold ${
                    dashboard.overallReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {dashboard.overallReturn >= 0 ? '+' : ''}
                  {formatMoney(dashboard.overallReturn)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {dashboard.overallReturnPercent >= 0 ? '+' : ''}
                  {dashboard.overallReturnPercent}% all-time
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Top Performer
                  </p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {dashboard.topPerformer
                      ? `${dashboard.topPerformer.coinSymbol} (${dashboard.topPerformer.unrealizedPnLPercent}%)`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> Worst Performer
                  </p>
                  <p className="text-sm font-semibold text-rose-400">
                    {dashboard.worstPerformer
                      ? `${dashboard.worstPerformer.coinSymbol} (${dashboard.worstPerformer.unrealizedPnLPercent}%)`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Add / Edit Transaction Form */}
            <TransactionForm
              key={editingTx?._id || 'new'}
              portfolioId={activePortfolioId}
              editingTx={editingTx}
              onCancel={editingTx ? () => setEditingTx(null) : null}
              onSuccess={() => {
                setEditingTx(null);
                fetchDashboardData(activePortfolioId);
              }}
            />

            {/* Step 7: Recharts Visualizations */}
            <PortfolioCharts portfolioId={activePortfolioId} dashboard={dashboard} />

            {/* Computed Holdings Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="font-semibold">Computed Holdings (Live)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3">Asset</th>
                      <th className="px-6 py-3">Holdings</th>
                      <th className="px-6 py-3">Avg Buy Price</th>
                      <th className="px-6 py-3">Live Price</th>
                      <th className="px-6 py-3">Current Value</th>
                      <th className="px-6 py-3">Unrealized P&L</th>
                      <th className="px-6 py-3">Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dashboard.holdings.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                          No active holdings. Log a BUY transaction above to begin.
                        </td>
                      </tr>
                    ) : (
                      dashboard.holdings.map((h) => (
                        <tr key={h.coinId} className="hover:bg-slate-800/40">
                          <td className="px-6 py-4 font-semibold">{h.coinSymbol}</td>
                          <td className="px-6 py-4">{h.quantity}</td>
                          <td className="px-6 py-4">{formatMoney(h.avgBuyPrice)}</td>
                          <td className="px-6 py-4">{formatMoney(h.currentPrice)}</td>
                          <td className="px-6 py-4 font-semibold">{formatMoney(h.currentValue)}</td>
                          <td
                            className={`px-6 py-4 font-medium ${
                              h.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {h.unrealizedPnL >= 0 ? '+' : ''}
                            {formatMoney(h.unrealizedPnL)} ({h.unrealizedPnLPercent}%)
                          </td>
                          <td className="px-6 py-4">{h.allocationPercent}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction History Ledger */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="font-semibold">Transaction Ledger</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Coin</th>
                      <th className="px-6 py-3">Quantity</th>
                      <th className="px-6 py-3">Price / Coin</th>
                      <th className="px-6 py-3">Total</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-800/40">
                        <td className="px-6 py-3 text-slate-400">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              tx.type === 'BUY'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-medium">{tx.coinSymbol}</td>
                        <td className="px-6 py-3">{tx.quantity}</td>
                        <td className="px-6 py-3">{formatMoney(tx.pricePerCoin)}</td>
                        <td className="px-6 py-3">
                          {formatMoney(tx.quantity * tx.pricePerCoin)}
                        </td>
                        <td className="px-6 py-3 text-right space-x-2">
                          <button
                            onClick={() => setEditingTx(tx)}
                            className="text-slate-400 hover:text-sky-400"
                          >
                            <Edit2 className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteTx(tx._id)}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}