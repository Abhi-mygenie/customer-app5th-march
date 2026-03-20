# Project Audit Report
**Date:** March 16, 2026
**Codebase:** 189 files | ~22K lines JS/JSX | ~14K lines CSS | ~1.4K lines Python

---

## SECURITY ISSUES (Critical)

### 1. Hardcoded Credentials in authToken.js
- **File:** `frontend/src/utils/authToken.js` (lines 13-14)
- **Issue:** Phone `+919579504871` and Password `Qplazm@10` hardcoded as fallback defaults
- **Risk:** Ships to browser bundle, visible to anyone inspecting code
- **Fix:** Remove fallbacks, require env vars `REACT_APP_LOGIN_PHONE` / `REACT_APP_LOGIN_PASSWORD`

### 2. Weak JWT Secret with Fallback
- **File:** `backend/server.py` (line 27)
- **Issue:** `JWT_SECRET = os.environ.get('JWT_SECRET', 'customer-app-secret-key-change-in-production')`
- **Risk:** If env var is missing, a guessable default secret is used
- **Fix:** Remove fallback, fail fast if JWT_SECRET not set

### 3. MongoDB Credentials in .env
- **File:** `backend/.env`
- **Issue:** Plain DB credentials in file
- **Action:** Ensure `.env` is in `.gitignore` for production

### 4. CORS Wildcard
- **File:** `backend/.env` — `CORS_ORIGINS=*`
- **Risk:** Any domain can make requests to the API
- **Fix:** Restrict to actual frontend domains in production

---

## DEAD CODE / UNUSED FILES (Should Remove)

### 5. Old AdminSettings.jsx (1,323 lines)
- **File:** `frontend/src/pages/AdminSettings.jsx`
- **Issue:** Imported in `App.js` line 19 but NOT used in any route. Replaced by 7 new pages in `pages/admin/`
- **Action:** Delete file, remove import from App.js

### 6. MenuPanel.jsx Commented-Out Old Version (64 lines)
- **File:** `frontend/src/components/MenuPanel/MenuPanel.jsx` (lines 1-71)
- **Issue:** Entire old component commented out above the active version
- **Action:** Remove commented block

### 7. SearchBar Component (Dead)
- **Files:** `frontend/src/components/SearchBar/SearchBar.jsx`, `SearchBar.css`
- **Issue:** Commented out in MenuItems.jsx, replaced by SearchAndFilterBar
- **Action:** Delete folder

### 8. FilterPanel Component (Dead)
- **Files:** `frontend/src/components/FilterPanel/FilterPanel.jsx`, `FilterPanel.css`
- **Issue:** Commented out in MenuItems.jsx, replaced by SearchAndFilterBar
- **Action:** Delete folder

### 9. stationService.js (Dead)
- **File:** `frontend/src/api/services/stationService.js`
- **Issue:** Import commented out in useMenuData.js, not used anywhere
- **Action:** Delete file

### 10. Commented-Out Import Statements (~15 locations)
- `useMenuData.js:10` — `// import { getStations }`
- `orderService.js:6-7` — `// import apiClient`, `// import ENDPOINTS`
- `MenuPanel.jsx:1-2` — `// import React`, `// import './MenuPanel.css'`
- `CustomerDetails.jsx:2` — `// import IoPersonSharp`
- `OrderItemCard.jsx:2,5` — `// import useNavigate`, `// import useRestaurantId`
- `MenuItems.jsx:5-6` — `// import SearchBar`, `// import FilterPanel`
- `ReviewOrder.jsx:20` — `// import GiShoppingCart`
- `useRestaurantId.js:11` — `// import useParams, useSearchParams`
- **Action:** Remove all

### 11. Commented-Out Debug console.log Blocks
- `useMenuData.js` — 12 console statements (most commented)
- `MenuItems.jsx` — 5 console statements
- `orderService.js` — 36 console statements
- `ReviewOrder.jsx` — 37 console statements
- **Action:** Remove commented debug logs, keep active error logging

---

## HARDCODED VALUES (Should be Env/Config)

### 12. Hardcoded API URLs with Silent Fallbacks (4 locations)
- `frontend/src/api/config/axios.js:12` — `'https://preprod.mygenie.online/api/v1'`
- `frontend/src/api/config/endpoints.js:6` — `'https://preprod.mygenie.online/api/v1'`
- `frontend/src/api/services/orderService.js:1105` — `'https://preprod.mygenie.online/api/v1'`
- `frontend/src/hooks/useMenuData.js:77` — `'https://manage.mygenie.online'`
- **Fix:** Remove fallbacks, require `REACT_APP_API_BASE_URL` and `REACT_APP_IMAGE_BASE_URL` env vars

### 13. Inline Restaurant ID Check in HamburgerMenu
- **File:** `frontend/src/components/HamburgerMenu/HamburgerMenu.jsx:158`
- **Issue:** `['716', '739'].includes(restaurantId)` instead of using `isMultipleMenu()` utility
- **Fix:** Replace with `isMultipleMenu(restaurant, restaurantId)`

---

## CODE QUALITY BUGS

### 14. Token Expiry Mismatch
- **File:** `frontend/src/utils/authToken.js`
- **Issue:** Comment says "30 minutes", code sets `10 * 60 * 1000` = 10 minutes
- Lines 9, 10, 62, 146 all reference "30 minutes" but actual value is 10 min
- **Fix:** Align comment with code (or code with intent)

### 15. Unused Import in App.js
- **File:** `frontend/src/App.js:19`
- **Issue:** `import AdminSettings from './pages/AdminSettings'` — imported but never used in routes
- **Impact:** Adds 1,323 lines to bundle unnecessarily
- **Fix:** Remove import

### 16. Excessive Console Statements (~130+ active)
- Top offenders: `ReviewOrder.jsx` (37), `orderService.js` (36), `useMenuData.js` (12)
- **Fix:** Replace with proper logging utility or remove for production

---

## REFACTORING OPPORTUNITIES

### 17. ReviewOrder.jsx (1,474 lines)
- Largest component file, handles form, validation, payment, order submission
- **Suggestion:** Extract into sub-components: OrderForm, PriceBreakdown, TableSelector, CustomerForm

### 18. orderService.js (1,171 lines)
- Multiple concerns: cart transformation, payload building, API calls, order history
- **Suggestion:** Split into cartTransformer.js, payloadBuilder.js, orderApi.js

### 19. Repeated REACT_APP_BACKEND_URL Pattern
- `process.env.REACT_APP_BACKEND_URL || ''` repeated in 8+ files
- **Files:** Profile.jsx, AdminSettings.jsx, LandingPage.jsx, PasswordSetup.jsx, AuthContext.jsx, AdminConfigContext.jsx, RestaurantConfigContext.jsx, dietaryTagsService.js
- **Suggestion:** Create shared `config.js` constant

### 20. CSS Scoping Issues
- Admin component CSS uses global class names that have caused customer-page conflicts
- **Affected:** MenuOrderTab.css, DietaryTagsAdmin.css, AdminSettings.css
- **Suggestion:** Use CSS Modules or BEM with parent `.admin-*` scoping

### 21. Sidebar Component (Possibly Orphaned)
- **Files:** `frontend/src/components/Sidebar/Sidebar.jsx`, `Sidebar.css`
- Only referenced from MenuPanel.jsx (which doesn't actually import it)
- **Action:** Verify usage, delete if orphaned

---

## FILE SIZE OVERVIEW (Largest Files)

| File | Lines | Note |
|------|-------|------|
| ReviewOrder.jsx | 1,474 | Should split |
| AdminSettings.jsx | 1,323 | DEAD - delete |
| orderService.js | 1,171 | Should split |
| MenuItems.jsx | 807 | Acceptable |
| MenuOrderTab.jsx | 790 | Admin component |
| OrderSuccess.jsx | 654 | Review size |
| LandingPage.jsx | 584 | Acceptable |
| CartContext.js | 511 | Acceptable |
| ContentTab.jsx | 505 | Admin component |

---

## STATUS: Documented only. No code changes made.
