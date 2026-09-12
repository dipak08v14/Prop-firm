# 02 — ARCHITECTURE (FINAL, v2)

Supersedes v1. Every component below is decided, not proposed.

---

## 1. DECISION SUMMARY

| Layer | Decision | Cost |
|-------|----------|------|
| Frontend framework | Next.js 15 (App Router) | ₹0 |
| Styling | Tailwind CSS | ₹0 |
| Charts | TradingView Lightweight Charts | ₹0 |
| Hosting | Vercel Hobby | ₹0 |
| Database | Supabase Postgres | ₹0 |
| Auth | Supabase Auth (email + Google) | ₹0 |
| Live price push | Supabase Realtime Broadcast | ₹0 |
| All 5 price sources | MT5 demo account (single source) | ₹0 |
| Price worker | Python script, your Windows PC | ₹0 |
| Order placement | Next.js API route | ₹0 |
| Risk engine | Inside the Python worker | ₹0 |
| Email | Resend | ₹0 |
| Error tracking | Sentry | ₹0 |
| Uptime alerts | UptimeRobot + Telegram bot | ₹0 |
| Version control | GitHub | ₹0 |
| Domain | Vercel subdomain until launch | ₹0 |

**Total: ₹0 through Phase 4.**

---

## 2. REJECTED — AND WHY

Recorded so these don't get re-proposed later.

**Redis / Upstash — dropped.**
Redis solves the problem of multiple separate programs needing the same value fast. We have one program holding the prices in its own memory. Adding Redis means sending the price to a cloud service and pulling it back — slower, and one more thing that can fail.

**Separate cloud price worker — dropped for now.**
Costs ₹450/month and adds a second deployment to maintain. Your PC does the same job for ₹0 during build. Revisit at Phase 5.

**Paid data feed (Twelve Data / Polygon) — deferred.**
₹2,500–7,000/month for data we can get free from an MT5 demo. Only becomes necessary when charging users, because free feeds prohibit redistribution.

**PAXG as gold proxy — rejected.**
Free and simple, but it isn't real gold. Your traders check their broker charts. A price that doesn't match creates disputes we'd never win. MT5 gives the exact number they see.

**Binance WebSocket for crypto — rejected.**
Was proposed on the assumption that users compare crypto against Binance. That was an assumption, not a finding. Running two price sources means two connections, two failure modes, two reconnect handlers, and two symbol-mapping schemes for no confirmed benefit. One source is simpler to build and simpler to keep alive.

Accepted trade-off: broker crypto CFD spreads are wider and more variable than spot exchange prices. Acceptable in a simulation, where consistency matters more than matching any particular venue.

**Own WebSocket server — rejected.**
Would require a public IP or tunnel from your home connection. Supabase Realtime does the same job, free, with no networking exposure.

---

## 3. HOW DATA MOVES

### One Python script on your PC does three jobs:

1. **Reads all five instruments** from MT5 via the `MetaTrader5` package
2. **Broadcasts** all five prices to Supabase Realtime — one batched message every 2 seconds
3. **Runs the risk engine** — because it already has every tick in memory

### Why batched every 2 seconds, not every tick

Supabase free tier allows 2 million Realtime messages per month.

- One message per second = 2.6M/month → **over the limit**
- One message every 2 seconds = 1.3M/month → **fits, with headroom**

One message carries all five prices, not five messages. You confirmed a 1–2 second delay is acceptable, so this costs nothing in user experience and keeps the tier free.

### Flow

```
MT5 ──> Python worker ──> Supabase Realtime ──> Browsers
       (all 5)   │
                 ├──> Supabase: latest_prices (every 2s)
                 ├──> Supabase: candles_1m (every minute)
                 └──> Risk engine: SL/TP, drawdown, targets
```

---

## 4. SPLIT OF RESPONSIBILITY

This is the part that matters most — get it wrong and the platform is manipulable.

### Next.js API routes handle (instant, user-triggered):
- Order validation — account active, size within limits, instrument tradeable
- Market order fill — reads `latest_prices`, fills, writes position
- Manual position close
- SL/TP modification

### Python worker handles (continuous, background):
- SL/TP trigger detection
- Floating P&L on every tick
- Daily drawdown check
- Maximum drawdown check
- Profit target detection
- Breach → liquidate all positions → lock account → write audit record
- Daily reset at 00:00 UTC

### The browser handles:
- Display only

The browser never calculates equity, never decides a fill, never determines a breach. It shows numbers the server sent.

---

## 5. FREE TIER LIMITS — WHERE EACH ONE BREAKS

Verify current numbers before Phase 5; providers change these.

| Service | Free limit | Breaks when |
|---------|-----------|-------------|
| Supabase database | 500 MB | ~2–3 million stored trades |
| Supabase Realtime | 200 concurrent, 2M msgs/month | 200 users online at once |
| Supabase Auth | 50,000 monthly users | Not a near-term concern |
| Supabase project | Pauses after 7 days idle | Only if nobody uses it |
| Vercel bandwidth | 100 GB/month | A few thousand active users |
| Vercel Hobby licence | **Non-commercial only** | The day you charge money |
| Resend | 3,000/month, 100/day | ~100 signups per day |
| Sentry | 5,000 errors/month | Only if something is badly broken |

**The one to watch: Realtime at 200 concurrent connections.** That's your first real ceiling, and hitting it means the free tier worked.

---

## 6. WHAT EMAIL IS FOR

Resend handles all transactional mail. Configure it as Supabase's SMTP provider — Supabase's built-in auth email is rate-limited on free tier and will silently throttle.

| Trigger | Email |
|---------|-------|
| Signup | Verify address |
| Password reset | Reset link |
| Account breached | Which rule, what numbers |
| Evaluation passed | Certificate link |
| Grievance filed | Acknowledgement with ticket ID |
| Grievance resolved | Response — legally required |

No marketing email until there's a checked consent box and an unsubscribe link.

---

## 7. MONITORING

The worker on your PC is the single point of failure. Build the alerting before you need it.

| Check | Tool | Action |
|-------|------|--------|
| Price stale > 30s | Worker self-check | Telegram alert to you |
| MT5 disconnected | Worker self-check | Auto-restart, then alert |
| Website down | UptimeRobot | Email + Telegram |
| Application errors | Sentry | Dashboard |

Telegram bot alerts are free and reach your phone. Set this up in Phase 1, not later.

### Stale-feed behaviour — non-negotiable
When a feed goes stale, the worker must:
1. Stop accepting new orders on that instrument
2. Freeze equity calculation for open positions on it
3. **Never trigger a drawdown breach from a stale price**
4. Show users a clear banner

A user failing an evaluation because of our outage is unfair and unfixable after the fact.

---

## 8. WHAT CHANGES AT PHASE 5

Nothing in the code. These are configuration and billing changes.

| Item | Why | Cost |
|------|-----|------|
| Windows VPS for the worker | Home internet and power aren't reliable enough for live users | ~₹1,000/mo |
| Vercel Pro | Hobby licence forbids commercial use | ~₹1,700/mo |
| Supabase Pro | Realtime and database ceilings | ~₹2,100/mo |
| Domain | Credibility | ~₹1,000/yr |
| Licensed data feed | Free feeds prohibit redistribution to paying users | ~₹2,500–7,000/mo |

**Phase 5 running cost: roughly ₹7,300–11,800/month.**

---

## 9. SECURITY

| Concern | Approach |
|---------|----------|
| Table access | Row Level Security on every table, no exceptions |
| Write access | Users have no INSERT/UPDATE on accounts, positions, trades |
| Service role key | Only in the Python worker and server-side API routes. Never in browser code, never in git |
| Order spam | Per-user rate limit on order submission |
| Multi-accounting | Device fingerprint + IP + duplicate-behaviour detection |
| Audit trail | `account_events` is append-only — no update, no delete, for anyone |

---

## 10. KNOWN RISKS IN THIS DESIGN

| Risk | Reality | Handling |
|------|---------|----------|
| Worker is a single point of failure | Yes | Monitoring + auto-restart + stale-feed protection |
| Demo account expiry | Brokers close idle demos in 30–90 days | Run two demos at two brokers |
| Broker may not list every symbol | BNB confirmed absent at Exness, dropped | Verify symbol list before opening the account |
| Single source = single failure | All 5 die together if MT5 drops | Second broker demo as standby |
| Symbol names vary by broker | `BTCUSD`, `BTCUSD.a`, `Bitcoin` | Already handled — `instruments` table maps names |
| Free feed redistribution terms | Violated once users pay | Licensed feed at Phase 5 |
| 2-second price granularity | Not tick-accurate | Acceptable for simulation; disclose in T&C |
| Supabase Realtime ceiling | 200 concurrent | Upgrade when reached |

---

*Stack finalised. No component changes without updating this file first.*
