# MyGenie Customer App - PRD

## Project Overview
Restaurant Customer-facing and Admin app pulled from GitHub repository: https://github.com/Abhi-mygenie/customer-app5th-march.git

## Tech Stack
- **Frontend**: React 19 with TailwindCSS, React Query, React Router
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: External MongoDB at 52.66.232.149:27017 (mygenie database)
- **Authentication**: JWT with OTP and Password-based login

## Core Features
### Customer App
- Landing page with restaurant branding
- Digital menu with stations
- Order review and submission
- Profile management (points, wallet, tier)
- Feedback submission

### Admin Features
- App configuration (branding, colors, visibility toggles)
- Banner management
- Custom pages
- Feedback viewing

## Database Collections
- customers (6517 records)
- users (16 records)
- customer_app_config (25 records)
- loyalty_settings, coupons, feedback, orders, points_transactions, wallet_transactions

## API Endpoints
- `/api/auth/*` - Authentication (login, OTP, set/verify/reset password)
- `/api/customer/*` - Customer profile, orders, points, wallet
- `/api/config/*` - Restaurant app configuration
- `/api/upload/*` - Image uploads
- `/api/air-bnb/*` - Order details from MyGenie API

## Implementation Status (Jan 2026)
- ✅ Project cloned from GitHub
- ✅ MongoDB connected to external database (52.66.232.149)
- ✅ Backend running on port 8001
- ✅ Frontend running on port 3000
- ✅ All dependencies installed

## Next Actions
- Preview URL will be available at: https://d2hdw3ik-bgqh-ehjd-8888.preview.emergentagent.com/698
- Access admin settings at: /admin/settings
- Test customer flow at: /698 (restaurant ID)
