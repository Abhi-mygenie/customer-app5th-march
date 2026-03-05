# Restaurant App PRD

## Original Problem Statement
Full-stack restaurant customer application with React frontend, FastAPI backend, and MongoDB. Features include menu browsing, cart, ordering, admin panel, and configurable landing page.

## Tech Stack
- **Frontend**: React, Tailwind CSS, component-based architecture
- **Backend**: Python, FastAPI
- **Database**: MongoDB
- **Layout**: Mobile-first, max-width 600px

## Core Requirements
- Menu browsing with categories, stations, search, filters
- Cart & ordering flow
- Admin panel with settings
- Configurable customer capture form on landing page
- Configurable "Extra Info" section in footer
- Price breakdown on review order page

## What's Been Implemented
- [x] Full app setup from GitHub repo
- [x] Content mismatch fix (admin ↔ frontend)
- [x] Customer capture form (configurable)
- [x] Extra Info footer section (configurable)
- [x] Price breakdown redesign on review order
- [x] Footer social icons overlap fix
- [x] UI consistency overhaul — max-width 600px across all pages
- [x] Fixed/sticky elements alignment (Place Order, Cart Bar, Menu FAB)
- [x] Category names truncation fix & CSS refactor (CategoryBox.css)
- [x] **Category section spacing reduction** (2025-03-05) — Reduced excessive vertical gaps around category headers across all breakpoints

## Credentials
- **Admin**: owner@18march.com / admin123
- **Customer**: 7505242126 / OTP: 1111
- **Restaurant ID**: 478

## Key Architecture Notes
- CategoryBox styling centralized in `components/CategoryBox/CategoryBox.css`
- All pages use max-width: 600px mobile-first layout
- CSS managed per-component with responsive breakpoints

- [x] **Header added to Order Success page** (2025-03-05) — Added Header component with hamburger menu, logo, brand text
- [x] **Order Status: "Ready" → "Served"** (2025-03-05) — Renamed last stage
- [x] **Browse Menu button branding fix** (2025-03-05) — Removed broken inline style, uses CSS `--color-primary`
- [x] **`showEstimatedTimes` config toggle** (2025-03-05) — Added to admin settings, default OFF. Awaiting API `prep_time`/`serve_time` fields

## Backlog
- P2: Auto-create customer on guest order
