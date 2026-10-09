# IMPLEMENTATION PLAN — CR-2026-10-09-003
## Replace client-side G3 caps with `POST /scan/max-redeemable`

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-09
**Gate:** Gate 3 accepted
**Risk:** HIGH
**Files changing:** `crmService.js` · `ReviewOrder.jsx` · `LoyaltyRewardsSection.jsx`
**Files NOT touched:** `AuthContext.jsx` · `CartContext.js` · `server.py` · `App.js`

---

## Decisions locked

| D | Decision |
|---|---|
| D1 | **(b)** Re-call `crmGetMaxRedeemable` on every `subtotal` change, debounced 500ms. Effect deps: `[isAuthenticated, crmToken, subtotal]` |
| D2 | **(a)** Replace `pointsToEarn` in LoyaltyRewardsSection Variant 1 with `projectedPointsEarned` from CRM when available; client-side as fallback |
| D3 | **(a)** On CRM error, `maxRedeemable = null` → Use button disabled. No client-side fallback |

---

## Pre-flight checks (Role 3 must run before first edit)

```bash
# 1. Anchor: import line
grep -n "crmGetLoyaltyRules" /app/frontend/src/pages/ReviewOrder.jsx
# Expected: line 41

# 2. Anchor: useAuth destructure
grep -n "useAuth" /app/frontend/src/pages/ReviewOrder.jsx | head -3
# Expected: line 90

# 3. Anchor: state declarations block
grep -n "loyaltySettings\|isUsingPoints\|pointsToRedeem" /app/frontend/src/pages/ReviewOrder.jsx | head -6
# Expected: 237, 240, 242

# 4. Anchor: handleUsePoints
grep -n "handleUsePoints\|CR-2026-10-03-004 Part B: G1" /app/frontend/src/pages/ReviewOrder.jsx | head -4
# Expected: 820, 821

# 5. Anchor: inline display
grep -n "Loyalty Points - inline\|redeem-loyalty-btn" /app/frontend/src/pages/ReviewOrder.jsx | head -3
# Expected: 1843, 1885

# 6. Anchor: LoyaltyRewardsSection call
grep -n "LoyaltyRewardsSection" /app/frontend/src/pages/ReviewOrder.jsx | tail -3
# Expected: ~1994

# 7. Anchor: crmService end of crmGetLoyaltyRules
grep -n "crmGetLoyaltyRules\|Profile.*CRM token" /app/frontend/src/api/services/crmService.js | head -5
# Expected: 349, 360

# 8. Boundary: no existing maxRedeemable
grep -rn "maxRedeemable\|crmGetMaxRedeemable\|max-redeemable" /app/frontend/src/
# Expected: 0 results
```

---

## Edits — 10 exact edits, apply in order listed below

---

### E1 · `crmService.js` — add `crmGetMaxRedeemable` after `crmGetLoyaltyRules` (after line 357)

**Add** immediately after the closing `};` of `crmGetLoyaltyRules` and before the `// Profile — CRM token required` comment:

```javascript
/**
 * CR-2026-10-09-003: Server-side max loyalty redemption for a bill amount.
 * Replaces client-side G3 cap calculation in handleUsePoints (ReviewOrder.jsx).
 *
 * v2 path: POST /scan/max-redeemable — body { bill_amount }
 * Auth: customer Bearer token required.
 * crmAuthFetch unwraps {success, message, data} envelope → caller receives data directly.
 * Returns: { ok, code, max_points_redeemable, max_discount_value, ratio_per_point,
 *            available_points, min_redemption_points, loyalty_enabled, projected_points_earned }
 * D3=(a): caller sets maxRedeemable=null on error → Use button disabled.
 */
export const crmGetMaxRedeemable = async (token, billAmount) => {
  return crmAuthFetch('/scan/max-redeemable', token, {
    method: 'POST',
    body: JSON.stringify({ bill_amount: billAmount }),
  });
};
```

---

### E2 · `ReviewOrder.jsx:41` — add `crmGetMaxRedeemable` to import

**Before:**
```javascript
import { crmGetLoyaltyRules } from '../api/services/crmService'; // CR-2026-10-03-004 Part B
```

**After:**
```javascript
import { crmGetLoyaltyRules, crmGetMaxRedeemable } from '../api/services/crmService'; // CR-2026-10-03-004 Part B · CR-2026-10-09-003
```

---

### E3 · `ReviewOrder.jsx:90` — add `crmToken` to `useAuth()` destructure

**Before:**
```javascript
  const { isAuthenticated, user, isCustomer, setRestaurantScope } = useAuth();
```

**After:**
```javascript
  const { isAuthenticated, user, isCustomer, setRestaurantScope, crmToken } = useAuth();
```

---

### E4 · `ReviewOrder.jsx:237–244` — add `maxRedeemable` state after loyalty state declarations

**Before:**
```javascript
  // Loyalty settings for points calculation
  const [loyaltySettings, setLoyaltySettings] = useState(null);

  // Points redemption state
  const [isUsingPoints, setIsUsingPoints] = useState(false);
  const [showNonQrBlockModal, setShowNonQrBlockModal] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
```

**After:**
```javascript
  // Loyalty settings for points calculation
  const [loyaltySettings, setLoyaltySettings] = useState(null);

  // CR-2026-10-09-003: CRM server-side max redemption state
  const [maxRedeemable, setMaxRedeemable] = useState(null);
  const [maxRedeemableLoading, setMaxRedeemableLoading] = useState(false);

  // Points redemption state
  const [isUsingPoints, setIsUsingPoints] = useState(false);
  const [showNonQrBlockModal, setShowNonQrBlockModal] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
```

---

### E5 · `ReviewOrder.jsx` — add max-redeemable effect after `fetchLoyaltyRules` effect (after line 153)

**Add** immediately after the `fetchLoyaltyRules` useEffect closing `}, [numericRestaurantId]);`:

```javascript
  // CR-2026-10-09-003: CRM server-side redemption cap — D1=(b) re-call on subtotal change debounced
  useEffect(() => {
    if (!isAuthenticated || !crmToken) {
      setMaxRedeemable(null);
      return;
    }
    if (!subtotal || subtotal <= 0) {
      setMaxRedeemable(null);
      return;
    }
    setMaxRedeemableLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await crmGetMaxRedeemable(crmToken, subtotal);
        setMaxRedeemable(result);
      } catch (err) {
        // D3=(a): disable Use on failure — safer than over-redemption
        logger.error('order', 'Failed to fetch max-redeemable:', err);
        setMaxRedeemable(null);
      } finally {
        setMaxRedeemableLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, crmToken, subtotal]);
```

---

### E6 · `ReviewOrder.jsx:820–849` — replace `handleUsePoints`

**Before:**
```javascript
  // Handle loyalty points redemption
  // CR-2026-10-03-004 Part B: G1 per-tier redemption value; G3 CRM redemption caps enforced
  const handleUsePoints = () => {
    const availablePoints = isAuthenticated ? (user?.total_points || 0) : (lookedUpCustomer?.total_points || 0);
    const tier = (isAuthenticated ? user?.tier : lookedUpCustomer?.tier) || 'Bronze';
    const tierKey = `${tier.toLowerCase()}_redemption_value`;
    const redemptionValue = loyaltySettings?.[tierKey] || loyaltySettings?.bronze_redemption_value || 0;

    if (!availablePoints || !redemptionValue) return;

    // G3: CRM caps — each enforced independently; most restrictive wins
    const minPoints = loyaltySettings?.min_redemption_points || 0;
    if (availablePoints < minPoints) return; // below floor — cannot redeem

    // Cap 1: can't exceed subtotal
    let maxDiscount = subtotal;
    // Cap 2: max_redemption_percent (% of subtotal)
    const maxPct = loyaltySettings?.max_redemption_percent;
    if (maxPct) maxDiscount = Math.min(maxDiscount, subtotal * (maxPct / 100));
    // Cap 3: max_redemption_amount (absolute ₹ ceiling, e.g. ₹110 on restaurant 689)
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

**After:**
```javascript
  // Handle loyalty points redemption
  // CR-2026-10-09-003: replaced client-side G3 cap calculation with CRM server-authoritative max-redeemable
  const handleUsePoints = () => {
    if (!maxRedeemable?.ok) return;
    setPointsToRedeem(maxRedeemable.max_points_redeemable);
    setPointsDiscount(maxRedeemable.max_discount_value);
    setIsUsingPoints(true);
  };
```

---

### E7 · `ReviewOrder.jsx:1843–1893` — update inline loyalty display

**Before:**
```javascript
              {/* Loyalty Points - inline */}
              {showLoyalty && (
                (() => {
                  const pts = lookedUpCustomer?.found 
                    ? (lookedUpCustomer?.total_points || 0) 
                    : (isAuthenticated ? (user?.total_points || 0) : 0);
                  // CR-2026-10-03-004 Part B: G1 per-tier redemption value
                  const _tier = (isAuthenticated ? user?.tier : lookedUpCustomer?.tier) || 'Bronze';
                  const rdv = loyaltySettings?.[`${_tier.toLowerCase()}_redemption_value`] || loyaltySettings?.bronze_redemption_value || 0;
                  
                  // If points are being used, show the applied discount
                  if (isUsingPoints && pointsToRedeem > 0) {
                    return (
                      <div className="price-row price-row-input price-row-discount">
                        <div className="price-input-group">
                          <span className="price-input-icon">🎁</span>
                          <span className="price-loyalty-text price-loyalty-applied">
                            Using {pointsToRedeem} points (-₹{pointsDiscount.toFixed(0)})
                          </span>
                        </div>
                        <button 
                          className="price-inline-btn price-inline-btn-remove" 
                          data-testid="remove-loyalty-btn"
                          onClick={handleRemovePoints}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  }
                  
                  // Show available points with Use button
                  return (
                    <div className="price-row price-row-input">
                      <div className="price-input-group">
                        <span className="price-input-icon">🎁</span>
                        <span className="price-loyalty-text">
                          {pts} points{rdv ? ` (Worth ₹${(pts * rdv).toFixed(0)})` : ''}
                        </span>
                      </div>
                      <button 
                        className="price-inline-btn" 
                        data-testid="redeem-loyalty-btn" 
                        disabled={!pts}
                        onClick={handleUsePoints}
                      >
                        Use
                      </button>
                    </div>
                  );
                })()
              )}
```

**After:**
```javascript
              {/* Loyalty Points - inline */}
              {/* CR-2026-10-09-003: display driven by CRM max-redeemable response */}
              {showLoyalty && (
                (() => {
                  // Applied state — unchanged
                  if (isUsingPoints && pointsToRedeem > 0) {
                    return (
                      <div className="price-row price-row-input price-row-discount" data-testid="loyalty-points-applied-row">
                        <div className="price-input-group">
                          <span className="price-input-icon">🎁</span>
                          <span className="price-loyalty-text price-loyalty-applied" data-testid="loyalty-points-applied-label">
                            Using {pointsToRedeem} points (-₹{pointsDiscount.toFixed(0)})
                          </span>
                        </div>
                        <button
                          className="price-inline-btn price-inline-btn-remove"
                          data-testid="loyalty-points-remove-button"
                          onClick={handleRemovePoints}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  }

                  // Loading skeleton — while CRM call in-flight
                  if (maxRedeemableLoading) {
                    return (
                      <div className="price-row price-row-input" data-testid="loyalty-points-loading-skeleton">
                        <div className="price-input-group" style={{ flex: 1 }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#E5E7EB', animation: 'pulse 1.4s infinite', marginRight: 8 }} />
                          <div style={{ height: 13, width: 140, borderRadius: 6, background: '#E5E7EB', animation: 'pulse 1.4s infinite' }} />
                        </div>
                        <div style={{ height: 24, width: 44, borderRadius: 9999, background: '#E5E7EB', animation: 'pulse 1.4s infinite' }} />
                      </div>
                    );
                  }

                  // Below minimum — show hint
                  const isBelowMin = maxRedeemable && !maxRedeemable.ok && maxRedeemable.code === 'BELOW_MIN_REDEMPTION';
                  if (isBelowMin) {
                    const needed = maxRedeemable.min_redemption_points - (maxRedeemable.available_points || 0);
                    return (
                      <div className="price-row price-row-input" data-testid="loyalty-points-disabled-row">
                        <div className="price-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span className="price-input-icon" style={{ opacity: 0.4 }}>🎁</span>
                            <span className="price-loyalty-text" style={{ color: '#9CA3AF' }} data-testid="loyalty-points-disabled-label">
                              Points redemption
                            </span>
                          </div>
                          <span style={{ fontSize: 10.5, color: '#D97706', paddingLeft: 18 }} data-testid="loyalty-points-below-min-subtext">
                            {needed > 0 ? `Add ₹${needed} more to redeem` : 'Not enough points to redeem'}
                          </span>
                        </div>
                        <button className="price-inline-btn" data-testid="loyalty-points-disabled-button" disabled style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                          Use
                        </button>
                      </div>
                    );
                  }

                  // Normal redeemable state
                  const canRedeem = maxRedeemable?.ok;
                  return (
                    <div className="price-row price-row-input" data-testid="loyalty-points-inline-row">
                      <div className="price-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className="price-input-icon">🎁</span>
                          <span className="price-loyalty-text" data-testid="loyalty-points-label">
                            {canRedeem
                              ? `Use up to ${maxRedeemable.max_points_redeemable} pts (₹${maxRedeemable.max_discount_value.toFixed(0)} off)`
                              : 'Points redemption unavailable'}
                          </span>
                        </div>
                        {canRedeem && maxRedeemable.available_points > 0 && (
                          <span style={{ fontSize: 10.5, color: '#888', paddingLeft: 18 }} data-testid="loyalty-points-balance-subtext">
                            {maxRedeemable.available_points.toLocaleString()} pts available
                          </span>
                        )}
                      </div>
                      <button
                        className="price-inline-btn"
                        data-testid="loyalty-points-use-button"
                        disabled={!canRedeem}
                        onClick={handleUsePoints}
                        style={!canRedeem ? { background: '#F3F4F6', color: '#9CA3AF' } : {}}
                      >
                        Use
                      </button>
                    </div>
                  );
                })()
              )}
```

---

### E8 · `ReviewOrder.jsx:1994–2002` — add `projectedPointsEarned` prop to LoyaltyRewardsSection

**Before:**
```javascript
          <LoyaltyRewardsSection
            configShowLoyaltyPoints={configShowLoyaltyPoints}
            restaurant={restaurant}
            isAuthenticated={isAuthenticated}
            user={user}
            lookedUpCustomer={lookedUpCustomer}
            loyaltySettings={loyaltySettings}
            totalToPay={totalToPay}
          />
```

**After:**
```javascript
          <LoyaltyRewardsSection
            configShowLoyaltyPoints={configShowLoyaltyPoints}
            restaurant={restaurant}
            isAuthenticated={isAuthenticated}
            user={user}
            lookedUpCustomer={lookedUpCustomer}
            loyaltySettings={loyaltySettings}
            totalToPay={totalToPay}
            projectedPointsEarned={maxRedeemable?.projected_points_earned ?? null}
          />
```

---

### E9 · `LoyaltyRewardsSection.jsx:11–18` — add `projectedPointsEarned` prop

**Before:**
```javascript
const LoyaltyRewardsSection = ({
  configShowLoyaltyPoints,
  restaurant,
  isAuthenticated,
  user,
  lookedUpCustomer,
  loyaltySettings,
  totalToPay,
}) => {
```

**After:**
```javascript
const LoyaltyRewardsSection = ({
  configShowLoyaltyPoints,
  restaurant,
  isAuthenticated,
  user,
  lookedUpCustomer,
  loyaltySettings,
  totalToPay,
  projectedPointsEarned, // CR-2026-10-09-003 D2=(a): CRM server-authoritative earn preview; null = use client-side fallback
}) => {
```

---

### E10 · `LoyaltyRewardsSection.jsx:33` — use `projectedPointsEarned` in Variant 1

**Before:**
```javascript
    const pointsToEarn = Math.round(billAmount * (earnPercent / 100));
```

**After:**
```javascript
    // CR-2026-10-09-003 D2=(a): CRM projected_points_earned is authoritative; client-side as fallback
    const pointsToEarn = (projectedPointsEarned !== null && projectedPointsEarned !== undefined)
      ? projectedPointsEarned
      : Math.round(billAmount * (earnPercent / 100));
```

---

## Edit summary

| ID | File | What | Risk |
|---|---|---|---|
| E1 | `crmService.js` | Add `crmGetMaxRedeemable` (~16 lines) | MEDIUM |
| E2 | `ReviewOrder.jsx:41` | Add `crmGetMaxRedeemable` to import | LOW |
| E3 | `ReviewOrder.jsx:90` | Add `crmToken` to `useAuth()` destructure | LOW |
| E4 | `ReviewOrder.jsx:237–244` | Add `maxRedeemable` + `maxRedeemableLoading` states | LOW |
| E5 | `ReviewOrder.jsx` after line 153 | Add max-redeemable effect (debounced, D1=b) | HIGH |
| E6 | `ReviewOrder.jsx:820–849` | Replace `handleUsePoints` (client-side caps → CRM values) | HIGH |
| E7 | `ReviewOrder.jsx:1843–1893` | Replace inline loyalty display (4 states: applied/loading/below-min/normal) | HIGH |
| E8 | `ReviewOrder.jsx:1994–2002` | Add `projectedPointsEarned` prop to LoyaltyRewardsSection | LOW |
| E9 | `LoyaltyRewardsSection.jsx:11–18` | Accept `projectedPointsEarned` prop | LOW |
| E10 | `LoyaltyRewardsSection.jsx:33` | Use `projectedPointsEarned` with client-side fallback | MEDIUM |

**Net: ~85 lines removed (handleUsePoints + old inline display), ~95 lines added. 3 files.**

---

## Apply order (bottom-up within each file)

1. **`crmService.js`** — E1 (add after line 357, no line shift)
2. **`ReviewOrder.jsx`** — bottom-up: E8 (~1994) → E7 (~1843) → E6 (~820) → E4 (~237) → E5 (after ~153) → E3 (~90) → E2 (~41)
3. **`LoyaltyRewardsSection.jsx`** — E10 (line 33) → E9 (lines 11–18)

---

## Self-test checklist (Role 3 must complete before QA handover)

| ST | Test | How | Expected |
|---|---|---|---|
| ST1 | No old cap logic remains | `grep -n "max_redemption_amount\|max_redemption_percent\|min_redemption_points" ReviewOrder.jsx` | 0 results (only in comments if any) |
| ST2 | maxRedeemable effect fires | Chrome DevTools Network → load ReviewOrder page authenticated | POST /scan/max-redeemable appears within 500ms |
| ST3 | handleUsePoints uses CRM values | DevTools → tap Use → `pointsToRedeem === maxRedeemable.max_points_redeemable` | ✅ |
| ST4 | Loading skeleton shows | Throttle to Slow 3G → load page → loyalty row | Shimmer visible |
| ST5 | Below-min state | Log in with < 100 pts or ₹4 order | Row shows "Add ₹X more to redeem", Use disabled |
| ST6 | earn preview shows 150 pts | Authenticated Gold, ₹500 order | "You will earn 150 points" |
| ST7 | Backend unaffected | `sudo supervisorctl status backend` | RUNNING |
| ST8 | `yarn build` | `cd /app/frontend && yarn build` | Clean — 0 errors |

---

## QA test cases

| T | Scenario | Expected |
|---|---|---|
| T1 | ReviewOrder loads (authenticated Gold, r689, ₹500 order) | "Use up to 36 pts (₹108 off)" · "2,000 pts available" · Use button enabled |
| T2 | Add another ₹100 item (total → ₹600) | After 500ms debounce: max-redeemable re-called, new max shown |
| T3 | Tap Use | Row shows "Using 36 points (−₹108)" · Grand Total drops · Remove button visible |
| T4 | Tap Remove | Discount cleared · original total restores |
| T5 | ₹4 order (below min_redemption_points=100) | Row shows disabled state + "Add ₹X more to redeem" |
| T6 | CRM down (disconnect network) | `maxRedeemable=null` → Use disabled; no crash; diner can still order |
| T7 | Earn preview (authenticated Gold, ₹500) | "You will earn 150 points on this order! Worth ₹450" |
| T8 | Guest (not authenticated) | max-redeemable NOT called; earn preview uses client-side calculation |
| T9 | `yarn build` | Clean |

---

## Code markers

```javascript
// CR-2026-10-09-003: <brief reason>
```

---

```
Planning complete: CR-2026-10-09-003
Stage: Impact Analysis + Implementation Plan (both complete)
Code reality: FULL — 10 exact edits with before/after anchored to current file state
Risk: HIGH
Files WILL change: crmService.js (E1) · ReviewOrder.jsx (E2–E8) · LoyaltyRewardsSection.jsx (E9–E10)
Files WILL NOT touch: AuthContext.jsx · CartContext.js · server.py · App.js
Decisions: D1=(b) · D2=(a) · D3=(a) — all locked
Status: AT GATE — no code written
Next: "Gate 3 accepted for CR-2026-10-09-003" → Role 3 implementation begins
```
