# IMPLEMENTATION PLAN — CR-2026-10-09-002
## Coupon Apply button → `POST /scan/coupons/validate` + discount in price breakdown + POS payload

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-09
**Gate:** Gate 3 accepted
**Risk:** CRITICAL
**Files changing:** `crmService.js` · `ReviewOrder.jsx` · `orderService.ts`
**Files NOT touched:** `AuthContext.jsx` · `CartContext.js` · `LoyaltyRewardsSection.jsx` · `server.py` · `App.js`

---

## Decisions locked

| D | Decision |
|---|---|
| D1 (POS) | `subtotalAfterDiscount` subtracts `couponDiscount`; `coupon_discount_amount` set from CRM `computed_discount` in POS payload. Same pattern as loyalty. |
| D2 (stacking) | Last-applied wins. `stackable_with_loyalty: false` + loyalty active → auto-remove loyalty + toast. Active non-stackable coupon → block Use button + toast. |
| D3 (validate order_total) | Send `subtotal` (original cart, pre-discount). Consistent with max-redeemable. |

---

## Pre-flight checks (Role 3 must run before first edit)

```bash
# 1. Confirm anchors
grep -n "couponCode.*useState\|buildBillSummary\|subtotalAfterDiscount\|apply-coupon-btn" \
  /app/frontend/src/pages/ReviewOrder.jsx | head -10
# Expected: 186, 45, 640, 1847

# 2. Confirm crmService.js anchor
grep -n "crmGetMaxRedeemable\|Profile.*CRM token" /app/frontend/src/api/services/crmService.js | head -5
# Expected: ~369, ~385

# 3. Confirm orderService.ts anchor
grep -n "coupon_discount_amount\|coupon_discount_title" /app/frontend/src/api/services/orderService.ts | head -5
# Expected: 377, 378 (both hardcoded)

# 4. No existing crmValidateCoupon
grep -rn "crmValidateCoupon\|couponDiscount\|appliedCouponCode" /app/frontend/src/ | head -3
# Expected: 0 results
```

---

## Edits — 11 exact edits, apply in order listed

---

### E1 · `crmService.js` — add `crmValidateCoupon` after `crmGetMaxRedeemable`

**Add** immediately after the closing `};` of `crmGetMaxRedeemable`:

```javascript
/**
 * CR-2026-10-09-002: Validate a coupon code against the diner's order total before placement.
 * Read-only — does NOT record usage (usage recorded when POS processes the order).
 *
 * v2 path: POST /scan/coupons/validate — body { code, order_total, channel, items }
 * Auth: customer Bearer token required. D3=(a): send `subtotal` (pre-discount cart) as order_total.
 * HTTP always 200 — check data.valid for outcome.
 * §4 DB whitespace bug: always trim code before sending.
 * Rate limit: 10/min IP → caller must handle 429.
 */
export const crmValidateCoupon = async (token, code, orderTotal, channel = 'dine_in') => {
  return crmAuthFetch('/scan/coupons/validate', token, {
    method: 'POST',
    body: JSON.stringify({
      code: code.trim(),
      order_total: orderTotal,
      channel,
      items: [],
    }),
  });
};
```

---

### E2 · `ReviewOrder.jsx:41` — add `crmValidateCoupon` to import

**Before:**
```javascript
import { crmGetLoyaltyRules, crmGetMaxRedeemable } from '../api/services/crmService'; // CR-2026-10-03-004 Part B · CR-2026-10-09-003
```

**After:**
```javascript
import { crmGetLoyaltyRules, crmGetMaxRedeemable, crmValidateCoupon } from '../api/services/crmService'; // CR-2026-10-03-004 Part B · CR-2026-10-09-003 · CR-2026-10-09-002
```

---

### E3 · `ReviewOrder.jsx:44–66` — add `couponDiscount` to `buildBillSummary`

**Before:**
```javascript
const buildBillSummary = ({ itemTotal, pointsDiscount, pointsToRedeem, subtotalAfterDiscount, serviceCharge, finalSubtotal, itemCgst, itemSgst, scCgst, scSgst, finalCgst, finalSgst, finalVat, finalTotalTax, gstRate, vatRate, scGstRate, roundedTotal, hasRoundingDiff, totalToPay }) => ({
  itemTotal,
  pointsDiscount,
  pointsRedeemed: pointsToRedeem,
  serviceCharge,
  subtotal: finalSubtotal,
  subtotalBeforeServiceCharge: subtotalAfterDiscount,
  cgst: itemCgst,
  sgst: itemSgst,
  scCgst,
  scSgst,
  vat: finalVat,
  gstRate,
  vatRate,
  scGstRate,
  totalTax: finalTotalTax,
  // Kept for any legacy consumer expecting combined values
  finalCgst,
  finalSgst,
  grandTotal: roundedTotal,
  originalTotal: hasRoundingDiff ? totalToPay : null
});
```

**After:**
```javascript
const buildBillSummary = ({ itemTotal, pointsDiscount, pointsToRedeem, couponDiscount = 0, subtotalAfterDiscount, serviceCharge, finalSubtotal, itemCgst, itemSgst, scCgst, scSgst, finalCgst, finalSgst, finalVat, finalTotalTax, gstRate, vatRate, scGstRate, roundedTotal, hasRoundingDiff, totalToPay }) => ({
  itemTotal,
  pointsDiscount,
  pointsRedeemed: pointsToRedeem,
  couponDiscount, // CR-2026-10-09-002
  serviceCharge,
  subtotal: finalSubtotal,
  subtotalBeforeServiceCharge: subtotalAfterDiscount,
  cgst: itemCgst,
  sgst: itemSgst,
  scCgst,
  scSgst,
  vat: finalVat,
  gstRate,
  vatRate,
  scGstRate,
  totalTax: finalTotalTax,
  // Kept for any legacy consumer expecting combined values
  finalCgst,
  finalSgst,
  grandTotal: roundedTotal,
  originalTotal: hasRoundingDiff ? totalToPay : null
});
```

---

### E4 · `ReviewOrder.jsx:186` — add coupon states after `couponCode` state

**Before:**
```javascript
  const [couponCode, setCouponCode] = useState('');
```

**After:**
```javascript
  const [couponCode, setCouponCode] = useState('');
  // CR-2026-10-09-002: coupon validation state
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [appliedCouponTitle, setAppliedCouponTitle] = useState('');
  const [couponStackable, setCouponStackable] = useState(true);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
```

---

### E5 · `ReviewOrder.jsx:378` — add coupon state clears to restaurant-change cleanup

**Before:**
```javascript
      // Clear order details
      setSpecialInstructions('');
      setCouponCode('');
      
      // Clear loyalty/points state
      setLoyaltySettings(null);
      setIsUsingPoints(false);
      setPointsToRedeem(0);
      setPointsDiscount(0);
```

**After:**
```javascript
      // Clear order details
      setSpecialInstructions('');
      setCouponCode('');
      // CR-2026-10-09-002: clear coupon state on restaurant change
      setCouponDiscount(0);
      setAppliedCouponCode('');
      setAppliedCouponTitle('');
      setCouponStackable(true);
      setCouponError('');
      
      // Clear loyalty/points state
      setLoyaltySettings(null);
      setIsUsingPoints(false);
      setPointsToRedeem(0);
      setPointsDiscount(0);
```

---

### E6 · `ReviewOrder.jsx:640` — add `couponDiscount` to `subtotalAfterDiscount`

**Before:**
```javascript
  // Subtotal after discounts (this is the base for tax calculation)
  const subtotalAfterDiscount = Math.max(0, itemTotal - pointsDiscount);
```

**After:**
```javascript
  // Subtotal after discounts (this is the base for tax calculation)
  // CR-2026-10-09-002: coupon and loyalty are both pre-tax; both subtract before tax recalculates
  const subtotalAfterDiscount = Math.max(0, itemTotal - pointsDiscount - couponDiscount);
```

---

### E7 · `ReviewOrder.jsx:851–856` — add stacking check to `handleUsePoints`

**Before:**
```javascript
  // Handle loyalty points redemption
  // CR-2026-10-09-003: replaced client-side G3 cap calculation with CRM server-authoritative max-redeemable
  const handleUsePoints = () => {
    if (!maxRedeemable?.ok) return;
    setPointsToRedeem(maxRedeemable.max_points_redeemable);
    setPointsDiscount(maxRedeemable.max_discount_value);
    setIsUsingPoints(true);
  };
```

**After:**
```javascript
  // Handle loyalty points redemption
  // CR-2026-10-09-003: replaced client-side G3 cap calculation with CRM server-authoritative max-redeemable
  const handleUsePoints = () => {
    // CR-2026-10-09-002 D2=(a): block if active coupon is not stackable with loyalty
    if (appliedCouponCode && !couponStackable) {
      toast.error('Remove coupon first to use points');
      return;
    }
    if (!maxRedeemable?.ok) return;
    setPointsToRedeem(maxRedeemable.max_points_redeemable);
    setPointsDiscount(maxRedeemable.max_discount_value);
    setIsUsingPoints(true);
  };
```

---

### E8 · `ReviewOrder.jsx` — add `handleApplyCoupon` and `handleRemoveCoupon` after `handleRemovePoints`

**Add** immediately after the closing `};` of `handleRemovePoints` (after line ~866):

```javascript
  // CR-2026-10-09-002: Coupon validation and application
  const handleApplyCoupon = async () => {
    if (!isAuthenticated || !crmToken) { toast.error('Sign in first to apply coupons'); return; }
    if (!couponCode.trim() || isEditMode) return;

    setCouponLoading(true);
    setCouponError('');
    try {
      const channel = scannedOrderType === 'dinein' ? 'dine_in' : (scannedOrderType || 'dine_in');
      const data = await crmValidateCoupon(crmToken, couponCode, subtotal, channel);
      if (data?.valid) {
        setCouponDiscount(data.computed_discount);
        setAppliedCouponCode(data.code);
        setAppliedCouponTitle(data.title || data.code);
        const stackable = data.stackable_with_loyalty !== false;
        setCouponStackable(stackable);
        // D2=(a): non-stackable coupon auto-removes loyalty points
        if (!stackable && isUsingPoints) {
          handleRemovePoints();
          toast('Coupon applied — loyalty points removed (cannot stack)');
        } else {
          toast.success(`Coupon applied — ₹${data.computed_discount.toFixed(0)} off`);
        }
      } else {
        const errorMap = {
          INVALID_CODE: 'Invalid coupon code',
          EXPIRED: 'This coupon has expired',
          PER_USER_LIMIT: "You've already used this coupon the maximum number of times",
          NOT_APPLICABLE: 'This coupon is not available for your order type',
        };
        const msg = data?.error?.detail || errorMap[data?.error?.code] || 'Coupon not valid';
        setCouponError(msg);
      }
    } catch (err) {
      const msg = err?.status === 429 ? 'Too many attempts. Please try again shortly.' : 'Could not validate coupon. Please try again.';
      toast.error(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponDiscount(0);
    setAppliedCouponCode('');
    setAppliedCouponTitle('');
    setCouponStackable(true);
    setCouponError('');
  };
```

---

### E9 · `ReviewOrder.jsx:1076, 1420, 1593` — add `couponDiscount` to all 3 `buildBillSummary` calls

**Before (all 3 identical — use `replace_all: true`):**
```javascript
buildBillSummary({ itemTotal, pointsDiscount, pointsToRedeem, subtotalAfterDiscount, serviceCharge, finalSubtotal, itemCgst, itemSgst, scCgst, scSgst, finalCgst, finalSgst, finalVat, finalTotalTax, gstRate, vatRate, scGstRate, roundedTotal, hasRoundingDiff, totalToPay })
```

**After:**
```javascript
buildBillSummary({ itemTotal, pointsDiscount, pointsToRedeem, couponDiscount, subtotalAfterDiscount, serviceCharge, finalSubtotal, itemCgst, itemSgst, scCgst, scSgst, finalCgst, finalSgst, finalVat, finalTotalTax, gstRate, vatRate, scGstRate, roundedTotal, hasRoundingDiff, totalToPay })
```

> **Use `replace_all: true`** — 3 identical call sites.

---

### E10 · `ReviewOrder.jsx:1346–1380` — add `couponDiscount` + `couponTitle` to `placeOrder` call

**Before:**
```javascript
          couponCode,
          restaurantId,
```

**After:**
```javascript
          couponCode,
          couponDiscount,                  // CR-2026-10-09-002
          couponTitle: appliedCouponTitle, // CR-2026-10-09-002
          restaurantId,
```

---

### E11 · `ReviewOrder.jsx:1833–1849` — replace coupon row with wired version

**Before:**
```javascript
              {/* Coupon Code - inline */}
              {showCoupon && (
                <div className="price-row price-row-input">
                  <div className="price-input-group">
                    <span className="price-input-icon">🏷️</span>
                    <input
                      type="text"
                      className="price-inline-input"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                      data-testid="coupon-input"
                    />
                  </div>
                  <button className="price-inline-btn" data-testid="apply-coupon-btn">Apply</button>
                </div>
              )}
```

**After:**
```javascript
              {/* Coupon Code - inline */}
              {/* CR-2026-10-09-002: wired to CRM POST /scan/coupons/validate */}
              {showCoupon && (
                appliedCouponCode ? (
                  // Applied state
                  <div className="price-row price-row-input price-row-discount" data-testid="coupon-applied-row">
                    <div className="price-input-group">
                      <span className="price-input-icon">🏷️</span>
                      <span className="price-loyalty-text price-loyalty-applied" data-testid="coupon-applied-label">
                        {appliedCouponCode} — ₹{couponDiscount.toFixed(0)} off
                      </span>
                    </div>
                    <button
                      className="price-inline-btn price-inline-btn-remove"
                      data-testid="coupon-remove-button"
                      onClick={handleRemoveCoupon}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  // Input + Apply state
                  <div className="price-row price-row-input" style={{ flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'center' }}>
                      <div className="price-input-group" style={{ flex: 1 }}>
                        <span className="price-input-icon">🏷️</span>
                        <input
                          type="text"
                          className="price-inline-input"
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                          placeholder="Enter coupon code"
                          data-testid="coupon-input"
                          disabled={couponLoading || isEditMode}
                        />
                      </div>
                      <button
                        className="price-inline-btn"
                        data-testid="apply-coupon-btn"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim() || isEditMode || !isAuthenticated}
                        style={(couponLoading || !couponCode.trim() || isEditMode || !isAuthenticated)
                          ? { background: '#F3F4F6', color: '#9CA3AF' } : {}}
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <span style={{ fontSize: '11px', color: '#EF4444', paddingLeft: 18 }} data-testid="coupon-error-text">
                        {couponError}
                      </span>
                    )}
                  </div>
                )
              )}
```

---

### E12 · `orderService.ts:377–378` — set `coupon_discount_amount` + `coupon_discount_title` from params

**Before:**
```typescript
      coupon_discount_amount: 0,
      coupon_discount_title: null,
```

**After:**
```typescript
      coupon_discount_amount: orderData.couponDiscount || 0, // CR-2026-10-09-002
      coupon_discount_title: orderData.couponTitle || null,  // CR-2026-10-09-002
```

---

## Edit summary

| ID | File | What | Risk |
|---|---|---|---|
| E1 | `crmService.js` | Add `crmValidateCoupon` (~18 lines) | MEDIUM |
| E2 | `ReviewOrder.jsx:41` | Add import | LOW |
| E3 | `ReviewOrder.jsx:44–66` | `buildBillSummary` — add `couponDiscount` param + return | MEDIUM |
| E4 | `ReviewOrder.jsx:186` | Add 6 coupon states | LOW |
| E5 | `ReviewOrder.jsx:378` | Clear coupon states on restaurant change | LOW |
| E6 | `ReviewOrder.jsx:640` | `subtotalAfterDiscount` subtract `couponDiscount` | **CRITICAL** |
| E7 | `ReviewOrder.jsx:851–856` | `handleUsePoints` — add stacking guard | HIGH |
| E8 | `ReviewOrder.jsx` after ~866 | Add `handleApplyCoupon` + `handleRemoveCoupon` (~40 lines) | HIGH |
| E9 | `ReviewOrder.jsx:1076, 1420, 1593` | 3× `buildBillSummary` call sites (replace_all) | HIGH |
| E10 | `ReviewOrder.jsx:1346–1380` | `placeOrder` — add `couponDiscount` + `couponTitle` | HIGH |
| E11 | `ReviewOrder.jsx:1833–1849` | Replace coupon row (3 states: applied/loading/input) | HIGH |
| E12 | `orderService.ts:377–378` | `coupon_discount_amount` + `coupon_discount_title` | **CRITICAL** |

**Net: ~15 lines removed, ~120 lines added, across 3 files. 12 edits.**

---

## Apply order (bottom-up within each file)

1. `crmService.js` — E1 (add only)
2. `ReviewOrder.jsx` — E11 (~1833) → E10 (~1352) → E9 (replace_all, 3 sites) → E8 (add after ~866) → E7 (~851) → E6 (~640) → E5 (~378) → E4 (~186) → E3 (~44) → E2 (~41)
3. `orderService.ts` — E12 (~377)

---

## Self-test checklist (Role 3 must complete before QA handover)

| ST | Test | How | Expected |
|---|---|---|---|
| ST1 | `subtotalAfterDiscount` includes coupon | `grep "subtotalAfterDiscount" ReviewOrder.jsx` | Shows `- couponDiscount` |
| ST2 | `coupon_discount_amount` no longer hardcoded | `grep "coupon_discount_amount" orderService.ts` | Shows `orderData.couponDiscount \|\| 0` |
| ST3 | `yarn build` | `cd /app/frontend && yarn build` | Clean — 0 errors |
| ST4 | Type `FLAT TODAY` + Apply (authenticated, r689) | Browser | "FLAT TODAY — ₹10 off" row shows, Grand Total drops ₹10 |
| ST5 | Invalid code + Apply | Browser | Error text below input "Invalid coupon code" |
| ST6 | Remove coupon | Browser | Input row returns, total restores |
| ST7 | Apply non-stackable coupon with loyalty active | Browser | Loyalty removed, coupon applies + toast |
| ST8 | Active non-stackable coupon → tap Use (loyalty) | Browser | Toast "Remove coupon first to use points" |
| ST9 | POS payload `coupon_discount_amount` | DevTools Network | Equals `computed_discount` from CRM |
| ST10 | Tax recalculates after coupon | Browser | CGST/SGST rows drop proportionally |

---

## QA test cases

| T | Scenario | Expected |
|---|---|---|
| T1 | r689, authenticated, type `FLAT TODAY`, Apply | "FLAT TODAY — ₹10 off" applied row. Grand Total −₹10. No toast for this since it's flat. |
| T2 | Type `BADCODE`, Apply | Error text "Invalid coupon code". Input stays editable. |
| T3 | Type code below minimum order | Error text with CRM's detail message. |
| T4 | Remove applied coupon | Input row shown again. Total restores. Coupon states all cleared. |
| T5 | stackable_with_loyalty:false + loyalty points active | Apply coupon → loyalty points auto-removed + toast. |
| T6 | stackable_with_loyalty:false coupon active + tap Use | Toast "Remove coupon first to use points". No points applied. |
| T7 | stackable_with_loyalty:true | Both apply simultaneously. Total = cart − loyalty − coupon. |
| T8 | Not authenticated, type code, tap Apply | Toast "Sign in first to apply coupons". |
| T9 | Edit mode | Apply button disabled. Input disabled. |
| T10 | Change restaurant with coupon active | All coupon states cleared. |
| T11 | Tax rows CGST/SGST after coupon | Proportionally reduced (discountRatio recalculates on lower base). |
| T12 | `yarn build` | Clean. |

---

## Code markers

```javascript
// CR-2026-10-09-002: <brief reason>
```
```typescript
// CR-2026-10-09-002: <brief reason>
```

---

```
Planning complete: CR-2026-10-09-002
Stage: Impact Analysis + Implementation Plan (both complete)
Code reality: FULL — 12 exact edits with before/after anchored to current file state
Risk: CRITICAL
Files WILL change: crmService.js (E1) · ReviewOrder.jsx (E2–E11) · orderService.ts (E12)
Files WILL NOT touch: AuthContext.jsx · CartContext.js · LoyaltyRewardsSection.jsx · server.py · App.js
Decisions: D1/D2/D3 — all locked
Status: AT GATE — no code written
Next: "Gate 3 accepted for CR-2026-10-09-002" → Role 3 implementation begins
```
