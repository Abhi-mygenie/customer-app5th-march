# INTAKE — BUG-2026-10-12-002
## Phone Number Starting with "91" Gets Stripped by PhoneInput — Shows Invalid on Review Order

**ID:** BUG-2026-10-12-002
**Date registered:** 2026-10-12
**Registered by:** Role 1 — Intake Agent
**Source:** Owner reported + Investigation confirmed (Role 6, 2026-10-12)
**Status:** INTAKE COMPLETE — **ROOT CAUSE CORRECTED 2026-10-12 by Planning (see IMPACT_ANALYSIS_AND_PLAN.md).** The library-stripping theory below was disproven by simulation; the defect is the `phone.replace(/^\+?91/, '')` pre-fill regex in `ReviewOrder.jsx` (L309/L337/L357). Scope moves from LandingCustomerCapture to ReviewOrder. Sections below retained for history.

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P1 — affects every customer whose 10-digit mobile starts with 91 (e.g. 91XXXXXXXX). They cannot place an order without re-typing their number. Silently broken. |
| Risk | MEDIUM — LandingCustomerCapture.jsx + phone flow touches auth |
| Blast radius | MEDIUM — landing page phone capture, skip-otp flow, ReviewOrder pre-fill |
| Duplicate check | DISTINCT |

---

## What is wrong — plain English

Indian mobile numbers starting with "91" (e.g. 9135133228) are very common. When such a customer types their 10-digit number on the landing page, `react-phone-number-input` mistakenly treats the leading "91" as the India country code prefix and discards those two digits, leaving only 8 digits as the local number.

```
Customer types:  9 1 3 5 1 3 3 2 2 8   (10 digits — valid mobile)
                 ↑ ↑
PhoneInput sees "91" = India country code → strips it
Stores as:      +91 35133228            (only 8 local digits)
Displays as:    +91 35 1332 28

ReviewOrder validates: 8 digits ≠ 10 digits → "Please enter a valid phone number"
```

Customer is confused — they already entered their number on the landing page and were allowed through. The error appears much later, silently breaking the order flow.

---

## Evidence — confirmed

Owner reproduced: typed 10-digit number starting with "91" on landing page without +91 prefix → review screen showed "+91 XX XXXX XX" (only 8 local digits) + "Please enter a valid phone number".

Code confirmation:
- `LandingCustomerCapture.jsx`: `PhoneInput` with `defaultCountry="IN"` — no guard against "91" prefix stripping
- `silentSkipOtpAndNavigate` stores `capturedPhone` as-is even when invalid (non-mandatory phone config)
- `ReviewOrder.jsx` pre-fill: phone is taken as-is from localStorage → shows invalid

---

## Root Cause

`react-phone-number-input` with `defaultCountry="IN"` greedily parses leading "91" as the country code on user input, stripping 2 digits from the local number. This is a known behaviour of the underlying `libphonenumber-js` library — it cannot distinguish between "91XXXXXXXX" (local number) and "91 + XXXXXXXX" (country code + local).

Numbers NOT affected: numbers starting with 90, 98, 97, 96, 95, 94, 93, 92, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60 — only "91XXXXXXXX" is affected.

---

## Scope — files expected to change

| File | Change | Risk |
|---|---|---|
| `frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.jsx` | In `handlePhoneChange`: detect when stored value has only 8 local digits after +91 and the original input likely had 10 digits starting with 91 — show inline hint "Enter 10 digits without country code" OR auto-correct | MEDIUM |
| `frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.jsx` | Update placeholder text from "Phone Number" to "10-digit mobile number" to guide users | LOW |

**Files NOT in scope:** ReviewOrder.jsx, AuthContext.jsx, backend/server.py

---

## Proposed Fix Approach

**Option A (recommended — auto-correct):**
In `handlePhoneChange`, when the returned value from PhoneInput starts with `+91` and has only 8 local digits, check if the raw typed input was a 10-digit number starting with "91". If yes, reformat: strip the "91" from E.164 and prepend "+91" + full-10-digit number.

```js
// Pseudocode
const handlePhoneChange = (value) => {
  if (readOnly) return;
  // Detect 91-prefix stripping: +91 + 8 digits = 10 total chars after +
  if (value && value.startsWith('+91')) {
    const local = value.slice(3); // digits after +91
    if (local.length === 8) {
      // PhoneInput likely stripped "91" — show hint but don't auto-correct silently
      setPhoneHint('If your number starts with 91, type it without a leading +91');
    }
  }
  setPhone(value || '');
  setPhoneError('');
};
```

**Option B (hint only):**
Show a static helper text: "Type your 10-digit number. If it starts with 91, do not add +91 in front."

---

## Owner Decisions Needed

| Decision | Options |
|---|---|
| Fix approach | Auto-correct silently vs. show hint only |
| Placeholder text | Update to "10-digit mobile number"? |

---

## Status

```
INTAKE:          COMPLETE
PLANNING:        NOT STARTED
OWNER DECISIONS: Preferred fix approach needed before planning
```
