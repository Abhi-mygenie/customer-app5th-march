# IMPLEMENTATION PLAN — CR-2026-10-12-003 (Rev 2 · edit-by-edit)
## Loyalty earn preview — CRM CR-123 adoption

**Written by:** Role 2 — Planning Agent · **Date:** 2026-10-12 · **Risk:** MEDIUM
**Gate:** HOLD — executes as **Session Part A** (before CR-2026-10-12-002), under the joint approval.
Line numbers are as of 2026-10-12 after BUG-2026-10-12-002 landed. Role 3 re-greps anchors before editing.

---

## E1 — `frontend/src/api/services/crmService.js` (replace L372–377)
```js
// OLD
export const crmGetMaxRedeemable = async (token, billAmount) => {
  return crmAuthFetch('/scan/max-redeemable', token, {
    method: 'POST',
    body: JSON.stringify({ bill_amount: billAmount }),
  });
};
```
```js
// NEW
// CR-2026-10-12-003: CRM CR-123 — optional coupon_discount / points_to_redeem shape the earn base
export const crmGetMaxRedeemable = async (token, billAmount, { couponDiscount = 0, pointsToRedeem = 0 } = {}) => {
  const body = { bill_amount: billAmount };
  if (couponDiscount > 0) body.coupon_discount = couponDiscount;
  if (pointsToRedeem > 0) body.points_to_redeem = pointsToRedeem;
  return crmAuthFetch('/scan/max-redeemable', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};
```
Also extend the docblock above it with one line: `Returns +earn_base_preview, points_to_redeem_applied (CR-123).`

## E2 — `frontend/src/pages/ReviewOrder.jsx` max-redeemable effect (L594–608)
```js
// OLD (L596)
        const result = await crmGetMaxRedeemable(crmToken, subtotal);
// NEW
        const result = await crmGetMaxRedeemable(crmToken, subtotal, {
          couponDiscount,                                        // CR-2026-10-12-003
          pointsToRedeem: isUsingPoints ? pointsToRedeem : 0,    // CR-2026-10-12-003
        });
        if (isUsingPoints && result?.points_to_redeem_applied != null && result.points_to_redeem_applied !== pointsToRedeem) {
          logger.warn('order', `[CR-2026-10-12-003] CRM clamped points_to_redeem ${pointsToRedeem} → ${result.points_to_redeem_applied}`); // diagnostic only
        }
```
```js
// OLD (L608)
  }, [isAuthenticated, crmToken, subtotal]);
// NEW
  }, [isAuthenticated, crmToken, subtotal, couponDiscount, isUsingPoints, pointsToRedeem]); // CR-2026-10-12-003: re-fetch on coupon/points change
```
Update the comment at L582: append ` · CR-2026-10-12-003: also on coupon/points change`.
**Loop check:** this effect writes only `maxRedeemable`/`maxRedeemableLoading`; neither is in its own deps. ✔

## E3 — `ReviewOrder.jsx` prop to LoyaltyRewardsSection (L2235)
```jsx
// OLD
            projectedPointsEarned={maxRedeemable?.projected_points_earned ?? null}
// NEW
            projectedPointsEarned={maxRedeemable?.projected_points_earned ?? null}
            earnBasePreview={maxRedeemable?.earn_base_preview ?? null} // CR-2026-10-12-003
```

## E4 — `frontend/src/components/LoyaltyRewardsSection/LoyaltyRewardsSection.jsx`
**E4a props (L18–20)**
```js
// OLD
  totalToPay,
  projectedPointsEarned, // CR-2026-10-09-003 D2=(a): CRM server-authoritative earn preview; null = client-side fallback
}) => {
// NEW
  totalToPay, // kept for prop compatibility; no longer used for earn maths (CR-2026-10-12-003)
  projectedPointsEarned, // CR-2026-10-09-003 · CR-2026-10-12-003: CRM-only; null = no number shown
  earnBasePreview = null, // CR-2026-10-12-003: CRM earn_base_preview (₹ the % was applied to)
}) => {
```
**E4b Variant 1 body (L28–66) — replace the maths + JSX branch**
```js
// OLD (L30–37)
    const earnPercent = loyaltySettings[`${tier}_earn_percent`] || loyaltySettings.bronze_earn_percent || 5;
    const billAmount = totalToPay;
    const minOrderValue = loyaltySettings.min_order_value || 100;
    const isEligible = billAmount >= minOrderValue;
    const pointsToEarn = (projectedPointsEarned !== null && projectedPointsEarned !== undefined)
      ? projectedPointsEarned
      // CR-2026-10-09-003 D2=(a): CRM projected_points_earned is authoritative; client-side as fallback
      : Math.round(billAmount * (earnPercent / 100));
// NEW
    // CR-2026-10-12-003 C4: CRM is the only source — no client-side estimate (post-tax total was wrong)
    const minOrderValue = loyaltySettings.min_order_value || 100;
    const hasPreview = projectedPointsEarned !== null && projectedPointsEarned !== undefined;
    const pointsToEarn = hasPreview ? projectedPointsEarned : 0;
    const belowMin = hasPreview && pointsToEarn === 0 && earnBasePreview !== null && earnBasePreview < minOrderValue;
```
```jsx
// OLD (L52–66)  {isEligible ? ( …earn N… ) : ( Almost there! / Add ₹… )}
// NEW
            {!hasPreview ? (
              <>
                <span className="user-info-name">Earn rewards on this order!</span>
                <span className="user-info-points">Points are calculated on food value after discounts</span>
              </>
            ) : belowMin ? (
              <>
                <span className="user-info-name">Almost there!</span>
                <span className="user-info-points">
                  Add ₹{(minOrderValue - earnBasePreview).toFixed(0)} more to earn points
                </span>
              </>
            ) : (
              <>
                <span className="user-info-name">
                  You will earn {pointsToEarn} points on this order!
                </span>
                <span className="user-info-points">
                  Worth ₹{pointsWorth}{firstVisitBonus > 0 ? ` + ${firstVisitBonus} bonus points for first visit` : ''}
                </span>
              </>
            )}
```
(`pointsWorth`, `firstVisitBonus`, `redemptionValue` lines L38–43 stay; `earnPercent` line is deleted — grep that nothing else uses it in this file.)

**E4c Variant 3 guest (L94–124) — remove the number**
```js
// DELETE L94–101 (earnPercent, billAmount, pointsToEarn, redemptionValue, pointsWorth, minOrderValue, isEligible)
```
```jsx
// REPLACE the {isEligible ? … : …} block (L108–124) with
            <span className="login-prompt-title">Earn rewards on this order!</span>
            <span className="login-prompt-subtitle">Enter your phone number above to see your points</span>
```
Markers: `// CR-2026-10-12-003` on E4a/E4b/E4c. `data-testid`s unchanged.

## E5 — self-test
- `yarn build` clean.
- node: assert E1 body shape for (0,0) → `{bill_amount}` only; (43.5,0) → +`coupon_discount`; (43.5,36) → both.
- Live (auth Saurav, POS up): apply `STO-GENERIC-10` → network shows second max-redeemable call with `coupon_discount`; "You will earn" number drops. Anonymous: guest prompt without number.

## Verification matrix → QA (L1–L9 as Rev 1, unchanged).
