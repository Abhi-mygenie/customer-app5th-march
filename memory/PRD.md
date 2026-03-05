# Customer App - Product Requirements Document

## Original Problem Statement
A full-stack restaurant customer-facing web app (React + FastAPI + MongoDB). Customers browse menus and place orders. Restaurant admins control branding, theming, content, and features via Admin Settings.

## Core Architecture
- **Frontend**: React (Vite), React Router, React Context (Auth + RestaurantConfig)
- **Backend**: FastAPI, Motor (async MongoDB driver)
- **Database**: MongoDB
- **Rich Text**: Tiptap (@tiptap/react)
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable

## MyGenie Brand Defaults
| Property | Value |
|----------|-------|
| Primary Color | `#E8531E` (orange) |
| Secondary Color | `#2E7D32` (green) |
| Background | `#FFFFFF` |
| Font | Montserrat |

## Data Priority
| Field | Source |
|-------|--------|
| Name, Description | POS only |
| Phone, Logo | Admin config > MyGenie default |
| Colors, Fonts | Admin config > MyGenie defaults |
| Content, Social, Nav | Admin config only |
| Loyalty, Coupon, Menu | POS only |

## Admin Settings (6 Tabs)
1. **Landing Page** — 10 feature toggles
2. **Menu Page** — 2 toggles
3. **Order Page** — 7 toggles
4. **Branding** — Colors, fonts, radius, logo, phone, social links
5. **Banners** — Full CRUD with edit, size validation, upload
6. **Content** — 6 sub-tabs:
   - About Us: Rich text + opening hours + hero image
   - Contact: Address, email, Google Maps embed
   - Footer: Footer text + custom links
   - Feedback: Enable toggle + intro text
   - Custom Pages: CRUD with rich text + published toggle
   - Navigation: Drag-to-reorder + visibility toggles

## Customer-Facing Pages
- `/` or `/:id` — Landing page
- `/:id/menu` — Menu page
- `/:id/about` — About Us (rich content from config)
- `/:id/contact` — Contact info (phone, email, address, social, hours, map)
- `/:id/feedback` — Feedback form (name, email, star rating, message)

## Key API Endpoints
- Config: GET/PUT `/api/config/{id}`
- Banners: POST/PUT/DELETE `/api/config/banners/*`
- Pages: POST/PUT/DELETE `/api/config/pages/*`
- Feedback: POST `/api/config/feedback` (public), GET `/api/config/feedback/{id}` (admin)
- Upload: POST `/api/upload/image`
- Auth: POST `/api/auth/login`, GET `/api/auth/me`

## DB Collections
- `customer_app_config`: All config per restaurant
- `feedback`: Customer feedback submissions
- `users`, `customers`, `orders`, etc.

## Seeded Content
All restaurants (existing + new) get default:
- About Us: Story, mission, values (rich HTML)
- Opening hours table
- Feedback intro text
- Nav menu: Home, Menu, About Us, Contact, Feedback

## Admin Credentials
- 18march: `owner@18march.com` / `admin123` (ID: 478)
- Kunafa Mahal: `owner@kunafamahal.com` / `admin123` (ID: 689)

## Known Issues
- **P0**: External POS API (`preprod.mygenie.online`) returns 404
- **MEDIUM**: Config ID mismatch (admin saves to `pos_0001_restaurant_478`, frontend fetches `478`)

## Backlog
- P1: Wire nav menu order to hamburger menu
- P1: Add custom page rendering route (`/:id/page/:slug`)
- P2: Clean up unused SVG assets
- P2: Split server.py into separate files
