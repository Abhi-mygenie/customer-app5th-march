# INTAKE DOC — CR-2026-11-14-001 (Updated with Owner Decisions)

**ID:** CR-2026-11-14-001  
**Type:** CR  
**Title:** OTP required for first order into a room (per new check-in, config-driven)  
**Registered:** 2026-11-14  
**Updated:** 2026-11-14  
**Status:** INTAKE → READY FOR PLANNING  
**Priority:** P1  
**Risk:** HIGH  

---

## 1. Owner Request (verbatim)

> "OTP is needed for placing first order into room"

---

## 2. Owner Decisions (received 2026-11-14)

| Question | Answer |
|---|---|
| When does OTP apply? | **First order only, after every new check-in.** Edit-order (State 2) keeps current skip-otp path. |
| Config-driven or always-on? | **Config-driven per-restaurant flag** (new flag in our DB config) |
| Ordering vs CR-2026-10-08-001? | See §6 below for full brief. Summary: Can proceed independently on top of that CR. |

---

## 3. Current Behaviour (from code + INV-2026-06-17-003)

- CR-2026-10-08-001 (SMOKE) made `silentSkipOtpAndNavigate` the universal identity path — no OTP for any order type.
- For **Room State 3** (checked-in, `order_id=null`, guest details complete): name + phone auto-filled from POS, customer taps "BROWSE MENU" → goes straight to menu without identity check.

---

## 4. Required Behaviour

**Trigger:** Room scan → State 3 (room checked-in, no prior order) **AND** per-restaurant config flag `otpRequiredRoomFirstOrder = true`

**Flow:**
```
Scan room QR → State 3 detected
  → Config flag ON → OTP dialog shown
      Phone pre-filled from POS (locked, uneditable)
      → "Send OTP" pressed → OTP sent to that phone
      → Customer enters OTP → verified via backend
      → CRM token obtained → proceed to menu
  → Config flag OFF → current skip-otp path unchanged
```

**Edit-order (State 2):** OTP NOT required. Existing token used.

---

## 5. New Config Flag Required

| Field | Value |
|---|---|
| Config key | `otpRequiredRoomFirstOrder` |
| Type | boolean |
| Default | `false` (backward-compatible — no OTP by default) |
| Storage | Backend `server.py` config model + MongoDB |
| Admin UI | Add toggle to Admin → Visibility page (alongside other `skipOtp*` flags) |

---

## 6. Brief: CR-2026-10-08-001 and Its Relationship to This CR

**What CR-2026-10-08-001 is:**  
CRM deleted their `register` and `login` APIs (w/c 13 Oct 2026). Our app previously sent customers through a password-setup page that called those now-deleted endpoints. When a restaurant had `skipOtp*` flags off, customers were routed to `/password-setup` → which 404'd → customers couldn't sign in.

CR-2026-10-08-001 fixed this by making **skip-otp the only identity path** for all order types, bypassing all `skipOtp*` config flags. The `/password-setup` route now redirects back to the landing page.

**Current status:** SMOKE — implemented and QA-passed, waiting for owner smoke test of Step 1. Step 2 (cleanup: delete `PasswordSetup.jsx`, retire `skipOtp*` flags) is pending owner approval.

**Impact on this CR (CR-001):**  
- The old OTP mechanism (password-setup page → CRM register/login) is **gone forever**.
- This CR must implement OTP as an **in-page modal/dialog** on the landing page — not a navigation to a separate page.
- The OTP backend endpoints (`/api/auth/send-otp`, `/api/auth/login`) in our backend are **still alive** (they were not removed by CR-010-08).
- **No conflict and no sequencing dependency.** CR-001 can be implemented now without waiting for CR-010-08 Step 2. The new flag `otpRequiredRoomFirstOrder` is independent of the retired `skipOtp*` flags.

---

## 7. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| CR-2026-10-08-001 | Skip-otp always path | RELATED (background) — not duplicate, no conflict |
| INV-2026-06-17-003 | Room QR flow investigation | RELATED (background) |

**Verdict: DISTINCT**

---

## 8. Evidence / Code Locations

| File | Location | Notes |
|---|---|---|
| `frontend/src/pages/LandingPage.jsx` | Line 623, ~424–560 | skip-otp path, room state detection |
| `frontend/src/context/RestaurantConfigContext.jsx` | Lines 123–128, 523–528 | `skipOtp*` flags (note: `otpRequiredRoomFirstOrder` is NEW, not a `skipOtp*` flag) |
| `backend/server.py` | Config model (~line 150+), `/api/auth/send-otp`, `/api/auth/login` | Add new flag to config schema; OTP endpoints still live |
| `frontend/src/pages/admin/AdminVisibilityPage.jsx` | — | Add toggle for new flag |

---

## 9. Blast Radius

**Files that WILL change:**  
1. `backend/server.py` — add `otpRequiredRoomFirstOrder` to config model  
2. `frontend/src/context/RestaurantConfigContext.jsx` — read new flag  
3. `frontend/src/pages/LandingPage.jsx` — add OTP modal gate for room State 3  
4. `frontend/src/pages/admin/AdminVisibilityPage.jsx` — add toggle  

**Files that WILL NOT change:** `CartContext.js`, `ReviewOrder.jsx`, `AuthContext.jsx`, `orderService.ts`  
**Blast radius: MEDIUM**  
**Hotspot files touched:** `LandingPage.jsx` (§6.7 hotspot — HIGH care required)

---

## 10. Status After Owner Answers

All 3 questions answered. **READY FOR PLANNING.**

---

**Intake complete: CR-2026-11-14-001**  
Classification: CR  
Severity: P1 | Risk: HIGH  
Duplicate check: DISTINCT  
Evidence: captured  
Blast radius: MEDIUM  
Docs: change_requests/CR-2026-11-14-001-room-otp-first-order/INTAKE_DOC.md  
Next: Planning
