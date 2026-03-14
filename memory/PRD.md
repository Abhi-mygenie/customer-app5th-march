# MyGenie Customer App - PRD

## Project Overview
Restaurant Customer-facing and Admin app pulled from GitHub repository: https://github.com/Abhi-mygenie/customer-app5th-march.git

## Tech Stack
- **Frontend**: React 19 with TailwindCSS, React Query, React Router
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: External MongoDB at 52.66.232.149:27017 (mygenie database)
- **Authentication**: JWT with OTP and Password-based login

## What's Been Implemented

### Jan 2026 - Initial Setup
- ✅ Project cloned from GitHub
- ✅ MongoDB connected to external database
- ✅ Backend running on port 8001
- ✅ Frontend running on port 3000

### Jan 2026 - Security Fix
- ✅ Removed hardcoded OTP "1111" bypass in `verify_otp()` function
- OTP is now properly validated against the generated OTP only

### Jan 2026 - Multi-Select Dietary Filters Feature
**New UI Layout:**
- Row 1: Search bar + Veg/Non-Veg/Egg toggle (single-select)
- Row 2: Dietary tags chips (multi-select) - shown only if tags have items
- Row 3: Categories (unchanged)

**Backend Changes:**
- Added `/api/dietary-tags/available` - Get list of 8 dietary tags
- Added `/api/dietary-tags/{restaurant_id}` - GET/PUT dietary tag mappings
- New collection: `dietary_tags_mapping`

**Frontend Changes:**
- Updated `SearchAndFilterBar.jsx` - New segmented Veg toggle + dietary chips
- Updated `SearchAndFilterBar.css` - Responsive styles
- Created `DietaryTagsAdmin.jsx` - Admin panel for tagging items
- Created `DietaryTagsAdmin.css` - Admin styling
- Created `dietaryTagsService.js` - API service
- Added `useDietaryTags` hook in `useMenuData.js`
- Updated `MenuItems.jsx` - Multi-select filter logic with AND operation
- Updated `AdminSettings.jsx` - Added "Dietary Tags" tab

### Jan 2026 - Multi-Menu Restaurant Support for Dietary Tags
**Issue:** For restaurants with multiple menus (e.g., 716 Hyatt), admin was seeing ALL items from ALL menus mixed together in Dietary Tags tab.

**Solution:** Added menu/station selector for multi-menu restaurants.

**Changes:**
- `AdminSettings.jsx`: Extract `multiple_menu` from restaurant data, pass to DietaryTagsAdmin
- `DietaryTagsAdmin.jsx`: 
  - Added station selector UI (horizontal tabs)
  - Load stations from `stations.json` for multi-menu restaurants
  - Filter products by `food_for` param when station selected
  - Show "Select a menu first" prompt until station is selected
- `DietaryTagsAdmin.css`: Added station selector styles

**UI Flow for Multi-Menu:**
1. Admin opens Dietary Tags tab
2. Sees menu selector with all stations (Breakfast, FOOD MENU, Kids Menu, etc.)
3. Selects a menu → Items for that menu load
4. Tags items → Save
5. Can switch to another menu and repeat

**Available Dietary Tags:**
1. Jain 🙏
2. Vegan 🌱
3. Gluten-Free 🌾
4. Lactose-Free 🥛
5. Nut-Free 🥜
6. Halal ☪️
7. Sugar-Free 🍬
8. High Protein 💪

**Filter Logic:**
- Veg/Non-Veg/Egg: Single-select, uses existing `isVeg`/`isEgg` fields from POS
- Dietary Tags: Multi-select with AND logic (item must have ALL selected tags)
- Dynamic visibility: Only tags with ≥1 tagged item shown

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP (returns otp_for_testing in dev)
- `POST /api/auth/login` - Login with OTP or password
- `GET /api/auth/me` - Get current user

### Dietary Tags (NEW)
- `GET /api/dietary-tags/available` - List all 8 dietary tags
- `GET /api/dietary-tags/{restaurant_id}` - Get mappings for restaurant
- `PUT /api/dietary-tags/{restaurant_id}` - Update mappings (admin only)

### Existing Endpoints
- `/api/config/{restaurant_id}` - App configuration
- `/api/customer/*` - Customer profile, orders, points
- `/api/loyalty-settings/{restaurant_id}` - Loyalty program settings

## Database Collections
- customers, users, customer_app_config
- orders, points_transactions, wallet_transactions
- coupons, loyalty_settings, feedback
- **dietary_tags_mapping** (NEW)

## Files Modified/Created

### Backend
- `/app/backend/server.py` - Added dietary_router and endpoints

### Frontend
- `/app/frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.jsx` - Redesigned
- `/app/frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.css` - New styles
- `/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.jsx` - NEW
- `/app/frontend/src/components/AdminSettings/DietaryTagsAdmin.css` - NEW
- `/app/frontend/src/api/services/dietaryTagsService.js` - NEW
- `/app/frontend/src/hooks/useMenuData.js` - Added useDietaryTags hook
- `/app/frontend/src/pages/MenuItems.jsx` - Updated filter logic
- `/app/frontend/src/pages/AdminSettings.jsx` - Added Dietary Tags tab

## Next Action Items
- P0: Admin needs to tag menu items via Admin Panel > Dietary Tags tab
- P1: Test multi-select filtering after items are tagged
- P2: Consider adding bulk tagging feature for categories

## Backlog
- Customer analytics dashboard
- Order history with reorder functionality
- Push notifications integration
- Payment gateway integration
- Multi-language support

## Known Issues
- Frontend `authToken.js` has hardcoded POS service account credentials (by design for guest ordering)
