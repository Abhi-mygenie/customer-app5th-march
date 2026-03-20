# Customer App - Project Documentation

## Last Updated: March 20, 2026

---

## Project Overview
- **Repository**: https://github.com/Abhi-mygenie/customer-app5th-march.git
- **Database**: MongoDB at `52.66.232.149:27017/mygenie`
- **Tech Stack**: React (Frontend) + FastAPI (Backend) + MongoDB
- **Preview URL**: https://a9f7621f-0bce-4932-a3f9-6bf208e1a576.preview.emergentagent.com

---

## Base URLs Used in Project

| Variable | Value | Purpose |
|----------|-------|---------|
| `REACT_APP_API_BASE_URL` | `https://preprod.mygenie.online/api/v1` | External POS API |
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

---

## Implemented Features (March 2026)

### 1. Egg Filter Color Fix
**Date**: March 20, 2026
**File**: `/app/frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.css`
**Changes**:
- Line 111: `.veg-toggle-btn.egg.active` color → `var(--color-egg)`
- Line 156: `.veg-dot-yellow` border-color → `var(--color-egg)`
- Line 169: `.veg-dot-yellow::after` background → `var(--color-egg)`
**Result**: Egg filter button now matches egg label color on food item cards (#FFA500)

---

### 2. Total Rounding Feature (Review Order Page)
**Date**: March 20, 2026
**Files Modified**: 
- `/app/frontend/src/pages/ReviewOrder.jsx`
- `/app/frontend/src/pages/ReviewOrder.css`

**Requirement**: When `total_round === 'Yes'` from restaurant-info API, round grand total UP (ceiling) and display original in brackets.

**Implementation Details**:

#### ReviewOrder.jsx Changes:
1. **Lines 583-585** - Added rounding logic:
```jsx
const isTotalRoundEnabled = restaurant?.total_round === 'Yes';
const roundedTotal = isTotalRoundEnabled ? Math.ceil(totalToPay) : totalToPay;
const roundingDifference = isTotalRoundEnabled ? parseFloat((roundedTotal - totalToPay).toFixed(2)) : 0;
```

2. **Lines 1354-1358** - Grand Total display:
```jsx
<span className="price-value-total">
  ₹{isTotalRoundEnabled ? roundedTotal : totalToPay.toFixed(2)}
  {isTotalRoundEnabled && roundedTotal !== totalToPay && (
    <span className="original-total">(₹{totalToPay.toFixed(2)})</span>
  )}
</span>
```

3. **Lines 1477-1478** - Place Order button shows rounded amount

4. **Lines 798, 918** - API payload sends rounded value:
```jsx
totalToPay: isTotalRoundEnabled ? roundedTotal : totalToPay,
```

5. **billSummary** updated with rounding info:
```jsx
billSummary: {
  grandTotal: isTotalRoundEnabled ? roundedTotal : totalToPay,
  originalTotal: totalToPay,
  roundingApplied: isTotalRoundEnabled,
  roundingDifference: roundingDifference
}
```

#### ReviewOrder.css Changes:
**Lines 1054-1059** - Added `.original-total` class:
```css
.original-total {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  color: var(--text-secondary);
  margin-left: 4px;
}
```

**Result**: 
- Grand Total: ₹48 (₹47.26) - Rounded UP with original in brackets
- Place Order button: ₹48 - Shows rounded amount
- API receives rounded amount

---

### 3. Login Prompt Margin Fix
**Date**: March 20, 2026
**File**: `/app/frontend/src/pages/ReviewOrder.css`
**Line**: 764

**Change**:
```css
/* Before */
margin: var(--spacing-sm) 0;

/* After */
margin-top: 20px;
margin-bottom: 60px;
```

**Result**: "Earn rewards on this order!" login prompt no longer hidden behind Place Order button when multiple items in cart.

---

## Pending Implementation

### 4. Order Success Page - Total Round Display
**Status**: NOT YET IMPLEMENTED
**File**: `/app/frontend/src/pages/OrderSuccess.jsx`
**Line**: 565

**Requirement**: 
- When `total_round === 'Yes'`: Show `₹{liveOrderAmount || orderData.totalToPay} (₹{billSummary.grandTotal.toFixed(2)})`
- When `total_round !== 'Yes'`: Show `₹{billSummary.grandTotal.toFixed(2)}`

**Proposed Implementation**:
1. Add variable after line 111:
```jsx
const isTotalRoundEnabled = restaurant?.total_round === 'Yes';
```

2. Update line 565:
```jsx
<span className="bill-value-total">
  {isTotalRoundEnabled ? (
    <>₹{liveOrderAmount || orderData.totalToPay} (₹{billSummary.grandTotal.toFixed(2)})</>
  ) : (
    <>₹{billSummary.grandTotal.toFixed(2)}</>
  )}
</span>
```

---

## Restaurant Info API - Key Implementation Status

### Implemented Keys (~19):
id, name, phone, email, logo, address, tax, gst_tax, multiple_menu, food_for, delivery, take_away, veg, is_loyalty, is_coupon, description, slug, latitude, longitude, online_order

### NOT Implemented Keys (~131):
- **Billing/Rounding**: `total_round` (NOW IMPLEMENTED), currency
- **Service Charges**: tip, service_charge, service_charge_percentage
- **Timing**: available_time_starts, available_time_ends, food_timings
- **Order Settings**: minimum_order, total_order, order_count, schedule_order
- **Payment**: online_payment, pay_cash, pay_cc, pay_upi, razorpay
- **GST/Tax**: gst_status, gst_code, vat
- **Display**: theme, cover_photo, is_banner, is_category_box
- **Food Options**: non_veg, dine_in
- **Delivery**: free_delivery, delivery_time, delivery_fee
- **Feedback/Rating**: feed_back, feedback_url, avg_rating, rating_count
- And 100+ more...

---

## P0 - Critical Issues (From Original PRD)

1. **Fix QR code broken URLs** - baseUrl empty, subdomain/restaurantId not populated

---

## P1 - High Priority

1. **Remove silent env fallbacks** - Security concern with hardcoded credentials in authToken.js

---

## Backlog

1. Wire up real menu-master API data (image, description, opening_time, closing_time)
2. Code audit action items (see `/app/memory/AUDIT_REPORT.md`):
   - Remove hardcoded credentials in `authToken.js`
   - Fix weak JWT secret with fallback
   - Remove dead code (AdminSettings.jsx - 1,323 lines, SearchBar, FilterPanel, stationService.js)
   - Fix CORS wildcard setting
   - Clean up ~130+ console.log statements
3. CSS scoping review (admin vs customer conflicts)
4. Dynamic station images
5. Undo/redo for menu reordering

---

## Completed Features (Jan-Mar 2026 - Historical)

- Admin layout with 7 pages, menu drag-drop, timing controls
- Admin QR Scanner page with per-table QR codes
- Dynamic multi-menu detection, station selection redesign
- Unified customer login (password + OTP flows)

---

## Technical Notes

### Total Rounding Logic
- Uses `Math.ceil()` for always rounding UP
- `restaurant?.total_round === 'Yes'` enables rounding
- Rounded value sent to API in `order_amount`
- Original value stored in `billSummary.originalTotal`

### Order Flow Data Sources
| Stage | Data Source |
|-------|-------------|
| ReviewOrder display | Local calculation |
| Place Order API payload | Rounded value (when enabled) |
| OrderSuccess initial | Passed from ReviewOrder via location.state |
| OrderSuccess after refresh | API response + local recalculation |

---

## File Reference

### Key Files Modified in This Session:
1. `/app/frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.css` - Egg filter color
2. `/app/frontend/src/pages/ReviewOrder.jsx` - Total rounding logic
3. `/app/frontend/src/pages/ReviewOrder.css` - Original total styling, login prompt margin
4. `/app/frontend/src/pages/OrderSuccess.jsx` - Pending: Total round display

### Configuration Files:
- `/app/backend/.env` - MongoDB connection, JWT secret
- `/app/frontend/.env` - API URLs

---

## Next Actions

1. ✅ Implement Order Success page total_round conditional display
2. Fix P0: QR code broken URLs
3. Fix P1: Remove silent env fallbacks
4. Continue with backlog items
