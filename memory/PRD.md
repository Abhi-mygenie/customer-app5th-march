# PRD — MyGenie Customer App

**Last Updated:** April 14, 2026 (Session 12 — OTP Auth + Delivery Map + Distance API)

---

## Problem Statement
White-label restaurant customer app (PWA) where diners scan a QR code to browse menus, place orders, pay, and interact with loyalty/wallet features. Built for MyGenie POS ecosystem.

## Architecture
Three-backend system:
1. **Our FastAPI Backend** — Admin auth, app config, branding, banners, loyalty settings, dietary tags, customer-lookup, feedback
2. **POS API (MyGenie)** — Menus, products, order placement, Razorpay, table status, restaurant info
3. **CRM Backend (DinePoints)** — Customer auth (password + OTP), customer profile, addresses, points, wallet, orders

Single shared MongoDB at `52.66.232.149:27017/mygenie`.

## User Personas
1. **Dine-in Customer** — Scans table QR, browses menu, orders, pays
2. **Takeaway Customer** — Walk-in QR, selects takeaway, orders without table
3. **Delivery Customer** — Walk-in QR, selects delivery, adds address, orders
4. **Restaurant Admin** — Manages branding, banners, visibility, QR codes, content

## Core Requirements
- QR-based ordering (table, walk-in, walk-in menu)
- Customer auth (password + OTP via CRM)
- Menu browsing with variations, add-ons, dietary tags
- Cart management with edit-order flow
- Order placement with GST/VAT calculation
- Razorpay online payment
- Loyalty points earn/redeem
- Wallet balance
- Admin panel for configuration
- Delivery with map-based address selection + distance-based charge

## What's Been Implemented

### Original (Pre April 13)
- Full dine-in ordering flow (QR -> menu -> cart -> order)
- Admin panel with branding, visibility, banners, QR, dietary tags
- Customer auth (password via our backend)
- Loyalty points display and redemption
- Razorpay payment integration
- Edit order flow (table QR)
- Phase 1-2 of FEAT-002: Takeaway mode

### April 13, 2026 — CRM Migration + Delivery Phase 3
- Phase A: CRM service layer (crmService.js) with 15 API functions
- Phase B: Customer auth migrated from our backend to CRM (register, login, forgot-password, reset-password, OTP)
- Phase C: Profile page migrated to CRM (orders, points, wallet with response normalization)
- Phase D: Delivery address page (CRUD), cart delivery state, order payload wiring, landing page delivery flow

### April 14, 2026 — OTP Auth + Delivery Map + Distance API
- **OTP Login**: 3-state auth method chooser on PasswordSetup (OTP / Password / Set Password)
  - Works for existing customers WITH password (OTP primary, password secondary)
  - Works for existing customers WITHOUT password (OTP primary, set-password secondary)
  - New customers still go through registration (no OTP for unregistered)
  - 30-sec resend timer, dev OTP display, phone masking
  - 30 unit tests passing
- **Phone prefix fix (BUG-045)**: stripPhonePrefix() strips +91 before CRM calls
- **CRM URL fix**: Corrected REACT_APP_CRM_URL from our backend to crm.mygenie.online
- **Auto-populate name**: Debounced check-customer on landing page, auto-fills name for returning customers
- **Google Maps delivery page**: Full rewrite of DeliveryAddressPage with:
  - Google Map with draggable pin
  - Browser geolocation ("Use Current Location")
  - Saved address cards from CRM
  - Reverse geocoding (pin drag -> address text)
  - Forward geocoding (address without lat/lng -> map pin)
- **Distance API integration**: POST to manage.mygenie.online/api/v1/config/distance-api-new
  - Deliverability gate (shipping_status: Yes/No)
  - Delivery charge + ETA display
  - Debounced 500ms on address change
- **Order payload wiring**: helpers.js now populates delivery fields (address, lat, lng, delivery_charge, address_id, contact_person, house, floor, road, pincode) from CartContext

## Prioritized Backlog

### P0 (Critical)
- [ ] Full regression testing (TC-01 through TC-30 + new delivery tests)
- [ ] CRM down fallback (guest mode)
- [ ] Token expiry handling (401 -> re-login prompt)

### P1 (Important)
- [ ] Zone API integration (COD limits, surge pricing) — Phase 2
- [ ] Google Maps autocomplete for address search
- [ ] Profile page — edit customer info via CRM
- [ ] Coupon listing for customers (/coupons/validate)
- [ ] /pos/max-redeemable — points redemption at checkout
- [ ] /pos/orders — CRM order placement (auto loyalty/wallet/WhatsApp)
- [ ] /feedback — post-order rating via CRM
- [ ] Address edit UI (PUT endpoint exists, no UI)
- [ ] BUG-046: stripPhonePrefix only handles India +91

### P2 (Nice to have)
- [ ] Our backend customer auth endpoint cleanup
- [ ] Order tracking in real-time
- [ ] WhatsApp notification integration via CRM

## Next Tasks
1. Run comprehensive test suite
2. Fix any blocking issues from tests
3. Zone API integration (Phase 2)
4. CRM checkout endpoints (/coupons/validate, /pos/max-redeemable, /pos/orders)
