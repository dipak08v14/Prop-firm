-- profiles
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    display_name text,
    phone text,
    country text DEFAULT 'IN',
    age_confirmed boolean,
    age_confirmed_at timestamptz,
    tier text,
    created_at timestamptz DEFAULT now()
);

-- instruments
CREATE TABLE IF NOT EXISTS instruments (
    symbol text PRIMARY KEY,
    broker_symbol text,
    display_name text,
    category text,
    contract_size numeric,
    spread numeric,
    min_quantity numeric,
    max_quantity numeric,
    leverage integer,
    price_precision integer,
    data_source text,
    is_active boolean
);

-- account_templates
CREATE TABLE IF NOT EXISTS account_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    starting_balance numeric,
    profit_target_pct numeric,
    daily_drawdown_pct numeric,
    max_drawdown_pct numeric,
    min_trading_days integer,
    max_days integer,
    price_inr numeric,
    is_active boolean
);

-- accounts
CREATE TABLE IF NOT EXISTS accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    template_id uuid REFERENCES account_templates(id),
    account_number text UNIQUE,
    status text,
    balance numeric,
    equity numeric,
    starting_balance numeric,
    daily_start_equity numeric,
    highest_equity numeric,
    trading_days_count integer,
    started_at timestamptz,
    ended_at timestamptz,
    breach_reason text
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_status ON accounts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- orders
CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(id),
    symbol text REFERENCES instruments(symbol),
    side text,
    order_type text,
    quantity numeric,
    requested_price numeric,
    stop_loss numeric,
    take_profit numeric,
    status text,
    rejection_reason text,
    created_at timestamptz DEFAULT now(),
    filled_at timestamptz
);

-- positions
CREATE TABLE IF NOT EXISTS positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(id),
    order_id uuid REFERENCES orders(id),
    symbol text REFERENCES instruments(symbol),
    side text,
    quantity numeric,
    entry_price numeric,
    stop_loss numeric,
    take_profit numeric,
    opened_at timestamptz DEFAULT now()
);

-- trades
CREATE TABLE IF NOT EXISTS trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(id),
    symbol text REFERENCES instruments(symbol),
    side text,
    quantity numeric,
    entry_price numeric,
    exit_price numeric,
    pnl numeric,
    pnl_pct numeric,
    r_multiple numeric,
    close_reason text,
    session text,
    setup_tag text,
    notes text,
    opened_at timestamptz,
    closed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_account_closed_at ON trades(account_id, closed_at);
CREATE INDEX IF NOT EXISTS idx_trades_account_session ON trades(account_id, session);

-- equity_snapshots
CREATE TABLE IF NOT EXISTS equity_snapshots (
    id bigserial PRIMARY KEY,
    account_id uuid REFERENCES accounts(id),
    equity numeric,
    balance numeric,
    recorded_at timestamptz DEFAULT now()
);

-- account_events
CREATE TABLE IF NOT EXISTS account_events (
    id bigserial PRIMARY KEY,
    account_id uuid REFERENCES accounts(id),
    event_type text,
    detail jsonb,
    recorded_at timestamptz DEFAULT now()
);

-- certificates
CREATE TABLE IF NOT EXISTS certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(id),
    user_id uuid REFERENCES profiles(id),
    certificate_code text UNIQUE,
    template_name text,
    final_return_pct numeric,
    trading_days integer,
    total_trades integer,
    issued_at timestamptz DEFAULT now(),
    is_revoked boolean
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    template_id uuid REFERENCES account_templates(id),
    amount_inr numeric,
    gst_amount numeric,
    razorpay_order_id text,
    razorpay_payment_id text,
    status text,
    invoice_number text,
    created_at timestamptz DEFAULT now()
);

-- grievances
CREATE TABLE IF NOT EXISTS grievances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    category text,
    subject text,
    body text,
    status text,
    response text,
    created_at timestamptz DEFAULT now(),
    resolved_at timestamptz
);

-- sessions_log
CREATE TABLE IF NOT EXISTS sessions_log (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES profiles(id),
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    duration_seconds integer
);

-- latest_prices
CREATE TABLE IF NOT EXISTS latest_prices (
    symbol text PRIMARY KEY,
    bid numeric,
    ask numeric,
    updated_at timestamptz DEFAULT now()
);

-- candles_1m
CREATE TABLE IF NOT EXISTS candles_1m (
    id bigserial PRIMARY KEY,
    symbol text,
    open numeric,
    high numeric,
    low numeric,
    close numeric,
    volume numeric,
    opened_at timestamptz,
    UNIQUE (symbol, opened_at)
);
