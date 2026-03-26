# Customer App - Project Documentation

## Last Updated: March 26, 2026 (Session 5 - POS Token Architecture Fix)

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](./ROADMAP.md) | Upcoming tasks, priorities, detailed steps |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flow |
| [CHANGELOG_TRANSFORM_V1.md](./CHANGELOG_TRANSFORM_V1.md) | Transform & Refactor changes |
| [BUG_TRACKER.md](./BUG_TRACKER.md) | Bug history and fixes |
| [API_MAPPING.md](./API_MAPPING.md) | API field mappings + Token Architecture |
| [CODE_AUDIT.md](./CODE_AUDIT.md) | Code quality + Critical Hardcodings (Section 11) |
| [TEST_CASES.md](./TEST_CASES.md) | **Test cases & Pre-release checklist** |

---

## Current Status

| Area | Status |
|------|--------|
| Order Flow | ✅ Working |
| Transform Layer | ✅ Complete |
| Multi-menu Support | ✅ Restored |
| Restaurant 716 Fix | ✅ Fixed (BUG-030) |
| POS Token Architecture | ✅ Fixed (BUG-033) |
| Code Cleanup | ✅ -2,862 lines (Session 4) |
| Documentation | ✅ Updated |
| P0 Bugs | ✅ None |
| P1 Bugs | 🟡 1 (QR URL - Parked) |
| Quality Score | 7.5/10 |

---

## 🔴 Critical Hardcodings

| Restaurant | File | Behavior |
|------------|------|----------|
| **716** (Hyatt Centric) | `ReviewOrder.jsx` | Skip table status check - allows multiple orders per table |

> See `CODE_AUDIT.md` Section 11 for full documentation.

---

## Project Overview
- **Repository**: https://github.com/Abhi-mygenie/customer-app5th-march.git
- **Default Branch**: `6marchv1`
- **Database**: MongoDB at `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie`
- **Tech Stack**: React (Frontend) + FastAPI (Backend) + MongoDB + TypeScript (API Layer)
- **Preview URL**: https://customer-5th-march.preview.emergentagent.com

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

### Mar 25, 2026 - OrderSuccess Grand Total Fix (BUG-007)
- Grand total now uses `order_amount` from API (rounded value sent at placement)
- Locally calculated total (without rounding) shown in brackets when different
- Matches ReviewOrder display style: e.g., ₹106.00 (₹105.30)
- File modified: `OrderSuccess.jsx`

### Mar 25, 2026 - Update Order Financial Fields Fix (BUG-006)
- `updateCustomerOrder` now sends real `order_amount`, `tax_amount`, `discount_amount`, `order_sub_total_amount`
- Added loyalty points fields (`points_redeemed`, `points_discount`, `discount_type`)
- Fixed both primary and 401-retry call paths in ReviewOrder.jsx
- Files modified: `orderService.js`, `ReviewOrder.jsx`

### Mar 25, 2026 - Earn Rewards Prompt Visibility Fix (BUG-005)
- Increased `padding-bottom` on `.review-order-content` from 80px to 110px
- "Earn rewards on this order!" prompt no longer hidden behind fixed Place Order button
- File modified: `ReviewOrder.css`

### Mar 25, 2026 - Edit Order Status-Based Logic (BUG-008)
- Edit Order button on OrderSuccess only shows when `fOrderStatus !== 7`
- When `fOrderStatus === 7` (yet to be confirmed), shows "Yet to be confirmed" message instead
- Added `.order-success-pending-msg` styling with amber/warning theme
- Files modified: `OrderSuccess.jsx`, `OrderSuccess.css`

### Mar 25, 2026 - Multiple Orders Prevention (BUG-009)
- Added table status check before placing new order in ReviewOrder.jsx
- If table already occupied → blocks order, shows error, redirects to landing
- "Clear Cart" in edit mode renamed to "Clear New Items" — only clears cart, stays in edit mode
- Blocked Home navigation and logout when in edit mode (HamburgerMenu)
- Files modified: `ReviewOrder.jsx`, `MenuItems.jsx`, `HamburgerMenu.jsx`

### Mar 25, 2026 - LandingPage Edit Order Redirect for Unconfirmed Orders (BUG-010)
- When clicking "Edit Order" on LandingPage, now checks `fOrderStatus`
- If `fOrderStatus === 7` → redirects to OrderSuccess (not edit mode)
- If `fOrderStatus === 3 or 6` (cancelled/paid) → shows toast, navigates to menu
- File modified: `LandingPage.jsx`

### Mar 25, 2026 - Edit Mode Order Status Verification (BUG-011)
- Before calling `updateCustomerOrder()`, verifies order is still active
- If order is paid/cancelled → clears edit mode, falls through to place new order
- New order flow has existing table status check
- Files modified: `ReviewOrder.jsx`, `LandingPage.jsx`

### Mar 25, 2026 - iOS Safari Auto-Zoom Fix
- Set textarea font-size to 16px in CookingInstructionsModal and ReviewOrder
- Prevents iOS Safari from auto-zooming when input fields are focused
- Files modified: `CookingInstructionsModal.css`, `ReviewOrder.css`

### Mar 25, 2026 - Variations/Add-ons Display & Price Fix (BUG-012)
- `getPreviousOrderTotal()` now calculates: basePrice + variationsTotal + addonsTotal
- `PreviousOrderItems.jsx` now displays variations and add-ons under each item
- Price display uses full calculated price (not just unitPrice)
- Tax calculation for previous items uses full price
- Files modified: `CartContext.js`, `PreviousOrderItems.jsx`, `PreviousOrderItems.css`, `ReviewOrder.jsx`

### Mar 25, 2026 - GST Status Flag Implementation (BUG-013)
- Added `gst_status` check from restaurant settings to enable/disable GST globally
- If `gst_status === false`, skip ALL GST calculation
- Files modified: `ReviewOrder.jsx`

### Mar 25, 2026 - API Fields Mapping for Totals (BUG-014)
- Mapped `order_sub_total_amount`, `order_sub_total_without_tax` from API response
- Added these fields to Place Order and Update Order payloads
- Files modified: `orderService.js`, `OrderSuccess.jsx`

### Mar 25, 2026 - OrderSuccess Variation Label Fix (BUG-015)
- Fixed variation labels not displaying on OrderSuccess page
- Added `getVariationLabels()` and `getAddonLabels()` helper functions
- API returns `values` as array `[{label, optionPrice}]`, code was expecting object
- Files modified: `OrderSuccess.jsx`

### Mar 25, 2026 - PreviousOrderItems Variation Label Fix (BUG-016)
- Fixed variation labels not displaying in ReviewOrder's PreviousOrderItems
- Updated `getVariationLabels()` to correctly handle `values[]` array from API
- Same root cause as BUG-015 - API structure mismatch
- Files modified: `PreviousOrderItems.jsx`

### Mar 25, 2026 - Update Order Variation Name Fix (BUG-017)
- Fixed variation group names sent as "CHOICE OF" instead of actual names in Update Order
- `updateCustomerOrder` now uses `cartItem.item.variations` to find correct group names
- Same logic as `transformVariations()` used in Place Order
- Files modified: `orderService.js`

### Mar 25, 2026 - QR Scan Auto-Redirect to OrderSuccess (BUG-018)
- When scanning QR for table with active order, now auto-redirects to OrderSuccess
- Previously showed "EDIT ORDER" button requiring manual click
- Fetches order details on page load to check `fOrderStatus`
- Only redirects if order is active (not cancelled/paid)
- Files modified: `LandingPage.jsx`

### Mar 25, 2026 - View Bill Button in Edit Mode (BUG-019)
- Added "View Bill" button in edit mode banner on MenuItems page
- Allows users to navigate to OrderSuccess without adding new items
- Button passes `editingOrderId` in navigation state
- Files modified: `MenuItems.jsx`, `MenuItems.css`

### Mar 25, 2026 - Item Price Decimal Display Fix (BUG-020)
- Changed all item-level `.toFixed(0)` to `.toFixed(2)`
- Item prices now show decimals (₹199.50 instead of ₹200)
- Only Grand Total uses ceiling rounding (`Math.ceil`)
- Files modified: `OrderSuccess.jsx`, `PreviousOrderItems.jsx`, `CartBar.jsx`, `CustomizeItemModal.jsx`

### Mar 25, 2026 - View Bill Navigation Fix (BUG-021)
- Fixed "View Bill" button not passing orderId to OrderSuccess
- Now passes `{ orderData: { orderId: editingOrderId } }` in navigation state
- Files modified: `MenuItems.jsx`

### Mar 25, 2026 - Table Status Check Before Edit/Update (BUG-022)
- Added `checkTableStatus` as FIRST check when clicking EDIT ORDER from OrderSuccess
- Added `checkTableStatus` before UPDATE ORDER in ReviewOrder
- If table is FREE → `clearEditMode()`, `clearCart()`, redirect to landing page
- Prevents stale `previousOrderItems` from causing wrong totals
- Files modified: `OrderSuccess.jsx`, `ReviewOrder.jsx`

### Mar 25, 2026 - Filter "Aggregator" from Station Selection
- Added "Aggregator" to `STANDARD_MENUS` filter in `useMenuData.js`
- Aggregator menus no longer appear in station selection page
- Files modified: `useMenuData.js`

### Mar 25, 2026 - Silent Table Reassignment Redirect
- Removed toast message "Your table has been reassigned"
- Now silently redirects to landing page when table is freed on POS
- Files modified: `OrderSuccess.jsx`

### Mar 25, 2026 - Documentation API Endpoints
- Added `/api/docs/bug-tracker`, `/api/docs/api-mapping`, `/api/docs/code-audit`, `/api/docs/prd`
- Serves markdown files from `/app/memory/` as plain text for browser viewing
- Files modified: `server.py`

---

## Pending Implementation / Next Actions

### P0 - Critical
1. **Fix QR code broken URLs** - baseUrl empty, subdomain/restaurantId not populated in QR codes

### P1 - High Priority
1. **Remove silent env fallbacks** - Security concern with hardcoded credentials in `authToken.js`
2. **Fix weak JWT secret with fallback** in backend
3. **Duplicate order prevention (race condition)** - Two browsers scanning same QR simultaneously can still place separate orders. Consider backend deduplication (1 order per table per 60 seconds)

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

### Recently Fixed (Mar 25, 2026)
| Bug ID | Summary | Status |
|--------|---------|--------|
| BUG-008 | Edit Order visibility based on fOrderStatus | ✅ Fixed |
| BUG-009 | Multiple orders on same table prevention | ✅ Fixed |
| BUG-010 | Redirect unconfirmed orders to OrderSuccess | ✅ Fixed |
| BUG-011 | Edit mode on paid/cancelled orders | ✅ Fixed |
| BUG-012 | Variations/Add-ons display & price fix | ✅ Fixed |
| BUG-013 | GST Status flag implementation | ✅ Fixed |
| BUG-014 | API fields mapping for totals | ✅ Fixed |
| BUG-015 | OrderSuccess variation label display | ✅ Fixed |
| BUG-016 | PreviousOrderItems variation label display | ✅ Fixed |
| BUG-017 | Update Order variation name mapping | ✅ Fixed |
| BUG-018 | QR scan auto-redirect to OrderSuccess | ✅ Fixed |
| BUG-019 | View Bill button in edit mode banner | ✅ Fixed |
| BUG-020 | Item price decimal display | ✅ Fixed |
| BUG-021 | View Bill navigation (orderId missing) | ✅ Fixed |
| BUG-022 | Table status check before edit/update | ✅ Fixed |
| - | Filter "Aggregator" from station selection | ✅ Fixed |
| - | Silent table reassignment redirect | ✅ Fixed |
| - | iOS Safari auto-zoom fix | ✅ Fixed |
| - | Documentation API endpoints | ✅ Added |
| - | iOS Safari auto-zoom fix | ✅ Fixed |
| - | Documentation API endpoints | ✅ Added |

### Mar 25, 2026 - TypeScript Transformer Integration (Phase 2) ✅
**Goal**: Centralize API data transformation to prevent variable mapping bugs

**Completed:**
1. **Updated `orderService.ts`** - Now returns transformed data with standardized properties:
   - `name` instead of nested `item.name`
   - `fullPrice` (pre-calculated: base + variations + addons)
   - `variations[]` with `{ name, values: [{ label, price }] }` structure
   - `addons[]` with `{ id, name, price, quantity }` structure
   - `status` instead of `foodStatus`
   - Added `_rawVariations` and `_rawAddons` for backward compatibility

2. **Created `/api/transformers/helpers.js`** - JavaScript exports for JSX component compatibility:
   - `getVariationLabels(variations)` - Formats variation labels for display
   - `getAddonLabels(addons)` - Formats addon labels for display
   - `calculateVariationsTotal(variations)` - Sum of variation prices
   - `calculateAddonsTotal(addons)` - Sum of addon prices

3. **Updated `PreviousOrderItems.jsx`**:
   - Removed duplicate `calculateFullItemPrice()`, `getVariationLabels()`, `getAddonLabels()`
   - Now imports from centralized transformers
   - Uses `item.fullPrice` instead of manual calculation
   - Uses `item.name` directly (not `item.item?.name`)

4. **Updated `OrderSuccess.jsx`**:
   - Removed duplicate helper functions
   - Imports `getVariationLabels`, `getAddonLabels` from transformers
   - Uses `item.addons` (not `item.add_ons`)
   - Uses transformer properties for item mapping

5. **Updated `CartContext.js`**:
   - `getPreviousOrderTotal()` now uses `fullPrice` from transformer
   - Fallback to manual calculation for backward compatibility
   - Simplified variation/addon total calculation

**Benefits:**
- Eliminated ~100 lines of duplicate code
- Single source of truth for API data transformation
- Consistent property names across components
- Prevents future variable mapping bugs

**Files Modified:**
- `/app/frontend/src/api/services/orderService.ts`
- `/app/frontend/src/api/transformers/helpers.js` (new)
- `/app/frontend/src/components/PreviousOrderItems/PreviousOrderItems.jsx`
- `/app/frontend/src/pages/OrderSuccess.jsx`
- `/app/frontend/src/context/CartContext.js`

### Mar 25, 2026 - Transform & Refactor v1 Bug Fixes ✅
**Goal**: Fix all bugs introduced by TypeScript migration

**Bugs Fixed:**
| Bug ID | Issue | Root Cause |
|--------|-------|------------|
| BUG-023 | Item price wrong (₹136 vs ₹88) | Module resolution (.js vs .ts) |
| BUG-024 | `table_id: 'undefined'` | Property name mismatch |
| BUG-025 | `air_bnb_id` missing | Incomplete payload |
| BUG-026 | All items "Yet to be confirmed" | snake_case vs camelCase |
| BUG-027 | LandingPage cache stale | isChecked never reset |
| BUG-028 | Multi-menu broken | Missing functions |

**Functions Added to helpers.js:**
- `extractPhoneNumber(phone)` - Remove country code
- `getDialCode(phone)` - Extract country code
- `transformCartItemForMultiMenu(item, gst)` - Multi-menu item format
- `transformCartItemsForMultiMenu(items, gst)` - All items
- `buildMultiMenuPayload(orderData, gst)` - Complete payload

**Architecture Established:**
- RECEIVE: `API → orderTransformer.ts → Component`
- SEND: `Component → helpers.js → orderService.ts → API`
- JS wrappers for TypeScript files (bundler compatibility)

**Documentation Created:**
- `/app/memory/CHANGELOG_TRANSFORM_V1.md` - Detailed change log
- `/app/memory/ARCHITECTURE.md` - Architecture documentation

---

## Documentation URLs
| Document | URL |
|----------|-----|
| Bug Tracker | https://customer-5th-march.preview.emergentagent.com/api/docs/bug-tracker |
| API Mapping | https://customer-5th-march.preview.emergentagent.com/api/docs/api-mapping |
| Code Audit | https://customer-5th-march.preview.emergentagent.com/api/docs/code-audit |
| PRD | https://customer-5th-march.preview.emergentagent.com/api/docs/prd |

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
