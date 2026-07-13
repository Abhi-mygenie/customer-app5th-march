# MyGenie Customer App — Data Flow Diagrams (2026-02)

**Status:** Code-verified from `main` HEAD (post-clone, 2026-02)
**Method:** Mermaid `sequenceDiagram` for each of the 8 business-critical flows (see Agent Prompt Part B §5). Every arrow traceable to file + line.
**Companion docs:** `ARCHITECTURE_DIAGRAM_2026-02.md` (container/component view), `BASELINE_DELTA_2026-02.md`

Notation:
- 🟦 **Own-Backend** = FastAPI at `REACT_APP_BACKEND_URL`
- 🟧 **POS** = `REACT_APP_API_BASE_URL` (preprod.mygenie.online/api/v1)
- 🟪 **CRM** = `REACT_APP_CRM_URL` (v1 uses `/scan/*`, v2 uses `/customer/*`)
- 🗄 **LS** = localStorage
- 🟨 **Mongo** = 12-collection remote MongoDB

---

## Flow 1 — QR Scan → Landing → Menu Browse

Entry point for every customer. Traced from `pages/LandingPage.jsx`, `hooks/useMenuData.js`, `context/RestaurantConfigContext.jsx`, `utils/useRestaurantId.js`.

```mermaid
sequenceDiagram
    actor Cust as Customer
    participant Browser
    participant Landing as LandingPage.jsx
    participant Ctx as RestaurantConfigContext
    participant LS as [LS] localStorage
    participant BE as [BE] Own-Backend
    participant POS as [POS] POS API

    Cust->>Browser: scan QR → open /:restaurantId?tableId=X&roomId=Y
    Browser->>Landing: mount route
    Landing->>Landing: useRestaurantId() picks rid (path > query > subdomain > env > default 478)
    Landing->>Landing: useScannedTable() reads tableId/roomId (query + sessionStorage)

    Landing->>Ctx: fetchConfig(rid)
    Ctx->>LS: read restaurant_config_{rid}
    alt cache hit AND not bustCache
        LS-->>Ctx: cached blob
        Ctx-->>Landing: config (fast path, hydrates <html> CSS vars)
    end
    Ctx->>BE: GET /api/config/{rid}
    BE->>Mongo: db.customer_app_config.find_one({restaurant_id: rid})
    Mongo-->>BE: config doc
    BE-->>Ctx: {config, branding, flags}
    Ctx->>LS: write restaurant_config_{rid}
    Ctx-->>Landing: fresh config (isOn() flags now active)

    Landing->>POS: POST /web/restaurant-info {rid}
    POS-->>Landing: restaurant details (name, logo url, open/closed)

    alt allowNonQrOrders == false AND no QR params
        Landing->>BE: POST /api/diagnostics/non-qr-block (telemetry)
        Landing->>Cust: show block modal
    else
        Cust->>Landing: enter phone + name → BROWSE MENU
        Landing->>BE: POST /api/auth/check-customer {phone, rid}
        BE->>Mongo: db.customers.find_one({phone, rid})
        BE-->>Landing: {exists, requires_otp, requires_password}
        Landing->>Browser: navigate /:rid/menu or /:rid/stations
    end

    Note over Landing,POS: On menu route: useMenuData → useQuery<br/>POS calls: /restaurants/{rid}/menu, /stations, /web/menu-master
```

**Key files:** `LandingPage.jsx:81, 595`, `useMenuData.js:174, 240, 329, 387, 417-435`, `RestaurantConfigContext.jsx:152-302`, `utils/useRestaurantId.js:68-128`.

---

## Flow 2 — Customer OTP Login (issues CRM token)

Traced from `LandingPage.jsx`, `AuthContext.jsx`, `crmService.js`.

```mermaid
sequenceDiagram
    actor Cust
    participant Landing
    participant Auth as AuthContext
    participant BE as [BE] Own-Backend
    participant CRM as [CRM] CRM (v1 or v2)
    participant LS as [LS] localStorage

    Cust->>Landing: submit phone (existing customer)
    Landing->>BE: POST /api/auth/send-otp {phone, rid}
    BE->>POS: POST /auth/login (POS session first) [server.py:402]
    POS-->>BE: pos_session_token
    BE->>BE: generate OTP, store in-memory dict ( lost on restart)
    BE-->>Landing: {success, otp_sent}
    Note over BE: in some flows OTP is sent by CRM via /send-otp

    Cust->>Landing: enter OTP
    alt skipOtp flag active (CR-2026-05-30-001)
        Landing->>CRM: /scan/auth/skip-otp {user_id, phone} [v1]
    else v1 (REACT_APP_CRM_API_VERSION=v1)
        Landing->>CRM: /scan/auth/verify-otp {user_id, phone, otp}
    else v2
        Landing->>CRM: /customer/verify-otp {phone, otp}
    end
    CRM-->>Landing: {access_token (JWT), user}

    Landing->>Auth: setCrmToken(token, rid)
    Auth->>LS: write crm_token_{rid}
    Auth->>Auth: getRestaurantIdFromToken(token) — parse user_id claim
    Auth->>CRM: crmGetProfile(token) [/scan/auth/me or /customer/me]
    CRM-->>Auth: user profile
    Auth->>Auth: setUser(profile) — session now customer-authenticated
    Landing->>Browser: navigate /:rid/stations or /:rid/menu
```

**Key files:** `AuthContext.jsx:8-24, 30-70`, `crmService.js:210-438` (10+ CRM endpoints), `LandingPage.jsx`.

⚠ **OTP is stored in an in-memory dict on the backend** — server restart wipes pending OTPs. This is documented in the agent prompt Part B §7.
⚠ **Two CRM contracts coexist** — `v1` (`/scan/*`) vs `v2` (`/customer/*`) toggled by `REACT_APP_CRM_API_VERSION`.

---

## Flow 3 — Admin Login (issues JWT for restaurant scope)

Traced from `pages/Login.jsx`, `AuthContext.jsx`, `server.py`.

```mermaid
sequenceDiagram
    actor Admin
    participant Login as Login.jsx
    participant Auth as AuthContext
    participant BE as [BE] Own-Backend
    participant Mongo as [Mongo] Mongo
    participant POS as [POS] POS API
    participant LS as [LS] localStorage

    Admin->>Login: enter phone + password
    Login->>BE: POST /api/auth/login {phone_or_email, password, restaurant_id?, pos_id}

    alt admin/restaurant flow
        BE->>POS: POST /auth/login (validate against POS) [server.py:402]
        POS-->>BE: {success, user, restaurant_id, pos_token}
        BE->>Mongo: db.users.upsert(user)
        BE-->>Login: LoginResponse{token (JWT), user_type:'restaurant', restaurant_context, pos_token}
    else customer OTP-less
        BE->>Mongo: db.customers.find_one({phone, rid})
        BE-->>Login: LoginResponse{token, user_type:'customer'}
    end

    Login->>Auth: onLogin(response)
    Auth->>LS: write auth_token, restaurant_context
    Auth->>LS: write pos_token (if returned)

    Auth->>BE: GET /api/auth/me — Authorization: Bearer <jwt>
    BE-->>Auth: {user, user_type}
    Auth->>Auth: setToken(jwt), setUserType('restaurant')
    Login->>Browser: navigate /admin/settings

    Note over Auth: JWT has no explicit exp claim in server.py<br/>Frontend uses 10-min TTL via order_auth_token separately ( inconsistent)
```

**Key files:** `Login.jsx:10`, `AuthContext.jsx:38-58`, `server.py:501-616`.

---

## Flow 4 — Cart Management (localStorage + cross-tab)

Traced from `CartContext.js`.

```mermaid
sequenceDiagram
    actor Cust
    participant Menu as MenuItems.jsx
    participant CartCtx as CartContext
    participant LS as [LS] localStorage
    participant OtherTab as Other browser tab
    participant Bar as CartBar (global)

    Cust->>Menu: tap item → Add to cart
    Menu->>CartCtx: addItem(item)
    CartCtx->>CartCtx: calculateCartItemPrice() + isItemAllowedForChannel()
    CartCtx->>LS: setItem(cart_{rid}, {items, createdAt, expiresAt: now+3h})
    CartCtx-->>Bar: state update → CartBar visible
    CartCtx-->>OtherTab: window.dispatchEvent('storage') + CustomEvent('cartUpdated')

    OtherTab->>CartCtx: storage event handler reloads cart_{rid}
    Note over CartCtx: Cross-tab sync — both tabs now show same cart

    Cust->>Menu: change restaurant → navigate /:otherRid
    CartCtx->>CartCtx: detect rid change (prevRestaurantId vs current)
    CartCtx->>LS: removeItem(cart_{prevRid})
    CartCtx->>LS: setItem(prevRestaurantId, currentRid)

    alt cart expired (>3h old)
        CartCtx->>LS: read cart_{rid} → expiresAt < now
        CartCtx->>LS: removeItem(cart_{rid})
        CartCtx->>CartCtx: reset to empty cart
    end

    alt edit-order mode
        Cust->>Bar: tap "Edit Order"
        CartCtx->>LS: setItem(editOrder_{rid}, {previousItems, sessionId, expiresAt})
        Note over CartCtx: prior items tracked so diff can be sent on re-submit
    end
```

**Key files:** `CartContext.js:1-60+`, `MenuItems.jsx`, `components/CartBar/`.

⚠ **`payment_method: "cash_on_delivery"` is set on the client cart payload** but real payment selection lives in `payment_type` (BUG-007 parked).

---

## Flow 5 — Order Placement (ReviewOrder → OrderSuccess) — CRITICAL

The single most important flow. Traced from `pages/ReviewOrder.jsx`, `api/services/orderService.ts`, `api/config/endpoints.js`, `pages/OrderSuccess.jsx`.

```mermaid
sequenceDiagram
    actor Cust
    participant Rev as ReviewOrder.jsx
    participant OS as orderService.ts
    participant BE as [BE] Own-Backend
    participant POS as [POS] POS API
    participant OSuc as OrderSuccess.jsx
    participant LS as [LS] localStorage
    participant Mongo as [Mongo] Mongo
    participant CRM as [CRM] CRM
    participant Browser

    Cust->>Rev: enter Review Order
    Rev->>BE: GET /api/loyalty-settings/{rid} [ReviewOrder.jsx:139]
    BE->>Mongo: db.loyalty_settings.find_one({rid})
    BE-->>Rev: {pointsPerRupee, minRedemption, ...}

    Rev->>BE: GET /api/customer-lookup/{rid}?phone=... [ReviewOrder.jsx:411]
    BE->>CRM: GET {CRM_v2}/customers/lookup {phone,rid} [server.py:903]
    CRM-->>BE: {customer_id, points, wallet}
    BE-->>Rev: customer summary

    Rev->>OS: checkTableStatus(tableId, rid) to POS /customer/check-table-status
    POS-->>OS: {table_available, existing_order_id?}

    alt edit-order mode & existing order
        OS-->>Rev: existing order to diff items
    end

    Cust->>Rev: select payment (Cash / Online) + Place Order
    alt Online payment (Razorpay)
        Rev->>OS: razorpayCreateOrder(payload)
        OS->>POS: POST /razor-pay/create-razor-order
        POS-->>OS: razorpay_order_id
        OS-->>Rev: open Razorpay checkout
        Cust->>Rev: pay to razorpay callback
        Rev->>OS: razorpayVerifyPayment(payment_id, signature)
        OS->>POS: POST /razor-pay/verify-payment
        POS-->>OS: {verified: true}
        OS->>POS: POST /customer/order/autopaid-place-prepaid-order (PLACE_ORDER_AUTOPAID)
    else Cash / postpaid
        OS->>POS: POST /customer/order/place (PLACE_ORDER)
    end

    Note over OS,POS: payload contains<br/> payment_method: "cash_on_delivery" (hardcoded)<br/> payment_type: actual selection (postpaid/prepaid)

    POS-->>OS: {order_id, status}
    OS-->>Rev: place-order response
    Rev->>Browser: navigate /:rid/order-success?orderId=...

    OSuc->>OS: getOrderDetails(order_id) - poll every N seconds
    OS->>BE: GET /api/air-bnb/get-order-details/{oid}
    BE->>POS: GET /air-bnb/get-order-details/{oid} [server.py:869]
    POS-->>BE: order status + payment_status
    BE-->>OSuc: {order, payment_status}
    OSuc->>OSuc: display status, repeat until terminal state
    OSuc->>LS: on success - clear cart_{rid}, editOrder_{rid}
```

**Key files:** `ReviewOrder.jsx:139, 411`, `orderService.ts:83-565`, `endpoints.js:16-50`, `server.py:861-882, 1452-1487`.

⚠ **Hotspot #1** — `ReviewOrder.jsx` (agent prompt Part B §6.1). Contains restaurant-716 special-case logic. Do not refactor without regression suite.
⚠ **Payment payload** — `payment_method` is always `"cash_on_delivery"`; the real intent is in `payment_type`. Intentional per BUG-007.

---

## Flow 6 — Delivery Address (Google Maps)

Traced from `pages/DeliveryAddress.jsx`.

```mermaid
sequenceDiagram
    actor Cust
    participant Del as DeliveryAddress.jsx
    participant GMaps as [GMaps] Google Maps JS
    participant Auth as AuthContext
    participant CRM as [CRM] CRM
    participant BE as [BE] Own-Backend
    participant LS as [LS] localStorage

    Cust->>Del: /:rid/delivery-address
    Del->>GMaps: useJsApiLoader(REACT_APP_GOOGLE_MAPS_API_KEY)
    GMaps-->>Del: map ready

    alt customer has CRM token
        Del->>Auth: getCrmToken(rid)
        Auth-->>Del: token from LS[crm_token_{rid}]
        Del->>CRM: GET /customer/me/addresses (v2) or /scan/addresses (v1)
        CRM-->>Del: [saved addresses]
    end

    Cust->>Del: pick location on map OR select saved address
    Del->>GMaps: reverseGeocode(lat, lng)
    GMaps-->>Del: formatted address

    Cust->>Del: enter phone, flat, landmark → Save
    alt logged in
        Del->>CRM: POST /customer/me/addresses (v2) or /scan/addresses (v1)
        CRM-->>Del: {saved address}
    end
    Del->>LS: setItem(delivery_{rid}, {address, phone, coords})
    Del->>Browser: navigate /:rid/review-order

    Note over Del: Delivery zone validation & delivery charge<br/>are UNKNOWN — see BUG-003 P1 / Agent prompt §13-9
```

**Key files:** `DeliveryAddress.jsx:3, 13`, `crmService.js:478-512`.

⚠ **Partial implementation** — delivery zone validation and charge calculation are missing; see Agent Prompt §13-9.

---

## Flow 7 — Restaurant Admin Config CRUD

Traced from `pages/admin/*`, `context/AdminConfigContext.jsx`, `server.py` config router.

```mermaid
sequenceDiagram
    actor Adm as Restaurant Admin
    participant Layout as AdminLayout
    participant AdmCfg as AdminConfigContext
    participant Settings as AdminSettingsPage
    participant BE as [BE] Own-Backend
    participant Mongo as [Mongo] Mongo
    participant RestCfg as RestaurantConfigContext (customer app)
    participant LS as [LS] localStorage

    Adm->>Layout: /admin (requires auth_token, user_type=restaurant)
    Layout->>Layout: redirect /login if unauth, /profile if not restaurant
    Layout->>AdmCfg: mount provider

    AdmCfg->>BE: GET /api/config/{rid} — with Bearer JWT
    BE->>Mongo: db.customer_app_config.find_one({rid})
    BE-->>AdmCfg: config (80+ keys)

    Adm->>Settings: toggle allowNonQrOrders / skipOtp* / show* / branding CSS
    Settings->>AdmCfg: updateConfig(patch)
    AdmCfg->>BE: PUT /api/config/ — Authorization: Bearer <jwt>
    BE->>Mongo: db.customer_app_config.update_one({rid}, {$set: patch})
    Mongo-->>BE: ack
    BE-->>AdmCfg: updated config
    AdmCfg-->>Settings: toast "Saved"

    Note over Adm,RestCfg: Customer app doesn't auto-refresh<br/>Cache-invalidation happens on next fetchConfig() or ?bustCache=1

    Adm->>Settings: upload banner image
    Settings->>BE: POST /api/upload/image (multipart) — Bearer JWT
    BE->>BE: save to backend/uploads/{filename}
    BE-->>Settings: {url: /api/uploads/{filename}}
    Settings->>BE: POST /api/config/banners {url, position, ...}
    BE->>Mongo: db.customer_app_config.$push banners

    Adm->>Settings: create page / feedback / dietary rules
    Settings->>BE: POST /api/config/pages, /feedback, /dietary-tags/{rid}
```

**Key files:** `AdminLayout.jsx:40-49, 161-167`, `AdminConfigContext.jsx:9`, `server.py:1042-1367, 1368-1401, 1543-1594`.

⚠ **Customer app caches config** in localStorage — admin changes take effect on next customer visit / tab focus refresh, not real-time.

---

## Flow 8 — File Upload (admin only)

Traced from `AdminSettings.jsx`, `AdminBrandingPage`, `server.py:1368`.

```mermaid
sequenceDiagram
    actor Adm
    participant UI as Admin UI
    participant BE as [BE] Own-Backend
    participant FS as backend/uploads/ (disk)

    Adm->>UI: choose logo / banner file
    UI->>UI: FormData with 'file'
    UI->>BE: POST /api/upload/image — Bearer JWT, multipart/form-data
    BE->>BE: validate JWT (restaurant role) [server.py:1368]
    BE->>BE: generate uuid filename + save
    BE->>FS: write /app/backend/uploads/{uuid}.{ext}
    BE-->>UI: {url: "/api/uploads/{uuid}.{ext}"}

    UI->>BE: PUT /api/config/ (persist URL into config)
    BE->>Mongo: update customer_app_config

    Note over BE,FS:  /api/uploads is mounted as StaticFiles [server.py:70]<br/>Uploads directory MUST exist on start (mkdir at boot)<br/> In production: needs persistent volume — else lost on redeploy
```

---

## Cross-cutting: Auth token behaviour on every API call

Traced from `api/interceptors/request.js`, `utils/authToken.js`.

```mermaid
flowchart LR
    Call["Any POS-facing service call<br/>(axios apiClient)"]
    Req["request interceptor"]
    Get["getStoredToken()<br/>reads LS[order_auth_token]"]
    Exp{"isTokenExpired()<br/>LS[order_token_expiry]<br/>vs Date.now()"}
    Bear["set Authorization: Bearer <token>"]
    Skip["send request without Authorization"]
    Server["POS API"]
    Resp["response interceptor<br/>if response.data.data → unwrap"]

    Call --> Req --> Get --> Exp
    Exp -->|not expired| Bear --> Server
    Exp -->|expired or missing| Skip --> Server
    Server --> Resp

    subgraph TokenIssuance["Token issuance (separate path)"]
        LFT["loginForToken()<br/>utils/authToken.js:82"]
        PosProxy["POST /api/pos/auth-token<br/>Own-Backend"]
        POSLogin["POST /auth/login<br/>POS API<br/>uses MYGENIE_POS_LOGIN_PHONE/_PASSWORD (server-side)"]
        Store["storeToken()<br/>LS[order_auth_token]<br/>LS[order_token_expiry] = now + 10min"]
        LFT --> PosProxy --> POSLogin --> PosProxy --> LFT --> Store
    end

    Skip -.401 or first call.-> LFT
```

**Key files:** `interceptors/request.js:15-45`, `interceptors/response.js`, `utils/authToken.js:5-130`, `server.py:828-859`.

⚠ **Two tokens per user**:
- **POS session token** (`order_auth_token`, 10 min) — attached by axios interceptor to POS calls.
- **Own-backend JWT** (`auth_token`) — attached by AuthContext manually in own-BE `fetch()` calls, not via axios.
- **CRM token** (`crm_token_${rid}`) — attached via `x-api-key` + user's token in `crmService.js`.

Three parallel auth systems — a known source of session ambiguity (BUG-001 P0 per Agent Prompt §13-1).

---

*End of Data Flow Diagrams 2026-02. See `BASELINE_DELTA_2026-02.md` for changes vs old baseline.*
