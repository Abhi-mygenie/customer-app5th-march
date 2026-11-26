# INTAKE — CR-2026-10-11-009
## Coupon Discovery List — Browse and Tap to Apply

**ID:** CR-2026-10-11-009
**Date registered:** 2026-10-11
**Registered by:** Role 1 — Intake Agent
**Source:** CRM contract freeze 2026-10-11 (reply to Coupon UX brief)
**Status:** INTAKE COMPLETE — BLOCKED on CRM preprod deploy + CR-2026-10-11-008

---

## Classification

| Field | Value |
|---|---|
| Type | CR (Feature) |
| Severity | P2 — UX improvement; diners can still type codes manually today |
| Risk | HIGH — ReviewOrder.jsx (CRITICAL file per addendum Part C) |
| Blast radius | MEDIUM — coupon section on review screen; new UI component needed |
| Duplicate check | DISTINCT — no coupon list UI exists today |
| Related | CR-2026-10-11-008 (must ship first), CR-2026-10-09-002 |

---

## What this CR does — plain English

Today a diner must already know their coupon code to use it. There is no way to see what coupons are available. They type blind.

This CR adds a coupon discovery section on the review screen — a list of available coupons the diner can browse and tap to apply, instead of typing a code manually.

**Anonymous diner (no phone entered):**
Sees only generic coupons (e.g. "10% off all orders"). Standard and targeted coupons are hidden entirely — not greyed, not locked, simply not shown. Clean list.

**Logged-in diner (phone entered, CRM token available):**
Sees the full personalised list — includes standard coupons, coupons targeted to their tier, and excludes any they have already used up. Each coupon shows how many times they have used it (`my_usage_count`).

---

## CRM Contract (frozen 2026-10-11)

### List endpoint

```
GET /scan/coupons
No token (anonymous): add ?restaurant_id=689&channel=dine_in
With Bearer token:    no restaurant_id needed (taken from JWT)
Optional param:       channel = dine_in | delivery | takeaway (omit = all)
```

### Response shape — per coupon

```json
{
  "code": "SAVE10",
  "title": "Weekend Offer",
  "display_title": "10% Off Your Order",
  "discount_type": "percentage",
  "discount_value": 10.0,
  "min_order_value": 200.0,
  "max_discount": 100.0,
  "expected_discount": 45.0,
  "final_amount_preview": 405.0,
  "requires_cart_validation": false,
  "stackable_with_loyalty": false,
  "valid_until": "2026-10-31T23:59:59+00:00",
  "coupon_type": "order",
  "my_usage_count": 0
}
```

**`requires_cart_validation: true`** — for item/category-scope coupons (e.g. "20% off Biryani").
`expected_discount` and `final_amount_preview` will be `null` — CRM cannot compute without cart contents.
**Handling:** Show coupon with `display_title` only, no rupee amount. When diner taps → call `POST /scan/coupons/validate` with `items` array to get actual discount.

### What the list returns
- Only currently active coupons (active, not expired)
- Cap: 50 coupons max per response
- Anonymous: generic coupons only (`requires_customer: false`)
- Authenticated: full personalised list

### Rate limits
- Anonymous: 10 requests per minute per IP
- Authenticated: no rate limit
- Call once when checkout screen opens — not on every keystroke

---

## Anonymous vs Authenticated list — differences

| | Anonymous | Authenticated |
|---|---|---|
| Standard coupons | Hidden entirely | Shown if eligible |
| Targeted coupons | Hidden entirely | Shown if diner is in list |
| Exhausted coupons | Not filtered (diner unknown) | Excluded (`per_user_limit` reached) |
| `my_usage_count` field | Not present | Present |

---

## Dependency on CR-2026-10-11-008

This CR depends on CR-008 because:
- `requires_cart_validation: true` coupons on the list call `POST /scan/coupons/validate` with `items`
- That validate call must support the anonymous path (no token) — which CR-008 implements
- CR-009 must not ship before CR-008 is live and QA-passed

---

## Scope — files expected to change

| File | Change | Risk |
|---|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | Add list fetch on mount; render coupon discovery section; tap-to-apply wiring | CRITICAL |
| `frontend/src/api/services/crmService.js` | New `crmGetCouponList` function — `GET /scan/coupons` | LOW |
| New component | `CouponDiscoveryList` or similar — coupon cards UI | LOW |

**Files NOT in scope:** LandingPage.jsx, AuthContext.jsx, backend/server.py

---

## Owner Decisions (pre-recorded from CRM contract)

| Point | Decision |
|---|---|
| Anonymous list shows standard coupons greyed/locked? | NO — hide entirely. Clean list, no confusion. |
| `requires_cart_validation: true` → show without amount, validate on tap | YES — confirmed |
| Call list once on screen open | YES — not on every interaction |
| Per-customer list after login | YES — full personalised list |

---

## Status

```
INTAKE:          COMPLETE
PLANNING:        NOT STARTED
BLOCKED ON:      1. CRM preprod deploy (GET /scan/coupons anonymous support)
                 2. CR-2026-10-11-008 must ship first (validate anonymous path)
                 CRM will notify us when live on preprod
Gate:            Await CRM deploy + CR-008 QA pass → Planning
```
