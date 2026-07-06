# Document Audit Status
- Source File: FEAT-001-ADMIN-payment-settings.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/pages/admin/AdminSettingsPage.jsx, frontend/src/context/AdminConfigContext.jsx, backend/server.py
- Notes: Rewritten to reflect the actual admin implementation. The prior version was mostly directionally correct but was more spec-like than implementation-grounded.

# FEAT-001-ADMIN: Payment Settings in Admin

## Current Feature Position
The admin payment-settings capability is **implemented** as part of the admin settings page.

## Where It Lives
Verified in `AdminSettingsPage.jsx`.

### Current location
- Admin route: `/admin/settings`
- Section: `Payment Options`

This is not a separate dedicated admin module; it is part of the general settings page.

---

## Fields Implemented in Admin UI
Verified in `AdminSettingsPage.jsx` and `AdminConfigContext.jsx`.

| Field | UI Support | Backend Support | Status |
|---|---|---|---|
| `codEnabled` | Yes | Yes | Verified |
| `onlinePaymentDinein` | Yes | Yes | Verified |
| `onlinePaymentTakeaway` | Yes | Yes | Verified |
| `onlinePaymentDelivery` | Yes | Yes | Verified |
| `payOnlineLabel` | Yes | Yes | Verified |
| `payAtCounterLabel` | Yes | Yes | Verified |

---

## Backend Configuration Support
Verified in `server.py`.

### Relevant backend pieces
- `AppConfigUpdate` model includes payment fields
- default public config response includes payment defaults
- `/api/config/` accepts updates from admin UI
- admin config context saves through backend PUT request

### Default values currently visible in code
Backend default response includes:
- `codEnabled: false`
- `onlinePaymentDinein: true`
- `onlinePaymentTakeaway: true`
- `onlinePaymentDelivery: true`
- `payOnlineLabel: "Pay Online"`
- `payAtCounterLabel: "Pay at Counter"`

---

## Admin UX Behavior
### Current controls
Verified in `AdminSettingsPage.jsx`.

- toggle for COD enablement
- toggles for online payment per order type
- text inputs for online/COD labels

### Current save behavior
Verified in `AdminConfigContext.jsx`.

- config is loaded from backend
- local edits update context state
- save sends full config object to `/api/config/`
- toast shown on success/failure

---

## Relationship to Customer Flow
This admin feature directly influences customer behavior in `ReviewOrder.jsx`.

### Verified downstream usage
- `codEnabled`
- `onlinePaymentDinein`
- `onlinePaymentTakeaway`
- `onlinePaymentDelivery`
- `payOnlineLabel`
- `payAtCounterLabel`

These settings determine:
- whether selector is shown
- which options are available
- how payment buttons are labeled

---

## What Is Implemented vs Not
| Capability | Status | Notes |
|---|---|---|
| Admin can enable COD | Implemented | Verified |
| Admin can enable online payment by order type | Implemented | Verified |
| Admin can customize labels | Implemented | Verified |
| Admin can validate payment provider setup in UI | Not found in current code | No strong provider-health validation UI seen |
| Admin can preview exact customer CTA behavior | Not found in current code | Indirect only |

---

## Key Limitations
1. Payment settings live inside a broader settings page, not a dedicated payment management section.
2. No provider-status health check or validation workflow was identified in current code.
3. Current admin UI does not itself explain the `payment_method` vs `payment_type` payload caveat.

---

## Open Questions
1. Should payment settings eventually move to a dedicated admin page or remain embedded in general settings?
2. Should the UI warn admins when Razorpay is unavailable but online toggles are enabled?
3. Should label validation rules be enforced more strictly in UI/backend?

## Needs Backend Clarification
- whether backend should reject logically inconsistent payment configs
- whether provider-health/availability should be exposed to admin UI

## Assumption Made
- This document focuses on implemented admin functionality, not idealized admin product design.

---

## What changed from previous version
- Converted a design-oriented feature spec into an implementation-grounded reference.
- Clarified that payment settings live inside `/admin/settings`.
- Limited claims to what is clearly supported by current code.

## Unverified items
- live behavior when Razorpay config is missing but online toggles are set
- whether all customer-facing pages refresh config immediately after admin save in every path

## Follow-ups recommended
1. Add provider-state validation/visibility if payment setup is business-critical.
2. Add explicit admin guidance on what each toggle affects by order type.
3. Link this doc to `FEAT-001-dual-payment-options.md` for end-to-end context.