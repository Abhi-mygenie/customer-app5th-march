# Customer App PRD

## Original Problem Statement
Restaurant customer app with multi-tenant support. Admin (Web) vs Customer (Mobile) layouts. Connected to remote POS API (MyGenie) and MongoDB.

## Architecture
- **Backend**: FastAPI (Python) - `/app/backend/server.py`
- **Frontend**: React with React Query, Tailwind CSS, shadcn/ui
- **Database**: Remote MongoDB at 52.66.232.149

## What's Been Implemented

### Jan 2026 - Initial Setup & Admin Layout
- [x] Cloned repo, configured backend/frontend, installed deps
- [x] AdminLayout with sidebar nav, split into 7 admin pages
- [x] Menu drag-drop, search, bulk actions, toggle switches

### Mar 2026 - Multi-Layered Timing Controls (VERIFIED)
- [x] Master open/close toggle, multi-shift (up to 4), category/item timing overrides
- [x] POS null time = 24/7 available, full timing cascade

### Mar 2026 - Admin QR Scanner Page
- [x] Backend: `GET /api/table-config` proxy endpoint (auth required)
- [x] Frontend: `/admin/qr-scanners` with Order Type QR codes (dine-in, delivery, take away)
- [x] Per-table QR codes with individual download + bulk ZIP download
- [x] QR codes generated client-side using qrcode.react
- [x] **Known issue**: QR URLs missing base URL (baseUrl empty) — needs fix

### Mar 2026 - Dynamic Multi-Menu Detection
- [x] `isMultipleMenu()` now uses POS API `multiple_menu: "Yes"/"No"` flag
- [x] Removed all hardcoded "716" references — renamed to `isMultiMenu`
- [x] Kunafa Mahal (689) no longer shows false "Aggregator" station page

### Mar 2026 - Station Selection Page Redesign
- [x] Horizontal cards: image placeholder (brand color) + name + timing + arrow
- [x] Brand colors from restaurant config applied
- [x] Placeholder timings for demo (Breakfast 7-11 AM, Bar 5-11 PM, etc.)
- [x] Disabled state for stations outside operating hours
- [x] "Select a Menu" title section

### Mar 2026 - Customer Login Revamp (VERIFIED)
- [x] Unified login: phone + password fields upfront
- [x] Flow A: Password login (admin + customer)
- [x] Flow B: OTP login (customer only) with "Use OTP instead" link
- [x] Flow C: Forgot Password (OTP verify → reset password)
- [x] Flow D: Set Password prompt after every OTP login if no password set
- [x] `has_password` flag in login response
- [x] Restaurant logo + name on login page (from config)
- [x] Backend: customer password login support added to `/api/auth/login`
- [x] AuthContext: added `setAuth()` for direct auth state setting

## Pending / In Progress
- **P0**: Fix QR code broken URLs (baseUrl empty — subdomain/restaurantId not populated)
- **P1**: Remove silent env fallbacks

## Backlog
- Wire up real menu-master API data (image, description, opening_time, closing_time) when available
- Code audit action items (`/app/memory/AUDIT_REPORT.md`)
- CSS scoping review (admin vs customer)
- Dynamic station images
- Undo/redo for menu reordering

## DB Schema
### customers collection (login-related)
- `id`, `user_id` (scoped: `pos_{posId}_restaurant_{rid}`)
- `phone`, `name`, `password_hash` (optional)
- `tier`, `total_points`, `wallet_balance`, `total_visits`, `total_spent`

### customer_app_config collection (timing fields)
- `restaurantOpen: bool`, `restaurantShifts: List[Dict]`
- `categoryTimings: Dict`, `itemTimings: Dict`

## Admin Credentials
- Restaurant 709 (Young Monk): email=owner@youngmonk.com, password=admin123
- Customer test: phone=7505242126, restaurant_id=709

## Key API Endpoints
- `POST /api/auth/login` — unified login (password + OTP for customers, password for admin)
- `POST /api/auth/send-otp` — send OTP to customer phone
- `POST /api/auth/set-password` — set password for customer
- `POST /api/auth/reset-password` — reset password via OTP
- `GET /api/table-config` — proxy for POS table config (auth required)
- `GET /api/config/:restaurantId` — get restaurant admin config
- `PUT /api/config/` — save restaurant admin config
