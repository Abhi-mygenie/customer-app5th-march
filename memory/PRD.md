# Customer App - Project Documentation

## Last Updated: March 26, 2026 (Session 6 - Fresh Setup)

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
| P0 Bugs | ✅ None |
| P1 Bugs | 🟡 1 (QR URL - Parked) |

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

