# Document Audit Status
- Source File: FEAT-002-PREP-hardcoding-removal.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/utils/orderTypeHelpers.js, frontend/src/hooks/useScannedTable.js, frontend/src/utils/useRestaurantId.js, frontend/src/pages/LandingPage.jsx, frontend/src/pages/ReviewOrder.jsx, frontend/src/utils/authToken.js, backend/server.py
- Notes: Rewritten as a current-state preparation audit. The original document contained useful historical context, but this refresh focuses on which hardcoding/fallback concerns still matter in current code.

# FEAT-002-PREP: Hardcoding Removal & Pre-Scale Readiness

## Purpose
This document captures the hardcoding and pre-scale cleanup concerns most relevant to the current codebase before further flow expansion.

## Current Position
Some important hardcoding cleanup has already happened, but several high-value exceptions and defaults remain.

---

## Verified Improvements Already Present
### 1. Critical POS base URL fallback removal
Frontend core API config no longer silently falls back to preprod POS base URL.

### 2. Backend critical env fail-fast behavior
Backend now requires `JWT_SECRET` and `MYGENIE_API_URL`.

### 3. Restaurant-scoped cart and CRM-token isolation
Current code uses restaurant-scoped storage keys for cart and CRM auth.

### 4. Table requirement logic is no longer broadly tied to generic dine-in assumptions
Assigned-table logic now depends primarily on actual scanned table presence.

---

## Remaining Hardcoding / Default Risks

### PREP-001: Restaurant 716 special-case logic
**Status:** Still present

Current code hardcodes restaurant `716` for special ordering behavior.

**Risk**
- business logic encoded as restaurant constant
- difficult to extend cleanly

### PREP-002: Default restaurant fallback in `useRestaurantId`
**Status:** Still present

Current code retains preview-oriented fallback behavior, including hardcoded default restaurant ID.

**Risk**
- confusing local/preview behavior
- hidden routing assumptions

### PREP-003: Delivery API base tied to image-base env
**Status:** Still present

Current code uses `REACT_APP_IMAGE_BASE_URL` as the base for distance API calls.

**Risk**
- misleading configuration semantics
- harder environment reasoning

### PREP-004: India-biased phone assumptions
**Status:** Still present

Examples visible in:
- `crmService.js`
- `LandingCustomerCapture.jsx`
- backend phone normalization logic

**Risk**
- future international rollout friction

### PREP-005: CORS wildcard default in backend
**Status:** Still present

Backend defaults `CORS_ORIGINS` to `*` if env is absent.

**Risk**
- risky production default posture

---

## Order-Type / Table Logic Status
### Current state
The old “dine-in implies table” mindset is no longer the best description of current code.

### Better current rule
- assigned table/room behavior depends on actual `tableId`
- dine-in context still matters for certain UX actions
- walk-in takeaway/delivery paths no longer inherit table assumptions

**Status:** Verified in code

---

## Config vs Hardcoded Behavior Balance
### Config-driven today
- many UI visibility flags
- branding
- payment options
- popup config
- timing/shifts

### Still hardcoded today
- special-case restaurant exception logic
- some preview/default routing assumptions
- some phone-country assumptions
- some backend/env defaults

---

## Recommended Cleanup Priorities
1. replace restaurant-id hardcoded exceptions with config/capability flags
2. remove or isolate preview-oriented default restaurant fallback
3. rename or split delivery/manage env usage to reflect actual purpose
4. document or generalize phone normalization rules
5. tighten production CORS defaults

---

## Open Questions
1. Which remaining hardcoded behaviors are intentional product rules versus temporary engineering shortcuts?
2. Should preview/development defaults remain in mainline code or move to environment-only setup?
3. Is international phone support actually in scope for the product roadmap?

## Needs Backend Clarification
- capability-flag model for restaurant-specific ordering behavior
- production CORS posture
- intended env model for manage/delivery services

## Assumption Made
- This prep document is now treated as a current-state readiness checklist, not a historical worklog.

---

## What changed from previous version
- removed historical completion claims not needed for current engineering use
- focused on what remains hardcoded today
- aligned table-requirement language to current helper and page logic

## Unverified items
- whether some remaining defaults are relied on intentionally in deployment tooling
- production behavior of preview-oriented fallbacks

## Follow-ups recommended
1. Turn remaining high-risk hardcoding into explicit tickets.
2. Add config-driven restaurant capability flags.
3. Re-run this audit after auth/delivery architecture cleanup.