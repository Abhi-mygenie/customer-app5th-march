# QA HANDOVER — CR-2026-11-25-003

**ID:** CR-2026-11-25-003
**Status:** IMPLEMENTED — ready for QA
**Date:** 2026-11-25
**Test report:** /app/test_reports/iteration_32.json (non-edit regression: PASS, code checks: PASS)

---

## What was changed

3 files, ~60 lines, zero calculation logic change:

| File | Change |
|---|---|
| `pages/ReviewOrder.jsx` | New Items section now renders FIRST. PreviousOrderItems moved after it. 2 split price rows added in Price Breakdown (edit mode only). |
| `components/PreviousOrderItems/PreviousOrderItems.jsx` | Collapsed by default (`useState(false)`). Single row header with item count + subtotal + chevron. Tap to expand/collapse. |
| `components/PreviousOrderItems/PreviousOrderItems.css` | Collapse header styles + chevron rotation + slide-down animation. |

---

## 13-point verification matrix

| # | Test | Expected | Status |
|---|---|---|---|
| V-1 | Non-edit mode ReviewOrder | "Order Items" label, no collapsed pill, no split price rows | PASS (iteration_32) |
| V-2 | Edit mode — section order | New Items section appears ABOVE Previously Ordered | Code PASS |
| V-3 | Edit mode — collapsed pill visible | `data-testid="previous-order-collapsed-header"` shows: 🔒 Previously Ordered · N items · ₹X ▼ | Code PASS |
| V-4 | Tap collapsed pill | Items expand with slide animation; chevron rotates ▲ | Needs live smoke |
| V-5 | Tap expanded pill | Items collapse; chevron returns ▼ | Needs live smoke |
| V-6 | Edit mode Price Breakdown | "New additions ₹Y" row (orange) above Item Total (`data-testid="row-new-additions"`) | Code PASS |
| V-7 | Edit mode Price Breakdown | "Previous order ₹Z" row (grey) above Item Total (`data-testid="row-previous-order"`) | Code PASS |
| V-8 | Item Total value | Equals new subtotal + previous subtotal — same as before CR | Code PASS |
| V-9 | Grand Total + button | "Update Order ₹X" value unchanged | Code PASS |
| V-10 | Qty change in edit mode | "New additions" row updates; "Previous order" stays fixed | Needs live smoke |
| V-11 | Cancelled previous item (status 3) | Excluded from item count in pill and subtotal | Code PASS |
| V-12 | Edit mode, 0 previous items | No collapsed pill; no split rows | Code PASS (guarded by `previousSubtotal > 0`) |
| V-13 | data-testids | `previous-order-collapsed-header`, `previous-order-expanded-list`, `row-new-additions`, `row-previous-order` present | Code PASS |

---

## How to trigger edit mode for V-4, V-5, V-10

1. Admin or POS: place an order on a table (e.g. Table 4, restaurant 541)
2. Customer scans the table QR → `LandingPage` detects existing order → calls `startEditOrder()`
3. Customer adds items to cart → navigates to Review Order
4. `isEditMode = true`, `previousOrderItems` populated from the placed order

---

## What was NOT changed (regression safety)

- `itemTotal = previousSubtotal + subtotal` — untouched (line 737)
- All API payloads (`buildOrderItems`, `buildPreviousItems`) — untouched
- `CartContext.js`, `AuthContext.jsx`, `orderService.ts` — untouched
- Non-edit mode layout — fully unchanged (all new code behind `isEditMode` guard)
