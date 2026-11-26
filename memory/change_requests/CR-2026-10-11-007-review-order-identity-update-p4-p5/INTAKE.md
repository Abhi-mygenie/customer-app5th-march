# INTAKE — CR-2026-10-11-007
## ReviewOrder Identity Update — Phone Re-auth (P4) + Name Edit to CRM (P5)

**ID:** CR-2026-10-11-007
**Date registered:** 2026-10-11
**Registered by:** Role 1 — Intake Agent
**Source:** BUG-2026-10-11-004 owner decisions P4 + P5 (confirmed, CRM reply §1 §2 accepted)
**Status:** INTAKE COMPLETE — unblocked (PUT /scan/profile confirmed by CRM)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Severity | P2 — data inconsistency between app and CRM; order still places |
| Risk | CRITICAL — ReviewOrder.jsx is highest-risk file per addendum (Part C) |
| Blast radius | MEDIUM — affects customers who edit name or phone on review screen |
| Related | BUG-2026-10-11-004, CR-2026-10-11-006 |

---

## Background

Owner decisions P4 and P5 (from BUG-2026-10-11-004 intake) are now unblocked:
- **P4:** When customer changes phone on review screen → re-authenticate via skip-otp with new phone, get new CRM token, discard old
- **P5:** When customer changes name on review screen → call `PUT /scan/profile { name }` before placing order so CRM record stays in sync

CRM confirmed in §1 reply:
```
PUT /scan/profile
Auth: Bearer <customer crm token>
Body: { "name": "John" }
Response: 200 { "success": true, "message": "Profile updated", "data": null }
```

---

## Scope

### Item A — Add `crmUpdateProfile` to crmService.js

**Status: UNBLOCKED**

New function to add:
```javascript
/**
 * Update customer profile fields (name, etc.)
 * PUT /scan/profile — Bearer token required
 * Body: subset of { name, email, dob, ... }
 * Caveats: trim name before sending; skip call if empty; treat "No fields to update" as no-op
 */
export const crmUpdateProfile = async (token, fields) => {
  // trim name if present, skip if empty
  const sanitised = { ...fields };
  if ('name' in sanitised) {
    sanitised.name = (sanitised.name || '').trim();
    if (!sanitised.name) delete sanitised.name;
  }
  if (!Object.keys(sanitised).length) return { success: true }; // nothing to send
  try {
    await crmAuthFetch('/scan/profile', token, {
      method: 'PUT',
      body: JSON.stringify(sanitised),
    });
    return { success: true };
  } catch (err) {
    // "No fields to update" → treat as success
    if (err?.message?.includes('No fields to update')) return { success: true };
    throw err;
  }
};
```

**Files:** `frontend/src/api/services/crmService.js`
**Risk:** LOW (new function, no existing callers)

---

### Item B — P5: Name change on ReviewOrder → call crmUpdateProfile (ReviewOrder.jsx)

**Status: UNBLOCKED (depends on Item A)**

When `customerName` changes AND user is authenticated (has CRM token) AND the name differs from what was set at login:
- Call `crmUpdateProfile(crmToken, { name: customerName })` before placing the order (inside `handlePlaceOrder`)
- Do NOT call on every keystroke — only once, at place-order time, if name changed from login name
- Silently fail (toast.warn at most) — do not block order placement if CRM update fails

**Files:** `frontend/src/pages/ReviewOrder.jsx`
**Risk:** CRITICAL — ReviewOrder.jsx (full gate flow required per addendum Part C)

---

### Item C — P4: Phone change on ReviewOrder → re-authenticate via skip-otp (ReviewOrder.jsx)

**Status: UNBLOCKED**

When customer edits phone field on review screen and moves focus away (onBlur) or clicks Place Order:
- Detect phone changed from `user.phone`
- Call `crmSkipOtpWithRetry(newPhone, userId)`
- On success: `setCrmAuth(newToken, ...)` — discards old token, stores new one
- Then call `crmUpdateProfile(newToken, { name: customerName })` to set name on new account
- Handle: new customer (`is_new_customer: true`) vs existing (`false` — get profile for name/points)
- Rate limit: 5 per phone+restaurant per 300s — already handled by retry wrapper's 429 logic

**Files:** `frontend/src/pages/ReviewOrder.jsx` (also reads userId from RestaurantConfigContext)
**Risk:** CRITICAL — ReviewOrder.jsx + AuthContext interaction

---

## Owner Decisions (pre-recorded from BUG-2026-10-11-004)

| Point | Decision |
|---|---|
| P3 — Phone editable | YES — already editable, no change |
| P4 — Phone change → re-auth | YES — repeat skip-otp, new token, discard old |
| P5 — Name change → update CRM | YES — PUT /scan/profile before placing order |
| On P4 CRM profile enrichment | Call `crmGetProfile` after new skip-otp to get name/points/tier |
| On P5 failure | Silent fail — do not block order placement |
| On P4 rate limit (429) | Surface friendly message on review screen — do not auto-retry silently |

---

## New Dependency

`crmUpdateProfile` does not exist in crmService.js today. Item A must ship before Item B and C can be wired.

---

## CRM Contract (confirmed §1 + §2)

| Endpoint | Method | Auth | Body | Response |
|---|---|---|---|---|
| `/scan/profile` | PUT | Bearer customer token | `{ name, email, ... }` any subset | `200 { success: true, data: null }` |
| `/scan/auth/skip-otp` | POST | None | `{ phone, restaurant_id, country_code }` | `{ token, customer_id, is_new_customer, phone }` |
| `/scan/auth/me` | GET | Bearer customer token | — | Full profile with `name, tier, total_points` |

---

## Verification Matrix

| Test | Expected |
|---|---|
| Customer changes name "John" → "Johnny" on review → places order | CRM profile updated to "Johnny"; order placed; no blocking |
| Customer changes phone → repeat skip-otp → new token | ReviewOrder holds new CRM token; old token discarded from localStorage |
| crmUpdateProfile fails (CRM timeout) | Order still places; name update silently fails |
| Name NOT changed from login | crmUpdateProfile NOT called; no extra API call |
| Phone NOT changed | skip-otp NOT called again; no extra API call |
| P4 rate limit hit (5+ attempts) | Friendly 429 message on review screen |

---

## Status

```
INTAKE:         COMPLETE
PLANNING:       NOT STARTED
Gate:           Item A (crmService.js) → Planning immediately
                Item B + C (ReviewOrder.jsx) → Planning after Item A design confirmed
                Full gate flow required (CRITICAL risk per addendum Part C)
                Owner approval required before implementation of Item B + C
```
