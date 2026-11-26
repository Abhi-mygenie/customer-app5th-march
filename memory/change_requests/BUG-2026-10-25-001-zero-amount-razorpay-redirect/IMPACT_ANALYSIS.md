# IMPACT ANALYSIS — BUG-2026-10-25-001
## Zero-amount order redirects to Razorpay — bypass payment gateway when roundedTotal <= 0

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-2026-10-25-001 |
| **Role** | Role 2 — PLANNING (Impact Analysis) |
| **Date** | 2026-10-25 |
| **Risk** | **CRITICAL** — money path, CRITICAL hotspot (`ReviewOrder.jsx`) |
| **Severity** | **P1** |

---

## 1. Code reality check

### 1.1 How `roundedTotal` reaches zero

```
subtotalAfterDiscount = max(0, itemTotal - pointsDiscount - couponDiscount)    // L740
totalToPay            = finalSubtotal + finalTotalTax                          // L813
roundedTotal          = isRoundingEnabled ? Math.ceil(totalToPay) : totalToPay // L817
```

When `pointsDiscount + couponDiscount >= itemTotal` and no delivery/service charges, `roundedTotal = 0`. Verified in code — `Math.max(0, ...)` at L740 prevents negative.

### 1.2 Current payment decision path (4 gap sites, all confirmed in code)

| # | Line | Current code | Checks amount? |
|---|------|-------------|----------------|
| **G-1** | L1551 | `const selectedPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid'` | **NO** |
| **G-2** | L1609 | `const shouldProcessRazorpay = paymentMethod === 'online' && response?.razorpay_id && restaurant?.razorpay?.razorpay_key` | **NO** |
| **G-3** | L1745 | `const retryPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid'` | **NO** |
| **G-4** | L1785 | `const shouldRetryRazorpay = paymentMethod === 'online' && retryResponse?.razorpay_id && restaurant?.razorpay?.razorpay_key` | **NO** |

All four decide based on `paymentMethod` (user's UI selection) and `hasRazorpayKey` (restaurant config) — never on `roundedTotal`.

### 1.3 What POS does with `payment_type: 'prepaid'` when amount is 0

`orderService.ts` L368: `payment_type: orderData.paymentType || 'postpaid'` — passes the string straight through.  
`orderService.ts` L381: `order_amount: Math.ceil(orderData.totalToPay || 0)` — sends `0`.  
POS likely returns `razorpay_id` for any `prepaid` order regardless of amount.  
Razorpay `create_order` API minimum is ₹1 (100 paise) — explains the ₹1 charge.

### 1.4 `roundedTotal` availability at each gap site

`roundedTotal` is a component-level `const` (L817), computed in the render scope. It is available at **all 4 gap sites** — they are all inside `handlePlaceOrder` which is a closure over the component scope. **No prop threading needed.**

---

## 2. Touch points — file-by-file

### TP-1: `ReviewOrder.jsx` L1551 — Main flow: payment type selection

**Current:**
```jsx
const selectedPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid';
const shouldTriggerRazorpay = paymentMethod === 'online' && hasRazorpayKey;
```

**Fix:** When `roundedTotal <= 0`, force `postpaid` and disable Razorpay trigger:
```jsx
// BUG-2026-10-25-001: zero-amount orders skip payment gateway
const isZeroAmount = roundedTotal <= 0;
const selectedPaymentType = (!isZeroAmount && paymentMethod === 'online') ? 'prepaid' : 'postpaid';
const shouldTriggerRazorpay = !isZeroAmount && paymentMethod === 'online' && hasRazorpayKey;
```

**Risk within TP:** LOW. `roundedTotal` is already in scope. The guard is additive — when `roundedTotal > 0`, behaviour is byte-identical to today.

---

### TP-2: `ReviewOrder.jsx` L1609 — Main flow: post-response Razorpay redirect (backstop)

**Current:**
```jsx
const shouldProcessRazorpay = paymentMethod === 'online' && response?.razorpay_id && restaurant?.razorpay?.razorpay_key;
```

**Fix:** Add amount guard:
```jsx
// BUG-2026-10-25-001: backstop — don't open Razorpay for zero amount even if POS returns razorpay_id
const shouldProcessRazorpay = roundedTotal > 0 && paymentMethod === 'online' && response?.razorpay_id && restaurant?.razorpay?.razorpay_key;
```

**Risk within TP:** LOW. Defence-in-depth — if TP-1 works correctly, this never fires for zero-amount. But protects against POS returning a `razorpay_id` despite receiving `postpaid`.

---

### TP-3: `ReviewOrder.jsx` L1745 — 401-retry flow: payment type selection

**Current:**
```jsx
const retryPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid';
```

**Fix:**
```jsx
// BUG-2026-10-25-001: zero-amount orders skip payment gateway (retry path)
const retryPaymentType = (roundedTotal > 0 && paymentMethod === 'online') ? 'prepaid' : 'postpaid';
```

---

### TP-4: `ReviewOrder.jsx` L1785 — 401-retry flow: Razorpay redirect (backstop)

**Current:**
```jsx
const shouldRetryRazorpay = paymentMethod === 'online' && retryResponse?.razorpay_id && restaurant?.razorpay?.razorpay_key;
```

**Fix:**
```jsx
// BUG-2026-10-25-001: backstop — don't open Razorpay for zero amount (retry path)
const shouldRetryRazorpay = roundedTotal > 0 && paymentMethod === 'online' && retryResponse?.razorpay_id && restaurant?.razorpay?.razorpay_key;
```

---

### TP-5 (Optional P3 UX): `ReviewOrder.jsx` L559 — Hide payment selector when amount is zero

**Current:**
```jsx
const showPaymentSelector = onlinePaymentEnabled && codEnabled;
```

**Fix:**
```jsx
// BUG-2026-10-25-001: no payment choice needed when nothing to pay
const showPaymentSelector = onlinePaymentEnabled && codEnabled && roundedTotal > 0;
```

**Note:** `roundedTotal` is reactive (recomputed on every render when cart/discounts change). When the customer applies a coupon/loyalty that brings total to 0, the payment selector disappears immediately. When they remove it, it reappears. **This is the correct UX.**

---

### TP-6 (Optional P3 UX): `ReviewOrder.jsx` L2357-2361 — Button label when zero amount

**Current:**
```jsx
paymentMethod === 'online' && hasRazorpayKey
  ? `Pay & Proceed ₹${roundedTotal.toFixed(2)}`
  : `Place Order ₹${roundedTotal.toFixed(2)}`
```

When `roundedTotal = 0`, this shows `Pay & Proceed ₹0.00` or `Place Order ₹0.00`. Both are acceptable, but `Place Order ₹0.00` is clearer (since TP-1 already forces `postpaid`). With TP-5 hiding the payment selector, `paymentMethod` may still be `'online'` from the previous state — but the button label would say "Pay & Proceed ₹0.00" which is misleading.

**Fix:** Guard the button label:
```jsx
roundedTotal <= 0
  ? 'Place Order'
  : (paymentMethod === 'online' && hasRazorpayKey
      ? `Pay & Proceed ₹${roundedTotal.toFixed(2)}`
      : `Place Order ₹${roundedTotal.toFixed(2)}`)
```

---

## 3. Files WILL change

| # | File | Lines | Risk | Change summary |
|---|------|-------|------|---------------|
| 1 | `frontend/src/pages/ReviewOrder.jsx` | L1551-1552, L1609, L1745, L1785, L559 (opt), L2357-2361 (opt) | CRITICAL hotspot | 4 mandatory guards + 2 optional UX improvements |

**Total: 1 file. 4 mandatory lines + 2 optional.**

## 4. Files WILL NOT touch

| File | Reason |
|------|--------|
| `backend/server.py` | No backend change |
| `frontend/src/api/services/orderService.ts` | `paymentType` is a passthrough string — no logic change |
| `frontend/src/context/CartContext.js` | Cart unrelated to payment decision |
| `frontend/src/components/PaymentMethodSelector/` | Component is just a radio group; visibility controlled by `showPaymentSelector` in ReviewOrder |
| All other frontend files | Payment decision is entirely in ReviewOrder.jsx |

## 5. Downstream consumers and interaction risk

| Consumer | Risk | Notes |
|----------|------|-------|
| POS `customer/order/place` | NONE | Receives `payment_type: 'postpaid'` instead of `'prepaid'` for zero-amount. POS already handles postpaid orders. |
| POS `customer/order/update` | NONE | Edit orders already always send `'postpaid'` (L1411). Not affected. |
| `orderService.ts` | NONE | Passthrough — no logic change. |
| `OrderSuccess.jsx` | NONE | Shows order confirmation. `isPaid` flag only set by Razorpay handler (L1321). For zero-amount postpaid, it naturally shows the non-paid success flow. |
| Razorpay `create_order` endpoint | NONE | Never called when `roundedTotal <= 0` (both guards active). |
| `openRazorpayCheckout` function (L1275-1348) | NONE | Never invoked for zero-amount orders. |

## 6. Conflicts with active items

| Item | Conflict? |
|------|-----------|
| BUG-2026-10-14-001 (inventory bypass, just shipped) | NONE — different part of ReviewOrder.jsx (pre-submit stock check vs payment selection) |
| CR-2026-10-12-002 (coupon list engine) | LOW — coupon discount flows into `subtotalAfterDiscount` which feeds `roundedTotal`. No conflict — the zero-amount guard reads `roundedTotal` downstream of all discount calculations |
| CR-2026-10-09-002 (coupon validate wire-up) | NONE — same reasoning |
| CR-2026-09-12-012 (ReviewOrder decomposition) | LOW — if ReviewOrder is decomposed, the payment guards move with the payment decision block |

## 7. Verification matrix

| # | Test | What proves | Method |
|---|------|-------------|--------|
| V-1 | Apply coupon/loyalty that brings `roundedTotal` to exactly ₹0 → tap Place Order → order placed directly, no Razorpay modal | Main flow fix works | Playwright / manual |
| V-2 | Same as V-1 but with 401-retry (expired token) → order placed after re-auth, no Razorpay | Retry flow fix works | Manual (hard to automate 401) |
| V-3 | Payment selector disappears when total hits ₹0 | TP-5 UX fix works | Playwright / visual |
| V-4 | Payment selector reappears when coupon/loyalty removed (total > 0) | Reactivity correct | Playwright / visual |
| V-5 | Button says "Place Order" (not "Pay & Proceed ₹0.00") when total is ₹0 | TP-6 UX fix works | Playwright / visual |
| V-6 | Normal online payment (total > 0, paymentMethod='online') → Razorpay opens as before | No regression for paid orders | Playwright |
| V-7 | COD payment (total > 0, paymentMethod='cod') → order placed directly as before | No regression for COD | Playwright |
| V-8 | Restaurant without Razorpay key → order placed directly as before | No regression for non-Razorpay restaurants | Playwright |
| V-9 | Partial discount (total > 0 but less than original) + online payment → Razorpay opens with correct reduced amount | Discount + payment flow correct | Manual |

## 8. Owner decisions — APPROVED 2026-10-25

| # | Decision | Owner answer | Recorded |
|---|----------|-------------|----------|
| D-1 | Include TP-5 + TP-6 (hide payment selector + fix button label when zero amount) | **Yes — include** | 2026-10-25 |

**Impact Analysis: CLOSED. Decision locked. Proceed to Implementation Plan.**

---

```text
Planning complete: BUG-2026-10-25-001
Stage: Impact Analysis
Code reality: CONFIRMED — all 4 gap sites verified, roundedTotal in scope at all sites, POS/Razorpay behavior traced
Risk: CRITICAL (money path, CRITICAL hotspot — but change is 4-6 guard additions, not restructuring)
Files WILL change: ReviewOrder.jsx (1 file only)
Files WILL NOT touch: server.py, orderService.ts, CartContext.js, PaymentMethodSelector, all other files
Owner decisions: D-1 (include optional UX improvements: hide selector + fix button label)
Docs: IMPACT_ANALYSIS.md
Next: Owner decision on D-1 → Implementation Plan → Implementation
```
