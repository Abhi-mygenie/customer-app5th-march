# IMPACT ANALYSIS — CR-2026-10-11-006
## Customer Name Prefill — Spread Fix + crmSkipOtp Name Param

**ID:** CR-2026-10-11-006
**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-11
**Source:** BUG-2026-10-11-004 (4 root causes), CR-2026-10-11-006 INTAKE

---

## 0. Live CRM Validation — 2026-10-11 (post-preprod deploy)

**New CRM URL (owner updated):** `https://mygenie-crm-preprod.preview.emergentagent.com/api`
**CR-119 status:** LIVE on this preprod pod. NOT yet on production.

| Probe | Result | Impact on plan |
|---|---|---|
| skip-otp + `name:"FreshCustomer"` → response | `data.name = "FreshCustomer"` returned ✅ | crmSkipOtp must read `data?.name` from response (currently hardcodes `name:''`) |
| skip-otp without name field | `data.name = ''` | Until CR-119 on prod: must call PUT /scan/profile for new customers |
| PUT /scan/profile `{"name":"ValidatedName"}` | `200 success:true`, GET /me confirms ✅ | Endpoint confirmed working |
| PUT /scan/profile `{"name":""}` | `200 success:true` — blanks stored name | Must trim + skip call if name is empty string |
| Repeat skip-otp new phone | New token, is_new_customer:true ✅ | Phone change re-auth confirmed |

**New mandatory item added to scope (see Item B-2 below):** crmSkipOtp must map `data?.name` from response.
**crmUpdateProfile scope change:** Function needed in LandingPage (pre-CR-119 path). Moving add from CR-007 into CR-006 crmService.js step.

---

## 1. Code Reality Check

| Item | Status | Evidence |
|---|---|---|
| RC-2 — spread bug at LandingPage.jsx:456 | CONFIRMED in code | `{ name, phone, ...(result.customer || {}) }` — `result.customer.name:''` overwrites captured name |
| RC-1 — name never sent to CRM | CONFIRMED in code | crmService.js:299–306 sends `{ phone, restaurant_id, country_code }` only |
| PasswordSetup.jsx still calls bare `crmSkipOtp` | CONFIRMED — but DEAD CODE | App.js (CR-2026-10-08-001) commented out import, route redirects to landing. File exists, route unreachable. |
| `crmSkipOtpWithRetry` only caller | CONFIRMED | Only `LandingPage.jsx:454` imports and calls it |

---

## 2. New Finding — Race Condition in AuthContext.jsx (not in INTAKE)

**Severity: HIGH — Item A alone is an incomplete fix**

`AuthContext.jsx` lines 156–161 (`setCrmAuth`):
```javascript
crmGetProfile(newCrmToken).then(fullProfile => {
  if (fullProfile) setUser(fullProfile);  // ← unconditional overwrite
}).catch(() => {});
```

**What happens after Item A fix only:**

```
1. LandingPage: name = "John" (captured)
2. Item A fix: customerProfile = { ...(result.customer), name: "John", phone }  ← correct
3. setCrmAuth sets user.name = "John"  ← correct
4. setCrmAuth fires crmGetProfile async (NOT awaited)
5. navigateAfterSkip → React navigates to ReviewOrder
6. ReviewOrder mounts → reads user.name = "John"  ← appears correct
7. [50–300ms later] crmGetProfile resolves → fullProfile.name = ''
8. setUser(fullProfile) overwrites → user.name = ''  ← name disappears mid-screen
```

Step 8 is a state update after mount. React will re-render ReviewOrder.
The name field will flash blank after appearing correct. Or — if CRM responds before
React has committed the ReviewOrder render — the name was never shown.

**Fix required (Item C — new scope addition to CR-006):**

In `setCrmAuth`, preserve non-empty captured name when CRM returns blank:
```javascript
crmGetProfile(newCrmToken).then(fullProfile => {
  if (fullProfile) {
    // BUG-2026-10-11-004 RC-4: CRM returns name:'' until skip-otp name support ships.
    // Preserve captured name so review screen doesn't flash blank after enrichment.
    const merged = { ...fullProfile };
    if (!merged.name && customerProfile?.name) merged.name = customerProfile.name;
    setUser(merged);
  }
}).catch(() => {});
```

This is defensive: when CRM eventually ships name support, `merged.name` will be non-empty
from CRM and the condition `!merged.name` is false — no behaviour change. Zero regression risk.

**File:** `frontend/src/context/AuthContext.jsx` — 3 lines inside existing `.then()` callback
**Risk:** CRITICAL (AuthContext is highest-risk file per addendum §6.2 + Part C)
**Owner decision required:** D1 — include in CR-006 or separate CR?

---

## 3. Full Affected Files

### Files WILL change

| File | Risk (addendum) | What changes | Lines |
|---|---|---|---|
| `frontend/src/pages/LandingPage.jsx` | HIGH (§6.7) | Item A: spread order line 456 | 1 |
| `frontend/src/api/services/crmService.js` | LOW | Item B: `crmSkipOtp` adds `name=''` param, sends name in body if non-empty | ~5 |
| `frontend/src/api/services/crmSkipOtpRetry.js` | LOW | Item B: signature pass-through + stale comment update | ~3 |
| `frontend/src/context/AuthContext.jsx` | CRITICAL (§6.2) | Item C (new): defensive name merge in crmGetProfile callback | 3 |

### Files WILL NOT change

| File | Reason |
|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | Scoped to CR-2026-10-11-007 |
| `frontend/src/pages/PasswordSetup.jsx` | Dead code (route removed CR-2026-10-08-001). Default `name=''` param is backward-compat — no change needed. |
| `frontend/src/api/services/index.js` | No re-export of crmSkipOtp needed |
| `backend/server.py` | No backend change |
| All other files | Not in data flow |

---

## 4. Data Flow — Before vs After

### BEFORE (buggy)

```
LandingPage form → name="John", phone="91..."
  ↓
crmSkipOtpWithRetry(phone, userId)
  → crmSkipOtp(phone, userId)
     POST /scan/auth/skip-otp { phone, restaurant_id, country_code }
     ← { token, customer_id, is_new_customer, phone }
  ← { success, token, customer: { id, phone, name:'' }, is_new_customer }
  ↓
customerProfile = { name:"John", phone, ...{ id, phone, name:'' } }
                = { name:'', id, phone }   ← RC-2: '' wins
  ↓
setCrmAuth(token, { name:'', ... }, rid)
  setUser({ name:'' })                     ← RC-4: user.name = ''
  crmGetProfile async → fullProfile.name='' → setUser({ name:'' })
  ↓
ReviewOrder: user.name='' → setCustomerName not called → blank field
```

### AFTER (Item A + Item B + Item C fixed)

```
LandingPage form → name="John", phone="91..."
  ↓
crmSkipOtpWithRetry(phone, userId, name="John")   ← Item B
  → crmSkipOtp(phone, userId, name="John")
     POST /scan/auth/skip-otp { phone, restaurant_id, country_code, name:"John" }
     (CRM stores name:"John" once they deploy name support)
  ← { success, token, customer: { id, phone, name:'' }, is_new_customer }
  (skip-otp response still has no name field — CRM hasn't added it to response yet)
  ↓
customerProfile = { ...{ id, phone, name:'' }, name:"John"||''||'', phone }
               = { id, phone, name:"John" }   ← Item A: captured name wins
  ↓
setCrmAuth(token, { name:"John", ... }, rid)
  setUser({ name:"John" })                   ← immediate: correct
  crmGetProfile async → fullProfile.name=''
    merged = { ...fullProfile, name:"John" } ← Item C: preserved from customerProfile
    setUser({ name:"John", points, tier })   ← correct + enriched
  ↓
ReviewOrder: user.name="John" → setCustomerName("John") → pre-filled correctly
```

---

## 5. Downstream Consumer Check

| Consumer | Uses | Impact of change |
|---|---|---|
| `LandingPage.jsx:454` | `crmSkipOtpWithRetry(phone, userId)` | Caller changes to pass `name` as 3rd arg — explicit change required |
| `PasswordSetup.jsx:56` | `crmSkipOtp(phone, userId)` | Unreachable (route removed). Default `name=''` — zero change needed |
| `crmSkipOtpRetry.js:44` | `crmSkipOtp(phone, userId)` | Must pass `name` through from wrapper signature |
| `AuthContext.jsx setCrmAuth` | Sets user from customerProfile | Item C modifies callback — no external callers affected |
| `ReviewOrder.jsx` user reads | Reads `user.name` from context | Receives correct name after fix — no change to ReviewOrder for this CR |

---

## 6. Conflict Check

| Active CR | Touches same files? | Conflict? |
|---|---|---|
| CR-2026-10-11-001 (coupon fix) | ReviewOrder.jsx only | None — no overlap |
| CR-2026-10-11-007 (ReviewOrder P4+P5) | crmService.js + ReviewOrder.jsx | **Potential** — both touch crmService.js. Sequence: implement CR-006 first, CR-007 after. No line-level conflict if order respected. |
| CR-2026-09-15-004 (admin login) | AuthContext.jsx (CLOSED) | None — closed, code stable |
| CR-2026-10-08-001 (skip-otp path) | LandingPage.jsx (CLOSED) | None — closed, code stable |

---

## 7. Risk Assessment

| Item | File | Risk | Justification |
|---|---|---|---|
| A — Spread fix | LandingPage.jsx | MEDIUM | 1-line change in HIGH risk file. Self-contained. No new state, no new calls. |
| B — crmSkipOtp name param | crmService.js + crmSkipOtpRetry.js | LOW | Additive. Default `name=''`. CRM silently ignores until deployed. No existing caller broken. |
| C — AuthContext defensive merge | AuthContext.jsx | HIGH | 3 lines in CRITICAL file. Defensive condition `!merged.name`. Only activates when CRM returns blank. Zero behaviour change once CRM ships. |

**Overall CR risk: HIGH** (driven by AuthContext.jsx Item C)

---

## 8. Owner Decisions Required

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Include Item C (AuthContext defensive merge) in CR-006? | A) Yes — ship together · B) Separate micro-CR | **A — ship together.** Item A without Item C is an incomplete fix (race condition). All 3 items are small and tightly coupled. |
| D2 | Ship Item B before CRM deploys (name silently dropped by CRM until then)? | A) Yes — pre-code now, zero risk · B) Wait for CRM confirmation | **A — pre-code now.** Default `name=''` means zero regression. When CRM deploys, it just starts working without another release. |

---

## 9. Verification Matrix

| Test | File(s) exercised | Expected |
|---|---|---|
| New customer "John" → Browse Menu → ReviewOrder | LandingPage + AuthContext + ReviewOrder | Name field shows "John" — no flash, no blank |
| New customer with whitespace name → Browse Menu | LandingPage + crmService | Name not sent to CRM; field blank on review (correct) |
| Returning customer (CRM name "Alok") → Browse Menu | crmService + AuthContext | Name "Alok" from crmGetProfile profile — no regression |
| crmGetProfile resolves BEFORE ReviewOrder reads user | AuthContext | Item C ensures name stays "John" even if async wins the race |
| PasswordSetup Skip button (unreachable) | PasswordSetup | No change; dead code |
| Item B: CRM deploys name support | crmService | crmGetProfile returns "John"; Item C condition `!merged.name` → false → no interference |

---

## 10. Summary

```
Planning complete: CR-2026-10-11-006
Stage: Impact Analysis
Code reality: FULL (all files inspected, data flow traced)
Risk: HIGH (AuthContext.jsx Item C)

Files WILL change:
  frontend/src/pages/LandingPage.jsx           (Item A — HIGH risk file, 1 line)
  frontend/src/api/services/crmService.js      (Item B — LOW risk, additive)
  frontend/src/api/services/crmSkipOtpRetry.js (Item B — LOW risk, pass-through)
  frontend/src/context/AuthContext.jsx         (Item C NEW — CRITICAL risk, 3 lines)

Files WILL NOT touch:
  ReviewOrder.jsx, PasswordSetup.jsx, backend/server.py, all others

New finding: Race condition in AuthContext.jsx setCrmAuth — Item C required.
             Item A without Item C is an incomplete fix.

Owner decisions: D1 (include Item C in scope) · D2 (pre-code Item B)
Recommendation: Owner confirms D1+D2, then proceed to Implementation Plan

Docs: CR-2026-10-11-006/IMPACT_ANALYSIS.md (this file)
Next: Implementation Plan (after owner approves D1 + D2)
```

---

## 11. Live Validation Addendum — 2026-10-11 (post CRM reply + new endpoint)

**Owner changed REACT_APP_CRM_URL to:** `https://mygenie-crm-preprod.preview.emergentagent.com/api`
**CRM CR-119 status:** LIVE on this pod · NOT yet on production

### Updated scope (4 items, not 2)

| Item | Change | Blocked? | Risk |
|---|---|---|---|
| **A** — LandingPage.jsx line 456 spread order | 1 line | ✅ Unblocked | MEDIUM |
| **B-1** — crmSkipOtp: send `name` in body | ~3 lines | ⏳ Pre-code now; works on prod after CR-119 | LOW |
| **B-2** — crmSkipOtp: READ `data?.name` from response | 1 line | ✅ Unblocked (CR-119 live on preprod) | LOW |
| **B-3** — Add `crmUpdateProfile` to crmService.js | ~15 lines new fn | ✅ Unblocked (moved from CR-007) | LOW |
| **B-4** — LandingPage: call crmUpdateProfile if is_new_customer (pre-CR-119 prod path) | ~5 lines | ✅ Unblocked | MEDIUM |
| **C** — AuthContext.jsx defensive name merge | 3 lines | ✅ Unblocked | HIGH |

### Transitional implementation (two-phase, one codebase)

```
Phase 1 — until CR-119 reaches PRODUCTION:
  skip-otp body: { phone, restaurant_id, country_code, name }   ← sent but silently stored now
  response:      { token, customer_id, is_new_customer, phone, name }  ← CR-119 preprod returns it
  if is_new_customer: true  → crmUpdateProfile(token, { name })  ← ensures name stored
  if is_new_customer: false → crmGetProfile enriches from CRM   ← existing name returned

Phase 2 — after CR-119 on PRODUCTION:
  skip-otp body includes name → stored in CRM → returned in response
  crmUpdateProfile call for new customers becomes redundant (harmless to keep)
  PUT /scan/profile still needed for name CORRECTIONS on review screen (CR-007)
```

### Validation table (live probe results 2026-10-11)

| Probe | Expected | Actual | Pass |
|---|---|---|---|
| skip-otp + name:"FreshCustomer" → response.name | "FreshCustomer" | "FreshCustomer" | ✅ |
| skip-otp no name field → response.name | '' | '' | ✅ |
| PUT /scan/profile {"name":"ValidatedName"} → 200 | success:true | success:true | ✅ |
| GET /scan/auth/me after PUT → name | "ValidatedName" | "ValidatedName" | ✅ |
| PUT /scan/profile {"name":""} → accepted (risk) | silently stored | success:true (blanks name!) | ⚠️ Must trim+skip |
| Repeat skip-otp new phone → is_new_customer | true + new token | true + new token | ✅ |

### Key code gap confirmed (still broken today)

`crmService.js` returns `name: ''` hardcoded even though CRM now sends `name` in response:
```javascript
// CURRENT (broken — ignores data?.name)
customer: { id: data?.customer_id, phone: data?.phone, name: '' }
// NEEDED (B-2 fix)
customer: { id: data?.customer_id, phone: data?.phone, name: data?.name || '' }
```
This single line is the fastest path to a working name prefill on preprod right now.
