# MyGenie Customer App — PRD

## Original Problem Statement
Clone repo from https://github.com/Abhi-mygenie/customer-app5th-march.git (main branch), set up environment, deploy and run.

## Architecture
- Frontend: React 19 + CRACO + Tailwind CSS + Radix UI
- Backend: FastAPI (Python) — single file server.py
- Database: Remote MongoDB (52.66.232.149)
- External APIs: MyGenie POS (preprod.mygenie.online), CRM (crm.mygenie.online)

## What's Been Implemented
- **2026-06-18**: Cloned repo, set up env files, installed deps, deployed successfully
- **2026-06-18**: BUG-042 — Fixed check-in-only order blocking room new orders. POS "Check In" system item (₹0.00) was causing auto-redirect to OrderSuccess, preventing users from placing real food orders on checked-in rooms. Fix: detect check-in-only orders via `previousItems.length === 0` and skip redirect.

## Prioritized Backlog
### P0 (Critical)
- BUG-001: Session ambiguity (dual auth JWT vs CRM token)
- BUG-002: API surface strategy (direct vs proxy)

### P1 (High)
- BUG-003: Delivery charge calculation
- Google Maps fix
- LandingPage refactor (ROADMAP P1-1)
- OrderSuccess refactor (ROADMAP P1-2)

### P2
- JWT rotation
- CORS restriction
- Remove legacy otpRequired flags

## Next Tasks
- QA verification of BUG-042 fix with live room check-in scenario
- Test regression: real food orders still auto-redirect correctly
- Test regression: Phase 2 guest auto-populate still works after fix
