# INTAKE — BUG-2026-10-12-003
## Loyalty "Add ₹X more to redeem" Message Misleading — Never Updates with Cart Quantity

**ID:** BUG-2026-10-12-003
**Date registered:** 2026-10-12
**Registered by:** Role 1 — Intake Agent
**Source:** Owner reported + Investigation confirmed (Role 6, 2026-10-12)
**Status:** INTAKE COMPLETE

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 — misleading UX: diner adds items expecting the number to decrease, it never does |
| Risk | LOW — single text line in ReviewOrder.jsx, no logic change |
| Blast radius | SMALL — loyalty section display only, no order flow impact |
| Duplicate check | DISTINCT |

---

## What is wrong — plain English

When a customer does not have enough points to unlock loyalty redemption, the review screen shows:

> **"Add ₹90 more to redeem"**  (highlighted in blue in owner screenshot)

This message has two problems:

**Problem 1 — Wrong meaning:** "Add ₹90 more" implies the customer should add ₹90 more to their cart. But the number 90 is `min_redemption_points - available_points` — the difference in the customer's points BALANCE. Adding items to the cart does not earn points instantly. Points are only credited after an order completes. So no matter how much the customer adds to the cart, this number never goes down.

**Problem 2 — Message never refreshes:** The diner tries adding items → the app does re-fetch CRM `max-redeemable` → but CRM always returns the same `min_redemption_points` (restaurant config, fixed) and `available_points` (customer balance, fixed until next order). The ₹90 stays ₹90. The diner is confused.

---

## Evidence — live API probe (2026-10-12)

```
POST /scan/max-redeemable  { bill_amount: 96 }
Response:
  min_redemption_points: 100   ← fixed restaurant config
  available_points:       10   ← fixed customer balance
  Difference:             90   ← always 90

POST /scan/max-redeemable  { bill_amount: 500 }   (after adding 40 items)
Response:
  min_redemption_points: 100   ← unchanged
  available_points:       10   ← unchanged
  Difference:             90   ← still 90
```

The number is fully dynamic (from CRM), but the fields it uses do not depend on `bill_amount`.

---

## Root Cause — confirmed in code

`ReviewOrder.jsx` line 2076:

```js
{(maxRedeemable.min_redemption_points - (maxRedeemable.available_points || 0)) > 0
  ? `Add ₹${maxRedeemable.min_redemption_points - (maxRedeemable.available_points || 0)} more to redeem`
  : 'Not enough points to redeem'}
```

- `min_redemption_points` = restaurant-level minimum points threshold to redeem (e.g. 100)
- `available_points` = customer's current points balance (e.g. 10)
- Difference = 90 = "customer needs 90 more points"
- Neither field changes based on cart total → message static regardless of quantity

Also: the message uses ₹ symbol for a points quantity. Today this works because `ratio_per_point = 1.0` (1 point = ₹1). But if ratio changes (e.g. 3 points = ₹1), showing "₹90 more" when the customer needs 90 more points would be numerically wrong too.

---

## Scope — files expected to change

| File | Change | Risk |
|---|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | Line 2076 — update message text only | LOW |

**Files NOT in scope:** crmService.js, CRM API, loyalty rules, CartContext

---

## Proposed Fix

**Replace the message text** to accurately describe what the customer needs to do:

```js
// Before:
`Add ₹${maxRedeemable.min_redemption_points - (maxRedeemable.available_points || 0)} more to redeem`

// After:
`Earn ${maxRedeemable.min_redemption_points - (maxRedeemable.available_points || 0)} more points to redeem`
```

This is a 1-word change: "Add ₹X more to redeem" → "Earn X more points to redeem".

The ₹ symbol is removed because the unit is points, not rupees. The word "Earn" correctly signals that the customer needs to complete more orders — not add more to the current cart.

---

## Status

```
INTAKE:          COMPLETE
PLANNING:        NOT REQUIRED — 1-word text change, LOW risk, no owner decisions needed
OWNER DECISIONS: None (unless owner prefers different wording)
Gate:            Owner says "Fix BUG-2026-10-12-003" → implement immediately
```
