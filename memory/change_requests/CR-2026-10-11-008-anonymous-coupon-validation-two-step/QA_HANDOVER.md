# QA HANDOVER — CR-2026-10-11-008
## Anonymous Coupon Validation — Two-Step Flow + Error Code Handling

**ID:** CR-2026-10-11-008
**Handed over by:** Role 3 — Implementation Agent
**Date:** 2026-10-12
**Build status:** CLEAN (compiled with pre-existing warnings only, zero new warnings, zero errors)
**Self-test:** 8/8 PASS

---

## What changed (plain English)

1. **Coupon Apply button now works for anonymous users** — previously it was disabled (greyed out) and blocked if the user hadn't logged in. Now any user who has filled their name and phone on the review screen can click Apply.

2. **Two-step flow for standard coupons** — if the coupon requires a customer account (`CUSTOMER_REQUIRED`), the app silently calls skip-otp with the phone already on screen, gets a token, and re-validates. If this succeeds, the coupon applies. If skip-otp fails, error "Enter your phone number to use this coupon" is shown.

3. **Full error code map** — all 8 CRM error codes are now mapped to specific user messages. Previous stale codes (`PER_USER_LIMIT`, `NOT_APPLICABLE`) are replaced with the correct CRM keys (`CUSTOMER_USAGE_LIMIT_REACHED`, `CHANNEL_NOT_VALID`).

---

## Files changed

| File | Lines changed |
|---|---|
| `frontend/src/api/services/crmService.js` | `crmValidateCoupon` function (signature + body) |
| `frontend/src/pages/ReviewOrder.jsx` | imports (lines 41–42), useAuth destructure (line 92), `handleApplyCoupon` (lines 887–946), Apply button (lines 1969–1970) |

---

## Test cases for QA

### TC-1 — Authenticated user, valid generic coupon (regression)
**Setup:** Logged-in user (crmToken present), restaurant r689, valid generic coupon code  
**Action:** Type code → click Apply  
**Expected:** Discount applies, toast "Coupon applied — ₹X off", coupon row shows in price breakdown  
**Must not break:** Existing authenticated coupon flow unchanged

### TC-2 — Authenticated user, `CUSTOMER_USAGE_LIMIT_REACHED`
**Setup:** Logged-in user, coupon already used maximum times  
**Action:** Type exhausted coupon code → click Apply  
**Expected:** Error text "You've already used this coupon the maximum number of times"

### TC-3 — Authenticated user, `CHANNEL_NOT_VALID`
**Setup:** Logged-in user, coupon valid for dine-in only, current order type is delivery  
**Action:** Type code → click Apply  
**Expected:** Error text "This coupon is not valid for this order type"

### TC-4 — Anonymous user, valid **generic** coupon (new behaviour)
**Setup:** User has NOT gone through landing page skip-otp (no crmToken). Name and phone filled on review screen. CRM has a generic coupon (`requires_customer: false`) — ask CRM team to create one on r689 per their testing note.  
**Action:** Type generic coupon code → click Apply  
**Expected:** Discount applies without any login prompt. Toast "Coupon applied — ₹X off".

### TC-5 — Anonymous user, standard coupon → two-step flow (new behaviour)
**Setup:** Anonymous user (no crmToken), valid phone in customerPhone field, standard coupon code  
**Action:** Type standard coupon code → click Apply  
**Expected:** Loading spinner shows throughout. App silently calls skip-otp. On success: coupon discount applied. User is now authenticated (token stored in localStorage). 

### TC-6 — Anonymous user, CUSTOMER_REQUIRED, skip-otp fails
**Setup:** Anonymous user, valid standard coupon code, but skip-otp endpoint unreachable / returns 429  
**Action:** Type standard coupon code → click Apply  
**Expected:** Error text "Enter your phone number to use this coupon" shown below coupon input

### TC-7 — Apply button state for anonymous user with name+phone filled
**Setup:** Anonymous user, name and phone filled (coupon section visible), coupon code typed  
**Action:** Inspect Apply button  
**Expected:** Button is active (orange/themed), not greyed. Clicking it triggers validation.

### TC-8 — Apply button still disabled when code is empty
**Setup:** Any user, coupon input empty  
**Expected:** Apply button greyed, not clickable — `!couponCode.trim()` guard still active

### TC-9 — `INVALID_CODE` error (regression)
**Setup:** Any user, type invalid code  
**Expected:** Error text "Invalid coupon code"

### TC-10 — 429 rate limit (regression)
**Setup:** Trigger rate limit (10 req/min)  
**Expected:** `toast.error("Too many attempts. Please try again shortly.")`

---

## What must NOT have changed (regression scope)
- Loyalty points apply/remove flow — untouched
- Non-stackable coupon auto-removes loyalty points — untouched
- `handleRemoveCoupon` — untouched
- `showCoupon` visibility gate — untouched
- Order placement payload (`couponCode`, `couponDiscount`, `couponTitle`) — untouched

---

## Testing note — generic coupon on preprod
All existing coupons on r689 have `requires_customer: true` (default). Anonymous TC-4 and TC-5 require a test coupon with `requires_customer: false`. This must be created by the CRM team (they offered to do this — see SESSION_HANDOVER_2026-10-11.md §3).

## Credentials
- Restaurant: 689 (Kunafa Mahal)
- POS login: +919579504871 / Qplazm@10
- CRM preprod: https://mygenie-crm-preprod.preview.emergentagent.com
- App: https://genie-customer-app-1.preview.emergentagent.com
