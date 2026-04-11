# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git, branch `11-april-refactor-3`. Set up and run the app. Extend Scan & Order to support Takeaway and Delivery channels.

## Architecture
- **Frontend**: React (CRA with Craco) + Tailwind CSS + Radix UI + shadcn components
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: External MongoDB at `52.66.232.149:27017/mygenie`
- **External API**: MyGenie POS API at `https://preprod.mygenie.online/api/v1`

## What's Been Implemented

### April 11, 2026 — Initial Setup
- Cloned repo, set up env, resolved build issues, app running

### April 11, 2026 — FEAT-002-PREP: Hardcoding Removal ✅
- 10 fixes across 7 files, new `orderTypeHelpers.js` utility

### April 11, 2026 — FEAT-002 Planning ✅
- 3 scanner types analyzed, 9 decisions confirmed, 5 scenarios mapped

### April 11, 2026 — FEAT-002 Phase 1: Core Plumbing ✅
- **Key change:** Table rule → `hasAssignedTable(tableId)` instead of `isDineInOrRoom(orderType)`
- `type=walkin` recognized in `useScannedTable.js`
- Walk-in dine-in/takeaway/delivery all send `table_id='0'`
- `isDineInOrRoom()` still used for Call Waiter/Pay Bill (dine-in context actions)
- **14/14 frontend test scenarios passed**
- Files: orderTypeHelpers.js, useScannedTable.js, LandingPage.jsx, ReviewOrder.jsx, OrderSuccess.jsx, TableRoomSelector.jsx

## 5 Order Scenarios

| Scenario | Scanner | `type` | `tableId` | Table? | `table_id` to POS | Status |
|----------|---------|--------|-----------|--------|-------------------|--------|
| Table Dine-in | Table QR | `table` | Yes | Auto-filled | From QR | ✅ Done |
| Room Service | Room QR | `room` | Yes | Auto-filled | From QR | ✅ Done |
| Walk-in Dine-in | Walk-in QR | `walkin` | No | No | `'0'` | ✅ Done |
| Takeaway | Walk-in QR | `walkin` | No | No | `'0'` | Phase 2 |
| Delivery | Walk-in QR | `walkin` | No | No | `'0'` | Phase 3 |

## Implementation Phases

| Phase | Scope | Effort | Status |
|-------|-------|--------|--------|
| PREP | Hardcoding removal | 3 hrs | ✅ Done |
| Phase 1 | Core plumbing: walkin type, table rule | 2 hrs | ✅ Done |
| Phase 2 | Takeaway: mode selector, mandatory name+phone | 4-6 hrs | Next |
| Phase 3 | Delivery: address page, APIs, charge calc | 8-10 hrs | Needs API samples |
| Phase 4 | Polish: error handling, loading states | 2-3 hrs | Backlog |

## Spec Documents
- `/app/memory/FEAT-002-takeaway-delivery.md` — Full spec with all decisions
- `/app/memory/FEAT-002-PREP-hardcoding-removal.md` — Audit & fixes
