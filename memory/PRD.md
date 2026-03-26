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
