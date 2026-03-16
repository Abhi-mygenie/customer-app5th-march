# Customer App PRD

## Original Problem Statement
1. Pull code from default branch https://github.com/Abhi-mygenie/customer-app5th-march.git
2. Use db: mongodb://mygenie_admin:***@52.66.232.149:27017/mygenie
3. Build as-is
4. Don't run testing agent
5. Split Admin (Web) vs Customer (Mobile) layouts

## Architecture
- **Backend**: FastAPI (Python) - `/app/backend/server.py`
- **Frontend**: React with React Query, Tailwind CSS, shadcn/ui components
- **Database**: Remote MongoDB at 52.66.232.149

## What's Been Implemented

### Jan 2026 - Initial Setup
- [x] Cloned repository from GitHub
- [x] Configured backend .env with remote MongoDB connection
- [x] Configured frontend .env with backend URL
- [x] Installed all dependencies (pip + yarn)
- [x] Started both services via supervisor

### Jan 2026 - Admin Web Layout
- [x] Created AdminLayout.jsx with sidebar navigation
- [x] Created AdminConfigContext for shared state
- [x] Split AdminSettings into 7 separate pages:
  - AdminSettingsPage (logo, welcome, hours)
  - AdminBrandingPage (colors, fonts, images)
  - AdminVisibilityPage (toggles grid)
  - AdminBannersPage (table + form)
  - AdminContentPage (about, footer, extras)
  - AdminMenuPage (menu ordering)
  - AdminDietaryPage (dietary tags)
- [x] Updated App.js with nested admin routes
- [x] Customer pages remain unchanged (mobile-first)

### Jan 2026 - Menu Order UX Improvements
- [x] Added drag-and-drop using @dnd-kit library
- [x] Search bar for filtering categories
- [x] Modern toggle switches for visibility
- [x] Bulk actions (Show All / Hide All)
- [x] Item count badges and preview text
- [x] Loading spinner and empty states
- [x] Responsive design improvements

### Mar 2026 - Bug Fix: Multi-Menu Sidebar
- [x] Fixed customer-facing sidebar for multi-menu restaurants (716/739)

### Mar 2026 - Fix: Subdomain Routing Resolution
- [x] Fixed `useRestaurantId.js` to resolve subdomain → numeric ID via restaurant-info API

### Mar 2026 - Audit
- [x] Full codebase audit documented at `/app/memory/AUDIT_REPORT.md`

### Mar 2026 - Multi-Layered Timing Controls (VERIFIED)
- [x] **Master Open/Close Toggle**: Restaurant-wide ordering toggle in Admin Settings (default: ON)
- [x] **Multi-Shift Support**: Up to 4 operating shifts with start/end times (replaces single open/close)
- [x] **Category Timing Overrides**: Admin can set specific time windows for menu categories
- [x] **Item Timing Overrides**: Admin can set specific time windows for individual items
- [x] **POS Null Time Handling**: Items with null POS times treated as 24/7 available
- [x] **Timing Cascade**: live_web → master toggle → shifts → category timing → item timing → POS times
- [x] **Testing**: 100% pass rate - backend (9/9) and frontend (all features) verified via testing agent

## Key Features (from codebase)
- Restaurant customer app with multi-tenant support
- Authentication (OTP + Password based)
- Menu browsing with stations
- Cart & Order management
- Customer profiles with loyalty points
- Admin settings for restaurant customization (web-optimized)
- Dietary tags support
- Promotional banners

## Core Requirements
- Connect to remote MongoDB (mygenie database)
- Serve frontend on port 3000
- Serve backend API on port 8001
- Admin panel uses web layout (sidebar)
- Customer pages use mobile layout

## In Progress
- P0: Fix station name mismatch — `/web/menu-master` returns `menu_name` (e.g. "GROK") but `/web/restaurant-product` expects `station_name` (e.g. "Grok") via `food_for` param. Fix in `useStations` hook in `/app/frontend/src/hooks/useMenuData.js`. Test with restaurant 716 (multi-menu) and 709 (single-menu).

## Backlog
- P1: Admin QR Scanner Page (plan below)
- P1: Remove silent fallbacks for env variables (fail fast)
- P1: Test drag-drop with large menus
- P2: Global CSS scoping review (admin styles vs customer styles)
- P2: Add undo/redo for reordering
- P2: Code audit action items (see `/app/memory/AUDIT_REPORT.md`)
- P2: Dynamic station images & timings

## Upcoming — Admin QR Scanner Page
- **Feature:** New admin panel page "QR Scanners" for generating & downloading QR codes
- **Route:** `/admin/qr-scanners` (add to sidebar)
- **Data Sources:**
  - `subdomain` + `restaurant_id` → from login/auth context
  - Tables & Rooms → `GET /api/v2/vendoremployee/restaurant-settings/table-config` (auth: Bearer token)
    - Returns `{ data: { tables: [...], restaurant_id, restaurant_name } }`
    - Each table: `{ id, table_no, rtype: "TB"|"RM", title, status, qr_code_urls }`
    - Test token: `nY44KJn3ffbJQ2NQryFmFSLDAU9J5qsRJyR7MMFYaWesliKz23JDerMk51Bz3C70VU3tN8uQ4yI1D99My2BaoBfLrhD3wLaAJpTaSMpuvaANH4i3McGQPsCY`
  - Menu → from `/web/menu-master`
- **QR URL Patterns:**
  - Dine-In (generic): `https://{subdomain}/{rid}?orderType=dinein`
  - Delivery: `https://{subdomain}/{rid}?orderType=delivery`
  - Take Away: `https://{subdomain}/{rid}?orderType=take_away`
  - Dine-In per Table: `https://{subdomain}/{rid}?tableId={id}&tableName={table_no}&type=table&orderType=dinein`
  - Dine-In per Room: `https://{subdomain}/{rid}?tableId={id}&tableName={table_no}&type=room&orderType=dinein`
- **Features:** Generate QR client-side (e.g. `qrcode.react`), download as PNG, bulk download as ZIP
- **Phase 2:** Add multi-menu/station QR support

## Routes
- `/admin/settings` - Settings page
- `/admin/branding` - Branding page
- `/admin/visibility` - Visibility toggles
- `/admin/banners` - Banner management
- `/admin/content` - Content pages
- `/admin/menu` - Menu ordering
- `/admin/dietary` - Dietary tags

## DB Schema - Timing Fields
The `customer_app_config` collection:
- `restaurantOpen: bool` (default: true)
- `restaurantShifts: List[Dict]` (default: [{start: "06:00", end: "03:00"}])
- `categoryTimings: Dict` (default: {})
- `itemTimings: Dict` (default: {})

## Admin Credentials
- Restaurant 709: email=owner@youngmonk.com, password=admin123
