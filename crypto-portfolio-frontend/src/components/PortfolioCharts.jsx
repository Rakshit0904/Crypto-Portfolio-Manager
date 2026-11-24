import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../api/axios';

const ALLOCATION_COLORS = [
  '#10b981',
  '#38bdf8',
  '#f59e0b',
  '#a855f7',
  '#f43f5e',
  '#14b8a6',
];

const FALLBACK_COINS = [
  { coinId: 'bitcoin', coinSymbol: 'BTC' },
  { coinId: 'ethereum', coinSymbol: 'ETH' },
  { coinId: 'solana', coinSymbol: 'SOL' },
];

export default function PortfolioCharts({ portfolioId, dashboard }) {
  const totalValue = dashboard?.totalValue;
  const holdings = dashboard?.holdings;

  const [snapshots, setSnapshots] = useState([]);
  const [selectedCoinId, setSelectedCoinId] = useState('bitcoin');
  const [coinHistory, setCoinHistory] = useState([]);
  const [days, setDays] = useState(30);
  const [loadedChartKey, setLoadedChartKey] = useState('');

  const coinOptions = useMemo(() => {
    if (holdings && holdings.length > 0) {
      return holdings.map((h) => ({
        coinId: h.coinId,
        coinSymbol: h.coinSymbol,
      }));
    }
    return FALLBACK_COINS;
  }, [holdings]);

  const activeCoinId = useMemo(() => {
    if (coinOptions.length === 0) return 'bitcoin';
    return coinOptions.some((c) => c.coinId === selectedCoinId)
      ? selectedCoinId
      : coinOptions[0].coinId;
  }, [coinOptions, selectedCoinId]);

  const chartQueryKey = `${activeCoinId}-${days}`;
  const loadingChart = Boolean(activeCoinId) && loadedChartKey !== chartQueryKey;

  useEffect(() => {
    if (!portfolioId) return;
    let active = true;

    api
      .get(`/portfolios/${portfolioId}/snapshots`)
      .then(({ data }) => {
        if (!active) return;
        const formatted = (Array.isArray(data) ? data : []).map((snap) => ({
          dateLabel: new Date(snap.date || snap.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          value: Number(snap.totalValue ?? snap.value ?? 0),
        }));
        setSnapshots(formatted);
      })
      .catch(() => {
        if (active) setSnapshots([]);
      });

    return () => {
      active = false;
    };
  }, [portfolioId, totalValue]);

  useEffect(() => {
    if (!activeCoinId) return;
    let active = true;

    api
      .get(`/market/chart/${activeCoinId}`, { params: { days } })
      .then(({ data }) => {
        if (!active) return;
        const points = Array.isArray(data?.prices)
          ? data.prices
          : Array.isArray(data)
            ? data
            : [];
        const formatted = points.map((item) => {
          const timestamp = Array.isArray(item) ? item[0] : item.timestamp || item.date;
          const price = Array.isArray(item) ? item[1] : item.price;
          return {
            dateLabel: new Date(timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            price: Number(price || 0),
          };
        });
        setCoinHistory(formatted);
        setLoadedChartKey(chartQueryKey);
      })
      .catch(() => {
        if (active) {
          setCoinHistory([]);
          setLoadedChartKey(chartQueryKey);
        }
      });

    return () => {
      active = false;
    };
  }, [activeCoinId, days, chartQueryKey]);

  const valueSeries = useMemo(() => {
    const base = [...snapshots];
    if (typeof totalValue === 'number') {
      const todayLabel = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const last = base[base.length - 1];
      if (!last || last.dateLabel !== todayLabel) {
        base.push({ dateLabel: todayLabel, value: Number(totalValue) });
      } else {
        base[base.length - 1] = { ...last, value: Number(totalValue) };
      }
    }
    return base;
  }, [snapshots, totalValue]);

  const allocationData = useMemo(() => {
    return (holdings || [])
      .filter((h) => Number(h.currentValue) > 0)
      .map((h) => ({
        name: h.coinSymbol,
        value: Number(h.currentValue),
        allocationPercent: Number(h.allocationPercent || 0),
      }));
  }, [holdings]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: val < 1 ? 4 : 2,
    }).format(Number(val || 0));

  return (
    <div className="space-y-6 mb-8">
      {/* Row 1: Portfolio Value Line/Area Chart + Asset Allocation Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Portfolio Value Over Time */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base">Portfolio Value Over Time</h3>
              <p className="text-xs text-slate-400">Daily snapshots + live valuation</p>
            </div>
          </div>

          {valueSeries.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-500">
              No valuation history available yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={valueSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="dateLabel" stroke="#64748b" fontSize={12} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                    }}
                    formatter={(val) => [formatCurrency(val), 'Portfolio Value']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#portfolioFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 2. Asset Allocation Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-base">Asset Allocation</h3>
            <p className="text-xs text-slate-400">Share by live holding value</p>
          </div>

          {allocationData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-500">
              Add holdings to view allocation.
            </div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={3}
                    >
                      {allocationData.map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                      formatter={(val, name) => [formatCurrency(val), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 space-y-1.5">
                {allocationData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300 font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{
                          backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length],
                        }}
                      />
                      {item.name}
                    </span>
                    <span className="text-slate-400">{item.allocationPercent}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Coin Historical Price Trend */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-base">Coin Historical Trend</h3>
            <p className="text-xs text-slate-400">Market price history via CoinGecko</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={activeCoinId}
              onChange={(e) => setSelectedCoinId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
            >
              {coinOptions.map((coin) => (
                <option key={coin.coinId} value={coin.coinId}>
                  {coin.coinSymbol} ({coin.coinId})
                </option>
              ))}
            </select>

            <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    days === d
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingChart ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">
            Loading price history...
          </div>
        ) : coinHistory.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-500">
            No historical chart data available for this coin.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={coinHistory} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="dateLabel" stroke="#64748b" fontSize={12} />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="#64748b"
                  fontSize={12}
                  tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                  width={85}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                  formatter={(val) => [formatCurrency(val), 'Price']}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}