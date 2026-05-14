# SERVICE_CHARGE_MAPPING — 478 Frontend Payload Contract Alignment Handover

> Approval-gated implementation. **Currently mid-flight at F2 Change B.** Do not skip the approval gate; show diff and request approval before applying each remaining change.

---

## 0. Snapshot

| Item | Value |
|---|---|
| Branch | `main` |
| Last clean commit (F1 included) | `aadafbf auto-commit for 6b22befe-e8ba-4456-8482-d1450a7013e6` |
| Working-tree changes (F2 Change A applied, uncommitted) | `frontend/src/api/services/orderService.ts` (wrapper forwards `gstEnabled`) |
| Status | **F1 done. F2 Change A done. F2 Change B / F3 / F4 / F5 pending.** |

---

## 1. Why this work exists

Restaurant **478** OrderSuccess UI showed wrong values (Service Charge row hidden, CGST/SGST hidden, CGST-on-SC = 3.31 instead of 0.81). Root cause analysis confirmed:

1. **Primary (backend, separate workstream):** `/customer/order/place` and `/customer/order/update-customer-order` endpoints drop `total_service_tax_amount`, `service_gst_tax_amount`, per-item `service_charge`, and never populate `payload_total_gst_tax_amount`. They also recompute `order_amount`/`order_sub_total_amount`/`tax_amount` without SC on settle.
2. **Secondary (frontend, this work):** the 478 normal/edit payload is **thinner** than the 716 multi-menu payload — missing 6 per-item fields and 4 root fields. This forces the backend to derive GST/VAT buckets and contributes to the inconsistent persistence.

Predecessor analysis is in:
- `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_EDIT_ORDER_DISCOVERY_REPORT.md`
- `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_478_EDIT_ORDER_VALIDATION_REPORT.md`
- `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_478_RESPONSE_UI_CHECK.md`

---

## 2. Goal of this thread

Align 478 normal `/customer/order/place` and edit `/customer/order/update-customer-order` outgoing payloads with the working 716 multi-menu payload. **Frontend serialisation only.** This does not fix the backend persistence drop; it only closes the request-contract gap.

The 716 multi-menu payload (sample provided by stakeholder) emits the following that 478 does not:

**Per-item missing on 478:** `gst_tax_amount`, `vat_tax_amount`, `tax_amount`, `total_variation_price`, `total_add_on_price`, `discount_on_food`
**Root missing on 478:** `total_gst_tax_amount`, `total_vat_tax_amount`, `round_up`, `tip_tax_amount`

---

## 3. Approval-gated workflow (must follow exactly)

For every remaining bucket:
1. Inspect current code.
2. Show issue.
3. Show proposed diff (BEFORE / AFTER).
4. Show validation plan + risks.
5. **STOP and ask for explicit approval.**
6. Apply only after approval.
7. Run lint, show post-apply diff and validation result.
8. Move to next bucket.

Do not batch buckets. Do not auto-continue.

---

## 4. Global do-not-touch rules

| Area | Rule |
|---|---|
| Backend | Do not touch. |
| `OrderSuccess.jsx` | Do not touch. |
| 716 multi-menu / autopaid path (`isMultiMenu` branch in `placeOrder`, `buildMultiMenuPayload`, `transformCartItemForMultiMenu`, `transformCartItemsForMultiMenu`) | Do not touch. |
| `allocateServiceChargePerItem` | Do not touch. |
| `getOrderDetails` mapping in `orderService.ts:121-260` | Do not touch. |
| Business math (`finalCgst`, `finalSgst`, `finalVat`, `serviceCharge`, `gstOnServiceCharge`, `subtotalAfterDiscount`, `roundedTotal`) | Do not change formulas. |
| Service-charge calculation (`ReviewOrder.jsx` SC math at l. 624-665) | Do not change. |
| Rounding (`Math.ceil(totalToPay)` in writers) | Do not change. |
| Coupon logic (`coupon_discount_amount: 0` hardcoded) | Out of scope (separate concern G5). |
| `food_id` type (`String(...)` in normal path; `parseInt(...)` in multi-menu) | Pre-existing; do not change. |
| `restaurant_id` type (string vs int between writers) | Pre-existing; do not change. |
| `transformPreviousOrderItem` `taxType: 'percentage'` fallback | Pre-existing G4; out of scope. |
| New files | Do not create. |
| Other files | Do not modify. Stop and ask if any seems required. |

**Files allowed to modify (only after bucket approval):**
1. `frontend/src/api/transformers/helpers.js`
2. `frontend/src/api/services/orderService.ts`
3. `frontend/src/pages/ReviewOrder.jsx`

---

## 5. Bucket status

### ✅ Bucket F1 — Transformer contract alignment — APPLIED

- **File:** `frontend/src/api/transformers/helpers.js`
- **Commit:** `aadafbf`
- **Lines changed:** +29 / −3
- **What changed:**
  - `transformCartItemForApi(cartItem)` → `transformCartItemForApi(cartItem, gstEnabled = true)`. Now emits 6 new per-item fields with strict numeric parity to `transformCartItemForMultiMenu` (lines 267–303).
  - `transformCartItemsForApi(cartItems)` → `transformCartItemsForApi(cartItems, gstEnabled = true)`. Forwards `gstEnabled` to per-item transform.
- **Validation done:**
  - ESLint: ✅ no issues.
  - Synthetic Node math:
    - 716 prod sample (unit=100, qty=3, GST 18%, gstEnabled=true) → `gst_tax_amount: 54` (matches stakeholder's 716 captured payload).
    - 478 sample (unit=100, qty=1, GST 5%, gstEnabled=true) → `gst_tax_amount: 5`.
    - VAT branch → `vat_tax_amount: 5`, `gst_tax_amount: 0`.
    - `gstEnabled=false` → `gst_tax_amount: 0`.
    - Zero-tax fallback → `0`.
  - 716 transformer (`transformCartItemForMultiMenu`) **NOT touched** (verified via diff).
- **User-confirmable manual validation (optional, partial):**
  - Place a 478 order; capture POST `/customer/order/place` payload in DevTools.
  - Inspect `cart[0]` — should now contain `gst_tax_amount`, `vat_tax_amount`, `tax_amount`, `total_variation_price`, `total_add_on_price`, `discount_on_food`.
  - `cart[0].service_charge` should still be allocated.
  - Root fields will NOT yet have `total_gst_tax_amount`/`total_vat_tax_amount`/`round_up`/`tip_tax_amount` — those come from F2 Change B.

---

### 🟡 Bucket F2 — `placeOrder` normal-path root payload alignment — PARTIAL

#### ✅ F2 Change A — Wrapper forwards `gstEnabled` — APPLIED (uncommitted in working tree)

- **File:** `frontend/src/api/services/orderService.ts:257-260`
- **Diff:**
  ```diff
   const transformCartItems = (cartItems: any[], gstEnabled = true) => {
     // Use centralized transformer from helpers.js
  -  return transformCartItemsForApi(cartItems);
  +  return transformCartItemsForApi(cartItems, gstEnabled);
   };
  ```
- This activates F1's `gstEnabled` param at the wrapper level. Today every caller already sets `gstEnabled = true`, but the wiring is now correct for future `gstEnabled = false` cases (e.g., restaurants with `gst_status: false`).

#### ⏳ F2 Change B — Add 4 root fields to `placeOrder` normal `payloadData` — PENDING APPROVAL

**Already approved by user** in the previous turn ("approve F2"). User then pivoted to handover before the second `search_replace` was applied. **Next agent should re-confirm approval before applying** because the proposal was reset by the pivot.

**Proposed change A (between current `finalSubtotal` calc l. 305-309 and `allocateServiceChargePerItem` l. 311):**
```ts
// Root-level GST/VAT bucket totals (multi-menu parity for 478 normal contract)
const totalGstTaxAmount = parseFloat(orderData.totalGstTaxAmount || 0) || 0;
const totalVatTaxAmount = parseFloat(orderData.totalVatTaxAmount || 0) || 0;
```

**Proposed change B (in `payloadData`, immediately after existing `service_gst_tax_amount` line ~350):**
```ts
// Multi-menu parity additions (478 normal contract alignment with 716)
total_gst_tax_amount: parseFloat(totalGstTaxAmount.toFixed(2)),
total_vat_tax_amount: parseFloat(totalVatTaxAmount.toFixed(2)),
round_up: 0,
tip_tax_amount: 0,
```

**Validation plan (run after apply):**
- ESLint on `orderService.ts` — must pass.
- Synthetic Node check: mock `orderData` with `{ totalGstTaxAmount: 5, totalVatTaxAmount: 0, ... }` → assert `payloadData.total_gst_tax_amount === 5`, `total_vat_tax_amount === 0`, `round_up === 0`, `tip_tax_amount === 0`.
- Default behaviour (no `totalGstTaxAmount`/`totalVatTaxAmount`): assert all 4 new fields = `0`.
- 716 sanity: confirm `isMultiMenu` branch (l. 273-295) and `buildMultiMenuPayload` import unchanged.

**Risks (already accepted):**
- Until F4 ships, the values default to `0`. Acceptable interim state.
- New fields are additive; existing tests assert by field name and should not break.

---

### ⏳ Bucket F3 — `updateCustomerOrder` edit-payload alignment — PENDING

- **File:** `frontend/src/api/services/orderService.ts:397-508`
- **Function:** `updateCustomerOrder`

**Proposed changes (NOT yet applied):**

1. **Extend destructure block (l. 397–419)** — add 3 new defaults:
   ```ts
   totalGstTaxAmount = 0,
   totalVatTaxAmount = 0,
   gstEnabled = true,
   ```

2. **Replace cart transform call (l. 424)**:
   ```diff
   - const cart = transformCartItemsForApi(cartItems);
   + const cart = transformCartItemsForApi(cartItems, gstEnabled);
   ```

3. **Add 4 fields to `payloadData` (after existing `service_gst_tax_amount` at l. 471)**:
   ```ts
   // Multi-menu parity additions (478 edit contract alignment with 716)
   total_gst_tax_amount: parseFloat((parseFloat(totalGstTaxAmount as any) || 0).toFixed(2)),
   total_vat_tax_amount: parseFloat((parseFloat(totalVatTaxAmount as any) || 0).toFixed(2)),
   round_up: 0,
   tip_tax_amount: 0,
   ```

**Validation plan (after apply):**
- ESLint must pass.
- Synthetic Node check: invoke `updateCustomerOrder` with mocked axios; assert outgoing FormData JSON contains the 4 new root fields and per-item fields (per-item already covered by F1 + F3 step 2).
- Confirm `effectiveSubtotal` / `effectiveItemTotal` / `Math.ceil(totalToPay)` / hardcoded `coupon_discount_amount: 0` / endpoint URL unchanged.

**Edit-mode caveat (documented, accepted, not fixed):**
- Per-item `gst_tax_amount` / `vat_tax_amount` / `tax_amount` reflect **only new (current-cart) items**, not previous-order items.
- Root totals (`total_gst_tax_amount`, `total_vat_tax_amount`) include new + previous + SC-GST after `discountRatio` (because they come from `finalCgst + finalSgst` and `finalVat`).
- Backend should treat root totals as authoritative; per-item sums are informational. Same imperfection 716 has under any discount.

**Risks:** identical to F2.

---

### ⏳ Bucket F4 — ReviewOrder value threading — PENDING

- **File:** `frontend/src/pages/ReviewOrder.jsx`
- **5 call sites to update:**

| Line | Call | Branch |
|---|---|---|
| 972 | `updateCustomerOrder({...})` | edit primary (happy path) |
| 1003 | `updateCustomerOrder({...})` | edit fail-safe (catch block from order-status check) |
| 1082 | `placeOrder({...})` | place primary |
| 1195 | `updateCustomerOrder({...})` | edit 401-retry |
| 1226 | `placeOrder({...})` | place 401-retry |

**At each of the 5 call sites, ADD these 3 named args alongside existing SC fields:**
```js
totalGstTaxAmount: finalCgst + finalSgst,
totalVatTaxAmount: finalVat,
gstEnabled: isGstEnabledForSc,
```

**Variable scope notes (verified via grep):**
- `finalCgst`, `finalSgst`, `finalVat` — declared at component scope around l. 651–665, in scope at all 5 call sites.
- `isGstEnabledForSc` — declared at l. 630 at component scope. **Same expression** as `isGstEnabled` declared locally inside the `taxBreakdown` `useMemo` at l. 561 and again at l. 1063 inside the place-order `try` block. Use `isGstEnabledForSc` for all 5 sites for consistency. The local re-declarations at l. 561 and l. 1063 can stay — do not refactor.
- `placeOrder` calls (l. 1082, l. 1226) ALREADY pass `gstEnabled: isGstEnabled` (l. 1100). Adding `gstEnabled: isGstEnabledForSc` would be redundant or conflicting at those two sites — **just add the two `totalGst/totalVatTaxAmount` args at l. 1082 / 1226; leave the existing `gstEnabled: isGstEnabled` line as is** (it works because `isGstEnabled` at l. 1063 is the same expression as `isGstEnabledForSc`).
- `updateCustomerOrder` calls (l. 972, 1003, 1195) do NOT currently pass `gstEnabled`. Add all 3 new args.

**Net per call site:**
- l. 972, 1003, 1195 → +3 lines each (`totalGstTaxAmount`, `totalVatTaxAmount`, `gstEnabled: isGstEnabledForSc`).
- l. 1082, 1226 → +2 lines each (only `totalGstTaxAmount`, `totalVatTaxAmount`; `gstEnabled` already passed).

**Validation plan (after apply):**
- ESLint on `ReviewOrder.jsx`.
- Manual: place a 478 order, capture network payload, assert `total_gst_tax_amount` numerically equals (CGST + SGST visible in ReviewOrder UI rows), `total_vat_tax_amount` equals VAT row.
- Manual: edit a 478 order, capture `update-customer-order` payload, same assertions.
- Confirm UI rendering, tax row display, button labels, navigation unchanged.

**Risks:**
- If `finalCgst` / `finalSgst` / `finalVat` are not defined at one of the 5 call sites' execution scope (e.g., due to closure boundaries), build will fail at runtime. Mitigation: they are component-level consts; verified in scope.

---

### ⏳ Bucket F5 — Validation & evidence pack — PENDING

No code change. After F1–F4 are all applied:

1. Capture an **after** 478 normal-place payload via DevTools and attach.
2. Capture an **after** 478 edit-update payload via DevTools and attach.
3. Compare with the **before** 478 payload (already captured by stakeholder; see Section 7 below) and the **716** reference payload.
4. Assert all checks in F5 of the planning doc.
5. Capture matching `/order-details` response. If response still shows `total_service_tax_amount: "0.00"`, `service_gst_tax_amount: "0.00"`, per-item `service_charge: "0.00"`, or `payload_total_gst_tax_amount: null` → classify as **`backend_persistence_issue`** and hand back to backend team. **Do NOT patch frontend UI to mask backend issue.**

---

## 6. How to resume (next agent steps)

1. Pull latest `main`. Verify the working tree contains the F2 Change A wrapper diff (1-line change in `orderService.ts:259`). Re-view to confirm.
2. Re-confirm with user: "F1 is committed. F2 Change A is applied. May I proceed with F2 Change B (4 root fields in `placeOrder` payloadData) per the proposal in §5 of this handover?"
3. Apply F2 Change B → ESLint → show post-apply diff → ask approval for F3.
4. Apply F3 → ESLint → ask approval for F4.
5. Apply F4 → ESLint → ask approval for F5.
6. Execute F5 (no-code validation pack) → produce final summary.

For each bucket, follow the strict approval gate workflow in §3.

---

## 7. Reference — stakeholder-captured payloads (DO NOT modify; for comparison only)

### 7.1 478 BEFORE payload (current behaviour, to be aligned)
```json
{
  "cart":[{"food_id":"198286","price":"100.00","quantity":1,"variations":[],"add_on_ids":[],"add_ons":[],"add_on_qtys":[],"service_charge":9, /* + standard fields */ }],
  "order_amount":116, "tax_amount":6.62,
  "order_sub_total_amount":109, "order_sub_total_without_tax":100,
  "total_service_tax_amount":9, "service_gst_tax_amount":1.62,
  "discount_amount":0, "coupon_discount_amount":0, "points_redeemed":0, "points_discount":0,
  "restaurant_id":"478", "table_id":"3241", "payment_type":"postpaid", "order_type":"dinein"
  /* 478 lacks: per-item gst_tax_amount/vat_tax_amount/tax_amount/total_variation_price/total_add_on_price/discount_on_food
                root  total_gst_tax_amount/total_vat_tax_amount/round_up/tip_tax_amount */
}
```

### 7.2 716 reference payload (target shape)
```json
{
  "cart":[{"food_id":160552,"price":"100.00","quantity":3,
           "total_variation_price":0,"total_add_on_price":0,
           "gst_tax_amount":54,"vat_tax_amount":0,"tax_amount":54,
           "discount_on_food":0,"service_charge":15}],
  "order_amount":371.7, "tax_amount":56.7,
  "order_sub_total_amount":315, "order_sub_total_without_tax":300,
  "total_gst_tax_amount":56.7, "total_vat_tax_amount":0,
  "total_service_tax_amount":15, "service_gst_tax_amount":2.7,
  "round_up":0, "tip_tax_amount":0,
  "discount_amount":0, "coupon_discount_amount":0, "points_redeemed":0, "points_discount":0,
  "restaurant_id":716, "table_id":"6828", "payment_type":"postpaid", "order_type":"dinein"
}
```

### 7.3 478 BEFORE response (broken, drives screenshot 2 wrongness)
- `total_service_tax_amount: "0.00"` (should be 9)
- `service_gst_tax_amount: "0.00"` (should be 1.62)
- `payload_total_gst_tax_amount: null` (should be 5 or similar)
- per-item `service_charge: "0.00"` (should be 9)
- `total_gst_tax_amount: "6.62"` rolls SC-GST + item-GST together
- On settle: `order_amount` recomputed without SC (saw 105 instead of 116)

This response shape causes `getOrderDetails` to output `serviceCharge: 0`, `scGst: 6.62`, `itemGst: 0` deterministically. **Backend fix required separately.**

---

## 8. Acceptance after F4 + F5

### Frontend payload contract (F1–F4)
Per-item (every cart line):
- ✅ `gst_tax_amount` (5% × unit × qty when GST enabled)
- ✅ `vat_tax_amount` (when VAT)
- ✅ `tax_amount = gst + vat`
- ✅ `total_variation_price`
- ✅ `total_add_on_price`
- ✅ `discount_on_food: 0`
- ✅ `service_charge` (existing, allocated)

Root (place + edit):
- ✅ `total_gst_tax_amount = finalCgst + finalSgst`
- ✅ `total_vat_tax_amount = finalVat`
- ✅ `round_up: 0`
- ✅ `tip_tax_amount: 0`
- ✅ Existing `total_service_tax_amount`, `service_gst_tax_amount`, `tax_amount`, `order_sub_total_amount`, `order_sub_total_without_tax`, `order_amount`, `discount_amount`, `coupon_discount_amount`, etc. byte-identical.

### What this fix does NOT solve
- Backend persistence drop for `total_service_tax_amount`, `service_gst_tax_amount`, per-item `service_charge`, `payload_total_gst_tax_amount`.
- Backend recompute of `order_amount` / `order_sub_total_amount` / `tax_amount` without SC on settle.
- 478 OrderSuccess UI will still show the screenshot-2 wrongness until backend persists/echoes SC fields. **This is acceptable proof of backend issue, not a frontend regression.**

---

## 9. Risks carried forward (post-F4)

| # | Risk | Severity | Status |
|---|---|---|---|
| G1 | No automated test for `updateCustomerOrder` | High | Open. `orderService.test.js` covers `placeOrder` only. Adding tests is out of this thread's scope. |
| G3 | `total_gst_tax_amount`/`total_vat_tax_amount` not emitted on normal/update | High | **Closed by F2/F3.** |
| G4 | `taxType: 'percentage'` fallback in `transformPreviousOrderItem` makes previous-item tax = 0 in edit mode | High (for 478 edit display correctness) | Open. Pre-existing R-adjacent-1; explicitly out of scope. |
| G5 | `coupon_discount_amount: 0` hardcoded in all writers | Medium | Open. Out of scope. |
| G10 | Re-edit (edit an already-edited order) untested | Medium | Open. Will surface in F5 manual validation. |
| Backend G3 | Backend silently drops SC fields on `/customer/order/place` and `/customer/order/update-customer-order` | High (blocks UI fix) | Open. Separate workstream. |
| Edit-mode per-item vs root mismatch | Per-item GST/VAT covers only new items; root covers all | Low | Documented; backend treats root as authoritative. |

---

## 10. Predecessor docs (read for full context)

1. `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_IMPLEMENTATION_HANDOVER.md` — original CR plan
2. `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_IMPLEMENTATION_SUMMARY.md` — what was implemented
3. `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_EDIT_ORDER_DISCOVERY_REPORT.md` — discovery + risks
4. `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_478_EDIT_ORDER_VALIDATION_REPORT.md` — blocked validation
5. `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_478_RESPONSE_UI_CHECK.md` — response vs UI analysis (verdict: backend issue)
6. `/app/memory/current-state/CURRENT_ARCHITECTURE.md`, `MODULE_MAP.md`, `API_DEPENDENCY_TRACE.md` — baseline architecture

---

**End of handover. Next agent: read this file, then prompt user to confirm continuation from F2 Change B.**
