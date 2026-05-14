# Document Audit Status
- Source File: BUG_TRACKER.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: Medium
- Last Reviewed Areas: frontend/src/pages/LandingPage.jsx, frontend/src/pages/ReviewOrder.jsx, frontend/src/pages/OrderSuccess.jsx, frontend/src/api/services/crmService.js, frontend/src/pages/DeliveryAddress.jsx, frontend/src/utils/authToken.js, backend/server.py
- Notes: Rewritten into a current-state bug/risk tracker focused on issues that are still evidenced, partially evidenced, or still plausible from current code. Historical session-by-session bug closure details that could not be revalidated were not preserved as fact.

# Bug Tracker

## Purpose
This tracker records bug-level and risk-level findings that still matter for the current audited codebase.

It is not a historical changelog. Items here are classified by present confidence against the current repository.

---

## Current Open / Watch Items

| ID | Title | Priority | Status | Evidence Basis |
|---|---|---|---|---|
| BUG-001 | Hybrid auth ownership causes customer-session ambiguity | P0 | Open | Code-verified architectural issue |
| BUG-002 | POS/CRM/backend contract drift risk in customer flows | P0 | Open | Code-verified architectural issue |
| BUG-003 | Delivery integration contract remains partially implicit | P1 | Open | Code-verified |
| BUG-004 | Hook dependency warnings may hide stale-state bugs | P1 | Open | Build-verified |
| BUG-005 | Backend docs path and repo docs path may diverge by environment | P1 | Open | Code-verified |
| BUG-006 | Restaurant 716 behavior remains hardcoded | P1 | Open | Code-verified |
| BUG-007 | Payment payload semantics are confusing and error-prone | P1 | Open | Code-verified |
| BUG-008 | International phone normalization is still India-biased in CRM helpers | P1 | Open | Code-verified |
| BUG-009 | Table-status contract is documented inconsistently across docs and client logic | P1 | Open | Code-verified |
| BUG-010 | Order-details routing path remains environment-dependent and ambiguous | P1 | Open | Partially verified |

---

## Detailed Items

### BUG-001: Hybrid auth ownership causes customer-session ambiguity
- **Priority:** P0
- **Status:** Open
- **Evidence:** `AuthContext.jsx`, `PasswordSetup.jsx`, `Profile.jsx`, `server.py`

**Problem**
The app currently uses:
- backend JWT for admin and some backend customer endpoints
- CRM token for customer auth/profile/address
- POS token for ordering

**Impact**
- more difficult session reasoning
- harder logout/session-expiry handling
- higher bug risk when switching restaurants or moving between flows

**Code evidence**
- `crm_token_{restaurantId}` storage in `AuthContext`
- `auth_token` backend usage still present
- `order_auth_token` POS flow in `utils/authToken.js`

---

### BUG-002: POS/CRM/backend contract drift risk in customer flows
- **Priority:** P0
- **Status:** Open
- **Evidence:** `crmService.js`, `ReviewOrder.jsx`, `Profile.jsx`, `server.py`

**Problem**
Customer-related functionality is split across multiple services with overlapping concerns.

**Examples**
- customer existence lookup via backend
- customer login/profile/address via CRM
- loyalty lookup via backend
- ordering via POS

**Impact**
- difficult source-of-truth ownership
- higher risk of mismatched data or UX assumptions

---

### BUG-003: Delivery integration contract remains partially implicit
- **Priority:** P1
- **Status:** Open
- **Evidence:** `DeliveryAddress.jsx`, `CartContext.js`, `ReviewOrder.jsx`

**Problem**
The delivery flow is implemented in UI terms, but its external service contract remains spread across multiple systems.

**Observed concerns**
- distance API uses `REACT_APP_IMAGE_BASE_URL`
- delivery validation/charge depends on external service behavior not documented in code
- delivery address source comes from CRM, while final order placement goes to POS

**Impact**
- higher integration fragility
- documentation confusion

---

### BUG-004: Hook dependency warnings may hide stale-state bugs
- **Priority:** P1
- **Status:** Open
- **Evidence:** frontend build warnings during audit

**Observed warning areas**
- `LandingCustomerCapture.jsx`
- `AdminConfigContext.jsx`
- `CartContext.js`
- `RestaurantConfigContext.jsx`
- `DeliveryAddress.jsx`
- `OrderSuccess.jsx`
- `Profile.jsx`
- `ReviewOrder.jsx`

**Impact**
- stale closure bugs
- inconsistent side effects after refactors

---

### BUG-005: Backend docs path and repo docs path may diverge by environment
- **Priority:** P1
- **Status:** Open
- **Evidence:** `backend/server.py`

**Problem**
Backend `/api/docs/*` routes read from `/app/memory/*.md`, but the cloned repo stores memory docs under `/app/repo/memory/`.

**Impact**
- doc endpoints may fail depending on deployment filesystem layout
- engineering guidance may differ between served docs and repo docs

---

### BUG-006: Restaurant 716 behavior remains hardcoded
- **Priority:** P1
- **Status:** Open
- **Evidence:** `ReviewOrder.jsx`

**Problem**
Restaurant `716` is explicitly treated as a special-case for duplicate-table behavior and autopaid flow routing.

**Impact**
- business logic embedded as restaurant-id constant
- difficult to generalize
- future restaurant exceptions may multiply

**Suggested direction**
Move this behavior behind restaurant configuration or backend-driven capability flags.

---

### BUG-007: Payment payload semantics are confusing and error-prone
- **Priority:** P1
- **Status:** Open
- **Evidence:** `orderService.ts`, `ReviewOrder.jsx`

**Problem**
UI payment mode selects between online and COD, but outgoing payload still contains:
- `payment_method: 'cash_on_delivery'`
- `payment_type: prepaid | postpaid`

**Impact**
- easy to misunderstand during maintenance
- higher chance of regressions in POS integration

---

### BUG-008: International phone normalization is still India-biased in CRM helpers
- **Priority:** P1
- **Status:** Open
- **Evidence:** `crmService.js`

**Problem**
`stripPhonePrefix()` is explicitly tuned for India `+91` handling.

**Impact**
- weak support for international rollout
- possible CRM lookup/login failures for non-India numbers

---

### BUG-009: Table-status contract is documented inconsistently across docs and client logic
- **Priority:** P1
- **Status:** Open
- **Evidence:** `orderService.ts`, previous memory docs

**Problem**
Current client logic expects nested `status.table_status` and `status.order_id`, while older docs referenced `is_available` style responses.

**Impact**
- documentation confusion
- potential implementation mistakes if someone uses stale docs

---

### BUG-010: Order-details routing path remains environment-dependent and ambiguous
- **Priority:** P1
- **Status:** Open
- **Evidence:** `orderService.ts`, `backend/server.py`

**Problem**
The frontend endpoint builder and backend proxy both represent valid-looking ways to reach order details.

**Impact**
- unclear production routing strategy
- difficult troubleshooting during incidents

---

## Closed / Reduced-Risk Items Visible in Current Code
These are not tracked as active bugs in this refresh because the current code shows mitigation or resolution.

| Item | Current View |
|---|---|
| Frontend core build failure | Not active during this audit |
| Backend startup failure in audited environment | Not active during this audit |
| Missing env fallback handling for JWT secret / MYGENIE API URL | Backend now fails fast |
| Restaurant-scoped cart leakage | Mitigated by current restaurant-scoped cart storage logic |
| Restaurant-scoped CRM token leakage | Mitigated by current `crm_token_{restaurantId}` approach |

---

## Open Questions
1. Which of these should be treated as engineering bugs versus architecture debt items?
2. Should restaurant-specific exception logic be formalized in configuration?
3. Is international phone support in scope for the product roadmap?

## Needs Backend Clarification
- intended ownership split for customer-related flows
- intended production routing for order details
- whether table conflict enforcement should be client-side, backend-side, or POS-side

## Assumption Made
- Historical bug IDs and closed-state details were not preserved unless still provable from the current repository.

---

## What changed from previous version
- Removed historical session ledger style tracking.
- Reframed the bug tracker around current, evidence-based issues and integration risks.
- Preserved only issues that remain relevant or observable in the current code.

## Unverified items
- Historical fix dates
- claims about live-production bug closure not visible in code
- external-service bugs that require runtime reproduction

## Follow-ups recommended
1. Split this into `BUG_TRACKER.md` and `ARCHITECTURE_RISKS.md` if needed.
2. Link each open item to code-owner decisions and target remediation dates.
3. Review after any auth or delivery architecture change.