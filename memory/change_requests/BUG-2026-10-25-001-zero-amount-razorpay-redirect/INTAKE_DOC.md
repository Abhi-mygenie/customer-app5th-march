# INTAKE DOC — BUG-2026-10-25-001

## Item Identity

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-2026-10-25-001 |
| **Title** | Zero-amount order redirects to Razorpay (₹1 charge) — when loyalty/coupon fully covers bill, app should place order directly as postpaid |
| **Classification** | BUG — customer-visible, **money path** (customer charged ₹1 when they owe ₹0) |
| **Date Registered** | 2026-10-25 |
| **Reported By** | Owner: "If I use loyalty points or coupon and actual amount to pay is zero, it still redirects to Razorpay asking ₹1 payment" |
| **Severity** | **P1** — customer is wrongly charged real money |
| **Risk** | **CRITICAL** — `ReviewOrder.jsx` is a CRITICAL hotspot per Alpha v0.1 Part C; payment/money logic per §6 R6. **No Fast Lane.** |
| **Status** | INTAKE |
| **Source investigation** | `INV-2026-10-25-001-zero-amount-razorpay-redirect/INVESTIGATION_REPORT.md` |

---

## 1. Problem

When a customer uses loyalty points and/or a coupon code that fully covers the bill (`roundedTotal = 0`), the app still:
1. Sends `paymentType: 'prepaid'` to POS
2. POS returns a `razorpay_id`
3. App opens Razorpay checkout modal
4. Razorpay minimum is ₹1 → customer is asked to pay ₹1

**Expected:** When `roundedTotal <= 0`, skip Razorpay entirely, send `paymentType: 'postpaid'`, and place the order directly.

## 2. Root cause

Two missing guards in `ReviewOrder.jsx`:

| # | Line | Current code | Gap |
|---|------|-------------|-----|
| G-1 | L1551 | `selectedPaymentType = paymentMethod === 'online' ? 'prepaid' : 'postpaid'` | Never checks if `roundedTotal <= 0` |
| G-2 | L1609 | `shouldProcessRazorpay = paymentMethod === 'online' && response?.razorpay_id && hasKey` | Never checks if `roundedTotal > 0` |
| G-3 | L1745 | Same as G-1 in 401-retry flow | Same gap |
| G-4 | L1785 | Same as G-2 in 401-retry flow | Same gap |

## 3. Scope

**IN:** 4 lines in `ReviewOrder.jsx` (2 main flow + 2 retry flow). Optional P3: hide payment selector when `roundedTotal <= 0`.

**OUT:** Backend `server.py` (unchanged). `orderService.ts` (unchanged — paymentType is a passthrough string). Edit-order flow (always postpaid, not affected).

## 4. Duplicate check: DISTINCT

No prior item addresses zero-amount Razorpay redirect.

## 5. Blast radius

**SMALL files (1 file) / CRITICAL criticality** — money path, CRITICAL hotspot. But the change is a guard addition, not a restructure.

## 6. Evidence

See `INV-2026-10-25-001/INVESTIGATION_REPORT.md` §2 (line-by-line trace), §3 (exact gaps), §6 (evidence list).

```text
Intake complete: BUG-2026-10-25-001
Classification: BUG (customer-visible, money path)
Severity: P1
Risk: CRITICAL
Duplicate check: DISTINCT
Evidence: captured (INV-2026-10-25-001)
Blast radius: SMALL files / CRITICAL criticality
Next: Planning — say "Planning for BUG-2026-10-25-001"
```
