# Document Audit Status
- Source File: PRD.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Outdated Rewritten
- Confidence: High
- Last Reviewed Areas: frontend/package.json, backend/requirements.txt, frontend/src/App.js, frontend/src/pages/*, frontend/src/context/*, frontend/src/api/services/*, backend/server.py, memory/*.md
- Notes: Rewritten to match the current main-branch codebase and the actual audit objective. The prior version mixed implementation history, planned work, and branch-specific notes that are no longer aligned to the repository state audited here.

# MyGenie Customer App - Product Requirements Baseline

## Current Audit Context
This document has been rewritten as a code-verified PRD baseline for the current `main` branch clone audited in this session.

## Product Summary
MyGenie Customer App is a restaurant-facing web application supporting:
- restaurant landing and menu browsing
- QR-based scan-and-order journeys
- dine-in, takeaway, and delivery-related flows
- customer identity flows across backend and CRM integrations
- admin configuration for branding, visibility, content, QR, and payment options

## Primary User Types
### 1. Customer
A customer can:
- open a restaurant URL or scan a QR code
- browse restaurant menus
- add items with variations/add-ons
- place new orders
- edit active orders in supported scenarios
- view order status and bill summary
- use delivery address flows where enabled

### 2. Restaurant Admin
A restaurant admin can:
- log in through `/login`
- access `/admin/*` pages
- manage customer-app configuration and content
- manage banners, visibility, dietary mappings, and QR-related admin features

---

## Product Scope Verified in Code

### Core customer capabilities
| Capability | Status | Evidence |
|---|---|---|
| Restaurant landing page | Implemented | `LandingPage.jsx` |
| Menu browsing | Implemented | `DiningMenu.jsx`, `MenuItems.jsx`, `useMenuData.js` |
| Cart and item customization | Implemented | `CartContext.js`, menu/cart components |
| Review order | Implemented | `ReviewOrder.jsx` |
| Order success / status page | Implemented | `OrderSuccess.jsx` |
| Edit order flow | Implemented | `LandingPage.jsx`, `OrderSuccess.jsx`, `CartContext.js`, `orderService.ts` |
| Delivery address page | Implemented | `DeliveryAddress.jsx` |
| Profile page | Implemented | `Profile.jsx` |
| About / Contact / Feedback pages | Implemented | `AboutUs.jsx`, `ContactPage.jsx`, `FeedbackPage.jsx` |

### Admin capabilities
| Capability | Status | Evidence |
|---|---|---|
| Admin login | Implemented | `Login.jsx`, `AuthContext.jsx`, `server.py` |
| App config fetch/update | Implemented | `RestaurantConfigContext.jsx`, `server.py` |
| Branding admin pages | Implemented | `AdminBrandingPage.jsx`, config APIs |
| Visibility admin pages | Implemented | `AdminVisibilityPage.jsx` |
| Banner management | Implemented | `AdminBannersPage.jsx`, banner APIs |
| Content/custom-page related admin | Implemented | `AdminContentPage.jsx`, config page APIs |
| Dietary tags admin | Implemented | `AdminDietaryPage.jsx`, dietary APIs |
| QR admin page | Implemented | `AdminQRPage.jsx`, `/api/table-config` |

---

## Architecture Baseline
### Frontend
- React 19
- CRACO / CRA build
- React Router v7
- React Query
- Tailwind / custom CSS / Radix components

### Backend
- FastAPI
- Motor async MongoDB access
- JWT auth
- static upload serving

### Data / Integrations
- MongoDB-backed customer-app backend
- POS integration via `REACT_APP_API_BASE_URL`
- CRM integration via `REACT_APP_CRM_URL`
- Google Maps integration on delivery address page

---

## Functional Requirements

### 1. Restaurant Context Handling
The app must support restaurant-scoped behavior using route parameters and scanned QR metadata.

**Verified in code:**
- `/:restaurantId` route structure
- restaurant-scoped config caching
- restaurant-scoped CRM auth tokens
- restaurant-scoped cart storage

### 2. Scan & Order Entry
The app must support entry through:
- direct restaurant route
- scanned table/room QR
- walk-in/takeaway/delivery style route params

**Verified in code:**
- `useScannedTable()` usage across pages
- `orderTypeHelpers.js`
- landing/review/order-success flow logic

### 3. Customer Identity
The app currently supports multiple customer identity patterns:
- guest capture on landing page
- backend customer lookup and password flows
- CRM register/login/OTP/reset/profile/address flows

**Status:** Implemented but architecturally split

### 4. Menu & Ordering
The app must allow:
- restaurant info load
- menu master / station load
- category/item presentation
- item variations/add-ons
- cart persistence
- tax/bill calculations
- order placement/update

**Status:** Implemented

### 5. Payment Selection
The app must support configurable payment options by order type.

**Verified in code:**
- config fields for COD and online payment toggles
- payment selection UI in review order
- Razorpay create/verify endpoint usage

**Important caveat:**
Current order payload behavior still depends on `payment_type` while `payment_method` remains hardcoded to `cash_on_delivery`.

### 6. Delivery Flow
The app must support delivery-specific address selection and persistence.

**Verified in code:**
- `DeliveryAddress.jsx`
- CRM address CRUD service methods
- delivery address state in cart context
- distance API invocation

**Status:** Partially implemented end-to-end, because some backend/service contract details remain externally dependent.

---

## Non-Functional Requirements

### Configuration-driven UI
The app uses restaurant-configurable visibility and branding settings.

### Restaurant-safe state isolation
Cart and CRM auth are restaurant-scoped in local storage.

### API-driven UX
The app depends heavily on external service availability and contract stability.

### Browser-hosted operation
Frontend is intended to run as a browser-delivered React app under supervisor-managed dev/runtime infrastructure.

---

## Environment / Configuration Inputs Verified in Code
### Frontend envs referenced in code
- `REACT_APP_BACKEND_URL`
- `REACT_APP_API_BASE_URL`
- `REACT_APP_IMAGE_BASE_URL`
- `REACT_APP_CRM_URL`
- `REACT_APP_GOOGLE_MAPS_API_KEY`
- `REACT_APP_LOGIN_PHONE`
- `REACT_APP_LOGIN_PASSWORD`

### Backend envs referenced in code
- `MONGO_URL`
- `DB_NAME`
- `JWT_SECRET`
- `MYGENIE_API_URL`
- `CORS_ORIGINS`

**Important note**
The audited prompt listed `MONGO_URL` but did not list `DB_NAME`, while `server.py` requires `DB_NAME`. This is an operational dependency visible in code.

---

## Current Implementation Status Summary
| Area | Status |
|---|---|
| Core customer menu/order flow | Implemented |
| Admin config flow | Implemented |
| Restaurant-scoped cart | Implemented |
| Restaurant-scoped CRM auth | Implemented |
| Delivery address UI | Implemented |
| Delivery contract completeness | Partially implemented |
| Unified customer-auth ownership | Not fully unified |
| Documentation consistency | Outdated before this audit |

---

## Key Product Risks
1. **Split customer identity architecture** across backend and CRM
2. **High coupling to external POS/CRM contracts**
3. **Large orchestration pages** for landing/review/success flows
4. **Documentation drift** from actual code and branch history
5. **Ambiguity in runtime routing** between direct external calls and backend proxy paths

---

## Open Questions
1. Is customer auth intended to stay hybrid, or should one system become the single source of truth?
2. Should order details and other POS endpoints be consistently proxied through backend?
3. What is the intended production contract for delivery charge, zone validation, and delivery availability?
4. Which customer backend endpoints remain strategic versus legacy after CRM adoption?

## Needs Backend Clarification
- Final ownership of customer profile, addresses, and loyalty-adjacent flows
- Intended long-term payment payload semantics
- Required env baseline for reliable deployment, especially `DB_NAME`

## Assumptions Made
- This PRD is based on the cloned `main` branch, not earlier feature branches referenced in old docs.
- Historical session notes were not treated as source of truth unless still reflected in code.

---

## What changed from previous version
- Removed branch-specific history and implementation diary language.
- Rewrote the document as a current-state PRD baseline.
- Added explicit acknowledgment of the hybrid backend/POS/CRM model.
- Marked delivery and customer-auth architecture as partially unified rather than fully complete.

## Unverified items
- Live service behavior for external POS and CRM APIs
- Production runtime env values
- Operational ownership decisions not encoded in the repo

## Follow-ups recommended
1. Produce a separate target-state PRD once product/backend ownership decisions are confirmed.
2. Add a deployment prerequisites doc that includes all required backend env vars.
3. Create a dedicated auth architecture doc clarifying admin vs CRM vs POS token flows.
4. Keep this PRD synchronized with architecture and endpoint docs after every major flow change.