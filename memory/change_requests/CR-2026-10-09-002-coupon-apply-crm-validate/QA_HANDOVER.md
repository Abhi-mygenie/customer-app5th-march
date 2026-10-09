# QA HANDOVER — CR-2026-10-09-002

**Written by:** Role 3 — Implementation Agent
**Date:** 2026-10-09
**Status:** QA PASS — 11/11 tests passed (iteration_14.json)

---

## Self-test results

| ST | Test | Result |
|---|---|---|
| ST1 | `subtotalAfterDiscount` subtracts `couponDiscount` | **line 655 confirmed** ✅ |
| ST2 | `coupon_discount_amount` in placeOrder payload | **`orderData.couponDiscount \|\| 0`** ✅ |
| ST3 | `yarn build` | **Clean, 0 errors** ✅ |
| iteration_14 | Testing agent 11/11 | **100% PASS** ✅ |

## What changed

| Edit | File | Change |
|---|---|---|
| E1 | `crmService.js` | Added `crmValidateCoupon(token, code, orderTotal, channel)` |
| E2–E11 | `ReviewOrder.jsx` | 6 coupon states, subtotalAfterDiscount fix, handleApplyCoupon/Remove, stacking guard, coupon row wired (3 states), buildBillSummary + placeOrder updated |
| E12 | `orderService.ts:377` | `coupon_discount_amount: orderData.couponDiscount \|\| 0` (was hardcoded 0) |

## Tax chain verified

`subtotalAfterDiscount = itemTotal − pointsDiscount − couponDiscount` → tax recalculates proportionally. Confirmed by testing agent: CGST/SGST dropped from ₹0.25 → ₹0.23 after ₹1 coupon on ₹10 order. Grand Total correct.

## Order placement verified

Order #1233019 placed at restaurant 689 with coupon applied. Bill Summary: Item ₹10 − coupon ₹1 = Subtotal ₹9. Taxes on ₹9. Grand Total ₹10 (round-up). `coupon_discount_amount` in POS payload = 1.0.

## Known issue (CRM-side, not blocking)

`FLAT TODAY` returns INVALID_CODE — CRM DB stores it as `'FLAT TODAY '` (trailing space, exact-match fails). Our `code.trim()` is correct. Fix is CRM's CR-085-B. Other coupons (SEED_EDGE_STACKABLE, SEED_V1_FLAT100) work correctly.

## data-testids added

`coupon-input` · `apply-coupon-btn` · `coupon-applied-row` · `coupon-applied-label` · `coupon-remove-button` · `coupon-error-text`

## QA smoke test cases

| T | Scenario | Expected |
|---|---|---|
| T1 | Authenticated, type valid code, tap Apply | Applied row: "CODE — ₹X off". Grand Total drops. Tax rows reduce proportionally. |
| T2 | Type BADCODE999, Apply | Error text "Invalid coupon code: BADCODE999" below input |
| T3 | Remove coupon | Input reappears. Total restores. |
| T4 | Non-stackable coupon + loyalty active | Loyalty auto-removed + toast "cannot stack" |
| T5 | Not authenticated, tap Apply | Toast "Sign in first" |
| T6 | Full order placement with coupon | Order places. POS receives coupon_discount_amount > 0. |
