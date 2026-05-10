# Document Audit Status
- Source File: MANUAL_TEST_CASES.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Outdated Rewritten
- Confidence: High
- Last Reviewed Areas: frontend/src/pages/ReviewOrder.jsx, frontend/src/components/PaymentMethodSelector/PaymentMethodSelector.jsx, frontend/src/pages/LandingPage.jsx, frontend/src/pages/PasswordSetup.jsx, frontend/src/pages/DeliveryAddress.jsx, frontend/src/pages/OrderSuccess.jsx
- Notes: Rewritten into a practical manual verification checklist aligned with the current codebase. The old version centered narrowly on FEAT-001 and stale environment assumptions.

# Manual Test Cases

## Purpose
This document provides a manual QA checklist grounded in the current codebase.

## Recommended Test Buckets
1. Landing / scan entry
2. Customer auth and guest flow
3. Menu / cart / review order
4. Payment branching
5. Delivery address flow
6. Order success / edit order behavior
7. Profile flow

---

## A. Landing & Scan Entry
### MTC-001: Direct restaurant landing load
- Open `/{restaurantId}`
- Confirm landing page loads and restaurant context resolves

### MTC-002: Table QR entry
- Open route with `tableId`, `tableName`, `type=table|room`
- Confirm seated context is preserved across navigation

### MTC-003: Walk-in delivery entry
- Open route with `type=walkin&orderType=delivery`
- Confirm delivery-capable landing behavior appears

### MTC-004: Takeaway/delivery mode toggle
- In takeaway/delivery flow, switch modes on landing page
- Confirm selected mode updates correctly

---

## B. Customer Auth / Guest Flow
### MTC-010: Existing customer lookup from landing
- Enter valid phone number
- Confirm customer lookup behavior and name autofill where applicable

### MTC-011: New customer register path
- Continue through password setup for a new customer
- Confirm CRM-backed register flow can complete

### MTC-012: Existing customer password login path
- Confirm CRM-backed password login can complete

### MTC-013: Existing customer OTP login path
- Confirm CRM-backed OTP send/verify path can complete

### MTC-014: Guest flow
- Skip auth where supported
- Confirm guest details persist into later ordering steps

---

## C. Menu / Cart / Review Order
### MTC-020: Add item to cart
- Add item without customization
- Confirm cart count and review-order rendering

### MTC-021: Add customized item
- Select variations/add-ons
- Confirm review-order item renders correctly

### MTC-022: Restaurant-scoped cart isolation
- Build cart in one restaurant
- switch to another restaurant route
- confirm prior cart does not leak

### MTC-023: Review order bill summary
- Confirm item total, subtotal, tax, and grand total display coherently

---

## D. Payment Flow
### MTC-030: Selector hidden when only one payment option exists
- Confirm selector does not render if only online or only COD is available

### MTC-031: Selector shown when both online and COD are available
- Confirm both options render and are selectable

### MTC-032: Online payment CTA label
- Select online payment
- Confirm CTA changes to pay-and-proceed wording

### MTC-033: COD CTA label
- Select COD
- Confirm CTA changes to place-order wording

### MTC-034: Razorpay launch path
- For eligible restaurant/order type, confirm online payment triggers Razorpay initialization path

---

## E. Delivery Flow
### MTC-040: Delivery route to address page
- In delivery mode, confirm user reaches delivery-address page before order continuation where applicable

### MTC-041: Load saved addresses
- Confirm CRM addresses load

### MTC-042: Add a new address
- Create address manually and confirm it becomes selectable

### MTC-043: Use current location / map interaction
- Confirm map/location interactions update address/coordinates behavior

### MTC-044: Delivery charge visibility
- Confirm delivery charge and summary appear in review order for delivery mode

---

## F. Order Success / Edit Order
### MTC-050: Successful order navigation
- Place a non-payment order
- Confirm navigation to order-success page with order summary

### MTC-051: Online payment success path
- Complete online payment path where possible
- Confirm order-success receives payment metadata and verification flow can run

### MTC-052: Edit order entry
- Start from an active order scenario
- Confirm edit-order flow can initialize and update order

### MTC-053: Table-status redirect behavior
- Validate assigned-table behavior for occupied/free states if environment supports it

---

## G. Profile Flow
### MTC-060: Profile page basic info
- Confirm CRM-authenticated customer sees identity info

### MTC-061: Orders tab
- Confirm CRM order history loads

### MTC-062: Points tab
- Confirm transactions load and render sensibly

### MTC-063: Wallet tab
- Confirm wallet balance and transactions load

---

## H. Regression Watch Items
Always re-check after refactors:
- restaurant-scoped CRM token restore
- restaurant-scoped cart clearing
- duplicate-order guard behavior
- 401 retry behavior
- delivery mode routing
- restaurant 716 special case
- notification popup visibility

---

## Environment Dependencies
These manual checks depend on:
- valid restaurant/test routes
- working POS APIs
- working CRM APIs
- working payment setup where applicable
- Google Maps key
- distance API availability for delivery

---

## Open Questions
1. Which restaurants should be the canonical QA anchors for these flows?
2. Which flows are expected to work for guests vs authenticated users in production?
3. Which external failures should block release versus be tolerated gracefully?

## Needs Backend Clarification
- official QA environments and test restaurants
- expected table-status/edit-order scenarios
- expected delivery test conditions

## Assumption Made
- This document is a manual validation checklist, not evidence of executed tests.

---

## What changed from previous version
- broadened scope beyond only FEAT-001 payment checks
- aligned cases to current scan/auth/delivery/order/profile flows
- removed stale environment-specific assumptions as source-of-truth behavior

## Unverified items
- actual pass/fail results
- environment-specific restaurant/payment setup availability

## Follow-ups recommended
1. Add environment-specific test data.
2. Map each case to a release gate or smoke suite.
3. Keep this checklist synchronized with `TEST_CASES.md`.