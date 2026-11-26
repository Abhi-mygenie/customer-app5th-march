# IMPACT ANALYSIS — CR-2026-10-11-007
## ReviewOrder Identity Update — P4 Phone Re-auth + P5 Name Edit to CRM

**ID:** CR-2026-10-11-007
**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-11
**Gate:** Intake complete · crmUpdateProfile shipped (CR-006) · IA starting
**Risk:** CRITICAL — ReviewOrder.jsx is highest-risk file per addendum Part C

---

## 1. Code Reality Check

| Item | Status | Evidence |
|---|---|---|
| `crmUpdateProfile` exists in crmService.js | ✅ CONFIRMED | Shipped in CR-006, line 429 |
| `crmSkipOtpWithRetry` exists and accepts `name` param | ✅ CONFIRMED | crmSkipOtpRetry.js line 38 — `(phone, userId, name='', opts={})` |
| `buildUserId` exported from crmService.js | ✅ CONFIRMED | crmService.js line 79 |
| `setCrmAuth` exported from AuthContext | ✅ CONFIRMED | AuthContext.jsx value object — but NOT destructured in ReviewOrder |
| `crmToken` available in ReviewOrder | ✅ CONFIRMED | `useAuth()` destructure line 91 |
| `numericRestaurantId` available | ✅ CONFIRMED | line 129 |
| `crmUpdateProfile` imported in ReviewOrder | ❌ NOT imported | crmService import line 41 — missing |
| `crmSkipOtpWithRetry` imported in ReviewOrder | ❌ NOT imported | No import found |
| `buildUserId` imported in ReviewOrder | ❌ NOT imported | No import found |
| `setCrmAuth` destructured in ReviewOrder | ❌ Missing | line 91 only has 5 items |
| `stripPhonePrefix` exported from crmService | ❌ NOT exported | private function (line 272) |

---

## 2. Data Flow — P5 (Name Edit)

```
Customer on ReviewOrder:
  Name field shows "Ravi" (pre-filled from CRM)
  Customer corrects to "Ravi K"
  → setCustomerName("Ravi K") fires on every keystroke (CustomerDetails onChange line 106)
  → customerName state = "Ravi K"
  
Customer clicks Place Order:
  → handlePlaceOrder fires
  → validation passes
  [P5 NEW] if isAuthenticated && crmToken && name changed from user.name
      → crmUpdateProfile(crmToken, { name: "Ravi K" })  ← fire-and-forget
  → placeOrder() proceeds (P5 never blocks this)
  → POS receives cust_name: "Ravi K" ✅
  → CRM stores "Ravi K" ✅
```

**What happens if crmUpdateProfile fails:** Order still places. Name in POS is correct. CRM retains old name. Low impact — correctable next visit.

---

## 3. Data Flow — P4 (Phone Change)

```
Customer on ReviewOrder:
  Phone shows "+91 9579504871" (pre-filled from CRM login)
  Customer notices wrong number, edits to "+91 9000000001"
  → setCustomerPhone("+91 9000000001") fires
  → customerPhone state = "+91 9000000001"

Customer clicks Place Order:
  → handlePlaceOrder fires
  → validation passes (new phone is valid format)
  [P4 NEW] normalizePhone(customerPhone) ≠ normalizePhone(user.phone)?
      YES → phone changed
      → buildUserId(numericRestaurantId) → "pos_0001_restaurant_689"
      → crmSkipOtpWithRetry("+91 9000000001", userId, customerName)
          → POST /scan/auth/skip-otp { phone:"9000000001", restaurant_id:"689", name:"Ravi K" }
          → response: { token: newToken, customer_id: ..., is_new_customer: true/false, name: ... }
      → setCrmAuth(newToken, { name: customerName, phone: "9000000001" }, numericRestaurantId)
          → old token DISCARDED from localStorage ✅
          → new token stored ✅
          → user state updated ✅
  → placeOrder() proceeds with customerPhone = "+91 9000000001" ✅
  
If P4 re-auth FAILS (429, network):
  → catch block: logger.error only, no toast
  → placeOrder() proceeds with old crmToken (loyalty/points may reflect old account — acceptable)
```

---

## 4. Phone Normalization (new local helper needed)

`stripPhonePrefix` in crmService.js is a **private** function — not exported. ReviewOrder needs its own normalizer for comparison only (NOT for API calls — crmSkipOtpWithRetry handles that internally).

```javascript
// Module-level helper — comparison only, not for API calls
// CR-2026-10-11-007: normalize phone to bare 10 digits for change-detection
const normalizePhoneForComparison = (phone) => {
  if (!phone) return '';
  const bare = String(phone).replace(/\D/g, '');  // strip all non-digits
  if (bare.length === 12 && bare.startsWith('91')) return bare.slice(2);
  if (bare.length === 11 && bare.startsWith('0')) return bare.slice(1);
  return bare;
};
```

`user?.phone` from CRM: bare digits e.g. `"9579504871"`
`customerPhone` in state: E.164 e.g. `"+919579504871"`
After normalize: both → `"9579504871"` → equal → no re-auth needed ✅

---

## 5. Affected Files

### Files WILL change

| File | Risk | What changes |
|---|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | CRITICAL | Line 41: 3 new imports from crmService; Line 91: add `setCrmAuth`; ~Line 86 (before component): add `normalizePhoneForComparison` helper; Inside `handlePlaceOrder` before `placeOrder()`: P5 name update + P4 re-auth |

### Files WILL NOT change

| File | Reason |
|---|---|
| `crmService.js` | All required exports already exist (CR-006) |
| `crmSkipOtpRetry.js` | Already accepts name param (CR-006) |
| `AuthContext.jsx` | `setCrmAuth` already exported — just not destructured in ReviewOrder yet |
| `CustomerDetails.jsx` | No change — onChange fires correctly, ReviewOrder reads result |
| `backend/server.py` | No backend change |
| All other files | Not in data flow |

---

## 6. Exact Edit Sites in ReviewOrder.jsx

### Edit 1 — Import line 41 (add 3 new imports)

BEFORE:
```javascript
import { crmGetLoyaltyRules, crmGetMaxRedeemable, crmValidateCoupon } from '../api/services/crmService';
```

AFTER:
```javascript
import { crmGetLoyaltyRules, crmGetMaxRedeemable, crmValidateCoupon, crmUpdateProfile, buildUserId } from '../api/services/crmService'; // CR-2026-10-11-007
import { crmSkipOtpWithRetry } from '../api/services/crmSkipOtpRetry'; // CR-2026-10-11-007 P4
```

### Edit 2 — useAuth destructure line 91 (add setCrmAuth)

BEFORE:
```javascript
  const { isAuthenticated, user, isCustomer, setRestaurantScope, crmToken } = useAuth();
```

AFTER:
```javascript
  const { isAuthenticated, user, isCustomer, setRestaurantScope, crmToken, setCrmAuth } = useAuth(); // CR-2026-10-11-007
```

### Edit 3 — Module-level helper (before `const ReviewOrder = () => {`, ~line 88)

ADD before the component declaration:
```javascript
// CR-2026-10-11-007 P4: normalize phone to bare digits for change-detection comparison only
// (not for API calls — crmSkipOtpWithRetry strips prefix internally)
const normalizePhoneForComparison = (phone) => {
  if (!phone) return '';
  const bare = String(phone).replace(/\D/g, '');
  if (bare.length === 12 && bare.startsWith('91')) return bare.slice(2);
  if (bare.length === 11 && bare.startsWith('0')) return bare.slice(1);
  return bare;
};
```

### Edit 4 — Inside handlePlaceOrder, BEFORE `placeOrder()` call (~line 1388)

ADD the following block immediately before `orderDispatchedRef.current = true` (line 1392):

```javascript
    // CR-2026-10-11-007 P5: if name changed on review screen → update CRM profile
    // Fire-and-forget: never blocks order placement
    if (isAuthenticated && crmToken && customerName.trim() &&
        customerName.trim() !== (user?.name || '').trim()) {
      crmUpdateProfile(crmToken, { name: customerName.trim() }).catch(() => {});
    }

    // CR-2026-10-11-007 P4: if phone changed on review screen → re-auth with new phone
    if (isAuthenticated && crmToken &&
        normalizePhoneForComparison(customerPhone) !== normalizePhoneForComparison(user?.phone)) {
      try {
        const userId = buildUserId(numericRestaurantId);
        const reAuthResult = await crmSkipOtpWithRetry(customerPhone, userId, customerName.trim());
        if (reAuthResult?.token) {
          setCrmAuth(reAuthResult.token, {
            ...(reAuthResult.customer || {}),
            name: customerName.trim() || reAuthResult.customer?.name || '',
          }, numericRestaurantId);
        }
      } catch (reAuthErr) {
        // Silent fail — proceed with old token; order must not be blocked by auth
        logger.error('order', '[CR-007 P4] Phone re-auth failed, proceeding with old token:', reAuthErr);
      }
    }
```

---

## 7. Conflict Check

| Active CR/item | Same file? | Conflict? |
|---|---|---|
| CR-2026-10-11-001 (coupon fix) | ReviewOrder.jsx line 1420 | Code already in file (marker present). No conflict. |
| CR-2026-10-11-003 (retry path) | ReviewOrder.jsx ~line 1595 | Not yet implemented. If planned concurrently, ensure Edit 4 of CR-007 is before the placeOrder call at line 1414 — no line-level overlap with CR-003's retry path. |
| CR-2026-10-06-001 (walk-in flag) | ReviewOrder.jsx (guard logic) | Not yet implemented. Different section — guard logic, not placeOrder body. No conflict. |

**Sequencing recommendation:** Implement CR-007 before CR-003. CR-003's retry path (line 1595) is separate from the primary placeOrder call (line 1414) where CR-007's code lives.

---

## 8. Risk Assessment

| Edit | Risk | Justification |
|---|---|---|
| Edit 1 (imports) | LOW | Additive only — existing import line extended |
| Edit 2 (useAuth destructure) | LOW | Adding one more destructured value — no behaviour change |
| Edit 3 (module helper) | LOW | Pure function, no side effects, no state |
| Edit 4a — P5 (crmUpdateProfile) | MEDIUM | Fire-and-forget inside CRITICAL file. Guard conditions prevent false triggers. Failure mode is safe. |
| Edit 4b — P4 (phone re-auth) | HIGH | Awaited async call inside CRITICAL file. Must have tight try/catch. Touches `setCrmAuth` which modifies auth state and localStorage. |

**Overall CR risk: HIGH** (driven by Edit 4b interacting with auth state inside ReviewOrder)

---

## 9. Owner Decisions Required

| # | Decision | Recommendation |
|---|---|---|
| D1 | P4 trigger timing: at Place Order time OR on phone field onBlur? | **At Place Order time.** Avoids mid-edit CRM calls and auth disruption while customer is still typing. Rate limit (5/300s) is not a concern for 1 call per order attempt. |
| D2 | P4 re-auth failure → block order or proceed with old token? | **Proceed with old token.** CRM auth failure must never block a payment. Loyalty points may reflect wrong account — acceptable. |
| D3 | P5 name update failure → block order or fire-and-forget? | **Fire-and-forget.** POS still receives correct name. CRM inconsistency is self-healing next visit. |

---

## 10. Verification Matrix

| Test | Expected |
|---|---|
| Customer corrects "Ravi" → "Ravi K" then places order | `PUT /scan/profile {"name":"Ravi K"}` fires; order places; CRM updated |
| Customer does NOT change name | No `PUT /scan/profile` call |
| Customer changes phone to new number → places order | skip-otp fires with new phone; new CRM token stored; order places with new phone |
| Customer does NOT change phone | No skip-otp call |
| P4 re-auth fails (CRM 429) | Order places with old token; no error shown to customer |
| P5 update fails (CRM network error) | Order places; name mismatch in CRM (self-healing next visit) |
| Name changed to whitespace → places order | `crmUpdateProfile` NOT called (trim guard) |
| Phone changed to invalid format | Validation rejects before reaching P4 code |

---

## 11. Summary

```
Planning complete: CR-2026-10-11-007
Stage: Impact Analysis
Code reality: FULL (all edit sites identified, line numbers confirmed)
Risk: HIGH (Edit 4b — P4 phone re-auth touches auth state in CRITICAL file)

Files WILL change:
  frontend/src/pages/ReviewOrder.jsx    (4 edits — imports, useAuth, helper, handlePlaceOrder)

Files WILL NOT touch:
  crmService.js, crmSkipOtpRetry.js, AuthContext.jsx, CustomerDetails.jsx,
  backend/server.py, all others

Owner decisions pending: D1 (trigger timing) · D2 (P4 failure mode) · D3 (P5 failure mode)

Docs: CR-2026-10-11-007/IMPACT_ANALYSIS.md (this file)
Next: Owner confirms D1+D2+D3, then Implementation Plan
```
