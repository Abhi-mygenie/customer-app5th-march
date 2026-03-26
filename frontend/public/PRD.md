# Customer App - Project Documentation

## Last Updated: March 24, 2026

---

## Project Overview
- **Repository**: https://github.com/Abhi-mygenie/customer-app5th-march.git
- **Default Branch**: `6marchv1`
- **Database**: MongoDB at `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie`
- **Tech Stack**: React (Frontend) + FastAPI (Backend) + MongoDB
- **Preview URL**: https://dual-token-auth.preview.emergentagent.com

---

## Base URLs Used in Project

| Variable | Value | Purpose |
|----------|-------|---------|
| `MYGENIE_API_URL` | `https://preprod.mygenie.online/api/v1` | External POS API |
| `REACT_APP_BACKEND_URL` | From env | Local FastAPI backend |
| `REACT_APP_IMAGE_BASE_URL` | `https://manage.mygenie.online` | Image URLs |

---

## API Endpoints Summary

### External POS API (preprod.mygenie.online/api/v1)
- `/auth/login` - POS authentication
- `/customer/order/place` - Place order
- `/customer/order/autopaid-place-prepaid-order` - Place prepaid order
- `/customer/order/update-customer-order` - Update order
- `/air-bnb/get-order-details/{orderId}` - Get order details
- `/web/restaurant-info` - Restaurant details (POST with restaurant_web)
- `/web/restaurant-product` - Restaurant products/menu
- `/web/menu-master` - Menu/stations list
- `/web/table-config` - Table/room config

### Local Backend API (/api)
- Auth: `/api/auth/login`, `/api/auth/send-otp`, `/api/auth/set-password`, `/api/auth/me`
- Customer: `/api/customer/orders`, `/api/customer/points`, `/api/customer/wallet`
- Config: `/api/config/{restaurant_id}`, `/api/config/banners`, `/api/config/feedback`
- Dietary: `/api/dietary-tags/available`, `/api/dietary-tags/{restaurant_id}`
- Upload: `/api/upload/image`
- Table Config: `/api/table-config`
- Order Details: `/api/air-bnb/get-order-details/{order_id}`

---

## Completed Features (Jan-Mar 2026)

### Jan 2026 - Initial Setup & Admin Layout
- Cloned repo, configured backend/frontend, installed deps
- AdminLayout with sidebar nav, split into 7 admin pages
- Menu drag-drop, search, bulk actions, toggle switches

### Mar 2026 - Multi-Layered Timing Controls (VERIFIED)
- Master open/close toggle, multi-shift (up to 4), category/item timing overrides
- POS null time = 24/7 available, full timing cascade

### Mar 2026 - Admin QR Scanner Page
- Backend: `GET /api/table-config` proxy endpoint (auth required)
- Frontend: `/admin/qr-scanners` with Order Type QR codes
- Per-table QR codes with individual download + bulk ZIP download
- **Known issue**: QR URLs missing base URL (baseUrl empty) -- needs fix

### Mar 2026 - Dynamic Multi-Menu Detection
- `isMultipleMenu()` now uses POS API flag
- Removed all hardcoded "716" references

### Mar 2026 - Station Selection Page Redesign
- Horizontal cards with image placeholders, brand colors, timing, disabled state

### Mar 2026 - Customer Login Revamp (VERIFIED)
- Unified login: phone + password fields upfront
- Flows: Password login, OTP login, Forgot Password, Set Password after OTP
- `has_password` flag in login response, restaurant branding on login page

### Mar 20, 2026 - Egg Filter Color Fix
- `.veg-toggle-btn.egg.active` color set to `var(--color-egg)`
- Egg filter button now matches egg label color (#FFA500)

### Mar 20, 2026 - Total Rounding Feature (ReviewOrder)
- `Math.ceil()` rounding when `restaurant.total_round === 'Yes'`
- Original total shown in brackets next to rounded total
- Rounded value sent to API in `order_amount`
- Login prompt margin fix (no longer hidden behind Place Order button)

### Mar 23, 2026 - OrderSuccess Table Source of Truth Fix
- Table number now sourced from `getOrderDetails` API response (priority 1)
- Fallback to scanned/sessionStorage value before API completes
- `hasFetchedOrderDetails` flag prevents flicker

### Mar 24, 2026 - Room Order "Check In" Item Filter
- Created `/app/frontend/src/utils/roomOrderUtils.js`
- "Check in" items always excluded from bill and display
- Applied in: getPreviousOrderTotal, getCombinedItemCount, taxBreakdown, PreviousOrderItems, OrderSuccess, CartBar

### Mar 24, 2026 - Table Merge/Transfer Detection on OrderSuccess (VERIFIED v3)
- Added `check-table-status` API call in `fetchOrderStatus()` on OrderSuccess page (top-level, not nested)
- Reads scanned table ID from sessionStorage directly (avoids stale closure issue)
- If table is "Available" or "Invalid" → redirects to landing page for fresh order
- Table context preserved in sessionStorage (no `clearScannedTable`) so new order picks up same table
- Uses `getStoredToken()` for POS auth token with 401 auto-retry safety net
- File modified: `/app/frontend/src/pages/OrderSuccess.jsx`

### Mar 24, 2026 - Place Order Ref Lock Fix (BUG-002)
- Moved validation (room/table + phone) BEFORE `isPlacingOrderRef` lock in `handlePlaceOrder`
- Validation failures no longer permanently lock the Place Order button
- Added ref reset in token fetch error handler
- File modified: `/app/frontend/src/pages/ReviewOrder.jsx`

### Mar 24, 2026 - Menu-Master Real API Data (Station Selection)
- Wired up real `description`, `opening_time`, `closing_time` from menu-master API
- Added `formatTimeTo12h()` helper: converts "07:00:00" → "7 AM"
- Updated `isStationAvailable()` in DiningMenu.jsx and MenuItems.jsx to parse 24h HH:mm:ss format
- Removed hardcoded `PLACEHOLDER_TIMINGS` dictionary
- Added `pointer-events: none` on disabled station cards
- Empty stations page (all standard menus filtered) redirects to menu page
- Files modified: `useMenuData.js`, `DiningMenu.jsx`, `MenuItems.jsx`, `StationCard.css`

### Mar 24, 2026 - foodFor URL Parameter Support (BUG-003)
- Added `foodFor` query param support in QR code URLs (e.g. `?foodFor=Normal`)
- `useScannedTable` hook reads `foodFor` from URL, stores in sessionStorage
- `MenuItems.jsx` uses `foodFor` as fallback when `stationId` is undefined
- Enables menu filtering per QR code for non-multi-menu restaurants
- Files modified: `useScannedTable.js`, `MenuItems.jsx`

---

## Pending Implementation / Next Actions

### P0 - Critical
1. **Fix QR code broken URLs** - baseUrl empty, subdomain/restaurantId not populated in QR codes
2. **Order Success page total_round display** - Show rounded total with original in brackets (may already be done per PRD notes)

### P1 - High Priority
1. **Remove silent env fallbacks** - Security concern with hardcoded credentials in `authToken.js`
2. **Fix weak JWT secret with fallback** in backend

### P2 - Backlog
1. ~~Wire up real menu-master API data (image, description, opening_time, closing_time)~~ ✅ Done (Mar 24) — description & timing wired, images still null in POS
2. Code audit action items:
   - Remove hardcoded credentials in `authToken.js`
   - Remove dead code (AdminSettings.jsx - 1,323 lines, SearchBar, FilterPanel, stationService.js)
   - Fix CORS wildcard setting
   - Clean up ~130+ console.log statements
3. CSS scoping review (admin vs customer conflicts)
4. Dynamic station images (blocked — POS API returns null for images)
5. Undo/redo for menu reordering
6. Implement ~131 unimplemented restaurant-info API keys (service charges, timing, payment options, etc.)

---

## Active Branches
| Branch | Description |
|--------|-------------|
| `6marchv1` (default) | Main development branch |
| `Pm_20th_march` | Latest work - Room order check-in filter, edit order changes |
| `16-march-` | March 16 work |
| `14marrch-v1` | March 14 work |
| `11march` | March 11 work |

---

## Admin Credentials
- Restaurant 709 (Young Monk): email=owner@youngmonk.com, password=admin123
- Customer test: phone=7505242126, restaurant_id=709

---

## Technical Notes
- Frontend uses `craco` (not react-scripts directly) for build
- Uses `@radix-ui` + `shadcn/ui` component library
- `react-icons` for icon sets (io5, fa, md, ri, gi, lu)
- `@dnd-kit` for drag-and-drop menu reordering
- `@tiptap` for rich text editing
- `react-phone-number-input` for phone fields
- `qrcode.react` for QR code generation
