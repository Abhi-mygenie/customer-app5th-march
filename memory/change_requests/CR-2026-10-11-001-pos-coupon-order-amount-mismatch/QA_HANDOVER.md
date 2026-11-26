# QA HANDOVER — CR-2026-10-11-001
## POS-Only Coupon Bypasses CRM Validation → order_amount Mismatch

**Written by:** Role 3 — Implementation Agent
**Date:** 2026-10-11
**Status:** QA COMPLETE — PASS · 2026-10-11 · iteration_18.json

---

## What was changed (3 lines, 1 file)

| Line | Change |
|---|---|
| 919 | Error message: `'Could not validate coupon. Please try again.'` → `'Coupon not recognized for online orders.'` |
| 1420 | `couponCode,` → `couponCode: appliedCouponCode,` (primary placeOrder call) |
| 1601 | `couponCode,` → `couponCode: appliedCouponCode,` (retry placeOrder call — 401 token refresh path) |

**No state changes. No API contract changes. No new variables.**
`appliedCouponCode` is an existing state variable (line 190) — set only when CRM returns `valid: true`.

---

## Why this fixes the bug

Before: `couponCode` (raw user input) was sent to POS regardless of whether CRM validated it.
After: `appliedCouponCode` (CRM-confirmed code) is sent. If CRM rejected or errored, `appliedCouponCode = ""` → POS receives no coupon → our total and POS total stay in sync.

---

## Self-test results (Role 3)

| # | Scenario | Result |
|---|---|---|
| ST-1 | Build clean after edits | PASS |
| ST-2 | `couponDiscount` and `couponTitle` still present in primary call (scope check) | PASS — lines 1421-1422 unchanged |
| ST-3 | Retry path surrounding lines intact (scope check) | PASS — lines 1602-1608 unchanged |
| ST-4 | No other occurrence of raw `couponCode,` in placeOrder calls | PASS — grep confirms |

---

## QA test cases

### TC-1 — POS-only coupon (the bug scenario)
1. Go to `/689/review-order` with items in cart, logged in
2. Type a POS-only coupon code (e.g. MARRY) in the coupon input
3. Click Apply
4. **Expected:** Toast shows *"Coupon not recognized for online orders."*
5. **Expected:** Coupon NOT shown as applied in the price breakdown
6. Place the order
7. **Expected:** `coupon_code` field in the placeOrder network request payload = `""` (empty)
8. **Expected:** `order_amount` in payload matches what the diner sees on screen
9. **Expected:** POS does NOT apply any coupon discount silently

### TC-2 — Valid CRM coupon (happy path — must not regress)
1. Apply a coupon code that CRM validates successfully
2. **Expected:** Discount shown in price breakdown. `appliedCouponCode` = the validated code.
3. Place the order
4. **Expected:** `coupon_code` in payload = validated code ✅
5. **Expected:** `coupon_discount_amount` in payload = CRM-returned discount ✅
6. **Expected:** `order_amount` = correct total after coupon

### TC-3 — Invalid coupon code
1. Type a completely invalid code → Apply
2. **Expected:** CRM returns `valid: false` → error shown from `errorMap` (unchanged path — not the catch block)
3. Place the order
4. **Expected:** `coupon_code: ""` in payload

### TC-4 — No coupon
1. Place an order with no coupon entered
2. **Expected:** `coupon_code: ""` — same as before, no regression

### TC-5 — Remove coupon after applying
1. Apply a valid CRM coupon → Remove it → Place order
2. **Expected:** `handleRemoveCoupon` sets `appliedCouponCode = ""` → `coupon_code: ""` in payload

### TC-6 — Error message wording (Owner D1 = Option B)
1. Trigger a CRM network error (e.g. wrong token, offline CRM)
2. **Expected:** Toast shows exactly: *"Coupon not recognized for online orders."*
3. **Expected (429 path unchanged):** Rate-limited → *"Too many attempts. Please try again shortly."*

---

## Known pre-existing gap — NOT a failure for this CR

The retry path (line 1595) is missing `couponDiscount` and `couponTitle` — this was present before
this CR and is out of scope. Register as `CR-2026-10-11-003-retry-path-coupon-fields` separately.
Do not fail this CR for that gap.

---

## Verify in network payload (browser DevTools)

Open DevTools → Network → XHR → find `place-order` request → Preview → `data` field (FormData):
```
coupon_code:              ""         ← must be empty for POS-only/invalid/no coupon
coupon_discount_amount:   0          ← unchanged
coupon_discount_title:    null       ← unchanged
order_amount:             <correct>  ← must match screen total
```

---

## Build status
```
yarn build: CLEAN (no errors, 1 pre-existing lint warning — unchanged)
```
