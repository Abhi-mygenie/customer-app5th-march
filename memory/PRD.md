# Customer Ordering App - PRD

## Original Problem Statement
Build a full-stack customer ordering application for restaurants, cloned from `https://github.com/Abhi-mygenie/Customer-app-6-march.git`. Connected to remote MongoDB: `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie`. Multiple bug fixes and features were implemented across sessions.

## Architecture
- **Frontend:** React (port 3000)
- **Backend:** FastAPI (port 8001)
- **Database:** Remote MongoDB
- **State Management:** React Context + sessionStorage + localStorage

## What's Been Implemented

### Session 1 (Completed)
- Cloned repo, installed dependencies, connected to remote MongoDB
- Fixed: Incorrect item status display, admin settings sync, customer info persistence, phone input UI
- Implemented: Loyalty points redemption, price breakdown refactor, bill summary on order success
- Fixed: GST calculation for edit order flow

### Session 2 (2026-03-08)
- Added 3 new visibility toggles in Admin Settings > Visibility > Review Order:
  - **Show Loyalty Points** (ON/OFF) - controls loyalty section + rewards banner visibility
  - **Show Coupon Code** (ON/OFF) - controls coupon input visibility  
  - **Show Wallet** (ON/OFF) - placeholder toggle for future wallet feature
- Files modified: `VisibilityTab.jsx`, `AdminSettings.jsx`, `RestaurantConfigContext.jsx`, `ReviewOrder.jsx`

## Prioritized Backlog
- P0: None
- P1: Wallet functionality (to be discussed)
- P2: Tax calculation logic refactor (consolidate complex useMemo hooks)
