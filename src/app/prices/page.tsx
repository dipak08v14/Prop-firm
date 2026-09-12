"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type PriceRow = {
  symbol: string;
  bid: number;
  ask: number;
  updated_at: string;
  market_state?: 'open' | 'stale' | 'closed';
};

export default function PricesPage() {
  const [prices, setPrices] = useState<Record<string, PriceRow>>({});
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const supabase = createClient();

    // 1. Fetch initial state
    const fetchInitial = async () => {
      const { data, error } = await supabase.from('latest_prices').select('*');
      if (data && !error) {
        const initialMap: Record<string, PriceRow> = {};
        data.forEach(row => {
          initialMap[row.symbol] = row;
        });
        setPrices(initialMap);
      }
    };
    fetchInitial();

    // 2. Subscribe to realtime broadcast
    const channel = supabase.channel('prices');

    channel
      .on('broadcast', { event: 'tick' }, (payload) => {
        const newPrices: Record<string, PriceRow> = {};
        payload.payload.prices.forEach((row: PriceRow) => {
          newPrices[row.symbol] = row;
        });
        setPrices(prev => ({ ...prev, ...newPrices }));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setStatus('connected');
        if (status === 'CLOSED') setStatus('disconnected');
        if (status === 'CHANNEL_ERROR') setStatus('disconnected');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Live Prices</h1>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium text-gray-600 capitalize">{status}</span>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
              <th className="p-4">Symbol</th>
              <th className="p-4 text-right">Bid</th>
              <th className="p-4 text-right">Ask</th>
              <th className="p-4 text-right">Last Update</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Object.values(prices).sort((a, b) => a.symbol.localeCompare(b.symbol)).map((price) => (
              <tr key={price.symbol} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{price.symbol}</td>
                <td className="p-4 text-right font-mono">{price.bid}</td>
                <td className="p-4 text-right font-mono">{price.ask}</td>
                <td className="p-4 text-right text-gray-500 text-sm">
                  {new Date(price.updated_at).toLocaleTimeString([], { hour12: false })}
                </td>
                <td className="p-4 text-center">
                  {price.market_state === 'stale' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Stale — check feed
                    </span>
                  ) : price.market_state === 'closed' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Market closed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {Object.keys(prices).length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Loading prices...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
