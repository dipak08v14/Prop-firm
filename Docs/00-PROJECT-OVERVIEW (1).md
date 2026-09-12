# 00 — PROJECT OVERVIEW

> **Read this file first, before every work session.**
> Working name: **Bharat Firm** (temporary — do not register, do not hardcode)

---

## WHAT WE ARE BUILDING

A paid simulated trading evaluation and certification platform for Indian traders.

Users pay a fee to access a rule-enforced simulated trading account with real live market data. They trade against a defined ruleset (profit target, drawdown limits, minimum trading days). Passing earns a verified certificate, a permanent performance record, and access to a larger simulated account.

**Users never receive money from us. Not at any stage. Not in any form.**

---

## WHAT WE ARE NOT

- Not a prop firm
- Not a broker
- Not a funded account provider
- Not an investment platform

We do not hold client funds. We do not execute real trades. We do not pay users.

---

## LEGAL CLASSIFICATION

**Online Social Game (skill-development category)** under the Promotion and Regulation of Online Gaming Act, 2025 and the Promotion and Regulation of Online Gaming Rules, 2026.

This classification holds **only** because no monetary value ever flows back to users. Every product decision must protect this. See `01-COMPLIANCE-RULES.md` — that file overrides every other file in this project.

---

## INSTRUMENTS (LAUNCH SET — 5 ONLY)

| Symbol | Type | Broker symbol (Exness) |
|--------|------|------------------------|
| BTCUSD | Crypto | `BTCUSD` |
| ETHUSD | Crypto | `ETHUSD` |
| SOLUSD | Crypto | `SOLUSD` |
| XRPUSD | Crypto | `XRPUSD` |
| XAUUSD | Metal | `XAUUSD` |

All five come from a single MT5 demo account at Exness — one connection, one script, one thing to monitor. See `02-ARCHITECTURE.md`.

Symbol names confirmed present in Exness MT5, no suffixes. BNB was checked and is not offered by Exness; dropped rather than adding a second data source.

Do not add instruments without an explicit decision. Each one adds data cost, testing surface, and risk-engine edge cases.

---

## ENTITY

New private limited company, to be incorporated. Not yet formed at time of writing.

Build proceeds in parallel with incorporation. **Paid tiers do not go live until:**
1. Company is incorporated
2. Legal counsel has reviewed all user-facing copy
3. Determination order is received from the Online Gaming Authority of India
4. Payment gateway onboarding is complete

---

## TARGET USER

Indian retail trader, 22–35, one to three years of screen time, has lost real money, follows ICT / Smart Money Concepts content, currently using TradingView plus a broker demo account.

They are price-sensitive and highly sceptical. They have seen prop firm scams. Assume every claim we make will be challenged publicly.

---

## SUCCESS CRITERIA — PHASE 1

Phase 1 is the free tier. Revenue is not the goal.

| Metric | Target |
|--------|--------|
| Signups | 500 |
| 30-day retention | 15%+ |
| Median trades per active user / week | 5+ |
| Users completing a full evaluation | 50+ |

If 30-day retention lands below 15%, the product has no pull. Fix the product before spending on legal filing or marketing.

---

## FILE INDEX

| File | Purpose |
|------|---------|
| `00-PROJECT-OVERVIEW.md` | This file — what and why |
| `01-COMPLIANCE-RULES.md` | **Legal guardrails — overrides everything** |
| `02-ARCHITECTURE.md` | Stack, data pipeline, risk engine design |
| `03-DATABASE-SCHEMA.md` | Tables, relationships, constraints |
| `04-FEATURE-SPEC.md` | Tiers, rules, analytics, page-by-page spec |
| `05-ROADMAP-AND-WORKFLOW.md` | Build order and how we work |
