# INVESTIGATION REPORT — BUG-2026-10-11-004
## New Customer Name Not Pre-filling on Review Order Page

**ID:** BUG-2026-10-11-004
**Investigator:** Role 6 — Investigation Agent
**Date:** 2026-10-11
**Steps used:** 8 / 10
**Status:** CLOSED

---

## Hypotheses Formed

| H | Hypothesis | Verdict |
|---|---|---|
| H1 | Name is captured on landing but overwritten by CRM response spread | CONFIRMED — RC-2 |
| H2 | CRM never receives name so profile always returns `name:''` | CONFIRMED — RC-1 |
| H3 | ReviewOrder reads name from wrong source / wrong auth gate | CONFIRMED — RC-3 + RC-4 |

---

## Evidence — Code Traces

### RC-1 — crmService.js line 311: `name:''` hardcoded

```javascript
// crmSkipOtp (lines 297–313)
body: JSON.stringify({
  phone: stripPhonePrefix(phone),
  restaurant_id: restaurantId,
  country_code: '+91',
  // ← name NEVER sent
}),
return {
  customer: { id: data?.customer_id, phone: data?.phone, name: '' }, // ← HARDCODED ''
  is_new_customer: data?.is_new_customer,
};
```

CRM confirmed (§0): skip-otp request contract is `{ phone, restaurant_id, country_code? }` only.
`name` was silently dropped until CRM ships the name field support.
**Owner ruling 2026-10-11:** CRM WILL add `name` support. Blocked on their deploy.

---

### RC-2 — LandingPage.jsx line 456: spread overwrites captured name

```javascript
// BEFORE (buggy)
const customerProfile = { name, phone, ...(result.customer || {}) };
//   name = "John" (captured)
//   result.customer = { id: 123, phone: "...", name: '' }
//   After spread: { name: '', id: 123, phone: '...' } ← '' wins
```

`name` from form is declared first; `result.customer.name: ''` spread last → overwrites.
JavaScript spread is left-to-right, last key wins. `name: ''` beats `name: "John"`.
**Status: UNBLOCKED — 2-line fix. Registered as CR-2026-10-11-006.**

---

### RC-3 — ReviewOrder.jsx line 316: localStorage gate behind `!isAuthenticated`

```javascript
useEffect(() => {
  if (!isAuthenticated && !customerName && !customerPhone) {
  //   ↑ FALSE after skip-otp — user IS authenticated → block NEVER runs
    const savedGuest = localStorage.getItem('guestCustomer');
    // guestCustomer WAS saved at LandingPage line 462: { name: "John", phone, restaurantId }
    // but NEVER READ because gate fails
  }
}, [isAuthenticated, ...]);
```

The `guestCustomer` localStorage entry contains the correct name (saved at LandingPage line 462,
AFTER the buggy customerProfile). But ReviewOrder only reads it when user is NOT authenticated.
After skip-otp the user IS authenticated → backup silently ignored.
**Status: Resolved as side effect of RC-2 fix (correct name in user.name from the start).**

---

### RC-4 — AuthContext.jsx line 156: async enrichment returns `name:''`

```javascript
setCrmAuth(token, customerProfile, rid) {
  setUser(customerProfile);  // customerProfile.name = '' (from RC-2 spread bug)
  crmGetProfile(newCrmToken).then(fullProfile => {
    setUser(fullProfile);    // fullProfile.name = '' (CRM never stored it — RC-1)
  });
}
```

Even if we fix RC-2 (immediate state has correct name), the async `crmGetProfile` overwrites it
with `name:''` from CRM (because CRM never stored the name — RC-1).
**Status: Resolved once RC-1 ships (CRM will store name on skip-otp) + RC-2 prevents race.**

---

## Why Phone Works But Name Doesn't

Phone comes from CRM response (`data.phone` in skip-otp). CRM received phone and returns it.
Name was NEVER sent to CRM. CRM returns `name:''`. Spread overwrites. Blank on review screen.

---

## CRM Reply Validation Summary (2026-10-11)

| § | CRM Claim | Code-verified | Owner Ruling |
|---|---|---|---|
| §0 | skip-otp ignores `name` currently | CONFIRMED — our code never sent it | OVERTURNED — CRM will add support |
| §1 | `PUT /scan/profile` exists for name update | NOT YET IN CODE — `crmUpdateProfile` missing | ACCEPTED — unblocks P5 |
| §2 | Repeat skip-otp for phone change | CONFIRMED — existing `crmSkipOtp` supports this | ACCEPTED — unblocks P4 |
| §3 | Move skip-otp to Place Order | Architectural change to LandingPage + ReviewOrder | REJECTED — keep at Browse Menu |

---

## Root Cause Summary

```
Investigation complete: BUG-2026-10-11-004
Root cause: CONFIRMED — 4 root causes, all code-verified
  RC-1: crmService.js name:'' hardcoded, never sent (blocked on CRM deploy)
  RC-2: LandingPage.jsx spread order overwrites captured name (unblocked)
  RC-3: ReviewOrder localStorage gate fails after authentication (side-effect of RC-2 fix)
  RC-4: AuthContext async enrichment returns name:'' from CRM (side-effect of RC-1 fix)
Classification: FE (RC-2, RC-3, RC-4) + API_CONTRACT (RC-1 — skip-otp limitation)
Confidence: HIGH
Steps used: 8/10
Evidence: crmService.js:297-313, LandingPage.jsx:454-462, ReviewOrder.jsx:316-343,
          AuthContext.jsx:144-161
Recommendation: Planning — CR-2026-10-11-006 (RC-2 now + RC-1 when CRM deploys)
                           CR-2026-10-11-007 (ReviewOrder P4+P5)
Report: this file
```
