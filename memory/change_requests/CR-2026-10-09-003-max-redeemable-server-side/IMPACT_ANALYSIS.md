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

## 5. Owner decisions — required before Gate 3

### D1 — When does `crmGetMaxRedeemable` get called?

CRM says "call this when the checkout screen opens." The question is whether to re-call on cart changes.

| Option | Behaviour | Network calls | Recommendation |
|---|---|---|---|
| **(a)** On mount only | Call once when ReviewOrder mounts. If diner adds/removes items, max-redeemable is stale. | 1 call per page load | Simplest |
| **(b) Re-call on `subtotal` change (debounced 500ms)** | Re-calls whenever cart total changes. Always up-to-date. | N calls (one per cart change) | **Recommended** |
| **(c)** Re-call when Use tapped | Only calls at the moment of redemption attempt | 1 call per Use tap | Least overhead but diner sees stale "up to N pts" before tapping |

Recommendation: **(b)** — subtotal changes are infrequent (item add/remove), 500ms debounce prevents rapid-fire. Diner always sees the correct max before tapping Use.

### D2 — Replace earn preview with `projected_points_earned`?

Probe result: CRM returns `projected_points_earned: 150` for bill:500/Gold tier. Client-side calculation: `500 × 10% (gold_earn_percent) = 50 pts`. Discrepancy: 3× difference.

Possible explanations: CRM uses a different multiplier (points per rupee, not percent?), includes a base bonus, or the earn_percent in loyalty-rules is not what CRM uses for calculations.

| Option | Effect |
|---|---|
| **(a) Replace with CRM value** | Shows 150 pts in earn preview — may confuse diners vs current 50 |
| **(b) Keep client-side, ask CRM first** | No change to earn preview, ask CRM to clarify the formula |

Recommendation: **(b)** — do not change the earn preview until CRM confirms the correct formula. The discrepancy must be understood before wiring it. Add as a follow-up edit once CRM replies.

### D3 — Graceful failure: what if `crmGetMaxRedeemable` call fails?

| Option | Behaviour |
|---|---|
| **(a) Disable Use button** | `maxRedeemable = null` → Use button disabled. Diner cannot redeem if CRM is briefly unavailable. |
| **(b) Fall back to client-side caps** | On error, keep existing handleUsePoints logic from Part B. Maintains availability but adds code complexity. |

Recommendation: **(a)** — simpler and safer. Over-redemption risk (diner redeems more than CRM allows) is greater than inconvenience of a brief disabled button. The diner can still place the order.

---

## 6. Files WILL change

| File | Changes |
|---|---|
| `frontend/src/api/services/crmService.js` | Add `crmGetMaxRedeemable(token, billAmount)` (~12 lines) |
| `frontend/src/pages/ReviewOrder.jsx` | Add `crmToken` to useAuth destructure (T1); add `maxRedeemable` state (T2); add max-redeemable effect (T4); replace `handleUsePoints` (T4); update inline display (T5) |

## 7. Files WILL NOT touch (if D2=b)

`LoyaltyRewardsSection.jsx` · `AuthContext.jsx` · `CartContext.js` · `server.py` · `App.js`

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
Code reality: FULL — all touch points confirmed with exact line numbers
Risk: HIGH
Files WILL change: crmService.js · ReviewOrder.jsx
Files WILL NOT touch: LoyaltyRewardsSection.jsx · AuthContext.jsx · server.py · App.js
Owner decisions: D1 (re-call trigger — rec: subtotal change debounced) · D2 (earn preview — rec: keep local, ask CRM) · D3 (failure mode — rec: disable Use)
Docs: memory/change_requests/CR-2026-10-09-003-max-redeemable-server-side/IMPACT_ANALYSIS.md
Next: D1/D2/D3 confirmed → Implementation Plan → "Gate 3 accepted for CR-2026-10-09-003"
```
