import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, X } from 'lucide-react';

export default function TransactionForm({ portfolioId, editingTx, onSuccess, onCancel }) {
  const [type, setType] = useState(editingTx?.type || 'BUY');
  const [searchQuery, setSearchQuery] = useState(
    editingTx ? `${editingTx.coinSymbol} (${editingTx.coinId})` : ''
  );
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(
    editingTx
      ? { id: editingTx.coinId, symbol: editingTx.coinSymbol, name: editingTx.coinId }
      : null
  );
  const [quantity, setQuantity] = useState(editingTx?.quantity ?? '');
  const [pricePerCoin, setPricePerCoin] = useState(editingTx?.pricePerCoin ?? '');
  const [date, setDate] = useState(
    editingTx
      ? new Date(editingTx.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Debounced CoinGecko search via backend proxy (only sets state in async callback)
  useEffect(() => {
    if (selectedCoin || searchQuery.trim().length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/market/search?query=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCoin]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSelectedCoin(null);
    if (val.trim().length < 2) {
      setSearchResults([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedCoin) {
      return setError('Please search and select a valid coin from the dropdown.');
    }

    setSubmitting(true);
    try {
      const payload = {
        portfolioId,
        type,
        coinId: selectedCoin.id,
        coinSymbol: selectedCoin.symbol,
        quantity: Number(quantity),
        pricePerCoin: Number(pricePerCoin),
        date,
      };

      if (editingTx) {
        await api.put(`/transactions/${editingTx._id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {editingTx ? 'Edit Transaction' : 'Log New Transaction'}
        </h3>
        {onCancel && (
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/40 text-rose-400 px-4 py-2 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>

        <div className="md:col-span-2 relative">
          <label className="block text-xs text-slate-400 mb-1">Coin (Search CoinGecko)</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Bitcoin, Solana..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {searchResults.length > 0 && (
            <ul className="absolute z-20 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 max-h-52 overflow-y-auto shadow-xl">
              {searchResults.map((coin) => (
                <li
                  key={coin.id}
                  onClick={() => {
                    setSelectedCoin(coin);
                    setSearchQuery(`${coin.name} (${coin.symbol})`);
                    setSearchResults([]);
                  }}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer text-sm"
                >
                  <img src={coin.thumb} alt={coin.symbol} className="w-5 h-5 rounded-full" />
                  <span className="font-medium">{coin.name}</span>
                  <span className="text-slate-400 text-xs">{coin.symbol}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Quantity</label>
          <input
            type="number"
            step="any"
            required
            placeholder="0.5"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Price / Coin ($)</label>
          <input
            type="number"
            step="any"
            required
            placeholder="60000"
            value={pricePerCoin}
            onChange={(e) => setPricePerCoin(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm self-end transition disabled:opacity-50"
          >
            {submitting ? '...' : editingTx ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}