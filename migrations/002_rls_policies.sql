-- Enable RLS on all 15 tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE latest_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE candles_1m ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- accounts
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
CREATE POLICY "Users can view their own accounts" ON accounts FOR SELECT TO authenticated USING (user_id = auth.uid());

-- positions
DROP POLICY IF EXISTS "Users can view their own positions" ON positions;
CREATE POLICY "Users can view their own positions" ON positions FOR SELECT TO authenticated USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- trades
DROP POLICY IF EXISTS "Users can view their own trades" ON trades;
CREATE POLICY "Users can view their own trades" ON trades FOR SELECT TO authenticated USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- equity_snapshots
DROP POLICY IF EXISTS "Users can view their own equity_snapshots" ON equity_snapshots;
CREATE POLICY "Users can view their own equity_snapshots" ON equity_snapshots FOR SELECT TO authenticated USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- account_events
DROP POLICY IF EXISTS "Users can view their own account_events" ON account_events;
CREATE POLICY "Users can view their own account_events" ON account_events FOR SELECT TO authenticated USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT TO authenticated USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
CREATE POLICY "Users can insert their own orders" ON orders FOR INSERT TO authenticated WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- certificates
DROP POLICY IF EXISTS "Public can view certificates" ON certificates;
CREATE POLICY "Public can view certificates" ON certificates FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Users can view their own certificates" ON certificates;
CREATE POLICY "Users can view their own certificates" ON certificates FOR SELECT TO authenticated USING (user_id = auth.uid());

-- payments
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- grievances
DROP POLICY IF EXISTS "Users can view their own grievances" ON grievances;
CREATE POLICY "Users can view their own grievances" ON grievances FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own grievances" ON grievances;
CREATE POLICY "Users can insert their own grievances" ON grievances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- sessions_log
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions_log;
CREATE POLICY "Users can view their own sessions" ON sessions_log FOR SELECT TO authenticated USING (user_id = auth.uid());

-- instruments
DROP POLICY IF EXISTS "Public can view instruments" ON instruments;
CREATE POLICY "Public can view instruments" ON instruments FOR SELECT USING (true);

-- account_templates
DROP POLICY IF EXISTS "Public can view account_templates" ON account_templates;
CREATE POLICY "Public can view account_templates" ON account_templates FOR SELECT USING (true);

-- latest_prices
DROP POLICY IF EXISTS "Public can view latest_prices" ON latest_prices;
CREATE POLICY "Public can view latest_prices" ON latest_prices FOR SELECT USING (true);

-- candles_1m
DROP POLICY IF EXISTS "Public can view candles_1m" ON candles_1m;
CREATE POLICY "Public can view candles_1m" ON candles_1m FOR SELECT USING (true);
