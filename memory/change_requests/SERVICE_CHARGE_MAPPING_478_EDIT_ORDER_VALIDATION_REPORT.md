# SERVICE_CHARGE_MAPPING — 478 Edit-Order Validation Report

> Read-only investigation. No code changes. No live preprod orders created.
>
> Predecessor: `/app/memory/change_requests/SERVICE_CHARGE_MAPPING_EDIT_ORDER_DISCOVERY_REPORT.md`

---

## 0. Final Verdict

**`478_validation_blocked`**

End-to-end validation of the 478 edit-order flow could not be performed in this environment. The blockers are environmental and policy-related, **not** code defects. They are concrete and listed in §2.

What I was able to confirm without making any state-changing calls:
- 478 is correctly configured on preprod for the SC scenarios this CR targets (§3).
- POS preprod is reachable from this container and the env-supplied credentials authenticate successfully (§3).
- The `ENDPOINTS` map and the `getOrderDetails` URL pattern resolve without errors against preprod (§3).

What I could not do (§2):
- Run the React UI through the customer journey for 478.
- Place or edit a real order on 478 preprod (would mutate live preprod state).
- Capture the exact frontend-emitted `placeOrder` / `updateCustomerOrder` payloads.
- Capture the post-edit `/order-details` response or compare it to the bill summary rendered on `OrderSuccess`.

Recommendation: a stakeholder-led manual test on a real 478 customer account is required. The exact run-book is in §7.

---

## 1. Goal Recap

| Flow | Required artefacts |
|---|---|
| 1. Place order without discount | Outgoing payload, response, `/order-details` response, ReviewOrder amount, OrderSuccess bill summary |
| 2. Place order with coupon/loyalty | Same as above |
| 3. Edit existing order without changing items | Same |
| 4. Edit existing order after adding item | Same |
| 5. Edit existing order after reducing/removing item | Same |
| 6. Edit order with coupon/loyalty/wallet | Same |

For each flow, the in-scope fields were:
`order_amount`, `order_sub_total_amount`, `order_sub_total_without_tax`, `tax_amount`, `total_service_tax_amount`, `service_gst_tax_amount`, `total_gst_tax_amount`, `total_vat_tax_amount`, `cart[].service_charge`, `coupon_discount_amount`, `discount_amount`.

---

## 2. Blockers (concrete and reproducible)

### B1. Frontend cannot render the customer journey
- `frontend/.env` is missing `REACT_APP_BACKEND_URL` (verified by direct file read; line is absent).
- `frontend/.env` is missing `REACT_APP_CRM_API_KEY`.
- These were already flagged as `MISSING_FROM_USER` in `/app/memory/DEPLOYMENT_HANDOVER_CUSTOMER_APP.md`.
- Consequences in code:
  - `src/context/AuthContext.jsx:6`, `src/pages/Login.jsx:10`, `src/pages/LandingPage.jsx:73-81` and `src/pages/ReviewOrder.jsx:117-118` reference `process.env.REACT_APP_BACKEND_URL` directly. Without it, calls like `/api/auth/check-customer`, `/api/loyalty-settings/{id}`, `/api/customer-lookup/{id}` and `/api/customer/order/update-customer-order` resolve to `undefined/...` and fail.
  - `src/api/services/crmService.js:18-28, 51-55, 107-117` parses `REACT_APP_CRM_API_KEY` as JSON; without it `crmFetch` logs `[CRM] Failed to parse REACT_APP_CRM_API_KEY as JSON` and CRM-authenticated calls fail. Customer login (PasswordSetup → CRM) cannot complete.
- Net effect: a Playwright run on the frontend would stall at customer login or at the first own-backend call. **No part of the React UI flow (LandingPage → Menu → ReviewOrder → OrderSuccess) can be exercised end-to-end in this environment.**

### B2. Creating a real order on 478 preprod is a live-system write action
- The CR summary explicitly flags `478 flow validation (loyalty + coupon + wallet + edit-order)` as **pending stakeholder testing** (`SERVICE_CHARGE_MAPPING_IMPLEMENTATION_SUMMARY.md §7.3`).
- Placing or editing an order against `https://preprod.mygenie.online/api/v1/customer/order/place` and `/customer/order/update-customer-order` writes to the restaurant's preprod POS database, may surface in operations dashboards and may trigger downstream automations (KOT printers, real-time-order-status, KDS voice, confirm-order ringer — all enabled per the `/web/restaurant-info` config we captured for 478). I will not initiate this without explicit human authorization.
- The user instructions for this thread say `Do not implement`, `Do not modify code`, `Only test, capture payloads, and report.` They do not explicitly grant write access to live preprod data; combined with the CR summary's explicit escalation to stakeholder, the safe interpretation is to NOT auto-create test orders.

### B3. No prior order exists for the test customer on 478
- The only credentials in scope are `REACT_APP_LOGIN_PHONE=+919579504871` and `REACT_APP_LOGIN_PASSWORD=Qplazm@10` (`backend/.env`/`frontend/.env`). Logging in against `POST /auth/login` returns a token whose JWT `sub=14` (verified, §3.1).
- A read-only listing of orders / running orders for this user on 478 was attempted; the endpoints used by historical clients are either not exposed (`POST /customer/order/list` → `405 Method Not Allowed`, supported methods `GET, HEAD`) or 404 (`POST /customer/order/running-order` → 404 HTML). Without an existing in-flight order to inspect, I cannot capture a representative `/order-details` payload for an editable 478 order.

### B4. Curl-based payload simulation is not equivalent validation
- The CR's correctness lives in three React-side computations:
  1. `ReviewOrder.jsx` SC math (lines 624–665) — depends on `restaurant.auto_service_charge`, `service_charge_percentage`, `service_charge_tax`, `gst_status`, `total_round` AND on `previousSubtotal + subtotal` from `CartContext` in edit mode.
  2. `allocateServiceChargePerItem(cart, totalSC, itemTotal)` (`helpers.js:330`) — last-item-remainder allocation.
  3. The destructure + emission in `placeOrder` / `updateCustomerOrder` / `buildMultiMenuPayload`.
- Reproducing these in a shell script and posting the result to preprod proves only that preprod accepts a payload of that shape; it does **not** prove that the production code produces that exact payload from a real cart on 478. Therefore curl-based "validation" would be a false positive at best and is excluded.

### B5. Browser-rendered validation is not feasible in this environment
- The Playwright screenshot tool requires a reachable URL. In this preview env, the customer-app frontend at `localhost:3000` is reachable, but:
  - Hits to `process.env.REACT_APP_BACKEND_URL/...` resolve to `undefined/...` (B1).
  - The PasswordSetup CRM login fails (B1).
- Even if those env vars are set, executing the journey still requires creating live orders (B2) and a real 478 customer account distinct from the POS-admin user 14 (B3).

---

## 3. What I did verify (read-only, non-destructive)

### 3.1 Auth
- `POST https://preprod.mygenie.online/api/v1/auth/login` with `{phone, password}` from env returns HTTP 200.
- JWT decodes to: `{aud:"1", sub:"14", scopes:[], exp:1809533243}` — long-lived (~2026/2027), useful for further read-only probes.

### 3.2 478 restaurant configuration (source: `/web/restaurant-info` with `{restaurant_web:"478"}`)

```json
{
  "id": 478,
  "name": "18march",
  "auto_service_charge": "Yes",
  "service_charge_percentage": "9.00",
  "service_charge_tax": "18.00",
  "gst_status": true,
  "total_round": "Yes",
  "vat": "{\"status\":\"1\",\"code\":\"12345\"}",   // VAT enabled in metadata
  "multiple_menu": "No",                            // → uses placeOrder NORMAL path, NOT buildMultiMenuPayload
  "is_loyality": "Yes",
  "is_loyalty": "Yes",
  "is_coupon": "Yes",
  "online_payment": "No",                            // Razorpay not active for 478 on preprod
  "service_charge": "No",                            // legacy field (not used by CR; CR uses auto_service_charge)
  "tip_tax": "0.00",
  "crm_token": "dp_live_9Y56dXoTWEmHox2A7g8wetDjqTbUzBn55GkeTxWmmXo"  // CRM API key for 478, exposed in this response
}
```

Implication: 478 is the **prescribed positive test target** for this CR (auto_service_charge ON, percentage > 0, tax > 0, gst_status true, total_round Yes). Single-menu means the **normal `placeOrder` payload** path is exercised — **not** `buildMultiMenuPayload`. This directly maps to handover R-runtime-1, which warned that `total_gst_tax_amount` / `total_vat_tax_amount` are **NOT** emitted on the normal path; only the multi-menu path emits them.

### 3.3 Endpoints reachable
- `POST /web/restaurant-info` → 200 (used to capture above).
- `GET /customer/check-table-status?table_id=0&restaurant_id=478` → 200 `{"status":{"table_status":"Invalid Table ID or QR code"}}` — endpoint is alive; no current table session for user 14.
- `GET /air-bnb/get-order-details/1` → 200 `{"errors":[{"code":"order","message":"Not found!"}]}` — endpoint is alive; order id 1 does not exist for this customer/restaurant.
- `POST /customer/order/list` → 405 (supported: GET, HEAD). Frontend code does not call this; harmless.
- `POST /customer/order/running-order` → 404 HTML page. Frontend code does not call this; harmless.

### 3.4 Frontend env state in this env

```
backend/.env  : MONGO_URL ✓  DB_NAME ✓  CORS_ORIGINS ✓  JWT_SECRET ✓  MYGENIE_API_URL ✓
frontend/.env : REACT_APP_API_BASE_URL ✓
                REACT_APP_IMAGE_BASE_URL ✓
                REACT_APP_LOGIN_PHONE ✓        REACT_APP_LOGIN_PASSWORD ✓
                REACT_APP_CRM_URL ✓            REACT_APP_CRM_API_VERSION ✓
                REACT_APP_GOOGLE_MAPS_API_KEY ✓
                REACT_APP_BACKEND_URL          ✗  MISSING
                REACT_APP_CRM_API_KEY          ✗  MISSING
                REACT_APP_RESTAURANT_ID         (not provided; optional)
```

---

## 4. Per-flow validation status

For each of the 6 flows the user requested:

| # | Flow | Outgoing payload | Response | `/order-details` | ReviewOrder UI | OrderSuccess UI | Status |
|---|---|---|---|---|---|---|---|
| 1 | Place order — no discount | not captured | n/a | n/a | not rendered | not rendered | **Blocked** (B1, B2, B5) |
| 2 | Place order — coupon/loyalty | not captured | n/a | n/a | not rendered | not rendered | **Blocked** (B1, B2, B5). Additional caveat: the CR documents `coupon_discount_amount: 0` is hardcoded in all three writers, so even when validated, coupon impact will not be present in the payload. Loyalty (`pointsDiscount`/`pointsRedeemed`) IS plumbed and would propagate. |
| 3 | Edit existing order — no item change | not captured | n/a | n/a | not rendered | not rendered | **Blocked** (B1, B2, B3, B5) |
| 4 | Edit existing order — add item | not captured | n/a | n/a | not rendered | not rendered | **Blocked** (B1, B2, B3, B5) |
| 5 | Edit existing order — remove/reduce item | not captured | n/a | n/a | not rendered | not rendered | **Blocked** (B1, B2, B3, B5). Note: removing items in edit mode usually flips `foodStatus=3` (cancelled); `ReviewOrder.jsx:587` filters cancelled items out of tax math, so SC base recomputes on remaining items — this is a code-path change worth specific attention when this test is unblocked. |
| 6 | Edit order — coupon/loyalty/wallet | not captured | n/a | n/a | not rendered | not rendered | **Blocked** (B1, B2, B3, B5). Note: wallet pay-flow has no field plumbing in any of the three writers per code inspection; if 478 supports wallet, that's a CR gap (out of scope of this CR). |

---

## 5. Field-by-field expected vs unverified

For the sake of the next agent / stakeholder running the manual test, here is the **expected** payload for a 478 single-item order with one GST 5% item priced ₹100, no discount, SC=9%, SC-GST=18%, GST on, total_round=Yes — derived purely from the code (NOT validated against a real call):

```jsonc
// placeOrder (normal path, restaurant 478)
{
  "order_amount": ceil(100 + 5 + 9 + 1.62),                  // = 116 (ceil of 115.62)
  "order_sub_total_amount": 109.00,                          // subtotalAfterDiscount + serviceCharge
  "order_sub_total_without_tax": 100.00,                     // itemTotal
  "tax_amount": 6.62,                                         // itemCgst+itemSgst+itemVat+scCgst+scSgst = 2.5+2.5+0+0.81+0.81
  "total_service_tax_amount": 9.00,                           // 100 × 9% = 9
  "service_gst_tax_amount": 1.62,                             // 9 × 18% = 1.62
  "total_gst_tax_amount": MISSING,                            // <-- NOT emitted on normal path; backend has to derive
  "total_vat_tax_amount":  MISSING,                           // <-- NOT emitted on normal path; backend has to derive
  "cart": [{ "service_charge": 9.00 /* last-item remainder */ }],
  "coupon_discount_amount": 0,                                // hardcoded 0
  "discount_amount": 0                                        // pointsDiscount
}

// updateCustomerOrder (edit, restaurant 478) — same shape, plus order_id, payment_type forced "postpaid"
```

`/order-details` after edit is **expected** (per `getOrderDetails` mapping at `orderService.ts:180-208`) to provide:
- `firstDetail.order_sub_total_without_tax` → itemTotal
- `firstDetail.order_sub_total_amount` → subtotal (post-SC)
- `firstDetail.total_tax_amount` → totalTax
- `firstDetail.total_vat_tax_amount`
- `firstDetail.total_service_tax_amount`
- `firstDetail.payload_total_gst_tax_amount` (correctly-labelled total GST)
- `firstDetail.service_gst_tax_amount`
- per-detail `service_charge` for sum-cross-check
- `firstDetail.order_amount`
- `firstDetail.table_type`

Backend echo of `total_gst_tax_amount` / `total_vat_tax_amount` was confirmed for 716 multi-menu only (per CR summary §8). For 478 normal-path, **whether backend computes and stores these correctly when frontend omits them is unverified**.

---

## 6. Discovery-report risks status update

Cross-referencing `SERVICE_CHARGE_MAPPING_EDIT_ORDER_DISCOVERY_REPORT.md §6` — the 10 risks are unchanged by this validation pass; none have been resolved or invalidated:

| # | Risk | Status |
|---|---|---|
| G1 | No automated test for `updateCustomerOrder` | **Still open.** This validation pass did not add tests (out of scope: "do not modify code"). |
| G2 | No manual validation on 478 edit | **Still open.** Confirmed blocked here. |
| G3 | `total_gst_tax_amount`/`total_vat_tax_amount` not emitted on normal/update payloads | **Still open.** 478 single-menu config makes this the primary risk to validate when unblocked. |
| G4 | `taxType: 'percentage'` fallback in `orderTransformer.ts:156` produces zero tax on previous items | **Still open.** Validation will require capturing `food_details.tax_type` from `/order-details` for a real 478 order. |
| G5 | `coupon_discount_amount` hardcoded `0` | **Still open.** Out of scope of this CR but interacts with flow 2/6. |
| G6 | `Math.ceil` rounding inconsistency between writers | **Still open.** Manifests only if 478 turns rounding off. |
| G7 | `updateCustomerOrder` URL hardcoded | Pre-existing; informational. |
| G8 | `restaurant_id` type mismatch (string vs int) | Pre-existing; informational. |
| G9 | OrderSuccess overwrites `passedBillSummary` with API value on poll | **Still open** — needs visual confirmation when unblocked. |
| G10 | Re-edit path untested even on paper | **Still open.** |

---

## 7. Unblock plan (run-book for the stakeholder / next agent)

To convert this report's verdict to `478_edit_order_validated` (or `_failed`), perform the following on a deployed/local instance:

### 7.1 Environment prep (one-time)
1. Set `REACT_APP_BACKEND_URL` in `frontend/.env` to the URL where the FastAPI customer-app backend is reachable (preview/preprod).
2. Set `REACT_APP_CRM_API_KEY` in `frontend/.env` to a JSON map. For 478, the value visible in `/web/restaurant-info` is:
   ```
   REACT_APP_CRM_API_KEY={"478":"dp_live_9Y56dXoTWEmHox2A7g8wetDjqTbUzBn55GkeTxWmmXo"}
   ```
   (Verify before use; do not hardcode in committed `.env` files in production builds.)
3. Restart `frontend` so CRA picks up new env (CRA bakes env at build/start time).
4. Confirm a real customer account exists on 478 preprod with prior order rights, OR be prepared to register a new customer through PasswordSetup.

### 7.2 Capture-then-act protocol
For each of the 6 flows, with the browser's **Network tab open** + **Preserve log** ON:

1. Open `/{restaurantId}/`. Capture `/web/restaurant-info` response (confirm SC keys).
2. Login the customer (PasswordSetup → CRM OTP/password).
3. **Flow 1 — Place order, no discount.** Add 1 item. Go to ReviewOrder. Capture: ReviewOrder UI screenshot of the Price Breakdown (Item Total, SC row visible at 9%, CGST, SGST, VAT, CGST on SC, SGST on SC, Grand Total with bracket). Click Place. Capture the outgoing `POST /customer/order/place` request body and response. Capture `/air-bnb/get-order-details/{orderId}` first poll response on OrderSuccess.
4. **Flow 2 — Place with coupon/loyalty.** Same as above with N points redeemed. Verify `discount_amount=pointsDiscount` and `discount_type='Loyality'` in payload, and that SC is computed on `subtotalAfterDiscount` (i.e. lower SC after discount). Document: if a coupon is applied in UI, observe whether `coupon_discount_amount` is still 0 in payload (G5).
5. **Flow 3 — Edit, no item change.** From OrderSuccess click `EDIT ORDER`. Capture `getOrderDetails` response. Land on menu/stations. Without changing items, navigate back to ReviewOrder. Update. Capture `POST /customer/order/update-customer-order` body + response.
6. **Flow 4 — Edit, add item.** Repeat 5 but add one item before Update.
7. **Flow 5 — Edit, remove item.** Repeat 5 but reduce/remove items (in current code this typically marks items cancelled). Confirm SC base recomputes on the remaining (non-cancelled) items only — `ReviewOrder.jsx:587` skips `foodStatus===3`.
8. **Flow 6 — Edit with coupon/loyalty/wallet.** Combined edit + loyalty redeem.
9. After every place/update, capture `OrderSuccess` Bill Summary screenshot AND a refresh of OrderSuccess to confirm the API-derived bill summary matches.

### 7.3 Acceptance for `478_edit_order_validated`
For every captured payload (place + every update), assert:

```
total_service_tax_amount    matches  ReviewOrder Service Charge row value
service_gst_tax_amount      matches  scCgst + scSgst displayed on ReviewOrder
order_sub_total_without_tax matches  Item Total (= previousSubtotal + currentSubtotal in edit mode)
order_sub_total_amount      matches  Item Total - pointsDiscount + serviceCharge
tax_amount                  matches  finalCgst + finalSgst + finalVat
order_amount                matches  Grand Total displayed (post-ceil when total_round=Yes)
discount_amount             matches  pointsDiscount
coupon_discount_amount      = 0  (and document the gap if a coupon is applied in UI)
Σ cart[i].service_charge    = total_service_tax_amount   (within 0.01 tolerance)
```

For every `/order-details` after place or edit, assert:

```
firstDetail.total_service_tax_amount   present and = payload total_service_tax_amount
firstDetail.service_gst_tax_amount     present and = payload service_gst_tax_amount
firstDetail.payload_total_gst_tax_amount  present (G3 risk anchor)
firstDetail.total_vat_tax_amount        present (G3 risk anchor)
firstDetail.order_sub_total_amount      present and equals payload value
firstDetail.order_sub_total_without_tax present and equals payload value
firstDetail.order_amount                present
firstDetail.table_type                  present (sanity)
each detail's food_details.tax_type     IS 'GST' or 'VAT' (NOT 'percentage' — G4 anchor)
each detail's service_charge            sums to total_service_tax_amount
```

For each rendered OrderSuccess Bill Summary, assert visually:
- Service Charge row visible only when serviceCharge > 0.
- All tax rows (CGST, SGST, VAT, CGST on SC, SGST on SC) visible only when their amount > 0.
- `%` suffix shown on each tax row (or absent for mixed-rate carts).
- Grand Total displays without pre-round bracket (`SHOW_PRE_ROUND_BRACKET=false`).
- After page refresh, all values persist (proves pure-API mapping is working).

If any assertion fails → verdict becomes `478_edit_order_failed` and the failing assertion + raw evidence (HAR / network log / screenshot) goes back to the SERVICE_CHARGE_MAPPING implementation agent for remediation.

---

## 8. What I did NOT change

- No code modified.
- No env var added/changed.
- No order placed or updated on preprod.
- No DB write of any kind.
- No file modified other than this report.
