# 03 — DATABASE SCHEMA

Postgres via Supabase. All tables have Row Level Security enabled.
All timestamps are `timestamptz`, stored in UTC.
All money and price values are `numeric`, never `float`.

---

## profiles
Extends Supabase `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | FK → auth.users.id |
| display_name | text | |
| phone | text | |
| country | text | default 'IN' |
| age_confirmed | boolean | 18+ confirmation, legally required |
| age_confirmed_at | timestamptz | |
| tier | text | `free` / `evaluation` / `pro` |
| created_at | timestamptz | |

---

## instruments
Config-driven. Never hardcode instrument behaviour in application code.

| Column | Type | Notes |
|--------|------|-------|
| symbol | text PK | Our internal name: `BTCUSD`, `XAUUSD` |
| broker_symbol | text | Broker's name for it: `BTCUSD.a`, `Bitcoin`. Maps our name to theirs |
| display_name | text | |
| category | text | `crypto` / `metal` |
| contract_size | numeric | |
| spread | numeric | In price units |
| min_quantity | numeric | |
| max_quantity | numeric | |
| leverage | integer | |
| price_precision | integer | |
| data_source | text | `mt5` |
| is_active | boolean | |

`broker_symbol` is what makes switching brokers a config change instead of a code change. Every broker names instruments differently.

---

## account_templates
Defines each evaluation ruleset. Adding a new account size = new row, no code change.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | "Evaluation $25K" |
| starting_balance | numeric | Simulated units |
| profit_target_pct | numeric | e.g. 8.00 |
| daily_drawdown_pct | numeric | e.g. 5.00 |
| max_drawdown_pct | numeric | e.g. 10.00 |
| min_trading_days | integer | |
| max_days | integer | null = unlimited |
| price_inr | numeric | 0 for free tier |
| is_active | boolean | |

---

## accounts
One row per simulated account issued to a user.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK → profiles.id |
| template_id | uuid | FK → account_templates.id |
| account_number | text UNIQUE | Human-readable |
| status | text | `active` / `passed` / `breached` / `expired` |
| balance | numeric | Closed-trade balance |
| equity | numeric | balance + floating P&L |
| starting_balance | numeric | Copied from template at creation |
| daily_start_equity | numeric | Reset 00:00 UTC |
| highest_equity | numeric | For trailing logic if added later |
| trading_days_count | integer | |
| started_at | timestamptz | |
| ended_at | timestamptz | |
| breach_reason | text | null unless breached |

**Index:** `(user_id, status)`, `(status)` for the risk engine sweep.

---

## orders

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| account_id | uuid | FK → accounts.id |
| symbol | text | FK → instruments.symbol |
| side | text | `buy` / `sell` |
| order_type | text | `market` / `limit` / `stop` |
| quantity | numeric | |
| requested_price | numeric | null for market |
| stop_loss | numeric | nullable |
| take_profit | numeric | nullable |
| status | text | `pending` / `filled` / `cancelled` / `rejected` |
| rejection_reason | text | |
| created_at | timestamptz | |
| filled_at | timestamptz | |

---

## positions
Open positions only. Closed positions move to `trades`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| account_id | uuid | |
| order_id | uuid | |
| symbol | text | |
| side | text | |
| quantity | numeric | |
| entry_price | numeric | |
| stop_loss | numeric | |
| take_profit | numeric | |
| opened_at | timestamptz | |

---

## trades
Closed trades. This is the analytics source of truth. Append-only.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| account_id | uuid | |
| symbol | text | |
| side | text | |
| quantity | numeric | |
| entry_price | numeric | |
| exit_price | numeric | |
| pnl | numeric | |
| pnl_pct | numeric | |
| r_multiple | numeric | Computed if SL was set |
| close_reason | text | `manual` / `stop_loss` / `take_profit` / `breach_liquidation` |
| session | text | `asia` / `london` / `newyork` — computed on insert |
| setup_tag | text | User-supplied, nullable |
| notes | text | User-supplied, nullable |
| opened_at | timestamptz | |
| closed_at | timestamptz | |

**Index:** `(account_id, closed_at)`, `(account_id, session)`

---

## equity_snapshots
For equity curve rendering. Written every 5 minutes per active account.

| Column | Type |
|--------|------|
| id | bigserial PK |
| account_id | uuid |
| equity | numeric |
| balance | numeric |
| recorded_at | timestamptz |

Partition or prune older than 12 months.

---

## account_events
**Append-only audit log. Never UPDATE. Never DELETE.**

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial PK | |
| account_id | uuid | |
| event_type | text | `created` / `rule_breach` / `target_reached` / `daily_reset` / `passed` |
| detail | jsonb | Exact values that triggered the event |
| recorded_at | timestamptz | |

This table is what makes a certificate defensible. If challenged, this is the evidence.

---

## certificates

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| account_id | uuid | |
| user_id | uuid | |
| certificate_code | text UNIQUE | Public verification URL slug |
| template_name | text | Snapshot at issue time |
| final_return_pct | numeric | |
| trading_days | integer | |
| total_trades | integer | |
| issued_at | timestamptz | |
| is_revoked | boolean | For confirmed manipulation |

Public verification page: `/verify/[certificate_code]` — no auth required.

---

## payments

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| template_id | uuid | |
| amount_inr | numeric | |
| gst_amount | numeric | |
| razorpay_order_id | text | |
| razorpay_payment_id | text | |
| status | text | `created` / `paid` / `failed` / `refunded` |
| invoice_number | text | |
| created_at | timestamptz | |

**Naming note:** there is no `payouts` table and never will be. See `01-COMPLIANCE-RULES.md`.

---

## grievances
Legally required under the 2026 Rules.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| category | text | |
| subject | text | |
| body | text | |
| status | text | `open` / `in_progress` / `resolved` |
| response | text | |
| created_at | timestamptz | |
| resolved_at | timestamptz | SLA measured against this |

---

## sessions_log
For legally required session time limits.

| Column | Type |
|--------|------|
| id | bigserial PK |
| user_id | uuid |
| started_at | timestamptz |
| ended_at | timestamptz |
| duration_seconds | integer |

---

## RLS POLICY SUMMARY

| Table | Policy |
|-------|--------|
| profiles | User reads/writes own row only |
| accounts | User reads own rows; **writes via service role only** |
| orders | User inserts own; updates via service role only |
| positions, trades, equity_snapshots | User reads own; service role writes |
| account_events | User reads own; service role writes; no update/delete for anyone |
| certificates | Public read by `certificate_code`; owner reads own list |
| payments | User reads own; service role writes |
| instruments, account_templates | Public read; admin write |

**Critical:** users must never have INSERT or UPDATE rights on `accounts`, `positions`, or `trades`. All mutations go through server-side code holding the service role key. This is what enforces the architecture rule in `02-ARCHITECTURE.md`.
