# OUTBOUND TO CRM — Coupon UX: Unauthenticated Validation + Coupon Discovery List
## Scan & Order → CRM
**Date:** 2026-10-11
**From:** Scan & Order (Customer App) team
**To:** CRM team
**Ref:** OUTBOUND_TO_CRM_COUPON_API_CONTRACT_REQUEST_2026_10_09.md (prior brief)

---

Hi team,

Following our earlier coupon contract work (Oct 9 brief), we have two new questions
that came out of a UX review. Both relate to improving how diners discover and apply
coupons during checkout.

---

## Issue 1 — Unauthenticated Coupon Validation

**Current state:**

Our coupon Apply button today requires a CRM customer token:

```
POST /scan/coupons/validate
Authorization: Bearer <customer token>
Body: { code, order_total, channel, items }
```

If the diner has not entered their phone (i.e. is browsing as a guest before
logging in), we block the Apply button with "Sign in first to apply coupons."

**What we want to support:**

A diner enters a coupon code on the checkout screen before providing their phone
number. We want to validate the code — confirm it exists, show the discount amount,
and let them see the saving — before asking them to identify themselves.

**Our question:**

1. Can `POST /scan/coupons/validate` accept requests **without** a Bearer token?
   If so, what changes in the response — do you still return `computed_discount`,
   `valid`, and `title`?

2. If no-auth validation is not supported, is there a **lighter read-only
   endpoint** (e.g. `GET /scan/coupons/{code}?restaurant_id=689`) that returns
   basic coupon info (discount value, type, validity) without touching
   customer-specific data like per-user usage limits?

3. Are there fields in the response that are **only meaningful when authenticated**
   (e.g. `per_user_limit_reached`, personalised discount)?
   If yes, we can call validate again with token when the diner logs in to get
   the final confirmed discount.

---

## Issue 2 — Coupon Discovery List

**Current state:**

The diner must know their coupon code in advance and type it manually.
There is no way for them to browse available coupons on the checkout screen.

In our Oct 9 brief we noticed `GET /scan/coupons` was returning `500 Internal Server Error`.

**What we want to support:**

A list of coupons applicable to this restaurant (and optionally to this customer)
shown on the checkout screen so the diner can tap to apply, rather than typing blind.

**Our questions:**

1. Is `GET /scan/coupons` now live? If yes, what is the full contract:
   - Auth required or public?
   - Query params: `restaurant_id`? `customer_id`? `order_total`? `channel`?
   - Response shape: list of `{ code, title, discount_type, discount_value,
     min_order_value, expiry, stackable_with_loyalty }`?
   - Does it return only **currently valid** coupons, or all including expired?

2. If a per-customer list is available (authenticated), does it differ from
   the restaurant-level list? For example — personalised codes, one-time codes,
   or codes targeted to specific tiers (Gold/Silver/Bronze)?

3. Is there a rate limit on the list endpoint? We would call it once when the
   checkout screen opens.

---

## Summary of what we need

| # | Need | Endpoint guess | Confirmed? |
|---|---|---|---|
| 1 | Validate coupon without customer token | `POST /scan/coupons/validate` (no auth) | Needs confirmation |
| 2 | List of available coupons for a restaurant | `GET /scan/coupons?restaurant_id=689` | Needs confirmation |
| 3 | Per-customer coupon list (authenticated) | `GET /scan/coupons?restaurant_id=689` + Bearer token | Needs confirmation |

No code change on our side until we hear back. We will plan the CR once the
contract is confirmed.

---

Thank you.
