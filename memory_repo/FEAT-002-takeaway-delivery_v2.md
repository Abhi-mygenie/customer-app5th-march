# Document Audit Status
- Source File: FEAT-002-takeaway-delivery.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/hooks/useScannedTable.js, frontend/src/utils/orderTypeHelpers.js, frontend/src/pages/LandingPage.jsx, frontend/src/pages/PasswordSetup.jsx, frontend/src/pages/DeliveryAddress.jsx, frontend/src/pages/ReviewOrder.jsx, frontend/src/components/OrderModeSelector/OrderModeSelector.jsx, frontend/src/components/TableRoomSelector/TableRoomSelector.jsx, frontend/src/context/CartContext.js
- Notes: Rewritten to align with current implementation. The previous version was directionally useful, but several sections described future-state logic more confidently than the current main-branch code supports.

# FEAT-002: Scan & Order Expansion – Takeaway & Delivery

## Current Feature Position
Takeaway and delivery are **partially implemented in the current codebase**.

### Verified implemented pieces
- QR/session model supports `walkin`, `takeaway`, and `delivery`
- Landing page recognizes takeaway/delivery-style scanned flows
- takeaway/delivery mode toggle exists on landing page
- delivery mode can route to a dedicated delivery address page
- delivery address can be stored in cart state
- review order can include delivery address and delivery charge

### Still partially implemented / externally dependent pieces
- delivery eligibility and charge depend on external distance API behavior
- end-to-end delivery contract is split across CRM + distance API + POS order payload
- documentation and env naming do not yet reflect a clean final architecture

---

## Verified Current Scanner / URL Model
From `useScannedTable.js` and page logic.

### Supported scan context fields
- `type=table`
- `type=room`
- `type=walkin`
- `orderType=dinein`
- `orderType=takeaway`
- `orderType=delivery`
- optional `foodFor`
- optional `tableId`, `tableName`

### Code-verified scan rules
1. `orderType` defaults to `dinein` if absent or invalid.
2. `type=walkin` is explicitly supported.
3. scan context is persisted in `sessionStorage` per restaurant.

**Status:** Verified in code

---

## Current Table Requirement Rule
This is one of the most important verified behaviors.

### Current rule in code
**A table is required only when a real assigned `tableId` exists.**

### Verified helpers
- `hasAssignedTable(scannedTableId)`
- `isDineInOrRoom(orderType)`
- `isTakeawayOrDelivery(orderType)`
- `showsDineInActions(orderType)`

### Practical interpretation
| Scenario | Assigned table required? | Current code view |
|---|---|---|
| Table QR | Yes | Verified |
| Room QR | Yes | Verified |
| Walk-in dine-in | No assigned table by default | Verified |
| Walk-in takeaway | No | Verified |
| Walk-in delivery | No | Verified |
| Direct URL | No assigned table by default | Verified |

### Important nuance
`isDineInOrRoom()` is still used for dine-in context behavior, but assigned-table logic is separately controlled by `hasAssignedTable()`.

---

## Landing Page Behavior for Takeaway / Delivery
Verified in `LandingPage.jsx`.

### Implemented behavior
- If scanned order type is takeaway or delivery, landing page enters takeaway/delivery mode.
- `OrderModeSelector` lets user switch between takeaway and delivery.
- mode changes update stored scan context via `updateOrderType()`.
- for unauthenticated users, takeaway/delivery requires customer capture.
- mandatory name/phone behavior is stronger for takeaway/delivery than for ordinary dine-in.

### Verified customer capture rules in code
- takeaway/delivery: name + valid phone required before proceeding when unauthenticated
- dine-in walk-in: requirement is more config-driven through `mandatoryCustomerName` / `mandatoryCustomerPhone`

**Status:** Verified in code

---

## Delivery Address Flow
Verified in `PasswordSetup.jsx`, `DeliveryAddress.jsx`, `CartContext.js`, and `ReviewOrder.jsx`.

### Current implemented flow
```text
LandingPage
  → PasswordSetup / CRM auth (optional depending on flow)
  → if orderMode === delivery, navigate to /:restaurantId/delivery-address
  → select/add address
  → save address + delivery charge into cart context
  → continue to menu / review order
```

### DeliveryAddress page capabilities
- fetch saved CRM addresses
- select address
- add address
- delete address
- set default address
- use browser geolocation
- use Google Maps search and reverse geocoding
- check delivery distance/charge via external API

### Cart integration
`CartContext.js` stores:
- `deliveryAddress`
- `deliveryCharge`

### Review order integration
`ReviewOrder.jsx` renders:
- delivery summary block
- delivery charge line item
- delivery payload fields passed to `placeOrder()`

**Status:** Partially verified end-to-end

**Reason for partial classification**
The UI and state plumbing are present, but actual delivery acceptance logic is still dependent on external service behavior not fully codified in this repo.

---

## Current Delivery API Usage

### CRM
Used for address storage and retrieval:
- `GET /customer/me/addresses`
- `POST /customer/me/addresses`
- `DELETE /customer/me/addresses/{id}`
- `POST /customer/me/addresses/{id}/set-default`

### Google Maps
Used client-side for:
- autocomplete suggestions
- place detail/geocode behavior
- map interaction

### Distance API
Used in `DeliveryAddress.jsx`:
- request goes to `${REACT_APP_IMAGE_BASE_URL}/api/v1/config/distance-api-new`
- current implementation sends destination lat/lng, restaurant_id, order_value

### POS order payload
Delivery data is attached in `orderService.ts` when placing order.

---

## Takeaway Flow in Current Code
### What is clearly implemented
- takeaway is a first-class `orderType` in scan/session handling
- landing page can switch into takeaway mode
- takeaway can share the same initial customer capture UX with delivery
- review order uses `scannedOrderType` when building order payload

### What is less explicit
- there is no separate dedicated takeaway page
- takeaway behavior is mostly a variant of shared landing/menu/review flow

**Status:** Verified in code

---

## Manual Room/Table Selector and FEAT-002 Alignment
Verified in `TableRoomSelector.jsx` and `ReviewOrder.jsx`.

### Current code reality
- the selector is now shown only in narrower cases than older planning docs implied
- for multi-menu restaurants with assigned-table scans, the selector can still be used
- for non-assigned-table flows, manual table selection is no longer the general rule

### Implication
Earlier FEAT-002 planning correctly anticipated the move away from broad table requirements, but the final code should be treated as the source of truth.

---

## What Is Implemented vs Planned
| Capability | Status | Notes |
|---|---|---|
| Recognize takeaway/delivery order types | Implemented | Verified in scan/session + landing logic |
| Toggle takeaway ↔ delivery on landing | Implemented | `OrderModeSelector` |
| Customer capture for takeaway/delivery | Implemented | landing-page validation |
| Route delivery users to address page | Implemented | `PasswordSetup.jsx` |
| CRM address CRUD | Implemented | `crmService.js`, `DeliveryAddress.jsx` |
| Save selected address into order context | Implemented | `CartContext.js` |
| Show delivery summary on review order | Implemented | `ReviewOrder.jsx` |
| Robust delivery eligibility architecture | Partially implemented | depends on external API behavior |
| Clean single-service delivery ownership | Planned / not yet achieved | current flow is hybrid |

---

## Key Risks Still Relevant
1. Delivery architecture is split across too many surfaces.
2. External distance API behavior is assumed by UI but not formally captured in repo docs.
3. Env naming for manage/distance API is misleading.
4. Documentation drift can reappear if FEAT-002 docs are treated as future-state without periodic code verification.

---

## Open Questions
1. Should delivery always force authentication, or is guest delivery intended long term?
2. Should distance/eligibility be validated again at order placement time server-side?
3. Should delivery APIs be proxied through backend instead of being called directly from frontend?
4. Is takeaway/delivery switching always allowed for all walk-in QR contexts?

## Needs Backend Clarification
- final ownership of delivery validation
- whether delivery charge should come from external manage API, backend, or POS source-of-truth
- whether address storage should remain CRM-only

## Assumption Made
- This doc prioritizes current implemented behavior over earlier planning intent.

---

## What changed from previous version
- Reclassified the feature from planning-only to partially implemented.
- Removed speculative confidence around unresolved delivery architecture choices.
- Centered the document around the actual scan/session, landing, address, and review-order code.

## Unverified items
- live response contract of the distance API
- exact production UX path after address selection in all restaurants/modes
- backend-side reconciliation for delivery-specific order validation

## Follow-ups recommended
1. Add a dedicated delivery sequence diagram doc.
2. Capture live request/response samples for distance API.
3. Align env names and docs once delivery architecture is finalized.