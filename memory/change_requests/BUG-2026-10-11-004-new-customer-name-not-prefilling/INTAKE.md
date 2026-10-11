# INTAKE — BUG-2026-10-11-004
## New Customer Name Not Pre-filling on Review Order Page

**ID:** BUG-2026-10-11-004
**Date registered:** 2026-10-11
**Registered by:** Role 6 — Investigation Agent
**Source:** Owner report + screenshot + code trace (this session)
**Status:** INVESTIGATION COMPLETE — ready for Planning

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

## Owner Decisions — 2026-10-11

| Point | Decision |
|---|---|
| P1 — Send name to CRM on skip-otp | YES — confirmed CRM supports `name` field in skip-otp. Live probe approved. |
| P2 — CRM response populates review screen | OK — no extra work, fixed by P1 |
| P3 — Phone editable on review screen | ALLOW EDIT — phone remains editable |
| P4 — Phone changed → re-authenticate new customer | YES — call skip-otp again with new phone, new CRM token |
| P5 — Name changed on review → update CRM | YES — CRM brief sent, awaiting endpoint confirmation |

## Status

```
INVESTIGATION:  COMPLETE
OWNER DECISIONS: RECORDED (2026-10-11)
PLANNING:       NOT STARTED — blocked on P5 CRM reply
CRM brief:      memory/inbox/OUTBOUND_TO_CRM_NAME_UPDATE_ENDPOINT_2026-10-11.md
Gate:           Intake complete → await CRM reply for P5 → Planning
```
