# Customer App - MyGenie

## Original Problem Statement
1. Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git
2. Use MongoDB connection: mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie
3. Implement dynamic Edit Order vs Browse Menu button logic

## Architecture
- **Frontend:** React 19 with Tailwind CSS, deployed on port 3000
- **Backend:** FastAPI with Motor (async MongoDB driver), deployed on port 8001
- **Database:** Remote MongoDB (mygenie database)
- **External API:** preprod.mygenie.online for table status check

## What's Been Implemented
- [2026-03-09] Repository cloned and set up
- [2026-03-09] MongoDB connection configured to remote database
- [2026-03-09] Dynamic Edit Order / Browse Menu logic implemented
- [2026-03-09] ReviewOrder page UX overhaul:
  - 10-second auto-redirect timer with countdown + progress bar
  - "Browse Menu" button rename (was "Go to Menu")
  - Removed "Ready to order?" image/text from empty cart view
  - Redirect routes through LandingPage for business logic
- [2026-03-09] Back arrow + header title in ReviewOrder now use `var(--button-text-color)` (admin-configurable, not hardcoded)
- [2026-03-09] New independent Landing Page visibility settings added:
  - `showLandingCallWaiter` - controls Call Waiter button on Landing Page
  - `showLandingPayBill` - controls Pay Bill button on Landing Page
  - Added to backend model, default config, RestaurantConfigContext, VisibilityTab (Landing Page section)
  - LandingPage.jsx now uses these new flags (separate from Order Status page flags)

## Business Logic
- Table scanned + Occupied (existing order) → EDIT ORDER button
- Table scanned + Available (no order) → BROWSE MENU button
- No table scanned → BROWSE MENU button
- 716/739 restaurants → Excluded (use stations-based flow)

## API Endpoints
- GET /customer/check-table-status?table_id={id}&restaurant_id={id}
  - Returns: { status: { table_status: "Available"|"Not Available", order_id: "" } }

## Files Modified
- /app/frontend/src/api/config/endpoints.js - Added CHECK_TABLE_STATUS endpoint
- /app/frontend/src/api/services/orderService.js - Added checkTableStatus function
- /app/frontend/src/pages/LandingPage.jsx - Dynamic button logic, new landing-specific flags
- /app/frontend/src/pages/OrderSuccess.jsx - Dynamic button based on table presence
- /app/frontend/src/pages/ReviewOrder.css - Back arrow + title use var(--button-text-color)
- /app/frontend/src/context/RestaurantConfigContext.jsx - Added showLandingCallWaiter/showLandingPayBill
- /app/frontend/src/components/AdminSettings/VisibilityTab.jsx - Added toggles for landing page
- /app/backend/server.py - Added showLandingCallWaiter/showLandingPayBill fields

## What's Been Implemented (continued)
- [2026-03-10] Order Success page: Show variants & addons for each food item
  - Added variations and add_ons to item data mapping in fetchOrderStatus()
  - Added UI rendering for variant/addon text below item name
  - Fixed price to include addon costs (base + addons)
- [2026-03-10] Order Success page: Live status progress bar (f_order_status: 7→1→2→5)
- [2026-03-10] Order Success page: Terminal status handling (3=Cancelled, 6=Paid → redirect)
- [2026-03-10] Order Success page: Hide item badges when f_order_status is 7

## What's Been Implemented (continued 2)
- [2026-03-10] Review screen: Customizable items now show Repeat Item Modal on "+" tap (same as Menu screen)
  - Modified OrderItemCard.jsx to check if item is customizable (has variations/add_ons)
  - On "+": customizable items open RepeatItemModal (Repeat/Customize); non-customizable increment directly
  - On "−": all items decrement directly (consistent with menu screen)
- [2026-03-10] Category "All" icon color fix: Changed SVG icon from blue (--color-primary-light) to neutral gray (--text-secondary) for consistency with other category image icons

## Backlog
- P0: Handle f_order_status: 8 (Payment pending from PG) — behavior TBD
- P1: Login JSON Parsing Error — faulty auth interceptor causes JSON parsing errors on login failure
- P1: Verify hamburger button hover style consistency (user verification pending)
- P1: Variants not displayed on Order Success Page (BLOCKED by external POS API)
- P2: Push notifications
- P2: Payment integration testing
- P2: CSS consolidation across fragmented style files
