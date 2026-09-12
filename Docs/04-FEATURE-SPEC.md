# 04 — FEATURE SPEC

---

## TIERS

| Tier | Price (incl. GST) | Contents |
|------|-------------------|----------|
| **Practice** | Free | One simulated account, no rule enforcement, basic stats |
| **Evaluation $10K** | ₹1,999 | One rule-enforced attempt, full analytics, certificate on pass |
| **Evaluation $25K** | ₹3,499 | As above, larger simulated balance |
| **Evaluation $50K** | ₹5,999 | As above |
| **Evaluation $100K** | ₹9,999 | As above |
| **Pro** | ₹14,999/yr | Unlimited evaluation attempts for 12 months, full analytics, priority support |

GST 18% as a service. Prices displayed inclusive.

**Phase 1 launches with Practice only. No payments, no gateway, no pricing page.**

---

## EVALUATION RULESET (DEFAULT TEMPLATE)

| Rule | Value |
|------|-------|
| Profit target | 8% of starting balance |
| Daily drawdown | 5% of daily starting equity |
| Maximum drawdown | 10% of starting balance |
| Minimum trading days | 5 |
| Maximum duration | 30 days |
| Weekend holding | Allowed (crypto trades 24/7) |
| News trading | Allowed |

All values live in `account_templates`. Changing them must never require a code change.

### Pass conditions — all must be true
1. Equity ≥ starting_balance × 1.08
2. Trading days count ≥ 5
3. No drawdown breach at any point
4. Within maximum duration

### Fail conditions — any one triggers
1. Daily drawdown breached
2. Maximum drawdown breached
3. Maximum duration elapsed without hitting target

### On pass
- Account status → `passed`
- Certificate generated with public verification URL
- User offered an **advanced simulated account** — larger balance, tighter ruleset, clearly labelled as simulated with no monetary value

---

## ANALYTICS MODULE

This is the differentiator. Generic platforms don't do this well.

### Core metrics
Win rate · Average win / average loss · Profit factor · Expectancy · Max consecutive losses · Largest win / largest loss · Average holding time · Total trades

### Session analysis
Performance split by Asia / London / New York, computed from `closed_at`. Show win rate and expectancy per session.

Most retail traders are quietly profitable in one session and bleed it out in another. Showing this is the single highest-value insight on the platform.

### Setup tagging
User tags each trade with a setup name (free text, autocompleted from their own history). Platform computes win rate and expectancy per tag.

### Risk consistency score
Measures whether position sizing is consistent. Large size variance after losses indicates revenge trading. Score 0–100 with a plain-language explanation.

### Mistake pattern detection
Rule-based, not AI, at launch:
- Position size increased after a loss
- Stop loss moved further from entry while in drawdown
- Trade opened within 5 minutes of closing a loser
- No stop loss set
- Holding time on losers significantly exceeding winners

Each detected pattern gets a short written explanation.

### Equity curve
Rendered from `equity_snapshots`. Overlay drawdown limits so the user sees how close they came.

---

## PAGES

### Public
| Route | Purpose |
|-------|---------|
| `/` | Homepage. No-payout disclosure above the fold. |
| `/how-it-works` | Rules, process, what a certificate means |
| `/pricing` | Phase 2+. Disclosure adjacent to every price. |
| `/verify/[code]` | Public certificate verification. No auth. |
| `/leaderboard` | Non-monetary ranking only |
| `/terms`, `/privacy`, `/refund-policy`, `/legal` | Counsel-reviewed |
| `/grievance` | Legally required. Visible in main nav and footer. |

### Authenticated
| Route | Purpose |
|-------|---------|
| `/dashboard` | Account list, status, key metrics |
| `/trade/[accountId]` | Chart, order panel, open positions, account stats |
| `/analytics/[accountId]` | Full analytics module |
| `/journal/[accountId]` | Trade list with tagging and notes |
| `/certificates` | Owned certificates |
| `/account` | Profile, session time, support tickets |

---

## TRADING SCREEN LAYOUT

```
┌──────────────────────────────────────────────┬──────────────┐
│  Instrument selector  │  Account stat bar    │              │
├───────────────────────┴──────────────────────┤  Order panel │
│                                              │              │
│              Chart                           │  Side        │
│         (Lightweight Charts)                 │  Quantity    │
│                                              │  SL / TP     │
│                                              │  [ Submit ]  │
├──────────────────────────────────────────────┤              │
│  Open Positions  │  Orders  │  History        │              │
└──────────────────────────────────────────────┴──────────────┘
```

### Account stat bar — always visible
Balance · Equity · Floating P&L · Daily drawdown used (%) · Max drawdown used (%) · Progress to target (%) · Trading days · **Time until daily reset**

Drawdown indicators turn amber at 70% consumed and red at 90%. Users breaching without warning is the top support complaint on every platform in this category.

---

## MANDATORY COMPLIANCE FEATURES

| Feature | Implementation |
|---------|----------------|
| Age verification | 18+ checkbox at signup, stored with timestamp in `profiles` |
| Session limits | Default 4h/day cap, visible counter, warning at 80% |
| Fair-play monitoring | Flag identical trades across accounts, impossible fill patterns, device/IP duplicates |
| Grievance system | `/grievance` form → `grievances` table, 72-hour response SLA, status visible to user |
| Status display | Determination status shown in footer once received |

These are legal obligations. Build them in Phase 1.

---

## OUT OF SCOPE — LAUNCH

Mobile app · Copy trading · Social feed · Additional instruments beyond the six · Slippage modelling · Expert Advisors / algo API · Multi-language · Affiliate programme

Affiliate programme stays out permanently unless counsel clears it — affiliate copy is the most common place where payout language enters a platform unsupervised.
