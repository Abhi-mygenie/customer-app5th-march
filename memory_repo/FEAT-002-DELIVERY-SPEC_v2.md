# Document Audit Status
- Source File: FEAT-002-DELIVERY-SPEC.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Outdated Rewritten
- Confidence: High
- Last Reviewed Areas: frontend/src/pages/DeliveryAddress.jsx, frontend/src/pages/PasswordSetup.jsx, frontend/src/pages/ReviewOrder.jsx, frontend/src/context/CartContext.js, frontend/src/api/services/crmService.js, frontend/src/api/services/orderService.ts
- Notes: Rewritten from a planning document into a current-state delivery spec baseline. The old version primarily described open decisions before implementation; current code now contains a real delivery flow, though still with partial architectural clarity.

# FEAT-002-DELIVERY: Delivery Flow Specification

## Current Feature Position
Delivery is **implemented at the frontend flow level**, but remains **partially mature** from an architecture and contract perspective.

## Current Flow Summary
```text
Landing / QR context
  → customer identification (guest or CRM-backed)
  → if delivery mode, route to delivery-address page
  → select/add address
  → save address and delivery charge into cart context
  → continue through menu and review order
  → place order through POS payload with delivery fields attached
```

---

## Verified Implemented Components
### 1. Delivery mode recognition
- `useScannedTable.js`
- `LandingPage.jsx`
- `OrderModeSelector.jsx`

### 2. Delivery address page
- `DeliveryAddress.jsx`

### 3. Delivery state storage
- `CartContext.js`

### 4. Delivery summary and payload integration
- `ReviewOrder.jsx`
- `orderService.ts`

### 5. CRM address integration
- `crmService.js`

---

## Verified Delivery Data Sources
### CRM
Used for:
- saved addresses
- new address creation
- delete / set default address

### Google Maps
Used for:
- address suggestions
- geolocation-driven map interactions
- reverse geocoding support

### Distance API
Used for:
- delivery charge / availability style checks
- current request path: `${REACT_APP_IMAGE_BASE_URL}/api/v1/config/distance-api-new`

### POS order endpoint
Used for final order submission with attached delivery fields.

---

## Current Payload Shape in Ordering
Verified in `orderService.ts`.

### Delivery-related outgoing fields
- `delivery_charge`
- `pincode`
- `address`
- `latitude`
- `longitude`
- `address_type`
- `contact_person_name`
- `contact_person_number`
- `road`
- `house`
- `floor`

**Status:** Verified in code

---

## Current Delivery UX Capabilities
### Address list
- select saved CRM address
- preselect default/first address when available

### Address creation
- manual form entry
- address type, address lines, city, state, pincode
- contact person details
- delivery instructions
- map/location support

### Delivery validation behavior
- distance API called when coordinates are available/updated
- result stored in page state and used to set delivery charge context

### Review-order display
- summary card for selected delivery destination
- delivery charge line in price breakdown

---

## What Is Implemented vs Partial
| Capability | Status | Notes |
|---|---|---|
| Delivery route mode recognition | Implemented | Verified |
| Delivery address CRUD UI | Implemented | Verified |
| Delivery address persistence in cart state | Implemented | Verified |
| Delivery summary in review order | Implemented | Verified |
| Delivery charge lookup | Implemented in UI integration | External contract dependent |
| Clear final source-of-truth for delivery validation | Partial | Hybrid responsibilities |
| Clean env semantics for manage/delivery APIs | Partial | current env naming is misleading |

---

## Key Architectural Observations
1. Delivery is not just “planned” anymore; it exists in code.
2. The flow is hybrid:
   - CRM owns addresses
   - distance API influences delivery viability/charge
   - POS owns final order placement
3. The env and ownership model still need clarification.

---

## Current Risks
### Risk 1: Delivery contract fragmentation
No single service fully owns the delivery flow.

### Risk 2: Env naming confusion
`REACT_APP_IMAGE_BASE_URL` is currently being used as a base for non-image delivery calls.

### Risk 3: Incomplete contract documentation
The code assumes distance API response behavior that is not fully codified in repo docs.

---

## Open Questions
1. Should delivery validation be performed again at submit time, not only during address selection?
2. Should the distance API be proxied through backend?
3. Is guest delivery intended as a supported long-term product path?
4. Should CRM remain the long-term address owner?

## Needs Backend Clarification
- final ownership of delivery validation and charge
- whether backend should become the coordination layer for delivery
- stable response contract for the distance API

## Assumption Made
- This doc describes current implemented behavior and its limitations, not a finalized target-state architecture.

---

## What changed from previous version
- replaced open-preimplementation decisions with current code-driven flow documentation
- reclassified delivery from planning-only to partially implemented
- documented the actual current data surfaces used by delivery flow

## Unverified items
- live distance API response schema across environments
- final production order-validation behavior for delivery failures
- whether all restaurants support the same delivery contract

## Follow-ups recommended
1. Add live API samples to this document.
2. Create a target-state delivery architecture decision record.
3. Rationalize env naming for manage/delivery APIs.