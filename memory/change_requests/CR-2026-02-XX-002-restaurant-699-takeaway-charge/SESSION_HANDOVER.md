# SESSION_HANDOVER — CR-2026-02-XX-002 (Re-investigation, Blockers Resolved)

**Session date:** 2026-07-13
**Agent:** E1 (Investigation role — read-only, no code edits made)
**Status at close:** BLOCKER 1 RESOLVED — `takeaway_charges:10` confirmed in POS API. Recommendation changed from Option B → Option C. Blockers B3 + B4 remain (owner approval). Ready for Planning + Implementation once owner decides.

---

## 1. What happened this session

### 1.1 Task
Owner provided the exact curl + field name (`takeaway_charges`) + DevTools screenshot to resolve BLOCKER 1 from the prior investigation. Re-investigation was conducted (read-only) to update all blocker statuses and revise the fix recommendation.

### 1.2 Files read (no edits)
- `/app/memory/change_requests/CR-2026-02-XX-002-restaurant-699-takeaway-charge/INVESTIGATION_REPORT.md`
- `/app/memory/change_requests/CR-2026-02-XX-002-restaurant-699-takeaway-charge/BACKEND_VALIDATION_ADDENDUM.md`
- `/app/frontend/src/hooks/useMenuData.js` (lines around `useRestaurantDetails`)
- `/app/frontend/src/context/AdminConfigContext.jsx` (lines 154–179)
- `/app/frontend/src/api/config/endpoints.js`
- `/app/frontend/src/api/services/orderService.ts` (imports + line 369, 506)
- `/app/backend/server.py` (lines 1042–1165 — `/api/config/{rid}` handler)

### 1.3 Live probes (read-only)
- `POST preprod.mygenie.online/api/v1/web/restaurant-info` → `{"restaurant_web":"699"}` → `takeaway_charges: 10` ✅
- `GET {BACKEND}/api/config/699` → 86 keys; no `takeaway_charges` → own-BE does not expose field

---

## 2. Key findings

### 2.1 BLOCKER 1 — RESOLVED ✅

`takeaway_charges: 10` is confirmed in `preprod.mygenie.online/api/v1/web/restaurant-info` for restaurant 699.

**Why prior validation missed it:** The earlier probe used payload `{"restaurant_web":"699","pos_id":"0001"}`. The correct minimal payload is `{"restaurant_web":"699"}` (no `pos_id`). The field was present all along.

### 2.2 Data chain fully traced

```
POS API (/web/restaurant-info, payload: {"restaurant_web":"699"})
  → takeaway_charges: 10  ✅ CONFIRMED

frontend/src/api/config/endpoints.js
  RESTAURANT_DETAILS = `${API_BASE_URL}/web/restaurant-info`  ✅

frontend/src/hooks/useMenuData.js → useRestaurantDetails(identifier)
  → fetches RESTAURANT_DETAILS → returns full POS response
  → posRestaurant.takeaway_charges = 10  ✅ LIVE IN FE

frontend/src/context/AdminConfigContext.jsx:159
  const { restaurant: posRestaurant } = useRestaurantDetails(configId)
  → posRestaurant.takeaway_charges = 10  ✅ ALREADY AVAILABLE

frontend/src/api/services/orderService.ts
  → delivery_charge payload field
  → NOT reading takeaway_charges from orderData  ❌ (the wiring gap)

Own-backend GET /api/config/699
  → 86 keys, no takeaway_charges  ❌ (irrelevant — Option C bypasses own-BE entirely)
```

### 2.3 Recommendation changed: Option B → Option C

Option C (config-driven via existing POS hook) is now the correct recommendation:
- No backend changes needed
- No hardcode of restaurant ID
- Generalises to all restaurants automatically
- GAP-021 can be CLOSED immediately (no sunset needed)
- Same effort as Option B (~1-2 hr implementation)

**Rough wiring (investigation, not code):**
```
Caller that invokes placeOrder / updateOrder (ReviewOrder.jsx or equivalent)
  → already has posRestaurant via useRestaurantDetails (or receives it as prop)
  → passes orderData.takeawayCharges = posRestaurant.takeaway_charges || 0

orderService.ts → for orderType === 'takeaway':
  delivery_charge = String((orderData.deliveryCharge || 0) + (orderData.takeawayCharges || 0))
  // All other order types: unchanged
```

---

## 3. Blocker status at handover

| Blocker | Status | Notes |
|---|---|---|
| B1 — `takeaway_charges` field not found | ✅ RESOLVED | Confirmed: `takeaway_charges:10` in POS restaurant-info |
| B2 — `owner@brew.com` not in own-BE users | ⚠ REDUCED | Only blocks smoke test. Non-blocking for implementation. |
| B3 — owner approval for `orderService.ts` | ⛔ ACTIVE | CRITICAL hotspot — explicit owner approval required before any agent touches it |
| B4 — fix option not selected | ⛔ ACTIVE | Recommendation: Option C. Owner must confirm. |

---

## 4. Owner decisions needed (blocks Bug Fix role)

| # | Decision | Action |
|---|---|---|
| **D1** | Approve **Option C** (config-driven via `useRestaurantDetails` → `orderData.takeawayCharges`) | Say: "Approved Option C for CR-2026-02-XX-002" |
| **D2** | Explicitly approve editing `orderService.ts` (CRITICAL hotspot) | Say: "Approved to edit orderService.ts for CR-2026-02-XX-002" |
| **D3 (optional)** | Provision `owner@brew.com` in own-BE `users` OR provide alternate local admin creds | Only needed for post-fix smoke testing |

Q1 (sunset), Q3 (line item display), Q6 (tax treatment) remain nice-to-have, not blockers for Option C.

---

## 5. Implementation scope (for next agent — Bug Fix role)

**Once D1 + D2 approved:**

| File | Change | Risk |
|---|---|---|
| `frontend/src/api/services/orderService.ts` | Read `orderData.takeawayCharges` → add to `delivery_charge` when `orderType === 'takeaway'` | CRITICAL hotspot — careful diff |
| Caller(s) of `placeOrder` / `updateCustomerOrder` | Pass `takeawayCharges: posRestaurant.takeaway_charges \|\| 0` in `orderData` | MEDIUM |
| `memory/v2/PROJECT_GAP_REGISTER.md` | Mark GAP-021 as CLOSED (config-driven, no hardcode) | LOW |

**Do NOT touch:**
- `delivery_charge` for non-takeaway order types (blast radius: exactly `orderType === 'takeaway'`)
- Restaurant 716 carve-out at `orderService.ts:325` (GAP-016, independent)
- `payment_method: 'cash_on_delivery'` hardcode (BUG-007, parked)
- `orderType` default logic at lines 385, 461 (noted landmine — if `orderType` is undefined, surcharge won't fire; acceptable for now)

**Testing requirement after fix:**
1. Restaurant 699 takeaway order → verify `delivery_charge` in POS payload = `"10"` (or correct value)
2. Restaurant 699 delivery order → verify `delivery_charge` in POS payload unchanged
3. Restaurant 699 dinein order → verify `delivery_charge` in POS payload unchanged
4. Restaurant 478 takeaway order → verify `delivery_charge` in POS payload unchanged (no regressions)
5. Edit-order flow (restaurant 699 takeaway) → verify ₹10 persists after edit

---

## 6. Documents updated this session

| Document | Change |
|---|---|
| `INVESTIGATION_REPORT.md` | §11 addendum added — BLOCKER 1 resolved, chain traced, recommendation changed B→C |
| `BACKEND_VALIDATION_ADDENDUM.md` | §9 added — re-validation result: CLAIM VERIFIED |
| `SESSION_HANDOVER.md` (this file) | NEW |
| `PRD.md` | Updated — CR-2026-02-XX-002 status refreshed |

---

## 7. Services state at handover

| Service | Status |
|---|---|
| Backend (FastAPI :8001) | ✅ RUNNING |
| Frontend (React :3000) | ✅ RUNNING |
| MongoDB | ✅ RUNNING |

Branch: `13-july` — no code changes made this session.

---

*End of SESSION_HANDOVER CR-2026-02-XX-002. Investigation agent did not edit any code.*
