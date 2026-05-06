# 478 Order — Backend Persistence Bug Handoff

**Status:** OPEN — backend fix required
**Component:** POS API — `/customer/order/place` endpoint family for restaurant 478 (and any non-716 restaurant using the normal/non-autopaid flow)
**Severity:** High — customer-facing OrderSuccess screen displays incorrect tax breakdown
**Audience:** Backend team owning `preprod.mygenie.online/api/v1`
**Prepared:** 2026-05-06
**Frontend changes (this thread):** Already deployed — F1 through F4 expanded the outgoing payload contract. Frontend is sending the correct, complete data. **The bug is not on the frontend.**

---

## 1. The bug in one paragraph (plain English)

When a customer places an order for restaurant 478, the frontend now sends the backend a complete payload that includes the service charge, the GST on the service charge, and per-item GST. The backend accepts the order, takes the customer's money, and creates the order — but when it stores the order in the database (or when it returns the saved order through `/customer/order/order-details/<id>`), it **drops the service-charge-related fields and the per-item GST fields**, leaving them as `0` or `null`. As a result, the OrderSuccess screen the customer sees a moment later shows a wrong, incomplete bill: the Service Charge row is missing, the normal CGST/SGST rows are missing, and the entire GST amount is wrongly labelled as "CGST on SC" / "SGST on SC". Restaurant 716 does not have this bug because its orders go through a different endpoint (`/customer/order/place-autopaid`) that preserves these fields correctly.

---

## 2. Visual evidence: same screen, two restaurants, two outcomes

The OrderSuccess screen is built from a **single React component**. It renders identically for every restaurant. The only thing that varies is the data that the `/customer/order/order-details/<id>` API returns. Here is what the customer actually sees:

### 716 — works correctly (the goal state for 478)
```
Order Placed!
Order #000107                                    ₹123.9
Room                                             R-010

Items Ordered (1)
  French Fries                              x1   ₹100.00

Bill Summary
  Item Total                                     ₹100.00
  Service Charge (Optional)                      ₹5.00
  ─────────────────────────────────────────────────────
  Subtotal                                       ₹105.00
    CGST 9%                                      ₹9.00
    SGST 9%                                      ₹9.00
    CGST on SC 9%                                ₹0.45
    SGST on SC 9%                                ₹0.45
  ─────────────────────────────────────────────────────
  Grand Total                                    ₹123.90
```

All seven rows present. Service Charge correctly shown. Item GST and SC-GST correctly separated.

### 478 — same screen, broken
```
Order Placed!
Order #002358                                    ₹116

Items Ordered (1)
  My test                                   x1   ₹100.00

Bill Summary
  Item Total                                     ₹100.00
                                                       ← Service Charge row MISSING
  ─────────────────────────────────────────────────────
  Subtotal                                       ₹109.00
                                                       ← CGST X% row MISSING
                                                       ← SGST X% row MISSING
    CGST on SC                                   ₹3.31  ← wrong value, no percentage
    SGST on SC                                   ₹3.31  ← wrong value, no percentage
  ─────────────────────────────────────────────────────
  Grand Total                                    ₹116.00
```

The Subtotal (₹109) and Grand Total (₹116) are correct, but the breakdown is wrong:
- "Service Charge (Optional)" is missing — the customer cannot see the ₹9 that contributed to the Subtotal.
- "CGST 2.5%" and "SGST 2.5%" rows on the items are missing.
- The entire GST amount of ₹6.62 has been mislabelled as "CGST on SC" / "SGST on SC" (split into 3.31 + 3.31). The actual SC-GST is only ₹1.62; the remaining ₹5 is item-GST that has been hidden.

The customer cannot understand the breakdown of their bill. This is a tax-compliance display problem.

---

## 3. The actual order numbers, for reference

The customer placed a 478 order with these inputs (everything below is **correct** and was sent by the frontend in the place-order request — verified):

| What | Value | Where it comes from |
|---|---|---|
| Item: "My test" | ₹100.00 unit price, qty 1 | menu item |
| Item GST rate | 5% | menu item config (`food_details.tax = 5`, `tax_type = "GST"`) |
| Service Charge percentage | 9% | restaurant config (`service_charge_percentage = 9`, `auto_service_charge = "Yes"`) |
| GST on Service Charge rate | 18% | restaurant config (`service_charge_tax = 18`, `gst_status = true`) |

Calculations:
```
Item Total                       = 100 × 1               = 100.00
Service Charge (9% of 100)        = 100 × 9%              =   9.00
Subtotal (Item Total + SC)        = 100 + 9               = 109.00

Item GST (5% on 100)              = 100 × 5%              =   5.00
   CGST half                                              =   2.50
   SGST half                                              =   2.50
SC-GST (18% on 9)                 = 9   × 18%             =   1.62
   CGST on SC half                                        =   0.81
   SGST on SC half                                        =   0.81
Total Tax                         = 5 + 1.62              =   6.62

Grand Total before rounding       = 109 + 6.62            = 115.62
Math.ceil(115.62)                                         = 116.00 ← order_amount
```

Every one of those numbers is what the frontend computed and **sent** to `/customer/order/place`. The frontend payload was verified field-by-field against the 716 reference — see Section 6.

---

## 4. What the backend response is dropping (the actual fix list)

When the OrderSuccess page calls `GET /customer/order/order-details/002358`, the response **must** carry these fields with non-zero values, but currently does not:

| # | Field path | What 478 currently returns (broken) | What 716 returns (working — mirror this) | What 478 should return |
|---|---|---|---|---|
| 1 | `total_service_tax_amount` (root) | `"0.00"` | `"5.00"` | **`"9.00"`** |
| 2 | `service_gst_tax_amount` (root) | `"0.00"` | `"0.90"` | **`"1.62"`** |
| 3 | `payload_total_gst_tax_amount` (root) | `null` | populated | **`"5.00"` (item-GST only) or `"6.62"` (item + SC-GST combined) — pick the same convention 716 uses, frontend handles both** |
| 4 | per-item `gst_tax_amount` | `"0.00"` on every line | populated per line | **`"5.00"` for the single item** |
| 5 | per-item `service_charge` | `"0.00"` on every line | populated per line (allocated proportionally) | **`"9.00"` on the single item** |
| 6 | `total_tax_amount` (root) | `"6.62"` ✅ | populated | already correct, no change |
| 7 | `total_vat_tax_amount` (root) | `"0.00"` ✅ | populated | already correct (no VAT items here) |
| 8 | `order_amount` (root) | `"116"` ✅ | populated | already correct |
| 9 | `order_sub_total_amount` (root) | `"109"` ✅ | populated | already correct |
| 10 | `order_sub_total_without_tax` (root) | `"100"` ✅ | populated | already correct |

**Five fields are being lost. Five fields. None of them are being computed wrong — they are simply not being persisted/echoed back.**

The frontend's place-order payload (verified) sends every single one of these fields with the correct values. The backend is receiving them and discarding them somewhere between the request and the database save (or between the database read and the response serialization).

---

## 5. Why this surfaces as "CGST on SC ₹3.31" instead of an obvious zero

This is purely a consequence of how the frontend mapping has to defensively derive missing data. The frontend code is written conservatively: it prefers explicit backend fields, and only falls back to derivation when those fields are missing. With the backend dropping fields 1, 2, 3, and 4 above all at the same time, the fallback math has nowhere to put the GST except in the SC bucket:

```
Step 1: totalGst = payload_total_gst_tax_amount || (totalTax − totalVat)
                 =   null                       || (6.62 − 0)
                 =   6.62

Step 2: scGst   = service_gst_tax_amount || (totalGst − sum of per-item gst_tax_amount)
                =   0                    || (6.62      − 0)
                =   6.62

Step 3: itemGst = totalGst − scGst = 6.62 − 6.62 = 0
```

Once `itemGst = 0`, the UI hides the "CGST X%" and "SGST X%" rows (it only shows rows whose value is greater than zero). That leaves only the SC rows, displaying the entire 6.62 split half-half. **The frontend is doing nothing wrong; it has no other valid number to display.**

The moment the backend starts returning even **one** of fields 2, 3, or 4 with the correct value, this disambiguation becomes possible and the UI starts rendering correctly. (Fixing all five is the right answer, not just one.)

---

## 6. The frontend payload IS correct — here is the proof

The frontend was extended in this thread to send a payload byte-equivalent to what 716's autopaid path sends. Captured live from a 478 placement (Order #002358):

```json
{
  "cart": [{
    "food_id": "198286",
    "price": "100.00",
    "quantity": 1,
    "total_variation_price": 0,
    "total_add_on_price": 0,
    "gst_tax_amount": 5,            // ← 5% × 100 × 1 ✅
    "vat_tax_amount": 0,
    "tax_amount": 5,
    "discount_on_food": 0,
    "service_charge": 9             // ← allocated ✅
  }],
  "order_amount": 116,
  "tax_amount": 6.62,
  "order_sub_total_amount": 109,
  "order_sub_total_without_tax": 100,
  "total_service_tax_amount": 9,    // ← ✅
  "service_gst_tax_amount": 1.62,   // ← ✅
  "total_gst_tax_amount": 6.62,     // ← ✅
  "total_vat_tax_amount": 0,
  "round_up": 0,
  "tip_tax_amount": 0,
  "discount_amount": 0,
  "coupon_discount_amount": 0,
  "points_redeemed": 0,
  "points_discount": 0,
  "restaurant_id": "478",
  "table_id": "0",
  "payment_type": "postpaid",
  "order_type": "dinein"
}
```

The five fields the backend drops in its **response** are all present and correct in the **request**. The data is reaching the backend and then being thrown away somewhere downstream.

---

## 7. Acceptance criteria for the backend fix

After the backend fix, place this exact 478 order again and call `/customer/order/order-details/<new-order-id>`. The response **must** contain:

```
total_service_tax_amount       = "9.00"   (or numeric 9)
service_gst_tax_amount         = "1.62"   (or numeric 1.62)
payload_total_gst_tax_amount   = "5.00"   (or whatever convention 716 uses; non-null)
total_tax_amount               = "6.62"   (already correct)
total_vat_tax_amount           = "0.00"   (already correct)
order_amount                   = "116"    (already correct)
order_sub_total_amount         = "109"    (already correct)
order_sub_total_without_tax    = "100"    (already correct)

cart[0].gst_tax_amount         = "5.00"   (or numeric 5)
cart[0].vat_tax_amount         = "0.00"   (already correct)
cart[0].service_charge         = "9.00"   (or numeric 9, last item gets the remainder if many items)
cart[0].tax_amount             = "5.00"
cart[0].total_variation_price  = 0
cart[0].total_add_on_price     = 0
cart[0].discount_on_food       = 0
```

When this happens, the OrderSuccess screen for restaurant 478 will render exactly like restaurant 716's does today (the seven-row Bill Summary in Section 2). **No frontend change needed**; the same component will then receive correct data and produce the correct rendering automatically.

A multi-item test (e.g., 3 items at different prices and tax rates) is also recommended, to confirm that the per-item allocation of `service_charge` and `gst_tax_amount` is preserved in the database round-trip.

---

## 8. Where to look in the backend code

The frontend cannot see the backend code, but the symptom is consistent with one of these patterns:

1. **The order-creation handler for `/customer/order/place` ignores the SC-related fields when writing to the database.** It may be using a smaller schema/DTO than the autopaid endpoint, so the fields are silently dropped at the persistence layer.
2. **The order-creation handler stores the fields, but the `/customer/order/order-details/<id>` serializer does not include them in its response shape** (different response DTO than the autopaid endpoint uses).
3. **The order-settle / post-place hook recomputes `order_amount`, `tax_amount`, etc. without including the service charge**, then overwrites the persisted row. There is anecdotal evidence of this from §7.3 of the predecessor handover ("On settle: `order_amount` recomputed without SC (saw 105 instead of 116)") — but in the current capture `order_amount` is 116, so this particular pattern may already be partially corrected. The persistence drop on the **other** five fields is still active though.

The simplest diagnostic: compare the database row immediately after `/customer/order/place` returns and again after the OrderSuccess screen calls `/customer/order/order-details/<id>`. If the fields are correct in the DB but missing in the response, it's a serialization-only bug. If they are zero/null in the DB itself, it's a persistence bug.

The cleanest fix is probably: **make the `/customer/order/place` endpoint use the same persistence + response shape that `/customer/order/place-autopaid` is already using for 716.** That endpoint demonstrably handles all five fields correctly today.

---

## 9. What the frontend is NOT going to do

Per explicit policy in the predecessor handover (§F5.5):

> "If response still shows `total_service_tax_amount: "0.00"`, `service_gst_tax_amount: "0.00"`, per-item `service_charge: "0.00"`, or `payload_total_gst_tax_amount: null` → classify as `backend_persistence_issue` and **hand back to backend team. Do NOT patch frontend UI to mask backend issue.**"

We will not:
- Add frontend logic to "guess" item-GST vs SC-GST when the backend doesn't tell us
- Add a frontend post-processing step that re-derives the missing fields from the restaurant config
- Hide or remap the wrong rows on the OrderSuccess screen
- Pre-populate the `getOrderDetails` response from the place-order response

Any of those would mask a real backend bug, hide it from QA, and create a divergence between what the customer sees on OrderSuccess and what the restaurant sees in the POS — which is unacceptable for a tax-compliance display.

---

## 10. Closing the loop

Once the backend deploys the fix:

1. Place a fresh 478 order with a service charge.
2. Capture `GET /customer/order/order-details/<new-order-id>` from the customer-facing app.
3. Confirm the fields in Section 7 are populated.
4. Visually verify the OrderSuccess screen shows all seven rows like the 716 example.
5. Repeat with an edited order (`/customer/order/update-customer-order`) — the same five fields must round-trip on the edit path too.
6. Repeat with a multi-item order to verify per-item allocation is preserved.

When all five checks pass, this issue can be closed. No further frontend work is required.

---

**Contact:** the team that did the frontend payload contract alignment in this thread (F1–F4) is available to help reproduce the bug live, hand over additional captures, or sit through a backend debugging session.

**Reference docs:**
- `SERVICE_CHARGE_MAPPING_478_FRONTEND_PAYLOAD_HANDOVER.md` — the frontend work that closed the request-side gap
- `SERVICE_CHARGE_MAPPING_478_RESPONSE_UI_CHECK.md` — earlier RCA confirming this is a backend issue
- `SERVICE_CHARGE_MAPPING_478_EDIT_ORDER_VALIDATION_REPORT.md` — edit-order specific evidence

---

## Appendix A — Captured live `/order-details` response (post-claimed-fix attempt)

Captured 2026-05-06 from `GET /customer/order/order-details/<id>` for order 825388 (restaurant 478, restaurant_order_id 002363, single item "My test" @ ₹100, SC 9%, GST 5% item / 18% SC-GST). The backend team reported a fix was deployed; this is the response after that claimed fix.

### A.1 Per-item drop list (inside `details[0]`)

```
service_charge          = "0.00"     ← STILL DROPPED  (expected 9.00)
gst_tax_amount          = "0.00"     ← STILL DROPPED  (expected 5.00)
tax_amount              = 0          ← STILL DROPPED  (expected 5)
item_gst                = "0.00"     ← STILL DROPPED  (alias of gst_tax_amount)
gst                     = 0          ← STILL DROPPED  (rate or amount, ambiguous)
item_vat                = "0.00"     ✓ correct (no VAT items)
vat_tax_amount          = "0.00"     ✓ correct
total_variation_price   = "0.00"     ✓ correct
total_add_on_price      = 0          ✓ correct
discount_on_food        = 0          ✓ correct
```

### A.2 Order-level drop list (also inside `details[0]` in this API shape)

```
total_service_tax_amount        = "0.00"     ← STILL DROPPED  (expected 9.00)
service_gst_tax_amount          = "0.00"     ← STILL DROPPED  (expected 1.62)
payload_total_gst_tax_amount    = null       ← STILL NULL    (expected 5.00 or 6.62)
total_gst_tax_amount            = "6.62"     🟡 populated but ambiguous (combined item+SC)
total_vat_tax_amount            = "0.00"     ✓ correct
total_tax_amount                = 6.62       ✓ correct
order_amount                    = 116        ✓ correct
order_sub_total_amount          = 109        ✓ correct
order_sub_total_without_tax     = 100        ✓ correct
order_discount                  = 0          ✓ correct
```

### A.3 `restaurant` meta drop list

```
gst_tax_percent          = "5.00"     ✓ present  (drives "CGST X%" label)
vat_percent              = 4          ✓ present
gst_status               = true       ✓ present
service_charge_tax       = MISSING    ← NEW GAP   (needed for "CGST on SC X%" label fallback)
service_charge_percentage = MISSING   ← NEW GAP   (helpful for UI / debugging)
auto_service_charge      = MISSING    ← NEW GAP   (helpful flag)
```

### A.4 Diagnostic narrowing

These three values reconcile cleanly:
- `order_sub_total_amount = 109` (= 100 item + 9 SC) — backend KNOWS the SC was 9
- `total_tax_amount = 6.62` (= 5 item-GST + 1.62 SC-GST) — backend KNOWS the SC-GST was 1.62
- `order_amount = 116` (= ceil(109 + 6.62)) — backend KNOWS the grand total

Therefore the **calculation succeeded server-side**. Only the **breakdown is being lost** between calculation and persistence/serialization. Recommended diagnostic:

```sql
SELECT service_charge,
       gst_tax_amount,
       total_service_tax_amount,
       service_gst_tax_amount,
       payload_total_gst_tax_amount
FROM <order_items_table>
WHERE order_id = 825388;
```

- If those columns are zero/null in the DB → **persistence-write bug** (fix in the place-order INSERT handler)
- If those columns are correct in the DB but zero in the response → **serializer bug** (fix in the order-details response builder)

### A.5 Effect on the customer-facing UI

The OrderSuccess Bill Summary continues to render exactly as in Section 2's "478 — broken" example. None of the seven rows changed compared to before the claimed fix. The single change between the two captures is `total_gst_tax_amount` going from `null` to `"6.62"`, which has zero effect on UI because the frontend was already deriving `6.62` via the `totalTax − totalVat` fallback.

**Bottom line: the claimed fix did not change observable behaviour. The five critical drops listed in Section 4 of this document remain open.**

---

