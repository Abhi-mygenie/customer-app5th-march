# Code Audit Report - Customer App

## Last Updated: March 25, 2026 (Session 4 - Post TypeScript Refactor)
## Auditor: AI Code Assistant

---

## 📊 Issues Tracking Dashboard

| Issue ID | Category | Severity | Title | File(s) | Status | Effort | Session |
|----------|----------|----------|-------|---------|--------|--------|---------|
| CA-001 | Security | 🔴 Critical | Hardcoded credentials | authToken.js | ✅ Fixed | 0.5 hr | Apr 10 |
| CA-002 | Security | 🔴 Critical | Weak JWT secret fallback | server.py | ✅ Fixed | 0.5 hr | Apr 10 |
| CA-003 | Duplication | 🟠 High | Price calc in 6+ files | Multiple | ✅ Fixed | 2 days | Apr 11 |
| CA-004 | Duplication | 🟠 High | Tax calc in 3 files | Multiple | ✅ Fixed | 1 day | Apr 11 |
| CA-005 | Dead Code | 🟢 Low | Unused UI components (46) | components/ui/ | ✅ Fixed | - | Session 4 |
| CA-006 | Performance | 🟡 Medium | 72+ console.logs | Multiple | ⏳ Pending | 0.5 day | - |
| CA-007 | Maintainability | 🟡 Medium | CSS class conflicts (18+) | *.css | ⏳ Pending | 2 days | - |
| CA-008 | Architecture | 🟠 High | ReviewOrder.jsx 1600+ lines | ReviewOrder.jsx | ⏳ Pending | 4-6 hrs | - |
| CA-009 | Dead Code | 🟢 Low | Unused hook useApi.js | hooks/useApi.js | ⏳ Pending | 0.5 hr | - |
| CA-010 | Dead Code | 🟡 Medium | 5 unused API endpoints | endpoints.js | ⏳ Pending | 1 hr | - |

### Stats

| Severity | Total | Fixed | Pending |
|----------|-------|-------|---------|
| 🔴 Critical | 5 | 3 | 2 |
| 🟠 High | 7 | 0 | 7 |
| 🟡 Medium | 7 | 0 | 7 |
| 🟢 Low | 7 | 1 | 6 |
| Architectural | 2 | 0 | 2 |
| **Total** | **29** | **4** | **25** |

**Code Quality Score: 7.9/10** (+0.2 from CA-002 fix)

**Legend:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | ✅ Fixed | ⏳ Pending

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total JS/JSX/TS Files | 110 | ✅ Cleaned |
| Total Lines of Code | ~21,274 | ✅ -2,862 lines |
| TypeScript Coverage | ~6.4% | 🟡 In progress (7 TS files) |
| Console.log Statements | 72 | ⚠️ Needs cleanup |
| Large Files (>500 lines) | 9 | ⚠️ Needs refactoring |
| Unused UI Components | 0 | ✅ Cleaned (was 46) |
| CSS Class Conflicts | 18+ | ⚠️ Potential issues |
| Hardcoded Credentials | 2 | 🔴 Security risk |

### Overall Code Quality Score: **7.5/10** (+0.3 from cleanup)

### Recent Improvements (Sessions 3-4)
- ✅ Transformer layer added (`api/transformers/`)
- ✅ TypeScript services (`orderService.ts`)
- ✅ Centralized API→Internal property mapping
- ✅ Fixed stale cache bug (LandingPage)
- ✅ Fixed price calculation bug (OrderSuccess)
- ✅ Fixed multi-menu payload support
- ✅ **Deleted 46 unused Shadcn UI components (-2,862 lines)**

---

## 1. Architecture Overview (NEW - Session 3)

### Transformer Layer Pattern

```
RECEIVE: External API → orderTransformer.ts → Internal Model → Component
SEND:    Component → helpers.js → orderService.ts → External API
```

### Key Files

| Layer | File | Purpose |
|-------|------|---------|
| **Transformers** | `api/transformers/orderTransformer.ts` | API → Internal mapping |
| **Transformers** | `api/transformers/cartTransformer.ts` | Cart item transforms |
| **Transformers** | `api/transformers/helpers.js` | SEND logic + multi-menu |
| **Services** | `api/services/orderService.ts` | Main TypeScript API service |
| **Services** | `api/services/orderService.js` | Wrapper (Webpack TS fix) |
| **Types** | `types/api/order.types.ts` | TypeScript interfaces |

### Property Mapping (snake_case → camelCase)

| API Field | Internal Field | Notes |
|-----------|---------------|-------|
| `food_status` | `status`, `foodStatus` | Read snake_case first |
| `unit_price` | `price`, `unitPrice` | Base price |
| `food_id` | `foodId` | Item ID |
| `add_ons` | `addons` | No underscore internally |
| `variation` | `variations` | Plural internally |

> See `/app/memory/API_MAPPING.md` for complete field documentation.

---

## 2. API Endpoints Mapping (Complete)

### Endpoints Used

| # | Endpoint | Method | File(s) | Purpose |
|---|----------|--------|---------|---------|
| 1 | `/auth/login` | POST | `authToken.js` | Silent authentication |
| 2 | `/web/restaurant-info` | POST | `useMenuData.js`, `restaurantService.js` | Restaurant details, settings |
| 3 | `/web/restaurant-product` | POST | `useMenuData.js` | Menu items with variations |
| 4 | `/web/menu-master` | POST | `useMenuData.js` | Stations/menus list |
| 5 | `/web/table-config` | POST | `useMenuData.js` | Table/room configuration |
| 6 | `/air-bnb/get-order-details/{id}` | GET | `orderService.ts` | Order details |
| 7 | `/customer/order/place` | POST | `orderService.ts` | Place order (normal) |
| 8 | `/customer/order/autopaid-place-prepaid-order` | POST | `orderService.ts` | Place order (multi-menu) |
| 9 | `/customer/check-table-status` | GET | `orderService.ts` | Check table availability |

### Endpoints Defined But NOT Used

| # | Endpoint | Status |
|---|----------|--------|
| 1 | `/restaurants/{id}/menu` | ❌ Dead code |
| 2 | `/restaurants/{id}/menu/sections` | ❌ Dead code |
| 3 | `/restaurants/{id}/stations` | ❌ Dead code |
| 4 | `/restaurants/{id}/stations/{stationId}` | ❌ Dead code |
| 5 | `/restaurants/{id}/stations/{stationId}/categories` | ❌ Dead code |

**Recommendation:** Remove unused endpoint definitions from `endpoints.js`

---

## 2. Code Duplication Issues

### 2.1 Price Calculation Logic (HIGH PRIORITY)

**Problem:** Same price calculation logic duplicated in 6+ files

**Locations:**
```
1. components/PreviousOrderItems/PreviousOrderItems.jsx (lines 77-100)
2. components/OrderItemCard/OrderItemCard.jsx (lines 26-41)
3. components/CustomizeItemModal/CustomizeItemModal.jsx (lines 51-70)
4. api/services/orderService.js (lines 388-430)
5. context/CartContext.js (lines 330-370)
6. pages/ReviewOrder.jsx (lines 500-530)
```

**Current Duplicate Code:**
```javascript
// This pattern appears 6+ times:
const basePrice = parseFloat(item.price) || 0;
const variationsTotal = (variations || []).reduce(
  (sum, v) => sum + (parseFloat(v.optionPrice) || 0), 0
);
const addonsTotal = (addons || []).reduce(
  (sum, a) => sum + ((parseFloat(a.price) || 0) * (a.quantity || 1)), 0
);
const fullPrice = basePrice + variationsTotal + addonsTotal;
```

**Recommended Fix:** Create a utility function

```javascript
// utils/priceCalculation.js
export const calculateFullItemPrice = (item) => {
  const basePrice = parseFloat(item.unitPrice || item.price) || 0;
  
  let variationsTotal = 0;
  if (item.variations?.length > 0) {
    item.variations.forEach(v => {
      if (v.values) {
        const vals = Array.isArray(v.values) ? v.values : [v.values];
        vals.forEach(val => {
          variationsTotal += parseFloat(val.optionPrice) || 0;
        });
      }
      if (v.optionPrice) {
        variationsTotal += parseFloat(v.optionPrice) || 0;
      }
    });
  }
  
  let addonsTotal = 0;
  if (item.add_ons?.length > 0) {
    item.add_ons.forEach(a => {
      addonsTotal += (parseFloat(a.price) || 0) * (a.quantity || 1);
    });
  }
  
  return { basePrice, variationsTotal, addonsTotal, fullPrice: basePrice + variationsTotal + addonsTotal };
};
```

**Impact:** 
- Before: 6 places to update if logic changes
- After: 1 place to update
- Quality improvement: +0.5 points

---

### 2.2 Tax Calculation Logic (HIGH PRIORITY)

**Problem:** Tax calculation duplicated in 3 files

**Locations:**
```
1. pages/ReviewOrder.jsx (lines 488-590) - For display
2. api/services/orderService.js (lines 477-490) - For API payload
3. api/services/orderService.js (lines 850-930) - For getOrderDetails
```

**Recommended Fix:** Create `utils/taxCalculation.js`

```javascript
export const calculateItemTax = (item, gstEnabled = true) => {
  const taxPercent = parseFloat(item.tax) || 0;
  const taxType = item.tax_type || 'GST';
  
  if (taxType === 'GST' && !gstEnabled) {
    return { gst: 0, vat: 0, total: 0 };
  }
  
  const fullPrice = calculateFullItemPrice(item).fullPrice;
  const taxAmount = (fullPrice * taxPercent) / 100;
  
  return {
    gst: taxType === 'GST' ? taxAmount : 0,
    vat: taxType === 'VAT' ? taxAmount : 0,
    total: taxAmount
  };
};
```

**Impact:** Quality improvement: +0.3 points

---

### 2.3 Variation/Addon Label Extraction (MEDIUM PRIORITY)

**Problem:** Label extraction logic duplicated

**Locations:**
```
1. pages/OrderSuccess.jsx (lines 498-510)
2. components/PreviousOrderItems/PreviousOrderItems.jsx (lines 45-65)
3. pages/ReviewOrder.jsx (lines 1270-1290)
```

**Recommended Fix:** Create utility functions

```javascript
// utils/itemFormatters.js
export const getVariationLabels = (variations) => { ... };
export const getAddonLabels = (addons) => { ... };
```

**Impact:** Quality improvement: +0.2 points

---

## 3. Dead Code / Unused Files

### 3.1 Unused UI Components (from shadcn/ui) - ✅ CLEANED

> **Session 4 Update:** All 46 unused Shadcn UI components were deleted on March 25, 2026.
> - Files removed: 46
> - Lines removed: 2,862
> - Status: ✅ COMPLETE

---

### 3.2 Unused Hooks

| File | Status |
|------|--------|
| `hooks/useApi.js` | ❌ Never imported (0 usages) |

---

### 3.3 Large Unused File

| File | Lines | Status |
|------|-------|--------|
| `pages/AdminSettings.jsx` | 1,323 | ⚠️ Superseded by `/AdminSettings/*` tabs |

**Recommendation:** Verify if still needed, remove if replaced by tab components

---

## 4. Large Files Needing Refactoring

| File | Lines | Issue | Status |
|------|-------|-------|--------|
| `ReviewOrder.jsx` | 1,623 | Too many responsibilities | 🔲 Pending (parked) |
| `AdminSettings.jsx` | 1,323 | Potentially dead code | 🔲 Verify usage |
| `MenuOrderTab.jsx` | 922 | Complex drag-drop logic | 🔲 Pending |
| `MenuItems.jsx` | 819 | UI + business logic mixed | 🔲 Pending |
| `OrderSuccess.jsx` | 711 | Uses transformers now | ✅ IMPROVED |
| `LandingPage.jsx` | 658 | Cache bug fixed | ✅ IMPROVED |
| `Login.jsx` | 558 | Auth flow | 🔲 Review |
| `CartContext.js` | 543 | State management | 🔲 Consider splitting |
| `ContentTab.jsx` | 505 | Admin content | 🔲 Pending |

> **Note (Session 4):** `orderService.js` was split into:
> - `orderService.ts` (~600 lines) - Main TypeScript service
> - `orderTransformer.ts` (~200 lines) - RECEIVE transformations
> - `cartTransformer.ts` (~100 lines) - Cart transformations
> - `helpers.js` (~300 lines) - SEND logic + utilities

### Recommended Refactoring for ReviewOrder.jsx

```
Current (1,602 lines):
└── ReviewOrder.jsx

Proposed (split into ~5 files):
├── ReviewOrder.jsx (~300 lines) - Main container
├── components/
│   ├── ReviewOrderHeader.jsx (~100 lines)
│   ├── ReviewOrderItems.jsx (~200 lines)
│   ├── ReviewOrderCustomerDetails.jsx (~150 lines)
│   └── ReviewOrderPriceBreakdown.jsx (exists)
├── hooks/
│   └── useReviewOrderCalculations.js (~300 lines) - Tax, totals
└── utils/
    └── reviewOrderHelpers.js (~100 lines)
```

**Impact:** Quality improvement: +1.0 point

---

## 5. Console.log Statements (103 total)

### Distribution by File

| File | Count | Purpose |
|------|-------|---------|
| `orderService.js` | 25+ | Debug API calls |
| `ReviewOrder.jsx` | 20+ | Tax calculation debug |
| `CartContext.js` | 15+ | Cart operations |
| `useMenuData.js` | 10+ | Data fetching |
| Others | 33+ | Various |

**Recommendation:** 
1. Remove all production console.logs
2. Use a logger utility with environment check:

```javascript
// utils/logger.js
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args), // Keep errors
  warn: (...args) => isDev && console.warn(...args),
  debug: (...args) => isDev && console.debug(...args),
};
```

**Impact:** Quality improvement: +0.3 points (cleaner production build)

---

## 6. CSS Conflicts

### Duplicate Class Names Across Files

| Class Name | Count | Files |
|------------|-------|-------|
| `.veg-dot` | 4 | Multiple CSS files |
| `.sidebar` | 3 | Sidebar.css, HamburgerMenu.css, AdminLayout.css |
| `.sidebar-*` | 3 each | Same files |
| `.section-title` | 3 | Various |
| `.item-name` | 3 | Various |
| `.header-icon-btn` | 3 | Various |
| `.error-message` | 3 | Various |
| `.empty-state` | 3 | Various |

**Potential Issues:**
- Styles may override each other unexpectedly
- Hard to maintain
- Unpredictable UI behavior

**Recommendation:** Use CSS Modules or BEM naming convention

```css
/* Before */
.sidebar { }
.item-name { }

/* After (BEM) */
.hamburger-menu__sidebar { }
.menu-item__name { }
```

**Impact:** Quality improvement: +0.5 points

---

## 7. Security Issues

### 7.1 Hardcoded Credentials (CRITICAL) - ✅ FIXED

**File:** `utils/authToken.js` (lines 13-14)

**Previous Code (INSECURE):**
```javascript
const HARDCODED_PHONE = process.env.REACT_APP_LOGIN_PHONE || '+919579504871';
const HARDCODED_PASSWORD = process.env.REACT_APP_LOGIN_PASSWORD || 'Qplazm@10';
```

**Fixed Code (April 10, 2026):**
```javascript
// Auth credentials from environment variables (CA-001 fix)
// IMPORTANT: These must be set in .env file - no hardcoded fallbacks for security
const HARDCODED_PHONE = process.env.REACT_APP_LOGIN_PHONE;
const HARDCODED_PASSWORD = process.env.REACT_APP_LOGIN_PASSWORD;

// Validate credentials are configured
if (!HARDCODED_PHONE || !HARDCODED_PASSWORD) {
  console.error('[Auth] CRITICAL: Missing REACT_APP_LOGIN_PHONE or REACT_APP_LOGIN_PASSWORD in environment');
}
```

**Changes Made:**
1. ✅ Removed hardcoded fallback values
2. ✅ Added env vars to `/app/frontend/.env`
3. ✅ Added validation warning if env vars missing
4. ✅ Tested - cart and order flow working

**Impact:** Security improvement - credentials no longer in source code

---

### 7.2 JWT Secret Exposure Risk - ✅ FIXED

**File:** `/app/backend/server.py` (line 27-30)

**Previous Code (INSECURE):**
```python
JWT_SECRET = os.environ.get('JWT_SECRET', 'customer-app-secret-key-change-in-production')
```

**Fixed Code (April 10, 2026):**
```python
# JWT Config (CA-002 fix - removed weak fallback)
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("CRITICAL: JWT_SECRET environment variable must be set")
JWT_ALGORITHM = "HS256"
```

**Changes Made:**
1. ✅ Removed weak fallback secret from code
2. ✅ Added validation - server fails to start if JWT_SECRET not set
3. ✅ Tested - Admin login, token verification, OTP all working

**Validation Results:**
```
Pre-fix:  Admin Login ✅ | Token Verify ✅
Post-fix: Admin Login ✅ | Token Verify ✅ | Backend Running ✅
```

**Impact:** Server now fails fast if misconfigured (secure by default)

---

## 8. Code Quality Improvement Summary

| Issue | Current Impact | After Fix | Priority | Status |
|-------|---------------|-----------|----------|--------|
| Price calc duplication | -0.5 | +0.5 | HIGH | ✅ FIXED |
| Tax calc duplication | -0.3 | +0.3 | HIGH | ✅ FIXED |
| Dead UI components | -0.2 | +0.2 | LOW | ✅ FIXED |
| Large files | -1.0 | +1.0 | MEDIUM | 🔲 Parked |
| Console.logs | -0.3 | +0.3 | LOW | 🔲 Pending |
| CSS conflicts | -0.5 | +0.5 | MEDIUM | 🔲 Pending |
| Hardcoded creds (CA-001) | -0.5 | +0.5 | CRITICAL | ✅ FIXED |
| JWT Secret fallback (CA-002) | -0.5 | +0.5 | CRITICAL | ✅ FIXED |
| Unused endpoints | -0.1 | +0.1 | LOW | 🔲 Pending |

### Quality Score Calculation

| State | Score | Notes |
|-------|-------|-------|
| **Session 2** | 6.5/10 | Initial audit |
| **Session 3** | 7.2/10 | +0.7 (TS refactor, bug fixes) |
| **Session 4** | 7.5/10 | +0.3 (UI cleanup -2,862 lines) |
| **Session 10 (Current)** | **7.9/10** | +0.4 (CA-001, CA-002 security fixes) |
| After remaining HIGH priority | 8.4/10 | |
| After MEDIUM priority | 9.0/10 | |
| After ALL fixes | **9.4/10** | |

---

## 9. Recommended Action Plan

### Phase 1: Critical - COMPLETED (Session 3-4)
1. ✅ Transformer layer added (`api/transformers/`)
2. ✅ TypeScript service created (`orderService.ts`)
3. ✅ Centralized API→Internal property mapping
4. ✅ Fixed stale cache bug (LandingPage)
5. ✅ Fixed price calculation bug (OrderSuccess)
6. ✅ Fixed multi-menu payload support
7. ✅ Fixed item status mapping (`food_status` → `foodStatus`)
8. ✅ **Deleted 46 unused Shadcn UI components (-2,862 lines)**

### Phase 2: High Priority (Current Focus)
1. ✅ CA-008 Phase 2 — Dedup handlePlaceOrder (1644→1515 lines, -129 lines)
   - Extracted `buildBillSummary()`, `buildOrderItems()`, `buildPreviousItems()` as module-level pure functions
   - Extracted `openRazorpayCheckout()` as shared Razorpay flow (replaces 2 blocks → 1)
   - Side-effect: BUG-038 fixed (main Razorpay success now passes billSummary)
   - Side-effect: BUG-P2-007 fixed (main Razorpay dismiss now resets orderDispatchedRef)
2. 🔲 Fix Inclusive Tax Logic (`tax_calc: "Inclusive"`)
3. 🔲 Restaurant-level Tax Settings (`restaurent_gst`, `vat.status`)
4. 🔲 Remove/replace console.logs with logger
5. 🔲 Remove unused endpoints from `endpoints.js`

### Phase 3: Medium Priority (Parked - Wait 1-2 Sessions)
1. 🔲 Extract custom hooks (`useOrderCalculations`, `usePreviousOrder`)
2. 🔲 Refactor `ReviewOrder.jsx` into smaller components
3. 🔲 Fix CSS class naming conflicts (adopt BEM)
4. ✅ ~~Remove unused UI components~~ DONE

### Phase 4: Low Priority (Backlog)
1. 🔲 Complete TypeScript migration (remaining JSX→TSX)
2. 🔲 Add comprehensive unit tests
3. 🔲 Implement error boundaries
4. 🔲 Add performance monitoring

---

## 10. Files to Delete (Safe)

```
# ✅ DELETED (Session 4) - All 46 Shadcn UI components removed

# Remaining files to review:
/frontend/src/hooks/useApi.js              # Unused hook
/frontend/src/pages/AdminSettings.jsx      # Verify if replaced by tabs (1,323 lines)
```

---

## 11. 🔴 CRITICAL HARDCODINGS

> **WARNING:** These are restaurant-specific hardcodings that bypass normal logic. 
> Any changes to these require careful testing with the specific restaurant.

### 11.1 Restaurant 716 - Skip Table Status Check

| Field | Details |
|-------|---------|
| **Restaurant** | 716 (Hyatt Centric Candolim Goa) |
| **File** | `pages/ReviewOrder.jsx` |
| **Line** | ~893 |
| **Condition** | `String(restaurantId) === '716'` |
| **Date Added** | March 25, 2026 (Session 4) |

**What it does:**
- Skips table occupancy check before placing NEW orders
- Allows multiple orders on the same table/room

**Why it's needed:**
- Restaurant 716 business model allows multiple separate orders per table
- They do NOT use the "Edit Order" flow
- Normal restaurants: 1 active order per table (must edit existing)
- Restaurant 716: Multiple orders per table (always new order)

**Code Location:**
```javascript
// ReviewOrder.jsx - handlePlaceOrder()
const skipTableCheckFor716 = String(restaurantId) === '716';

if (!skipTableCheckFor716 && finalTableId && String(finalTableId) !== '0') {
  // Table status check - SKIPPED for 716
}
```

**Impact if removed:**
- Restaurant 716 users will see "This table already has an active order" error
- Unable to place orders on occupied tables
- Business operations blocked

---

## Appendix: API Field Mapping Reference

See `/app/memory/API_MAPPING.md` for complete API field documentation.

---

## Document History

| Date | Session | Changes |
|------|---------|---------|
| Mar 25, 2026 | Session 4 | Added Section 11: Critical Hardcodings (Restaurant 716) |
| Mar 25, 2026 | Session 4 | Deleted 46 unused Shadcn UI components (-2,862 lines) |
| Mar 25, 2026 | Session 4 | Updated for TypeScript refactor, added architecture section |
| Mar 25, 2026 | Session 2 | Initial audit created |
| Apr 11, 2026 | Session 11 | CA-003 fixed — centralized price calculation. Replaced 4 inline duplications with `calculateCartItemPrice()` from helpers.js. ReviewOrder previous items now uses pre-computed `fullPrice` from transformer. Tested: cart totals match, prices display correctly. |
| Apr 11, 2026 | Session 11 | CA-004 fixed — centralized tax calculation. Created /utils/taxCalculation.js with calculateItemTax() and calculateTaxBreakdown(). Replaced inline tax calc in ReviewOrder.jsx (~80 lines → normalized items array + utility call) and orderService.ts (~20 lines → same utility). Zero behavior change. Tested on restaurant 478 (GST 5% + VAT 4%): CGST/SGST/VAT breakdown correct. |
