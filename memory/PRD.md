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
- [2026-03-09] Dynamic Edit Order / Browse Menu logic implemented:
  - Task 1: Created checkTableStatus API service
  - Task 2: Landing Page API call on load
  - Task 3: Dynamic button rendering (Edit Order / Browse Menu)
  - Task 4: Edit Order click handler with order fetching
  - Task 5: OrderSuccess page dynamic button logic
  - Task 6: Edge case handling (invalid table, errors, token refresh)
  - Task 7: Scope guard for 716/739 restaurants

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
- /app/frontend/src/pages/LandingPage.jsx - Dynamic button logic, API call, handlers
- /app/frontend/src/pages/OrderSuccess.jsx - Dynamic button based on table presence

## Backlog
- P0: Test complete Edit Order flow (fetch order → navigate with items)
- P1: Real-time order status tracking
- P2: Push notifications
- P2: Payment integration testing
