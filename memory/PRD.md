# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git, branch `11-april-refactor-3`. Set up and run the app with specified environment variables pointing to external MongoDB and MyGenie POS API.

## Architecture
- **Frontend**: React (CRA with Craco) + Tailwind CSS + Radix UI + shadcn components
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: External MongoDB at `52.66.232.149:27017/mygenie`
- **External API**: MyGenie POS API at `https://preprod.mygenie.online/api/v1`

## What's Been Implemented (April 11, 2026)
- Cloned repo from GitHub, branch `11-april-refactor-3`
- Set up backend .env with external MongoDB connection, JWT secret, and MyGenie API URL
- Set up frontend .env with backend URL, image base URL, POS API URL, and login phone
- Resolved `tsconfig.json` / `jsconfig.json` conflict (removed jsconfig.json)
- Installed missing frontend dependencies: `react-icons`, `qrcode.react`, `jszip`, `file-saver`
- Backend running on port 8001, frontend on port 3000
- App fully functional with landing page, menu browsing, login, admin settings

## Core Features (from repo)
- Restaurant landing page with dynamic config
- Menu browsing with categories, stations, search & filters
- Cart & order placement with customization
- Customer authentication (OTP + password)
- Admin settings panel (branding, content, QR codes, dietary tags, visibility)
- Loyalty/rewards integration
- Promo banners
- Table/room selector
- Feedback system

## Environment
- **Backend URL**: https://4a7e2250-5b49-41e3-a2cb-0b90056dac03.preview.emergentagent.com
- **Frontend**: Same URL (port 3000 served via ingress)
- **MongoDB**: External (52.66.232.149:27017/mygenie)

## Active Planning

### FEAT-002: Scan & Order Expansion – Takeaway & Delivery (Planning Phase)
- **Status:** Planning — no code changes yet
- **Spec:** See `/app/memory/FEAT-002-takeaway-delivery.md`
- **4 Order Channels:** Dine-In (done), Room (done), Takeaway (new), Delivery (new)
- **Key APIs identified:** customer/address/list, config/distance-api-new (manage.mygenie.online), config/get-all-zone, auth/login
- **Hardcoding concerns identified:** 6 locations where `dinein` is hardcoded as default/condition

## Backlog / Next Steps
- P0: FEAT-002 Takeaway & Delivery implementation
- P1: Optimize unused ML/AI dependencies in requirements.txt
- P1: Add pagination to /api/status endpoint
- P2: Address React Hook dependency warnings
