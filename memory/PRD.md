# MyGenie Customer App — PRD & Deployment Record

## Project Overview
MyGenie Customer App — a React + FastAPI + MongoDB food ordering PWA.
GitHub repo: https://github.com/Abhi-mygenie/customer-app5th-march (branch: main)

## Architecture
- **Frontend**: React (CRA + CRACO), TypeScript/JS, Tailwind CSS, shadcn/ui, React Query
- **Backend**: FastAPI (Python), Motor (async MongoDB), JWT auth, rate limiting (slowapi)
- **Database**: MongoDB (local: `mygenie` DB)
- **External API**: MyGenie POS API at `https://preprod.mygenie.online/api/v1`

## Deployment Record

### 2026-11-27 — Full sync to GitHub main (136 commits)
- Pulled latest from `github.com/Abhi-mygenie/customer-app5th-march` (main)
- Latest commit: `0463499` — BUG-2026-11-27-002 + BUG-2026-11-27-003
- Both services running: backend (`/api/healthz` → `{ok:true,mongo:up}`), frontend (webpack compiled)
- All env vars configured; Google Maps keys set via secrets panel
- Memory dir fully synced: 650 files

### 2026-11-26 — Initial deployment
- Initial clone and env setup

## Environment Variables

### Backend (`/app/backend/.env`)
| Key | Value |
|-----|-------|
| MONGO_URL | mongodb://localhost:27017 (local) |
| DB_NAME | mygenie |
| CORS_ORIGINS | https://mygenie-cust-app--1pyw3491.preview.emergentagent.com |
| MYGENIE_API_URL | https://preprod.mygenie.online/api/v1 |
| GOOGLE_MAPS_API_KEY | set via secrets panel |
| JWT_SECRET | set via secrets panel |
| MYGENIE_POS_LOGIN_PHONE | +919579504871 |
| MYGENIE_POS_LOGIN_PASSWORD | Qplazm@10 |

### Frontend (`/app/frontend/.env`)
| Key | Value |
|-----|-------|
| REACT_APP_BACKEND_URL | https://mygenie-cust-app--1pyw3491.preview.emergentagent.com |
| REACT_APP_IMAGE_BASE_URL | https://preprod.mygenie.online |
| REACT_APP_API_BASE_URL | https://preprod.mygenie.online/api/v1 |
| REACT_APP_LOGIN_PHONE | +919579504871 |
| REACT_APP_LOGIN_PASSWORD | Qplazm@10 |
| REACT_APP_CRM_URL | https://crm.mygenie.online/api |
| REACT_APP_GOOGLE_MAPS_API_KEY | set via secrets panel |
| REACT_APP_CRM_API_VERSION | v2 |
| WDS_SOCKET_PORT | 443 |
| ENABLE_HEALTH_CHECK | false |

## Recent Bugs Fixed (from GitHub history)
- **BUG-2026-11-27-002** (P2/LOW): Item banner repeat tap — `MenuItems.jsx` deep-link guard
- **BUG-2026-11-27-003** (P1/MEDIUM): Transferred orders missing on OrderSuccess — `orderService.ts` + `OrderSuccess.jsx`
- **BUG-2026-11-27-001**: Category deep-link from landing page (station-reset effect clobbering)
- **CR-2026-11-26-001 V3**: Various UI/UX improvements

## Core Features
- QR-code based table ordering
- Menu browsing by category
- Cart management with item customization
- Order placement and tracking
- Order success page with transferred orders
- Admin panel (banner/page management)
- Delivery address with Google Maps
- CRM integration

## Backlog / Next Tasks
- P0: Verify Google Maps flow with live API key
- P0: Test customer login flow end-to-end
- P1: Deploy to production (stable public URL)
- P1: Verify CRM integration endpoints
- P2: Push latest fixes back to GitHub after any new changes
