# POS BRIEF — Double Coupon Application
## BUG-2026-10-11-005

**To:** POS Team
**From:** MyGenie Customer App (Scan & Order)
**Date:** 2026-10-11
**Priority:** P0 — Customer charged ₹0 on every coupon order
**Ref:** Order #015065, restaurant 689 (Kunafa Mahal)

---

## What Is Happening

When a customer scans a QR code, uses our ordering app, and applies a CRM coupon,
the final order amount comes out as ₹0 at POS. The customer places the order, the
success screen shows ₹0, and POS has recorded the order as ₹0.

---

## Why This Is Happening — The Double Application

Our scan & order app validates the coupon with CRM before the order is placed.
CRM confirms the discount. Our app applies it and calculates the correct final total.
Then we send the order to POS — and this is where the problem starts.

**Step by step:**

```
1. Customer applies coupon MARRY in our app
2. Our app  →  CRM (scan-and-order channel):  "Is MARRY valid?"
3. CRM responds:  valid = true, discount = ₹197
4. Our app applies ₹197 discount:
      Items:    ₹267
      MARRY:   -₹197
      Subtotal: ₹70
      GST:      ₹3.50
      Total:    ₹74        ← we calculate this

5. Our app sends order to POS:
      coupon_code:             "MARRY"   ← we MUST send this for CRM tracking at payment
      coupon_discount_amount:   197      ← discount we already applied
      order_amount:              74      ← our correct final total

6. POS receives coupon_code "MARRY"
7. POS  →  CRM (POS channel):  "Apply MARRY"
8. CRM applies MARRY again for POS channel
9. POS recalculates total with its own coupon discount
10. POS returns total_amount: 0          ← double application caused this
```

**Evidence — actual payload and response:**

Payload sent by our app (order #015065):
```json
{
  "coupon_code":             "MARRY",
  "coupon_discount_amount":  197,
  "order_amount":            74,
  "order_sub_total_amount":  267,
  "order_sub_total_without_tax": 70,
  "total_gst_tax_amount":    3.5,
  "round_up":                0.5
}
```

POS response:
```json
{
  "order_id": 1233109,
  "total_amount": 0
}
```

Our `order_amount: 74` was correct. POS returned `total_amount: 0`.

---

## Why We Cannot Fix This by Removing the Coupon Code

We know the simplest fix from our side would be to send `coupon_code: ""`.
But we cannot do this — POS needs the coupon code to notify CRM of usage
at payment time so the coupon gets marked as used. Removing the code
breaks usage tracking.

---

## What We Need From POS

**One behavioural change:**

When our payload contains `coupon_discount_amount > 0`, treat the coupon as
**already validated and applied** by the scan & order channel.

```
IF coupon_discount_amount > 0 in payload:
    → do NOT call CRM to apply the coupon again
    → use order_amount from our payload as the final total
    → still store coupon_code in the order record
    → still notify CRM of coupon usage at payment time (existing flow — no change)

IF coupon_discount_amount == 0 in payload:
    → existing POS coupon flow unchanged
```

**In plain terms:**
`coupon_discount_amount > 0` means "this discount was already applied upstream —
just record the code and use the total we calculated." It is a signal, not a
request to apply.

---

## Clarifying Questions for POS Team

1. When `coupon_discount_amount > 0` is present, can POS skip its own coupon
   validation/application and use our `order_amount` directly?

2. Does POS have a way to distinguish "apply this coupon" vs
   "record that this coupon was applied upstream"?

3. Is there an existing field or flag in the payload POS already checks
   for this purpose?

4. If POS cannot use `order_amount` directly, can POS use
   `order_sub_total_without_tax` (= 70 in our payload) as the pre-discount
   subtotal and skip coupon application?

---

## Impact If Not Fixed

Every order placed through scan & order with a CRM coupon will show
`total_amount: 0` at POS. This means:

- POS records show ₹0 for coupon orders
- Loyalty earn points are calculated on ₹0 → customer earns nothing
- Revenue reporting at POS is wrong
- Razorpay (online payment) would charge ₹0 if customer selects online payment

---

## No Change Needed From Our Side Until POS Replies

Our payload is correct. We are not making any code changes until we hear
from POS on the questions above.

Please reply with your findings so we can align on the right approach.
