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

## Key Features (from codebase)
- Restaurant customer app with multi-tenant support
- Authentication (OTP + Password based)
- Menu browsing with stations
- Cart & Order management
- Customer profiles with loyalty points
- **Admin settings for restaurant customization (NOW WEB-OPTIMIZED)**
- Dietary tags support
- Promotional banners

## Core Requirements
- Connect to remote MongoDB (mygenie database)
- Serve frontend on port 3000
- Serve backend API on port 8001
- Admin panel uses web layout (sidebar)
- Customer pages use mobile layout

## File Structure - Admin Layout
```
/app/frontend/src/
├── layouts/
│   ├── AdminLayout.jsx
│   └── AdminLayout.css
├── pages/admin/
│   ├── AdminSettingsPage.jsx
│   ├── AdminBrandingPage.jsx
│   ├── AdminVisibilityPage.jsx
│   ├── AdminBannersPage.jsx
│   ├── AdminContentPage.jsx
│   ├── AdminMenuPage.jsx
│   ├── AdminDietaryPage.jsx
│   └── AdminPages.css
└── context/
    └── AdminConfigContext.jsx
```

## Routes
- `/admin/settings` - Settings page
- `/admin/branding` - Branding page
- `/admin/visibility` - Visibility toggles
- `/admin/banners` - Banner management
- `/admin/content` - Content pages
- `/admin/menu` - Menu ordering
- `/admin/dietary` - Dietary tags

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
- [x] Sidebar now shows only categories of the selected station (not a mix of stations + categories)
- [x] One-line fix in MenuItems.jsx — pass empty stationsData to MenuPanel so it uses the clean "categories only" view

### Mar 2026 - Fix: Subdomain Routing Resolution
- [x] Fixed `useRestaurantId.js` to resolve subdomain (e.g., `youngmonk.mygenie.online`) → numeric ID (`709`) via restaurant-info API
- [x] Module-level cache ensures resolution happens only once per subdomain
- [x] All consumers (LandingPage, MenuItems, ReviewOrder, HamburgerMenu, RestaurantConfigContext, etc.) automatically get numeric ID
- [x] Path-based routing (`/709`, `/716`) continues to work unchanged
- [x] Config fetch (`/api/config/{id}`) now correctly uses numeric ID in subdomain mode

### Mar 2026 - Audit
- [x] Full codebase audit documented at `/app/memory/AUDIT_REPORT.md`
- [x] Found: 4 security issues, 7 dead code items, 5 hardcoded values, 3 code bugs, 5 refactoring opportunities

## In Progress
- P0: Fix station name mismatch — `/web/menu-master` returns `menu_name` (e.g. "GROK") but `/web/restaurant-product` expects `station_name` (e.g. "Grok") via `food_for` param. Fix in `useStations` hook in `/app/frontend/src/hooks/useMenuData.js`. Test with restaurant 716 (multi-menu) and 709 (single-menu).

## Backlog
- P1: Remove silent fallbacks for env variables (fail fast)
- P1: Test drag-drop with large menus
- P2: Global CSS scoping review (admin styles vs customer styles)
- P2: Add undo/redo for reordering
- P2: Code audit action items (see `/app/memory/CODE_AUDIT_REPORT.md`)

## Upcoming — Admin QR Scanner Page
- **Feature:** New admin panel page "QR Scanners" for generating & downloading QR codes
- **Route:** `/admin/qr-scanners` (add to sidebar)
- **Data Sources:**
  - `subdomain` + `restaurant_id` → from login/auth context (already known)
  - Tables & Rooms → `GET /api/v2/vendoremployee/restaurant-settings/table-config` (auth: Bearer token)
    - Returns `{ data: { tables: [...], restaurant_id, restaurant_name } }`
    - Each table: `{ id, table_no, rtype: "TB"|"RM", title, status, qr_code_urls }`
    - Test token: `nY44KJn3ffbJQ2NQryFmFSLDAU9J5qsRJyR7MMFYaWesliKz23JDerMk51Bz3C70VU3tN8uQ4yI1D99My2BaoBfLrhD3wLaAJpTaSMpuvaANH4i3McGQPsCY`
  - Menu → from `/web/menu-master` (Normal menu only for Phase 1; multi-menu later)
- **QR URL Patterns:**
  - Dine-In (generic): `https://{subdomain}/{rid}?orderType=dinein`
  - Delivery: `https://{subdomain}/{rid}?orderType=delivery`
  - Take Away: `https://{subdomain}/{rid}?orderType=take_away`
  - Dine-In per Table: `https://{subdomain}/{rid}?tableId={id}&tableName={table_no}&type=table&orderType=dinein`
  - Dine-In per Room: `https://{subdomain}/{rid}?tableId={id}&tableName={table_no}&type=room&orderType=dinein`
- **Features:** Generate QR client-side (e.g. `qrcode.react`), download as PNG, bulk download as ZIP
- **Phase 2:** Add multi-menu/station QR support, dynamic station images & timings

## Next Tasks
- Fix station name mismatch (P0 blocker)
- Remove silent fallbacks for environment variables
- Build Admin QR Scanner page (when user returns to this task)
