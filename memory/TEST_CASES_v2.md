# Document Audit Status
- Source File: TEST_CASES.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Outdated Rewritten
- Confidence: High
- Last Reviewed Areas: frontend/src/pages/LandingPage.jsx, frontend/src/pages/ReviewOrder.jsx, frontend/src/pages/OrderSuccess.jsx, frontend/src/pages/PasswordSetup.jsx, frontend/src/pages/DeliveryAddress.jsx, frontend/src/context/CartContext.js, frontend/src/hooks/useScannedTable.js, frontend/src/components/PaymentMethodSelector/PaymentMethodSelector.jsx
- Notes: Rewritten as a code-aligned manual test baseline. The prior version included many historical and scenario-specific cases without clearly distinguishing what is currently implemented, external-contract-dependent, or environment-specific.

# Test Cases

## Scope
These test cases reflect the current main-branch codebase and are intended for manual QA / engineering verification planning.

## Test Strategy
Prioritize by risk:
1. scan entry and route-state correctness
2. customer identification and auth
3. ordering and edit-order behavior
4. payment branching
5. delivery/address flow
6. profile and admin-adjacent customer behavior

---

## 1. Critical Flow Test Cases

### TC-001: Direct restaurant landing page loads
- **Priority:** P0
- **Precondition:** valid restaurant route exists
- **Steps:**
  1. Open `/{restaurantId}`
  2. Observe restaurant/landing UI
- **Expected:** landing page renders without redirect loop
- **Status:** Relevant / implemented

### TC-002: Assigned-table QR stores scan context
- **Priority:** P0
- **Steps:**
  1. Open route with `tableId`, `tableName`, `type`, `orderType`
  2. Navigate across menu/review pages
- **Expected:** scan context persists via session storage for that restaurant
- **Status:** Relevant / implemented

### TC-003: Walk-in delivery QR enters delivery-capable flow
- **Priority:** P0
- **Steps:**
  1. Open route with `type=walkin&orderType=delivery`
  2. Observe landing capture / mode behavior
- **Expected:** delivery mode recognized; no assigned-table requirement
- **Status:** Relevant / implemented

### TC-004: Returning customer path routes to password setup
- **Priority:** P0
- **Steps:**
  1. Enter valid phone on landing
  2. Trigger customer existence lookup
  3. Continue to password setup flow
- **Expected:** password-setup page receives customer existence context
- **Status:** Relevant / implemented

### TC-005: New customer can register through CRM path
- **Priority:** P0
- **Steps:**
  1. Open password-setup as new customer
  2. Set password and continue
- **Expected:** CRM register path used; CRM token stored for restaurant scope
- **Status:** Relevant / implemented

### TC-006: Existing customer can login with password
- **Priority:** P0
- **Steps:**
  1. Use existing-customer password path
  2. Submit password
- **Expected:** CRM login succeeds and menu navigation continues
- **Status:** Relevant / implemented

### TC-007: Existing customer OTP login path works
- **Priority:** P0
- **Steps:**
  1. Trigger OTP login on password-setup page
  2. Enter OTP
- **Expected:** CRM OTP verify path succeeds and stores auth
- **Status:** Relevant / implemented, external-contract-dependent

### TC-008: Guest flow continues without authenticated customer session
- **Priority:** P0
- **Steps:**
  1. Use skip/guest path where available
  2. Continue into menu/review flow
- **Expected:** guest data stored and prefilled where applicable
- **Status:** Relevant / implemented

---

## 2. Menu / Cart Test Cases

### TC-020: Restaurant menu loads from POS APIs
- **Priority:** P0
- **Expected:** restaurant info, products, and menu master load without schema errors

### TC-021: Add item to cart with no customization
- **Priority:** P0
- **Expected:** item appears in restaurant-scoped cart

### TC-022: Add item with variations/add-ons
- **Priority:** P0
- **Expected:** transformed cart item stores selected options correctly

### TC-023: Cart persists across navigation within same restaurant
- **Priority:** P0
- **Expected:** cart remains available on menu/review transitions

### TC-024: Cart resets when switching restaurants
- **Priority:** P0
- **Expected:** prior restaurant cart does not leak into new restaurant

---

## 3. Review Order / Placement Test Cases

### TC-040: Review order shows correct item list and pricing summary
- **Priority:** P0
- **Expected:** item total, subtotal, tax, and grand total are computed/rendered

### TC-041: New order placement succeeds for non-edit flow
- **Priority:** P0
- **Expected:** order placed through POS endpoint; navigates to order-success
- **Dependency:** external POS contract

### TC-042: Edit order update succeeds for active existing order
- **Priority:** P0
- **Expected:** update endpoint used; edit mode cleared after success
- **Dependency:** external POS contract + active order state

### TC-043: Duplicate-click protection prevents accidental double-submit
- **Priority:** P0
- **Expected:** second rapid submit does not create duplicate dispatch in UI flow

### TC-044: Network-loss warning path shows duplicate-order caution
- **Priority:** P1
- **Expected:** if request dispatch occurs without response, user sees warning not naive retry suggestion

### TC-045: 401 retry path refreshes token and retries safely
- **Priority:** P1
- **Expected:** token refresh retry path executes and continues flow

---

## 4. Table / Scan-State Test Cases

### TC-060: Occupied assigned table redirects or blocks correctly
- **Priority:** P0
- **Expected:** landing/review logic respects current occupancy behavior
- **Dependency:** external table-status contract

### TC-061: Free assigned table allows fresh order
- **Priority:** P0
- **Expected:** no edit-order redirect when table is available

### TC-062: Walk-in flow does not require table assignment
- **Priority:** P0
- **Expected:** no assigned-table enforcement for walk-in takeaway/delivery

### TC-063: Restaurant 716 special-case behavior remains active
- **Priority:** P1
- **Expected:** duplicate-table blocking is skipped per current code logic

---

## 5. Payment Flow Test Cases

### TC-080: Payment selector hidden when only one option is available
- **Priority:** P1
- **Expected:** selector does not render if only online or only COD is enabled

### TC-081: Payment selector shown when both options are available
- **Priority:** P0
- **Expected:** selector renders with online/COD options

### TC-082: Online payment selection changes CTA text
- **Priority:** P0
- **Expected:** button shows `Pay & Proceed ...`

### TC-083: COD selection changes CTA text
- **Priority:** P0
- **Expected:** button shows `Place Order ...`

### TC-084: Razorpay create-order flow triggers for eligible online payment
- **Priority:** P0
- **Dependency:** external contract

### TC-085: Payment verification path executes on success page
- **Priority:** P1
- **Dependency:** external contract

---

## 6. Delivery Flow Test Cases

### TC-100: Delivery mode routes to delivery-address page
- **Priority:** P0
- **Expected:** authenticated/eligible delivery flow reaches address page

### TC-101: Saved CRM addresses load
- **Priority:** P0
- **Expected:** CRM address list renders and default/first address can be selected

### TC-102: New delivery address can be added
- **Priority:** P0
- **Expected:** CRM add-address flow succeeds and new address becomes selectable

### TC-103: Delivery charge lookup updates state
- **Priority:** P1
- **Expected:** distance API result affects delivery charge state
- **Dependency:** external contract

### TC-104: Review order shows delivery summary and delivery charge
- **Priority:** P0
- **Expected:** selected address summary and delivery charge render for delivery order type

---

## 7. Profile Test Cases

### TC-120: Customer profile page loads for CRM-authenticated customer
- **Priority:** P1
- **Expected:** profile tab renders customer identity data

### TC-121: Orders tab loads CRM order history
- **Priority:** P1
- **Expected:** CRM order list normalizes and displays

### TC-122: Points tab loads CRM transactions
- **Priority:** P1
- **Expected:** transaction type normalization works

### TC-123: Wallet tab loads CRM wallet transactions
- **Priority:** P1
- **Expected:** wallet balance and transactions render

---

## 8. Notification Popup Test Cases

### TC-140: Landing popup appears when configured for landing page
- **Priority:** P2
- **Expected:** popup appears according to delay and visibility settings

### TC-141: Review popup appears when configured for review page
- **Priority:** P2

### TC-142: Success popup appears when configured for success page
- **Priority:** P2

### TC-143: Auto-dismiss countdown behaves correctly
- **Priority:** P2

---

## 9. Regression Watchlist
These areas should be retested after any meaningful refactor:
- restaurant-scoped cart clearing
- restaurant-scoped CRM token restoration
- duplicate-order protection in review order
- 401 retry behavior
- delivery routing and address persistence
- restaurant 716 exception logic
- table-status redirect/edit-order behavior

---

## Test Data / Environment Dependencies
The following are required for meaningful execution of many cases:
- valid restaurant IDs / QR patterns
- working POS menu/order endpoints
- working CRM auth/address endpoints
- working payment integration where applicable
- working Google Maps key for delivery UX
- working distance API for delivery charge validation

---

## Open Questions
1. Which environments should be considered canonical for QA: local-with-supervisor, staging, or preprod-integrated?
2. Which customer flows are officially supported for guest users versus authenticated users?
3. Which restaurant IDs should be treated as regression anchors for special cases?

## Needs Backend Clarification
- official test restaurants and expected behaviors
- stable external contract samples for table status, order details, delivery charge, and CRM address responses

## Assumption Made
- These test cases are written as a manual validation baseline grounded in current code, not as executed test evidence.

---

## What changed from previous version
- Replaced historical or overly broad cases with current code-aligned scenarios.
- Distinguished implemented behavior from external-contract-dependent behavior.
- Reorganized tests by current risk and flow importance.

## Unverified items
- actual pass/fail results in live environments
- environment-specific restaurant data assumptions
- payment/provider-specific runtime edge cases

## Follow-ups recommended
1. Convert the highest-priority cases into a maintained QA suite.
2. Attach test data sets and restaurant IDs per scenario.
3. Add explicit environment matrix once staging expectations are agreed.