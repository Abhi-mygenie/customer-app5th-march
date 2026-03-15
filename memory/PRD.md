# Customer App PRD

## Original Problem Statement
1. Pull code from default branch https://github.com/Abhi-mygenie/customer-app5th-march.git
2. Use db: mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie
3. Build as-is
4. Don't run testing agent

## Architecture
- **Backend**: FastAPI (Python) - `/app/backend/server.py`
- **Frontend**: React with React Query, Tailwind CSS, shadcn/ui components
- **Database**: Remote MongoDB at 52.66.232.149

## What's Been Implemented (Jan 2026)
- [x] Cloned repository from GitHub
- [x] Configured backend .env with remote MongoDB connection
- [x] Configured frontend .env with backend URL
- [x] Installed all dependencies (pip + yarn)
- [x] Started both services via supervisor

## Key Features (from codebase)
- Restaurant customer app with multi-tenant support
- Authentication (OTP + Password based)
- Menu browsing with stations
- Cart & Order management
- Customer profiles with loyalty points
- Admin settings for restaurant customization
- Dietary tags support
- Promotional banners

## Core Requirements
- Connect to remote MongoDB (mygenie database)
- Serve frontend on port 3000
- Serve backend API on port 8001

## Backlog
- P0: None (basic setup complete)
- P1: Test full user flows
- P2: Performance optimization

## Next Tasks
- Test the application with real restaurant data
- Verify all API endpoints work with remote DB
