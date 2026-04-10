# Project Documentation Summary - MyGenie Customer App

## Last Updated: April 10, 2026

---

## Quick Navigation

| Document | Purpose | Last Updated |
|----------|---------|--------------|
| [PRD.md](./PRD.md) | Project requirements, features, credentials | March 31, 2026 |
| [BUG_TRACKER.md](./BUG_TRACKER.md) | Bug tracking and fixes | March 31, 2026 |
| [CODE_AUDIT.md](./CODE_AUDIT.md) | Code quality, refactoring status | March 25, 2026 |
| [API_MAPPING.md](./API_MAPPING.md) | API endpoints and field mappings | March 26, 2026 |

---

## Overall Project Health

| Metric | Status | Details |
|--------|--------|---------|
| **Code Quality Score** | 7.5/10 | +0.3 from Session 4 cleanup |
| **Open P0 Bugs** | 1 | BUG-035 (f_order_status for Razorpay) |
| **Open P1 Bugs** | 1 | BUG-029 (QR URL - Parked) |
| **TypeScript Coverage** | ~6.4% | 7 TS files |
| **Total Files** | 110 | ~21,274 lines |

---

## Bug Status Summary

| Priority | Total | Open | Fixed | Parked |
|----------|-------|------|-------|--------|
| 🔴 P0 (Critical) | 6 | 1 | 5 | 0 |
| 🟡 P1 (High) | 2 | 0 | 1 | 1 |
| 🟢 P2 (Medium) | 5 | 5 | 0 | 0 |
| Total | 13 | 6 | 6 | 1 |

### Open Issues

| Bug ID | Summary | Priority | Status |
|--------|---------|----------|--------|
| BUG-035 | f_order_status not set for Razorpay orders | 🔴 P0 | Pending |
| BUG-029 | QR Code URL empty when subdomain not set | 🟡 P1 | Parked |

---

## Code Audit Progress

| Category | Total Issues | Fixed | Pending | Status |
|----------|--------------|-------|---------|--------|
| **Critical (Security)** | 5 | 1 | 4 | 🔴 20% |
| **High** | 7 | 0 | 7 | 🔴 0% |
| **Medium** | 7 | 0 | 7 | 🟡 0% |
| **Low** | 7 | 0 | 7 | 🟡 0% |
| **Architectural** | 2 | 0 | 2 | 🟡 0% |
| **Total** | **29** | **1** | **28** | **3%** |

### Top Issues to Address

| Issue | Category | Effort | Impact |
|-------|----------|--------|--------|
| Hardcoded credentials | Critical | 1 day | Security |
| Price calc duplication | High | 2 days | Maintainability |
| Tax calc duplication | High | 1 day | Maintainability |
| Console.logs (72+) | Low | 0.5 day | Performance |
| CSS conflicts (18+) | Medium | 2 days | UI stability |

---

## Feature Status

| Feature | Status | Session |
|---------|--------|---------|
| Order Flow | ✅ Complete | - |
| Transform Layer | ✅ Complete | Session 3 |
| Multi-menu Support | ✅ Complete | Session 3 |
| Restaurant 716 Fix | ✅ Complete | Session 4 |
| POS Token Architecture | ✅ Complete | Session 5 |
| Razorpay Integration | ✅ Complete | Session 7 |
| Razorpay payment_type | ✅ Complete | Session 9 |
| QR Code Filters | ✅ Complete | Session 7 |
| Inclusive Tax Logic | 🔲 Pending | - |
| Full TypeScript Migration | 🔲 Pending | - |

---

## API Endpoints Status

| Status | Count | Details |
|--------|-------|---------|
| ✅ Active | 9 | In use |
| ❌ Dead Code | 5 | Defined but never called |

---

## Pending Work Summary

### P1 - High Priority
1. 🔲 Fix BUG-035: f_order_status for Razorpay
2. 🔲 Remove hardcoded credentials (authToken.js)
3. 🔲 Fix weak JWT secret fallback

### P2 - Backlog
1. 🔲 Extract Custom Hooks (6-8 hours)
2. 🔲 Decompose ReviewOrder.jsx (4-6 hours)
3. 🔲 Fix Inclusive Tax Logic (2-3 hours)
4. 🔲 Restaurant-level Tax Settings (3-4 hours)
5. 🔲 Full TypeScript Migration (8-12 hours)
6. 🔲 Remove 72+ console.logs
7. 🔲 Fix CSS class conflicts

---

## Session History

| Session | Date | Key Changes |
|---------|------|-------------|
| Session 9 | Mar 31, 2026 | Razorpay payment_type fix (BUG-034) |
| Session 8 | Mar 31, 2026 | Razorpay endpoints centralized |
| Session 7 | Mar 26, 2026 | Razorpay integration, QR filters |
| Session 5 | Mar 26, 2026 | POS token architecture redesign |
| Session 4 | Mar 25, 2026 | Deleted 46 unused UI components |
| Session 3 | Mar 25, 2026 | Transformer layer, TypeScript services |

---

## Test Credentials

| Environment | Credentials |
|-------------|-------------|
| Restaurant 709 (Young Monk) | owner@youngmonk.com / admin123 |
| Restaurant 510 (Mygenie Dev) | owner@devmygenie.com / Qplazm@10 |
| Customer Test | phone: 7505242126, restaurant_id: 709 |

---

## Estimated Effort to Complete

| Phase | Effort | Priority |
|-------|--------|----------|
| Critical fixes | 2-3 days | P0 |
| High priority | 1 week | P1 |
| Medium priority | 2 weeks | P2 |
| Full cleanup | 3-4 weeks | P3 |

**Estimated Total: 3-4 weeks with 2 developers**
