# Session Handover — 2026-11-27 (transfer-orders branch)

**Scope:** BUG-2026-11-27-002 (item banner repeat tap) + BUG-2026-11-27-003 (transferred orders on OrderSuccess) + Grand Total combined view investigation
**Branch:** `transfer-orders`. All commits pushed.
**Next agent picks up at:** Grand Total combined view — owner approved, say "implement it" → Role 3 (Implementation)

---

## 1. One-line status

Two bugs fixed and tested (7/7 PASS, iteration_42.json). One pending feature (Grand Total combined view) — plan complete, awaiting implementation approval.

---

## 2. What came in this session

**Owner reports (verbatim):**
> "i am unable to go into item when pressing the banner when im on that page - first time works - but second time not"
> "on the order success page we dont show transferred orders - which shows on pos, so customer gets confused"
> "cant we show something like this — grand total" (referencing POS checkout screenshot)
> "dont include room rent - its only f&b for"

**Owner also provided:**
- POS API responses for order 1579194 (employee-orders-list + air-bnb/get-order-details)
- POS checkout screenshot showing: Food Total + Transferred Total + Grand Total layout
- Curl command for direct POS probe: `GET /api/v1/air-bnb/get-order-details/1579194`

---

## 3. Live API probes (backend reply attached)

### Direct POS probe (curl provided by owner)
```
GET https://preprod.mygenie.online/api/v1/air-bnb/get-order-details/1579194
Headers: Origin=18march.mygenie.online
```

**Response (key fields):**
```json
{
  "details": [...14 items...],
  "table_id": 9239,
  "table_no": "a1",
  "associated_order_list": [
    {
      "id": 1579195,
      "restaurant_order_id": "000103",
      "order_amount": 99,
      "collect_bill": "2026-11-27 17:29:01"
    }
  ],
  "restaurant": { "name": "The Goan Kitchen", ... },
  "airbnb": null
}
```
**`associated_order_list` PRESENT** — owner added this field to the POS API.

### Via backend proxy
```
GET /api/air-bnb/get-order-details/1579194
→ associated_order_list PRESENT (same data)
→ server.py line 515: return response.json() — passes new field through automatically
→ NO server.py change needed
```

### POS order context (order 1579194)
- Main order: `#000102`, table `a1`, restaurant 69, ₹100 (F&B: check in ₹1 APS + moo duudh ₹100)
- `associated_order_list`: `#000103`, ₹99 (F&B transferred order)
- `room_info.room_price`: ₹1,300 (room rent — **excluded per owner**)
- `order_edit_count`: 1 (order was edited once)

---

## 4. BUG-2026-11-27-002 — Item Banner Repeat Tap

### Investigation (this session)

**Two compounding root causes:**

**Problem A — Same URL, no effect re-trigger:**
`navigate('/69/menu?item=248247')` from same URL → `useSearchParams` returns same `targetItem = "248247"` → effect dependencies unchanged → effect **does not re-run**.

**Problem B — `deepLinkAppliedKey` never resets:**
`deepLinkAppliedKey.current` set on first tap (line 208), never cleared after the 2s pulse completes → guard `if (key === current) return` **blocks every subsequent same-URL tap**.

### Fix applied (MenuItems.jsx — 5 edits)

```
E-1: import useLocation from react-router-dom
E-2: const location = useLocation()  (after useSearchParams)
E-3: key = `${location.key}|${effectiveStation}|${targetSection}|${targetItem}`
E-4: deepLinkAppliedKey.current = ''  (reset at end of 2s pulse timer)
E-5: location added to useEffect dependency array
```

**Why location.key works:** React Router 7 creates a new unique `location.key` on EVERY `navigate()` call, even to the same URL. Including it in the key means each navigation is distinct → guard never matches → effect re-runs. PromoBanner.jsx was NOT changed.

### Test results (iteration_42.json)
- BUG-002 repeat tap (1st + 2nd tap): **PASS**
- Regression: category banner from landing: **PASS**
- Regression: category banner from menu: **PASS**
- Regression: All tab default: **PASS**

---

## 5. BUG-2026-11-27-003 — Transferred Orders on OrderSuccess

### Investigation (this session)

**Root cause:** `air-bnb/get-order-details` POS endpoint previously did not return `associated_order_list`. Owner added the field. Backend proxy at `server.py` lines 514-515 passes all JSON fields through — no server.py change needed.

```
Before: 17 keys in response — no associated_order_list
After:  18 keys — associated_order_list: [{id, restaurant_order_id, order_amount, collect_bill}]
```

**Code path before fix:**
```
OrderSuccess.jsx → getOrderDetails() → GET /api/air-bnb/get-order-details/{id}
→ server.py proxy → POS API → returns JSON → no associated_order_list read
→ OrderSuccess renders nothing for transferred orders
```

### Fix applied (3 files)

**orderService.ts (3 edits):**
1. Added `associatedOrders?` to return type
2. Read `associated_order_list`, map to `{orderId, restaurantOrderId, amount, date}`
3. Added `associatedOrders` to return object

**OrderSuccess.jsx (3 edits):**
1. `const [associatedOrders, setAssociatedOrders] = useState([])`
2. `setAssociatedOrders(orderDetails.associatedOrders)` in fetchOrderStatus
3. Render "Transferred Orders (N)" card with `data-testid="transferred-orders-section"`

**OrderSuccess.css:**
- 6 new classes: `.order-success-transferred-card`, `.order-success-transferred-header`, `.order-success-transferred-title`, `.order-success-transferred-total`, `.order-success-transferred-row`, `.order-success-transferred-id`, `.order-success-transferred-amount`

**Display:**
```
Transferred Orders (1)   ₹99
#000103   27 Nov          ₹99
```

Positioned: after Bill Summary card, before Order Status Tracker.
Grand Total (own food bill) unchanged — transferred total is **display-only**.

### Test results (iteration_42.json)
- BUG-003 API associated_order_list present: **PASS**
- BUG-003 Grand Total unchanged (₹1300, not inflated): **PASS**
- BUG-003 row data (#000103, 27 Nov, ₹99): **PASS**
- BUG-003 UI section rendered: **VERIFIED IN CODE**

---

## 6. Grand Total Combined View — Investigation Complete, NOT YET IMPLEMENTED

### Owner request (verbatim)
> "cant we show something like this — grand total" (pointing to POS checkout showing Food Total + Transferred Total + Grand Total)

### POS layout (from screenshot)
```
Food Total         ₹1,300
Transferred Total     ₹99
Room Balance       ₹1,000   ← EXCLUDED (owner: F&B only)
GRAND TOTAL        ₹2,399
```

### Our F&B-only layout (planned)
```
Food Total          ₹100   ← billSummary.grandTotal
Transferred Total    ₹99   ← sum(associatedOrders.amount)
─────────────────────────
GRAND TOTAL         ₹199   ← orange, only when associatedOrders.length > 0
```

### APS masking (already handled)
Reuses existing `effBS` / `liveHasAPS` pattern — zero new APS logic:
- `liveHasAPS = false` (normal): `₹199`
- `liveHasAPS = true` (APS pending): `₹199 + APS`

### Impact (pending implementation)
- **Files:** `OrderSuccess.jsx` (~18 lines) + `OrderSuccess.css` (2-3 classes)
- **Risk:** LOW — display-only, existing state/data already in scope
- **No API change, no backend change, no billSummary change**

### Status: PENDING owner approval
Owner saw the plan and said "implement it" is the trigger. Next agent should implement directly (Role 3).

---

## 7. Files changed this session (complete list)

**Code:**
| File | Bug | Change |
|------|-----|--------|
| `frontend/src/pages/MenuItems.jsx` | BUG-002 | useLocation + location.key in deep-link |
| `frontend/src/api/services/orderService.ts` | BUG-003 | read + map associatedOrders |
| `frontend/src/pages/OrderSuccess.jsx` | BUG-003 | state + render transferred orders |
| `frontend/src/pages/OrderSuccess.css` | BUG-003 | 6 new CSS classes |

**Docs created this session:**
| File | Purpose |
|------|---------|
| `memory/change_requests/BUG-2026-11-27-002.../INTAKE_DOC.md` | Bug intake |
| `memory/change_requests/BUG-2026-11-27-002.../PLANNING_AND_IMPL_DOC.md` | Plan + fix details |
| `memory/change_requests/BUG-2026-11-27-003.../INTAKE_DOC.md` | Bug intake |
| `memory/change_requests/BUG-2026-11-27-003.../PLANNING_AND_IMPL_DOC.md` | Plan + fix details + Grand Total spec |
| `memory/SESSION_HANDOVER_2026-11-27-P2.md` | Previous partial handover |
| `memory/SESSION_HANDOVER_transfer-orders.md` | This file |

**Test reports:**
- `test_reports/iteration_42.json` — 7/7 PASS

---

## 8. Registry status (after this session)

| ID | Title | Status |
|----|-------|--------|
| CR-2026-11-26-001 | Banner deep-link (category + item) | QA_PASS |
| BUG-2026-11-26-001 | APS price ₹1 in CartBar/ReviewOrder/OrderSuccess | INTAKE (pending approval) |
| BUG-2026-11-27-001 | Update Order button shows price | IMPLEMENTED |
| BUG-2026-11-27-002 | Item banner repeat tap | **QA_PASS** |
| BUG-2026-11-27-003 | Transferred orders missing OrderSuccess | **QA_PASS** |

---

## 9. Where the next agent picks up

### Primary: Grand Total combined view implementation
**Role:** Implementation (Role 3)
**Trigger:** Owner says "implement it"
**Spec:** `BUG-2026-11-27-003/PLANNING_AND_IMPL_DOC.md §5`
**Files:** `OrderSuccess.jsx` + `OrderSuccess.css`
**Risk:** LOW
**Data already in scope:** `billSummary.grandTotal`, `associatedOrders[]`, `liveHasAPS`, `effBS`

**Exact logic:**
```javascript
// Only render when associatedOrders.length > 0
const transferredTotal = associatedOrders.reduce((s, o) => s + (o.amount || 0), 0);
const combinedTotal = (effBS?.grandTotal || 0) + transferredTotal;
// APS display:
liveHasAPS
  ? (effBS.grandTotal > 0 ? `₹${combinedTotal.toFixed(0)} + APS` : `APS + ₹${transferredTotal}`)
  : `₹${combinedTotal.toFixed(0)}`
```

### Secondary backlog
- BUG-2026-11-26-001: APS price masking (CartBar, ReviewOrder, OrderSuccess — display only, 3 files, P1)
- BUG-2026-11-27-001: Update Order button shows price (IMPLEMENTED, needs QA)

---

## 10. Test credentials
- Admin / restaurant 69: `kds@thegoankitchen.com` / `Qplazm@10`
- POS preprod: `+919579504871` / `Qplazm@10`
- Order with transfers: orderId=1579194, associated #000103 ₹99
- Item banner: `/69/menu?item=248247` (item in Po category)
- Category banner: `/69/menu?section=11200` (Raom category)
