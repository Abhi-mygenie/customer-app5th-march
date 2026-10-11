# INTAKE — BUG-2026-10-11-004
## New Customer Name Not Pre-filling on Review Order Page

**ID:** BUG-2026-10-11-004
**Date registered:** 2026-10-11
**Registered by:** Role 6 — Investigation Agent
**Source:** Owner report + screenshot + code trace (this session)
**Status:** INVESTIGATION CLOSED — 2026-10-11 (CRM reply received, owner decisions updated)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 — UX gap, customer must type name manually; order still goes through |
| Risk | MEDIUM — LandingPage.jsx + AuthContext.jsx involved |
| Blast radius | MEDIUM — affects every new customer (not in CRM yet) on first order |
| Duplicate check | DISTINCT — INV-2026-10-11-001 I4 covered wrong CRM URL; this is different |

---

## Symptom (as reported by owner)

New customer enters phone number and name on landing page.
Clicks Browse Menu.
Reaches review order page.
Phone shows correctly as +91 XXXXX XXXXX.
Name field shows blank — "Enter your name" placeholder.
Customer has to type their name again manually.

---

## What Is NOT the Issue

- I4 from INV-2026-10-11-001 was about RETURNING customers whose name should come
  from CRM lookup (`crmLookupCustomer`). That was fixed by correcting REACT_APP_CRM_URL.
- This bug is about NEW customers (not in CRM). Their name is typed on landing page
  but does not carry through to review order page.
- The +91 prefix on phone is CORRECT behaviour (E.164 format) — not a bug.

---

## Root Cause — Confirmed (HIGH confidence)

### RC-1 — crmSkipOtp hardcodes name: '' (crmService.js line 311)

```javascript
export const crmSkipOtp = async (phone, userId) => {
  // POST /scan/auth/skip-otp — body has phone + restaurant_id + country_code
  // NAME IS NOT SENT TO CRM ← gap
  return {
    success: true,
    token: data?.token,
    customer: { id: data?.customer_id, phone: data?.phone, name: '' }, // ← HARDCODED ''
    is_new_customer: data?.is_new_customer,
  };
};
```

CRM is never given the customer's name. CRM creates the new account with phone only.
`name: ''` is hardcoded regardless of what CRM returns.

### RC-2 — Spread order overwrites captured name (LandingPage.jsx line 456)

```javascript
const customerProfile = { name, phone, ...(result.customer || {}) };
// name = "John" (typed on landing page)
// result.customer = { id: 123, phone: "...", name: '' }
// After spread: { name: '', id: 123, phone: '...' }
//                      ↑ empty string from result.customer WINS
```

JavaScript spread applies right-to-left. `result.customer.name: ''` comes last
and overwrites `name: "John"`.

### RC-3 — localStorage fallback is gated behind !isAuthenticated (ReviewOrder.jsx line 316)

```javascript
useEffect(() => {
  if (!isAuthenticated && !customerName && !customerPhone) {
  //   ↑ FALSE — user IS authenticated after skip-otp → this block NEVER runs
    const savedGuest = localStorage.getItem('guestCustomer');
    // localStorage DID have name: "John" saved at line 461-462
    // but it is NEVER READ because user is authenticated
  }
}, [...]);
```

The localStorage backup (`guestCustomer`) contains the correct name "John"
(saved at LandingPage line 461). But ReviewOrder only reads it for
unauthenticated users. After skip-otp the user IS authenticated → backup ignored.

### RC-4 — AuthContext uses corrupted profile (AuthContext.jsx line 156-160)

```javascript
setCrmAuth(token, { name: '', ... }, rid)   // sets user.name = ''
crmGetProfile(token).then(fullProfile => {
  setUser(fullProfile);                      // CRM returns name: '' (we never sent it)
});
```

CRM enriches the profile asynchronously but returns `name: ''` because
the name was never sent to CRM during skip-otp.

ReviewOrder line 348:
```javascript
if (user.name && !customerName) setCustomerName(user.name);
//   user.name = '' → falsy → setCustomerName is NEVER called → blank field
```

---

## Why Phone Works But Name Doesn't

Phone comes from CRM response (`data.phone`) — CRM received the phone and returns it.
Phone is formatted to E.164 (`+91` prefix added in ReviewOrder line 352) for correct display.

Name was NEVER sent to CRM. CRM returns `name: ''`. Spread overwrites. Blank on page.

---

## Proposed Fix Options

| Option | Files | Risk | CRM change? |
|---|---|---|---|
| **A (Recommended)** | LandingPage.jsx line 456 — reverse spread order: prefer captured name over empty CRM value | LOW | No |
| **B** | Also send name to CRM in skip-otp POST body so CRM stores it from creation | MEDIUM | Yes — CRM must accept name field |
| **C** | Fix localStorage fallback in ReviewOrder to also read when `user.name` is empty even if authenticated | MEDIUM | No |

**Option A alone fixes the immediate symptom.** Two lines change.

Fix for Option A:
```javascript
// BEFORE (line 456)
const customerProfile = { name, phone, ...(result.customer || {}) };

// AFTER — BUG-2026-10-11-004
const customerProfile = { ...(result.customer || {}), name: name || result.customer?.name || '', phone };
// captured name wins over empty CRM value; CRM name wins if captured name is empty
```

---

## Owner Decisions — 2026-10-11 (original + CRM reply rulings)

| Point | Decision |
|---|---|
| P1 — Send name to CRM on skip-otp | YES — CRM will ADD `name` support to skip-otp (§0 overturned 2026-10-11). Our code change BLOCKED on CRM deploy. |
| P2 — CRM response populates review screen | OK — resolved as side effect of P1 once CRM deploys |
| P3 — Phone editable on review screen | ALLOW EDIT — phone remains editable |
| P4 — Phone changed → re-authenticate new customer | YES — repeat skip-otp, discard old token, then crmGetProfile for name/points |
| P5 — Name changed on review → update CRM | YES — `PUT /scan/profile` confirmed by CRM (§1), unblocked |

## CRM Reply Rulings — 2026-10-11

| § | CRM Claim | Owner Ruling |
|---|---|---|
| §0 | skip-otp currently ignores `name` (silently drops) | **OVERTURNED** — CRM will add `name` support. Blocked on their deploy. |
| §1 | `PUT /scan/profile` exists today | **ACCEPTED** — unblocks P5 |
| §2 | Repeat skip-otp for phone change works | **ACCEPTED** — unblocks P4 |
| §3 | Move skip-otp to Place Order timing | **REJECTED** — coupons need early token. Keep at Browse Menu. Future edge cases handled when they arise. |

## Investigation Summary (Role 6 — 2026-10-11)

All 4 root causes code-verified. Full report: `INVESTIGATION_REPORT.md`

| RC | File | Line | Confirmed | Unblocked |
|---|---|---|---|---|
| RC-1 | crmService.js | 311 | `name:''` hardcoded, never sent to CRM | Blocked on CRM deploy |
| RC-2 | LandingPage.jsx | 456 | `...(result.customer)` spread overwrites captured name | Unblocked now |
| RC-3 | ReviewOrder.jsx | 316 | localStorage read gated behind `!isAuthenticated` | Resolved by RC-2 fix |
| RC-4 | AuthContext.jsx | 156 | async `crmGetProfile` returns `name:''` (CRM never stored it) | Resolved once RC-1 ships |

## Status

```
INVESTIGATION:   CLOSED — 2026-10-11
OWNER DECISIONS: UPDATED (CRM reply rulings recorded)
PLANNING:        NOT STARTED — split into two CRs
CRs raised:      CR-2026-10-11-006 (RC-2 spread fix + RC-1 name send — RC-2 unblocked now, RC-1 blocked on CRM deploy)
                 CR-2026-10-11-007 (ReviewOrder P4 phone reauth + P5 name edit via PUT /scan/profile)
Gate:            Investigation CLOSED → Planning on CR-006 RC-2 unblocked
                                      → Planning on CR-006 RC-1 blocked on CRM deploy
                                      → Planning on CR-007 unblocked (PUT /scan/profile confirmed)
```
