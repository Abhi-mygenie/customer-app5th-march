# Document Audit Status
- Source File: DEFAULTS_FALLBACKS_AUDIT.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/api/config/axios.js, frontend/src/api/config/endpoints.js, frontend/src/api/services/restaurantService.js, frontend/src/hooks/useMenuData.js, frontend/src/utils/useRestaurantId.js, frontend/src/context/RestaurantConfigContext.jsx, backend/server.py
- Notes: Rewritten as a current-state defaults/fallbacks audit. The previous version captured the right category of concerns, but some item locations and statuses were tied to older code snapshots.

# Defaults & Fallbacks Audit

## Purpose
This document captures meaningful hardcoded defaults, fallback paths, and implicit assumptions still visible in the current codebase.

---

## Executive Summary
The codebase has improved in some critical areas by removing unsafe API-url fallbacks, but still contains several meaningful defaults that affect runtime behavior, branding, routing, and delivery semantics.

## High-Impact Current Findings
| ID | Topic | Severity | Status |
|---|---|---|---|
| DFA-001 | Missing POS base URL now fails visibly instead of silently falling back | Resolved/verified | Verified |
| DFA-002 | Backend now fails fast for missing JWT secret and MYGENIE API URL | Resolved/verified | Verified |
| DFA-003 | Restaurant ID default fallback remains in `useRestaurantId` | Medium | Open |
| DFA-004 | Delivery distance API base reuses image-base env | Medium | Open |
| DFA-005 | Backend default config values are extensive and product-significant | Medium | Open / intentional |
| DFA-006 | Restaurant 716 behavior remains hardcoded | High | Open |
| DFA-007 | India-biased phone defaults remain in customer capture/auth helpers | Medium | Open |
| DFA-008 | CORS wildcard default remains in backend | High | Open |

---

## DFA-001: Frontend API base fallback removal
**Severity:** Previously High, now improved  
**Status:** Verified improvement

### Current code reality
`axios.js` and `endpoints.js` now read `REACT_APP_API_BASE_URL` without silently defaulting to preprod POS URL.

### Impact
- safer failure behavior
- less risk of hidden cross-environment traffic

### Remaining note
The app still depends on correct env wiring, but the fallback risk is materially reduced.

---

## DFA-002: Backend fail-fast for critical envs
**Severity:** Previously High, now improved  
**Status:** Verified improvement

### Current code reality
`server.py` now requires:
- `JWT_SECRET`
- `MYGENIE_API_URL`

and raises on absence.

### Impact
- avoids unsafe hidden runtime defaults for security-sensitive config

---

## DFA-003: Restaurant ID fallback remains in `useRestaurantId`
**Severity:** Medium  
**Status:** Open

### Current code
`frontend/src/utils/useRestaurantId.js` includes:
- `process.env.REACT_APP_RESTAURANT_ID`
- hardcoded default `