# QA HANDOVER — CR-2026-11-27-004
## OrderSuccess: Transferred Orders Redesign (Phase 2)

**ID:** CR-2026-11-27-004  
**Status:** IMPLEMENTED — ready for QA  
**Risk:** MEDIUM  
**Files changed:**
- `frontend/src/pages/OrderSuccess.jsx`
- `frontend/src/pages/OrderSuccess.css`

---

## What changed (plain English)

The "Transferred Orders" section on the Order Success page was redesigned:

| Before | After |
|---|---|
| Flat, non-collapsible card below Bill Summary | Collapsible card (default collapsed) **before** Bill Summary |
| No toggle/chevron | Swap icon + chevron toggle, header shows order count + total |
| Grand Total = current order only | Grand Total = current order + all transferred order amounts |
| No "Transferred Total" line in bill | "Transferred Total ₹X" line added above Grand Total in Bill Summary |

---

## Test cases

### T1 — Order with NO transferred orders
**How:** Any order that has no `associated_order_list` from the API  
**Expected:**
- No "Transferred Orders" card visible anywhere on the page
- Bill Summary shows NO "Transferred Total" row
- Grand Total = `billSummary.grandTotal` unchanged
- All existing bill rows (Item Total, Subtotal, CGST, SGST, etc.) unchanged

**data-testid:** `transferred-orders-section` must NOT be present in DOM

---

### T2 — Order with 1 transferred order (e.g. ₹99)
**How:** Order with `associated_order_list` containing one entry  
**Expected:**
- "Transferred Orders (1) ₹99" card visible **before** Bill Summary card
- Card is collapsed by default (order list not visible)
- Tapping card header expands it → shows "#000103 27 Nov ₹99" row
- Tapping again collapses it
- Bill Summary shows "Transferred Total ₹99.00" row between last tax row and Grand Total
- Grand Total = current `billSummary.grandTotal` + 99

**data-testids to verify:**
- `transferred-orders-section` present
- `toggle-transferred-orders-btn` tappable
- `transferred-orders-title` shows "Transferred Orders (1)"
- `transferred-orders-header-total` shows "₹99"
- `bill-row-transferred-total` present in DOM
- `bill-row-grand-total` shows updated combined total

---

### T3 — Order with 2 transferred orders (e.g. ₹99 + ₹99 = ₹198)
**How:** Order with 2 entries in `associated_order_list`  
**Expected:**
- Card header shows "Transferred Orders (2) ₹198"
- Expanded: 2 rows, one per order with ID + date + amount
- Bill Summary "Transferred Total ₹198.00"
- Grand Total = `billSummary.grandTotal` + 198

---

### T4 — APS order with transferred orders (regression guard)
**How:** Order that has APS items (unit_price=1) AND transferred orders  
**Expected:**
- Bill Summary Grand Total shows `₹{grandTotal+transferredTotal} + APS` (not just `₹grandTotal + APS`)
- Transferred Total row still shows the transferred amount (never masked — transferred orders are fully confirmed)
- If grandTotal+transferredTotal = 0 (pure APS edge), shows "APS"

**This test guards against BUG-2026-11-26-001 regression.**

---

### T5 — Layout order (regression guard)
**Expected sequence top-to-bottom:**
1. Hero card (Order Placed!)
2. Order card (#ID, Room/Table)
3. Items Ordered (collapsible)
4. **Transferred Orders (N)** (new, collapsible) ← IF orders present
5. Bill Summary (collapsible)
6. Order Status Tracker
7. Action buttons

If NO transferred orders: Items Ordered → Bill Summary directly (no gap card).

---

### T6 — No transferred orders card below Bill Summary (regression)
**Expected:** The old position (below Bill Summary) must have NO transferred orders card.  
After Bill Summary and before Order Status Tracker: no transferred card present.

---

## What must NOT change
- Items Ordered collapsible behavior — unchanged
- Bill Summary rows (Item Total, Discount, Service Charge, Subtotal, CGST, SGST, VAT, SC-CGST, SC-SGST) — unchanged
- APS masking on all other bill rows — unchanged
- Order status polling — unchanged
- Edit Order / Browse Menu buttons — unchanged
- Payment verification display — unchanged
- Table/Room display — unchanged

---

## Test credentials
- Phone: +919579504871 / Password: Qplazm@10
- Restaurant: 69 (The Goan Kitchen)
- Order with transferred orders: use an order that has `associated_order_list` returned by the API
  (requires a live order where another order was transferred to this table)

---

## Build status
- `yarn build` PASS (504KB JS, 40KB CSS)
- No ESLint errors
- No TypeScript errors

---

```
QA handover complete: CR-2026-11-27-004
Tests: T1–T6 (6 cases)
Key regression guards: T4 (APS masking), T5 (layout order), T6 (old position gone)
Files: /app/frontend/src/pages/OrderSuccess.jsx · /app/frontend/src/pages/OrderSuccess.css
Build: PASS
Next: QA execution (Role 4)
```
