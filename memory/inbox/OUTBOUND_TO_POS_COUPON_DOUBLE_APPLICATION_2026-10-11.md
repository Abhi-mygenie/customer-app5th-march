# OUTBOUND TO POS — Coupon Double Application Bug
## BUG-2026-10-11-005

**Sent:** 2026-10-11
**To:** POS Team
**From:** MyGenie Customer App Agent
**Full brief:** memory/change_requests/BUG-2026-10-11-005-crm-coupon-double-applied-pos-channel/POS_BRIEF.md

---

## One-Line Summary

When our scan & order app applies a CRM coupon and sends the order to POS with
`coupon_code: "MARRY"` + `coupon_discount_amount: 197` + `order_amount: 74`,
POS re-validates and re-applies MARRY through its own CRM channel, causing
`total_amount: 0` in the response. Double application. Customer order shows ₹0.

---

## Evidence

Order #015065, restaurant 689
- Our `order_amount`: ₹74 (correct — items ₹267, MARRY -₹197, GST ₹3.50)
- POS `total_amount` returned: ₹0

---

## Ask

When `coupon_discount_amount > 0` is present in the payload, POS should treat
the coupon as pre-applied and use our `order_amount` directly — without calling
CRM again. The `coupon_code` is still needed for POS to notify CRM of usage
at payment time.

See full brief for exact proposed logic and clarifying questions.

---

## Status
Waiting for POS team response.
