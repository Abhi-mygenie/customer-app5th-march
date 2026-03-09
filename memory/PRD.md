# Customer App - MyGenie

## Original Problem Statement
1. Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git
2. Use MongoDB connection: mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie

## Architecture
- **Frontend:** React 19 with Tailwind CSS, deployed on port 3000
- **Backend:** FastAPI with Motor (async MongoDB driver), deployed on port 8001
- **Database:** Remote MongoDB (mygenie database)

## What's Been Implemented
- [2026-03-09] Repository cloned and set up
- [2026-03-09] MongoDB connection configured to remote database
- [2026-03-09] Frontend and backend services running

## Core Features
- Customer authentication (OTP-based)
- Restaurant admin authentication (password-based)
- Menu browsing and ordering
- Loyalty points system
- Wallet management
- Custom app configuration per restaurant
- Banner management
- Feedback system

## User Personas
1. **Customer:** Browse menu, place orders, earn loyalty points
2. **Restaurant Admin:** Configure app appearance, manage banners, view feedback

## API Endpoints
- `/api/auth/login` - Unified login
- `/api/auth/send-otp` - OTP generation
- `/api/customer/profile` - Customer profile
- `/api/customer/orders` - Order history
- `/api/config/{restaurant_id}` - App configuration
- `/api/loyalty-settings/{restaurant_id}` - Loyalty settings

## Backlog
- P1: Real-time order status tracking
- P2: Push notifications
- P2: Payment integration testing
