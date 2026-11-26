# BUG FIX REPORT — BUG-2026-10-25-002

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-2026-10-25-002 |
| **Role** | Role 5 — BUG FIX |
| **Date** | 2026-10-25 |
| **Reproduced** | YES — code trace: `Math.ceil(1.26) = 2` at orderService.ts L381/L529 |

## Root cause

**CODE_ERROR** — `orderService.ts` unconditionally applied `Math.ceil()` to `order_amount` at two sites. `ReviewOrder.jsx` already handles rounding (ceil when `total_round='Yes'`, pass-through when `'No'`), so the value arriving in `orderData.totalToPay` is already final. The extra `Math.ceil` was redundant for rounded restaurants and **destructive** for non-rounded ones.

## Fix

| # | File | Line | Before | After |
|---|------|------|--------|-------|
| F-1 | `orderService.ts` | L382 | `order_amount: Math.ceil(orderData.totalToPay \|\| 0)` | `order_amount: parseFloat((orderData.totalToPay \|\| 0).toFixed(2))` |
| F-2 | `orderService.ts` | L531 | `order_amount: Math.ceil(totalToPay)` | `order_amount: parseFloat((totalToPay \|\| 0).toFixed(2))` |

Code markers: `// BUG-2026-10-25-002` at both sites.

## Verification

- Testing agent iteration_27: all code verifications PASS
- `Math.ceil` no longer appears on any `order_amount` line
- 2 `BUG-2026-10-25-002` markers found
- Frontend compiles with 0 new warnings
- Backend health PASS

## Scope expansion: NONE

```text
Bug fix complete: BUG-2026-10-25-002
Reproduced: YES
Root cause: CODE_ERROR (unconditional Math.ceil in orderService.ts)
Files changed: frontend/src/api/services/orderService.ts (2 lines)
Verified: testing agent iteration_27 PASS
Scope expansion: NONE
Registry sync: YES
Next: QA — owner smoke on restaurant 510 (₹1.26 order → verify payload shows 1.26)
```
