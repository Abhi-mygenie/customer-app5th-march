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

## Backlog
- P0: None (features implemented)
- P1: Test drag-drop with large menus
- P2: Add undo/redo for reordering

## Next Tasks
- Test the drag-drop functionality
- Verify save works after reordering
- Test with stations (multiple menu)
