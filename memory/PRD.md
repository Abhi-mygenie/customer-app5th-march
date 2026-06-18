# MyGenie Customer App — PRD

## Original Problem Statement
Clone repo from https://github.com/Abhi-mygenie/customer-app5th-march.git (main branch), set up environment, deploy and run. Then investigate and fix room order placement issues.

## User Personas
- **Restaurant Customer** — Scans room/table QR, browses menu, places orders
- **Restaurant Admin** — Configures app branding, visibility, banners, menu via admin panel
- **Hotel Guest** — Scans room QR after check-in, orders food to room

## Core Requirements
- QR-based restaurant ordering (dine-in, takeaway, delivery)
- Multi-tenant by restaurantId (URL-based)
- Room scanner flow with check-in gate (Phase 1 + Phase 2)
- Admin configuration panel for branding, visibility, content
- Payment integration (Razorpay + COD)
- Customer loyalty points, wallet, coupons

## Architecture
- **Frontend:** React 19 + CRACO + Tailwind CSS + Radix UI + TanStack React Query
- **Backend:** FastAPI (Python) — single file `server.py`
- **Database:** Remote MongoDB (52.66.232.149, db: mygenie)
- **External APIs:** MyGenie POS (preprod.mygenie.online), CRM (crm.mygenie.online), Google Maps
- **Auth:** Dual — backend JWT (admin) + CRM token (customer, restaurant-scoped)
- **State:** React Context (Auth, Cart, RestaurantConfig) + localStorage persistence

## What's Been Implemented

### Session 2026-06-18: Deployment + BUG-042 Fix
1. **Deployment:** Cloned repo (main branch), configured backend/frontend .env files, installed dependencies, started services via supervisor. Backend (FastAPI) on port 8001, Frontend (React/CRACO) on port 3000. All services running.

2. **Investigation: Room Check-In Order Blocking (BUG-042)**
   - **Symptom:** User scans room QR for a checked-in room → sees "Order Placed! ₹0.00" (OrderSuccess) instead of Browse Menu
   - **Root cause:** POS creates a "Check In" system-item order (₹0.00, f_order_status=5) at room check-in. The auto-redirect logic at `LandingPage.jsx:306` only filtered cancelled (3) and paid (6) statuses — status 5 (SERVED) passed through, causing auto-redirect to OrderSuccess for the check-in placeholder order.
   - **Fix applied:** Added `hasRealFoodItems` check using existing `previousItems` (already filtered by `filterSystemItems`). If `previousItems.length === 0`, skip redirect and nullify `orderId`/`isOccupied` → user sees Browse Menu + Phase 2 guest auto-populate.
   - **Files changed:** `frontend/src/pages/LandingPage.jsx` (lines 305-347, ~10 lines added)
   - **Risk:** MEDIUM — no payload, backend, tax, or payment changes
   - **Status:** IMPLEMENTED, compiled successfully, awaiting QA

3. **Documentation reviewed:**
   - Alpha agent system prompt (`memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md`)
   - Room QR flow investigation (`INV-2026-06-17-003`)
   - Room order validation investigation (`ROOM_ORDER_VALIDATION_AND_LANDING_MANDATORY_RULES_INVESTIGATION`)
   - Room check-in gate CR plan (`ROOM_CHECKIN_GATE_AND_GUEST_AUTOPOPULATE_CR_PLAN`)
   - Phase 2 auto-populate plan (`ROOM_GUEST_AUTOPOPULATE_PHASE2_PLAN`)
   - Verified Phase 2 (F-2) is fully implemented across 5 files

## Prioritized Backlog

### P0 (Critical)
- BUG-001: Hybrid auth ownership causes customer-session ambiguity
- BUG-002: POS/CRM/backend contract drift risk

### P1 (High)
- BUG-042: QA verification with live room check-in scenario (implemented, needs QA)
- BUG-003: Delivery integration contract partially implicit
- BUG-006: Restaurant 716 hardcoded behavior
- BUG-007: Payment payload semantics (payment_method vs payment_type)
- LandingPage refactor (ROADMAP P1-1)
- OrderSuccess refactor (ROADMAP P1-2)

### P2
- BUG-004: Hook dependency warnings
- BUG-005: Backend docs path divergence
- BUG-008: International phone normalization
- BUG-009: Table-status contract documentation
- BUG-010: Order-details routing ambiguity
- JWT rotation
- CORS restriction
- Remove legacy otpRequired flags

## Next Tasks
1. QA BUG-042 fix with live room check-in scenario (Room r2, restaurant 478, order 939983)
2. Regression: real food orders still auto-redirect correctly
3. Regression: Phase 2 guest auto-populate + lock still works
4. Regression: Edit Order flow for orders with real food items
