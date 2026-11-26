# IMPACT ANALYSIS — BUG-2026-10-12-002
## Phone starting with "91" loses two digits on Review Order

**Written by:** Role 2 — Planning Agent · **Date:** 2026-10-12 · **Status:** COMPLETE — awaiting gate
**⚠ ROOT CAUSE CORRECTION — the INTAKE doc is wrong (R1: code is truth).**

## What the intake said vs what the code does

| | Intake claim | Reality (reproduced 2026-10-12) |
|---|---|---|
| Where | `LandingCustomerCapture.jsx` / `react-phone-number-input` strips "91" while typing | **`ReviewOrder.jsx` pre-fill formatter** strips it |
| Mechanism | libphonenumber greedy country-code parse | Regex `phone.replace(/^\+?91/, '')` applied to a **bare 10-digit** phone |
| Library behaviour | "known libphonenumber behaviour" | Simulated `onPhoneDigitsChange` digit-by-digit with `defaultCountry="IN"`: `9135133228` → `+919135133228` ✅ correct. Library is **not** at fault |
| Files in scope | LandingCustomerCapture only; "ReviewOrder NOT in scope" | **ReviewOrder.jsx is the only file that needs to change** |

Reproduction (node): `'9135133228'.replace(/^\+?91/, '')` → `'35133228'` → `'+9135133228'` (8 local digits). Control `9876543210` → `+919876543210` fine. Evidence script: `memory/tools/scratch/pi.mjs`.

## Root cause — confirmed
`frontend/src/pages/ReviewOrder.jsx`, three identical lines:
```js
const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^\+?91/, '')}`;
```
- L309 — pre-fill from `sessionStorage` (edit-order)
- L337 — pre-fill from `localStorage.guestCustomer`
- L357 — pre-fill from authenticated `user.phone`

Intent: normalise `919135133228` (12 digits, CC without `+`) → `+919135133228`. Defect: the regex has no length guard, so a **10-digit national number that happens to begin with 91** also loses its first two digits.

## Trigger path (why owner saw it on Review Order, not landing)
1. Landing `PhoneInput` produces E.164 `+919135133228` — correct. `isPhoneValid` passes (12 digits).
2. `crmLookupCustomer` / `crmSkipOtp` send bare `9135133228` (`stripPhonePrefix`, correct).
3. CRM skip-otp returns `data.phone = "9135133228"` (bare) → `setCrmAuth(customer)` → `user.phone` is bare.
4. Review Order L357: `user.phone.startsWith('+')` false → regex strips "91" → `+9135133228`.
5. `isPhoneNumberValid` (L434, `isValidPhoneNumber` + 12-digit check) → false → "Please enter a valid phone number".
Guest path (L337) is normally safe because landing stores E.164 in `guestCustomer`; only bare-digit sources (CRM user, legacy session data) trigger it. Any customer whose mobile starts with 91 and who goes through skip-otp is affected — **every authenticated 91xxxxxxxx diner**.

## Related dead code (do not touch — scope lock)
`stripCountryCode` L284–289 is defined and never called. Flag for a future cleanup item; not part of this fix.

## Risk
**MEDIUM** — phone pre-fill feeds the POS order payload (`customerPhone`) and CRM re-auth (CR-007 territory). Hotspot file. No API/contract change. Regression: phone pre-fill from all three sources, place-order payload phone, edit-order mode.

## Files
- WILL change: `frontend/src/pages/ReviewOrder.jsx` (3 lines → 1 helper + 3 call sites)
- WILL NOT touch: `LandingCustomerCapture.jsx`, `LandingPage.jsx`, `AuthContext.jsx`, `crmService.js`, placeholder text, validation rules, backend

## Owner decisions
1. Approve the corrected root cause and scope (ReviewOrder, not Landing). The intake's proposed hint/placeholder changes are **not needed** and are recommended dropped.
2. Approve touching hotspot `ReviewOrder.jsx` (matrix §7).

## Verification matrix
| # | Source | Stored value | Expected `customerPhone` | Validity |
|---|---|---|---|---|
| 1 | auth user (CRM bare) | `9135133228` | `+919135133228` | valid |
| 2 | auth user | `9876543210` | `+919876543210` | valid (control) |
| 3 | guest E.164 | `+919135133228` | unchanged | valid |
| 4 | legacy session bare w/ CC | `919135133228` | `+919135133228` | valid |
| 5 | legacy bare w/ CC, normal | `919876543210` | `+919876543210` | valid |
| 6 | 8-digit garbage | `35133228` | `+9135133228` | invalid — shown as invalid (correct; nothing to rescue) |
| 7 | Place Order payload (dine-in, auth, 91-number) | — | phone digits `9135133228` reach POS | money-path regression |
| 8 | Edit-order mode pre-fill | sessionStorage | unchanged behaviour | regression |

---

# IMPLEMENTATION PLAN — BUG-2026-10-12-002

Normal gate flow (MEDIUM, hotspot). Not Fast Lane.

1. `ReviewOrder.jsx` — add one module-level helper next to `buildOrderItems`:
   ```js
   // BUG-2026-10-12-002: normalise stored phone to E.164 without eating a national number that starts with 91
   const toE164India = (phone) => {
     if (!phone) return '';
     if (phone.startsWith('+')) return phone;
     const digits = phone.replace(/\D/g, '');
     if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
     return `+91${digits}`;
   };
   ```
2. Replace the three inline `formattedPhone` expressions (L309, L337, L357) with `toE164India(phone)`. Marker comment on each.
3. Self-test: node table above (cases 1–6) against the helper; one screenshot of Review Order logged in as a 91-prefixed test number **only if** owner provides/approves creating such a CRM test customer on preprod (skip-otp creates a record — write action, needs owner OK).
4. QA handover: matrix 1–8; emphasise case 7 (POS payload) and 8 (edit mode).
5. Update INTAKE.md with a "Root cause corrected 2026-10-12 — see IA" banner; registry notes updated.
6. SMOKE_BRIEF → owner smoke.
