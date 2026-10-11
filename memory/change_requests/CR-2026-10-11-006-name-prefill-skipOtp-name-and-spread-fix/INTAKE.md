# INTAKE — CR-2026-10-11-006
## Customer Name Prefill — crmSkipOtp Name Param + Spread Fix

**ID:** CR-2026-10-11-006
**Date registered:** 2026-10-11
**Registered by:** Role 1 — Intake Agent
**Source:** BUG-2026-10-11-004 investigation closure + CRM reply (2026-10-11)
**Status:** INTAKE COMPLETE — RC-2 unblocked, RC-1 blocked on CRM deploy

---

## Classification

| Field | Value |
|---|---|
| Type | CR (Bug Fix) |
| Severity | P2 — UX gap, new customer must type name again; order still works |
| Risk | MEDIUM — LandingPage.jsx (HIGH risk per addendum) + crmService.js (LOW risk) |
| Blast radius | MEDIUM — affects every new customer on first order |
| Source bug | BUG-2026-10-11-004 RC-1 + RC-2 |
| Related | CR-2026-10-11-007 (P4 + P5), BUG-2026-10-11-004 |

---

## Scope

### Item A — Fix spread order in LandingPage.jsx line 456 (RC-2)

**Status: UNBLOCKED — can plan and implement now**

**Current code (buggy):**
```javascript
const customerProfile = { name, phone, ...(result.customer || {}) };
// result.customer.name = '' overwrites captured name = "John"
```

**Fix:**
```javascript
const customerProfile = { ...(result.customer || {}), name: name || result.customer?.name || '', phone };
// captured name wins; CRM name used only as fallback; phone always from form
```

**Files:** `frontend/src/pages/LandingPage.jsx` — line 456 only
**Risk:** MEDIUM (LandingPage is HIGH risk file; change is 1 line, self-contained)

---

### Item B — Add `name` param to crmSkipOtp (RC-1)

**Status: BLOCKED on CRM deploying skip-otp name support**

**Current code (crmService.js lines 299–306):**
```javascript
body: JSON.stringify({
  phone: stripPhonePrefix(phone),
  restaurant_id: restaurantId,
  country_code: '+91',
  // name NOT sent
}),
```

**Planned fix (once CRM ships):**
```javascript
body: JSON.stringify({
  phone: stripPhonePrefix(phone),
  restaurant_id: restaurantId,
  country_code: '+91',
  ...(name ? { name } : {}),  // only send if non-empty
}),
```

**Chain of changes needed:**
1. `crmService.js` — `crmSkipOtp(phone, userId)` → `crmSkipOtp(phone, userId, name = '')`
2. `crmSkipOtpRetry.js` — `crmSkipOtpWithRetry(phone, userId)` → `crmSkipOtpWithRetry(phone, userId, name = '')`; pass name to `crmSkipOtp`
3. `LandingPage.jsx` — call site passes `name` to `crmSkipOtpWithRetry`

**Files:** `frontend/src/api/services/crmService.js`, `frontend/src/api/services/crmSkipOtpRetry.js`, `frontend/src/pages/LandingPage.jsx`
**Risk:** LOW-MEDIUM (additive change, default `name=''` means zero regression if CRM not yet deployed)

---

## Owner Decisions

| Point | Decision |
|---|---|
| Item A (spread fix) | Proceed — unblocked |
| Item B-1 (name in skip-otp body) | **PRE-CODE** — ship now, activates when CRM CR-119 reaches production (D2 confirmed 2026-10-11) |
| Item B-2 (read name from response) | Proceed — unblocked (CR-119 live on preprod) |
| Item B-3 (add crmUpdateProfile) | Proceed — unblocked (moved from CR-007) |
| Item B-4 (call crmUpdateProfile for new customers in LandingPage) | Proceed — unblocked |
| Item C (AuthContext defensive merge) | **IN SCOPE** — confirmed (D1 confirmed 2026-10-11) |
| Sending empty name | Skip — only send `name` field if captured name is non-empty string after trim |
| Backward compat | Item B-1 uses default param `name=''` so existing callers are unaffected |

---

## Verification Matrix

| Test | Expected |
|---|---|
| New customer types "John" → Browse Menu → ReviewOrder | Name field shows "John" |
| New customer types "  " (whitespace only) → Browse Menu | Name not sent to CRM, field shows blank on review (correct) |
| Returning customer (existing CRM record) → Browse Menu | Name from CRM profile fills correctly — no regression |
| Item B: name sent in skip-otp (after CRM deploy) | `GET /scan/auth/me` returns `name: "John"` |
| Item B: not yet deployed (CRM drops name silently) | Item A fix still shows name correctly via spread fix |

---

## Status

```
INTAKE:          COMPLETE
IMPACT ANALYSIS: CLOSED — 2026-10-11 (D1 + D2 confirmed by owner)
PLANNING:        NOT STARTED
Gate:            IA CLOSED → Implementation Plan UNBLOCKED
                 All 6 items unblocked (B-1 pre-coded; activates on CRM CR-119 prod deploy)
Next:            Say "Implementation Plan for CR-2026-10-11-006"
```
