ALTER TABLE public.instruments
ADD COLUMN IF NOT EXISTS trades_247 boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_close_utc jsonb;

ALTER TABLE public.latest_prices
ADD COLUMN IF NOT EXISTS market_state text NOT NULL DEFAULT 'open';

-- Update Cryptos
UPDATE public.instruments
SET trades_247 = true, weekly_close_utc = null
WHERE symbol IN ('BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD');

-- Update Gold
UPDATE public.instruments
SET trades_247 = false,
    weekly_close_utc = '{"close_day": 5, "close_time": "21:00", "open_day": 0, "open_time": "22:05"}'::jsonb
WHERE symbol = 'XAUUSD';
