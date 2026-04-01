# PRODUCTION CODE AUDIT REPORT V1

**Date:** March 31, 2026  
**Auditor:** CTO-Level Code Review  
**Scope:** Full-stack codebase audit for 10,000+ user scale  
**Overall Risk Rating:** HIGH

---

## Executive Summary

This codebase has **several critical security vulnerabilities and architectural issues** that MUST be fixed before production deployment at scale. The code quality is inconsistent, with some well-structured sections and others that are dangerous for production use.

**Total Issues Found: 29**
- Critical: 5 (1 resolved)
- High: 7
- Medium: 7
- Low: 7
- Architectural: 2

**Estimated Fix Time: 3-4 weeks with 2 developers**

---

## CRITICAL ISSUES (MUST FIX BEFORE PRODUCTION)

### CRITICAL-001: Hardcoded Credentials in Frontend

**Location:** `/app/frontend/src/utils/authToken.js` (Lines 12-13)

```javascript
const HARDCODED_PHONE = process.env.REACT_APP_LOGIN_PHONE || '+919579504871';
const HARDCODED_PASSWORD = process.env.REACT_APP_LOGIN_PASSWORD || 'Qplazm@10';
```

**Root Cause:** Credentials are hardcoded as fallback values and exposed in client-side bundle.

**Impact:**
- Credentials visible in browser DevTools/Network tab
- Anyone can authenticate as this user
- Potential account takeover
- **SEVERE security breach waiting to happen**

**Fix:** Remove hardcoded fallbacks entirely. Implement proper user authentication flow.

---

### CRITICAL-002: Weak JWT Secret with Fallback

**Location:** `/app/backend/server.py` (Line 28)

```python
JWT_SECRET = os.environ.get('JWT_SECRET', 'customer-app-secret-key-change-in-production')
```

**Root Cause:** Weak default secret key if env variable is missing.

**Impact:**
- JWT tokens can be forged
- Session hijacking
- Complete authentication bypass

**Fix:** Fail fast if JWT_SECRET is not set. No fallback.

```python
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set")
```

---

### CRITICAL-003: CORS Wildcard Configuration

**Location:** `/app/backend/server.py` (Line 1566)

```python
allow_origins=os.environ.get('CORS_ORIGINS', '*').split(',')
```

**Root Cause:** Default `*` allows any origin.

**Impact:**
- Cross-origin attacks
- Cookie theft
- CSRF vulnerabilities

**Fix:** Whitelist specific domains only. Never use `*` in production.

---

### CRITICAL-004: No Rate Limiting

**Location:** Entire backend (`/app/backend/server.py`)

**Root Cause:** No rate limiting middleware implemented.

**Impact at 10,000+ users:**
- DDoS vulnerability
- Brute force attacks on login
- API abuse
- Server resource exhaustion

**Fix:** Implement rate limiting using `slowapi` or similar:
- Login: 5 requests/minute per IP
- API: 100 requests/minute per user
- Order placement: 3 requests/minute per user

---

### CRITICAL-005: Razorpay Live Keys in Code

**Location:** `/app/frontend/src/pages/ReviewOrder.jsx` (Razorpay integration)

**Root Cause:** Using `rzp_live_*` keys directly.

**Impact:**
- Live payment credentials exposed
- Financial risk
- Payment fraud possible

**Fix:** Never expose live keys in frontend. Use backend as proxy.

---

### CRITICAL-006: Hardcoded POS API URL ✅ RESOLVED

**Location:** Multiple files (ReviewOrder.jsx, OrderSuccess.jsx)

```javascript
fetch('https://preprod.mygenie.online/api/v1/razor-pay/create-razor-order', ...
```

**Root Cause:** Hardcoded preprod URL instead of environment variable.

**Impact:**
- Will call preprod in production
- Payment failures
- Order data going to wrong environment

**Fix:** Use `process.env.REACT_APP_POS_API_URL`

**Status:** ✅ RESOLVED (March 31, 2026)
**Resolution:** Added RAZORPAY_CREATE_ORDER and RAZORPAY_VERIFY_PAYMENT to endpoints.js. Updated ReviewOrder.jsx and OrderSuccess.jsx to use ENDPOINTS pattern.

---

## HIGH PRIORITY ISSUES

### HIGH-001: No Error Boundaries in React

**Location:** Entire frontend

**Root Cause:** No `ErrorBoundary` component implemented.

**Impact:**
- Single component error crashes entire app
- White screen of death for users
- No error recovery

**Fix:** Implement error boundaries for route-level and critical components.

---

### HIGH-002: 129 Console.log Statements

**Location:** Throughout frontend codebase

**Root Cause:** Debug statements left in production code.

**Impact:**
- Performance degradation
- Sensitive data in browser console
- Unprofessional

**Fix:** Remove all console.log or use conditional logging.

---

### HIGH-003: Giant Components (God Components)

**Location:**
- `ReviewOrder.jsx` - 1,718 lines
- `AdminSettings.jsx` - 1,324 lines
- `MenuOrderTab.jsx` - 922 lines

**Root Cause:** Poor component architecture.

**Impact:**
- Unmaintainable code
- High re-render costs
- Memory issues
- Difficult to test

**Fix:** Decompose into smaller components (<100 lines each).

---

### HIGH-004: Race Condition in isMultipleMenu Navigation

**Location:** `/app/frontend/src/pages/LandingPage.jsx` (Line 252)

```javascript
if (isMultipleMenu(restaurant)) { // restaurant may be undefined
  navigate(`/${actualRestaurantId}/stations`);
}
```

**Root Cause:** No loading state check before navigation.

**Impact:**
- Inconsistent navigation between preprod/production
- User confusion
- Wrong page displayed

**Fix:** Check `!restaurantLoading && restaurant` before navigation decision.

---

### HIGH-005: Token Storage Mismatch

**Location:** Multiple files

**Issue:** Two different token storage keys used:
- `auth_token` (AuthContext, Login, PasswordSetup)
- `order_auth_token` (authToken.js)

**Impact:**
- Authentication state confusion
- Token conflicts
- Session issues

**Fix:** Consolidate to single token storage key.

---

### HIGH-006: Missing Request Deduplication

**Location:** Throughout API calls

**Root Cause:** 66 fetch/axios calls in pages without deduplication.

**Impact at 10,000+ users:**
- Duplicate API calls
- Server overload
- Wasted bandwidth

**Fix:** Use React Query's built-in deduplication consistently.

---

### HIGH-007: No Input Sanitization (XSS Risk)

**Location:** Customer inputs (name, phone, instructions)

**Root Cause:** User inputs rendered without sanitization.

**Impact:**
- XSS attacks
- Cookie theft
- Session hijacking

**Fix:** Sanitize all user inputs with DOMPurify or similar.

---

## MEDIUM ISSUES

### MEDIUM-001: localStorage/sessionStorage Without Encryption

**Location:** 40+ localStorage/sessionStorage calls

**Root Cause:** Sensitive data stored in plain text.

**Impact:**
- Token theft via XSS
- Customer data exposure
- PII compliance issues

**Fix:** Use encrypted storage or avoid storing sensitive data client-side.

---

### MEDIUM-002: Inconsistent Error Handling

**Location:** Multiple API calls

```javascript
catch (error) {
  console.error('Failed:', error);
  // No user feedback
}
```

**Impact:**
- Users don't know what went wrong
- Silent failures

**Fix:** Show user-friendly error messages for all failures.

---

### MEDIUM-003: No Request Timeout Cancellation

**Location:** API calls without AbortController

**Impact:**
- Memory leaks
- Stale responses updating UI
- Zombie requests

**Fix:** Implement AbortController for all async operations.

---

### MEDIUM-004: Duplicate checkTableStatus Calls

**Location:** LandingPage, ReviewOrder, OrderSuccess

**Root Cause:** Same API called multiple times in single flow.

**Impact:**
- Unnecessary server load
- Slower user experience

**Fix:** Centralize table status check, cache results.

---

### MEDIUM-005: No Retry Logic for Critical Operations

**Location:** Payment flow, Order placement

**Root Cause:** No automatic retry on network failure.

**Impact:**
- Orders lost on intermittent failures
- Payment state inconsistency

**Fix:** Implement exponential backoff retry for critical operations.

---

### MEDIUM-006: Missing Loading States

**Location:** Various components

**Root Cause:** Buttons/forms not disabled during API calls.

**Impact:**
- Duplicate submissions
- Duplicate orders
- Duplicate payments

**Fix:** Disable interactions during loading states.

---

### MEDIUM-007: Image Fallbacks Using Generic Logo

**Location:** LandingPage, AboutUs, Login

**Root Cause:** All restaurants fall back to MyGenie logo.

**Impact:**
- Brand confusion
- Unprofessional appearance

**Fix:** Use restaurant name as text fallback, not generic logo.

---

## LOW ISSUES / IMPROVEMENTS

### LOW-001: No Monitoring/Logging Infrastructure

**Impact:** No visibility into production issues.
**Fix:** Implement Sentry, LogRocket, or similar.

---

### LOW-002: No Health Check Endpoint

**Impact:** No automated health monitoring.
**Fix:** Add `/health` endpoint returning system status.

---

### LOW-003: Magic Numbers in Code

**Location:** Throughout codebase

```javascript
const TOKEN_EXPIRY_TIME = 10 * 60 * 1000; // Comment says 30 min, code is 10 min
setInterval(..., 60000); // What is 60000?
```

**Fix:** Use named constants.

---

### LOW-004: Inconsistent Naming Conventions

**Location:** Throughout codebase

- `multiple_menu` vs `multipleMenu`
- `food_for` vs `foodFor`

**Fix:** Standardize on one convention.

---

### LOW-005: Missing TypeScript

**Impact:** No type safety, runtime errors.
**Fix:** Migrate critical paths to TypeScript.

---

### LOW-006: No Unit Tests for Critical Paths

**Location:** Payment flow, order placement

**Impact:** Regression risk.
**Fix:** Add unit tests for critical business logic.

---

### LOW-007: Dead Code

**Location:**
- `AdminSettings.jsx` - Large unused sections
- Commented out code throughout

**Fix:** Remove dead code.

---

## ARCHITECTURAL CONCERNS

| Concern | Severity | Description |
|---------|----------|-------------|
| Monolithic Components | HIGH | Components should be <100 lines |
| No Caching Strategy | HIGH | React Query used inconsistently |
| No Error Boundaries | HIGH | App crashes on component errors |
| Mixed Async Patterns | MEDIUM | Mixing async/await with .then() |
| No State Machine | MEDIUM | Complex flows like payment need state machines |
| No Service Layer | LOW | Business logic mixed with UI |

---

## ANTI-PATTERNS DETECTED

1. **Prop Drilling** - Passing data through 5+ component levels
2. **God Components** - 1700+ line components
3. **Silent Failures** - catch blocks that only console.log
4. **Magic Strings** - Hardcoded API endpoints
5. **Premature Optimization** - useMemo/useCallback used incorrectly
6. **Temporal Coupling** - Operations that depend on timing

---

## SCALABILITY CONCERNS (10,000+ Users)

| Issue | Impact at Scale |
|-------|-----------------|
| No rate limiting | Server crash from abuse |
| No connection pooling | Database connection exhaustion |
| No CDN | Slow asset delivery |
| No caching headers | Repeated downloads |
| Large bundle size | Slow initial load |
| No lazy loading | High memory usage |
| Polling without throttling | Server overload |

---

## RECOMMENDED PRE-PRODUCTION CHECKLIST

### Must Do (Blockers):
- [ ] Remove hardcoded credentials
- [ ] Fix JWT secret fallback
- [ ] Fix CORS wildcard
- [ ] Add rate limiting
- [x] Move API URLs to environment variables (CRITICAL-006 FIXED)
- [ ] Add error boundaries

### Should Do (P1):
- [ ] Remove console.logs
- [ ] Split giant components
- [ ] Fix token storage mismatch
- [ ] Add input sanitization
- [ ] Fix race conditions

### Nice to Have (P2):
- [ ] Add monitoring
- [ ] Add health checks
- [ ] Improve error messages
- [ ] Add retry logic

---

## CODEBASE STATISTICS

| Metric | Value |
|--------|-------|
| Total Lines (Frontend Pages) | 7,082 |
| Total Lines (Backend) | 1,582 |
| Console.log statements | 129 |
| localStorage/sessionStorage calls | 40+ |
| API fetch calls in pages | 66 |
| Largest component | ReviewOrder.jsx (1,718 lines) |

---

## DOCUMENT HISTORY

| Date | Version | Changes |
|------|---------|---------|
| Mar 31, 2026 | V1 | Initial comprehensive audit |
