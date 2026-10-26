# INVESTIGATION REPORT — INV-2026-10-25-001
## Zero-amount order redirects to Razorpay instead of placing directly

| Field | Value |
|---|---|
| **ID** | INV-2026-10-25-001-zero-amount-razorpay-redirect |
| **Role** | Role 6 — INVESTIGATION (read-only; no code edited) |
| **Date** | 2026-10-25 |
| **Owner report** | "If I use loyalty points or coupon code and the actual amount to pay becomes zero, the app still redirects to Razorpay, which asks for ₹1 payment. It should skip payment and place the order directly." |
| **Steps used** | 5 / 10 |
| **Classification** | FE logic gap |
| **Confidence** | **HIGH** |

---

## 0. Answer in one paragraph

The gap is confirmed and is a **missing zero-amount guard** in the order placement flow. When `paymentMethod === 'online'`, the code at `ReviewOrder.jsx` L1551-1552 sets `selectedPaymentType = 'prepaid'` and `shouldTriggerRazorpay = true` based **solely on the user's payment selector choice and the Razorpay key existing** — it never checks whether the actual payable amount (`roundedTotal`) is zero. The order is then sent to POS with `paymentType: 'prepaid'`, POS returns a `razorpay_id`, and L1609 triggers `openRazorpayCheckout()`. Razorpay's API requires a minimum ₹1, so the gateway either charges ₹1 or errors. The fix is a **one-point guard**: when `roundedTotal <= 0`, override to `paymentType: 'postpaid'` and skip the Razorpay flow regardless of the user's selector choice.

---

## 1. Hypotheses

| # | Hypothesis | Result |
|---|---|---|
| H1 | The FE never checks if total-to-pay is zero before deciding to trigger Razorpay | **CONFIRMED** — L1551-1552 use only `paymentMethod` and `hasRazorpayKey`, never `roundedTotal` |
| H2 | The POS rejects zero-amount prepaid orders and returns no `razorpay_id` | **REFUTED** — POS likely returns `razorpay_id` for any `prepaid` order; the FE sends `totalToPay: roundedTotal` (L1577) which could be 0, but POS doesn't gate on it |
| H3 | Razorpay's `create_order` API rejects amount=0 and the error is mishandled | **PARTIAL** — Razorpay minimum is ₹1 (100 paise); L1300 computes `amount: razorpayOrder.amount_in_paise || (orderResponse.total_amount * 100)` — if POS returns `total_amount=0`, this sends 0 paise to Razorpay, which either rejects or rounds to ₹1 |

---

## 2. The exact code path (traced line by line)

### Step 1: Amount calculation (L740-823)

```
subtotalAfterDiscount = max(0, itemTotal - pointsDiscount - couponDiscount)  // L740
```

When `pointsDiscount + couponDiscount >= itemTotal`, `subtotalAfterDiscount = 0`. This cascades:
- `adjustedCgst = 0`, `adjustedSgst = 0`, `adjustedVat = 0` (tax proportional to 0)
- `serviceCharge = 0` (based on `subtotalAfterDiscount`)
- `finalSubtotal = 0 + 0 + deliveryCharge` (L810)
- `totalToPay = 0` (L813, assuming no delivery)
- `roundedTotal = 0` (L817)

**Result:** `roundedTotal = 0` ✓ (correct calculation)

### Step 2: Payment method selection (L547-570)

```
hasRazorpayKey = !!restaurant?.razorpay?.razorpay_key     // L547
onlinePaymentEnabled = hasRazorpayKey && (order-type flag) // L550-557
```

When `onlinePaymentEnabled && !codEnabled` → `paymentMethod = 'online'` (L563-564).
When `onlinePaymentEnabled && codEnabled` → `paymentMethod = 'online'` (L568, default).

**The payment method is selected based on restaurant config. It is NOT influenced by the amount.** A customer with ₹0 to pay still has `paymentMethod = 'online'` if the restaurant has Razorpay configured.

### Step 3: Place order (L1549-1602)

```javascript
const selectedPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid';  // L1551
const shouldTriggerRazorpay = paymentMethod === 'online' && hasRazorpayKey;        // L1552
```

**GAP HERE.** Neither line checks `roundedTotal`. The order is placed with `paymentType: 'prepaid'` (L1588) even when `roundedTotal === 0`.

### Step 4: Post-place-order Razorpay redirect (L1608-1622)

```javascript
const shouldProcessRazorpay = paymentMethod === 'online'
  && response?.razorpay_id
  && restaurant?.razorpay?.razorpay_key;                // L1609

if (shouldProcessRazorpay) {
  await openRazorpayCheckout(response, 'Razorpay');     // L1613
  return;
}
```

**GAP HERE (second).** Again, no amount check. If POS returns a `razorpay_id` (which it will for any `prepaid` order), the Razorpay modal opens.

### Step 5: Razorpay checkout (L1273-1348)

```javascript
amount: razorpayOrder.amount_in_paise || (orderResponse.total_amount * 100)  // L1300
```

If `total_amount = 0`, this sends `amount: 0` to Razorpay. Razorpay's minimum is ₹1 (100 paise). The gateway either:
- Rejects with an error (likely), or
- The POS `create_order` endpoint itself sets a minimum of ₹1 (explaining the owner's "₹1 payment" observation).

---

## 3. The gap — exactly two missing guards

| # | Where | What's missing |
|---|---|---|
| **G-1** | L1551 (`selectedPaymentType`) | When `roundedTotal <= 0`, force `selectedPaymentType = 'postpaid'` regardless of `paymentMethod`. A fully-discounted order is logically postpaid — there's nothing to prepay. |
| **G-2** | L1609 (`shouldProcessRazorpay`) | Add `&& roundedTotal > 0` to the condition. Even if POS returns a `razorpay_id`, don't open the payment modal when there's nothing to charge. |

Either guard alone would fix the symptom. **Both together are defence-in-depth** (same pattern as the inventory 3-layer enforcement):
- G-1 prevents sending `prepaid` to POS → POS won't generate a `razorpay_id`
- G-2 is the backstop — even if POS somehow returns a `razorpay_id`, the modal won't open

### Same gap exists in the 401-retry flow

The retry path at L1744-1785 has the same pattern:

```javascript
const retryPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid';  // L1745
const shouldRetryRazorpay = paymentMethod === 'online' && retryResponse?.razorpay_id && ...;  // L1785
```

Both need the same `roundedTotal > 0` guard.

---

## 4. Findings

| ID | Finding | Severity | Where |
|---|---|---|---|
| **F-1** | Zero-amount order with `paymentMethod='online'` sends `paymentType: 'prepaid'` to POS and redirects to Razorpay — should send `'postpaid'` and skip Razorpay | **P1 BUG** — customer-visible, blocks order completion | L1551, L1609 |
| **F-2** | Same gap in 401-retry flow | **P1** (same bug, retry path) | L1745, L1785 |
| **F-3** | Razorpay `amount` field computes as 0 paise when `total_amount=0` — Razorpay API minimum is ₹1 (100 paise), so gateway either errors or charges ₹1 | P1 (explains the ₹1 charge) | L1300 |
| **F-4** | The payment method selector UI remains visible even when `roundedTotal=0` — cosmetic, but misleading | P3 UX | L2336 |
| **F-5** | Edit-order flow (L1405-1434) always sends `paymentType: 'postpaid'` — NOT affected by this bug (edit is always postpaid) | — (information, no gap) | L1411 |

---

## 5. Scope of the fix (for Intake)

**Minimal fix (2 guards + 2 retry guards = 4 lines):**

```javascript
// G-1: L1551 — force postpaid when nothing to pay
const selectedPaymentType = (roundedTotal <= 0 || paymentMethod !== 'online') ? 'postpaid' : 'prepaid';
const shouldTriggerRazorpay = paymentMethod === 'online' && hasRazorpayKey && roundedTotal > 0;

// G-2: L1609 — backstop: don't open Razorpay for zero amount
const shouldProcessRazorpay = paymentMethod === 'online' && response?.razorpay_id && restaurant?.razorpay?.razorpay_key && roundedTotal > 0;

// Same for retry path L1745, L1785
```

**Optional UX (P3):** Hide payment selector when `roundedTotal <= 0`:
```javascript
const showPaymentSelector = onlinePaymentEnabled && codEnabled && roundedTotal > 0;
```

**Files affected:** `ReviewOrder.jsx` only (CRITICAL hotspot — no Fast Lane).

**Files NOT affected:** `orderService.ts` (unchanged — paymentType is just a string param), `CartContext.js`, `MenuItem.jsx`, backend `server.py`.

---

## 6. Evidence

- Code: `ReviewOrder.jsx` L547 (`hasRazorpayKey`), L550-557 (`onlinePaymentEnabled`), L562-570 (auto-select `paymentMethod`), L740 (`subtotalAfterDiscount = max(0, ...)`), L813 (`totalToPay`), L817 (`roundedTotal`), L1551-1552 (payment type selection — **no amount check**), L1566-1602 (`placeOrder` call with `paymentType: selectedPaymentType`), L1609 (`shouldProcessRazorpay` — **no amount check**), L1275-1348 (`openRazorpayCheckout`, L1300 `amount: 0 paise`), L1744-1785 (retry path — same gaps).
- Razorpay API docs: minimum order amount is ₹1 (100 paise). Orders with amount=0 are rejected or auto-clamped.
- Owner observation: "Razorpay is asking one rupee payment" — consistent with F-3 (POS or Razorpay clamping 0→₹1).

---

```text
Investigation complete: INV-2026-10-25-001
Root cause: ReviewOrder.jsx never checks if roundedTotal is zero before selecting 'prepaid' payment type and triggering Razorpay checkout. Two missing guards at L1551 and L1609 (plus retry copies at L1745/L1785).
Classification: FE (logic gap)
Confidence: HIGH
Steps used: 5/10
Evidence: §6 of this report
Recommendation: Register as BUG → Planning → Implementation (4 lines in ReviewOrder.jsx, CRITICAL hotspot, no Fast Lane). Also apply to 401-retry flow. Optional P3: hide payment selector when amount is zero.
Report: /app/memory/change_requests/INV-2026-10-25-001-zero-amount-razorpay-redirect/INVESTIGATION_REPORT.md
```
