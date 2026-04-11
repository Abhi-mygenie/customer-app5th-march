# BUG-040 Fix — Test Cases Plan

## Pre-requisite for all 401 retry tests
The 401 simulator is built into `ReviewOrder.jsx` (line ~879). It fires ONCE per page session using `window.__simulate401Done`. To re-trigger:
- Hard refresh the page, OR
- Run `window.__simulate401Done = false` in browser console

---

## TEST CASE 1: BUG-040 — Online Payment + 401 Retry → Razorpay Modal Opens
**Priority:** P0 | **Status:** Must pass

### Steps:
1. Navigate to restaurant 510 menu
2. Add any item (e.g., "Rpay Test")
3. Go to Review Order → keep **"Online Payment"** selected
4. In browser console, run: `window.__simulate401Done = false`
5. Tap **Place Order**
6. 401 simulator fires → retry kicks in

### Expected:
- Console shows: `[BUG-040 FIX] 401 retry Razorpay check: { shouldRetryRazorpay: true }`
- Console shows: `[BUG-040 FIX] Retry Razorpay create order: { key: '...', order_id: 'order_...' }`
- **Razorpay modal OPENS** (asking for card details)
- User is NOT navigated to success page yet

### Failure indicator:
- Goes straight to "Order Placed!" without Razorpay modal
- Console shows `shouldRetryRazorpay: false`

---

## TEST CASE 2: BUG-040 — Online Payment + 401 Retry → Complete Razorpay Payment
**Priority:** P0 | **Status:** Must pass

### Steps:
1. Same as TC1 steps 1-6
2. Razorpay modal opens → enter test card: `4111 1111 1111 1111`, any expiry, any CVV
3. Complete payment

### Expected:
- Console shows: `[BUG-040 FIX] Retry Razorpay payment success: { razorpay_payment_id: '...' }`
- Cart is cleared
- Navigate to Order Success page
- Order shows `isPaid: true` with paymentId, razorpayOrderId, razorpaySignature
- Bill summary (including points if any) is passed correctly

---

## TEST CASE 3: BUG-040 — Online Payment + 401 Retry → Dismiss Razorpay Modal
**Priority:** P1 | **Status:** Must pass

### Steps:
1. Same as TC1 steps 1-6
2. Razorpay modal opens → **close/dismiss it** (X button or back)

### Expected:
- Console shows: `[BUG-040 FIX] Retry Razorpay modal dismissed`
- Toast error: "Payment cancelled"
- `isPlacingOrderRef.current = false`
- `orderDispatchedRef.current = false` (BUG-P2-007 fix included)
- User stays on Review Order page, can retry

---

## TEST CASE 4: BUG-041 — COD + 401 Retry → Correct Payment Type (regression)
**Priority:** P0 | **Status:** Already passing (regression check)

### Steps:
1. Navigate to restaurant 510 → add item → Review Order
2. Switch to **"Cash on Delivery"**
3. Reset simulator: `window.__simulate401Done = false`
4. Tap Place Order

### Expected:
- Console: `[BUG-P2-001] 401 RETRY PAYMENT TYPE — FIXED: { userSelectedPaymentMethod: 'cod', fixedRetrySends: 'postpaid' }`
- `BUG_WOULD_HAVE_TRIGGERED: true` (old bug would have sent prepaid)
- Order navigates to success page directly (no Razorpay — correct for COD)
- `[BUG-040 FIX] 401 retry Razorpay check: { shouldRetryRazorpay: false }`

---

## TEST CASE 5: Normal flow (no 401) — Online Payment → Razorpay
**Priority:** P0 | **Status:** Regression check

### Steps:
1. Ensure `window.__simulate401Done = true` (simulator won't fire)
2. Add item → Review Order → Online Payment → Place Order

### Expected:
- No 401 retry logs
- Razorpay modal opens normally via main flow
- Payment completes → success page

---

## TEST CASE 6: Normal flow (no 401) — COD → Direct Success
**Priority:** P0 | **Status:** Regression check

### Steps:
1. Ensure `window.__simulate401Done = true`
2. Add item → Review Order → COD → Place Order

### Expected:
- No 401 retry logs
- No Razorpay modal
- Direct navigation to success page with correct bill summary

---

## TEST CASE 7: BUG-040 — 401 Retry + Razorpay Create Order Fails
**Priority:** P2 | **Status:** Edge case

### How to simulate:
Temporarily break the RAZORPAY_CREATE_ORDER endpoint or use network throttling to fail the fetch.

### Expected:
- Console: `[BUG-040 FIX] Retry Razorpay failed: ...`
- Toast: "Payment initialization failed. Please try again."
- User stays on Review Order page
- `isPlacingOrderRef` and `orderDispatchedRef` are reset

---

## Summary Matrix

| TC | Bug | Payment | 401? | Razorpay Modal? | Expected Result |
|----|-----|---------|------|-----------------|-----------------|
| 1  | 040 | Online  | Yes  | Opens           | Modal opens, waits for payment |
| 2  | 040 | Online  | Yes  | Complete        | Success with isPaid + billSummary |
| 3  | 040 | Online  | Yes  | Dismiss         | Toast error, stay on page |
| 4  | 041 | COD     | Yes  | No              | Success with postpaid |
| 5  | —   | Online  | No   | Opens           | Normal Razorpay flow |
| 6  | —   | COD     | No   | No              | Normal COD flow |
| 7  | 040 | Online  | Yes  | Fails           | Error toast, stay on page |

---
*Last Revised: April 11, 2026 — 21:30 IST | No changes this session*
