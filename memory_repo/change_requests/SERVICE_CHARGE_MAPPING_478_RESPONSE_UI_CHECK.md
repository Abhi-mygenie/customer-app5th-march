# SERVICE_CHARGE_MAPPING — 478 Response vs UI Check

## 1. Verdict

**`backend_response_issue`** *(now CONFIRMED with raw payload + raw response provided by stakeholder)*

The frontend payload is correct. `getOrderDetails` and `OrderSuccess.jsx` are correct. The backend's normal `/customer/order/place` endpoint (used by 478, single-menu) is **silently dropping** `total_service_tax_amount`, `service_gst_tax_amount`, per-item `service_charge`, and never populating `payload_total_gst_tax_amount`. On payment settle it additionally **recomputes** `order_amount`, `order_sub_total_amount`, `tax_amount` without SC. The 716 multi-menu endpoint (`/autopaid-place-prepaid-order`) does NOT have this gap, which is why 716 renders correctly with the same frontend code.

---

## 2. Direct evidence (stakeholder-provided payload + response)

### 2.1 Order `#002351` (478 normal endpoint, post-settle, `payment_status: "paid"`)

| Field | Payload | Response | Status |
|---|---|---|---|
| `order_amount` | 116 | **105** | ❌ backend re-computed without SC |
| `order_sub_total_amount` | 109 | **100** | ❌ backend stripped SC |
| `order_sub_total_without_tax` | 100 | 100 | ✅ |
| `tax_amount` / `total_tax_amount` | 6.62 | **5** | ❌ backend dropped SC-GST (1.62) |
| `total_service_tax_amount` | **9** | **"0.00"** | ❌ NOT persisted |
| `service_gst_tax_amount` | **1.62** | **"0.00"** | ❌ NOT persisted |
| `total_gst_tax_amount` (root) | not sent | "5.00" | backend stored item-GST only |
| `total_vat_tax_amount` (root) | not sent | "0.00" | ✅ |
| `payload_total_gst_tax_amount` | not sent | **null** | ❌ never populated |
| per-item `service_charge` | **9** | **"0.00"** | ❌ NOT persisted per-line |
| per-item `gst_tax_amount` | not sent | "5.00" | backend computed from food_details.tax |
| per-item `tax_amount` | not sent | 5 | backend computed |
| per-item `vat_tax_amount` | not sent | "0.00" | ✅ |

### 2.2 Order `#002357` (478 normal endpoint, fresh, `payment_status: "unpaid"`)

This is the response that produced screenshot 2's wrong UI on order `#002356`-style display.

| Field | Payload | Response | Status |
|---|---|---|---|
| `order_amount` | 116 | 116 | ✅ |
| `order_sub_total_amount` | 109 | 109 | ✅ |
| `order_sub_total_without_tax` | 100 | 100 | ✅ |
| `total_tax_amount` | 6.62 | 6.62 | ✅ |
| `total_gst_tax_amount` (root) | not sent | **"6.62"** | ⚠️ rolls item-GST AND SC-GST together |
| `total_vat_tax_amount` (root) | not sent | "0.00" | ✅ |
| `total_service_tax_amount` | **9** | **"0.00"** | ❌ NOT persisted |
| `service_gst_tax_amount` | **1.62** | **"0.00"** | ❌ NOT persisted |
| `payload_total_gst_tax_amount` | not sent | **null** | ❌ never populated |
| per-item `gst_tax_amount` | not sent | **"0.00"** | ❌ inconsistent with #002351 |
| per-item `service_charge` | **9** | **"0.00"** | ❌ NOT persisted |
| per-item `tax_amount` | not sent | **0** | ❌ inconsistent with #002351 |

Plugging this response into `getOrderDetails` (`orderService.ts:180-208`):

```
totalVat        = 0
totalTax        = 6.62
serviceCharge   = parseFloat("0.00") || Σ d.service_charge(0) = 0     → SC row HIDDEN ✓ matches screenshot
totalGst        = parseFloat(null) || (6.62 − 0) = 6.62
scGst           = parseFloat("0.00") || (6.62 − Σ d.gst_tax_amount(0)) = 6.62
itemGst         = 6.62 − 6.62 = 0                                     → CGST/SGST rows HIDDEN ✓
cgst = sgst     = 0
scCgst = scSgst = 6.62 / 2 = 3.31                                     → matches screenshot 2 ✓
grandTotal      = 116                                                 ✓
```

The frontend mapping is doing exactly what its inputs deterministically dictate.

### 2.3 716 payload vs 478 payload — frontend-side asymmetry (G3 confirmed)

| Field | 478 payload (normal) | 716 payload (multi-menu) |
|---|---|---|
| `cart[i].gst_tax_amount` | NOT sent | sent (54) |
| `cart[i].vat_tax_amount` | NOT sent | sent (0) |
| `cart[i].tax_amount` | NOT sent | sent (54) |
| `cart[i].service_charge` | sent (9) | sent (15) |
| `total_gst_tax_amount` (root) | NOT sent | sent (56.7) |
| `total_vat_tax_amount` (root) | NOT sent | sent (0) |
| `total_service_tax_amount` | sent (9) | sent (15) |
| `service_gst_tax_amount` | sent (1.62) | sent (2.7) |

`buildMultiMenuPayload` (`helpers.js:458-460`) emits root `total_gst_tax_amount`/`total_vat_tax_amount` and per-item GST/VAT/tax. Normal `placeOrder` (`orderService.ts:313-365`) does not. This is exactly the discovery-report risk **G3** and handover risk **R-runtime-1**, now confirmed as a real frontend payload gap.

---

## 3. Frontend mapping check (innocent)

`getOrderDetails` (`orderService.ts:180-208`) and `OrderSuccess.jsx` bill-summary render are correct. The deterministic walk in §2.2 reproduces screenshot 2 exactly given the response in §2.2. No frontend mapping or display bug.

---

## 4. Conclusion

### 4.1 Primary issue (causes the wrong UI on 478)

**Backend** — normal `/customer/order/place` and (almost certainly) `/customer/order/update-customer-order` endpoints:

1. Do NOT persist root `total_service_tax_amount` (always `"0.00"` in response).
2. Do NOT persist root `service_gst_tax_amount` (always `"0.00"` in response).
3. Do NOT persist per-item `service_charge` (always `"0.00"` in response).
4. Never populate `payload_total_gst_tax_amount` (always `null`).
5. Inconsistently persist per-item `gst_tax_amount` / `tax_amount` (depends on lifecycle).
6. On payment settle, recompute `order_amount`, `order_sub_total_amount`, `tax_amount` **without** SC.

The 716 multi-menu endpoint (`/autopaid-place-prepaid-order`) does NOT have this gap. The same fields are correctly persisted and echoed there, which is why 716 renders correctly with the same frontend.

### 4.2 Secondary issue (contributing, not blocking the UI fix)

**Frontend** — normal `placeOrder` payload is thinner than `buildMultiMenuPayload`:

- Missing per-item `gst_tax_amount` / `vat_tax_amount` / `tax_amount`.
- Missing root `total_gst_tax_amount` / `total_vat_tax_amount`.

This forces the backend to derive GST/VAT buckets from `food_details.tax`, which is where the SC-GST vs item-GST roll-up confusion in `#002357` arises. Strictly optional once 4.1 is fixed.

### 4.3 What is NOT broken

- `OrderSuccess.jsx` bill-summary render
- `getOrderDetails` SC mapping in `orderService.ts`
- `ReviewOrder.jsx` SC math (screenshot 1 proves this)
- `allocateServiceChargePerItem` (per-item `service_charge: 9` was emitted in payload)

### 4.4 Required action

Backend team must, on `/customer/order/place` and `/customer/order/update-customer-order`:

1. Persist incoming root `total_service_tax_amount` (do not zero it out).
2. Persist incoming root `service_gst_tax_amount` (do not zero it out).
3. Persist incoming per-item `service_charge` on each detail (do not zero it out).
4. Populate root `payload_total_gst_tax_amount` = `total_tax_amount − total_vat_tax_amount − service_gst_tax_amount` (the correctly-labelled item-only GST).
5. When recomputing amounts on settle / payment update, INCLUDE SC in `order_amount`, `order_sub_total_amount`, and `tax_amount` (or stop recomputing them and trust frontend values).

Once these land, the same frontend code that already renders 716 correctly will render 478 correctly with **zero frontend change**.

---

**No code changes made.**
