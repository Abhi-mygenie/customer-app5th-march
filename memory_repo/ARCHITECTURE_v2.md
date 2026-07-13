# Document Audit Status
- Source File: ARCHITECTURE.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/App.js, frontend/src/context/AuthContext.jsx, frontend/src/context/RestaurantConfigContext.jsx, frontend/src/context/CartContext.js, frontend/src/api/services/*.js, frontend/src/api/services/orderService.ts, frontend/src/hooks/useMenuData.js, backend/server.py
- Notes: Updated to reflect the current hybrid architecture: React frontend, FastAPI backend, direct POS integration, and direct CRM integration. Several earlier sections were accurate in spirit but incomplete about CRM and backend coexistence.

# Architecture Documentation

## Overview
The current codebase is a hybrid customer ordering application with four active layers:

1. **React frontend** for customer and admin experiences
2. **Customer app backend (FastAPI)** for admin config, auth, loyalty helpers, uploads, and selective proxying
3. **POS API** for menu, restaurant data, order placement, order status, table status, and Razorpay
4. **CRM API** for customer auth, customer profile, and address management

This is not a pure frontend-to-backend system. The frontend talks directly to both external services and the in-house backend.

---

## Verified Frontend Structure

```text
frontend/src/
├── api/
│   ├── config/
│   │   ├── axios.js
│   │   └── endpoints.js
│   ├── interceptors/
│   ├── services/
│   │   ├── crmService.js
│   │   ├── dietaryTagsService.js
│   │   ├── orderService.ts
│   │   ├── orderService.js
│   │   ├── restaurantService.js
│   │   ├── stationService.js
│   │   └── tableRoomService.js
│   ├── transformers/
│   │   ├── cartTransformer.ts
│   │   ├── helpers.js
│   │   ├── index.js
│   │   ├── index.ts
│   │   └── orderTransformer.ts
│   └── utils/
├── components/
├── context/
│   ├── AdminConfigContext.jsx
│   ├── AuthContext.jsx
│   ├── CartContext.js
│   └── RestaurantConfigContext.jsx
├── hooks/
├── layouts/
├── pages/
│   ├── customer-facing pages
│   └── admin pages
├── types/
└── utils/
```

**Status:** Verified in code

---

## Runtime Surfaces

### Frontend
- React 19
- CRA + CRACO build pipeline
- React Router v7
- React Query for remote-state caching
- Tailwind + custom CSS + Radix UI components

### Backend
- FastAPI
- Motor / MongoDB
- JWT auth
- Static upload serving under `/api/uploads`

### External Integrations
- POS API via `REACT_APP_API_BASE_URL`
- CRM API via `REACT_APP_CRM_URL`
- Manage/distance API currently reached from frontend via `REACT_APP_IMAGE_BASE_URL`
- Google Maps JS API in `DeliveryAddress.jsx`

---

## Routing Architecture

### Customer routes
Verified in `App.js`:
- `/:restaurantId`
- `/:restaurantId/menu`
- `/:restaurantId/menu/:stationId`
- `/:restaurantId/stations`
- `/:restaurantId/review-order`
- `/:restaurantId/:stationId/review-order`
- `/:restaurantId/order-success`
- `/:restaurantId/password-setup`
- `/:restaurantId/delivery-address`
- `/:restaurantId/about`
- `/:restaurantId/contact`
- `/:restaurantId/feedback`

### Admin routes
Verified in `App.js`:
- `/login`
- `/profile`
- `/admin/settings`
- `/admin/branding`
- `/admin/visibility`
- `/admin/banners`
- `/admin/content`
- `/admin/menu`
- `/admin/dietary`
- `/admin/qr-scanners`

**Status:** Verified in code

---

## Context / State Architecture

### 1. AuthContext
**Responsibilities**
- Stores current user and token state
- Separates admin auth from restaurant-scoped CRM customer auth
- Migrates legacy `crm_token` to `crm_token_{restaurantId}`
- Restores CRM auth per restaurant via `setRestaurantScope()`

**Important architecture note**
Auth is split by use case:
- **Admin auth** → our backend JWT (`auth_token`)
- **Customer CRM auth** → restaurant-scoped CRM token (`crm_token_{restaurantId}`)
- **POS order token** → separate utility flow in `utils/authToken.js`

**Status:** Verified in code

### 2. RestaurantConfigContext
**Responsibilities**
- Fetches backend config via `/api/config/{restaurantId}`
- Caches config in localStorage
- Applies branding through CSS custom properties
- Exposes visibility flags, branding, payment settings, popup config, timing config

**Status:** Verified in code

### 3. CartContext
**Responsibilities**
- Restaurant-scoped cart persistence via `cart_{restaurantId}`
- Edit-order state via `editOrder_{restaurantId}`
- Delivery address and delivery charge state
- Cart expiry management
- Cross-tab cart synchronization

**Status:** Verified in code

**Notable implementation detail**
The cart is explicitly reset when the restaurant changes. This is a real architectural safeguard and should remain documented.

---

## Data Flow Architecture

## A. Restaurant / Menu Data Flow
```text
Component
  → hooks/useMenuData.js
    → restaurantService.js / tableRoomService.js
      → axios.js
        → POS API
```

Used for:
- restaurant info
- product/category loading
- menu master / stations
- table-room configuration

**Status:** Verified in code

## B. Order Flow
```text
ReviewOrder.jsx
  → orderService.ts
    → transformer helpers
      → POS API
```

Used for:
- place order
- update order
- check table status
- fetch order details
- Razorpay endpoints

**Status:** Verified in code

## C. CRM Customer Flow
```text
Landing / PasswordSetup / Profile / DeliveryAddress
  → crmService.js
    → CRM API
```

Used for:
- customer register/login/OTP/reset
- customer profile
- orders/points/wallet
- address CRUD

**Status:** Verified in code

## D. Admin Config Flow
```text
Admin pages / RestaurantConfigContext
  → fetch(REACT_APP_BACKEND_URL + /api/...)
    → FastAPI backend
      → MongoDB
```

Used for:
- config fetch/update
- banners
- custom pages
- feedback fetch
- dietary tags
- uploads
- loyalty settings
- customer lookup

**Status:** Verified in code

---

## Transformer Layer
The earlier document correctly identified the transformer layer as an architectural pattern.

### Verified responsibilities
- Receive-side normalization from API data to app-friendly objects
- Cart/order payload shaping for outgoing requests
- Price calculations helper usage
- Variation/add-on normalization

### Verified core files
- `api/transformers/orderTransformer.ts`
- `api/transformers/cartTransformer.ts`
- `api/transformers/helpers.js`
- `api/transformers/index.ts`
- `api/transformers/index.js`

**Status:** Verified in code

### Scope correction
The transformer layer is important for order and cart flows, but it is not a universal transformation layer for all APIs in the app. CRM and config flows are more direct.

---

## Service Boundaries

| Service | Primary Responsibility | Verified In Code | Status |
|---|---|---|---|
| `restaurantService.js` | Restaurant info, products, menu master | Yes | Verified |
| `tableRoomService.js` | Table/room loading from POS | Yes | Verified |
| `orderService.ts` | Order placement, update, table status, order details | Yes | Verified |
| `crmService.js` | Customer auth/profile/address CRM calls | Yes | Verified |

---

## Backend Architecture
Verified in `backend/server.py`.

### Routers
- `auth_router`
- `customer_router`
- `config_router`
- `upload_router`
- `dietary_router`
- `air_bnb_router`
- root `api_router` with `/api` prefix

### Data stores / collections used
- `customers`
- `users`
- `orders`
- `points_transactions`
- `wallet_transactions`
- `coupons`
- `customer_app_config`
- `feedback`
- `loyalty_settings`
- `dietary_tags_mapping`
- `status_checks`

**Status:** Verified in code

### Key backend behaviors
- JWT-based auth for backend APIs
- POS token refresh for admin login via vendoremployee login
- Public config defaults if no config document exists
- Loyalty settings fallback defaults if not configured
- Customer phone normalization for lookup and auth

**Status:** Verified in code

---

## Payment Architecture

### Verified current logic
- Payment selection is UI-driven in `ReviewOrder.jsx`
- Backend config exposes `codEnabled`, `onlinePaymentDinein`, `onlinePaymentTakeaway`, `onlinePaymentDelivery`, `payOnlineLabel`, `payAtCounterLabel`
- Order payload still sends `payment_method: 'cash_on_delivery'`
- `payment_type` determines prepaid vs postpaid behavior
- Razorpay create/verify endpoints are called from frontend

**Status:** Verified in code

### Important caveat
The payment system is operationally hybrid and somewhat counterintuitive:
- UI offers online vs counter payment
- payload still hardcodes `payment_method` to `cash_on_delivery`
- behavior depends on `payment_type`

This is code-verified, but should be considered an area that needs clearer backend/POS contract documentation.

---

## Delivery Architecture

### Verified implemented pieces
- Dedicated `DeliveryAddress.jsx` page
- CRM-backed address CRUD
- delivery address stored in `CartContext`
- distance API call from frontend
- Google Maps search/geocode UI integration
- order payload includes delivery fields when address exists

### Verified partial / conflicting points
- Delivery is implemented in frontend, but historical docs still describe parts of it as planning.
- Distance API uses `REACT_APP_IMAGE_BASE_URL` as a base, which is semantically mismatched to its actual purpose.
- Zone-specific API usage is not clearly implemented in the inspected code paths.

**Status:** Partially verified

---

## Order Mode / Scan Architecture
Verified through route logic and helpers.

### Current rule set in code
- Table requirement is based on `tableId` presence, not simply `orderType`
- `isDineInOrRoom()` is still used for dine-in/room-specific actions
- `hasAssignedTable()` is the key helper for assigned-table logic
- Walk-in / takeaway / delivery are supported in scanned-flow helpers and page logic

**Status:** Verified in code

---

## Major Architectural Risks

### 1. Multi-backend complexity
The frontend directly integrates with three API surfaces with different auth models.
- POS auth token
- backend JWT
- CRM token

**Risk:** High

### 2. Ambiguous base-URL responsibility
`REACT_APP_API_BASE_URL` appears to be used for POS endpoints, while backend also exposes overlapping proxy endpoints.

**Risk:** Medium-High

### 3. Large page complexity
`ReviewOrder.jsx`, `LandingPage.jsx`, and `OrderSuccess.jsx` hold substantial orchestration logic.

**Risk:** High

### 4. Mixed customer-auth ownership
Customer capabilities are split between CRM and our backend.

**Risk:** High

---

## Open Questions
1. Is direct frontend access to POS APIs an intentional long-term design, or transitional?
2. Should backend customer endpoints be treated as legacy now that CRM handles most customer identity and address flows?
3. Is `REACT_APP_IMAGE_BASE_URL` intentionally reused for the distance API base, or is that a temporary workaround?
4. Which endpoints are expected to be available behind ingress in deployed environments versus local environments?

## Needs Backend Clarification
- Intended ownership split between CRM and FastAPI for customer profile and order-adjacent flows.
- Whether order-details should be proxied consistently through backend.
- Whether payment fields sent to POS should be rationalized beyond current `payment_method`/`payment_type` asymmetry.

## Assumptions Made
- Architectural conclusions are based on code references, not runtime traffic tracing.
- `memory/*.md` was treated as the source documentation set because `docs/source` is absent.

---

## What changed from previous version
- Added CRM and backend coexistence explicitly.
- Reframed the app as a hybrid integration architecture, not just a transformer-driven frontend.
- Corrected the delivery and auth architecture to match current code.
- Added risks around split token models and overlapping API surfaces.

## Unverified items
- Exact ingress/runtime routing behavior for all environments.
- Live response shapes for POS and CRM APIs.
- Whether all documented admin pages are fully wired to backend endpoints beyond inspected code paths.

## Follow-ups recommended
1. Produce a dedicated sequence diagram per flow: customer auth, delivery, order placement, admin config.
2. Consolidate base-URL strategy and document when frontend should call backend proxy vs external service directly.
3. Split orchestration-heavy pages into smaller domain hooks/components.
4. Define a formal token-handling standard across POS, CRM, and backend auth.