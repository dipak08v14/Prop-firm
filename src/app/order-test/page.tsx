"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Position {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_pct: number;
  session: string;
}

export default function OrderTestPage() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [symbol, setSymbol] = useState('BTCUSD');
  const [side, setSide] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const fetchData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch account details
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (accounts && accounts.length > 0) {
      setAccountId(accounts[0].id);
      setBalance(accounts[0].balance);
      
      const accId = accounts[0].id;

      // Fetch positions
      const { data: posData } = await supabase
        .from('positions')
        .select('*')
        .eq('account_id', accId);
      
      if (posData) {
        setPositions(posData);
      }

      // Fetch trades
      const { data: tradeData } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', accId)
        .order('closed_at', { ascending: false });

      if (tradeData) {
        setTrades(tradeData);
      }
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createTestAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-account', { method: 'POST' });
      const data = await res.json();
      if (data.account_id) {
        fetchData(); // Refresh all
      }
      setResponse(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setResponse({ error: 'No active test account' });
      return;
    }
    
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch('/api/orders/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          symbol,
          side,
          quantity: quantity
        })
      });
      const data = await res.json();
      setResponse(data);
      fetchData(); // Refresh positions and balance
    } catch (err) {
      console.error(err);
      setResponse({ error: 'Failed to submit' });
    } finally {
      setLoading(false);
    }
  };

  const closePosition = async (positionId: string) => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch('/api/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_id: positionId })
      });
      const data = await res.json();
      setResponse(data);
      fetchData(); // Refresh everything
    } catch (err) {
      console.error(err);
      setResponse({ error: 'Failed to close position' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Market Order Test</h1>
      
      <div className="bg-white text-black p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">1. Account Setup</h2>
        {accountId ? (
          <div className="flex justify-between items-center">
            <div className="text-green-600 font-medium">Active Account: {accountId}</div>
            <div className="text-lg font-bold">Balance: ${Number(balance).toFixed(2)}</div>
          </div>
        ) : (
          <button 
            onClick={createTestAccount} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Test Account
          </button>
        )}
      </div>

      <div className="bg-white text-black p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">2. Place Market Order</h2>
        <form onSubmit={submitOrder} className="flex gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Symbol</label>
            <select 
              value={symbol} 
              onChange={e => setSymbol(e.target.value)}
              className="block w-full rounded border-gray-300 shadow-sm p-2 border"
            >
              <option value="BTCUSD">BTCUSD</option>
              <option value="ETHUSD">ETHUSD</option>
              <option value="SOLUSD">SOLUSD</option>
              <option value="XRPUSD">XRPUSD</option>
              <option value="XAUUSD">XAUUSD</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium">Side</label>
            <select 
              value={side} 
              onChange={e => setSide(e.target.value)}
              className="block w-full rounded border-gray-300 shadow-sm p-2 border"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Quantity</label>
            <input 
              type="number"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="block w-full rounded border-gray-300 shadow-sm p-2 border"
              placeholder="e.g. 0.1"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={!accountId || loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 h-[42px]"
          >
            Submit Order
          </button>
        </form>
      </div>

      <div className="bg-white text-black p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">3. JSON Response</h2>
        <pre className="bg-gray-100 text-black p-4 rounded overflow-auto text-sm">
          {response ? JSON.stringify(response, null, 2) : 'No response yet'}
        </pre>
      </div>

      <div className="bg-white text-black p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">4. Open Positions</h2>
        {positions.length === 0 ? (
          <div className="text-black">No open positions</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Symbol</th>
                <th className="py-2">Side</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Entry Price</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.symbol}</td>
                  <td className="py-2 uppercase">{p.side}</td>
                  <td className="py-2">{p.quantity}</td>
                  <td className="py-2">{p.entry_price}</td>
                  <td className="py-2">
                    <button
                      onClick={() => closePosition(p.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white text-black p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">5. Closed Trades</h2>
        {trades.length === 0 ? (
          <div className="text-black">No closed trades</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Symbol</th>
                <th className="py-2">Side</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Entry</th>
                <th className="py-2">Exit</th>
                <th className="py-2">P&amp;L</th>
                <th className="py-2">P&amp;L %</th>
                <th className="py-2">Session</th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id} className="border-b">
                  <td className="py-2">{t.symbol}</td>
                  <td className="py-2 uppercase">{t.side}</td>
                  <td className="py-2">{t.quantity}</td>
                  <td className="py-2">{Number(t.entry_price).toFixed(5)}</td>
                  <td className="py-2">{Number(t.exit_price).toFixed(5)}</td>
                  <td className={`py-2 font-medium ${t.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Number(t.pnl).toFixed(2)}
                  </td>
                  <td className={`py-2 ${t.pnl_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(t.pnl_pct).toFixed(2)}%
                  </td>
                  <td className="py-2 capitalize">{t.session}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
