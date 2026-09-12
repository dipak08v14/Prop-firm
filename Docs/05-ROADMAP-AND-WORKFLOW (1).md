# 05 — ROADMAP AND WORKFLOW

---

## BUILD ORDER

Each step ships and works before the next begins. No parallel half-finished features.

### PHASE 0 — Foundation
- [ ] Next.js project on Vercel, Tailwind configured
- [ ] Supabase project, all tables from `03-DATABASE-SCHEMA.md`
- [ ] RLS policies on every table
- [ ] Auth: email + Google, 18+ confirmation at signup
- [ ] Seed `instruments` and `account_templates`

### PHASE 1 — Price pipeline
- [ ] Broker demo account opened, all 5 symbols confirmed on their list
- [ ] MT5 installed on your Windows PC
- [ ] Python worker reading all 5 instruments via the `MetaTrader5` package
- [ ] Batched broadcast to Supabase Realtime — one message every 2 seconds, all 5 prices
- [ ] `latest_prices` written to Supabase every 2 seconds
- [ ] 1-minute candle persistence to Postgres
- [ ] Auto-reconnect on MT5 disconnect, with auto-restart watchdog
- [ ] Telegram alert if any price goes stale beyond 30 seconds
- [ ] Stale-feed handling: block orders, freeze equity, show banner, never breach on stale data
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
