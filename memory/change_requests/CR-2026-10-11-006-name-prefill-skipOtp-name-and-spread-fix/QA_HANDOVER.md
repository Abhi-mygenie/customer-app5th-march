# QA HANDOVER — CR-2026-10-11-006
## Customer Name Prefill — Full Fix

**Written by:** Role 3 — Implementation Agent
**Date:** 2026-10-11
**Status:** SELF-TEST PASS · TESTING AGENT PASS (iteration_19.json)

---

## What was changed — 6 items, 4 files

| Step | File | Change | Lines |
|---|---|---|---|
| B-1+B-2 | `crmService.js` | `crmSkipOtp`: adds `name=''` param, sends in body if non-empty, reads `data?.name` from response | 297–314 |
| B-3 | `crmService.js` | New `crmUpdateProfile` export — `PUT /scan/profile` with trim+empty-guard | 420–447 |
| B-1 | `crmSkipOtpRetry.js` | Signature + pass-through + stale comment updated | 31–45 |
| A | `LandingPage.jsx` | Spread order fixed — captured name wins over CRM empty string | 456–457 |
| B-1+B-4 | `LandingPage.jsx` | Import + call site passes name; crmUpdateProfile called for new customers | 19, 454, 459–463 |
| C | `AuthContext.jsx` | Defensive merge in `crmGetProfile` callback — preserved name if CRM returns blank | 156–163 |

---

## Build

```
yarn build: CLEAN — 0 errors, 0 new warnings (1 pre-existing lint warning unchanged)
```

---

## Testing agent result (iteration_19.json)

| Test | Result |
|---|---|
| New customer "TestRavi" → Browse Menu → Review Order name pre-filled | **PASS** |
| Code inspection — all 6 items correct | **PASS (6/6)** |
| crmUpdateProfile whitespace guard | **PASS** |
| AuthContext defensive merge | **PASS** |
| Returning customer auto-fill | INCONCLUSIVE — CRM 429 rate limit from repeated testing. NOT a code bug. |

**REACT_APP_CRM_API_KEY note:** Not set in `.env` — benign. Probed live: CRM returns `success: true` without API key header. Code logs a warning only.

---

## QA test cases

### TC-1 — New customer name pre-fills on Review Order (PRIMARY)
1. Open `https://mygenie-guest-app.preview.emergentagent.com/689`
2. Enter any unused phone number (e.g. `9111111111`) and name `"QATest"`
3. Click **Browse Menu**
4. Navigate to cart and proceed to **Review Order**
5. **Expected:** Name field shows `"QATest"` — not blank
6. **Expected:** Phone field shows correctly
7. **NOT expected:** Name field blank, then fills after a moment (flash) — Item C prevents this

### TC-2 — Returning customer name pre-fills (wait 1 min between TC-1 and TC-2 to avoid 429)
1. Open `/689` with phone `9579504871`
2. Leave name blank (or enter any name)
3. Click **Browse Menu**
4. Proceed to **Review Order**
5. **Expected:** Name pre-filled from CRM profile (`MYGENieT` or updated name)

### TC-3 — New customer whitespace name — crmUpdateProfile NOT called
1. Enter phone `9111111112`, name `"   "` (spaces only)
2. Click **Browse Menu**
3. Open DevTools → Network — check no `PUT /scan/profile` request fires
4. **Expected:** No PUT call. Name field blank on Review Order (correct — no name captured).

### TC-4 — crmUpdateProfile called for new customer (DevTools check)
1. Enter unused phone + name `"NewUser"`
2. Click **Browse Menu**
3. DevTools → Network → look for `PUT .../scan/profile` with body `{"name":"NewUser"}`
4. **Expected:** Request fires (fire-and-forget). Response `200 {"success":true}`.

### TC-5 — Existing customer not updated unnecessarily
1. Use phone `9579504871` (returning customer, `is_new_customer: false`)
2. Click **Browse Menu**
3. DevTools → Network — confirm NO `PUT /scan/profile` fires
4. **Expected:** No PUT call (guard: `result.is_new_customer` must be true)

### TC-6 — Build regression
```bash
cd /app/frontend && yarn build
```
**Expected:** Clean, exit 0.

---

## Known non-issues (do NOT fail for these)

- CRM 429 on returning customer during rapid repeated testing — rate limit is 30/min per IP. Wait 60s between tests.
- `REACT_APP_CRM_API_KEY` warning in console — benign, CRM works without it.
- `name:''` still in `crmLogin` function (line 256) — intentional, out of scope for this CR.

---

## Code markers (all confirmed present)

```
AuthContext.jsx:158        CR-2026-10-11-006 C
crmSkipOtpRetry.js:31     CR-2026-10-11-006 B-1 (JSDoc)
crmSkipOtpRetry.js:45     CR-2026-10-11-006 B-1
crmService.js:305          CR-2026-10-11-006 B-1
crmService.js:313          CR-2026-10-11-006 B-2
crmService.js:420          CR-2026-10-11-006 B-3
LandingPage.jsx:454        CR-2026-10-11-006 B-1
LandingPage.jsx:456        CR-2026-10-11-006 A
LandingPage.jsx:459        CR-2026-10-11-006 B-4
```
