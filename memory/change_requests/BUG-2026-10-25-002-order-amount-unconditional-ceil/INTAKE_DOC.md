# INTAKE DOC — BUG-2026-10-25-002

## Item Identity

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-2026-10-25-002 |
| **Title** | `order_amount` unconditionally ceiled in `orderService.ts` — customer overcharged when `total_round='No'` (₹1.26 displayed → ₹2 charged) |
| **Classification** | BUG — customer-visible, **money path**, **P0 CRITICAL** |
| **Date Registered** | 2026-10-25 |
| **Reported By** | Owner — screenshot: restaurant 510 (`total_round='No'`), grand total ₹1.26, but `order_amount:2` in payload, Razorpay charges ₹2 |
| **Severity** | **P0** — customer overcharged real money on every fractional-total order where rounding is disabled |
| **Risk** | **CRITICAL** — money path, `orderService.ts` is a shared service for all order writes |
| **Status** | INTAKE |

---

## 1. Problem

`orderService.ts` applies `Math.ceil()` unconditionally to `order_amount` at two sites (L381 placeOrder, L529 updateCustomerOrder). `ReviewOrder.jsx` correctly passes the final amount (ceiled or not, depending on `total_round`), but `orderService` re-ceils it — so when `total_round='No'` and the total is fractional, the customer is overcharged.

**Evidence:** Restaurant 510 (`total_round='No'`), item ₹1.20 + CGST ₹0.03 + SGST ₹0.03 = ₹1.26 grand total. Payload sends `order_amount:2` (`Math.ceil(1.26)`). Razorpay charges ₹2.

## 2. Root cause

| # | File | Line | Code | Problem |
|---|------|------|------|---------|
| G-1 | `orderService.ts` | L381 | `order_amount: Math.ceil(orderData.totalToPay \|\| 0)` | Unconditional ceil on placeOrder |
| G-2 | `orderService.ts` | L529 | `order_amount: Math.ceil(totalToPay)` | Unconditional ceil on updateCustomerOrder |

## 3. Scope

**IN:** 2 lines in `orderService.ts` (L381, L529). Replace `Math.ceil` with `parseFloat(...toFixed(2))`.

**OUT:** `ReviewOrder.jsx` rounding logic (already correct), `round_up` field (already correct), all other payload fields.

## 4. Duplicate check: DISTINCT

No prior item addresses this. `ROUND_UP_PAYLOAD_GAP` fix (code markers in ReviewOrder) addressed the `round_up` field — but never fixed the `order_amount` ceil.

## 5. Blast radius

**SMALL** (2 lines, 1 file) / **P0 CRITICAL** (money path — every restaurant with `total_round='No'` and fractional totals).

```text
Intake complete: BUG-2026-10-25-002
Classification: BUG (customer-visible, money path)
Severity: P0
Risk: CRITICAL
Duplicate check: DISTINCT
Evidence: screenshot, code trace, live POS data (510 total_round='No')
Blast radius: SMALL files / P0 CRITICAL
Next: Bug Fix (Role 5) — owner approved immediate fix
```
