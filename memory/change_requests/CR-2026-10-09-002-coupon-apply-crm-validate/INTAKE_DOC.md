# INTAKE DOC — CR-2026-10-09-002 (coupon Apply button → CRM validate)

## Item Identity

| Field | Value |
|---|---|
| **CR ID** | CR-2026-10-09-002 |
| **Title** | Wire coupon Apply button to `POST /scan/coupons/validate` + show discount preview before order |
| **Classification** | CR — new feature wiring (CRM API integration) |
| **Date Registered** | 2026-10-09 |
| **Severity** | P2 |
| **Risk** | CRITICAL — touches `ReviewOrder.jsx` (CRITICAL file, addendum §6.1) |
| **Status** | INTAKE — **BLOCKED on CRM shipping `POST /scan/coupons/validate`** (their next CR, ~CR-097) |
| **Blocked on** | CRM to confirm live + send note |

---

## 1. Problem

Apply button (`ReviewOrder.jsx:1839`) has no `onClick` — no-op. Coupon code is collected but never validated. Diner gets no feedback, no discount preview. Code is currently sent to POS in the order payload only at submission.

## 2. CRM contract (received 2026-10-09 — **endpoint not built yet**)

### `GET /scan/coupons` (LIVE, 200 confirmed)
- Auth: customer Bearer token
- Returns all eligible coupons for the diner's restaurant
- Shape: `{ coupons: [ { id, code, discount_type, discount_value, min_order_value, max_discount, description, title, start_date, end_date, per_user_limit, my_usage_count, stackable_with_loyalty, coupon_type, applicable_channels } ] }`
- Use: show available coupons before diner types — optional UX enhancement

### `POST /scan/coupons/validate` (NOT BUILT — proposed contract frozen)
- Auth: customer Bearer token (pre-login not supported)
- Request: `{ code (required), order_total (required), items (optional — BOGO/item-scope only) }`
- Success 200: `{ valid:true, code, title, discount_type, discount_value, computed_discount, final_amount_preview, stackable_with_loyalty, coupon_type }`
- Errors: `not_found` / `expired` / `min_order` / `per_user_limit` (all HTTP 200 with `success:false`)
- **Validate-only — does NOT record usage. Usage recorded at POS order time.**
- Call after skip-otp (token required)

### Confirmed live coupon for testing
- Code: `FLAT TODAY` — flat ₹10, min_order ₹0, not stackable with loyalty

## 3. Scope (Planning will derive exact edits)

**IN:**
- Add `crmValidateCoupon(token, code, orderTotal, items)` to `crmService.js`
- Wire Apply button `onClick` in `ReviewOrder.jsx` — call validate, show computed discount, handle errors
- If valid: set discount state (`couponDiscount`) in ReviewOrder, add to price breakdown
- If invalid: show toast with CRM error message
- Gate Apply behind `isAuthenticated` (token required per CRM contract)
- `stackable_with_loyalty` — if false and loyalty points are also being used, show conflict UI

**OUT:**
- `GET /scan/coupons` coupon picker UI — deferred, can add later
- Pre-login coupon preview — not supported by CRM
- Recording usage — POS handles at order time (no change needed)

**GREY ZONE for Planning:**
- What happens when user is NOT authenticated yet and taps Apply? Show "please continue to sign in first" or hide Apply until after skip-otp?
- Does `coupon_code` in POS order payload change format once validated? (Currently sent as typed string)

## 4. Files that WILL change (Planning to confirm)

| File | Change |
|---|---|
| `frontend/src/api/services/crmService.js` | Add `crmValidateCoupon` |
| `frontend/src/pages/ReviewOrder.jsx` | Wire Apply button, add `couponDiscount` state, update price breakdown |

## 5. Files WILL NOT touch
`AuthContext.jsx` · `CartContext.js` · `server.py` · `App.js`

## 6. Trigger phrase
When CRM confirms `POST /scan/coupons/validate` is live: say **`Planning for CR-2026-10-09-002`**

## 7. Probes confirming CRM state (2026-10-09)

| Check | Result |
|---|---|
| `GET /scan/coupons` (r689, customer token) | 200, 20 coupons, "FLAT TODAY" confirmed real ✅ |
| `POST /scan/coupons/validate` | 404 — not built yet ✅ (matches CRM statement) |

---

```
Intake complete: CR-2026-10-09-002
Classification: CR — CRM API wiring
Severity: P2
Risk: CRITICAL (ReviewOrder.jsx hotspot)
Duplicate check: DISTINCT — no existing CR covers coupon validate wiring
Blast radius: MEDIUM — 2 files, no auth/payment change
Blocked on: CRM shipping POST /scan/coupons/validate
Next: wait for CRM confirm-live note → Planning
```
