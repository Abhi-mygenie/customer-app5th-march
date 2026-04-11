# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git branch `abhi-25th-march-all-fix-refeactor3-withtest-cases-and-hyatt-fix-` (public repo). Ensure all documents are pulled from memory folder. Build and run the app as-is. Don't run test agent.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React + Craco + TailwindCSS on port 3000
- **Database**: External MongoDB at 52.66.232.149:27017 (mygenie db)
- **External API**: MyGenie POS API at https://preprod.mygenie.online/api/v1

## What's Been Implemented (2026-04-10)
- Cloned repo from specified branch
- Resolved tsconfig.json/jsconfig.json conflict (removed jsconfig.json)
- Configured backend .env with MongoDB credentials, JWT secret, POS API URL
- Configured frontend .env with backend URL, image base URL, POS API URL, login credentials
- Installed all backend (pip) and frontend (yarn) dependencies
- Both services running and verified via screenshots

## Env Configuration
### Backend (.env)
- MONGO_URL: External MongoDB (52.66.232.149)
- DB_NAME: mygenie
- MYGENIE_API_URL: https://preprod.mygenie.online/api/v1
- JWT_SECRET: configured
- CORS_ORIGINS: *

### Frontend (.env)
- REACT_APP_BACKEND_URL: https://customer-app-preview-3.preview.emergentagent.com
- REACT_APP_IMAGE_BASE_URL: https://manage.mygenie.online
- REACT_APP_API_BASE_URL: https://preprod.mygenie.online/api/v1
- REACT_APP_LOGIN_PHONE: +919579504871
- REACT_APP_LOGIN_PASSWORD: Qplazm@10

## Core Features (from existing codebase)
- Restaurant landing page with branding
- Menu browsing with stations/categories
- Cart and order review
- Customer auth (OTP + password)
- Admin settings panel (branding, visibility, banners, content, dietary tags, QR)
- Loyalty points, wallet, coupons
- Feedback system
- POS API integration

## Backlog / Next Tasks
- P0: None (app running as-is per requirement)
- P1: Production JWT secret rotation
- P2: Redis-based OTP storage (currently in-memory)

## Audit Fixes Applied (Apr 10, 2026)
- DFA-001: Removed 4 hardcoded preprod API URL fallbacks from frontend (axios.js, endpoints.js, orderService.ts, useMenuData.js)
- DFA-002: Removed 2 hardcoded preprod API URL fallbacks from backend (server.py refresh_pos_token, MYGENIE_API_URL)
- DFA-003: Removed MyGenie logo fallbacks from 5 files (7 locations). No logo = no image shown, restaurant name text displayed instead
- DFA-004: Made "Powered by" footer configurable via `poweredByText` and `poweredByLogoUrl` config fields (backend model + defaults + frontend context + LandingPage)
- Backend now fails fast with ValueError if MYGENIE_API_URL env var missing
- Frontend logs console.error if REACT_APP_API_BASE_URL or REACT_APP_IMAGE_BASE_URL missing
- 25-point regression test passed covering logo, footer, layout, API, and context
