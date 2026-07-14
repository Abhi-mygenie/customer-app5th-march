# MyGenie Customer App — PRD (Active Working Memory)

**Last updated:** 2026-07-13  
**Branch:** 13-july  
**Repo:** https://github.com/Abhi-mygenie/customer-app5th-march.git  
**Stack:** React (TypeScript) + FastAPI (Python) + MongoDB  

---

## Current Environment State

| Service | Status |
|---|---|
| Backend (FastAPI :8001) | ✅ RUNNING |
| Frontend (React :3000) | ✅ RUNNING |
| MongoDB | ✅ RUNNING |

Backend health: `GET /api/` → `{"message":"Customer App API"}`  
`.env` files: populated by owner (values replaced from placeholders)

---

## Architecture Summary

- **Frontend:** React 19 + TypeScript, CRA + CRACO, Tailwind CSS, Radix UI / shadcn
- **Backend:** FastAPI single-file `server.py` (~38 routes)
- **Database:** MongoDB (remote)
- **Auth:** Dual — backend JWT (admin) + CRM token (customer, restaurant-scoped)
- **Key external APIs:** POS (`preprod.mygenie.online`), CRM (`crm.mygenie.online`), Distance API (`manage.mygenie.online`), Google Maps

---

## Active Change Requests

### CR-2026-02-XX-002 — Restaurant 699 takeaway charge ✅ IMPLEMENTED

| Field | Value |
|---|---|
| Status | **✅ IMPLEMENTED + TESTED (2026-07-13)** — structural verification PASS (100%). Owner smoke test pending. |
| Files changed | `frontend/src/pages/ReviewOrder.jsx` (lines 671–683, 1808–1814), `memory/v2/PROJECT_GAP_REGISTER.md` (GAP-021 CLOSED) |
| Screen behaviour | "Takeaway Charges ₹10.00" shown as separate bill row for restaurant 699 takeaway orders |
| API behaviour | `delivery_charge: "10"` in POS order payload |
| GAP-021 | ✅ CLOSED |
| Next action | Owner smoke test — restaurant 699, takeaway order |
| Folder | `/app/memory/change_requests/CR-2026-02-XX-002-restaurant-699-takeaway-charge/` |
| Severity | P1 |
| Risk | CRITICAL (`ReviewOrder.jsx` — §6.1 hotspot) |
| Approved plan | B-1: effectiveDeliveryCharge + takeawaySurcharge · B-2: "Takeaway Charges" standalone row (Q3-B) · B-3: GAP-021 closure |
| Files | `frontend/src/pages/ReviewOrder.jsx`, `memory_repo/v2/PROJECT_GAP_REGISTER.md` |
| Files NOT touching | orderService.ts, CartContext.js, RestaurantConfigContext.jsx, server.py, any .env |
| Field confirmed | `takeaway_charges: 10` in `preprod.mygenie.online/api/v1/web/restaurant-info` (payload: `{"restaurant_web":"699"}`) |
| Screen behaviour | "Takeaway Charges ₹10.00" shown as separate bill row for restaurant 699 takeaway orders |
| API behaviour | `delivery_charge: "10"` in POS order payload under existing key |
| Grand total | Includes ₹10 automatically via `effectiveDeliveryCharge → finalSubtotal → totalToPay` (line 707) |
| GAP-021 | Ready to CLOSE — config-driven, no hardcode |
| Next action | Implementation (Role 3) → read `PLANNING_REPORT.md` → implement B-1 + B-2 + B-3 → testing_agent_v3 |
| Folder | `/app/memory/change_requests/CR-2026-02-XX-002-restaurant-699-takeaway-charge/` |
| Key docs | INVESTIGATION_REPORT.md (+ §11), BACKEND_VALIDATION_ADDENDUM.md (+ §9), PLANNING_REPORT.md ✅ FINAL, SESSION_HANDOVER.md |

---

### BUG-2026-02-XX-001 — Delivery charge not calculated ✅ PLAN R4 IMPLEMENTED

| Field | Value |
|---|---|
| Status | **✅ PLAN R4 IMPLEMENTED + QA PASSED (2026-07-14)** — testing_agent_v3 iteration_4: 4/4 TCs PASS. Owner smoke test pending. |
| Files changed | `DeliveryAddress.jsx` (A-1), `CartContext.js` (A-2), `ReviewOrder.jsx` (R2→R3→R4) |
| Fix summary | A-1: Re-trigger checkDistance on cart change in DeliveryAddress. A-2: Persist charge to localStorage. R3: `useEffect([subtotal])` — fires on cart total change. **R4: Added `deliveryAddress` to dep array → `[subtotal, deliveryAddress]` — fixes async address load race condition on back-nav.** |
| Root cause of R3 gap | R3 `[subtotal]` only. On back-nav: `subtotal` available sync but `deliveryAddress` null on mount. Effect returned early. Address loaded later but subtotal unchanged → effect never re-fired. Stale charge persisted. |
| R4 fix | `deliveryAddress` added to dep array. When address hydrates async, effect re-fires with correct `subtotal` → API called → correct charge. |
| Next action | QA testing (R4-TC1..TC7 in QA_HANDOVER_R4.md) → Owner smoke test — restaurant 699, delivery, back-nav, cross threshold |
| Folder | `/app/memory/change_requests/BUG-2026-02-XX-001-delivery-charge-not-calculated/` |
| Key docs | QA_HANDOVER_R4.md (test cases R4-TC1..TC7), SESSION_HANDOVER_R4.md |

---

## Parked / Untouched Items

| Item | Status | Note |
|---|---|---|
| CR-2026-02-XX-002 (Rest 699 takeaway ₹10) | ✅ UNPARKED — in active implementation queue | PLANNING_REPORT.md finalised; ready for Role 3 |
| BUG-006 (Rest 716 hardcode in ReviewOrder) | PARKED | Intentional business exception |
| BUG-007 (`payment_method` hardcode) | PARKED | Intentional; `payment_type` carries actual selection |
| Google Maps API key restriction | BACKLOG | Key needs domain restriction in GCP console |
| JWT_SECRET rotation | BACKLOG | Current value is placeholder — rotate before production |
| CORS restriction | BACKLOG | Currently `*` — restrict to actual frontend domain for production |

---

## Key Business Rules (do not break)

1. `payment_method: "cash_on_delivery"` hardcoded in order payload — intentional (BUG-007 parked)
2. Restaurant 716 branch in `ReviewOrder.jsx` — do not remove (BUG-006 parked)
3. `isOn()` helper returns `true` unless explicitly `false` — do not invert (controls ~40 UI flags)
4. Provider stack order in `App.js` (QueryClient → Auth → RestaurantConfig → Router → Cart) — do not reorder
5. `finalTableId='0'` is a special trigger value — not a bug
6. All localStorage keys are scoped by restaurantId — do not rename

---

## Sessions Log

| Date | Activity | Outcome |
|---|---|---|
| 2026-07-13 | Pull 13-july branch; create .env placeholders; start services | ✅ Services running |
| 2026-07-13 | Investigation: BUG-2026-02-XX-001 smoke failure on restaurant 699 | Root cause identified (stale checkDistance); live API confirmed working; owner decision pending |
| 2026-07-13 | Investigation: CR-2026-02-XX-002 re-investigation after owner curl + field name provided | BLOCKER 1 resolved (`takeaway_charges:10` confirmed); recommendation changed B→C; B3+B4 still need owner decision |
| 2026-07-13 | Planning (Role 2): BUG-001 + CR-002 impact analysis + implementation plan | Plans written; Q3-B finalised ("Takeaway Charges" label, new standalone row); all owner gates open — Implementation (Role 3) ready |
| 2026-07-13 | Q3-B confirmed by owner: label "Takeaway Charges"; behaviour confirmed (screen ₹10 row · POS delivery_charge="10") | PLANNING_REPORT.md finalised for both items; SESSION_HANDOVER.md updated; all docs closed |
| 2026-07-13 | Implementation (Role 3): BUG-001 A-1+A-2 + CR-002 B-1+B-2+B-3 implemented | 6 code edits across 3 files; testing_agent_v3 structural verification PASS 100%; services running; owner smoke test pending |
| 2026-07-14 | Implementation (Role 3): BUG-001 Plan R2 implemented | 2 surgical edits in ReviewOrder.jsx (setDeliveryCharge destructure + mount useEffect); exit gate 7/7; QA_HANDOVER_R2.md written; owner smoke test pending |
| 2026-07-14 | Implementation (Role 3): BUG-001 Plan R3 implemented | R2 mount-only useEffect replaced with [subtotal] dep + 500ms debounce; ref added; exit gate 7/7; QA_HANDOVER_R3.md written; owner smoke test pending |
| 2026-07-14 | Implementation (Role 3): BUG-001 Plan R4 implemented | Root cause confirmed: async deliveryAddress load race with [subtotal] dep. Fix: added deliveryAddress to dep array → [subtotal, deliveryAddress]. Exit gate 7/7. QA_HANDOVER_R4.md + SESSION_HANDOVER_R4.md written. testing_agent_v3 dispatched. |
