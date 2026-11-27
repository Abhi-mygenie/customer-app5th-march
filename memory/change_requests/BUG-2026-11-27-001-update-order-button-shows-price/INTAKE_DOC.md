# INTAKE DOC — BUG-2026-11-27-001

**ID:** BUG-2026-11-27-001
**Type:** BUG
**Title:** Update Order button shows price — should show no price
**Date:** 2026-11-27
**Severity:** P2
**Risk:** LOW
**Status:** IMPLEMENTED

---

## Owner Report

Screenshots (2026-11-27): Review Order page in edit mode shows "Update Order ₹2572.00" on the button. The price should NOT be shown for Update Order — only Place Order should show the price.

## Root Cause

`ReviewOrder.jsx` line 2507:
```js
? `Update Order ₹${roundedTotal.toFixed(2)}`
```
In edit mode, `roundedTotal` = new additions + previous order total. This combined price is misleading on the button (APS items in cart make it inaccurate anyway).

## Fix Applied

```js
// BEFORE:
? `Update Order ₹${roundedTotal.toFixed(2)}`
// AFTER:
? 'Update Order'   // BUG-2026-11-27-001: no price on Update Order button
```

**Files changed:** `ReviewOrder.jsx` (1 line, display only)
**Files unchanged:** All other files, Place Order branch (lines 2509–2524) untouched

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V-1 | Edit mode Review Order button | "Update Order" (no price, no APS text) |
| V-2 | Edit mode in-flight spinner | "Updating Order..." (unchanged) |
| V-3 | New order Place Order button | "Place Order ₹X.XX + APS" or "Place Order ₹X.XX" (unchanged) |
| V-4 | New order Razorpay path | "Pay & Proceed ₹X.XX" (unchanged) |
| V-5 | New order APS only | "Place Order (APS)" (unchanged) |

---
