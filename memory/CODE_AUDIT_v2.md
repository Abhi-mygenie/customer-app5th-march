# Document Audit Status
- Source File: CODE_AUDIT.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/api/services/orderService.ts, frontend/src/utils/authToken.js, frontend/src/context/AuthContext.jsx, frontend/src/context/CartContext.js, frontend/src/context/RestaurantConfigContext.jsx, frontend/src/pages/LandingPage.jsx, frontend/src/pages/ReviewOrder.jsx, frontend/src/pages/OrderSuccess.jsx, backend/server.py, frontend build output
- Notes: Rewritten as a current-state code audit summary. The previous version mixed historical issue tracking with resolved items from other sessions and some repo states that cannot be assumed without re-running full audits.

# Code Audit Report

## Executive Summary
The current codebase is functional and buildable, but architecturally complex.

### Current audit conclusion
- **Frontend build:** successful
- **Supervisor runtime:** healthy at time of audit
- **Main technical risk:** hybrid integration and orchestration complexity, not immediate compile/runtime failure

### Overall risk view
| Area | Current Risk | Notes |
|---|---|---|
| Build stability | Medium-Low | Frontend builds successfully; backend starts under supervisor |
| Auth architecture | High | Backend JWT + CRM token + POS token coexist |
| Flow complexity | High | Landing, review, and order-success hold a lot of business logic |
| External contract dependence | High | POS/CRM/distance APIs are critical to core journeys |
| Documentation drift | High | Existing docs lag behind current code reality |

---

## Verified Strengths

### 1. Build and runtime baseline is intact
- Frontend compiled successfully during this audit.
- Backend started successfully under supervisor.
- Services were running after restart.

### 2. Restaurant-scoped state isolation exists
Verified in code:
- CRM token scoped by restaurant
- cart scoped by restaurant
- edit-order state scoped by restaurant
- restaurant config cached per restaurant

### 3. Defensive order-flow logic has been added
Verified in `ReviewOrder.jsx`:
- synchronous double-click protection
- dispatch tracking for network-loss duplicate prevention
- retry logic for 401/auth expiry
- table status checks before new order/update flows

### 4. Config-driven frontend behavior is substantial
Verified in `RestaurantConfigContext.jsx` and backend config model:
- branding
- visibility toggles
- payment settings
- notification popup configuration
- timing and content controls

---

## Current High-Risk Findings

### CA-001: Multi-token auth model creates architectural complexity
**Severity:** High  
**Status:** Verified in code

There are at least three distinct auth/token paths in active use:
- backend JWT (`auth_token`)
- CRM restaurant-scoped token (`crm_token_{restaurantId}`)
- POS order token (`order_auth_token`)

**Impact**
- Higher chance of drift between user identity states
- Harder onboarding/debugging
- More complex logout/session-expiry behavior

### CA-002: Customer identity ownership is split across services
**Severity:** High  
**Status:** Verified in code

Examples:
- backend checks `check-customer`
- CRM handles customer register/login/reset/profile/address flows
- backend still exposes customer profile/orders/points/wallet endpoints
- review-order loyalty lookup uses backend customer-lookup

**Impact**
- unclear source of truth
- higher contract-maintenance burden
- difficult documentation consistency

### CA-003: Orchestration-heavy pages remain large and fragile
**Severity:** High  
**Status:** Verified in code

Particularly:
- `LandingPage.jsx`
- `ReviewOrder.jsx`
- `OrderSuccess.jsx`

These files combine routing, API orchestration, guard logic, payment handling, display logic, and state restoration.

**Impact**
- higher regression risk
- harder refactoring
- more difficult targeted testing and auditing

### CA-004: External contract dependence is high
**Severity:** High  
**Status:** Verified in code

Core flows depend directly on:
- POS restaurant/menu/order APIs
- CRM auth/profile/address APIs
- manage/distance API
- Google Maps APIs

**Impact**
- frontend behavior is tightly coupled to multiple external payload shapes
- failures may appear as UX issues even if local code is correct

### CA-005: Runtime contract ambiguity around overlapping APIs
**Severity:** Medium-High  
**Status:** Partially verified

Example:
- order details can be reasoned about as direct POS access or backend proxying depending on env/routing assumptions

**Impact**
- difficult operational troubleshooting
- documentation confusion

---

## Medium-Risk Findings

### CA-006: ESLint/react-hooks warnings remain
**Severity:** Medium  
**Status:** Verified from build output

The frontend build completed with multiple hook dependency warnings.

**Examples observed during build**
- missing dependencies in `LandingCustomerCapture.jsx`
- missing dependencies in `RestaurantConfigContext.jsx`
- callback dependency warnings in `CartContext.js`
- missing dependencies in `DeliveryAddress.jsx`, `OrderSuccess.jsx`, `Profile.jsx`, `ReviewOrder.jsx`

**Impact**
- potential stale closures
- harder reasoning about side effects
- increased regression risk during refactor

### CA-007: Payment flow semantics are harder to reason about than they should be
**Severity:** Medium  
**Status:** Verified in code

Observed current behavior:
- UI supports online vs COD
- order payload still sets `payment_method: 'cash_on_delivery'`
- actual path distinction depends on `payment_type`

**Impact**
- confusing developer experience
- easy future integration mistakes

### CA-008: Delivery integration semantics are only partially self-documenting
**Severity:** Medium  
**Status:** Verified in code

Observed:
- delivery address page exists and is integrated
- distance API uses `REACT_APP_IMAGE_BASE_URL` as its base
- delivery contract spans CRM + Google Maps + manage service + POS payload

**Impact**
- operational ambiguity
- weak env naming clarity

### CA-009: Documentation endpoints rely on memory files that may not fully align with repo structure
**Severity:** Medium  
**Status:** Verified in backend code

Backend exposes `/api/docs/*` routes reading `/app/memory/*.md`, but the audited cloned repo stores docs under `/app/repo/memory/`.

**Impact**
- environment-dependent doc serving
- possible missing-file behavior in some deployments

---

## Security-Oriented Observations

### Verified improvements visible in current code
- backend requires `JWT_SECRET` and fails if missing
- backend requires `MYGENIE_API_URL` and fails if missing
- frontend API config logs missing env issues instead of silently falling back for core POS base URL

### Still notable concerns
#### Hardcoded credential flow still exists conceptually in frontend order-token utility
`utils/authToken.js` still uses env-provided login credentials to fetch/store a POS token for ordering.

**Status:** Verified in code

**Audit interpretation**
- better than literal hardcoded fallback credentials
- still an architectural/security concern because the frontend depends on credential-based token acquisition logic

#### Broad CORS default in backend
Backend uses:
- `allow_origins=os.environ.get('CORS_ORIGINS', '*').split(',')`

**Status:** Verified in code

**Impact**
- acceptable only if production env overrides it appropriately
- risky as a default posture

---

## Maintainability Findings

### Good patterns present
- transformer/helper separation exists for order/cart payloads
- service-layer organization is reasonable
- contexts provide meaningful domain separation
- route structure is explicit and easy to trace

### Weaknesses present
- too much business logic in pages
- some overlapping/legacy service responsibilities remain
- docs and code evolved at different speeds
- env semantics are not consistently intuitive

---

## Current Audit Scorecard
| Category | Assessment |
|---|---|
| Buildability | Good |
| Runtime readiness | Good for current audited environment |
| Security posture | Mixed |
| Maintainability | Moderate risk |
| Architectural clarity | High risk |
| Documentation accuracy | Poor before refresh, improving with `/v2` |

---

## Recommended Priority Actions
1. Consolidate auth ownership and document token strategy.
2. Reduce orchestration in `ReviewOrder.jsx` first, then `LandingPage.jsx`, then `OrderSuccess.jsx`.
3. Clarify direct-API vs backend-proxy policy.
4. Normalize delivery integration env naming and architecture docs.
5. Resolve major hook dependency warnings during a controlled refactor pass.
6. Decide whether backend customer endpoints are strategic or legacy.
7. Add contract-sample docs for POS and CRM responses.

---

## Open Questions
1. Is frontend direct access to POS intended as a permanent architecture choice?
2. Should CRM become the sole customer identity/profile owner?
3. Is there a planned backend-for-frontend consolidation roadmap?
4. Are doc-serving endpoints expected to read from repo memory or a mounted `/app/memory` path in production?

## Needs Backend Clarification
- intended production CORS policy
- long-term auth ownership boundaries
- intended order-details/table-status routing policy

## Assumption Made
- This audit prioritizes current code reality over historical issue state captured in old memory docs.

---

## What changed from previous version
- Replaced historical issue ledger style with a current-state architectural/code-risk report.
- Removed issue counts that could not be safely revalidated in this audit.
- Added findings from the actual build and runtime verification performed here.

## Unverified items
- Penetration/security testing outcomes
- load/performance behavior
- external service SLA/reliability characteristics

## Follow-ups recommended
1. Run a dedicated security and contract audit if this app is heading to production hardening.
2. Add a living architecture decision record for auth and API-surface ownership.
3. Keep this code-audit doc focused on current-state risks, not historical session logs.