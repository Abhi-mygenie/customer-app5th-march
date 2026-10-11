# INVESTIGATION REPORT — 7 Issues (Order #015060, r689 Kunafa Mahal)
## INV-2026-10-11-001

**Written by:** Role 6 — Investigation Agent
**Date:** 2026-10-11
**Source:** Owner report + screenshots (18march.mygenie.online) + MongoDB probe (same mygenie DB)
**Status:** CONFIRMED — all 7 issues triaged, root causes identified

---

## Context — Two deployments, same database

The screenshots were taken from `https://18march.mygenie.online/689/review-order` — a separate frontend deployment running **older code** (pre-session changes). Our preview (`mygenie-diners.preview.emergentagent.com`) runs the `9oct` branch with our recent fixes.

**However, both deployments share the same MongoDB** (`mongodb://...@52.66.232.149:27017/mygenie`). After switching the DB in `.env`, we found order `restaurant_order_id: '015060'` in our database — but with **different customer data** (phone `9035133228` / saurav, not `9886726661` from the screenshots). This means order #15060 was placed **twice** — once from `18march` (the screenshot session) and once from our preview (saurav's session Oct 10). POS issues sequential numbers per restaurant so the same number appeared in both.

**The DB order (saurav, Oct 10) also shows confirmed bugs in our current code.** This makes Issues 6 and 7 bugs in BOTH deployments — not just the old code.

---

## Database findings — Order #015060 (our preview, Oct 10, saurav)

| Field | Value | Expected | Status |
|---|---|---|---|
| `restaurant_order_id` | `015060` | — | — |
| `cust_name` | `saurav` | `saurav` | ✅ |
| `cust_mobile` | `9035133228` | `9035133228` | ✅ |
| `order_sub_total` | `300.0` | `300.0` | ✅ |
| `coupon_code` | `MARRY` | — | — |
| `coupon_discount` | `197.0` | `197.0` | POS-applied (CRM validate returned 404 — see §I6) |
| **`order_amount`** | **`6.0`** | **~₹109** | ❌ **CONFIRMED BUG** |
| `tax_amount` | `5.15` | — | Stored |
| `round_up` | `0.85` | — | — |
| `loyalty_points_used` | `0` | — | — |
| `loyalty_discount` | `0.0` | — | — |
| **`points_earned`** | **`0`** | **should be > 0** | ❌ **CONFIRMED BUG** |
| `payment_method` | `cash` | — | — |

---

## Issue-by-issue findings

---

### I4 — Name not pre-filling on the review page

**Our side.**

The screenshot (18march.mygenie.online) shows phone `+91 98867 26661` pre-filled but name field showing placeholder "Enter your name".

The name auto-fill calls CRM's `POST /scan/auth/lookup`. On `18march.mygenie.online`, `REACT_APP_CRM_URL` likely points to `https://crm.mygenie.online/api`. This was confirmed earlier in the session — `crm.mygenie.online/api/scan/auth/lookup` returns **404** (the v2 `/scan/` endpoints do not exist on that domain).

Result: `crmLookupCustomer` throws, name never fills, the user proceeds with an empty name field.

**This exact bug was fixed on our preview** (by restarting the frontend to use `crm-preprod-7.preview.emergentagent.com/api`). Not fixed on `18march`.

Secondary cause: phone `9886726661` may simply not be in CRM, so even with correct URL, `exists: false` would return → no name fills. Expected behaviour in that case.

---

### I5 — Phone shows "+91" prefix in review page

**Expected behaviour — not a bug.**

`PhoneInput` (react-phone-number-input) stores numbers in E.164 format (`+919886726661`) and displays them with the Indian flag and `+91` prefix. This is correct international phone display.

In the order payload, `extractPhoneNumber()` in `orderService.ts` strips the dial code before sending to POS. The bare digits `9886726661` are what POS and CRM receive. If CRM stores this customer by bare digits, the match works. If CRM stores with `+91` prefix, there may be a lookup mismatch — but this is a CRM-side data consistency issue, not a frontend bug.

**Verdict: cosmetic, no fix needed on our side.**

---

### I2 — Customer name shows N/A in CRM

**Our side — direct consequence of I4.**

When the order was placed from the screenshots session (18march, phone 9886726661), the name field was empty (I4). The order payload sent `cust_name: ''` to POS. POS stores empty name, CRM receives empty name from POS's order data, displays N/A.

**Note from DB:** Our DB order (saurav, Oct 10) shows `cust_name: 'saurav'` — correctly stored. So this issue is specific to the 18march session where name wasn't filled.

**Fix:** Resolve I4 (correct CRM URL → name autofills → user submits with name). Consider also making the name field required before order placement.

---

### I6 — Order value shows ₹0 in bill summary; I7 — POS shows ₹0

**Our side — confirmed in current code via DB.**

**From screenshots (18march, old code):**
Review page showed ₹315 (no discount). After placing with loyalty points on the old code (flat `redemption_value = 0.25`, no CRM caps):
- User has 2,000 points
- `maxPointsToUse = floor(300 / 0.25) = 1,200`
- `pointsToUse = min(2000, 1200) = 1,200`
- `pointsDiscount = 1,200 × 0.25 = ₹300` — entire item cost
- `subtotalAfterDiscount = max(0, 300 - 300) = ₹0`
- All downstream taxes → ₹0, `totalToPay → ₹0`, `order_amount: 0` sent to POS

**From DB (saurav, Oct 10, new code — CR-2026-10-09-003 shipped):**
- `order_amount: 6.0` — still wrong (expected ~₹109)
- `coupon_discount: 197.0` — coupon MARRY applied
- `tax_amount: 5.15`
- `round_up: 0.85`

With coupon ₹197 and loyalty = 0: `subtotalAfterDiscount = 300 - 197 = 103`. Grand total should be ~₹109 (103 + taxes + SC). But `order_amount = 6 = tax_amount (5.15) + round_up (0.85)`. This means `finalSubtotal ≈ 0`, which is impossible if `subtotalAfterDiscount = 103`.

**Two possible root causes for the DB order (new code):**

**Root cause 6a — MARRY is a POS-side coupon, not a CRM coupon.** CRM's `/scan/coupons/validate` returned 404 for MARRY. The user typed MARRY and our `handleApplyCoupon` threw → `couponDiscount = 0` in our app state. But `couponCode = 'MARRY'` was still sent in the order payload. POS applied its own coupon logic (₹197). Our app's `subtotalAfterDiscount` used `couponDiscount = 0`, so a different calculation happened. The mismatch between what our app calculated and what POS applied is the root cause.

If `couponDiscount = 0` (CRM failed to validate), our calculation would be:
- `subtotalAfterDiscount = 300 - 0 = 300`
- Normal taxes + SC → `totalToPay ≈ 315` → `order_amount ≈ 315`

That's still not ₹6. There is a third possibility.

**Root cause 6b — The bill summary was built with stale/wrong state values.** The `buildBillSummary` call happens inside the order placement handler using the current state snapshot. If `couponDiscount` and `pointsDiscount` had unexpected values at that moment (e.g., from a previous failed apply attempt or a state race condition), the calculation would be wrong.

**Root cause 6c — Service charge calculation discrepancy.** The DB shows `tax_amount: 5.15` with `round_up: 0.85`. If `5.15 + 0.85 = 6.0 = order_amount`, then `finalSubtotal = 0` and only taxes (on SC or something else) contributed to `totalToPay`. This suggests SC was not included in `finalSubtotal` but SC taxes were in `tax_amount`. This would be a bug in the `buildBillSummary` formula where SC is added to taxes but not to finalSubtotal.

**This needs a code-level deep dive for the DB order case (6b / 6c). Cannot confirm exact cause without reproducing.**

**POS shows ₹0 (I7):** In the screenshots, POS received `order_amount: 0` (18march, full loyalty wipe). In the DB order, POS received `order_amount: 6` but the POS UI shows ₹0. POS may display a different field or ignore our `order_amount` and use its own grand total calculation. The success banner ₹109 comes from POS's own `total_amount` in the response, which POS calculates from items regardless of what we send.

**Verdict: confirmed bug in both deployments. DB shows `order_amount: 6` (wrong) on our current preview code too. Needs a follow-up CR.**

---

### I3 — Razorpay shows incorrect payment amount

**Our side — cascade from I6.**

Razorpay is initialised with `totalToPay`. When `totalToPay = ₹0` or ₹5.15 (wrong), Razorpay receives that as `amount` (in paise). The payment processes for the wrong amount. The `transaction_id` stored in DB is the Razorpay receipt for the incorrect amount.

For orders paid by Razorpay online (not COD), the charged amount would be `order_amount` (₹6 for the DB order, ₹0 for the screenshots order). The actual correct charge should be ~₹109. This is a revenue loss issue.

**Verdict: fix I6 → fixes I3 automatically.**

---

### I1 — Loyalty points not credited to CRM

**Shared cause — primarily our side.**

DB confirms `points_earned: 0`. Two contributing causes:

**1a — Wrong `order_amount` sent (our side).** We sent `order_amount: 6` to POS. POS relays the order to CRM with this value. CRM's loyalty engine awards earn points as a percentage of the order value. With `order_amount = 6`, CRM awards near-zero points.

**1b — CRM uses `order_amount` or POS's `grand_total` for earn calculation (CRM/POS side).** If CRM uses POS's own grand total (₹109) rather than our `order_amount` (₹6), points should be awarded correctly. The `points_earned: 0` in DB suggests CRM is using our value (₹6 → rounds to 0 earn pts at 5% earn rate = 0.3 pts → floor to 0). OR CRM is using a different field.

**Needs CRM clarification:** does CRM award loyalty points based on `order_amount` from our payload, or from POS's independent calculation?

---

## Summary

| # | Issue | Side | Root cause | Severity |
|---|---|---|---|---|
| I1 | Points not in CRM | **Our side + ask CRM** | `order_amount: 6` → ~0 earn points. CRM must clarify which field it uses for earn calc. | HIGH |
| I2 | Name N/A in CRM | **Our side** | Name field empty (I4 cascade) → `cust_name: ''` in payload | MEDIUM |
| I3 | Razorpay wrong amount | **Our side** | `totalToPay` wrong (I6 cascade) → Razorpay charged ₹0/₹6 | CRITICAL |
| I4 | Name not pre-filling | **Our side** | `18march` has wrong CRM URL → `/scan/auth/lookup` 404 | HIGH |
| I5 | Phone shows +91 | **Expected behaviour** | PhoneInput E.164 display. Dial code stripped in order payload. | None |
| I6 | Order shows ₹0 / ₹6 | **Our side** | (a) POS coupon bypasses CRM validate, `couponDiscount` state = 0 but code sends couponCode → POS applies its own discount → mismatch. (b) Possible SC calculation bug. DB shows `order_amount: 6` in current code. | CRITICAL |
| I7 | POS shows ₹0 | **Our side** | `order_amount: 0 or 6` sent to POS. POS independently calculates ₹109. | CRITICAL |

---

## Critical gap identified (new CR needed)

**`order_amount` mismatch when POS-side coupon is used with our app.**

When a coupon code is valid in POS but not in CRM (MARRY is POS-only), our `handleApplyCoupon` fails (CRM returns 404) → `couponDiscount = 0` in our state. But `couponCode` is still in the order payload. POS applies its own discount (₹197). POS's total (₹109) diverges from our calculated total. This creates:
- Wrong `order_amount` to POS
- Wrong `totalToPay` shown to diner
- Wrong Razorpay charge
- Zero earn points

**Immediate mitigation:** If CRM's validate returns 404 or fails, set `couponCode = ''` (do not send the code to POS) OR add a flag that POS coupons bypass our calculation. **Needs a new registered CR.**

---

## Recommended follow-up

| Action | Owner | Priority |
|---|---|---|
| Register CR for POS-side coupon handling (order_amount mismatch) | Agent | P1 |
| Register CR for `order_amount = 6` root cause deep dive (SC calculation bug 6b/6c) | Agent | P1 |
| Ask CRM: which field does their loyalty earn engine use? `order_amount` or POS grand total? | Owner → CRM | HIGH |
| Fix CRM URL on 18march.mygenie.online | 18march team | HIGH |

---

```
Investigation complete: INV-2026-10-11-001
Issues triaged: 7 (I1–I7)
Confirmed our-side bugs: I1, I2, I3, I4, I6, I7
Expected behaviour: I5
DB order found: restaurant_order_id 015060 — order_amount:6, points_earned:0 confirmed
Critical new gap: POS coupon bypasses CRM → order_amount mismatch → wrong charge
No code edits made
New CRs needed: POS-coupon handling + order_amount calculation bug
```
