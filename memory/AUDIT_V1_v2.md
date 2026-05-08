# Document Audit Status
- Source File: AUDIT_V1.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: Medium
- Last Reviewed Areas: frontend/src/utils/authToken.js, frontend/src/context/AuthContext.jsx, frontend/src/pages/ReviewOrder.jsx, backend/server.py, build/runtime outputs
- Notes: Rewritten as a safer executive audit baseline. The original V1 audit contained useful concerns, but exact counts, fix states, and historical severities were too tied to a past snapshot to carry forward unchanged.

# Production Audit Baseline

## Executive Summary
The codebase can build and run in the audited environment, but it should still be considered architecturally high-risk for long-term maintainability and operational clarity.

### Current production-readiness view
| Dimension | Current View |
|---|---|
| App starts and builds | Yes, verified during audit |
| Core user journeys exist | Yes |
| Single-source auth architecture | No |
| Clean service ownership | No |
| Documentation consistency | Improved via `/v2`, previously weak |
| External contract dependence | High |

### Overall current rating
**Risk Rating: Medium-High**

Not because the app is broken today, but because its hybrid architecture and service coupling increase long-term bug and maintenance risk.

---

## High-Level Findings

### 1. Operational baseline is healthy
- frontend build passed
- backend started successfully
- supervisor services were running

### 2. Security posture is mixed
Verified positives:
- backend requires `JWT_SECRET`
- backend requires `MYGENIE_API_URL`

Remaining concerns:
- frontend still performs env-credential-driven POS token acquisition
- backend still defaults CORS origins to `*` if env is not supplied

### 3. Architecture is the main risk area
The biggest current concerns are not syntax or startup failure, but:
- hybrid auth ownership
- hybrid service ownership
- large orchestration components
- dependency on multiple external contracts

---

## Current Critical / High Findings

### AUD-001: Multi-token auth model increases risk
**Level:** Critical/High

Current code uses separate tokens for backend, CRM, POS ordering, and admin POS operations.

### AUD-002: Customer ownership split across systems
**Level:** Critical/High

Customer existence, auth, address, loyalty, and order-adjacent behavior live across backend, CRM, and POS.

### AUD-003: Client-side ordering is heavily dependent on external contract correctness
**Level:** High

Order placement, table status, payment, and order detail flows rely on external response shapes and availability.

### AUD-004: Special-case restaurant logic remains hardcoded
**Level:** High

Restaurant `716` behavior remains embedded in order flow logic.

### AUD-005: Documentation drift was severe enough to require a full `/v2` refresh
**Level:** High

This is an engineering-risk item because stale docs can directly lead to implementation mistakes.

---

## Current Medium Findings

### AUD-006: Hook dependency warnings remain in frontend build
### AUD-007: Delivery integration is functional but contract-fragmented
### AUD-008: Order/payment semantics are harder to reason about than necessary
### AUD-009: Backend docs-serving path may not match repo source path in all environments
### AUD-010: Route fallback and restaurant default logic still include preview-oriented assumptions

---

## What Has Improved Since Older Audit Narratives
1. Frontend no longer silently falls back to preprod POS base in core config files.
2. Backend fails fast for critical secret/base-url envs.
3. Restaurant-scoped CRM token storage exists.
4. Restaurant-scoped cart storage exists.
5. Duplicate-order guard logic in review-order flow is stronger than a naive implementation.

---

## What Still Blocks a “clean” production posture
1. No single source of truth for customer identity domain.
2. No single policy for frontend direct calls vs backend proxying.
3. Large, flow-heavy pages still centralize too much logic.
4. External service contracts are not well codified in stable docs.

---

## Recommendations
### Immediate
- Treat `/v2` docs as the new safe engineering reference.
- Clarify auth and service ownership.
- Prioritize `ReviewOrder.jsx` decomposition.

### Short term
- reduce hardcoded restaurant exceptions
- resolve major hook warnings
- formalize delivery architecture

### Medium term
- standardize API-surface policy
- review whether backend should become more of a backend-for-frontend layer

---

## Open Questions
1. What is the intended end-state architecture: hybrid direct integrations or consolidated backend mediation?
2. Which team owns CRM and POS contract changes?
3. What level of production hardening is required for this app’s real traffic profile?

## Needs Backend Clarification
- production CORS expectations
- final auth/domain boundaries
- intended routing policy for overlapping endpoints

## Assumption Made
- This audit baseline values current observable risk over historical issue-ledger continuity.

---

## What changed from previous version
- Removed stale issue counts and date-bound fix assertions.
- Reframed the audit around current code and runtime verification.
- Converted the document from a historical audit artifact into a safer present-state executive audit baseline.

## Unverified items
- load/performance under real traffic
- external-service security posture
- incident history not reflected in repo

## Follow-ups recommended
1. Run a dedicated security review if production exposure is material.
2. Add ADRs for auth and API-surface ownership.
3. Update this audit after major refactors rather than appending historical session notes.