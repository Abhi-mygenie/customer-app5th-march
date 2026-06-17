# MyGenie Customer App - PRD

## Problem Statement
Pull and set up the MyGenie Customer App from GitHub repo `Abhi-mygenie/customer-app5th-march` (branch: `16-june`), configure environment, install dependencies, and run.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS + TypeScript + Radix UI + TanStack React Query
- **Backend**: FastAPI (Python) with MongoDB (remote: 52.66.232.149)
- **External APIs**: MyGenie preprod API (`preprod.mygenie.online`), Google Maps, CRM API

## What's Been Implemented (2026-06-17)
- Cloned repo from GitHub (branch: 16-june)
- Configured backend `.env` (MONGO_URL, JWT_SECRET, MYGENIE_API_URL)
- Configured frontend `.env` (REACT_APP_API_BASE_URL, Google Maps key, CRM URL, etc.)
- Installed all backend (pip) and frontend (yarn) dependencies
- Both services running successfully via supervisor

## Status
- ✅ Backend: Running on port 8001, returns 200
- ✅ Frontend: Compiled successfully, serving on port 3000
- ✅ App loads with login/landing page (phone number + name input + Browse Menu)

## Next Action Items
- User to test app flows (login, menu browsing, ordering)
- Any feature additions or bug fixes as needed
