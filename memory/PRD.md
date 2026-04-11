# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git, branch `11-april-refactor-3`. Set up and run the app with specified environment variables pointing to external MongoDB and MyGenie POS API.

## Architecture
- **Frontend**: React (CRA with Craco) + Tailwind CSS + Radix UI + shadcn components
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: External MongoDB at `52.66.232.149:27017/mygenie`
- **External API**: MyGenie POS API at `https://preprod.mygenie.online/api/v1`

## What's Been Implemented

### April 11, 2026 — Initial Setup
- Cloned repo from GitHub, branch `11-april-refactor-3`
- Set up backend .env with external MongoDB connection, JWT secret, and MyGenie API URL
- Set up frontend .env with backend URL, image base URL, POS API URL, and login phone
- Resolved `tsconfig.json` / `jsconfig.json` conflict (removed jsconfig.json)
- Installed missing frontend dependencies: `react-icons`, `qrcode.react`, `jszip`, `file-saver`
- Backend running on port 8001, frontend on port 3000

### April 11, 2026 — FEAT-002-PREP: Hardcoding Removal
- **Audit:** Found 17 issues across 8 files where dine-in was hardcoded
- **Fixed:** 10 issues (6 HIGH + 4 MEDIUM) across 7 files
- **New utility:** `utils/orderTypeHelpers.js` — isDineInOrRoom(), isTakeawayOrDelivery(), needsTableCheck(), showsDineInActions()
- **Files modified:** LandingPage.jsx, ReviewOrder.jsx, OrderSuccess.jsx, TableRoomSelector.jsx, helpers.js, useScannedTable.js
- **Test results:** Backend 85.7%, Frontend 90% pass rate — all order type flows verified
- **Backward compatible:** Existing dine-in + room flows unchanged

## Core Features (from repo)
- Restaurant landing page with dynamic config
- Menu browsing with categories, stations, search & filters
- Cart & order placement with customization
- Customer authentication (OTP + password)
- Admin settings panel (branding, content, QR codes, dietary tags, visibility)
- Loyalty/rewards integration
- Promo banners, Table/room selector, Feedback system
- Razorpay payment integration
- Dual payment options (Online + COD)

## Active Planning

### FEAT-002-PREP: Hardcoding Removal (COMPLETE)
- **Status:** Done — April 11, 2026
- **Spec:** `/app/memory/FEAT-002-PREP-hardcoding-removal.md`

### FEAT-002: Scan & Order Expansion – Takeaway & Delivery (Planning Phase)
- **Status:** Planning — no code changes yet
- **Spec:** `/app/memory/FEAT-002-takeaway-delivery.md`
- **4 Order Channels:** Dine-In (done), Room (done), Takeaway (new), Delivery (new)
- **Key APIs identified:** customer/address/list, config/distance-api-new (manage.mygenie.online), config/get-all-zone, auth/login
- **Phase 1:** Takeaway (mode selector, mandatory name+phone, landing branching)
- **Phase 2:** Delivery (address UI, delivery charge API, zone API, area validation)

## Environment
- **Backend URL**: https://4a7e2250-5b49-41e3-a2cb-0b90056dac03.preview.emergentagent.com
- **MongoDB**: External (52.66.232.149:27017/mygenie)

## Backlog / Next Steps
- P0: FEAT-002 Phase 1 — Takeaway implementation
- P0: FEAT-002 Phase 2 — Delivery implementation
- P1: Optimize unused ML/AI dependencies in requirements.txt
- P2: Address React Hook dependency warnings
- P2: Fix pre-existing ReviewOrder auth token initialization issue
