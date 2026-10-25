# INTAKE — BUG-2026-10-11-005
## CRM Coupon Applied Twice — Once by Scan & Order App, Once by POS

**ID:** BUG-2026-10-11-005
**Date registered:** 2026-10-11
**Registered by:** Role 6 — Investigation Agent
**Source:** Live order reproduction — Order #015065, restaurant 689, coupon MARRY
**Status:** BLOCKED ON POS — POS brief sent, awaiting reply

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P0 — customer charged ₹0, revenue loss on every order with a CRM coupon |
| Risk | CRITICAL — affects every order where a CRM scan-and-order coupon is applied |
| Blast radius | LARGE — all restaurants using CRM coupons via scan & order |
| Duplicate check | DISTINCT — related to INV-2026-10-11-001 I6 but root cause now fully confirmed |
| Fix owner | POS team (no code change on our side required) |

---

## Evidence — Order #015065

**Payload we sent (correct):**
```json
{
  "coupon_code": "MARRY",
  "coupon_discount_amount": 197,
  "order_amount": 74,
  "order_sub_total_amount": 267,
  "order_sub_total_without_tax": 70,
  "total_gst_tax_amount": 3.5,
  "round_up": 0.5
}
```

**Math verification:**
```
Items:           ₹267
MARRY discount: -₹197  (CRM scan-and-order channel validated)
Subtotal:        ₹70
GST 5%:          ₹3.50
Total:           ₹73.50  → rounded → ₹74  ← order_amount: 74 = CORRECT
```

**POS response (wrong):**
```json
{
  "message": "Order placed successfully!",
  "order_id": 1233109,
  "total_amount": 0
}
```

---

## Root Cause

Our scan & order app validates coupon MARRY via CRM scan-and-order channel.
CRM returns `computed_discount: 197`.
Our app applies the discount and calculates `order_amount: 74` correctly.
Our app sends `coupon_code: "MARRY"` to POS (required — POS uses this code to notify CRM of usage at payment time).
POS receives `coupon_code: "MARRY"` → calls CRM independently under POS channel → CRM applies MARRY again → POS recalculates total → `total_amount: 0`.

**The coupon is applied twice:**
1. By our app (scan-and-order channel) — correct ✅
2. By POS (POS channel) — duplicate, should not happen ❌

**Our `order_amount` is ignored by POS** — POS always recalculates its own total from items + its own coupon application.

---

## Why We Cannot Fix This on Our Side

The `coupon_code` MUST be sent to POS. POS uses it to notify CRM at payment time that the coupon was used (usage tracking). Sending an empty code breaks the usage tracking chain.

The fix must come from POS: when `coupon_discount_amount > 0` is present in the payload, POS should treat the coupon as pre-applied and use `order_amount` directly rather than re-validating via CRM.

---

## Previous Orders Affected

| Order | Items | Our order_amount | POS total_amount | Result on success page |
|---|---|---|---|---|
| #015060 (saurav, Oct 10) | ₹300 | ₹6 (was wrong, separate bug) | ₹109 (POS applied MARRY = ₹197) | Header ₹109, bill ₹6 |
| #015065 (Oct 11) | ₹267 | ₹74 (CORRECT) | ₹0 (POS over-applied MARRY) | ₹0 shown |

Note: #015060's `order_amount: 6` was due to INV-2026-10-11-002 (separate state bug).
#015065's `order_amount: 74` is correct — confirms POS is the issue, not our calculation.

---

## Status

```
BLOCKED ON POS
Brief sent: memory/inbox/OUTBOUND_TO_POS_COUPON_DOUBLE_APPLICATION_2026-10-11.md
Waiting for: POS team response on whether coupon_discount_amount > 0 
             can signal "pre-applied, do not reapply"
No code change on our side until POS replies.
```
