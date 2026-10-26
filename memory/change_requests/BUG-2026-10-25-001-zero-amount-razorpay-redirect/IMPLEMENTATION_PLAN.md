# IMPLEMENTATION PLAN — BUG-2026-10-25-001
## Zero-amount order: bypass Razorpay when roundedTotal <= 0

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-2026-10-25-001 |
| **Role** | Role 2 — PLANNING (Implementation Plan) |
| **Date** | 2026-10-25 |
| **Risk** | **CRITICAL** (money path, CRITICAL hotspot) |
| **Owner approvals** | D-1 approved: include TP-5 + TP-6 UX polish |
| **Prerequisite** | Impact Analysis CLOSED (same folder) |

---

## 0. Rules for the implementer

1. Follow edits E-1 through E-6 **in order**. Each is self-contained.
2. Every edit gets a code marker: `// BUG-2026-10-25-001: <brief reason>`.
3. **Only touch `ReviewOrder.jsx`.** No other file changes.
4. **Do not** change behaviour for `roundedTotal > 0` — that path must be byte-identical to today.
5. After all edits, run self-test (§2).

---

## 1. Edits

### E-1 — Main flow: payment type selection (G-1)

**File:** `frontend/src/pages/ReviewOrder.jsx`
**Where:** L1549-1552

**Current code:**
```jsx
        // Determine payment type based on user selection (FEAT-001)
        // 'online' → 'prepaid' (Razorpay), 'cod' → 'postpaid'
        const selectedPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid';
        const shouldTriggerRazorpay = paymentMethod === 'online' && hasRazorpayKey;
```

**Replace with:**
```jsx
        // Determine payment type based on user selection (FEAT-001)
        // 'online' → 'prepaid' (Razorpay), 'cod' → 'postpaid'
        // BUG-2026-10-25-001: zero-amount orders (loyalty/coupon fully covers bill) skip payment gateway
        const isZeroAmount = roundedTotal <= 0;
        const selectedPaymentType = (!isZeroAmount && paymentMethod === 'online') ? 'prepaid' : 'postpaid';
        const shouldTriggerRazorpay = !isZeroAmount && paymentMethod === 'online' && hasRazorpayKey;
```

**Why:** When `roundedTotal <= 0`, forces `postpaid` so POS won't generate a `razorpay_id`, and disables Razorpay trigger. The `isZeroAmount` local is reusable for logging at L1555.

---

### E-2 — Main flow: post-response Razorpay redirect backstop (G-2)

**File:** `frontend/src/pages/ReviewOrder.jsx`
**Where:** L1608-1609

**Current code:**
```jsx
      // Check if Razorpay payment flow needed (only for online payment selection)
      const shouldProcessRazorpay = paymentMethod === 'online' && response?.razorpay_id && restaurant?.razorpay?.razorpay_key;
```

**Replace with:**
```jsx
      // Check if Razorpay payment flow needed (only for online payment selection)
      // BUG-2026-10-25-001: backstop — never open Razorpay for zero-amount orders
      const shouldProcessRazorpay = roundedTotal > 0 && paymentMethod === 'online' && response?.razorpay_id && restaurant?.razorpay?.razorpay_key;
```

---

### E-3 — Retry flow: payment type selection (G-3)

**File:** `frontend/src/pages/ReviewOrder.jsx`
**Where:** L1744-1745

**Current code:**
```jsx
            // BUG-041 FIX: Use paymentMethod (user's selection), NOT razorpay_key existence
            const retryPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid';
```

**Replace with:**
```jsx
            // BUG-041 FIX: Use paymentMethod (user's selection), NOT razorpay_key existence
            // BUG-2026-10-25-001: zero-amount orders skip payment gateway (retry path)
            const retryPaymentType = (roundedTotal > 0 && paymentMethod === 'online') ? 'prepaid' : 'postpaid';
```

---

### E-4 — Retry flow: Razorpay redirect backstop (G-4)

**File:** `frontend/src/pages/ReviewOrder.jsx`
**Where:** L1784-1785

**Current code:**
```jsx
          // BUG-040 FIX: Check if Razorpay payment flow needed after 401 retry
          const shouldRetryRazorpay = paymentMethod === 'online' && retryResponse?.razorpay_id && restaurant?.razorpay?.razorpay_key;
```

**Replace with:**
```jsx
          // BUG-040 FIX: Check if Razorpay payment flow needed after 401 retry
          // BUG-2026-10-25-001: backstop — never open Razorpay for zero-amount orders (retry path)
          const shouldRetryRazorpay = roundedTotal > 0 && paymentMethod === 'online' && retryResponse?.razorpay_id && restaurant?.razorpay?.razorpay_key;
```

---

### E-5 — UX: hide payment selector when nothing to pay (TP-5)

**File:** `frontend/src/pages/ReviewOrder.jsx`
**Where:** L559

**Current code:**
```jsx
  const showPaymentSelector = onlinePaymentEnabled && codEnabled;
```

**Replace with:**
```jsx
  // BUG-2026-10-25-001: no payment choice needed when nothing to pay
  const showPaymentSelector = onlinePaymentEnabled && codEnabled && roundedTotal > 0;
```

**Note:** `roundedTotal` is reactive — when the customer applies/removes a coupon or loyalty points, the selector appears/disappears instantly.

---

### E-6 — UX: button label when zero amount (TP-6)

**File:** `frontend/src/pages/ReviewOrder.jsx`
**Where:** L2355-2363

**Current code:**
```jsx
            {isPlacingOrder 
              ? (isEditMode ? 'Updating Order...' : 'Placing Order...') 
              : (isEditMode 
                  ? `Update Order ₹${roundedTotal.toFixed(2)}` 
                  : (paymentMethod === 'online' && hasRazorpayKey
                      ? `Pay & Proceed ₹${roundedTotal.toFixed(2)}`
                      : `Place Order ₹${roundedTotal.toFixed(2)}`)
                )
            }
```

**Replace with:**
```jsx
            {isPlacingOrder 
              ? (isEditMode ? 'Updating Order...' : 'Placing Order...') 
              : (isEditMode 
                  ? `Update Order ₹${roundedTotal.toFixed(2)}` 
                  : (roundedTotal <= 0
                      ? 'Place Order'
                      : (paymentMethod === 'online' && hasRazorpayKey
                          ? `Pay & Proceed ₹${roundedTotal.toFixed(2)}`
                          : `Place Order ₹${roundedTotal.toFixed(2)}`)
                    )
                )
            }
```

**Why:** When `roundedTotal <= 0`, shows "Place Order" without a price — clean label, no misleading "Pay & Proceed ₹0.00".

---

## 2. Self-test matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| ST-1 | `yarn start` compiles without errors | Terminal | `Compiled successfully` (or warnings-only, no new warnings) |
| ST-2 | Restaurant with Razorpay + normal order (total > 0) + online payment → Razorpay opens | Browser | No regression |
| ST-3 | Same restaurant + COD payment → order placed directly | Browser | No regression |
| ST-4 | Apply coupon/loyalty bringing total to ₹0 → payment selector disappears | Browser | TP-5 working |
| ST-5 | Same → button says "Place Order" (not "Pay & Proceed ₹0.00") | Browser | TP-6 working |
| ST-6 | Same → tap Place Order → order succeeds without Razorpay modal | Browser | G-1 + G-2 working |
| ST-7 | Remove coupon → total > 0 → payment selector reappears, button shows amount | Browser | Reactivity correct |
| ST-8 | Backend contract tests: `cd /app/backend && python -m pytest tests/contracts/ -v` | Terminal | All PASS |

## 3. Build verification

```bash
cd /app/frontend && yarn start
# Wait for "Compiled successfully"
```

Do NOT run `CI=true yarn build` (project rule §12.7).

---

```text
Planning complete: BUG-2026-10-25-001
Stage: Implementation Plan
Code reality: CONFIRMED (all 6 lines verified at exact positions)
Risk: CRITICAL (money path — but edits are 6 surgical guard additions)
Edits: E-1 through E-6 (6 edits, 1 file)
File WILL change: ReviewOrder.jsx
Files WILL NOT touch: everything else
Owner decisions: ALL APPROVED (D-1)
Docs: IMPLEMENTATION_PLAN.md
Next: Owner approval → Role 3 (Implementation)
```
