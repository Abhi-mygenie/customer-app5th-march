# Document Audit Status
- Source File: FEAT-001-dual-payment-options.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/pages/ReviewOrder.jsx, frontend/src/components/PaymentMethodSelector/PaymentMethodSelector.jsx, frontend/src/context/RestaurantConfigContext.jsx, frontend/src/context/AdminConfigContext.jsx, frontend/src/pages/admin/AdminSettingsPage.jsx, backend/server.py
- Notes: Rewritten to reflect the implemented dual-payment UI/config behavior and the remaining payment-contract caveats visible in current code.

# FEAT-001: Dual Payment Options

## Current Feature Position
Dual payment options are **implemented in the current codebase**, with some important caveats around payload semantics and external POS behavior.

## What Is Implemented
### Customer-side behavior
Verified in `ReviewOrder.jsx` and `PaymentMethodSelector.jsx`.

- customer can choose between:
  - `online`
  - `cod`
- selector only appears when both options are available
- button label changes with selection
- order type controls online-payment availability
- online flow can trigger Razorpay

### Admin-side behavior
Verified in `AdminSettingsPage.jsx` and backend config model.

Config fields implemented:
- `codEnabled`
- `onlinePaymentDinein`
- `onlinePaymentTakeaway`
- `onlinePaymentDelivery`
- `payOnlineLabel`
- `payAtCounterLabel`

### Backend config support
Verified in `server.py`.

`AppConfigUpdate` includes all payment-related fields above, and default config responses include them as well.

---

## Customer-Side Display Rules
Verified in `ReviewOrder.jsx`.

### Online availability
Online payment is only available when both are true:
1. `restaurant?.razorpay?.razorpay_key` exists
2. corresponding config flag for current order type is enabled

### COD availability
COD is controlled by:
- `codEnabled`

### Selector rendering behavior
Verified in `PaymentMethodSelector.jsx`.

| Condition | Selector Rendered? | Current Behavior |
|---|---|---|
| Online only | No | direct button flow |
| COD only | No | direct button flow |
| Both online + COD | Yes | selector shown |
| Neither | No | no selector; page falls back to available flow assumptions |

### Default selection
Verified in `ReviewOrder.jsx`.

| Availability | Default |
|---|---|
| Online only | `online` |
| COD only | `cod` |
| Both | `online` |

---

## Current Button Behavior
Verified in `ReviewOrder.jsx`.

### Non-edit mode
- online selected + Razorpay key present → `Pay & Proceed ₹...`
- otherwise → `Place Order ₹...`

### Edit mode
- always uses update-order CTA style
- payment selector is not shown in edit mode

---

## Current Order Payload Behavior
Verified in `orderService.ts`.

### Current outgoing semantics
- UI selection sets `paymentType`
  - `online` → `prepaid`
  - `cod` → `postpaid`
- payload still sets:
  - `payment_method: 'cash_on_delivery'`

### Important caveat
This means the feature is implemented in user-facing terms, but the integration contract is not semantically clean.

**Practical current truth:**
- behavior relies on `payment_type`
- `payment_method` is not a faithful reflection of customer choice in current code

---

## Razorpay Behavior
Verified in `ReviewOrder.jsx` and `OrderSuccess.jsx`.

### Online payment flow
1. place order
2. if response contains `razorpay_id` and restaurant has key, create Razorpay order
3. open Razorpay checkout
4. on success, navigate to order-success with payment metadata
5. order-success can call verify-payment endpoint

### Endpoints used
- `POST /razor-pay/create-razor-order`
- `POST /razor-pay/verify-payment`

---

## Admin Configuration Surface
Verified in `AdminSettingsPage.jsx`.

### Fields exposed in admin UI
- COD toggle
- online payment toggle for dine-in
- online payment toggle for takeaway
- online payment toggle for delivery
- custom online label
- custom COD label

### Current UX note
The feature is embedded within the broader Settings page, not a standalone payment-only screen.

---

## Implemented vs Partial vs Planned
| Area | Status | Notes |
|---|---|---|
| Dual-payment selector | Implemented | Customer-side UI works |
| Order-type-specific online toggles | Implemented | Dine-in/takeaway/delivery flags present |
| Admin configuration of payment options | Implemented | Backend + admin page |
| Razorpay branching | Implemented | External contract dependent |
| Clean payment payload semantics | Partially implemented | `payment_method` still misleading |
| End-to-end guarantees across all restaurants | Partially verified | depends on restaurant data and POS behavior |

---

## Key Risks / Caveats
1. `payment_method` is currently hardcoded to `cash_on_delivery`.
2. Actual behavior depends on `payment_type`, not on a semantically clear payment method field.
3. Razorpay flow depends on external service and restaurant config correctness.
4. Edit-order flow does not expose the same payment selector path.

---

## Open Questions
1. Should `payment_method` be made consistent with customer selection?
2. Should edit-order flow ever support the full payment selection experience?
3. Should online payment availability be driven only from backend config, or also validated server-side at order time?

## Needs Backend Clarification
- exact POS contract expectations for `payment_method` and `payment_type`
- whether prepaid/postpaid alone is the intended controlling field

## Assumption Made
- The feature is considered implemented because the customer and admin behavior exists in code, even though the backend/POS contract remains semantically imperfect.

---

## What changed from previous version
- Reclassified the feature from “done” in a broad sense to “implemented with integration caveats”.
- Added code-verified selector/render rules.
- Called out the current payload semantic mismatch explicitly.

## Unverified items
- restaurant-by-restaurant Razorpay availability in live environments
- POS-side interpretation of edge-case payment combinations

## Follow-ups recommended
1. Clarify the payment contract with backend/POS stakeholders.
2. Decide whether to normalize `payment_method` values.
3. Add environment-specific QA matrix for online vs COD by order type.