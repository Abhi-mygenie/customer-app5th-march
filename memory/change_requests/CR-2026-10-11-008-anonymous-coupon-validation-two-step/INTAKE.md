# INTAKE — CR-2026-10-11-008
## Anonymous Coupon Validation — Two-Step Flow + Error Code Handling

**ID:** CR-2026-10-11-008
**Date registered:** 2026-10-11
**Registered by:** Role 1 — Intake Agent
**Source:** CRM contract freeze 2026-10-11 (reply to Coupon UX brief)
**Status:** INTAKE COMPLETE — BLOCKED on CRM preprod deploy

---

## Classification

| Field | Value |
|---|---|
| Type | CR (Feature) |
| Severity | P2 — UX improvement; coupons still work today via manual type + login |
| Risk | HIGH — ReviewOrder.jsx (CRITICAL file per addendum Part C) |
| Blast radius | MEDIUM — coupon section on review screen only |
| Duplicate check | DISTINCT — CR-2026-10-09-002 wired the validate button (authenticated only); this CR adds the anonymous path and error code handling |
| Related | CR-2026-10-09-002, CR-2026-10-11-009 |

---

## What this CR does — plain English

Today a diner must enter their phone number and log in before they can even try a coupon code. If they type a code while browsing as a guest the Apply button is disabled.

This CR adds two things:

**1. Anonymous coupon validation (two-step flow)**

A diner who has not given their phone can now type a coupon code and click Apply.

- Generic coupon (e.g. "10% off all orders") → discount shown immediately, no login needed
- Standard coupon (e.g. targeted to a specific customer) → app shows "Enter your phone number to use this coupon" — diner logs in via skip-otp, app re-validates with their token, confirms discount

**2. All error codes wired to specific messages**

Today the app shows a generic error for most coupon failures. This CR maps all 8 CRM error codes to specific user-facing messages.

---

## CRM Contract (frozen 2026-10-11)

### Anonymous validate call (no token)

```
POST /scan/coupons/validate
No Authorization header
Body: {
  "restaurant_id": "689",
  "code": "SAVE10",
  "order_total": 450.0,
  "channel": "dine_in",
  "items": []
}
```

**Response — generic coupon (requires_customer: false):**
```json
{
  "valid": true,
  "code": "SAVE10",
  "title": "Weekend Offer",
  "computed_discount": 45.0,
  "final_amount_preview": 405.0,
  "requires_cart_validation": false,
  "stackable_with_loyalty": false
}
```

**Response — standard coupon (requires_customer: true):**
```json
{
  "valid": false,
  "error": { "code": "CUSTOMER_REQUIRED", "detail": "This coupon requires a customer to be selected before applying" }
}
```

### Authenticated validate call (after skip-otp) — unchanged
Same endpoint, same body + Bearer token. Adds per-user limit and targeted eligibility checks.

### Rate limit: 10 requests per minute per IP

---

## Error codes to wire

| Code | Message to show diner |
|---|---|
| `CUSTOMER_REQUIRED` | "Enter your phone number to use this coupon" → triggers phone entry |
| `CUSTOMER_USAGE_LIMIT_REACHED` | "You've already used this coupon the maximum number of times" |
| `CUSTOMER_NOT_ELIGIBLE` | "This coupon is not available for your account" |
| `MIN_ORDER_NOT_MET` | "Minimum order value is ₹X for this coupon" (X from response) |
| `EXPIRED` / `INACTIVE` | "This coupon is no longer valid" |
| `CHANNEL_NOT_VALID` | "This coupon is not valid for this order type" |
| `OUTSIDE_TIME_WINDOW` | "This coupon is only valid between [times]" (from response) |
| `INVALID_CODE` | "Invalid coupon code" |

---

## Two-step flow — full sequence

```
State: Anonymous (no token, phone not entered)

Step 1:
  Diner types code → clicks Apply
  POST /scan/coupons/validate (no token, restaurant_id in body)
  → Generic coupon:
      valid:true → show discount preview → diner proceeds to place order
      On order placement: phone entry still required for order payload
  → Standard coupon:
      CUSTOMER_REQUIRED → show "Enter your phone number to use this coupon"
      → Diner enters phone → skip-otp → token obtained

Step 2 (after skip-otp):
  POST /scan/coupons/validate (with Bearer token)
  → Per-user limit checked, targeting checked
  → valid:true → confirmed discount shown
  → Order proceeds
```

---

## Scope — files expected to change

| File | Change | Risk |
|---|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | Remove `!isAuthenticated` guard from Apply button; add anonymous validate path; wire all error codes | CRITICAL |
| `frontend/src/api/services/crmService.js` | Update `crmValidateCoupon` to accept optional token + `restaurant_id` param | LOW |

**Files NOT in scope:** LandingPage.jsx, AuthContext.jsx, backend/server.py, all others

---

## Owner Decisions (pre-recorded from CRM contract)

| Point | Decision |
|---|---|
| Two-step flow | Confirmed correct — build exactly as described |
| `CUSTOMER_REQUIRED` → specific prompt | YES — "Enter your phone number to use this coupon" |
| Re-validate after skip-otp | YES — call validate again with token to confirm final discount |
| New customer → two-step works | Confirmed by CRM — new customer created with 0 usages, Step 2 passes |

---

## Status

```
INTAKE:          COMPLETE
PLANNING:        NOT STARTED
BLOCKED ON:      CRM preprod deploy of route changes (token optional on validate)
                 CRM will notify us when live on preprod
Gate:            Await CRM deploy notification → Planning
```
