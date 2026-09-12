INSERT INTO instruments (symbol, broker_symbol, display_name, category, price_precision, is_active, data_source)
VALUES 
  ('BTCUSD', 'BTCUSDm', 'Bitcoin', 'crypto', 2, true, 'mt5'),
  ('ETHUSD', 'ETHUSDm', 'Ethereum', 'crypto', 2, true, 'mt5'),
  ('SOLUSD', 'SOLUSDm', 'Solana', 'crypto', 3, true, 'mt5'),
  ('XRPUSD', 'XRPUSDm', 'Ripple', 'crypto', 5, true, 'mt5'),
  ('XAUUSD', 'XAUUSDm', 'Gold', 'metal', 3, true, 'mt5')
ON CONFLICT (symbol) DO NOTHING;
