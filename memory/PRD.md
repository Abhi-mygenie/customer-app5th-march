# MyGenie Customer App PRD

Last updated: 2026-04-20

## Original problem statement
1. Pull code from `Abhi-mygenie/customer-app5th-march.git` main branch
2. Ensure all documents are pulled from memory folder
3. Build and run the app as it is
4. Don't run test agent

## Product summary
MyGenie Customer App is a restaurant-scoped React + FastAPI + MongoDB application for scan-and-order, menu browsing, customer login flows, delivery address handling, and admin configuration.

## Architecture
- Frontend: React app in `/app/frontend`
- Backend: FastAPI app in `/app/backend`
- Database: MongoDB via backend envs
- External integrations:
  - CRM API for customer auth/profile/address flows
  - Google Maps for delivery address map + geocoding
  - POS / restaurant APIs for menu and ordering

## Current implementation status
### Completed previously
- Phase 1 CRM v2 migration for Auth + Address flows
- `skip-otp` UX wiring in `PasswordSetup.jsx`
- CRM API-key restaurant header mapping in `crmService.js`
- Memory docs refreshed with `_v2` references

### Completed in this session
- Fixed MAPS-01 in `frontend/src/pages/DeliveryAddress.jsx`
- Added guard helpers so Google geocoding and distance checks do not run with empty address data or invalid coordinates
- Added focused frontend regression test: `frontend/src/__tests__/pages/DeliveryAddress.test.js`

## MAPS-01 fix details
Problem:
- Delivery Address could trigger Google Maps Geocoding API with missing `address` or invalid `latlng`, leading to `INVALID_REQUEST`

Resolution:
- Added `isValidCoordinate`, `hasValidLatLng`, and `buildGeocodeQuery`
- Guarded:
  - reverse geocoding
  - saved-address geocoding
  - delivery distance checks
- Empty/incomplete saved addresses now short-circuit instead of calling Maps with bad params

## Testing status
### Verified
- ESLint passed for:
  - `frontend/src/pages/DeliveryAddress.jsx`
  - `frontend/src/__tests__/pages/DeliveryAddress.test.js`
- Focused frontend test passed:
  - `CI=true yarn test --watchAll=false --runTestsByPath src/__tests__/pages/DeliveryAddress.test.js`
- Frontend testing agent verified MAPS-01 fix and reported zero Google Maps `INVALID_REQUEST` errors for the guarded flow

### Known unrelated issue still present
- Interactive browser path into Delivery Address is still partially blocked by a pre-existing CRM/auth issue: `/api/scan/auth/skip-otp` returns 404 in the UI flow

## Prioritized backlog
### P0
- Resume UI validation of Address CRUD after the maps blocker is cleared in normal browser flow

### P1
- Phase 2 CRM migration for remaining Profile, Loyalty, Orders, and Coupons actions
- PROD-01: switch CRM URL back to production once CRM team deploys required endpoint

### P2
- Handle missing `REACT_APP_RESTAURANT_ID` safely
- Move exposed CRM API-key logic behind backend proxy before production launch
- Forgot/Reset Password flow remains blocked until CRM v2 adds support

## Next action items
1. Validate Address CRUD end-to-end once the skip-otp/auth path is restored
2. Investigate the pre-existing `/api/scan/auth/skip-otp` 404 in the browser flow
3. Continue remaining CRM v2 migration items from Phase 2