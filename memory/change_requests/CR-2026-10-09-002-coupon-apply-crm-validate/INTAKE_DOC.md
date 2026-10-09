# INTAKE DOC — CR-2026-10-09-002
## Coupon Apply button → `POST /scan/coupons/validate` + discount preview

**Written by:** Role 1 — Intake Agent
**Date:** 2026-10-09
**Status:** REGISTERED — CRM endpoint LIVE (CR-105 shipped 2026-10-09)

---

## Item Identity

| Field | Value |
|---|---|
| **CR ID** | CR-2026-10-09-002 |
| **Title** | Wire coupon Apply button to CRM `/scan/coupons/validate` — show discount preview before order |
| **Classification** | CR — new feature wiring (CRM API integration) |
| **Severity** | P2 |
| **Risk** | **CRITICAL** — `ReviewOrder.jsx` (highest-risk file, addendum §6.1). No Fast Lane. |
| **Duplicate check** | DISTINCT — no existing CR covers coupon validate wiring |
| **Blast radius** | MEDIUM — 2 frontend files, no auth/payment schema change |
| **Blocked on** | Nothing. CRM CR-105 live. One POS question open (see §6) |
| **Related** | CR-2026-10-09-003 (max-redeemable, same checkout area — sequence after this) |

---

## 1. Problem

`ReviewOrder.jsx:1839` — Apply button has no `onClick`. No-op. Coupon code is captured in state and passed to POS in the order payload at submission (`couponCode`, lines 1344 + 1523), but there is **zero CRM validation, zero discount preview, zero user feedback** before the order is placed. Diner types `SAVE10`, taps Apply, nothing happens.

---

## 2. CRM contract — `POST /scan/coupons/validate` (CR-105, live 2026-10-09)

**Validated on preview 2026-10-09:** error cases (INVALID_CODE, MIN_ORDER_NOT_MET) confirmed working.

**Base URL:** `https://crm-preprod-7.preview.emergentagent.com/api`
**Auth:** Customer Bearer token (call after skip-otp — pre-login not supported)
**Rate limit:** 10/min IP → must handle 429 with toast

**Request:**
```json
POST /scan/coupons/validate
Authorization: Bearer <token>
{ "code": "SAVE10", "order_total": 500.0, "channel": "dine_in", "items": [] }
```
- `code` — required, case-insensitive. **Strip whitespace client-side** (§4 DB bug — see §7)
- `order_total` — required, cart subtotal before discount
- `channel` — optional, default `"dine_in"`. Values: `"dine_in"` / `"delivery"` / `"takeaway"`
- `items` — optional, only for BOGO/item-scope coupons

**Success (HTTP 200, check `data.valid`):**
```json
{ "data": { "valid": true, "code": "SAVE10", "title": "Weekend Offer",
  "discount_type": "percentage", "discount_value": 10.0,
  "computed_discount": 50.0, "final_amount_preview": 450.0,
  "min_order_value": 200.0, "stackable_with_loyalty": false, "coupon_type": "order" } }
```

**Errors (HTTP 200, `valid:false`):**

| `error.code` | Meaning | Toast copy |
|---|---|---|
| `INVALID_CODE` | Code not found / typo | "Invalid coupon code" |
| `EXPIRED` | Past end_date | "This coupon has expired" |
| `MIN_ORDER_NOT_MET` | `order_total < min_order_value` | Use `error.detail` ("Minimum order ₹200 required") |
| `PER_USER_LIMIT` | Diner hit usage cap | "You've already used this coupon the maximum number of times" |
| `NOT_APPLICABLE` | Wrong channel (e.g. delivery-only, diner is dine-in) | "This coupon is not available for your order type" |

**HTTP 429:** "Too many attempts. Please try again shortly."

**Important:** Validate-only — **does not record usage**. Usage recorded when POS processes the order. Coupon code already in order payload (`couponCode`) — no change needed there.

---

## 3. `GET /scan/coupons` — available coupon picker (enhancement, same scope)

Returns all eligible coupons for the diner. Auth: customer token. Can be used to show a list of available coupons so diner doesn't have to type blindly. This is optional UX — include in this CR if simple, defer if it adds complexity.

---

## 4. Current state — what code exists

```javascript
// ReviewOrder.jsx:1826-1841
{showCoupon && (
  <div className="price-row price-row-input">
    <input value={couponCode} onChange={...} placeholder="Enter coupon code" />
    <button className="price-inline-btn" data-testid="apply-coupon-btn">Apply</button>
  </div>
)}
```

`couponCode` state at line 186. Sent in POS payload at lines 1344 and 1523. No validation, no discount state, no price breakdown slot.

---

## 5. Scope

**IN:**
- Add `crmValidateCoupon(token, code, orderTotal, channel)` to `crmService.js`
- Wire Apply button `onClick` in `ReviewOrder.jsx`
- Add `couponDiscount` state (number) and `appliedCouponCode` state (string) to ReviewOrder
- Show discount in price breakdown: `- ₹{couponDiscount}` between subtotal and GST (same slot as pointsDiscount)
- Update `totalToPay` to subtract `couponDiscount`
- Toast on error with message from `error.detail` or copy table above
- Toast on 429
- Strip whitespace from coupon code before sending
- If `stackable_with_loyalty === false` and loyalty points are also applied: show conflict choice ("Use coupon or points — not both")
- Gate Apply behind `isAuthenticated` — show "Sign in first to apply coupons" if not authenticated

**OUT:**
- `GET /scan/coupons` coupon picker UI — defer to follow-up
- Pre-login coupon preview — not supported by CRM
- `items` field wiring (BOGO/item-scope) — defer until CRM confirms item-scope coupons are in use

**GREY ZONE for Planning to decide:**
- G1: Does `totalToPay` in POS order payload subtract `couponDiscount`? Or send full amount + `coupon_code`? (See §6)
- G2: When coupon + loyalty conflict (`stackable_with_loyalty:false`), which gets priority if both are applied? Proposed: last-applied wins — if coupon applied after points, remove points; if points applied after coupon, remove coupon.

---

## 6. One open question — POS order payload

CRM confirms validate-only; usage recorded at POS order time. But does POS:
- **(a) Re-validate and apply discount itself** → we send `coupon_code`, POS applies the ₹ — our `totalToPay` shows discounted amount to diner but POS payload carries the full subtotal + coupon_code
- **(b) Trust our discount number** → we send `coupon_code` + `coupon_discount: 50.0`, POS deducts that exact amount

**This must be answered before Gate 3.** Affects whether `totalToPay` in the payload changes.

---

## 7. Known data issue — §4 whitespace bug

`GET /scan/coupons` returns `'FLAT TODAY '` (trailing space). Validate strips input → `"FLAT TODAY"` → DB exact-match fails → `INVALID_CODE`. CRM to fix in CR-085-B. Until then, "FLAT TODAY" will validate as invalid. Strip whitespace on our side regardless — correct behaviour once DB is cleaned.

---

## 8. Files

| Will change | Will NOT touch |
|---|---|
| `frontend/src/api/services/crmService.js` | `AuthContext.jsx` |
| `frontend/src/pages/ReviewOrder.jsx` | `CartContext.js` |
| | `server.py` |
| | `App.js` |

---

## 9. Acceptance criteria

1. Diner types `SAVE10`, taps Apply → loading state → "₹50 off" appears in price breakdown → Grand Total updates → Use button enabled
2. Invalid code → toast "Invalid coupon code"
3. Below minimum → toast "Minimum order ₹200 required" (from `error.detail`)
4. Remove coupon → discount clears, total restores
5. `stackable_with_loyalty:false` + both applied → conflict choice shown
6. Not authenticated → Apply shows "Sign in first to apply coupons"
7. `yarn build` clean

---

```
Intake complete: CR-2026-10-09-002
Classification: CR — CRM API wiring
Severity: P2
Risk: CRITICAL (ReviewOrder.jsx hotspot)
Duplicate check: DISTINCT
Evidence: CRM contract v2.1 + probes 2026-10-09 + existing no-op code confirmed
Blast radius: MEDIUM
Blocked on: G1 POS payload question only
Next: answer G1 → Planning → "Gate 3 accepted for CR-2026-10-09-002"
```
