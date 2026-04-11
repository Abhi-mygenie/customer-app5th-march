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
- `type=walkin` recognized in useScannedTable
- Walk-in dine-in/takeaway/delivery send `table_id='0'`
- 14/14 test scenarios passed

### April 11, 2026 — FEAT-002 Phase 2: Takeaway Flow ✅
- `OrderModeSelector` component — Takeaway/Delivery pill toggle
- Mandatory name+phone for takeaway/delivery (always required)
- Browse Menu gated behind validation for takeaway/delivery
- Mode switching (takeaway ↔ delivery) with sessionStorage persistence
- 12/12 test scenarios passed

## 5 Order Scenarios

| Scenario | Scanner | `type` | `tableId` | Table? | Mode Selector | Name+Phone | Status |
|----------|---------|--------|-----------|--------|---------------|------------|--------|
| Table Dine-in | Table QR | `table` | Yes | Auto | No | Config | ✅ |
| Room Service | Room QR | `room` | Yes | Auto | No | Config | ✅ |
| Walk-in Dine-in | Walk-in QR | `walkin` | No | No | No | Config | ✅ |
| Takeaway | Walk-in QR | `walkin` | No | No | Yes (Takeaway) | Mandatory | ✅ |
| Delivery | Walk-in QR | `walkin` | No | No | Yes (Delivery) | Mandatory | Phase 3 |

## Remaining Phases

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 3 | Delivery: address page, APIs, charge calc | Needs API samples |
| Phase 4 | Polish: error handling, loading states | Backlog |

## Spec Documents
- `/app/memory/FEAT-002-takeaway-delivery.md`
- `/app/memory/FEAT-002-PREP-hardcoding-removal.md`
