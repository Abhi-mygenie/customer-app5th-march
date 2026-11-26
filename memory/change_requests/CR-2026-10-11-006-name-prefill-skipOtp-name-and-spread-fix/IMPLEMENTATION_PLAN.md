# IMPLEMENTATION PLAN — CR-2026-10-11-006
## Customer Name Prefill — Full Fix

**ID:** CR-2026-10-11-006
**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-11
**Gate:** Impact Analysis CLOSED · D1 + D2 confirmed · Implementation unblocked
**Risk:** HIGH (AuthContext.jsx Item C — CRITICAL file)

---

## Pre-flight checklist (Role 3 must verify before touching any file)

- [ ] Current branch is `main` and repo is clean (`git status`)
- [ ] Services are running (`sudo supervisorctl status`)
- [ ] `yarn build` passes before any changes (establish baseline)
- [ ] No other active PRs/CRs touching the 4 files in scope
- [ ] `grep -n "CR-2026-10-11-006" /app/frontend/src/**/*.{js,jsx}` returns zero results (no stale markers)

---

## Files in scope

| File | Items | Risk |
|---|---|---|
| `frontend/src/api/services/crmService.js` | B-1, B-2, B-3 | LOW |
| `frontend/src/api/services/crmSkipOtpRetry.js` | B-1 pass-through + comment | LOW |
| `frontend/src/pages/LandingPage.jsx` | A, B-1 call site, B-4 | MEDIUM |
| `frontend/src/context/AuthContext.jsx` | C | HIGH (CRITICAL file) |

**Files NOT touched:** ReviewOrder.jsx, PasswordSetup.jsx, server.py, all others.

---

## Step 1 — `crmService.js`: Items B-1 + B-2 — crmSkipOtp name param + read from response

**File:** `frontend/src/api/services/crmService.js`
**Lines:** 297–314

**BEFORE:**
```javascript
export const crmSkipOtp = async (phone, userId) => {
  const restaurantId = getRestaurantIdFromUserId(userId);
  const data = await crmFetch('/scan/auth/skip-otp', {
    method: 'POST',
    body: JSON.stringify({
      phone: stripPhonePrefix(phone),
      restaurant_id: restaurantId,
      country_code: '+91', // CR-085-A: send separately for canonical matching
    }),
    userId, // used by crmFetch to resolve restaurant -> x-api-key
  });
  return {
    success: true,
    token: data?.token,
    customer: { id: data?.customer_id, phone: data?.phone, name: '' },
    is_new_customer: data?.is_new_customer,
  };
};
```

**AFTER:**
```javascript
export const crmSkipOtp = async (phone, userId, name = '') => {
  const restaurantId = getRestaurantIdFromUserId(userId);
  const data = await crmFetch('/scan/auth/skip-otp', {
    method: 'POST',
    body: JSON.stringify({
      phone: stripPhonePrefix(phone),
      restaurant_id: restaurantId,
      country_code: '+91', // CR-085-A: send separately for canonical matching
      // CR-2026-10-11-006 B-1: send name when captured (stored by CRM after CR-119 on prod)
      ...(name.trim() ? { name: name.trim() } : {}),
    }),
    userId, // used by crmFetch to resolve restaurant -> x-api-key
  });
  return {
    success: true,
    token: data?.token,
    // CR-2026-10-11-006 B-2: read name from response (CRM CR-119 returns it on preprod)
    customer: { id: data?.customer_id, phone: data?.phone, name: data?.name || '' },
    is_new_customer: data?.is_new_customer,
  };
};
```

**Self-test after step 1:**
- `grep "crmSkipOtp = async" crmService.js` → shows `(phone, userId, name = '')`
- `grep "name: data" crmService.js` → shows `name: data?.name || ''`
- `grep "name: ''" crmService.js` → returns 0 results for the skip-otp return (other functions may still have it — do not touch those)

---

## Step 2 — `crmService.js`: Item B-3 — add `crmUpdateProfile`

**File:** `frontend/src/api/services/crmService.js`
**Position:** Insert AFTER the closing `};` of `crmGetProfile` (after line ~414). Place in the Profile section.

**Add this block:**
```javascript
/**
 * CR-2026-10-11-006 B-3: Update customer profile fields.
 * PUT /scan/profile — Bearer customer token required.
 * Body: any subset of { name, email, dob, anniversary, gender, ... }
 *
 * Caveats:
 *  - CRM accepts empty string for name and blanks the stored value.
 *    Always trim; skip the call entirely if name reduces to ''.
 *  - "No fields to update" → CRM returns success:false (200) → treat as no-op.
 */
export const crmUpdateProfile = async (token, fields) => {
  const sanitised = { ...fields };
  if ('name' in sanitised) {
    sanitised.name = (sanitised.name || '').trim();
    if (!sanitised.name) delete sanitised.name;
  }
  if (!Object.keys(sanitised).length) return { success: true };
  try {
    await crmAuthFetch('/scan/profile', token, {
      method: 'PUT',
      body: JSON.stringify(sanitised),
    });
    return { success: true };
  } catch (err) {
    // CRM returns success:false / "No fields to update" as a business error — not a failure
    if (err?.message?.includes('No fields to update')) return { success: true };
    throw err;
  }
};
```

**Self-test after step 2:**
- `grep "crmUpdateProfile" crmService.js` → shows the new export
- `grep "PUT.*profile\|scan/profile" crmService.js` → shows `/scan/profile` in the new function only
- Function body has `delete sanitised.name` guard for empty string

---

## Step 3 — `crmSkipOtpRetry.js`: Item B-1 pass-through + stale comment update

**File:** `frontend/src/api/services/crmSkipOtpRetry.js`

**Edit 3a — update stale comment (line 7):**

BEFORE:
```
 *  - The bare `crmSkipOtp` is still called by `PasswordSetup.handleSkip`
 *    (the manual "Skip for now" button). That call site keeps today's
 *    single-shot behaviour. Risk isolation.
```

AFTER:
```
 *  - The bare `crmSkipOtp` is also importable for single-shot use.
 *    CR-2026-10-08-001: PasswordSetup route removed — that call site is dead code.
 *    Default name='' keeps it backward-compatible.
```

**Edit 3b — update JSDoc @param (lines 29–35):**

BEFORE:
```javascript
/**
 * @param {string} phone   - raw phone (passed straight to crmSkipOtp)
 * @param {string} userId  - "pos_{posId}_restaurant_{restaurantId}" string
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=3]
 * @param {number} [opts.baseDelayMs=500]
 * @param {number} [opts.maxDelayMs=4000]
 * @returns {Promise<{token, customer, success, is_new_customer}>}
 */
```

AFTER:
```javascript
/**
 * @param {string} phone      - raw phone (passed straight to crmSkipOtp)
 * @param {string} userId     - "pos_{posId}_restaurant_{restaurantId}" string
 * @param {string} [name='']  - customer name to store (CR-2026-10-11-006 B-1)
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=3]
 * @param {number} [opts.baseDelayMs=500]
 * @param {number} [opts.maxDelayMs=4000]
 * @returns {Promise<{token, customer, success, is_new_customer}>}
 */
```

**Edit 3c — signature (line 37):**

BEFORE:
```javascript
export const crmSkipOtpWithRetry = async (phone, userId, opts = {}) => {
  const { maxAttempts = 3, baseDelayMs = 500, maxDelayMs = 4000 } = opts;
```

AFTER:
```javascript
export const crmSkipOtpWithRetry = async (phone, userId, name = '', opts = {}) => {
  const { maxAttempts = 3, baseDelayMs = 500, maxDelayMs = 4000 } = opts;
```

**Edit 3d — inner call (line 44):**

BEFORE:
```javascript
      return await crmSkipOtp(phone, userId);
```

AFTER:
```javascript
      return await crmSkipOtp(phone, userId, name); // CR-2026-10-11-006 B-1
```

**Self-test after step 3:**
- `grep "crmSkipOtpWithRetry = async" crmSkipOtpRetry.js` → shows `(phone, userId, name = '', opts = {})`
- `grep "crmSkipOtp(phone" crmSkipOtpRetry.js` → shows `crmSkipOtp(phone, userId, name)`
- No other callers of `crmSkipOtp` in this file

---

## Step 4 — `LandingPage.jsx`: Item A — spread order fix

**File:** `frontend/src/pages/LandingPage.jsx`
**Line:** 456

BEFORE:
```javascript
        const customerProfile = { name, phone, ...(result.customer || {}) };
```

AFTER:
```javascript
        // CR-2026-10-11-006 A: spread result.customer first — captured name wins over CRM empty string
        const customerProfile = { ...(result.customer || {}), name: name || result.customer?.name || '', phone };
```

**Self-test after step 4:**
- `grep "customerProfile = {" LandingPage.jsx` → shows spread-first pattern
- `grep "name, phone, \.\.\." LandingPage.jsx` → returns 0 results (old pattern gone)

---

## Step 5 — `LandingPage.jsx`: Item B-1 call site + B-4 crmUpdateProfile call

**File:** `frontend/src/pages/LandingPage.jsx`

**Edit 5a — add `crmUpdateProfile` to import (line 19):**

BEFORE:
```javascript
import { buildUserId, crmLookupCustomer } from '../api/services/crmService';
```

AFTER:
```javascript
import { buildUserId, crmLookupCustomer, crmUpdateProfile } from '../api/services/crmService';
```

**Edit 5b — pass `name` to retry wrapper (line 454):**

BEFORE:
```javascript
      const result = await crmSkipOtpWithRetry(phone, userId);
```

AFTER:
```javascript
      const result = await crmSkipOtpWithRetry(phone, userId, name); // CR-2026-10-11-006 B-1
```

**Edit 5c — call crmUpdateProfile for new customers (lines 455–458):**

BEFORE:
```javascript
      if (result?.token) {
        const customerProfile = { ...(result.customer || {}), name: name || result.customer?.name || '', phone };
        setCrmAuth(result.token, customerProfile, rid);
      }
```

AFTER:
```javascript
      if (result?.token) {
        const customerProfile = { ...(result.customer || {}), name: name || result.customer?.name || '', phone };
        setCrmAuth(result.token, customerProfile, rid);
        // CR-2026-10-11-006 B-4: pre-CR-119 prod path — store name via PUT /scan/profile
        // (skip-otp accepts name on preprod but not on production until CR-119 ships)
        if (result.is_new_customer && name.trim()) {
          crmUpdateProfile(result.token, { name: name.trim() }).catch(() => {});
        }
      }
```

**Self-test after step 5:**
- `grep "crmUpdateProfile" LandingPage.jsx` → shows import + call
- `grep "crmSkipOtpWithRetry(phone" LandingPage.jsx` → shows `(phone, userId, name)`
- `grep "is_new_customer && name" LandingPage.jsx` → shows the new guard

---

## Step 6 — `AuthContext.jsx`: Item C — defensive name merge

**File:** `frontend/src/context/AuthContext.jsx`
**Lines:** 156–160

BEFORE:
```javascript
    crmGetProfile(newCrmToken).then(fullProfile => {
      if (fullProfile) setUser(fullProfile);
    }).catch(() => {
      // Silently fail — partial profile is acceptable fallback
    });
```

AFTER:
```javascript
    crmGetProfile(newCrmToken).then(fullProfile => {
      if (fullProfile) {
        // CR-2026-10-11-006 C: preserve captured name if CRM async enrichment returns blank
        // (guard for pre-CR-119 prod window — no-op once CRM stores name correctly)
        const merged = { ...fullProfile };
        if (!merged.name && customerProfile?.name) merged.name = customerProfile.name;
        setUser(merged);
      }
    }).catch(() => {
      // Silently fail — partial profile is acceptable fallback
    });
```

**Self-test after step 6:**
- `grep "CR-2026-10-11-006 C" AuthContext.jsx` → shows the marker
- `grep "merged.name" AuthContext.jsx` → shows defensive merge
- `grep "setUser(fullProfile)" AuthContext.jsx` → returns 0 results (replaced by `setUser(merged)`)
- No other changes to `setCrmAuth` function — only the `.then()` callback is modified

---

## Step 7 — Build verification

```bash
cd /app/frontend && yarn build 2>&1 | tail -20
```

Expected: clean build, no errors. One pre-existing lint warning (unchanged) is acceptable.

---

## Step 8 — Code marker verification

```bash
grep -rn "CR-2026-10-11-006" /app/frontend/src/
```

Expected output — exactly these locations:
```
crmService.js          — B-1 comment in body, B-2 comment in return
crmSkipOtpRetry.js     — B-1 comment in inner call
LandingPage.jsx        — A comment, B-1 comment, B-4 comment
AuthContext.jsx        — C comment
```

---

## Verification matrix (for QA handover)

| Test | Files exercised | Expected |
|---|---|---|
| New customer "John" + phone → Browse Menu → ReviewOrder | LandingPage + crmService + AuthContext | Name "John" pre-filled, no flash, no blank |
| Returning customer "Alok" → Browse Menu | crmService + AuthContext | Name "Alok" from CRM response — no regression |
| New customer, name whitespace only → Browse Menu | LandingPage + crmService | crmUpdateProfile NOT called; name blank on review (correct) |
| crmGetProfile resolves before React commits ReviewOrder | AuthContext Item C | `merged.name` preserves "John" — no overwrite |
| crmUpdateProfile called for new customer | LandingPage + crmService | `PUT /scan/profile {"name":"John"}` fires fire-and-forget |
| crmUpdateProfile called with empty name | crmService | Call skipped entirely — guard `delete sanitised.name` fires |
| Existing customer (is_new_customer: false) | LandingPage | crmUpdateProfile NOT called — guard `result.is_new_customer` is false |
| `yarn build` | All | Clean, 0 errors |
| PasswordSetup "Skip" (dead code) | PasswordSetup + crmService | Backward-compat — default `name=''` — no change in behaviour |

---

## Exit gate checklist (Role 3 must confirm all before handing to QA)

```
[ ] 1. All 6 step edits applied exactly as specified
[ ] 2. Code markers present in all 4 files (Step 8 grep passes)
[ ] 3. yarn build clean (Step 7)
[ ] 4. Self-test for each step passes
[ ] 5. No other files changed beyond the 4 in scope
[ ] 6. QA handover written
[ ] 7. Session handover written
```

---

## Scope lock

**WILL change:** crmService.js, crmSkipOtpRetry.js, LandingPage.jsx, AuthContext.jsx
**WILL NOT change:** ReviewOrder.jsx, PasswordSetup.jsx, server.py, index.js, App.js,
CartContext.js, RestaurantConfigContext.jsx, any other file

If any file not listed above needs to change → STOP and escalate to owner.

---

```
Planning complete: CR-2026-10-11-006
Stage: Implementation Plan — COMPLETE
Risk: HIGH (AuthContext.jsx)
Files WILL change: 4 (listed above)
Files WILL NOT touch: all others
Owner decisions: D1 ✅ D2 ✅ — no further decisions required
Scope lock: declared above
Docs: CR-2026-10-11-006/IMPLEMENTATION_PLAN.md (this file)
Next: Role 3 — Implementation (say "Implement CR-2026-10-11-006")
```
