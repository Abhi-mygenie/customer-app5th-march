# Document Audit Status
- Source File: PLAN-CRM-AUTH-MIGRATION.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Outdated Rewritten
- Confidence: High
- Last Reviewed Areas: frontend/src/context/AuthContext.jsx, frontend/src/pages/PasswordSetup.jsx, frontend/src/pages/Profile.jsx, frontend/src/pages/Login.jsx, frontend/src/pages/LandingPage.jsx, frontend/src/api/services/crmService.js, backend/server.py
- Notes: Rewritten from an approval-stage migration plan into a historical-to-current transition document. The original planning assumptions are no longer the safest active reference because much of the migration now exists in code.

# PLAN: CRM Auth Migration

## Historical Context
This document originally described a proposed migration of customer auth toward CRM. As of the current audited codebase, major parts of that migration are already implemented.

## Current Best Use of This Document
Use this file as a transition-history reference, not as the primary current-state source of truth. For active engineering guidance, prefer:
- `PLAN-CRM-AUTH-MIGRATION-v2.md`
- `ARCHITECTURE.md`
- `CUSTOMER_ENDPOINTS.md`
- `SCAN_AND_ORDER_API.md`

---

## What the Original Plan Was Trying to Achieve
The migration intent can still be summarized as:
1. move customer auth flows to CRM
2. separate customer auth from admin login
3. support CRM-backed profile/address usage
4. keep ordering and restaurant-facing flows working during transition

That intent is still visible in the current codebase.

---

## What Is Now True in Current Code
### Implemented
- customer register/login/reset/OTP flows use CRM in `PasswordSetup.jsx`
- CRM token is stored per restaurant in `AuthContext.jsx`
- profile page uses CRM orders/points/wallet
- delivery address flow uses CRM addresses
- login page is effectively admin-oriented

### Still hybrid / not fully migrated
- landing-page `check-customer` still uses backend
- backend customer endpoints still exist
- loyalty/customer lookup still use backend
- order placement still uses POS APIs

---

## Current Migration Interpretation
The migration is **partially completed and operational**, but the application is **not fully consolidated around CRM**.

A more accurate current description is:
> Customer auth/profile/address behavior has substantially moved to CRM, while backend and POS still own important adjacent parts of the user journey.

---

## Lessons from the Plan vs Current State
### What proved correct
- customer auth did move into CRM-backed frontend flows
- admin login remained a distinct path
- restaurant scoping became important to prevent cross-restaurant identity bleed

### What remains unresolved
- single-source ownership for customer identity and related backend data
- whether backend customer endpoints are temporary or permanent
- how much of the ordering flow should stay outside CRM

---

## Remaining Migration Questions
1. Should backend `check-customer` be replaced or retained?
2. Should backend customer endpoints be retired?
3. Should loyalty/customer lookup remain backend-owned?
4. Should a backend-for-frontend layer eventually proxy CRM and POS to simplify frontend complexity?

---

## Open Questions
- What is the official end-state architecture for customer identity?
- Is the migration considered “good enough”, or still an active program of work?

## Needs Backend Clarification
- whether backend and CRM customer records are expected to remain tightly aligned
- whether any additional CRM migration is planned for checkout/ordering support surfaces

## Assumption Made
- This document is now historical/transitionary and should not be treated as the primary active plan.

---

## What changed from previous version
- removed approval-stage language that no longer reflects current repo reality
- reframed the document around what did and did not actually migrate
- redirected active readers toward current-state documents

## Unverified items
- historical plan approvals and timeline decisions outside the codebase
- future migration roadmap not visible in current repo

## Follow-ups recommended
1. Keep `PLAN-CRM-AUTH-MIGRATION-v2.md` as the active migration reference.
2. Archive this file if historical planning context is no longer needed.
3. Create a formal end-state auth ADR if migration work continues.