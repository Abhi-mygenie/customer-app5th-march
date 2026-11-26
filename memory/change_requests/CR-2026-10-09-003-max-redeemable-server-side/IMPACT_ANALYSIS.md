# IMPACT ANALYSIS — CR-2026-10-09-003
## Replace client-side G3 caps with `POST /scan/max-redeemable`

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-09
**Based on:** INTAKE_DOC · ReviewOrder.jsx (exact lines) · LoyaltyRewardsSection.jsx (exact lines) · crmService.js (exact lines) · AuthContext.jsx (crmToken exposure) · CR-107 probe (saurav/Gold/bill:500 → ok:true, max_pts:36, max_disc:108, ratio:3.0, projected_earned:150)
**Scope:** Replace `handleUsePoints` client-side cap calculation + inline display with CRM server-authoritative `POST /scan/max-redeemable`

---

## 1. What this CR does

**Today (Part B shipped):** `handleUsePoints` (ReviewOrder.jsx:821–849) calculates max redeemable points client-side by reading three separate cap fields from `loyaltySettings` (min_redemption_points, max_redemption_percent, max_redemption_amount) and applying them independently. The inline display derives available points and redemption value locally.

**After this CR:** A single call to CRM's `POST /scan/max-redeemable` with `{bill_amount}` returns `max_points_redeemable`, `max_discount_value`, and `ok: false` when redemption is not available. All cap logic runs server-side, tier-aware. Client-side cap code is deleted.

---

## 2. CRM contract — confirmed live

**Probe result (saurav/Gold/689, bill:500):**
```
ok: true
max_points_redeemable: 36
max_discount_value: ₹108.0      ← 36 pts × ₹3.0/pt (Gold) — cap applied (max_redemption_amount ₹110)
ratio_per_point: 3.0             ← Gold tier redemption value ✅
available_points: 2000
min_redemption_points: 100       ← Note: different from loyalty-rules value; CRM is authoritative
projected_points_earned: 150     ← See D2 — discrepancy with local calculation (expected ~50)
loyalty_enabled: true
code: null
```

**When not available:**
```
ok: false, code: BELOW_MIN_REDEMPTION | LOYALTY_DISABLED | SETTINGS_MISSING
max_points_redeemable: 0, max_discount_value: 0
```

---

## 3. Current code touch points — exact

### T1 · `ReviewOrder.jsx:90` — `useAuth()` destructuring
```javascript
const { isAuthenticated, user, isCustomer, setRestaurantScope } = useAuth();
```
`crmToken` is exported by `AuthContext` (confirmed line 224) but NOT currently destructured here. The CRM `/scan/max-redeemable` endpoint requires the customer Bearer token → must add `crmToken`.

### T2 · `ReviewOrder.jsx:~230` — state declarations
No `maxRedeemable` state exists. Need: `const [maxRedeemable, setMaxRedeemable] = useState(null)`.

### T3 · `ReviewOrder.jsx:141–153` — `fetchLoyaltyRules` effect
Unchanged — loyalty-rules still needed for earn rates, section visibility, and LoyaltyRewardsSection props.

### T4 · `ReviewOrder.jsx:821–849` — `handleUsePoints` (the main replacement)
```javascript
// CR-2026-10-03-004 Part B: G1 per-tier redemption value; G3 CRM redemption caps enforced
const handleUsePoints = () => {
  const availablePoints = ...
  const tier = ...
  const tierKey = ...
  const redemptionValue = ...
  // G3: CRM caps — each enforced independently ...
  const minPoints = loyaltySettings?.min_redemption_points || 0;
  if (availablePoints < minPoints) return;
  let maxDiscount = subtotal;
  const maxPct = loyaltySettings?.max_redemption_percent;
  if (maxPct) maxDiscount = Math.min(maxDiscount, subtotal * (maxPct / 100));
  const maxAmt = loyaltySettings?.max_redemption_amount;
  if (maxAmt) maxDiscount = Math.min(maxDiscount, maxAmt);
  const maxPointsToUse = Math.floor(maxDiscount / redemptionValue);
  const pointsToUse = Math.min(availablePoints, maxPointsToUse);
  const discount = pointsToUse * redemptionValue;
  setPointsToRedeem(pointsToUse);
  setPointsDiscount(discount);
  setIsUsingPoints(true);
};
```
**Replace entirely** with maxRedeemable values from CRM.

### T5 · `ReviewOrder.jsx:1843–1893` — inline points display
```javascript
const pts = lookedUpCustomer?.found ? ... : (isAuthenticated ? (user?.total_points || 0) : 0);
const rdv = loyaltySettings?.[`${tier}_redemption_value`] || ...;
// "X points (Worth ₹Y)" + Use button disabled={!pts}
```
Update to: show `maxRedeemable.max_points_redeemable`, worth `maxRedeemable.max_discount_value`, disable Use if `!maxRedeemable?.ok`.

### T6 · `LoyaltyRewardsSection.jsx:33` — earn preview `pointsToEarn`
Currently: `Math.round(billAmount * (earnPercent / 100))`. CRM probe returns `projected_points_earned: 150` for bill:500/Gold vs expected ~50. **See D2 — not touched until discrepancy resolved.**

---

## 4. Token path confirmed

`crmToken` is in `AuthContext.value` (line 224). ReviewOrder needs to add it to its `useAuth()` destructure. CRM `crmAuthFetch` / `crmFetch` pattern passes it as `token` in options. The new `crmGetMaxRedeemable(token, billAmount)` function in crmService.js will use `crmAuthFetch`.

---

## 5. Owner decisions — **RESOLVED 2026-10-09**

### D1 — When does `crmGetMaxRedeemable` get called? → **(b) confirmed**
Re-call whenever `subtotal` changes (debounced 500ms). Effect dependencies: `[isAuthenticated, crmToken, subtotal]`. Skip call if `!isAuthenticated || !crmToken`. Debounce prevents rapid-fire on fast item taps.

### D2 — Replace earn preview with `projected_points_earned`? → **(a) confirmed**
Use CRM's `projected_points_earned` from the max-redeemable response in LoyaltyRewardsSection Variant 1 (authenticated diner). For guests (Variant 3), keep bronze earn_percent calculation from loyalty-rules — CRM does not return projected_earned without a token.
**Impact on scope:** `LoyaltyRewardsSection.jsx` is now IN scope. `maxRedeemable` (or just `projectedPointsEarned`) must be passed as a new prop. `pointsToEarn` calculation in Variant 1 replaced with `projectedPointsEarned` when available; client-side as fallback if null.

### D3 — Graceful failure when CRM call fails? → **(a) confirmed**
`maxRedeemable = null` on error → Use button disabled. Diner cannot redeem but can still order. No fallback to client-side caps.

---

## 6. Files WILL change — updated after D2=yes

| File | Changes |
|---|---|
| `frontend/src/api/services/crmService.js` | Add `crmGetMaxRedeemable(token, billAmount)` (~12 lines) |
| `frontend/src/pages/ReviewOrder.jsx` | Add `crmToken` to useAuth destructure (T1); add `maxRedeemable` state (T2); add max-redeemable effect debounced on subtotal (T3); replace `handleUsePoints` (T4); update inline display (T5); pass `projectedPointsEarned` to LoyaltyRewardsSection (T6) |
| `frontend/src/components/LoyaltyRewardsSection/LoyaltyRewardsSection.jsx` | Accept `projectedPointsEarned` prop; use it in Variant 1 earn preview when available (T7+T8) |

## 7. Files WILL NOT touch

`AuthContext.jsx` · `CartContext.js` · `server.py` · `App.js`

---

## 8. Full touch point list — revised

| # | File | Lines | Change |
|---|---|---|---|
| T1 | `ReviewOrder.jsx:90` | `useAuth()` | Add `crmToken` to destructure |
| T2 | `ReviewOrder.jsx:~230` | state | Add `maxRedeemable` state (null) |
| T3 | `ReviewOrder.jsx` | after `fetchLoyaltyRules` effect | Add debounced max-redeemable effect on `[isAuthenticated, crmToken, subtotal]` |
| T4 | `ReviewOrder.jsx:821–849` | `handleUsePoints` | Replace client-side cap logic with `maxRedeemable.max_points_redeemable` and `max_discount_value` |
| T5 | `ReviewOrder.jsx:1843–1893` | inline display | Show max redeemable from CRM; disable Use if `!maxRedeemable?.ok`; show reason when BELOW_MIN_REDEMPTION |
| T6 | `ReviewOrder.jsx:1994–2002` | LoyaltyRewardsSection call site | Add `projectedPointsEarned={maxRedeemable?.projected_points_earned || null}` prop |
| T7 | `LoyaltyRewardsSection.jsx:11–18` | props | Add `projectedPointsEarned` to props |
| T8 | `LoyaltyRewardsSection.jsx:33` | Variant 1 earn calc | Replace `Math.round(billAmount * earnPercent/100)` with `projectedPointsEarned \|\| Math.round(...)` |

---

## 8. Risk

| Area | Rating | Reason |
|---|---|---|
| Overall | **HIGH** | ReviewOrder.jsx hotspot; loyalty discount is money-path adjacent |
| `handleUsePoints` replacement | HIGH | Discount calculation — wrong max → diner charged wrong amount |
| `crmGetMaxRedeemable` call | MEDIUM | New async call; graceful failure (D3) must be right |
| Inline display update | LOW | Display only |
| `crmToken` destructure addition | LOW | Additive, no side effects |

No Fast Lane. CRITICAL file — owner Gate 3 required.

---

## 9. Verification matrix

| T | Scenario | Expected |
|---|---|---|
| T1 | `crmGetMaxRedeemable` in crmService exports | Present, calls `/scan/max-redeemable` with token + bill_amount |
| T2 | ReviewOrder mounts (Gold, bill:500) | maxRedeemable set; Use shows "36 pts (₹108 max)" |
| T3 | Diner taps Use | `pointsToRedeem=36, pointsDiscount=108, isUsingPoints=true` |
| T4 | Diner below min threshold | Use button disabled |
| T5 | `loyalty_enabled:false` response | Use button disabled |
| T6 | `crmGetMaxRedeemable` throws (CRM down) | `maxRedeemable=null` → Use button disabled (D3=a) |
| T7 | Cart changes (add item, subtotal rises) | max-redeemable re-called after 500ms (D1=b); Use shows updated max |
| T8 | `yarn build` | Clean |

---

```
Planning complete: CR-2026-10-09-003
Stage: Impact Analysis
Code reality: FULL — 8 exact touch points confirmed
Risk: HIGH
Files WILL change: crmService.js · ReviewOrder.jsx · LoyaltyRewardsSection.jsx (3 files)
Files WILL NOT touch: AuthContext.jsx · CartContext.js · server.py · App.js
Owner decisions: D1=(b) subtotal-debounced · D2=(a) use projected_points_earned · D3=(a) disable on failure — ALL RESOLVED 2026-10-09
Status: AT GATE — awaiting "Gate 3 accepted for CR-2026-10-09-003"
```
