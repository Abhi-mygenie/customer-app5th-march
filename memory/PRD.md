# Customer App PRD

## Original Problem Statement
Pull and build the app from https://github.com/Abhi-mygenie/Customer-app-6-march.git

## Architecture
- **Frontend**: React 19 with TailwindCSS, React Query, React Router
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **External API**: preprod.mygenie.online (MyGenie API)
- **Auth**: JWT-based with OTP support

## User Personas
1. **Restaurant Customers**: Browse menu, place orders, view profile/points/wallet
2. **Restaurant Admins**: Configure app settings, manage banners, view feedback

## Core Features (Implemented)
- Landing page with restaurant branding
- Menu browsing by stations/categories
- Cart and order placement
- Customer login via OTP
- Profile with points & wallet
- Order Success with item status tracking
- Edit Order functionality
- Admin visibility settings

## What's Been Implemented (Jan 2026)
- [x] Full app clone from GitHub
- [x] Backend dependencies installed
- [x] Frontend dependencies installed
- [x] Demo data seeded (55 customers, 314 orders)
- [x] DB import (1,967 customers, 6 users)
- [x] Order Success page - items from API with status
- [x] Status mapping (f_order_status: 1=Preparing, 2=Ready, 7=Pending, etc)
- [x] showFoodStatus visibility toggle
- [x] Edit Order button layout (landing page style)
- [x] PreviousOrderItems - single row layout with status
- [x] Removed: subtitle, order ID badge, subtotal row
- [x] Price Breakdown - combined Subtotal
- [x] Removed: dotted divider (kept orange line)
- [x] Coupon & Loyalty placeholders in UI

## Restaurant Users
| Email | Restaurant | ID |
|-------|------------|-----|
| owner@18march.com | 18march | 478 |
| owner@kunafamahal.com | Kunafa Mahal | 689 |
| owner@hungry.com | Hungry Keya?? | 634 |
| demo@restaurant.com | Demo Restaurant | - |

## Environment
- **MyGenie API**: preprod.mygenie.online (Test/Staging)
- **DB**: test_database (MongoDB)

## Backlog / Future Enhancements
- P0: Coupon code validation API integration
- P0: Loyalty points redemption API integration
- P1: Push notifications for order status
- P2: Payment gateway integration
- P3: Real-time WebSocket for status updates
