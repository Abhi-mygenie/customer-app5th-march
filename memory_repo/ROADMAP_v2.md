# Document Audit Status
- Source File: ROADMAP.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Outdated Rewritten
- Confidence: Medium
- Last Reviewed Areas: frontend/src/pages/ReviewOrder.jsx, frontend/src/pages/LandingPage.jsx, frontend/src/pages/OrderSuccess.jsx, frontend/src/context/AuthContext.jsx, frontend/src/context/RestaurantConfigContext.jsx, frontend/src/api/services/*.js, backend/server.py, build/runtime verification
- Notes: Rewritten as a current-state roadmap based on code evidence and audit findings, not historical session backlog claims.

# Project Roadmap

## Roadmap Objective
This roadmap prioritizes work that reduces operational risk, architectural complexity, and documentation drift in the current codebase.

## Current State Summary
| Area | Status |
|---|---|
| Frontend build | Working |
| Backend startup | Working |
| Core order flow | Working |
| Admin config flow | Working |
| Delivery flow | Partially mature |
| Auth architecture | Complex / needs consolidation |
| Documentation baseline | Improved via `/v2`, still needs maintenance discipline |

---

## Priority Matrix
| Priority | Meaning |
|---|---|
| P0 | Must address to reduce architectural or production risk |
| P1 | High-value improvements with strong reliability payoff |
| P2 | Important maintainability and developer-experience improvements |
| P3 | Nice-to-have or longer-term structural cleanup |

---

## P0 Roadmap Items

### P0-1: Define single source of truth for customer identity
**Why**
Current code splits customer behavior across backend, CRM, and POS-adjacent lookups.

**Goals**
- choose primary system for customer auth/profile
- document what remains on backend vs CRM
- reduce overlapping endpoint ownership

**Success criteria**
- one architecture doc for auth ownership
- one clear token lifecycle definition
- reduced ambiguity in customer flows

### P0-2: Clarify and standardize API-surface strategy
**Why**
Some flows use direct external APIs while backend also exposes overlapping proxy routes.

**Goals**
- define when frontend calls POS/CRM directly
- define when backend proxying is required
- align env and ingress expectations

**Success criteria**
- endpoint routing policy documented
- no ambiguity for order-details/table-status style flows

### P0-3: Reduce risk in order orchestration layer
**Why**
`ReviewOrder.jsx` remains one of the highest-risk files in the repo.

**Goals**
- extract payment orchestration helpers/hooks
- extract table/status guard logic
- extract order submission state machine

**Success criteria**
- materially smaller page component
- easier isolated testing/debugging

### P0-4: Formalize delivery architecture
**Why**
Delivery UI exists, but contract ownership and env semantics remain diffuse.

**Goals**
- document CRM vs distance API vs POS order responsibilities
- clarify env naming and intended request paths
- identify unsupported/partial behaviors explicitly

**Success criteria**
- current-state delivery architecture doc
- reduced ambiguity for future work

---

## P1 Roadmap Items

### P1-1: Refactor LandingPage flow orchestration
**Focus**
- customer capture
- check-customer lookup
- QR state handling
- auto-redirect/edit-order behavior

### P1-2: Refactor OrderSuccess polling and status management
**Focus**
- order refresh/polling
- payment verification handling
- table recheck logic
- redirect conditions

### P1-3: Resolve major hook-dependency warnings
**Why**
Build succeeds, but warning volume suggests stale-effect risk.

**Targets first**
- `ReviewOrder.jsx`
- `OrderSuccess.jsx`
- `DeliveryAddress.jsx`
- `Profile.jsx`
- `CartContext.js`

### P1-4: Replace hardcoded restaurant exception logic with configuration
**Current example**
- restaurant `716` special handling

**Goal**
Move restaurant-specific behavior behind backend config/capability flags.

### P1-5: Document live external API contracts with examples
**Why**
Current docs rely heavily on code inference.

**Priority contracts**
- table status
- order details
- place order / update order
- CRM profile/address
- distance API

---

## P2 Roadmap Items

### P2-1: Rationalize payment payload semantics
**Goal**
Make `payment_method` and `payment_type` easier to understand and less error-prone.

### P2-2: Improve env naming clarity
**Example concern**
Distance API currently derives base from `REACT_APP_IMAGE_BASE_URL`.

### P2-3: Decide legacy vs active backend customer endpoints
**Goal**
Classify `/api/customer/*` endpoints as:
- strategic
- transitional
- legacy

### P2-4: Improve doc-serving behavior in backend
**Goal**
Ensure `/api/docs/*` reads from the same source set the engineering team maintains.

### P2-5: Expand engineer onboarding docs
**Needs**
- token flows
- service ownership map
- route entry scenarios
- data-flow diagrams

---

## P3 Roadmap Items

### P3-1: Further TypeScript expansion
The repo already contains some TS/TS helper files. Further migration could improve safety if done deliberately.

### P3-2: UI/domain module cleanup
Continue splitting UI-heavy pages and reusable business logic into domain modules.

### P3-3: Historical documentation archive
Move stale `memory/` docs into an archive once `/v2` becomes canonical.

---

## Recommended Execution Order
1. Customer identity ownership decision
2. API-surface policy decision
3. ReviewOrder refactor
4. Delivery architecture clarification
5. LandingPage and OrderSuccess refactors
6. Hook warning cleanup
7. Config-driven replacement for restaurant-specific exceptions
8. Contract sample capture
9. Documentation governance / source-of-truth standardization

---

## Risks if Roadmap Is Ignored
- regressions become harder to prevent
- auth/session bugs remain expensive to debug
- external-service contract changes will keep causing ambiguity
- documentation will drift again even after this audit refresh

---

## Open Questions
1. Which team owns CRM integration contracts?
2. Which team owns POS contract guarantees?
3. Should this app evolve toward a backend-for-frontend architecture?
4. Is `/v2` approved to replace the previous memory docs as primary engineering documentation?

## Needs Backend Clarification
- config model extensibility for restaurant capability flags
- desired proxying strategy
- delivery and payment ownership boundaries

## Assumption Made
- This roadmap optimizes for risk reduction and maintainability rather than feature volume.

---

## What changed from previous version
- Removed historical task backlog items that could not be safely carried forward.
- Replaced session-era roadmap claims with a code-and-audit-based roadmap.
- Prioritized architecture clarity and operational reliability ahead of new feature scope.

## Unverified items
- team ownership and delivery timelines
- business priority weighting beyond what is visible in code and audit findings

## Follow-ups recommended
1. Convert P0 items into assigned engineering initiatives.
2. Add owners and target dates.
3. Revisit after auth and delivery architecture decisions are finalized.