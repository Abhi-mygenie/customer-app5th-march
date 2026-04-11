# Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git, branch `11-april-refactor-5-loyality`. Set up environment, install dependencies, and run the app as-is.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Craco (CRA override)
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: Remote MongoDB at 52.66.232.149 (mygenie database)
- **External API**: MyGenie POS API at preprod.mygenie.online

## What's Been Implemented (Jan 11, 2026)
- Cloned repo from GitHub, branch `11-april-refactor-5-loyality`
- Configured frontend .env with MyGenie API URLs, login credentials, and image base URL
- Configured backend .env with remote MongoDB, JWT secret, CORS, and MyGenie API URL
- Resolved `tsconfig.json` / `jsconfig.json` conflict (merged path aliases into tsconfig, removed jsconfig)
- Installed all backend (pip) and frontend (yarn) dependencies
- Both services running via supervisor
- App loads successfully — landing page with restaurant branding, banners, menu, social icons

## Core Features (from codebase)
- Unified auth (customer OTP + restaurant admin password)
- Customer profiles, orders, points, wallet, coupons
- Restaurant app config (branding, visibility toggles, payment options)
- Banner management (CRUD)
- Custom pages (CRUD)
- Feedback system
- Loyalty settings & customer lookup
- Dietary tags management
- File upload (images)
- POS API integration (table config, order details)

## Memory Folder Documents
All documents pulled from repo memory folder including: PRD, API_MAPPING, ARCHITECTURE, BUG_TRACKER, CODE_AUDIT, ROADMAP, TEST_CASES, and feature specs.

## Next Tasks / Backlog
- P0: None (app running as-is per request)
- P1: Any feature additions or bug fixes per user direction
- P2: Production hardening (Redis for OTP, proper SMS integration)
