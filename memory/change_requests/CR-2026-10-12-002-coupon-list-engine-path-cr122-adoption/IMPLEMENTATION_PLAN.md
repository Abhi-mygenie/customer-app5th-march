# IMPLEMENTATION PLAN — CR-2026-10-12-002 (Rev 2)
## Coupon List Engine Path — CRM CR-122 Adoption

**Written by:** Role 2 — Planning Agent · **Rev 1:** 2026-10-12 · **Rev 2:** 2026-10-12 (all owner decisions in)
**Gate:** HOLD — Role 3 may start only after owner writes "Approve CR-2026-10-12-002".
**Risk:** MEDIUM (money path: `coupon_code` → POS; hotspot `ReviewOrder.jsx`). Normal gate flow. Not Fast Lane.

## Owner decisions (all ruled 2026-10-12)
| # | Decision | Ruling |
|---|---|---|
| D-AUTO | Recommended coupon | Silent auto-apply on Review Order open, into coupon field |
| D-LOYALTY | Auto-apply vs points (IA R10) | **L-A** — no auto-apply when diner can redeem points (`maxRedeemable.ok`) and coupon is non-stackable → "Best offer" badge on the card instead |
| D-REFETCH | List on subtotal change | Yes, 500 ms debounce |
| D-TW | Out-of-window card | **Variant A** — solid `#E5E7EB` border, `#F3F4F6` fill, opacity .8, grey title, clock chip, not tappable |
| D-TW time | Chip text | **12-hour** — "Valid 5–7 PM" (CRM sends `17:00`/`19:00` → convert client-side) |
| D-TITLE | Card title | **CRM `title`** (descriptive); fall back to `display_title`, then `code` |
| B8 | Re-validate applied coupon on subtotal change | **Included** |
| Design | Spec + mock-up | `DESIGN_GUIDELINES_coupon_strip.json`; `frontend/public/coupon-strip-design-preview.html` (State A badge / State B auto-applied) |

## 0. Pre-flight for Role 3
| Check | Expected |
|---|---|
| Registry `CR-2026-10-12-002` | `IMPACT_ANALYSIS`, risk MEDIUM, owner approval present in chat |
| `crmGetCouponList` signature `(token, channel, restaurantId)` | `crmService.js` L418 |
| `crmValidateCoupon` builds `items: []` | `crmService.js` L392–405 |
| List effect deps `[showCoupon, crmToken, numericRestaurantId, scannedOrderType]` | `ReviewOrder.jsx` L609–623 |
| `errorMap` 9 entries | L926 |
| `handleUsePoints` non-stackable guard | L899–904 |
| CRM preprod `GET /scan/coupons?restaurant_id=689&order_total=960` returns `recommended_code` | live (R7 verify APIs) |
| POS preprod responding (`/api/v1/web/restaurant-info`) | needed for live self-test; if down, S-live BLOCKED |

## 0b. Step zero of this session — CR-2026-10-12-003 (owner ruling 2026-10-12)
Implement `CR-2026-10-12-003/IMPLEMENTATION_PLAN.md` E1–E5 **first** (max-redeemable gets `coupon_discount` + `points_to_redeem`; re-fetch on coupon/points change; client-side earn estimate dropped). Reason: auto-apply/B8 below change `couponDiscount` on nearly every checkout; without CR-003 the "You will earn N points" preview is overstated. No effect loop (see CR-003 E2). QA matrix L1–L9 joins V1–V13.

## 1. `crmService.js` — 2 edits
**1a** `crmGetCouponList(token, channel, restaurantId, orderTotal = null)` — `if (Number.isFinite(orderTotal)) params.append('order_total', String(orderTotal));` Marker `// CR-2026-10-12-002`.
**1b** `crmValidateCoupon(token, code, orderTotal, channel, restaurantId, items = [])` — `body.items = items`.

## 2. `ReviewOrder.jsx` — module helpers (after `toE164India`)
```js
// CR-2026-10-12-002: CRM /validate items[] shape
const buildCrmItems = (cartItems) => (cartItems || []).map(ci => ({
  food_id: String(ci.itemId), item_id: String(ci.itemId),
  name: ci.item?.name || 'Item', quantity: ci.quantity,
  unit_price: ci.item?.price || ci.totalPrice / ci.quantity,
}));
```

## 3. `ReviewOrder.jsx` — state
```js
const [recommendedCode, setRecommendedCode] = useState(null);      // CR-2026-10-12-002
const autoApplyAttempted = useRef(false);                           // CR-2026-10-12-002 D-AUTO once per mount
```
Reset both in the restaurant-change reset block (where `setCouponList([])` is reset, L~407).

## 4. `ReviewOrder.jsx` — list effect (replace L609–623)
- deps add `subtotal`; skip when `subtotal <= 0`; 500 ms `setTimeout` (mirror L594–605); cleanup clears timer.
- call `crmGetCouponList(crmToken || null, channel, crmToken ? null : numericRestaurantId, subtotal)`.
- success: `setCouponList(data?.coupons || [])`, `setRecommendedCode(data?.recommended_code ?? null)`.
- catch: `err.status === 429` → keep previous list; else `setCouponList([])`, `setRecommendedCode(null)`.

## 5. `ReviewOrder.jsx` — auto-apply effect (D-AUTO + L-A)
```js
useEffect(() => {
  if (autoApplyAttempted.current || !recommendedCode || isEditMode) return;
  if (appliedCouponCode || couponCode.trim() || isUsingPoints || couponLoading) return;
  if (crmToken && maxRedeemableLoading) return;                 // wait for loyalty answer
  const rec = couponList.find(c => c.code === recommendedCode);
  const loyaltyEligible = !!maxRedeemable?.ok;
  const nonStackable = rec?.stackable_with_loyalty === false;
  autoApplyAttempted.current = true;
  if (loyaltyEligible && nonStackable) return;                  // L-A: badge only
  handleTapCoupon(recommendedCode);
}, [recommendedCode, couponList, maxRedeemable, maxRedeemableLoading, crmToken]);
```
`autoApplyAttempted` set before the L-A return so a later list refetch never flips to auto-apply after the diner has seen the badge.

## 6. `ReviewOrder.jsx` — validate calls
Both `crmValidateCoupon` calls (L955, L964) get 6th arg `buildCrmItems(cartItems)`.

## 7. `ReviewOrder.jsx` — errorMap (+5)
`MISSING_ITEMS_FOR_BXGY_COUPON`, `MISSING_ITEMS_FOR_ITEM_COUPON` → 'Add the required items to your cart to use this coupon'; `NO_ELIGIBLE_BUY_ITEMS_IN_CART` → "Your cart doesn't have the items this coupon needs"; `PER_USER_LIMIT` → existing usage-limit text; `NOT_FOUND` → 'Invalid coupon code'.

## 8. `ReviewOrder.jsx` — B8 re-validate applied coupon on subtotal change
New effect, deps `[subtotal]`; guard `appliedCouponCode && !couponLoading && !isEditMode`; 500 ms debounce; call `crmValidateCoupon(crmToken || null, appliedCouponCode, subtotal, channel, crmToken ? null : numericRestaurantId, buildCrmItems(cartItems))`.
- valid → `setCouponDiscount(data.computed_discount)` (silent; title/stackable unchanged).
- invalid → `handleRemoveCoupon()` + `toast(\`Coupon ${appliedCouponCode} removed — ${errorMap[code] || 'no longer valid for this cart'}\`)`. Hoist `errorMap` to module scope so both effects share it.
- network/429 → keep current discount (no change).
Skip the very first run after apply (use a `lastValidatedSubtotal` ref set in `applyValidResult`) to avoid a redundant call.

## 9. `ReviewOrder.jsx` — pass props to strip
`<CouponDiscoveryList coupons={couponList} loading={couponListLoading} onTap={handleTapCoupon} isAuthenticated={isAuthenticated} recommendedCode={recommendedCode} />`
Applied row (L~1974–1988): when `appliedCouponCode === recommendedCode` and the apply came from auto-apply (`autoAppliedRef` set in step 5), render the 9px "BEST OFFER APPLIED" cue under the label per design spec state 5. `data-testid="coupon-auto-applied-cue"`.

## 10. `CouponDiscoveryList.jsx` — rewrite per design spec (states 1–4)
- `formatDiscount`: `if (rcv) return null; if (offer_type && offer_type !== 'simple') return null;` then existing chain (B7 safety net).
- title: `c.title || c.display_title || c.code`.
- `outOfWindow = c.time_window?.configured && c.time_window?.within_window_now === false` → `<div aria-disabled>` with Variant A styles, chip `Valid {fmt12(start)}–{fmt12(end)}`; if `valid_days` present and today excluded, append `· {days}` (e.g. "Sat–Sun"). Not tappable. `data-testid="coupon-card-disabled-{code}"`.
- `fmt12('17:00') → '5 PM'`, `'17:30' → '5:30 PM'`; if `start` and `end` share AM/PM, show once ("5–7 PM").
- cart-validated: pulsing chip "Tap to see discount" with Sparkles icon (lucide-react). `data-testid="coupon-card-mystery-{code}"`.
- `c.code === recommendedCode` → "Best offer" badge (Flame icon), solid border + glow. `data-testid="coupon-best-offer-badge"`.
- discount chip filled `#FFEDD5`; `active:scale-95` via CSS class, transition on `transform` only.
- Keep component < ~120 lines; move styles to `CouponDiscoveryList.css` (new file) instead of inline objects.

## 11. Verification matrix (self-test → QA handover)
| # | Case | Expected |
|---|---|---|
| V1 | anon, ₹96 cart | `STO-GENERIC-MIN` absent; `GYAN` auto-applied; toast; applied row shows cue |
| V2 | anon, remove GYAN | strip returns, GYAN badged, **not** re-applied; add item → refetch, still not re-applied |
| V3 | auth Saurav, points below min (`ok:false`) | `MARRY` auto-applied |
| V4 | auth with redeemable points ≥ min and non-stackable recommended | **no** auto-apply; badge on card; *Use points* works |
| V5 | BXGY card | "Tap to see discount"; cart lacks 182043 → mapped error; cart has 182043×3 → ₹99 applied |
| V6 | `SEED_V3A_EVERYDAY` outside 17–19 IST | greyed, "Valid 5–7 PM", not tappable |
| V7 | B8: apply `STO-GENERIC-MIN` at ₹300+, reduce cart below ₹300 | coupon removed, toast with min-order text |
| V8 | B8: 10% coupon, cart ₹960 → ₹1,500 | discount ₹96 → ₹150 silently |
| V9 | legacy response (no `recommended_code`, `rcv:null`) mocked | no crash, no auto-apply, BXGY shows "Tap to see discount" via offer_type guard |
| V10 | Place Order with applied coupon | POS payload `coupon_code` unchanged (money path) |
| V11 | rapid cart edits | ≤1 list call and ≤1 re-validate per 500 ms; no 429 toast |
| V12 | edit-order mode | no auto-apply, strip unchanged behaviour |
| V13 | titles | three "10% off" coupons show distinct CRM `title`s |

## 12. Sequencing / registry
- Implement after BUG-2026-10-12-003 (1 line, same file) or before — disjoint; prefer BUG-003 first (smaller).
- QA CR-2026-10-11-009 together with this CR.
- On IMPLEMENTED: this CR → `IMPLEMENTED`; BUG-2026-10-12-001 → `CLOSED (superseded)`; delete or keep `coupon-strip-design-preview.html` (owner call; default keep as design record).
- Preprod-only until CRM CR-122 is on prod.

## 13. Rollback
Three files; revert restores CR-009 legacy behaviour. No data.

## 14. Absorbed — CR-2026-10-11-003 (owner ruling 2026-10-12: fold)
Retry `placeOrder` path (`ReviewOrder.jsx` L~1666–1672, 401-token-refresh branch) omits `couponDiscount` and `couponTitle` → POS gets `coupon_discount_amount: 0` on retry even with a valid coupon. Add the two fields exactly as the primary call (L1487–1489):
```js
              couponCode: appliedCouponCode,
              couponDiscount,                  // CR-2026-10-11-003 (folded into CR-2026-10-12-002)
              couponTitle: appliedCouponTitle, // CR-2026-10-11-003
```
Verification V14: force a 401 on first placeOrder (expired token) with coupon applied → retry payload carries `coupon_discount_amount` and `coupon_discount_title`. If not forceable on preprod → QA marks BLOCKED and we rely on code review + unit assertion on the payload builder.
