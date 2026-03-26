# Customer App - Project Documentation

## Last Updated: March 26, 2026 (Session 7 - Razorpay & QR Enhancements)

---

## Project Overview
- **Repository**: https://github.com/Abhi-mygenie/customer-app5th-march.git
- **Default Branch**: `abhi-25th-march-all-fix-refeactor3-withtest-cases-and-hyatt-fix-`
- **Database**: MongoDB at `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie`
- **Tech Stack**: React (Frontend) + FastAPI (Backend) + MongoDB + TypeScript (API Layer)
- **Preview URL**: https://app-customer-five.preview.emergentagent.com

---

## Current Status

| Area | Status |
|------|--------|
| Order Flow | ✅ Working |
| Transform Layer | ✅ Complete |
| Multi-menu Support | ✅ Restored |
| Restaurant 716 Fix | ✅ Fixed (BUG-030) |
| POS Token Architecture | ✅ Fixed (BUG-033) |
| Razorpay Payment Integration | ✅ Complete (Session 7) |
| QR Code Filters | ✅ Complete (Session 7) |
| P0 Bugs | ✅ None |
| P1 Bugs | 🟡 1 (QR URL - Parked) |

---

## Session 7 Completed Features

### 1. Razorpay Payment Integration ✅

**Flow:**
```
1. Check restaurant.razorpay.razorpay_key exists → Show "Pay & Proceed"
2. Place Order API → { order_id, razorpay_id, total_amount }
3. Create Razorpay Order API → { order_id: "order_XXXXX" }
4. Open Razorpay SDK with actual order_id
5. Payment Success → Navigate to Order Success page
6. Verify Payment API → Confirm payment
```

**Files Changed:**
- `/app/frontend/public/index.html` - Added Razorpay SDK script
- `/app/frontend/src/pages/ReviewOrder.jsx` - Button logic + payment flow
- `/app/frontend/src/pages/OrderSuccess.jsx` - Payment verification + status UI
- `/app/frontend/src/pages/OrderSuccess.css` - Payment status styles

**Test Restaurant:**
- Restaurant 510 (Mygenie Dev) - has Razorpay configured
- Credentials: owner@devmygenie.com / Qplazm@10

### 2. QR Code Page Enhancements ✅

**New Filters:**
- Type filter: All / Tables / Rooms
- Menu Master filter: Dropdown with available menus (Normal, Party, Premium, etc.)

**Changes:**
- Uses QR URLs directly from POS API (`qr_code_urls[selectedMenu]`)
- Removed manual URL building
- Bulk download includes selected menu in filename

**Files Changed:**
- `/app/frontend/src/pages/admin/AdminQRPage.jsx`
- `/app/frontend/src/pages/admin/AdminPages.css`

---

## Pending Implementation / Next Actions

### P1 - High Priority
1. **QR code broken URLs** - baseUrl empty (Parked)
2. **Remove silent env fallbacks** - hardcoded credentials in authToken.js
3. **Fix weak JWT secret fallback**

### P2 - Backlog
1. P2-1: Extract Custom Hooks (6-8 hours)
2. P2-2: Decompose ReviewOrder.jsx (4-6 hours) - Currently 1600+ lines
3. P2-3: Fix Inclusive Tax Logic (2-3 hours)
4. P2-4: Restaurant-level Tax Settings (3-4 hours)
5. P2-5: Full TypeScript Migration (8-12 hours)

---

## Admin Credentials
- Restaurant 709 (Young Monk): email=owner@youngmonk.com, password=admin123
- Restaurant 510 (Mygenie Dev): email=owner@devmygenie.com, password=Qplazm@10
- Customer test: phone=7505242126, restaurant_id=709

---

## Parked Features / Planned Implementation

### PARKED-001: Retry Payment Button (Razorpay)

**Status:** Planned  
**Priority:** P1  
**Date Parked:** March 26, 2026

**Description:**  
Add "PAY ₹XXX" button on Order Success page when payment verification fails.

**Flow:**
```
1. On Order Success page load → Call /verify-payment
2. If status: "failed" → Show "PAY ₹XXX" button
3. User clicks "PAY":
   - Call /create-razor-order with order_id
   - Get fresh Razorpay order_id
   - Open Razorpay SDK
   - On success → Verify again → Update UI
   - On cancel → Stay on page, button remains
```

**UI States:**
| State | Display |
|-------|---------|
| isVerifyingPayment: true | "Verifying payment..." spinner |
| paymentVerified: true | "Payment Verified ✅" badge |
| paymentVerified: false + isPaid: true | "PAY ₹XXX" button |
| isPaid: false (COD) | Normal success page |

**Files to Modify:**
- `/app/frontend/src/pages/OrderSuccess.jsx`

**Data Required:**
- order_id (from orderData)
- razorpay_key (from restaurant config)
- total_amount (from orderData)


### PARKED-002: Payment Status Persistence on Refresh

**Status:** Planned  
**Priority:** P2  
**Date Parked:** March 26, 2026

**Issue:**  
On page refresh, `location.state` is lost → payment status not re-verified.

**Options:**
| Option | Approach |
|--------|----------|
| A | Store payment data in sessionStorage |
| B | Fetch payment_status from /order-details API (Recommended) |
| C | Re-verify using stored razorpay IDs |

**Recommendation:** Option B - Backend should return payment_status in order details API.

**Files to Modify:**
- `/app/frontend/src/pages/OrderSuccess.jsx`
- Possibly POS `/order-details` API

