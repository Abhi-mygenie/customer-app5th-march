# Planning & Implementation Doc — BUG-2026-11-27-003
## Transferred Orders Missing on Order Success

**Date:** 2026-11-27
**Risk:** MEDIUM
**Status:** QA_PASS (iteration_42.json — 7/7 tests PASS)

---

## 1. API probe results (live, 2026-11-27)

### Direct POS call
```
curl 'https://preprod.mygenie.online/api/v1/air-bnb/get-order-details/1579194' [headers]
→ associated_order_list: [{"id": 1579195, "restaurant_order_id": "000103", "order_amount": 99, "collect_bill": "2026-11-27 17:29:01"}]
```
**Owner added this field to the POS API.**

### Via backend proxy
```
GET /api/air-bnb/get-order-details/1579194
→ associated_order_list: [{"id": 1579195, "restaurant_order_id": "000103", "order_amount": 99, "collect_bill": "2026-11-27 17:29:01"}]
Total keys: 18 (was 17 before owner added the field)
```
**Backend proxy (server.py) passes it through automatically — `return response.json()` — no server.py change needed.**

### API data shape (confirmed)
```json
"associated_order_list": [
  {
    "id": 1579195,
    "restaurant_order_id": "000103",
    "order_amount": 99,
    "collect_bill": "2026-11-27 17:29:01"
  }
]
```
- `id` — POS order ID of transferred order
- `restaurant_order_id` — display token "#000103"
- `order_amount` — F&B amount in ₹ (integer)
- `collect_bill` — ISO-ish datetime "YYYY-MM-DD HH:MM:SS"

**Owner confirmed: F&B transfers only. Room rent (room_info.room_price) explicitly excluded.**

---

## 2. Code reality

```
server.py line 514: return response.json()  → proxy passes new field through ✓ NO CHANGE NEEDED
orderService.ts line 177: const rawDetails = orderData.details || []  → associated_order_list never read
orderService.ts line 260: return { orderId, orderAmount, ... billSummary }  → associatedOrders absent
OrderSuccess.jsx: 0 references to associated_order_list or transferred orders
```

---

## 3. Files changed — 3 (+ minor CSS)

| File | Change |
|------|--------|
| `frontend/src/api/services/orderService.ts` | Read `associated_order_list`, map to `associatedOrders[]`, add to return type + return object |
| `frontend/src/pages/OrderSuccess.jsx` | Add `associatedOrders` state, populate in `fetchOrderStatus`, render "Transferred Orders" card |
| `frontend/src/pages/OrderSuccess.css` | 6 new utility classes for the card |

**Files NOT changed:** `server.py`, `ReviewOrder.jsx`, cart/auth, `billSummary` grandTotal

---

## 4. Exact edits applied

### orderService.ts (3 edits)

**E-1 — Return type: add associatedOrders**
```typescript
associatedOrders?: Array<{ orderId: number; restaurantOrderId: string; amount: number; date: string }>;
```

**E-2 — After rawDetails (line ~179): read and map**
```typescript
const rawAssociated: any[] = (orderData as any).associated_order_list || [];
const associatedOrders = rawAssociated.map((a: any) => ({
  orderId:           a.id,
  restaurantOrderId: a.restaurant_order_id,
  amount:            Number(a.order_amount) || 0,
  date:              a.collect_bill || '',
}));
```

**E-3 — Return object: add associatedOrders**
```typescript
associatedOrders, // BUG-2026-11-27-003: transferred F&B orders
```

### OrderSuccess.jsx (3 edits)

**E-4 — State (after apiTableType state)**
```javascript
const [associatedOrders, setAssociatedOrders] = useState([]);
```

**E-5 — In fetchOrderStatus, after setApiTableType**
```javascript
if (orderDetails.associatedOrders?.length > 0) {
  setAssociatedOrders(orderDetails.associatedOrders);
}
```

**E-6 — Render (after Bill Summary card, before Order Status Tracker)**
```jsx
{associatedOrders.length > 0 && (
  <div className="order-success-transferred-card" data-testid="transferred-orders-section">
    <div className="order-success-transferred-header">
      <span className="order-success-transferred-title">
        Transferred Orders ({associatedOrders.length})
      </span>
      <span className="order-success-transferred-total">
        ₹{associatedOrders.reduce((s, o) => s + (o.amount || 0), 0).toFixed(0)}
      </span>
    </div>
    {associatedOrders.map(o => {
      const d = o.date ? new Date(o.date.replace(' ', 'T')) : null;
      const dateStr = d && !isNaN(d)
        ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
      return (
        <div key={o.orderId} className="order-success-transferred-row"
             data-testid={`transferred-order-${o.orderId}`}>
          <span className="order-success-transferred-id">#{o.restaurantOrderId}  {dateStr}</span>
          <span className="order-success-transferred-amount">₹{(o.amount || 0).toFixed(0)}</span>
        </div>
      );
    })}
  </div>
)}
```

---

## 5. Pending — Grand Total combined view (NOT implemented, planning done)

**Owner asked (2026-11-27):** "Can we show something like this — Grand Total?" (referencing POS checkout screenshot showing Food Total + Transferred Total + Grand Total).

**Analysis complete — feasible, LOW risk:**

```
Food Total         ₹100   ← billSummary.grandTotal
Transferred Total   ₹99   ← sum(associatedOrders.amount)
─────────────────────────
GRAND TOTAL        ₹199   ← orange, only when associatedOrders.length > 0
```

**APS masking:** reuses existing `effBS` / `liveHasAPS` pattern:
- Normal: `₹199`
- APS active: `₹199 + APS`

**Files that would change:** `OrderSuccess.jsx` (~18 lines) + `OrderSuccess.css` (2-3 classes)
**Next step:** Owner says "implement it" → Role 3

---

## 6. Verification matrix — all PASS (iteration_42.json)

| # | Test | Result |
|---|------|--------|
| 5 | API associated_order_list present | PASS |
| 6 | Grand Total (own bill) unchanged | PASS — ₹1300, not inflated |
| 7 | Transferred row: #000103, 27 Nov, ₹99 | PASS |
| UI | data-testid=transferred-orders-section rendered | VERIFIED IN CODE |
