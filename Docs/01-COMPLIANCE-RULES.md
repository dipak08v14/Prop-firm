# 01 — COMPLIANCE RULES

> **This file overrides every other file in this project.**
> If any spec, design, or AI-generated code conflicts with this file, this file wins.
> Paste this file into the AI agent's context before generating any user-facing copy, UI, or payment logic.

---

## THE SIX HARD RULES

### Rule 1 — No monetary value ever flows to a user
No cash. No bank transfer. No UPI. No crypto. No USDT. No tokens. No vouchers. No gift cards. No physical prizes of value. No credits redeemable for anything outside the platform.

**Test:** could a user convert this into money or money's worth? If yes, it is prohibited.

### Rule 2 — The fee is never refundable on success
A fee returned when a user performs well is legally a stake, not a price. Refunds are permitted **only** for technical failure or under a published cooling-off policy applied identically to passing and failing users.

### Rule 3 — No marketing implies future funding or earnings
Not on the site, not in ads, not in emails, not in YouTube scripts, not in Telegram messages, not in affiliate copy.

The Act judges the **expectation created**, not only the transaction that occurs.

### Rule 4 — No funnel to any entity that pays users
No links, no referral codes, no affiliate deals, no "recommended firms" page, no partner integrations with any offshore prop firm or broker that pays traders.

Doing so makes us a **facilitator** of an online money game. Same offence, same penalty.

### Rule 5 — Disclosure at the point of payment
The no-payout disclosure must appear:

| Location | Required |
|----------|----------|
| Checkout page, directly above the pay button | **Yes** |
| Pricing page, adjacent to each price | **Yes** |
| Homepage, above the fold | **Yes** |
| Purchase confirmation email | Yes |
| Terms & Conditions | Yes — but not sufficient alone |

Same font size as surrounding body text. **Not** a collapsed accordion, tooltip, modal, grey-on-white, or footnote.

**Standard disclosure text:**
> This is a trading simulation and skill-development platform. No cash payouts, prizes, or monetary rewards of any kind are offered at any stage.

### Rule 6 — Determination before advertising
We cannot describe ourselves publicly as an online social game until the Online Gaming Authority of India issues a determination order confirming non-OMG status.

---

## VOCABULARY CONTROL

### BANNED — never use anywhere in code, UI, copy, database values, or variable names

```
funded account       payout            profit split
get funded           earn              earnings
withdrawal           withdraw          cash out
trader capital       scaling plan      "trade our money"
prize                reward (monetary) win
stake                real account      live funding
```

### APPROVED — use these instead

```
simulated account    evaluation        assessment
certification        skill assessment  performance tier
training account     verified trader level
advanced simulated account             certificate
recognition          ranking           badge
```

### Naming convention note
This applies to code too. Do not name a database column `payout_amount` or a route `/dashboard/withdraw`. Internal naming leaks into UI, logs, API responses, and screenshots. Keep it clean everywhere.

---

## MANDATORY PLATFORM FEATURES (2026 Rules)

These are legal obligations, not nice-to-haves. Build them in Phase 1, not later.

| Feature | Requirement |
|---------|-------------|
| Age verification | 18+ confirmation at signup, stored with timestamp |
| Session time limits | Configurable cap with user-visible time-spent indicator |
| Fair-play monitoring | Detection of manipulation, multi-accounting, exploit patterns |
| Grievance redressal | Published contact, ticket system, defined response SLA, visible on site |
| Status display | Determination/registration status displayed on site once received |

---

## COPY REVIEW CHECKLIST

Run this before any page, email, or ad goes live:

- [ ] Does any word appear from the banned list?
- [ ] Does any sentence imply the user could receive money — directly or by suggestion?
- [ ] Does any image, chart, or testimonial imply earnings?
- [ ] Is the no-payout disclosure present, unhidden, and in body-text size?
- [ ] Does any link lead to an entity that pays traders?
- [ ] Would a sceptical regulator reading only this page conclude we pay users?

If the answer to the last question is "maybe", rewrite it.

---

## CHANGE CONTROL — PERMANENT

A determination order stays valid **only while the product stays the same** in respect of fees and fund flows.

**Legal review is mandatory before:**
- Any change to pricing or fee structure
- Any new user-facing reward, incentive, or recognition mechanism
- Any partnership, integration, or affiliate arrangement
- Any change to refund policy
- Any new market, instrument category, or user segment

Adding a payout at any future point does not "upgrade" the business. It voids the determination and converts the operation into a criminal offence.

---

## ESCALATION

If during a build session anything in this project appears to conflict with these rules — stop the work, flag it, and resolve it before writing code. Do not proceed on the assumption it can be fixed in copy later.
