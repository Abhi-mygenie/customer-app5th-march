# IMPLEMENTATION PLAN — CR-2026-10-12-002 (Rev 3 · edit-by-edit)
## Coupon List Engine Path — CRM CR-122 adoption (+ folded CR-2026-10-11-003)

**Written by:** Role 2 — Planning Agent · **Rev 3:** 2026-10-12 · **Risk:** MEDIUM
**Gate:** HOLD — one approval covers Session Part A (CR-2026-10-12-003) + Part B (this) + BUG-2026-10-12-003.
**Supersedes Rev 2** for edit detail; decisions, matrix and sequencing from Rev 2 remain in force.
Line numbers as of 2026-10-12 **before** Part A; Part A shifts the max-redeemable effect by +6 lines — Role 3 re-greps every anchor.

## Owner decisions (ruled) — unchanged
D-AUTO silent auto-apply · D-LOYALTY L-A · D-REFETCH 500 ms · D-TW Variant A, 12-hour · D-TITLE CRM `title` · B8 included · CR-2026-10-11-003 folded.

## Reference assets (copy verbatim)
- `plan_assets/CouponDiscoveryList.jsx` — full replacement for `frontend/src/components/CouponDiscoveryList/CouponDiscoveryList.jsx` (helpers `fmt12`/`windowLabel` verified in node: "Valid 5–7 PM", "Valid 11 AM–2 PM", "Valid 10 PM–2 AM · Fri, Sat").
- `plan_assets/CouponDiscoveryList.css` — new file, same folder.

---

## Part B-1 · `frontend/src/api/services/crmService.js`

**B1a — `crmGetCouponList` (L418–426)**
```js
// OLD
export const crmGetCouponList = async (token, channel = 'dine_in', restaurantId = null) => {
  const params = new URLSearchParams({ channel });
  if (!token && restaurantId) params.append('restaurant_id', String(restaurantId));
// NEW
export const crmGetCouponList = async (token, channel = 'dine_in', restaurantId = null, orderTotal = null) => {
  const params = new URLSearchParams({ channel });
  if (!token && restaurantId) params.append('restaurant_id', String(restaurantId));
  if (Number.isFinite(orderTotal) && orderTotal > 0) params.append('order_total', String(orderTotal)); // CR-2026-10-12-002: engine path (CRM CR-122)
```
Docblock: add `* order_total → engine path: filtered list + recommended_code/recommended_discount (CR-2026-10-12-002)`.

**B1b — `crmValidateCoupon` (L392–398)**
```js
// OLD
export const crmValidateCoupon = async (token, code, orderTotal, channel = 'dine_in', restaurantId = null) => {
  const body = {
    code: code.trim(),
    order_total: orderTotal,
    channel,
    items: [],
  };
// NEW
export const crmValidateCoupon = async (token, code, orderTotal, channel = 'dine_in', restaurantId = null, items = []) => {
  const body = {
    code: code.trim(),
    order_total: orderTotal,
    channel,
    items, // CR-2026-10-12-002: cart items for requires_cart_validation coupons (CRM CR-122)
  };
```

## Part B-2 · `frontend/src/pages/ReviewOrder.jsx`

**B2a — module helpers** (insert after `toE164India` block, before `const buildPreviousItems`)
```js
// CR-2026-10-12-002: CRM /validate items[] shape (food_id|item_id + quantity + unit_price minimum)
const buildCrmItems = (cartItems) => (cartItems || []).map(ci => ({
  food_id: String(ci.itemId),
  item_id: String(ci.itemId),
  name: ci.item?.name || 'Item',
  quantity: ci.quantity,
  unit_price: ci.item?.price || ci.totalPrice / ci.quantity,
}));

// CR-2026-10-11-008: full CRM error code map · CR-2026-10-12-002: +5 engine-path codes, hoisted for B8 re-validate
const COUPON_ERROR_MAP = {
  INVALID_CODE:                  'Invalid coupon code',
  NOT_FOUND:                     'Invalid coupon code',
  EXPIRED:                       'This coupon has expired',
  INACTIVE:                      'This coupon is no longer valid',
  CUSTOMER_USAGE_LIMIT_REACHED:  "You've already used this coupon the maximum number of times",
  PER_USER_LIMIT:                "You've already used this coupon the maximum number of times",
  CUSTOMER_NOT_ELIGIBLE:         'This coupon is not available for your account',
  MIN_ORDER_NOT_MET:             'Minimum order value not met for this coupon',
  CHANNEL_NOT_VALID:             'This coupon is not valid for this order type',
  OUTSIDE_TIME_WINDOW:           'This coupon is only valid during specific hours',
  CUSTOMER_REQUIRED:             'Enter your phone number to use this coupon',
  MISSING_ITEMS_FOR_BXGY_COUPON: 'Add the required items to your cart to use this coupon',
  MISSING_ITEMS_FOR_ITEM_COUPON: 'Add the required items to your cart to use this coupon',
  NO_ELIGIBLE_BUY_ITEMS_IN_CART: "Your cart doesn't have the items this coupon needs",
};
```

**B2b — state** (after L208 `couponListLoading`)
```js
  const [recommendedCode, setRecommendedCode] = useState(null);   // CR-2026-10-12-002: CRM recommended_code
  const autoApplyAttempted = useRef(false);                        // CR-2026-10-12-002 D-AUTO: once per mount
  const autoAppliedCode = useRef(null);                            // CR-2026-10-12-002: for "Best offer applied" cue
  const lastValidatedSubtotal = useRef(null);                      // CR-2026-10-12-002 B8
```

**B2c — restaurant-change reset** (after L408 `setCouponListLoading(false);`)
```js
      setRecommendedCode(null);                  // CR-2026-10-12-002
      autoApplyAttempted.current = false;        // CR-2026-10-12-002
      autoAppliedCode.current = null;            // CR-2026-10-12-002
      lastValidatedSubtotal.current = null;      // CR-2026-10-12-002
```

**B2d — list effect** (replace L609–623 whole effect)
```js
  // CR-2026-10-11-009: coupon discovery list · CR-2026-10-12-002: engine path — pass order_total, debounce on subtotal,
  // keep recommended_code; 429 keeps previous list. Re-fetches when crmToken changes (anon → authenticated).
  useEffect(() => {
    if (!showCoupon) return;
    if (!subtotal || subtotal <= 0) { setCouponList([]); setRecommendedCode(null); return; }
    let cancelled = false;
    setCouponListLoading(true);
    const channel = scannedOrderType === 'dinein' ? 'dine_in' : (scannedOrderType || 'dine_in');
    const timer = setTimeout(() => {
      crmGetCouponList(crmToken || null, channel, crmToken ? null : numericRestaurantId, subtotal)
        .then(data => {
          if (cancelled) return;
          setCouponList(Array.isArray(data) ? data : (data?.coupons || []));
          setRecommendedCode(Array.isArray(data) ? null : (data?.recommended_code ?? null));
        })
        .catch(err => {
          if (cancelled) return;
          if (err?.status === 429) return; // rate-limited: keep what we have
          setCouponList([]); setRecommendedCode(null);
        })
        .finally(() => { if (!cancelled) setCouponListLoading(false); });
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [showCoupon, crmToken, numericRestaurantId, scannedOrderType, subtotal]); // CR-2026-10-12-002: +subtotal
```

**B2e — `handleApplyCoupon`**
- Delete the local `const errorMap = { … };` (L926–936) and replace the three `errorMap` reads with `COUPON_ERROR_MAP` (L968, L972 and `errorMap.CUSTOMER_REQUIRED` L972/973).
- In `applyValidResult` (after `setCouponStackable(stackable);`) add: `lastValidatedSubtotal.current = subtotal; // CR-2026-10-12-002 B8`
- L955: `crmValidateCoupon(activeToken, codeToUse, subtotal, channel, activeToken ? null : numericRestaurantId, buildCrmItems(cartItems))` — marker `// CR-2026-10-12-002: items[]`
- L964: `crmValidateCoupon(authResult.token, codeToUse, subtotal, channel, null, buildCrmItems(cartItems))`

**B2f — `handleRemoveCoupon`** (L986–992) add inside: `autoAppliedCode.current = null; lastValidatedSubtotal.current = null; // CR-2026-10-12-002`

**B2g — auto-apply effect** (insert after `handleTapCoupon`, L~1000)
```js
  // CR-2026-10-12-002 D-AUTO + D-LOYALTY(L-A): auto-apply CRM recommended coupon once per mount,
  // unless the diner can redeem points now and the coupon is non-stackable → badge only.
  useEffect(() => {
    if (autoApplyAttempted.current || !recommendedCode || isEditMode) return;
    if (appliedCouponCode || couponCode.trim() || isUsingPoints || couponLoading) return;
    if (crmToken && maxRedeemableLoading) return;                       // wait for loyalty answer
    const rec = couponList.find(c => c.code === recommendedCode);
    if (!rec) return;
    autoApplyAttempted.current = true;
    if (maxRedeemable?.ok === true && rec.stackable_with_loyalty === false) return; // L-A: badge instead
    autoAppliedCode.current = recommendedCode;
    handleTapCoupon(recommendedCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendedCode, couponList, maxRedeemable, maxRedeemableLoading, crmToken]);
```

**B2h — B8 re-validate effect** (insert directly after B2g)
```js
  // CR-2026-10-12-002 B8: keep an applied coupon truthful when the cart changes (debounced); remove if it no longer qualifies.
  useEffect(() => {
    if (!appliedCouponCode || isEditMode || couponLoading) return;
    if (lastValidatedSubtotal.current === subtotal) return;
    const timer = setTimeout(async () => {
      try {
        const channel = scannedOrderType === 'dinein' ? 'dine_in' : (scannedOrderType || 'dine_in');
        const data = await crmValidateCoupon(crmToken || null, appliedCouponCode, subtotal, channel,
          crmToken ? null : numericRestaurantId, buildCrmItems(cartItems));
        lastValidatedSubtotal.current = subtotal;
        if (data?.valid) {
          setCouponDiscount(data.computed_discount);
        } else {
          const why = COUPON_ERROR_MAP[data?.error?.code] || 'no longer valid for this cart';
          const code = appliedCouponCode;
          handleRemoveCoupon();
          toast(`Coupon ${code} removed — ${why}`);
        }
      } catch {
        // network / 429: keep current discount
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, appliedCouponCode]);
```
Loop check: B8 writes `couponDiscount`; CR-003's max-redeemable effect reads it and writes only `maxRedeemable*`; B2g reads `maxRedeemable` but is guarded by `autoApplyAttempted`. No cycle. ✔

**B2i — applied row cue** (L1976–1980, inside `data-testid="coupon-applied-row"` → `.price-input-group`)
```jsx
// OLD
                      <span className="price-loyalty-text price-loyalty-applied" data-testid="coupon-applied-label">
                        {appliedCouponCode} — ₹{couponDiscount.toFixed(0)} off
                      </span>
// NEW
                      <span style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="price-loyalty-text price-loyalty-applied" data-testid="coupon-applied-label">
                          {appliedCouponCode} — ₹{couponDiscount.toFixed(0)} off
                        </span>
                        {autoAppliedCode.current === appliedCouponCode && ( // CR-2026-10-12-002: silent auto-apply cue
                          <span className="cdl-applied-cue" data-testid="coupon-auto-applied-cue">Best offer applied</span>
                        )}
                      </span>
```
(`cdl-applied-cue` comes from the new CSS, imported by the component which ReviewOrder already imports.)

**B2j — strip props** (L1993–1998)
```jsx
                        isAuthenticated={isAuthenticated}
                        recommendedCode={recommendedCode} // CR-2026-10-12-002
```

**B2k — folded CR-2026-10-11-003: retry placeOrder** (L1666–1672)
```js
// OLD
              couponCode: appliedCouponCode,  // CR-2026-10-11-001: send CRM-validated code only, not raw input
              restaurantId,
// NEW
              couponCode: appliedCouponCode,  // CR-2026-10-11-001: send CRM-validated code only, not raw input
              couponDiscount,                  // CR-2026-10-11-003 (folded into CR-2026-10-12-002)
              couponTitle: appliedCouponTitle, // CR-2026-10-11-003
              restaurantId,
```

## Part B-3 · `CouponDiscoveryList.jsx` + `.css`
Replace the component file with `plan_assets/CouponDiscoveryList.jsx`; add `plan_assets/CouponDiscoveryList.css` beside it. `lucide-react@0.516.0` already in package.json — no install.
Test-id map (QA): `coupon-card-normal-{code}` · `coupon-card-mystery-{code}` · `coupon-card-disabled-{code}` · `coupon-best-offer-badge` · `coupon-strip-container` · `coupon-discovery-list` · `coupon-list-loading` · `coupon-auto-applied-cue`. **Breaking for QA scripts:** old `coupon-list-item-{code}` is gone — CR-009 QA handover must be updated to the new ids.

## Part B-4 · self-test (Role 3)
1. `yarn build` clean. 2. `grep -c "CR-2026-10-12-002"` ReviewOrder ≥ 14, crmService 2, component 1. 3. Old `coupon-list-item-` grep → 0 in src. 4. node: `fmt12`/`windowLabel` table (done in planning, re-run). 5. Live when POS up: V1 (anon ₹96 → GYAN auto-applied + cue), V4 (Saurav has points → badge, no apply), V6 (greyed happy-hour), V7/V8 (B8). 6. If POS down → S-live BLOCKED, hand to QA with that flag.

## Verification matrix → QA: V1–V13 (Rev 2) + V14 (retry payload) + L1–L9 (Part A) + CR-009 regressions on new test ids.
