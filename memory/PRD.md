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

### CR-2026-02-XX-002 — Restaurant 699 takeaway charge ⛔ PENDING OWNER DECISION

| Field | Value |
|---|---|
| Status | **PLANNING COMPLETE (2026-07-13)** — awaiting owner gate approval (B-1 CRITICAL hotspot). Plan: `PLANNING_REPORT.md` |
| Severity | P1 |
| Risk | LOW-MEDIUM (`orderService.ts` is CRITICAL hotspot) |
| What is needed | ₹10 takeaway packaging charge for restaurant 699 injected into `delivery_charge` payload field |
| Field confirmed | `takeaway_charges: 10` in `preprod.mygenie.online/api/v1/web/restaurant-info` (payload: `{"restaurant_web":"699"}`) |
| Fix recommendation | **Option C** (config-driven via `useRestaurantDetails` hook — already in FE, no backend changes needed, no hardcode) |
| Blockers remaining | B3: owner approval to touch `orderService.ts` · B4: owner selects Option C |
| Non-blocker | B2: `owner@brew.com` not in own-BE users (only blocks smoke test) |
| GAP-021 | Can be CLOSED immediately once Option C is implemented (no hardcode, no sunset needed) |
| Folder | `/app/memory/change_requests/CR-2026-02-XX-002-restaurant-699-takeaway-charge/` |
| Key docs | INTAKE_DOC.md, INVESTIGATION_REPORT.md (+ §11), BACKEND_VALIDATION_ADDENDUM.md (+ §9), SESSION_HANDOVER.md |

---

### BUG-2026-02-XX-001 — Delivery charge not calculated ❌ SMOKE FAILED

| Field | Value |
|---|---|
| Status | Option A SHIPPED — Smoke test FAILED (2026-07-13) |
| Severity | P1 |
| Risk | MEDIUM |
| File changed | `frontend/src/pages/DeliveryAddress.jsx` (line 320) |
| What shipped | `order_value: '0'` → `order_value: String(getTotalPrice() \|\| 0)` |
| Why smoke failed | `checkDistance` not re-triggered when cart total crosses ₹250 threshold after delivery address page already loaded — stale `distanceResult` shown |
| API confirmed | `manage.mygenie.online` distance API works correctly: order_value ≥ ₹250 → shipping_charge=0 for restaurant 699 |
| Next action | **Owner gate approval needed** — approve A-1, A-2 (bundle/separate?), and R1/R2. Plan: `PLANNING_REPORT.md` |
| Folder | `/app/memory/change_requests/BUG-2026-02-XX-001-delivery-charge-not-calculated/` |
| Key docs | INTAKE_DOC.md, INVESTIGATION_REPORT.md (+ addendum §9), QA_HANDOVER.md (+ §9), SESSION_HANDOVER.md |

---

## Parked / Untouched Items

| Item | Status | Note |
|---|---|---|
| CR-2026-02-XX-002 (Rest 699 takeaway ₹10) | PARKED | Per owner instruction; awaiting `takeaway_charge` field clarification |
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
