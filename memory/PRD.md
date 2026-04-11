# Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git, branch `11-april-refactor-5-loyality`. Set up environment, install dependencies, and run the app as-is.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Craco (CRA override)
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: Remote MongoDB at 52.66.232.149 (mygenie database)
- **External API**: MyGenie POS API at preprod.mygenie.online + manage.mygenie.online

## What's Been Implemented

### Session 1 — Setup (Jan 11, 2026)
- Cloned repo, branch `11-april-refactor-5-loyality`
- Configured frontend/backend .env files
- Resolved tsconfig/jsconfig conflict
- App running with restaurant 478 (18march)

### Session 2 — Planning & FEAT-003 Implementation (Jan 11, 2026)
- Reviewed all memory docs, summarized project roadmap
- Planned FEAT-002 Delivery (BLOCKED — waiting on backend team for address schema + POS lat/lng)
- Created `/app/memory/FEAT-002-DELIVERY-SPEC.md`
- **FEAT-003: Notification Popup — IMPLEMENTED**
  - Backend: `notificationPopups` field added to AppConfigUpdate model + default config
  - Frontend: `useNotificationPopup` hook (delay, auto-dismiss, page matching)
  - Frontend: `NotificationPopup` component (3 variants: modal, banner, toast)
  - Wired into LandingPage, ReviewOrder, OrderSuccess
  - Admin settings UI in AdminSettingsPage (add/edit/delete popups, max 3)
  - Tested: popup appears after delay, close works, respects restaurant branding
  - Test popup data cleaned after verification

## Core Features
- Unified auth (customer OTP + restaurant admin password)
- Customer profiles, orders, points, wallet, coupons
- Restaurant app config (branding, visibility, payment options)
- Banner management, Custom pages, Feedback system
- Loyalty settings, Dietary tags, File upload
- POS API integration (table config, order details)
- FEAT-001: Dual Payment Options ✅
- FEAT-002 Phase 1-2: Takeaway ✅
- FEAT-002 Phase 3: Delivery — BLOCKED (spec ready)
- **FEAT-003: Notification Popups ✅**

## Prioritized Backlog
- P0: FEAT-002 Phase 3 Delivery — BLOCKED on backend team
- P1: Fix inclusive tax logic (2-3 hrs)
- P1: Restaurant-level tax settings (3-4 hrs)
- P2: Extract custom hooks (6-8 hrs)
- P2: Decompose ReviewOrder.jsx (4-6 hrs)
- P3: Full TypeScript migration (8-12 hrs)
