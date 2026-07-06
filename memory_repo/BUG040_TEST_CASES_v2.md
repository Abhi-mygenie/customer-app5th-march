# Document Audit Status
- Source File: BUG040_TEST_CASES.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Outdated Rewritten
- Confidence: Medium
- Last Reviewed Areas: frontend/src/pages/ReviewOrder.jsx, frontend/src/pages/OrderSuccess.jsx, frontend/src/api/services/orderService.ts
- Notes: Rewritten as a focused regression note for 401-retry and payment retry behavior. The old version referenced a specific bug-validation setup that should not be assumed as a stable long-term testing contract.

# BUG-040 Regression Reference

## Current Purpose
This document tracks the regression area around:
- 401 retry behavior
- online payment retry behavior
- order placement safety after auth expiry

## Current Code Reality
Verified in `ReviewOrder.jsx`.

### What the code currently does
- detects 401 response during order placement
- forces token refresh via `getAuthToken(true)`
- retries order placement or update flow
- if online payment remains applicable after retry, re-enters Razorpay flow
- includes duplicate-order warnings for no-response/network-loss cases

---

## Regression Scenarios Worth Preserving
### R-001: 401 during new COD order
**Expected:** token refresh and retry succeed without duplicate user interaction

### R-002: 401 during new online-payment order
**Expected:** token refresh and retry still allow Razorpay initialization when conditions are met

### R-003: 401 during edit-order update
**Expected:** update retry path succeeds and preserves edit-order behavior

### R-004: network-loss/no-response after dispatch
**Expected:** user sees duplicate-order warning rather than naive retry guidance

---

## Important Caveat
The old document referenced a very specific simulator/test-hook style workflow. That should be treated as temporary historical testing context unless explicitly reintroduced and documented in code.

This refreshed version keeps the **regression intent**, not the old one-off testing mechanics.

---

## Current Risks in This Area
1. retry behavior remains tightly coupled to `ReviewOrder.jsx`
2. payment and retry orchestration are still page-level concerns
3. table-status and edit-order edge cases remain intertwined with retry logic

---

## Open Questions
1. Should retry logic be extracted into a dedicated order-submission state machine?
2. Should 401 retry behavior re-run more upstream validations in all cases?
3. Should this regression area be covered by a more formal automated suite in future?

## Needs Backend Clarification
- expected semantics of 401 from POS/auth token expiry scenarios
- whether retry should always be considered safe server-side after 401

## Assumption Made
- This document is best treated as a regression reference, not a full standalone test plan.

---

## What changed from previous version
- removed dependency on historical one-off simulator instructions
- preserved the regression coverage areas that still matter in current code
- narrowed scope to the actual behavior visible in `ReviewOrder.jsx`

## Unverified items
- whether any local/manual simulation hook still exists in current build/runtime behavior
- how often these scenarios occur in live environments

## Follow-ups recommended
1. Move retry/payment regression coverage into the main test-case baseline.
2. Refactor retry logic out of page-level component code when feasible.
3. Revisit this note after payment/order refactors.