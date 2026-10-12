# IMPLEMENTATION PLAN — BUG-2026-10-12-002
## Phone starting with "91" loses two digits on Review Order pre-fill

**Written by:** Role 2 — Planning Agent · **Date:** 2026-10-12
**Supersedes:** plan section of `IMPACT_ANALYSIS_AND_PLAN.md` (IA section there remains the IA of record)
**Risk:** MEDIUM (owner-confirmed 2026-10-12) — hotspot `ReviewOrder.jsx`, phone feeds POS payload + CRM re-auth
**Gate:** HOLD — Role 3 may start only after owner writes "Approve BUG-2026-10-12-002"
**Lane:** Normal gate flow. Not Fast Lane (hotspot + MEDIUM).

---

## 0. Pre-flight for Role 3 (verify plan is still accurate)

| Check | Command / location | Expected |
|---|---|---|
| Registry status | `index.yml` → `BUG-2026-10-12-002` | `IMPACT_ANALYSIS`, risk MEDIUM |
| Defect lines still present | `grep -n "replace(/^\\\\+?91/" frontend/src/pages/ReviewOrder.jsx` | exactly 3 hits: L309, L337, L357 |
| No other consumer of the pattern | same grep on `src/` | only ReviewOrder |
| `buildOrderItems` anchor exists | `ReviewOrder.jsx` L71 | present (helper goes below it) |
| No conflicting active edit on ReviewOrder | registry: CR-2026-10-12-002 (gated), BUG-2026-10-12-003 (gated) | both HOLD — sequence per §6 |

If any check fails → stop, re-plan.

## 1. Edits (exactly 4, one file)

**File:** `frontend/src/pages/ReviewOrder.jsx`

**E1 — add helper** after `buildOrderItems` (after L77, before `buildPreviousItems`):
```js
// BUG-2026-10-12-002: normalise a stored phone to E.164 without eating the leading "91" of a 10-digit national number
const toE164India = (phone) => {
  if (!phone) return '';
  if (phone.startsWith('+')) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+91${digits}`;
};
```

**E2 — L309 (sessionStorage pre-fill):**
```diff
-          const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^\+?91/, '')}`;
+          const formattedPhone = toE164India(phone); // BUG-2026-10-12-002
```
**E3 — L337 (guestCustomer pre-fill):** same replacement.
**E4 — L357 (authenticated `user.phone` pre-fill):** same replacement.

Keep the surrounding `if (phone && !customerPhone)` guards, comments and `setCustomerPhone(formattedPhone)` calls untouched.

### Not to be touched (scope lock)
- `stripCountryCode` L284–289 — dead code, leave as is (flag only).
- `isPhoneNumberValid` L427–447 — validation stays strict (12 digits for +91).
- `CustomerDetails.jsx`, `LandingCustomerCapture.jsx`, `LandingPage.jsx`, `AuthContext.jsx`, `crmService.js`.
- POS payload lines (L1236, L1321, L1360, L1475, L1624, L1656) — they read `customerPhone`; behaviour changes only in that the value is now correct.

## 2. Behaviour table (what the helper must produce)

| Input (`phone`) | Output | Note |
|---|---|---|
| `9135133228` | `+919135133228` | **the bug** — CRM bare digits, 91-prefixed |
| `9876543210` | `+919876543210` | control |
| `+919135133228` | `+919135133228` | E.164 passthrough (guest path) |
| `919135133228` | `+919135133228` | legacy bare with CC |
| `919876543210` | `+919876543210` | legacy bare with CC, control |
| `91 35133228` / `91-351-33228` | `+919135133228` | non-digits stripped first |
| `35133228` | `+9135133228` | 8 digits → still invalid downstream (correct; nothing to rescue) |
| `''` / `null` | `''` | guards already skip empty |

## 3. Self-test (Role 3, before QA handover)

**S1 — unit table (node, no app run):** paste the helper into a node one-liner and assert the 8 rows above. PASS = all equal.

**S2 — build:** `cd /app/frontend && yarn build` → `Compiled successfully` (pre-existing warnings allowed; do NOT use `CI=true`).

**S3 — grep:** `grep -c "BUG-2026-10-12-002" src/pages/ReviewOrder.jsx` → `4`. `grep -c "replace(/^\\\\+?91/"` → `0`.

**S4 — live, authenticated path (the trigger):** needs a CRM customer whose phone starts with 91. Options:
- (a) owner provides an existing 91-prefixed preprod test number, or
- (b) owner approves creating one via skip-otp on preprod r689 (write action — **needs explicit owner OK**).
Flow: landing → enter the number → Browse Menu → add item → Review Order. Expected: `CustomerDetails` phone shows the full 10-digit number under +91, no "Please enter a valid phone number". **Open a fresh tab** — see §4.

**S5 — regression, normal number (Saurav):** same flow → unchanged.

## 4. Known trap — stale sessionStorage
`ReviewOrder` writes `customerPhone` back to `sessionStorage` (L239–247). A tab that already holds the corrupted `+9135133228` will keep showing it after the fix because L309 passes E.164 through. Not a bug in the fix; QA and smoke must use a fresh tab (or clear sessionStorage). Add this to QA_HANDOVER and SMOKE_BRIEF.

## 5. QA handover seed (Role 3 copies into QA_HANDOVER.md)

| # | Case | Steps | Expected |
|---|---|---|---|
| Q1 | Auth, 91-number | fresh tab → landing → 91xxxxxxxx → Browse Menu → item → Review Order | phone `+91 91xxx xxxxx`, valid, no error |
| Q2 | Auth, normal number | same with Saurav | unchanged |
| Q3 | Guest (phone non-mandatory, no lookup) | landing with capture, config phone optional, type 91-number, Browse Menu | Review Order phone correct |
| Q4 | Edit-order mode | place order → edit → Review Order | phone pre-filled correctly from session |
| Q5 | **Money path** | Q1 → Place Order (dine-in, preprod) | POS payload `customerPhone` = `+9191xxxxxxxx` (12 digits after +); order placed |
| Q6 | Coupon two-step (CR-008) with 91-number | anon → apply STO-STANDARD | skip-otp succeeds with correct 10-digit phone |
| Q7 | Reload Review Order (same tab) | after Q1 | still correct (session now holds good E.164) |
| Q8 | Legacy session value `919135133228` injected via devtools | reload | `+919135133228` |

Testing agent: frontend + the one POS place-order check (preprod). If ordering is unavailable on preprod (as in iteration_21 TC-2), mark Q5 BLOCKED, not FAIL.

## 6. Sequencing with other ReviewOrder.jsx items
- BUG-2026-10-12-003 (1 line, L2076) — independent region; may be implemented in the same session after its own approval.
- CR-2026-10-12-002 (coupon engine path) — larger; implement **after** this fix lands to keep diffs reviewable.
- CR-2026-10-11-007 (identity update, re-auth on phone change) — reads `customerPhone`; benefits from this fix; no conflict.

## 7. Registry / docs on completion
- `index.yml`: status → `IMPLEMENTED`, `code_markers: true`, `last_updated`.
- `QA_HANDOVER.md` in item folder; `SESSION_HANDOVER_2026-10-12.md` appended.
- After QA PASS: `SMOKE_BRIEF.md` + `.pdf` via `memory/tools/smoke_brief.py` (markdown module confirmed installed).

## 8. Rollback
Single-file, 4-line diff. Revert = restore the three original expressions and delete the helper. No data migration; corrupted session values self-heal on next fresh tab.

## 9. Owner decisions outstanding
1. "Approve BUG-2026-10-12-002" (gate).
2. S4 test number: provide an existing 91-prefixed preprod number, or approve creating one via skip-otp.
