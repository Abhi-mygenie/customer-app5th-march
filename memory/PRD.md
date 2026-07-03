# MyGenie Customer App — PRD

## Original Problem Statement
Clone repo from https://github.com/Abhi-mygenie/customer-app5th-march.git (main branch), set up environment, deploy and run. Investigate and fix room order placement issues. Full QA audit of all implemented features.

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

### Session 2026-06-18
1. **Deployment** — Cloned repo, configured env files, installed deps, services running
2. **BUG-042 Fix** — Check-in-only order no longer blocks room new orders (LandingPage.jsx)
3. **Full QA Audit** — 3 QA iterations covering all previously-unverified items:
   - Iteration 9: BUG-042 ✅
   - Iteration 10: BUG-035/039/040/041 + CR-2026-05-30-002 ✅
   - Iteration 11: CR-2026-06-17-004 + Phase 1 (F-1) + Phase 2 (F-2) ✅
4. **Documentation** — 8 new docs created, 5 stale status labels updated, bug tracker updated
5. **POS Investigation** — Confirmed APP-5 (category_order), APP-6 (menu_order), POS-4 (web_available_time) all still pending on POS team

### Previously Implemented (QA verified this session)
- CR-2026-05-30-001 Item 1: Skip OTP + mandatory fields
- CR-2026-05-30-002: Restrict non-QR orders (3 checkpoint guards + diagnostics)
- CR-2026-06-17-001: Menu order enhancements (APP-1 through APP-4)
- CR-2026-06-17-002: Channel preview in admin
- CR-2026-06-17-003: Customer menu availability
- CR-2026-06-17-004: Delivery GST backend key switch
- BUG-035/039/040/041: Order placement + payment retry fixes
- Phase 1 (F-1): Room scanner availability gate
- Phase 2 (F-2): Room guest auto-populate + lock

## Prioritized Backlog

### Blocked on POS Team
- APP-5: `category_order` in `/web/restaurant-product` — backend will add
- APP-6: `menu_order` in `/web/menu-master` — backend will add
- POS-3: `food_order` populated for all restaurants
- POS-4: `web_available_time_starts/ends` populated

### Parked (by design)
- CR-2026-05-30-001 Items 2 & 3: Table/room misrouting root cause (CR-002 is workaround)

### Architecture Debt (open, no implementation planned)
- BUG-001 (P0): Hybrid auth session ambiguity
- BUG-002 (P0): POS/CRM/backend contract drift
- BUG-003 (P1): Delivery integration contract
- BUG-004 (P1): Hook dependency warnings
- BUG-005 (P1): Backend docs path divergence
- BUG-006 (P1): Restaurant 716 hardcoded behavior
- BUG-007 (P1): Payment payload semantics
- BUG-008 (P1): Phone normalization India-biased
- BUG-009 (P1): Table-status contract documentation
- BUG-010 (P1): Order-details routing ambiguous

## Next Tasks
1. Wire APP-5/APP-6 frontend merge when POS adds fields
2. Test POS-4 timing with real data when populated
3. Owner sign-off on all QA-passed items
4. Owner decision on BUG-001/BUG-002 architecture remediation
