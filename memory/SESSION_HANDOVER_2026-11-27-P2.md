# Session Handover — 2026-11-27 (P2)

**Scope:** BUG-2026-11-27-002 + BUG-2026-11-27-003 — both implemented and tested
**Branch:** `main`. All commits pushed (pending this push).
**Next agent picks up at:** Owner smoke test for both bugs.

---

## 1. One-line status

Two bugs fixed and tested (7/7 PASS, iteration_42.json):
(1) Item banner repeat tap now re-scrolls + re-pulses; (2) Transferred F&B orders now appear on Order Success page.

---

## 2. BUG-2026-11-27-002 — Item Banner Repeat Tap

**Root cause:** `deepLinkAppliedKey.current` never reset; same-URL `navigate()` didn't re-trigger effect deps.

**Fix (MenuItems.jsx — 5 edits):**
- Imported `useLocation` from react-router-dom (L2)
- Added `const location = useLocation()` (L65)
- Key now: `` `${location.key}|${effectiveStationId||''}|${targetSection||''}|${targetItem||''}` `` (L191)
- `deepLinkAppliedKey.current = ''` reset at end of 2s pulse timer (L224)
- `location` added to effect deps (L270)

Every `navigate()` call creates a new `location.key` even for same URL → guard passes each time ✓

---

## 3. BUG-2026-11-27-003 — Transferred Orders on OrderSuccess

**Root cause:** `air-bnb/get-order-details` API didn't include `associated_order_list`. Owner added it. Backend proxy passes it through automatically (no server.py change needed).

**Live probe confirmed:** `associated_order_list: [{id:1579195, restaurant_order_id:"000103", order_amount:99, collect_bill:"2026-11-27 17:29:01"}]`

**Fix (3 files):**
- `orderService.ts`: added `associatedOrders` mapping + return type declaration
- `OrderSuccess.jsx`: added `associatedOrders` state, reads from `orderDetails.associatedOrders`, renders "Transferred Orders (N)" card after Bill Summary
- `OrderSuccess.css`: 6 new utility classes for the transferred orders card

**Display:** Card shows order count + total. Each row: `#000103  27 Nov  ₹99`. Grand Total (own bill) unchanged.

---

## 4. Test results (iteration_42.json) — 7/7 PASS

| Test | Result |
|------|--------|
| BUG-002 repeat tap (1st + 2nd) | PASS |
| BUG-002 category banner from landing | PASS |
| BUG-002 category banner from menu | PASS |
| BUG-002 All tab default | PASS |
| BUG-003 API associated_order_list present | PASS |
| BUG-003 Grand Total unchanged | PASS |
| BUG-003 transferred row data (#000103, 27 Nov, ₹99) | PASS |

---

## 5. Files changed

- `frontend/src/pages/MenuItems.jsx`
- `frontend/src/api/services/orderService.ts`
- `frontend/src/pages/OrderSuccess.jsx`
- `frontend/src/pages/OrderSuccess.css`

---

## 6. Next

Owner phone smoke test:
- Item banner: tap "start the fight" banner from menu page → scroll+pulse → tap again → scroll+pulse again ✓
- Transferred orders: visit order success for a room order that has transfers → "Transferred Orders (1) ₹99" section visible ✓
