# INTAKE DOC — CR-2026-10-09-003
## Replace client-side loyalty caps with `POST /scan/max-redeemable`

**Written by:** Role 1 — Intake Agent
**Date:** 2026-10-09
**Status:** REGISTERED — CRM endpoint LIVE (CR-107 shipped 2026-10-09)

---

## Item Identity

| Field | Value |
|---|---|
| **CR ID** | CR-2026-10-09-003 |
| **Title** | Replace client-side G3 redemption-cap calculation with CRM `POST /scan/max-redeemable` — tier-aware, server-authoritative |
| **Classification** | CR — architecture correction (replace client-side cap logic with server-side API) |
| **Severity** | P2 — live mis-calculation possible when caps interact (e.g. max_redemption_percent + max_redemption_amount together) |
| **Risk** | **HIGH** — `ReviewOrder.jsx` (hotspot) + `LoyaltyRewardsSection.jsx` |
| **Duplicate check** | RELATED to CR-2026-10-03-004 Part B (which shipped G3 caps client-side) — this supersedes that approach |
| **Blast radius** | SMALL — 2 files, no auth/payment schema change |
| **Blocked on** | Nothing. CRM CR-107 live. |
| **Related** | CR-2026-10-09-002 (sequence after — same checkout area, avoid collision) |

---

## 1. Problem — what Part B shipped vs what CR-107 now offers

**Part B (shipped 2026-10-09)** wired G3 caps client-side in `handleUsePoints`:
```javascript
// ReviewOrder.jsx:859-874
const minPoints = loyaltySettings?.min_redemption_points || 0;
let maxDiscount = subtotal;
const maxPct = loyaltySettings?.max_redemption_percent;
if (maxPct) maxDiscount = Math.min(maxDiscount, subtotal * (maxPct / 100));
const maxAmt = loyaltySettings?.max_redemption_amount;
if (maxAmt) maxDiscount = Math.min(maxDiscount, maxAmt);
const maxPointsToUse = Math.floor(maxDiscount / redemptionValue);
```

This has three problems:
1. **Tier-blind for the cap**: uses flat `redemption_value` from loyalty-rules for the cap calculation, not per-tier. A Gold diner's max points is calculated with Bronze rates.
2. **Cap combination is approximate**: applying `max_redemption_percent` and `max_redemption_amount` independently may not match CRM's server-side logic exactly.
3. **Client-side drift**: if CRM changes cap rules, our code is wrong until redeployed.

**CR-107 (`POST /scan/max-redeemable`) provides:**
- `max_points_redeemable`: exact integer of redeemable points, server-calculated, tier-aware
- `max_discount_value`: exact ₹ ceiling
- `ok: false` + `code` when redemption not allowed at all
- `projected_points_earned`: what the diner will earn on this order regardless of redemption
- Runs all caps together (min_pts, max_pct, max_amt, tier) in one server call

**Validated probe** (saurav, Gold, bill:500):
```
ok:true, max_points_redeemable:36, max_discount_value:₹108, ratio_per_point:3.0,
available_points:2000, min_redemption_points:100, projected_points_earned:150
```
Note: `projected_points_earned:150` for bill:500 — differs from loyalty-rules gold_earn_percent:10% (= 50 pts). Planning must confirm with CRM whether this is a different earn calculation or a CRM data note.

---

## 2. CRM contract — `POST /scan/max-redeemable` (CR-107, live 2026-10-09)

**Auth:** Customer Bearer token required
**Rate limit:** None (token-gated, read-only)

**Request:**
```json
POST /scan/max-redeemable
Authorization: Bearer <token>
{ "bill_amount": 500.0 }
```

**Success response (`ok:true`):**
```json
{ "data": {
  "ok": true, "code": null,
  "max_points_redeemable": 36, "max_discount_value": 108.0,
  "ratio_per_point": 3.0, "available_points": 2000,
  "min_redemption_points": 100, "loyalty_enabled": true,
  "projected_points_earned": 150
} }
```

**When redemption not available (`ok:false`):**
```json
{ "data": {
  "ok": false, "code": "BELOW_MIN_REDEMPTION",
  "max_points_redeemable": 0, "max_discount_value": 0.0,
  "available_points": 30, "min_redemption_points": 50,
  "loyalty_enabled": true, "projected_points_earned": 25
} }
```

**`code` values:** `null` (ok) · `LOYALTY_DISABLED` · `SETTINGS_MISSING` · `BELOW_MIN_REDEMPTION`

---

## 3. Current state — what code exists

`handleUsePoints` (ReviewOrder.jsx:859-874) — client-side cap calculation from loyalty-rules fields.

CRM says: "call this when the checkout screen opens to show 'You can redeem up to N points (₹X off)'"

---

## 4. Scope

**IN:**
- Add `crmGetMaxRedeemable(token, billAmount)` to `crmService.js`
- In ReviewOrder, call `crmGetMaxRedeemable` on mount (when `isAuthenticated && loyaltySettings && subtotal > 0`) and store response in state
- Replace `handleUsePoints` cap calculation with `maxRedeemable.max_points_redeemable` and `maxRedeemable.max_discount_value`
- If `ok:false` → disable "Use" button, show "Below minimum" or appropriate message from `code`
- Show `projected_points_earned` in `LoyaltyRewardsSection` Variant 1 (authenticated) — currently shows calculated earn, replace with server value

**OUT:**
- Wallet balance / expiring points (`expiring_soon`, `expiring_date` from `/scan/loyalty`) — separate
- Re-call on every cart change (would need debounce, defer unless simple)

**GREY ZONE for Planning:**
- G1: Should `crmGetMaxRedeemable` be re-called when cart total changes (items added/removed)? Currently called once on mount. If cart changes, the max redeemable changes too. Proposed: re-call on `subtotal` change with 500ms debounce.
- G2: `projected_points_earned:150` vs our calculation (50 pts for Gold at ₹500) — ask CRM to clarify before wiring the earn preview.

---

## 5. Files

| Will change | Will NOT touch |
|---|---|
| `frontend/src/api/services/crmService.js` | `AuthContext.jsx` |
| `frontend/src/pages/ReviewOrder.jsx` | `CartContext.js` |
| `frontend/src/components/LoyaltyRewardsSection/LoyaltyRewardsSection.jsx` | `server.py` |

---

## 6. Acceptance criteria

1. Checkout mount (Gold diner, bill ₹500) → "Use" button shows "36 points (₹108 max discount)"
2. Diner with 30 points, minimum 50 → "Use" button disabled
3. `loyalty_enabled:false` → loyalty section hidden
4. Removing all items from cart (subtotal=0) → Use button disabled
5. `yarn build` clean

---

```
Intake complete: CR-2026-10-09-003
Classification: CR — architecture correction
Severity: P2
Risk: HIGH (ReviewOrder.jsx hotspot)
Duplicate check: RELATED (supersedes Part B's client-side G3 implementation)
Evidence: CRM contract v2.1 + CR-107 probe confirmed + existing client-side code confirmed
Blast radius: SMALL
Open questions: G1 (re-call on cart change), G2 (projected_points_earned discrepancy)
Next: answer G1/G2 → "Planning for CR-2026-10-09-003"
```
