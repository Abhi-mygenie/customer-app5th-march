# SESSION_HANDOVER — BUG-2026-02-XX-001 (Investigation + Smoke Test Failure)

**Session date:** 2026-07-13  
**Agent:** E1 (Investigation role — read-only, no code edits made)  
**Status at close:** ROOT CAUSE CONFIRMED — awaiting owner decision on fix option before Bug Fix role can proceed  

---

## 1. What happened this session

### 1.1 Task context
- Fresh pull of branch `13-july` from `https://github.com/Abhi-mygenie/customer-app5th-march.git` into `/app`
- Services started (backend ✅ running, frontend ✅ running)
- Owner reported smoke test FAILED for BUG-2026-02-XX-001 on restaurant 699
- Investigation agent role was engaged (read-only throughout)

### 1.2 Credentials used
| Alias | Value | Purpose |
|---|---|---|
| owner@brew.com | Qplazm@10 | Restaurant admin login for smoke testing |

### 1.3 Files read (no edits)
- `/app/memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`
- `/app/memory/change_requests/BUG-2026-02-XX-001-delivery-charge-not-calculated/QA_HANDOVER.md`
- `/app/memory/change_requests/BUG-2026-02-XX-001-delivery-charge-not-calculated/INVESTIGATION_REPORT.md`
- `/app/memory/change_requests/BUG-2026-02-XX-001-delivery-charge-not-calculated/INTAKE_DOC.md`
- `/app/frontend/src/pages/DeliveryAddress.jsx`
- `/app/frontend/src/context/CartContext.js`
- `/app/frontend/src/pages/ReviewOrder.jsx` (lines 1–700)
- `/app/frontend/src/hooks/useScannedTable.js`
- `/app/frontend/src/api/transformers/helpers.js`
- `/app/frontend/src/api/services/orderService.ts`

---

## 2. Key findings from this session

### 2.1 External API — CONFIRMED WORKING CORRECTLY

Live probe of `manage.mygenie.online/api/v1/config/distance-api-new` (the exact endpoint the frontend calls via `MANAGE_BASE_URL`):

| order_value sent | shipping_charge returned | Verdict |
|---|---|---|
| "0" | 10 | Charged (cart below threshold) |
| "249" | 10 | Charged (just below threshold) |
| "250" | 0 | Free delivery (at threshold) |
| "300" | 0 | Free delivery (above threshold) |

**Threshold for restaurant 699: order_value ≥ 250 → shipping_charge = 0**  
Both `manage.mygenie.online` and `preprod.mygenie.online` return identical results.  
GAP #1 from prior investigation is CLOSED. The fix direction (send real cart total) is correct.

### 2.2 Q2 / Q4 clarifications received from owner (this session)

- **Q2 (where does delivery charge config live):** In the external distance API server-side. The API computes `shipping_charge` from `order_value` + restaurant-specific rules.
- **Q4 (which API to call):** The same `distance-api-new` API. Must be called (not replaced by client-side calculation).

### 2.3 Root cause of smoke test failure — CONFIRMED

**Primary: `checkDistance` is never re-triggered when cart total changes after the initial load.**

The fix (Option A, shipped) passes `getTotalPrice()` at the moment `checkDistance` fires. But `checkDistance` is only triggered by explicit user/system events (address select, GPS, pin drag, Places pick). There is **no `useEffect` watching `getTotalPrice()`** to re-fire `checkDistance` when cart value crosses the ₹250 threshold after the address was already loaded.

**Exact failing flow:**
```
1. Owner opens /699/delivery-address — cart total = ₹200 (< ₹250)
   → fetchAddresses fires, default address loads
   → checkDistance fires: order_value="200" → API returns shipping_charge=10
   → Distance bar: "Delivery: ₹10"

2. Owner goes back to /699/menu — adds more items → cart now ₹300 (> ₹250)

3. Owner returns to /699/delivery-address
   → No event triggers checkDistance
   → distanceResult is STALE: shipping_charge=10 still shown
   → Owner sees "Delivery: ₹10" — smoke test FAILS

4. If owner clicks "Confirm & Proceed":
   → setDeliveryCharge(10) stored in CartContext
   → ReviewOrder shows ₹10 — smoke test FAILS
```

**Secondary: `deliveryCharge` is not persisted to localStorage**

`CartContext.js` persists `deliveryAddress` to `localStorage` but `deliveryCharge` is in-memory only. It resets to 0 on any page refresh or CartContext remount. This is a structural fragility independent of the primary gap.

---

## 3. Owner decision needed — BLOCKS Bug Fix role

Before the Bug Fix agent can proceed, owner must choose one of:

**Option R1 — Re-trigger on cart change (inside DeliveryAddress.jsx)**  
Add a `useEffect` that watches `getTotalPrice()`. When cart total changes AND an address/location is already selected (markerPos + selectedId or reverseAddress), re-call `checkDistance`.  
- Risk: LOW (additive change, DeliveryAddress.jsx only)
- Extra API calls: one per cart-change while on the delivery address page
- Effort: ~1 hour + testing_agent

**Option R2 — Re-trigger on ReviewOrder mount (final cart)**  
Add a `checkDistance` call in `ReviewOrder.jsx` on mount using the final cart total. Update `deliveryCharge` in CartContext before rendering totals.  
- Risk: MEDIUM (ReviewOrder.jsx is CRITICAL hotspot per Alpha v0.1 Part C)
- Extra API calls: one per ReviewOrder load on delivery orders
- Effort: ~3 hours + testing_agent + owner approval for hotspot touch

**Recommendation:** Option R1. Lower risk, fixes the gap precisely where it occurs.

---

## 4. Secondary fix (can be bundled or separate)

**Persist `deliveryCharge` to localStorage in CartContext.js**

Pattern already established for `deliveryAddress`:
```javascript
// Add to CartContext — mirror the deliveryAddress persistence pattern
localStorage.setItem(`delivery_charge_${restaurantId}`, String(charge));
// Load on mount alongside delivery address
```
- Risk: LOW
- Effort: ~30 minutes
- Independent of R1/R2

---

## 5. Current document state

| Document | Status |
|---|---|
| `INTAKE_DOC.md` | No change — still valid |
| `INVESTIGATION_REPORT.md` | Updated this session — live API evidence addendum added (see §8) |
| `QA_HANDOVER.md` | Updated this session — smoke test failure recorded, owner decision items added |
| `SESSION_HANDOVER.md` (this file) | NEW — written this session |
| `PRD.md` | Updated this session |

---

## 6. Services state at handover

| Service | Status | Note |
|---|---|---|
| Backend (FastAPI) | ✅ RUNNING | `GET /api/` → `{"message":"Customer App API"}` |
| Frontend (React) | ✅ RUNNING | Port 3000, hot-reload active |
| MongoDB | ✅ RUNNING | System MongoDB |

Branch: `13-july` pulled into `/app` (fresh pull this session)  
`.env` files: populated by owner (values replaced)

---

## 7. Next agent instructions

**Role to pick:** BUG FIX (Role 5) — after owner selects R1 or R2 above.

**Do NOT start coding until:**
1. Owner has explicitly approved R1 or R2
2. Owner has confirmed whether the `deliveryCharge` persistence fix should be bundled

**When owner approves, scope is:**
- If R1: edit `DeliveryAddress.jsx` only (add useEffect watching getTotalPrice + re-trigger checkDistance)
- If R2: edit `ReviewOrder.jsx` (CRITICAL — requires owner approval per Alpha v0.1 Part C before touching)
- Either option: optionally bundle `CartContext.js` delivery charge persistence fix

**Testing requirement after fix:**
1. Static: confirm new `useEffect` dep array is correct
2. Live E2E smoke: perform owner checklist from `QA_HANDOVER.md §4` on restaurant 699 specifically
   - Add items totaling < ₹250 → navigate to delivery address → verify charge shown
   - Add more items (total > ₹250) → return to delivery address → verify charge re-checks to ₹0
   - Proceed to ReviewOrder → verify ₹0 delivery charge displayed

**Landmines — do NOT touch:**
- Restaurant 716 hardcode in ReviewOrder.jsx (BUG-006)
- `payment_method: "cash_on_delivery"` hardcode (BUG-007)
- Provider stack order in App.js
- `isOn()` helper default polarity
- Any localStorage key names

---

## 8. Registry / tracker update needed by next agent

- Update `/app/memory_repo/BUG_TRACKER_v2.md` — add BUG-2026-02-XX-001 entry (currently not in tracker)
- Update `/app/memory/change_requests/BUG-2026-02-XX-001-delivery-charge-not-calculated/` — add BUG_FIX_REPORT.md after fix is complete

---

*End of SESSION_HANDOVER. Investigation agent did not edit any code.*

---
---

# SESSION_HANDOVER — BUG-2026-02-XX-001 (Planning, Q3-B confirmation)

**Session date:** 2026-07-13
**Agent:** E1 (Planning role — Role 2, read-only, no code edits made)
**Status at close:** PLANNING COMPLETE — all owner gate approvals received — Implementation (Role 3) ready to proceed immediately

---

## Session summary

### What happened
- Owner granted all approvals: A-1, A-2 (bundled), CR-002 B-1 (CRITICAL gate)
- Planning agent (Role 2) produced full impact analysis + implementation plan for BUG-001 and CR-002 jointly
- Q3-B resolved: owner confirmed label = **"Takeaway Charges"** as a new standalone bill row
- Owner confirmed the exact behaviour: screen shows "Takeaway Charges ₹10.00" · POS receives `delivery_charge: "10"`
- Key plan correction: original B-1 display change (line 1799) CANCELLED — "Delivery Charge" row is gated by `scannedOrderType === 'delivery'` and is hidden for takeaway. New standalone row is the correct approach.

### Files read (no edits)
- `frontend/src/pages/DeliveryAddress.jsx` (checkDistance, getTotalPrice, hasActiveAddress, markerPos)
- `frontend/src/context/CartContext.js` (deliveryCharge state, localStorage pattern)
- `frontend/src/pages/ReviewOrder.jsx` (lines 660–700 computation block; lines 1788–1815 bill display)
- `frontend/src/api/services/orderService.ts` (delivery_charge, orderData flow)
- `frontend/src/hooks/useMenuData.js` (useRestaurantDetails)
- Alpha v0.1 system prompt (full — hotspot classification, Part C gates)

---

## Approved implementation plan (FINAL)

### BUG-2026-02-XX-001

**Plan A-1 — `frontend/src/pages/DeliveryAddress.jsx`** (MEDIUM risk)
- After `const hasActiveAddress = Boolean(selectedId) || Boolean(reverseAddress);`
- Add `const cartTotal = getTotalPrice();`
- Add `useEffect(() => { if (!markerPos || !hasActiveAddress) return; checkDistance(markerPos.lat, markerPos.lng); }, [cartTotal]);` with eslint-disable comment
- Code marker: `// BUG-2026-02-XX-001 R1:`

**Plan A-2 — `frontend/src/context/CartContext.js`** (HIGH risk — §6.3 hotspot)
- Change `useState(0)` → `useState(() => parseFloat(localStorage.getItem(...)) || 0)` for deliveryCharge
- Add `persistDeliveryCharge` wrapper that calls `setDeliveryCharge` + `localStorage.setItem`
- Add `localStorage.removeItem` in clearDeliveryAddress
- Export `persistDeliveryCharge` as `setDeliveryCharge` in context value
- New localStorage key: `delivery_charge_<restaurantId>`
- Code marker: `// BUG-2026-02-XX-001 persist:`

### CR-2026-02-XX-002

**Plan B-1 — `frontend/src/pages/ReviewOrder.jsx`** (CRITICAL — lines 671–677)
- After `const includeDelivery = scannedOrderType === 'delivery';`
- Add `const takeawaySurcharge = (scannedOrderType === 'takeaway') ? (restaurant?.takeaway_charges || 0) : 0;`
- Modify `effectiveDeliveryCharge` to add `+ takeawaySurcharge`
- All 7 downstream call sites auto-correct — no further changes
- `totalToPay` and `roundedTotal` automatically include ₹10 (effectiveDeliveryCharge flows into finalSubtotal at line 707)
- Code marker: `// CR-2026-02-XX-002:`

**Plan B-2 — `frontend/src/pages/ReviewOrder.jsx`** (CRITICAL — after line 1801)
- Add new JSX block after the existing "Delivery Charge" row:
  `{scannedOrderType === 'takeaway' && takeawaySurcharge > 0 && (<div ...><span>Takeaway Charges</span><span>₹{takeawaySurcharge.toFixed(2)}</span></div>)}`
- Code marker: `// CR-2026-02-XX-002 Q3-B:`

**Plan B-3 — `memory_repo/v2/PROJECT_GAP_REGISTER.md`** (LOW)
- Mark GAP-021 CLOSED

---

## Owner approvals received (on record)

| Approval | Decision | Date |
|---|---|---|
| A-1 (DeliveryAddress.jsx useEffect) | ✅ Approved | 2026-07-13 |
| A-2 (CartContext.js persistence — bundled) | ✅ Approved | 2026-07-13 |
| B-1 (ReviewOrder.jsx — CRITICAL gate) | ✅ Approved | 2026-07-13 |
| Q3-B display label | ✅ "Takeaway Charges" | 2026-07-13 |
| Behaviour confirmation | ✅ Screen ₹10 row · POS delivery_charge="10" | 2026-07-13 |

---

## Next agent instructions (Implementation — Role 3)

**All gates open. Proceed immediately.**

1. Read PLANNING_REPORT.md (this folder) for exact code snippets and anchors
2. Implement in order: A-1 → A-2 → B-1 → B-2 → B-3
3. A-1 and A-2 are independent of B-1/B-2 — may be implemented in parallel (different files)
4. After all changes: run `sudo supervisorctl restart frontend` (frontend code changes)
5. Call `testing_agent_v3` with the full verification matrix from PLANNING_REPORT.md §4

**Landmines — do NOT touch:**
- `payment_method: "cash_on_delivery"` hardcode (BUG-007 parked)
- Restaurant 716 carve-out at `orderService.ts:325` (BUG-006 parked)
- `isOn()` helper default polarity
- Provider stack order in `App.js`
- Any localStorage key names other than the new `delivery_charge_<restaurantId>`
- Any `.env` file

**Do NOT change:**
- `orderService.ts` — not in scope; upstream fix makes values correct automatically
- `RestaurantConfigContext.jsx` — not in scope
- `backend/server.py` — not in scope
- The existing "Delivery Charge" bill row (line 1795–1801) — must remain untouched

---

## Services state at handover

| Service | Status |
|---|---|
| Backend (FastAPI :8001) | ✅ RUNNING |
| Frontend (React :3000) | ✅ RUNNING |
| MongoDB | ✅ RUNNING |

Branch: `13-july` — no code changes made this session.

---

*End of SESSION_HANDOVER BUG-2026-02-XX-001 (planning session 2026-07-13). Planning agent did not edit any code.*
