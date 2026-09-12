# 05 — ROADMAP AND WORKFLOW

---

## BUILD ORDER

Each step ships and works before the next begins. No parallel half-finished features.

`[ ]` not started · `[~]` partially done · `[x]` done and verified with real proof

### PHASE 0 — Foundation ✅ COMPLETE
- [x] Next.js project on Vercel, Tailwind configured
- [x] Supabase project, all tables from `03-DATABASE-SCHEMA.md` (15 tables)
- [x] RLS policies on every table — **verified**: browser client cannot UPDATE its own account balance
- [~] Auth: email + 18+ confirmation at signup — **Google sign-in NOT built**
- [~] Seed `instruments` (5 rows, done) and `account_templates` (**not seeded** — deferred to Phase 2 when rules are decided)

### PHASE 1 — Price pipeline ⚠️ MOSTLY COMPLETE
- [x] Broker demo account opened at Exness, all 5 symbols confirmed (`m` suffix: BTCUSDm etc.)
- [x] MT5 installed at `C:\Program Files\Five Percent Online MetaTrader 5`, separate from the real-account terminal
- [x] Python worker reading all 5 instruments via the `MetaTrader5` package
- [x] Batched broadcast to Supabase Realtime — one message every 2 seconds, all 5 prices
- [x] `latest_prices` written to Supabase every 2 seconds
- [x] 1-minute candle persistence to Postgres (1000-bar backfill + 60s sync)
- [x] **Extra, not originally planned:** `pg_cron` job pruning candles older than 90 days, daily at 03:00 UTC
- [x] **Extra, not originally planned:** `is_stale` column on `latest_prices` so staleness survives without a broadcast
- [~] Auto-reconnect on MT5 disconnect — **code written but never tested**; no watchdog auto-restart yet
- [ ] Telegram alert if any price goes stale beyond 30 seconds
- [ ] **Market-hours awareness** — gold closes Fri evening to Sun evening. Without this, a 30-second stale alarm fires continuously all weekend. Must know trading hours per instrument before alerting is built.
- [~] Stale-feed handling — `is_stale` flag works and the UI shows "Market closed". Still to build: block orders, freeze equity, never breach on stale data (blocked until orders exist in Phase 2)
- [ ] Second broker demo account opened as standby

### PHASE 2 — Execution engine
- [ ] Market order execution, server-side
- [ ] Limit and stop orders
- [ ] Position open/close
- [ ] SL/TP attachment and trigger
- [ ] Balance and equity calculation
- [ ] Trade record written on close

### PHASE 3 — Risk engine
- [ ] Floating P&L on price update
- [ ] Daily drawdown tracking, 00:00 UTC reset job
- [ ] Maximum drawdown tracking
- [ ] Breach detection → liquidate, lock, audit-log
- [ ] Profit target detection
- [ ] Trading day counting
- [ ] Pass evaluation on all conditions
- [ ] **Verify: no manual override path exists anywhere**

### PHASE 4 — Interface
- [ ] Dashboard
- [ ] Trading screen with chart and order panel
- [ ] Always-visible account stat bar with drawdown warnings
- [ ] Trade history and journal with setup tagging
- [ ] Analytics module
- [ ] Certificate generation and public verification page

### PHASE 5 — Compliance and launch prep
- [ ] Session time limits and counter
- [ ] Fair-play monitoring
- [ ] Grievance system with SLA tracking
- [ ] Legal pages — counsel-reviewed
- [ ] Full copy review against `01-COMPLIANCE-RULES.md` checklist
- [ ] **Free tier public launch**

### PHASE 6 — Monetisation (gated)
Blocked until all four are true:
1. Company incorporated
2. Counsel has reviewed all user-facing copy
3. Determination order received
4. Payment gateway onboarded

- [ ] Razorpay integration
- [ ] Licensed data feed migrated (free/demo feeds prohibit redistribution to paying users)
- [ ] Worker moved from your PC to a Windows VPS
- [ ] Pricing page with adjacent disclosures
- [ ] Checkout with disclosure above pay button
- [ ] GST invoicing
- [ ] Paid tiers live

---

## PARALLEL TRACK — LEGAL

Runs alongside the build, starting now.

| Step | Timing |
|------|--------|
| Find counsel with gaming/tech regulatory experience | Immediate |
| Written opinion on the model | Before Phase 4 |
| Company incorporation | Before Phase 5 |
| Draft legal pages | Before Phase 5 |
| File for determination | At Phase 5 |
| Receive determination order | Before Phase 6 |

**If counsel's opinion contradicts this plan, counsel wins.** Everything in these files is a planning position, not a legal opinion.

---

## WORKFLOW RULES

### One step at a time
One task per prompt to the AI agent. Confirm it works before moving on. Multi-feature prompts produce code that half-works in three places.

### Diagnose before fixing
When something breaks: identify the actual cause first, then fix. Do not stack fixes on an undiagnosed problem — it compounds.

### Clean retry
If a generated implementation is wrong, revert and re-prompt with better context. Do not patch bad output repeatedly.

### Context loading
Before any build session, load into the agent's context:
1. `00-PROJECT-OVERVIEW.md`
2. `01-COMPLIANCE-RULES.md` — always, without exception
3. The specific spec file for the current task

### Git
- Commit after every working step
- Branch per phase
- Never commit `.env` or the Supabase service role key
- Tag each phase completion

### Compliance gate
Before any user-facing text ships — page, email, button label, error message — run the copy review checklist in `01-COMPLIANCE-RULES.md`.

---

## KILL CRITERIA

Decide these now, while it costs nothing to be honest.

| Trigger | Action |
|---------|--------|
| Counsel advises the model is not viable | **Stop** |
| Determination refused, or not granted within 6 months of filing | **Stop** |
| Free tier 30-day retention below 15% | **Rebuild before spending on legal or marketing** |
| Under 100 paying users by month 9 after paid launch | **Stop, or pivot to B2B licensing** |

The purpose of writing these down now is that the version of you reading them in month nine will have sunk cost and will want to argue. Let present-you make the decision.

---

## OPEN ITEMS

1. Final brand name — "Bharat Firm" is a placeholder; do not register
2. Legal counsel — search in progress
3. Budget ceiling — not set; roadmap sequenced to defer paid costs to Phase 5
4. Decide whether Pro tier launches at Phase 6 or later
5. `account_templates` not yet seeded — the evaluation ruleset values need deciding
6. Spread review — SOL spread is ~0.6% and XRP ~0.73% versus BTC at 0.013%. On a 5% daily drawdown limit, a few round trips on those pairs breach the account on cost alone. Revisit when setting the ruleset.
7. Project sits in a OneDrive folder with a space in the path (`...\OneDrive\Documents\GitHub\Prop firm`). Has already caused one npm failure and one corrupted `.next` cache. Moving to `C:\dev\prop-firm` would remove a recurring class of build problems.
8. Google sign-in not built — email/password only

---

## SESSION LOG

### Session 1 — 12 September 2026

**Business model.** Started intending a standard prop firm — paid challenge, cash payout, India, INR. Established this is prohibited: the Promotion and Regulation of Online Gaming Act, 2025 bans online money games irrespective of skill, and the Rules 2026 came into force 1 May 2026. Three workaround structures were explored and rejected (Telegram Stars / token layer, offshore entity serving Indian users, USDT payouts) — the Act targets economic substance, and "other stakes" explicitly covers virtual coins and tokens.

Settled on the legal model: **Online Social Game (skill-development)**. Fee for access, no payout at any stage, disclosure at checkout / pricing / homepage, determination order before advertising or taking payment.

**Built.** Next.js 15 + Tailwind, GitHub repo (private), Vercel deploy live at `prop-firm-six.vercel.app`. Supabase project in Singapore (ap-southeast-1). 15 tables created. RLS on every table, proven by a real test: an authenticated browser session could read its own account row but could not change its balance, and the database confirmed the value unmoved.

Email/password auth with the 18+ confirmation stored with timestamp, via a `SECURITY DEFINER` trigger that creates the profiles row on signup.

Price pipeline end to end: MT5 → Python worker → Supabase → browser. Live prices at 2-second intervals, 1-minute candles with 1000-bar backfill, 90-day retention via `pg_cron`.

**Bugs worth remembering.**
- Every broadcast failed silently for hours. The worker never checked the HTTP status; Supabase was returning 422 because the payload was an array where an object was required. Lesson: always check response codes, even on fire-and-forget calls.
- After fixing 422, broadcasts returned 202 Accepted and still never arrived. The topic was `realtime:prices` when the REST API expects the raw channel name `prices`. Supabase accepts and delivers to a channel nobody is listening on — a success code that means nothing. Found by sending both variants in a throwaway script and watching which one landed.
- `.next` cache corrupted twice, both times inside the OneDrive path. Fix each time: stop dev server, delete `.next`, restart.
- Tested the deployed Vercel site instead of localhost once, and concluded a fix hadn't worked when it simply hadn't been pushed. Test locally, push after.

**Ended at:** Phase 1 mostly complete. Next session starts with the remaining Phase 1 items above, then Phase 2 — the execution engine.
