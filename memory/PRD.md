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
- All order type flows verified via testing agent

### April 11, 2026 — FEAT-002 Planning ✅
- Analyzed 3 scanner types (walk-in QR, walk-in menu QR, table/room QR)
- All 9 decisions confirmed with stakeholder
- 5 scenario flows mapped, 4 phases defined
- **Key insight:** Table rule changed from orderType-based to tableId-presence-based
- Full spec: `/app/memory/FEAT-002-takeaway-delivery.md`

## 4 Order Channels

| Channel | Scanner | `type` | `orderType` | `tableId` | Table Required | Status |
|---------|---------|--------|-------------|-----------|---------------|--------|
| Table Dine-in | Table QR | `table` | `dinein` | Yes | Yes (auto) | ✅ Done |
| Room Service | Room QR | `room` | `dinein` | Yes | Yes (auto) | ✅ Done |
| Walk-in Dine-in | Walk-in QR | `walkin` | `dinein` | No | No (`table_id='0'`) | Phase 1 |
| Takeaway | Walk-in QR | `walkin` | `takeaway` | No | No (`table_id='0'`) | Phase 2 |
| Delivery | Walk-in QR | `walkin` | `delivery` | No | No (`table_id='0'`) | Phase 3 |

## Implementation Phases

| Phase | Scope | Effort | Blockers |
|-------|-------|--------|----------|
| Phase 1 | Core plumbing: walkin type, table rule update | 3-4 hrs | None |
| Phase 2 | Takeaway: mode selector, mandatory name+phone | 4-6 hrs | None |
| Phase 3 | Delivery: address page, APIs, charge calc | 8-10 hrs | Need API response samples |
| Phase 4 | Polish: error handling, loading states | 2-3 hrs | None |

## Backlog
- P0: FEAT-002 Phases 1-4
- P1: Optimize unused ML/AI dependencies
- P2: React Hook dependency warnings
- P2: Pre-existing ReviewOrder auth token init issue
