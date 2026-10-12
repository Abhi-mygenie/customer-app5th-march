# IMPLEMENTATION PLAN — CR-2026-10-12-002
## Coupon List Engine Path — CRM CR-122 Adoption

**Written by:** Role 2 — Planning Agent · **Date:** 2026-10-12
**Gate:** HOLD — do not implement until owner approves this plan and D-TW design.

---

## Step 1 — `crmService.js` (2 edits)

**1a `crmGetCouponList`** — add `orderTotal` (5th param). Append `order_total` to params when a finite number ≥ 0.
```js
export const crmGetCouponList = async (token, channel = 'dine_in', restaurantId = null, orderTotal = null) => {
  const params = new URLSearchParams({ channel });
  if (!token && restaurantId) params.append('restaurant_id', String(restaurantId));
  if (Number.isFinite(orderTotal)) params.append('order_total', String(orderTotal)); // CR-2026-10-12-002
  ...unchanged
};
```
Return value unchanged (`data` = `{ coupons, recommended_code, recommended_discount }`).

**1b `crmValidateCoupon`** — add `items = []` (6th param); `body.items = items`. Marker `// CR-2026-10-12-002`.

Test: curl-equivalent already proven live (validation doc §1).

## Step 2 — `ReviewOrder.jsx` items builder (1 helper, top of file next to `buildOrderItems`)
```js
// CR-2026-10-12-002: CRM /validate items[] shape
const buildCrmItems = (cartItems) => (cartItems || []).map(ci => ({
  food_id: String(ci.itemId),
  item_id: String(ci.itemId),
  name: ci.item?.name || 'Item',
  quantity: ci.quantity,
  unit_price: ci.item?.price || ci.totalPrice / ci.quantity,
}));
```
Pass `buildCrmItems(cartItems)` as 6th arg in **both** `crmValidateCoupon` calls (L946, L955).

## Step 3 — `ReviewOrder.jsx` list effect (replace L600–614)
- Add state `const [recommendedCode, setRecommendedCode] = useState(null);`
- Add `subtotal` to deps; wrap fetch in 500 ms `setTimeout` (mirror max-redeemable effect).
- On success: `setCouponList(data?.coupons || [])`, `setRecommendedCode(data?.recommended_code ?? null)`.
- On catch: if `err.status === 429` keep previous list; else `setCouponList([])`.
- Skip fetch when `subtotal <= 0`.

## Step 4 — `ReviewOrder.jsx` auto-apply (new effect + ref)
```js
const autoApplyAttempted = useRef(false); // CR-2026-10-12-002 D-AUTO: once per mount
useEffect(() => {
  if (autoApplyAttempted.current || !recommendedCode) return;
  if (appliedCouponCode || couponCode.trim() || isUsingPoints || isEditMode || couponLoading) return;
  autoApplyAttempted.current = true;
  handleTapCoupon(recommendedCode);
}, [recommendedCode]);
```
Existing `applyValidResult` toast ("Coupon applied — ₹X off") is the diner's only signal — accepted by owner (silent auto-apply). `handleRemoveCoupon` unchanged → removal is sticky because the ref is already set.

## Step 5 — `errorMap` (+5 entries)
```
MISSING_ITEMS_FOR_BXGY_COUPON: 'Add the required items to your cart to use this coupon',
MISSING_ITEMS_FOR_ITEM_COUPON: 'Add the required items to your cart to use this coupon',
NO_ELIGIBLE_BUY_ITEMS_IN_CART: 'Your cart doesn't have the items this coupon needs',
PER_USER_LIMIT:                "You've already used this coupon the maximum number of times",
NOT_FOUND:                     'Invalid coupon code',
```

## Step 6 — `CouponDiscoveryList.jsx`
- `formatDiscount`: after `rcv` check add `if (coupon.offer_type && coupon.offer_type !== 'simple') return null;` (B7 safety net); keep rest.
- Title: `{c.title || c.display_title}` (B6, pending D-TITLE).
- Time window (B5): `const outOfWindow = c.time_window?.configured && c.time_window?.within_window_now === false;`
  - `disabled={outOfWindow}`, `opacity: 0.5`, cursor default, `data-testid="coupon-list-item-{code}-unavailable"` suffix.
  - Replace discount chip with `Valid {start_time}–{end_time}` (24h as CRM sends; design TBD).
- Recommended badge: optional "Best offer" pill when `c.code === recommendedCode` (prop) — include only if owner wants a visual (not required by D-AUTO).

## Step 7 — Build + hand to QA
- `yarn build` clean.
- QA_HANDOVER with cases:
  1. ₹96 cart anon → STO-GENERIC-MIN absent; GYAN auto-applied; toast; `coupon-applied-row` shows GYAN
  2. Remove GYAN → list reappears, GYAN not re-applied; add item → list refetches, still not re-applied
  3. ₹960 cart → STO-GENERIC-MIN present
  4. Auth (Saurav) → MARRY auto-applied (197)
  5. BXGY card shows "Tap to see discount"; cart without 182043 → tap → mapped message; cart 182043×3 → tap → ₹99
  6. SEED_V3A_EVERYDAY greyed, non-tappable, "Valid 17:00–19:00"
  7. Legacy tolerance: mock list without `recommended_code` → no crash, no auto-apply
  8. Place Order payload still carries `coupon_code` = applied code (money path regression)
  9. Rapid cart edits → ≤1 list call per 500 ms; no 429 toast
- Then run CR-2026-10-11-009 QA in the same session (R8).

## Registry updates on implementation
- CR-2026-10-12-002 → IMPLEMENTED
- BUG-2026-10-12-001 → CLOSED (superseded by CR-2026-10-12-002)

## Open owner items before gate opens
1. D-TW visual design (grey-out style, 24h vs 12h time, "Valid" wording)
2. D-TITLE confirm `title` over `display_title`
3. B8 opt-in: re-validate applied coupon on subtotal change (fixes pre-existing stale discount, R5)
