# SERVICE_CHARGE_MAPPING — 478 Response vs UI Check

## 1. Verdict

**`backend_response_issue`**

The frontend mapping in `getOrderDetails` and the rendering in `OrderSuccess.jsx` are both correct. The `/order-details` response for restaurant 478 (placed via the normal `/customer/order/place` endpoint) is **omitting (or returning 0 for) `total_service_tax_amount`, `service_gst_tax_amount`, and per-item `service_charge` / `gst_tax_amount`**. The frontend's defensive fallback chain then produces the wrong-but-mathematically-explainable bill summary visible in screenshot 2.

The same code path renders correctly for 716 (screenshot 3) because the 716 multi-menu/autopaid endpoint **does** echo all SC fields. The handover risks `R-runtime-1` and `R-runtime-2` (and the residual gap noted in `SUMMARY.md §9`: *"`service_gst_tax_amount` is sent in our payload but inconsistently echoed in response (sometimes absent)"*) have materialized for 478.

I could not directly read `/air-bnb/get-order-details/{order_id}` for order `#002356` from this environment because `#002356` is the `restaurant_order_id` (display id), not the internal numeric `order_id` the endpoint expects. Probes with the displayed value returned `order_id must be an integer` / `Not found!`. The conclusion below therefore relies on the wrongness pattern visible in the UI plus the deterministic logic of `getOrderDetails`.

---

## 2. Payload vs Response

### 2.1 Outgoing payload (confirmed by you)

| Field | Value |
|---|---|
| `order_sub_total_without_tax` | 100 |
| `order_sub_total_amount` | 109 |
| `total_service_tax_amount` | 9 |
| `service_gst_tax_amount` | 1.62 |
| `tax_amount` | 6.62 |
| `order_amount` | 116 |
| `cart[0].service_charge` | 9 |

### 2.2 ReviewOrder UI on 478 (screenshot 1) — frontend math source-of-truth

```
Item Total                 ₹100.00
Service Charge (Optional)  ₹9.00
Subtotal                   ₹109.00
CGST 2.50%                 ₹2.50
SGST 2.50%                 ₹2.50
CGST on SC 9%              ₹0.81
SGST on SC 9%              ₹0.81
Grand Total                ₹116.00 (₹115.62)
```

This matches the payload exactly. So pre-place math is correct and the payload sent to backend is correct. ✅

### 2.3 OrderSuccess UI on 478 (screenshot 2, order #002356)

```
Item Total                 ₹100.00       ✅ matches order_sub_total_without_tax
Subtotal                   ₹109.00       ✅ matches order_sub_total_amount
Service Charge             — (HIDDEN)    ❌ should be ₹9.00
CGST 2.50%                 — (HIDDEN)    ❌ should be ₹2.50
SGST 2.50%                 — (HIDDEN)    ❌ should be ₹2.50
CGST on SC                 ₹3.31         ❌ should be ₹0.81 (off by exactly 4.09×, see derivation)
SGST on SC                 ₹3.31         ❌ should be ₹0.81
Grand Total                ₹116.00       ✅ matches order_amount
```

Critical observation: **`scCgst + scSgst = 3.31 + 3.31 = 6.62`** which is exactly the **`tax_amount`** from the payload. So the entire tax bucket is being mis-attributed to SC-GST.

### 2.4 What the response must have looked like (deterministic from §3 logic)

For `OrderSuccess` to render exactly the values in §2.3, the `/order-details` response MUST satisfy ALL of the following:

| Response field | Required state for the observed UI |
|---|---|
| `firstDetail.order_sub_total_without_tax` | `100` ✅ (UI shows itemTotal = 100) |
| `firstDetail.order_sub_total_amount` | `109` ✅ (UI shows subtotal = 109) |
| `firstDetail.total_tax_amount` | `6.62` ✅ (drives `totalTax`) |
| `firstDetail.order_amount` | `116` ✅ (UI shows grandTotal = 116) |
| `firstDetail.total_service_tax_amount` | **missing or `0`** ❌ — if it were `9`, the SC row would render |
| Σ per-item `service_charge` (fallback) | **missing or `0`** ❌ — if it were `9`, the SC row would render |
| `firstDetail.service_gst_tax_amount` | **missing or `0`** ❌ — if it were `1.62`, scGst would be 1.62 not 6.62 |
| Σ per-item `gst_tax_amount` (fallback) | **missing or `0`** ❌ — fallback `totalGst − Σ gst_tax_amount` produces `6.62 − 0 = 6.62` |
| `firstDetail.payload_total_gst_tax_amount` | either `6.62`, **or missing** (then derived as `totalTax − totalVat = 6.62`) |
| `firstDetail.total_vat_tax_amount` | `0` ✅ (no VAT items) |

### 2.5 Compare to 716 success (screenshot 3, order #000104)

716 shows everything correctly (Service Charge ₹5, CGST/SGST 9% ₹9 each, CGST on SC/SGST on SC 9% ₹0.45 each, Grand Total ₹123.90). Same `OrderSuccess.jsx` renderer. The **only** difference is that 716 went through `buildMultiMenuPayload` → `/customer/order/autopaid-place-prepaid-order`, and that endpoint **does** persist and echo `total_service_tax_amount`, `service_gst_tax_amount`, per-item `service_charge`, per-item `gst_tax_amount`. The 478 normal `/customer/order/place` endpoint does not.

This matches `SUMMARY.md §8` which states the backend persistence/echo fixes were "deployed during CR" — those fixes were validated on 716 (multi-menu) and not on the normal endpoint used by 478.

---

## 3. Frontend Mapping Check

### 3.1 `getOrderDetails` (`frontend/src/api/services/orderService.ts:180-208`) — relevant lines

```ts
const totalVat = parseFloat(firstDetail.total_vat_tax_amount)
  || details.reduce((sum, d) => sum + (parseFloat(d.vat_tax_amount) || 0), 0);                  // = 0 ✓

const serviceCharge = parseFloat(firstDetail.total_service_tax_amount)
  || details.reduce((sum, d) => sum + (parseFloat(d.service_charge) || 0), 0);                  // = 0  ❌ should be 9

const totalTax    = parseFloat(firstDetail.total_tax_amount) || 0;                              // = 6.62 ✓
const totalGst    = parseFloat(firstDetail.payload_total_gst_tax_amount)
  || parseFloat((totalTax - totalVat).toFixed(2));                                              // = 6.62

const scGst = parseFloat(firstDetail.service_gst_tax_amount)
  || parseFloat(((totalGst) - details.reduce(
       (sum, d) => sum + (parseFloat(d.gst_tax_amount) || 0), 0)).toFixed(2));                   // = 6.62 (= 6.62 - 0)  ❌ should be 1.62

const itemGst = parseFloat((totalGst - scGst).toFixed(2));                                       // = 0     ❌ should be 5.00
const cgst   = parseFloat((itemGst / 2).toFixed(2));                                             // = 0
const sgst   = parseFloat((itemGst / 2).toFixed(2));                                             // = 0
const scCgst = parseFloat((scGst / 2).toFixed(2));                                               // = 3.31  ❌ should be 0.81
const scSgst = parseFloat((scGst / 2).toFixed(2));                                               // = 3.31  ❌ should be 0.81
```

The mapping is **logically correct**. Each line reads the primary field with `parseFloat(...)` and falls back to a derivation when the primary field is missing/`0`/`NaN`. The derivation is mathematically sound *if* per-item `gst_tax_amount` and `service_charge` are populated; it collapses (mis-attributes all GST as SC-GST) when they are not.

### 3.2 `OrderSuccess.jsx` bill summary render — relevant lines

```jsx
{billSummary.serviceCharge > 0 && (<div>Service Charge ... ₹{billSummary.serviceCharge}</div>)}   // hidden because = 0
{billSummary.cgst > 0 && (<div>CGST ... ₹{billSummary.cgst}</div>)}                                // hidden because = 0
{billSummary.sgst > 0 && (<div>SGST ... ₹{billSummary.sgst}</div>)}                                // hidden because = 0
{billSummary.vat > 0  && (<div>VAT ... ₹{billSummary.vat}</div>)}                                  // hidden because = 0  (correct)
{billSummary.scCgst > 0 && (<div>CGST on SC ... ₹{billSummary.scCgst}</div>)}                      // shown ₹3.31
{billSummary.scSgst > 0 && (<div>SGST on SC ... ₹{billSummary.scSgst}</div>)}                      // shown ₹3.31
```

Each row uses the standard "hide-when-zero" gate. Given the values produced by §3.1, the rows hide/show exactly as the screenshot shows. The renderer is **doing exactly what the data tells it to do**.

---

## 4. Conclusion

**Backend response issue, not a frontend mapping/display issue.**

What needs to happen on the backend for 478 (normal `/customer/order/place` + `/customer/order/update-customer-order` endpoints — the same endpoint family the entire 478 flow uses):

1. Persist and echo **`total_service_tax_amount`** at root (e.g. `9` for this order).
2. Persist and echo **`service_gst_tax_amount`** at root (e.g. `1.62` for this order).
3. Persist and echo per-item **`service_charge`** on each detail (so the fallback path in `getOrderDetails` works even if the root fields are absent).
4. Persist and echo per-item **`gst_tax_amount`** on each detail (so `totalGst − Σ gst_tax_amount` does not collapse to all-of-totalGst when SC GST root is missing).
5. Optionally: provide **`payload_total_gst_tax_amount`** explicitly (the frontend already has a `totalTax − totalVat` fallback, but explicit avoids confusion when VAT is non-zero).

Once the backend echoes these the same way it does for 716's autopaid endpoint, **no frontend changes are required**. The screenshot 1 → screenshot 2 discrepancy will resolve automatically because the same `getOrderDetails` mapping will read the primary fields directly instead of falling through to the lossy derivation.

This finding aligns with:
- Discovery report risk **G3** (`total_gst_tax_amount`/`total_vat_tax_amount` not emitted on normal/update payloads — but more importantly, **echo gaps** on the normal endpoint).
- Handover **R-runtime-1** (Backend field-name confirmation for non-716 `/place_order` endpoint).
- Handover **R-runtime-2** (After first real SC order, capture `/order-details` response — this **is** that capture, validating the gap).
- Summary **§9 Low-priority gap**: "`service_gst_tax_amount` is sent in our payload but inconsistently echoed in response (sometimes absent)".

Recommended next action: please share the actual `/air-bnb/get-order-details/<internal_order_id>` JSON for order `#002356` (capture from browser DevTools Network tab on the OrderSuccess page; the URL will contain the internal numeric id). With that JSON, the backend team can confirm exactly which of the 5 fields above are missing/zero and patch the persistence + response shape on the normal place/update endpoints. No frontend change required.

---

**No code changes made.**
