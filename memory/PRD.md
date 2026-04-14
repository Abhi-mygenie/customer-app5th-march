# PRD — MyGenie Customer App

**Last Updated:** April 14, 2026 (Re-deployed from branch `14-april-v1`)

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

## What's Been Implemented

### Original (Pre April 13)
- Full dine-in ordering flow (QR → menu → cart → order)
- Admin panel with branding, visibility, banners, QR, dietary tags
- Customer auth (password via our backend)
- Loyalty points display and redemption
- Razorpay payment integration
- Edit order flow (table QR)
- Phase 1-2 of FEAT-002: Takeaway mode

### April 13, 2026 — CRM Migration + Delivery Phase 3
- **Phase A**: CRM service layer (`crmService.js`) with 15 API functions
- **Phase B**: Customer auth migrated from our backend to CRM (register, login, forgot-password, reset-password, OTP)
- **Phase C**: Profile page migrated to CRM (orders, points, wallet with response normalization)
- **Phase D**: Delivery address page (CRUD), cart delivery state, order payload wiring, landing page delivery flow

## Prioritized Backlog

### P0 (Critical)
- [ ] Phase E: Full regression testing
- [ ] CRM down fallback (guest mode)
- [ ] Token expiry handling (401 → re-login prompt)

### P1 (Important)
- [ ] Distance API integration (delivery charge calculation)
- [ ] Google Maps geocoding for new addresses
- [ ] Profile page — edit customer info via CRM
- [ ] Coupon listing for customers

### P2 (Nice to have)
- [ ] Our backend customer auth endpoint cleanup (currently unused but alive)
- [ ] Zone-based delivery availability
- [ ] Order tracking in real-time
- [ ] WhatsApp notification integration via CRM

## Next Tasks
1. Run comprehensive test suite (TC-01 through TC-30)
2. Fix any blocking issues
3. Delivery charge via distance API (when keys provided)
4. Google Maps for address geocoding
