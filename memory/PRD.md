# MyGenie Customer App PRD

Last updated: 2026-05-09

## Session log — 2026-05-08 → 2026-05-09 (E1 Agent)

### Session purpose
- 2026-05-08: pull `main` of `customer-app5th-march`, validate build/compile, deploy hand-over.
- 2026-05-08 follow-up: replace `/app/memory/` with `6-may` branch contents (53 files, 2.0 MB) per owner direction; backup at `/app/memory_main_backup/`.
- 2026-05-08 / 09: investigation-driven CRs and surgical fixes per owner approval gates.

### Code changes applied this session (all CSS/UX-only, no business logic)
1. **iPhone input-focus zoom fix** (Option A surgical) — bumped 9 CSS `font-size` declarations to 16 px across `CustomerDetails.css`, `ReviewOrder.css`, `LandingCustomerCapture.css`. Validated on iPhone/Android/Desktop emulation.
2. **Room-scanner intermittent-WC fix** (Option G1) — gated `clearScannedTable()` calls in `OrderSuccess.jsx` (status 3/6 + 404 branches) behind `if (String(restaurantId) === '716')`. Cart/edit-mode/navigation/toast logic untouched. Lint clean; webpack green; simulation-validated for 478 (preserves) and 716 (still wipes intentionally) across all 3 trigger conditions. **Pending real-scanner field validation** — see `/app/memory/change_requests/ROOM_SCANNER_INTERMITTENT_WC_STATUS_2026-05-09.md`.

### Investigation CRs authored this session (no code change in these)
- `IPHONE_INPUT_ZOOM_BUG_INVESTIGATION_2026-05-08.md` — implemented (#1 above)
- `ITEM_CHANNEL_AVAILABILITY_BUG_INVESTIGATION_2026-05-08.md` — pending owner Step-0 + decision on Options A/B/C
- `PRODUCT_API_FIELD_MAPPING_INVESTIGATION_2026-05-08.md` — pending owner decision on Options I/II/III/IV/V/VI
- `ROOM_SCANNER_ORDER_AS_WALKIN_INVESTIGATION_2026-05-08.md` — superseded by intermittent-WC CR
- `ROOM_SCANNER_INTERMITTENT_WC_INVESTIGATION_2026-05-08.md` — Option G1 implemented; G2/G3 deferred per owner

### Deferred / kept-warm follow-ups
- **G2** (move scan storage `sessionStorage → localStorage`) — deferred by owner due to stale-context risk.
- **G3** (defensive toast at `ReviewOrder.jsx:949` when `roomOrTable='room'` but `finalTableId='0'`) — kept warm; revisit if any future "WC" report appears after G1 ships.
- Channel-availability filter (CR Options A/B/C) — pending owner Step-0 probe of `/web/restaurant-product`.
- Field-mapping fixes (`status` kill-switch, `egg`/`jain` correction, per-item `tax_calc`/`discount`) — pending owner decision and POS contract confirmations.

### Build / env state
- `/app/backend/.env` and `/app/frontend/.env` written per owner-supplied values; `JWT_SECRET` is a placeholder (must rotate for prod).
- Backend RUNNING (47 routes, MongoDB 7.0.30, 23 collections). Frontend RUNNING (HTTP 200, hot-reload OK).
- Latest remote commit pulled: `b89587dc933776542e659b8fdb4d6a9d18106a63` (`main`, 2026-05-07 10:16:21 UTC).
- See `/app/DEPLOYMENT_VALIDATION_HANDOVER.md` for the full env-var audit + handover.

---

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
- Updated notification modal behavior so manual popups show an `OK` button instead of countdown text while preserving auto-close behavior
- Added popup regression test coverage: `frontend/src/__tests__/components/NotificationPopup.test.js`

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
  - `frontend/src/components/NotificationPopup/NotificationPopup.jsx`
  - `frontend/src/pages/admin/AdminSettingsPage.jsx`
  - `frontend/src/__tests__/components/NotificationPopup.test.js`
- Focused frontend test passed:
  - `CI=true yarn test --watchAll=false --runTestsByPath src/__tests__/pages/DeliveryAddress.test.js`
  - `CI=true yarn test --watchAll=false --runTestsByPath src/__tests__/components/NotificationPopup.test.js`
- Frontend testing agent verified MAPS-01 fix and reported zero Google Maps `INVALID_REQUEST` errors for the guarded flow
- Frontend testing agent verified the new manual popup `OK` button behavior and reported no regressions

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

## Recent changes
- 2026-02 — Investigation report: `/app/memory/change_requests/DELIVERY_PHONE_AND_ADDRESS_FLOW_INVESTIGATION_2026-02-XX.md` (phone +91 editability, selected-vs-current address clarity, saved-address edit API audit).
- 2026-02 — Phone +91 display fix #1 (CSS-only) on `CustomerDetails.css`: removed visible-select override + hid `.PhoneInputCountrySelectArrow`. Mirrors `LandingCustomerCapture` safe pattern. No payload, OTP, or order-placement contract change. Pending owner real-device validation on Review Order screen.
- 2026-02 — Phone +91 display fix #2 (JSX-only) on `LandingCustomerCapture.jsx`: removed the `international` prop from `<PhoneInput>`. Input now renders national-format only (e.g. "98765 43210"); user cannot backspace into `+91`; flag dropdown still opens country picker (verified switching IN→US works). Internal state still E.164 (`+919876543210` confirmed in localStorage). `extractPhoneNumber` / `getDialCode` / `stripPhonePrefix` outputs unchanged. Browse Menu navigation regression-tested.
- 2026-02 — Investigation: `/app/memory/change_requests/ROOM_ORDER_VALIDATION_AND_LANDING_MANDATORY_RULES_INVESTIGATION_2026-02-XX.md`. Confirmed silent `table_id='0'` fallback for non-716 room scans → Walk-In/WC bug; mandatory rules are admin-config only; no room/check-in/guest API exists.
- 2026-02 — CR plan: `/app/memory/change_requests/ROOM_CHECKIN_GATE_AND_GUEST_AUTOPOPULATE_CR_PLAN_2026-02-XX.md`. Defined Phase 1 (frontend-only guard) + Phase 2 (backend room-checkin endpoint contract).
- 2026-02 — Phase 1 Room Scanner Availability Gate IMPLEMENTED. Files: `LandingPage.jsx` (gate + race-fix to wait for restaurant data) and `ReviewOrder.jsx` (pre-submit guard). Block `type=room` QR flow when API returns `Available` (vacant), errors out, or `tableId` missing/invalid. 716 naturally excluded via existing `isMultipleMenu` skip + explicit `String(restaurantId) !== '716'` in ReviewOrder guard. Walk-in / table / takeaway / delivery / 716 verified unaffected via screenshot tool. No payload, tax, KOT, socket, or backend changes.
4. If needed later, extend the popup close-behavior UX to banner/toast variants too