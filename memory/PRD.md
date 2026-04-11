# Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git, branch `11-april-refactor-5-loyality`. Set up environment, install dependencies, and run the app as-is.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Craco (CRA override)
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: Remote MongoDB at 52.66.232.149 (mygenie database)
- **External API**: MyGenie POS API at preprod.mygenie.online + manage.mygenie.online

## Two Backend Systems
| System | URL | Handles |
|--------|-----|---------|
| Our Backend (FastAPI) | REACT_APP_BACKEND_URL | Auth, customer data, app config, loyalty, delivery (planned) |
| POS API (MyGenie) | REACT_APP_API_BASE_URL (preprod.mygenie.online) | Orders, menus, restaurant info, Razorpay, table status |

## What's Been Implemented (Jan 11, 2026)
- Cloned repo from GitHub, branch `11-april-refactor-5-loyality`
- Configured frontend .env with MyGenie API URLs, login credentials, and image base URL
- Configured backend .env with remote MongoDB, JWT secret, CORS, and MyGenie API URL
- Resolved `tsconfig.json` / `jsconfig.json` conflict (merged path aliases into tsconfig, removed jsconfig)
- Installed all backend (pip) and frontend (yarn) dependencies
- Both services running via supervisor
- App loads successfully — landing page with restaurant branding, banners, menu, social icons

## Planning & Documentation (Jan 11, 2026)
- Reviewed all memory docs (ROADMAP, SUMMARY, BUG_TRACKER, ARCHITECTURE, FEAT-002 specs, CODE_AUDIT)
- Analyzed distance API (manage.mygenie.online) and zone API (preprod.mygenie.online) responses
- Confirmed: customer auth + data flows through OUR backend/MongoDB, not POS
- Created FEAT-002-DELIVERY-SPEC.md for handoff to implementation team
- **No delivery code changes made** — planning only per user request

## Core Features (from codebase)
- Unified auth (customer OTP + restaurant admin password)
- Customer profiles, orders, points, wallet, coupons
- Restaurant app config (branding, visibility toggles, payment options)
- Banner management, Custom pages, Feedback system
- Loyalty settings & customer lookup
- Dietary tags management, File upload
- POS API integration (table config, order details)
- FEAT-001: Dual Payment Options (Online + COD) ✅
- FEAT-002 Phase 1: Core Plumbing (walkin type, table rules) ✅
- FEAT-002 Phase 2: Takeaway Flow (OrderModeSelector, mode toggle) ✅
- FEAT-002 Phase 3: Delivery Flow — SPEC CREATED, awaiting implementation by other team

## Memory Folder Documents
All documents pulled from repo memory folder + new FEAT-002-DELIVERY-SPEC.md

## Prioritized Backlog
- P0: FEAT-002 Phase 3 — Delivery Flow (spec ready, ~10-12 hrs, assigned to other team)
- P1: Fix inclusive tax logic (2-3 hrs)
- P1: Restaurant-level tax settings (3-4 hrs)
- P2: Extract custom hooks (6-8 hrs)
- P2: Decompose ReviewOrder.jsx (4-6 hrs)
- P2: Remove 72+ console.logs
- P3: Full TypeScript migration (8-12 hrs)
