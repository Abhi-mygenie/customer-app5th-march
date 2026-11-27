# INVESTIGATION REPORT — INV-2026-11-27-002
## Transferred Orders card — render conditions confirmed

**ID:** INV-2026-11-27-002  
**Type:** INVESTIGATION  
**Date:** 2026-11-27  
**Role:** INVESTIGATION (Role 6)  
**Status:** CLOSED  
**Classification:** FE / CODE_TRACE  
**Confidence:** HIGH  
**Steps used:** 4/10  

---

## 1. Owner question (verbatim)

> "confirm this transferred orders key only appear when they have value right? what the condition?"

Screenshot provided: OrderSuccess page at `/69/order-success` showing:
- Order #000102, ₹1400.00 + APS, Room a1
- **Transferred Orders (2) ₹198** — collapsed card, before Bill Summary ✅
- Bill Summary showing: Item Total ₹1400.00 + APS, Subtotal ₹1400.00 + APS, **Transferred Total ₹198.00** (orange), **Grand Total ₹1598.00 + APS** ✅

This screenshot confirms CR-2026-11-27-004 (Phase 2 redesign) is working correctly in production.

---

## 2. The 3 gate conditions (all confirmed by code trace)

### Gate 1 — API → State (OrderSuccess.jsx line 380)

```js
// fetchOrderStatus() — runs on mount + every 60s poll
if (orderDetails.associatedOrders?.length > 0) {
  setAssociatedOrders(orderDetails.associatedOrders);
}
```

**Condition:** `associatedOrders` state is only populated when the API returns **≥1 entry** in `associated_order_list`.  
If the API returns `[]` or the field is absent → state stays at initial `[]` (from `useState([])`).  
**Note:** State is never reset back to `[]` on subsequent polls (see §3 observation).

---

### Gate 2 — The collapsible card (OrderSuccess.jsx line 723)

```jsx
{associatedOrders.length > 0 && (
  <div className="order-success-transferred-card" data-testid="transferred-orders-section">
    ...
  </div>
)}
```

**Condition:** The entire **"Transferred Orders (N) ₹X"** collapsible card renders only when **`associatedOrders.length > 0`**.

If array is empty → **nothing renders**. No card, no empty placeholder, no space reserved.

---

### Gate 3 — The "Transferred Total" bill row (OrderSuccess.jsx line 855)

```jsx
{transferredTotal > 0 && (
  <div className="bill-row bill-row-transferred" data-testid="bill-row-transferred-total">
    <span className="bill-label">Transferred Total</span>
    <span className="bill-value">₹{transferredTotal.toFixed(2)}</span>
  </div>
)}
```

where:
```js
// line 201 — derived constant, computed every render
const transferredTotal = associatedOrders.reduce(
  (s, o) => s + (parseFloat(o.amount) || 0), 0
);
```

**Condition:** The **"Transferred Total" row** inside Bill Summary renders only when **`transferredTotal > 0`** (sum of all order amounts > 0).  
Independent of Gate 2 — even if the array had entries with `amount = 0`, the row would not appear.

---

### Grand Total (always renders — Gate 4 is not needed)

```js
const combinedTotal = (effBS.grandTotal || 0) + transferredTotal;
// When transferredTotal = 0: combinedTotal = effBS.grandTotal (no visual change)
```

Grand Total always shows. When no transferred orders, `transferredTotal = 0` → `combinedTotal = grandTotal` → display identical to before. No guard needed.

---

## 3. Summary table

| Element | Condition | Zero-value safe? |
|---|---|---|
| Entire "Transferred Orders" card | `associatedOrders.length > 0` | ✅ hides if array is empty |
| Each order row inside the card | array map — always when card visible | n/a |
| "Transferred Total" bill row | `transferredTotal > 0` | ✅ hides if all amounts are zero |
| Grand Total | always visible — adds 0 when no transferred | ✅ no visual change |

---

## 4. Non-blocking observation

Gate 1 never resets `associatedOrders` to `[]` after it has been set:

```js
// sets only — never clears
if (orderDetails.associatedOrders?.length > 0) {
  setAssociatedOrders(orderDetails.associatedOrders);
}
```

**Practical impact:** Near-zero in production. The 60-second poll updates the same data. The page navigates away when order is paid/cancelled. If defensive reset behavior is ever wanted, the guard should be changed to `setAssociatedOrders(orderDetails.associatedOrders ?? [])` unconditionally.  
**Not a bug — flagged for owner awareness only.**

---

```
Investigation complete: INV-2026-11-27-002
Answer: YES — card only appears when associatedOrders.length > 0.
        Transferred Total bill row has second independent guard: transferredTotal > 0.
        Grand Total always renders — when no transferred orders, combinedTotal = grandTotal (unchanged).
Classification: FE / CODE_TRACE — no code change needed.
Confidence: HIGH
Steps used: 4/10
Recommendation: No action. Conditions are correct and working as confirmed in owner screenshot.
```
