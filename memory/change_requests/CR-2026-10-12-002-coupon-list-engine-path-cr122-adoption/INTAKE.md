# INTAKE — CR-2026-10-12-002
## Coupon List Engine Path — CRM CR-122 Adoption (order_total, items[], recommended_code)

**ID:** CR-2026-10-12-002
**Date registered:** 2026-10-12
**Registered by:** Role 2 — Planning Agent (owner go-ahead 2026-10-12)
**Source:** CRM reply `memory/inbox/INBOUND_FROM_CRM_CR119_CR120_CR121_CR122_LIVE_PLEASE_VALIDATE_2026-10-12.md` + live validation `memory/inbox/VALIDATION_OF_CRM_CR119_CR120_CR121_CR122_2026-10-12.md`
**Status:** INTAKE COMPLETE → planning in progress

---

## Classification

| Field | Value |
|---|---|
| Type | CR (feature adoption, supersedes one bug) |
| Priority | P1 — every checkout; closes three owner-reported UX issues |
| Risk | MEDIUM — touches the coupon validate path used at Place Order (money path: coupon_code sent to POS) |
| Blast radius | Review Order screen only; `crmService.js` coupon functions; `CouponDiscoveryList` |
| Duplicate check | DISTINCT. Absorbs BUG-2026-10-12-001 (BXGY ₹0 off) |
| Related | CR-2026-10-11-008, CR-2026-10-11-009, BUG-2026-10-12-001 |

---

## Plain English

CRM shipped CR-122 on preprod: `GET /scan/coupons?order_total=` now returns only coupons that fit the cart (min-order, usage limit, channel filtered), marks cart-dependent coupons with `requires_cart_validation:true` (no fake ₹0), and names the best coupon in `recommended_code`. Our app still calls the old path (no `order_total`), still sends `items: []` on validate, and ignores `recommended_code`. This CR moves the app onto the new path and uses it.

## Owner decisions (2026-10-12)

| # | Decision | Ruling |
|---|---|---|
| D-AUTO | Recommended coupon surfacing | **Silent auto-apply** on Review Order open, into the coupon field, before Place Order (as CRM suggests) |
| D-TW | Time-window coupons out of window | **Variant A** grey-out (solid grey border/fill, opacity .8, not tappable), **12-hour** chip "Valid 5–7 PM" (ruled 2026-10-12, mock-up approved) |
| D-REFETCH | Re-fetch list on subtotal change | **Yes**, debounced |
| D-TITLE | Card title source | **CRM `title`** (descriptive), fallback `display_title` → `code` (ruled 2026-10-12) |
| D-LOYALTY | Auto-apply vs loyalty points (IA R10) | **L-A** — skip auto-apply when diner can redeem points and coupon is non-stackable; badge "Best offer" instead (ruled 2026-10-12) |
| B8 | Re-validate applied coupon on subtotal change | **Included** (ruled 2026-10-12) |
| GATE | Implementation | **HOLD** — stay at gate until owner approves plan + design for D-TW |

## Scope

| # | Item | Fixes |
|---|---|---|
| B1 | Pass `order_total` to `GET /scan/coupons`; debounced re-fetch on subtotal change | Issue 1 (non-applicable coupons), root of BUG-001 |
| B2 | Build `items[]` from cart and send on every `/validate` | Tapping `requires_cart_validation:true` coupons (BXGY, item/category-scoped) fails today |
| B3 | Extend `errorMap` with new CRM codes | Raw CRM text leaking to diner |
| B4 | Silent auto-apply of `recommended_code` on load | Issue 3 |
| B5 | Grey-out time-window coupons out of window | Issue 1 residual |
| B6 | Card title: `title` preferred | Identical "10% off" cards |
| B7 | `offer_type !== 'simple'` guard in `formatDiscount` | BUG-001 safety net |
| B8 | Re-validate applied coupon on debounced subtotal change; remove + toast if invalid | Pre-existing stale-discount gap (IA R5) |

Out of scope: CR-2026-10-11-007; any backend change; loyalty logic.
