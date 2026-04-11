# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git (branch: 11th-apri-refactor), set up environment, and run as-is.

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + TipTap editor
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: External MongoDB at 52.66.232.149 (mygenie database)
- **External APIs**: MyGenie POS API (preprod.mygenie.online)

## What's Been Implemented (2026-04-11)
- Cloned repo from GitHub (branch: 11th-apri-refactor)
- Resolved tsconfig.json / jsconfig.json conflict (removed jsconfig.json)
- Configured backend .env (MONGO_URL, DB_NAME, JWT_SECRET, MYGENIE_API_URL, CORS_ORIGINS)
- Configured frontend .env (REACT_APP_BACKEND_URL, image base URL, POS API URL, login credentials)
- Installed all backend Python dependencies
- Installed all frontend Node.js dependencies via yarn
- Both services running successfully via supervisor
- App loads and displays customer-facing restaurant page ("Welcome to 18march!")

## Core Features (from repo)
- Customer authentication (phone/OTP + password)
- Restaurant landing page with banners
- Browse Menu functionality
- Call Waiter / Pay Bill features
- Admin configuration panel
- Dietary tags management
- File uploads
- QR code / table configuration
- Social media integration

## Memory Folder Documents
All documents from the repo's memory/ folder preserved, including:
- PRD.md, ARCHITECTURE.md, ROADMAP.md, CHANGELOG.md
- 2026-04-10/ subfolder with API_MAPPING, CODE_AUDIT, BUG_TRACKER, etc.

## Next Action Items
- No changes requested - app running as-is per user instructions
- Pending: Production-ready JWT_SECRET, CORS_ORIGINS lockdown
