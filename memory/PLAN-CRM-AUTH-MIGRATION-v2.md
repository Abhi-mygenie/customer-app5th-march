# PLAN v2: Migrate Customer Auth to CRM + Delivery Phase 3

**Date:** April 13, 2026  
**Status:** IMPLEMENTED — All phases (A-D) complete, Phase E (testing) in progress  
**Supersedes:** PLAN-CRM-AUTH-MIGRATION.md (v1)

---

## Implementation Status

| Phase | Status | Date |
|-------|--------|------|
| Phase A: Foundation | ✅ COMPLETE | April 13, 2026 |
| Phase B: Customer Auth Migration | ✅ COMPLETE | April 13, 2026 |
| Phase C: Profile Page Migration | ✅ COMPLETE | April 13, 2026 |
| Phase D: Delivery Address + Flow | ✅ COMPLETE | April 13, 2026 |
| Phase E: Testing & Polish | IN PROGRESS | April 14, 2026 |

---

## Architecture — Current State

```
Frontend
  ├── CRM (crm_token - CRM JWT)
  │     ├─ Customer auth (register, login, forgot-password, reset-password, send-otp, verify-otp)
  │     ├─ Customer data (profile, orders, points, wallet)
  │     └─ Address CRUD (list, add, edit, delete, set-default)
  │
  ├── Our FastAPI Backend (auth_token - Our JWT, admin only)
  │     ├─ check-customer (public, reads same DB)
  │     ├─ App config, banners, content, dietary tags
  │     ├─ Loyalty settings, customer-lookup
  │     ├─ Admin auth, upload, table-config proxy
  │     └─ Feedback, docs endpoints
  │
  └── POS API (order_auth_token - POS token, unchanged)
        └─ Menus, order placement, Razorpay, table status
```

## Files Changed

### New Files
- `frontend/src/api/services/crmService.js` — 15 CRM API functions
- `frontend/src/pages/DeliveryAddress.jsx` — Address CRUD page
- `frontend/src/pages/DeliveryAddress.css` — Styling

### Modified Files
- `frontend/.env` — Added REACT_APP_CRM_URL
- `frontend/src/context/AuthContext.jsx` — CRM token management
- `frontend/src/pages/PasswordSetup.jsx` — CRM register/login/forgot/reset
- `frontend/src/pages/Login.jsx` — Admin-only
- `frontend/src/pages/Profile.jsx` — CRM endpoints for orders/points/wallet
- `frontend/src/App.js` — DeliveryAddress route
- `frontend/src/context/CartContext.js` — Delivery state
- `frontend/src/pages/LandingPage.jsx` — orderMode pass-through, delivery redirect
- `frontend/src/pages/ReviewOrder.jsx` — Delivery address display + order payload
- `frontend/src/api/services/orderService.ts` — Delivery fields in POS payload

## CRM Endpoints Used (v1.4)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/customer/register` | POST | New customer + set password |
| `/customer/login` | POST | Password login → CRM token |
| `/customer/send-otp` | POST | Send OTP |
| `/customer/verify-otp` | POST | OTP login → CRM token |
| `/customer/forgot-password` | POST | Reset password OTP |
| `/customer/reset-password` | POST | Set new password with OTP |
| `/customer/me` | GET | Profile |
| `/customer/me/addresses` | GET/POST | List/Add addresses |
| `/customer/me/addresses/{id}` | PUT/DELETE | Edit/Delete address |
| `/customer/me/addresses/{id}/set-default` | POST | Set default |
| `/customer/me/orders` | GET | Order history |
| `/customer/me/points` | GET | Points history |
| `/customer/me/wallet` | GET | Wallet history |

## Deferred Items
1. Distance API (delivery charge calculation) — hardcoded 0
2. Google Maps geocoding — existing addresses have lat/lng
3. Zone API
4. CRM coupon listing
5. Our backend customer auth endpoint cleanup
