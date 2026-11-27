# INTAKE DOC — BUG-2026-11-27-003
## Transferred orders not shown on Order Success page

**ID:** BUG-2026-11-27-003
**Type:** BUG
**Date registered:** 2026-11-27
**Registered by:** Intake Agent (Role 1)
**Severity:** P1
**Risk:** MEDIUM
**Status:** INTAKE

---

## 1. Owner report (verbatim)

> "on the order success page we dont show transferred orders - which shows on pos, so customer gets confused"
> "check the web api does not returning enough info so the transfer ordered not showing?"
> "dont include room rent - its only f&b for"

**Screenshot provided (what POS shows):**
```
TRANSFERRED ORDERS (1)   ₹99  ^
  #000103   27 Nov        ₹99

ROOM ORDERS              ₹1,300  v
...
Food Total               ₹1,300
Transferred Total           ₹99
```

Owner wants: show only the **F&B transferred orders** section — NOT room orders, NOT room rent.

---

## 2. Classification

**BUG** — missing data gap. The customer-facing order success page never displays transferred orders, but the POS does. Customer sees their items + bill but not the fact that another order was transferred to their tab.

**NOT a duplicate** — no prior registered item for transferred order display.

**NOT a scope gap** — the feature (order success page) exists; it just doesn't show this data because the API it uses doesn't return it.

---

## 3. Evidence

### Live API probe (confirmed this session)

**`GET /api/air-bnb/get-order-details/1579194` response top-level keys:**
```
details, subscription_schedules, delivery_charge, delivery_charge_gst,
table_id, table_no, order_discount, discount_value, coupon_code,
coupon_discount, coupon_discount_amount, coupon_discount_value,
coupon_discount_type, restaurant, loyalty_info, loyalty_points, airbnb
```
**`associated_order_list` field: ABSENT** — confirmed by live probe.

**POS employee-orders-list response for the same order (provided by owner):**
```json
"associated_order_list": [
  {
    "id": 1579195,
    "restaurant_order_id": "000103",
    "order_amount": 99,
    "collect_Bill": "2026-11-27 17:29:01"
  }
]
```
This is the F&B transferred order: `#000103`, ₹99.

**Room rent is in `room_info.room_price = ₹1300`** — separate field, must NOT be shown.

### Code trace — why nothing is displayed

```
OrderSuccess.jsx
  → getOrderDetails(orderId)        [orderService.ts line 151]
  → GET /api/air-bnb/get-order-details/{id}
  → server.py lines 502-521: pure proxy to POS
  → POS returns response without associated_order_list
  → orderService.ts transform lines 260-295: no associated_order_list read
  → OrderSuccess.jsx: zero references to associated_order_list or transferred orders
```

No code on any layer reads or displays transferred orders.

---

## 4. API data available

### From `associated_order_list` (what we need to show):
| Field | Value | Use |
|-------|-------|-----|
| `restaurant_order_id` | "000103" | Display as #000103 |
| `order_amount` | 99 | Display as ₹99 |
| `collect_Bill` | "2026-11-27 17:29:01" | Display as "27 Nov" |
| `id` | 1579195 | Reference only |

### What to EXCLUDE:
- `room_info.room_price` (₹1300) — room rent, owner explicitly excluded
- `room_info.*` — all room order fields

---

## 5. Severity & risk

| Field | Value | Reason |
|-------|-------|--------|
| Severity | P1 | Core customer experience broken — customer doesn't see their full bill, gets confused |
| Risk | MEDIUM | Requires backend change (new proxy call or endpoint modification) + frontend transform + UI change |
| Blast radius | MEDIUM | 3 layers: `server.py`, `orderService.ts`, `OrderSuccess.jsx` |

---

## 6. Open questions for Planning role

**Q1 — Backend source for `associated_order_list`:**
The `air-bnb/get-order-details` POS endpoint does not include this field. Options:
- **A)** Call the POS employee-orders-list endpoint (`/api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager`) filtered by order_id — but this requires staff auth
- **B)** Check if another customer-facing POS endpoint exposes associated orders
- **C)** Add a secondary POS call in `server.py`'s `get_order_details` using the internal POS login credentials

**Q2 — Display location:** Show "TRANSFERRED ORDERS" as a collapsed/expanded section on Order Success, similar to what POS shows? Or inline in the bill summary?

**Q3 — Total line:** Should "Transferred Total ₹99" appear in the bill summary totals section?

---

## 7. Proposed fix approach (for Planning role to finalise)

**Layer 1 — `backend/server.py` `get_order_details` endpoint:**
After fetching `air-bnb/get-order-details/{order_id}`, make a second call to get the full order object (which includes `associated_order_list`). The POS employee-orders-list endpoint returns `associated_order_list` per order. The backend already has `POS_LOGIN_PHONE`/`POS_LOGIN_PASSWORD` env vars — can authenticate and fetch.

**Layer 2 — `frontend/src/api/services/orderService.ts` transform:**
Read `associated_order_list` from the enriched response; map to `associatedOrders: [{orderId, restaurantOrderId, orderAmount, date}]`; exclude any room-related entries if detectable.

**Layer 3 — `frontend/src/pages/OrderSuccess.jsx`:**
Render "Transferred Orders (N)" section when `associatedOrders` is non-empty; list each with #ID, date, and amount.

---

## 8. Next step

Planning (Role 2) needs to answer Q1–Q3 and confirm the backend fetch strategy before Implementation.

**Owner action required:** Answer Q1 (backend source) and Q2–Q3 (display) before Planning can proceed.
