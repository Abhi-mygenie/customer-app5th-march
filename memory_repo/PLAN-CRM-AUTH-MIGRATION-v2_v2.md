# Document Audit Status
- Source File: PLAN-CRM-AUTH-MIGRATION-v2.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/api/services/crmService.js, frontend/src/context/AuthContext.jsx, frontend/src/pages/PasswordSetup.jsx, frontend/src/pages/Profile.jsx, frontend/src/pages/DeliveryAddress.jsx, frontend/src/pages/Login.jsx, frontend/src/pages/LandingPage.jsx, frontend/src/context/CartContext.js, frontend/src/api/services/orderService.ts, backend/server.py
- Notes: Rewritten as a current-state migration-status document. The earlier version was broadly aligned with the code, but some details were either too final or too narrow for the current repository state.

# PLAN v2: CRM Auth Migration Status

## Current Position
The CRM migration is **substantially implemented on the frontend**, but the overall application remains hybrid rather than fully CRM-owned.

## Current Architecture Snapshot
```text
Frontend
  ├─ CRM
  │   ├─ customer register/login
  │   ├─ OTP send/verify
  │   ├─ forgot/reset password
  │   ├─ customer profile/orders/points/wallet
  │   └─ address CRUD
  │
  ├─ Customer App Backend
  │   ├─ admin auth
  │   ├─ check-customer lookup
  │   ├─ app config / banners / content / dietary
  │   ├─ loyalty-settings / customer-lookup
  │   ├─ uploads / docs endpoints
  │   └─ backend customer endpoints still exist
  │
  └─ POS API
      ├─ restaurant/menu data
      ├─ place/update order
      ├─ table status
      ├─ order details
      └─ Razorpay endpoints
```

---

## Migration Areas and Current Status

### Phase A: CRM service foundation
**Status:** Implemented

Verified in `crmService.js`:
- CRM fetch wrapper
- auth fetch wrapper
- customer auth methods
- profile methods
- address methods
- helper for restaurant-scoped `user_id`

### Phase B: Customer auth migration
**Status:** Implemented on active frontend paths

Verified in code:
- `PasswordSetup.jsx` uses CRM for register/login/OTP/reset
- `AuthContext.jsx` stores restaurant-scoped CRM tokens
- `Login.jsx` is effectively admin-focused

### Phase C: Customer profile migration
**Status:** Implemented in current profile page

Verified in `Profile.jsx`:
- orders from CRM
- points from CRM
- wallet from CRM

### Phase D: Delivery address integration
**Status:** Implemented in frontend

Verified in `DeliveryAddress.jsx` and `CartContext.js`:
- list/add/delete/set-default address via CRM
- selected address stored for review-order flow

### Phase E: Full backend/customer-surface consolidation
**Status:** Not complete

Reason:
- backend customer endpoints still exist
- landing page still uses backend `check-customer`
- loyalty and customer lookup still come from backend
- ordering remains POS-driven

---

## What Is Fully Migrated vs Not
| Area | Current State |
|---|---|
| Customer register/login/password/OTP UI flow | Migrated to CRM |
| Customer profile tab data | Migrated to CRM |
| Address management | Migrated to CRM |
| Admin login | Still backend |
| Landing-page customer existence check | Still backend |
| Loyalty settings lookup | Still backend |
| Customer quick lookup in checkout | Still backend |
| Order placement | Still POS |

---

## Token Model After Migration
Verified in code.

| Token | Role | Status |
|---|---|---|
| `crm_token_{restaurantId}` | CRM customer session | Implemented |
| `auth_token` | backend/admin session | Implemented |
| `pos_token` | admin POS operations | Implemented |
| `order_auth_token` | POS ordering session | Implemented |

### Important note
The migration did **not** collapse the app into a single-token model. It introduced a CRM token for customer identity while leaving other tokens in place.

---

## Current Benefits of the Migration
1. Customer password/OTP/auth flows are now clearly separated from admin login.
2. Profile and address flows now use CRM directly.
3. Restaurant-scoped CRM token storage helps prevent cross-restaurant session bleed.
4. Delivery address flow has a concrete persistence surface.

---

## Remaining Gaps
### 1. Hybrid customer ownership remains
Even after CRM migration, backend still owns some customer-related capabilities.

### 2. `check-customer` remains backend-owned
Landing flow still depends on backend for existence/password-state lookup.

### 3. Order lifecycle is not migrated to CRM
The main transactional flow still uses POS order endpoints.

### 4. Docs and architecture still need consolidation
Migration is implemented more than it is clearly codified.

---

## Risks
1. Duplicate domain ownership across CRM and backend
2. Session complexity due to multiple simultaneous auth systems
3. Harder debugging when customer state differs across systems
4. Documentation drift if migration is assumed “complete” without qualifiers

---

## Recommended Current Classification
### Best description for this migration
**“CRM migration implemented for customer auth/profile/address flows, while order placement and several customer-adjacent backend capabilities remain outside CRM.”**

That is more accurate than simply calling the migration complete.

---

## Open Questions
1. Should `check-customer` move to CRM eventually, or remain backend-owned?
2. Should loyalty and customer-lookup stay on backend or move under CRM?
3. Is the long-term goal a backend-for-frontend proxy over CRM/POS, or continued direct frontend integrations?
4. Should order placement ever migrate to CRM, or remain POS-native by design?

## Needs Backend Clarification
- intended end-state of customer identity ownership
- whether backend customer endpoints are transitional or permanent
- whether CRM and backend are guaranteed to share compatible customer data models

## Assumption Made
- This document describes current code reality, not a final intended architecture unless that intent is visible in the code.

---

## What changed from previous version
- Downgraded “complete” language into a more precise hybrid-migration status.
- Clarified what moved to CRM and what did not.
- Added a gap analysis rather than treating the migration as closed.

## Unverified items
- operational synchronization guarantees between CRM and backend data
- future ownership plan not encoded in repo
- whether all restaurants/environments use CRM consistently in production

## Follow-ups recommended
1. Produce a target-state auth architecture doc.
2. Decide whether remaining backend customer endpoints should be retained or retired.
3. Update onboarding docs so engineers understand the post-migration token model.