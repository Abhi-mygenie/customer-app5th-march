# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git, branch `11-april-refactor-3`. Extend Scan & Order to support Takeaway and Delivery channels.

## Architecture
- **Frontend**: React (CRA with Craco) + Tailwind CSS + Radix UI + shadcn
- **Backend**: FastAPI (Python) with Motor (async MongoDB)
- **Database**: External MongoDB at `52.66.232.149:27017/mygenie`
- **External API**: MyGenie POS API at `https://preprod.mygenie.online/api/v1`

## Implementation History

### April 11, 2026 — Initial Setup ✅
- Cloned repo, set up env, resolved build issues, app running

### April 11, 2026 — FEAT-002-PREP: Hardcoding Removal ✅
- 10 fixes across 7 files, `orderTypeHelpers.js` utility created

### April 11, 2026 — FEAT-002 Phase 1: Core Plumbing ✅
- Table rule: `hasAssignedTable(tableId)` — table needed only when tableId in URL
- `type=walkin` recognized in useScannedTable, `updateOrderType()` for mode switching
- Walk-in dine-in/takeaway/delivery send `table_id='0'`
- 14/14 test scenarios passed

### April 11, 2026 — FEAT-002 Phase 2: Takeaway Flow ✅
- `OrderModeSelector` component — Takeaway/Delivery pill toggle
- Mandatory name+phone for takeaway/delivery (always required)
- Browse Menu gated behind validation, skip for authenticated users
- Mode switching (takeaway ↔ delivery) with sessionStorage persistence
- 12/12 test scenarios passed

### April 11, 2026 — BUG-043: Payment Defaults Fix ✅
- Root cause: previous refactoring broke 3 payment settings
- Fix 1: `paymentMethod` default from `'online'` to `'cod'`
- Fix 2: autopaid endpoint gated on `restaurantId === '716'` only
- Fix 3: helpers.js `payment_type` from hardcoded `'prepaid'` to dynamic
- Orders now landing on dashboard correctly

### April 11, 2026 — Additional Fixes ✅
- `[object Object]` error display on PasswordSetup page
- `restaurant_id` sent as integer → cast to String
- Logged-in user couldn't Browse Menu on takeaway → skip capture validation
- Customer name/phone not pre-filling on ReviewOrder → save to localStorage on all auth paths
- Console logs enabled for auth + landing page debugging
- `REACT_APP_LOGIN_PASSWORD` env var added

## 5 Order Scenarios

| Scenario | Scanner | `type` | `tableId` | Table? | Mode Selector | Name+Phone | Status |
|----------|---------|--------|-----------|--------|---------------|------------|--------|
| Table Dine-in | Table QR | `table` | Yes | Auto | No | Config | ✅ |
| Room Service | Room QR | `room` | Yes | Auto | No | Config | ✅ |
| Walk-in Dine-in | Walk-in QR | `walkin` | No | No | No | Config | ✅ |
| Takeaway | Walk-in QR | `walkin` | No | No | Yes (Takeaway) | Mandatory | ✅ |
| Delivery | Walk-in QR | `walkin` | No | No | Yes (Delivery) | Mandatory | Phase 3 |

## Payment Rules (Confirmed)
| Field | Value | Rule |
|-------|-------|------|
| `payment_method` | Always `"cash_on_delivery"` | Hardcoded |
| `payment_type` | `"prepaid"` if Razorpay, `"postpaid"` if COD | User's UI choice |
| Endpoint (716) | `autopaid-place-prepaid-order` | Only restaurant 716 |
| Endpoint (others) | `/customer/order/place` | All other restaurants |

## Open Bugs
- **BUG-044:** POS returns `razorpay_id` for COD orders — POS backend team to fix

## Remaining Phases
| Phase | Scope | Blocker |
|-------|-------|---------|
| Phase 3 | Delivery: address page, APIs, charge calc | Needs API response samples |
| Phase 4 | Polish: error handling, loading states | After Phase 3 |

## Refactoring Backlog (6 items, ~10 min)
- ReviewOrder.jsx: stale isDineInOrRoom in table auto-fill + dead condition
- LandingPage.jsx + OrderSuccess.jsx: unused isDineInOrRoom import
- TableRoomSelector.jsx: unused scannedOrderType prop
- orderTypeHelpers.js: unused needsTableCheck/isWalkin exports

## Spec Documents
- `/app/memory/FEAT-002-takeaway-delivery.md`
- `/app/memory/FEAT-002-PREP-hardcoding-removal.md`
- `/app/memory/CUSTOMER_ENDPOINTS.md`
- `/app/memory/BUG_TRACKER.md`
