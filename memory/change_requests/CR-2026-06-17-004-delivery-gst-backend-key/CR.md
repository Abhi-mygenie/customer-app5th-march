# CR-2026-06-17-004 — Delivery GST: Switch to Backend-Provided Rate Key

| Field | Value |
|---|---|
| CR ID | CR-2026-06-17-004 |
| Registered at (UTC) | 2026-06-17 |
| Registered by | E1 (on behalf of owner) |
| Classification | BUG / Deviation from plan |
| Severity | P2 |
| Risk | LOW |
| Status | **REGISTERED — awaiting backend confirmation + owner approval** |
| Parent | DELIVERY_CHARGE_GATING CR (D-3 bucket) |

---

## Problem

The DELIVERY_CHARGE_GATING CR (D-3) planned to read the delivery GST rate from a **delivery-specific backend key** (`restaurant.delivery_charge_tax`). At implementation time, the POS API `/web/restaurant-info` did **not expose** that field. The implementer used `restaurant.gst_tax_percent` (the general item GST rate) as a workaround.

### Current code (`ReviewOrder.jsx:684`)
```js
const deliveryGstRate = parseFloat(restaurant?.gst_tax_percent) || 0;
```

### What the plan specified
```js
const deliveryGstRate = parseFloat(restaurant?.delivery_charge_tax) || 0;
```

### Impact
- Delivery GST is currently calculated at the **same rate as item GST** (e.g. 5%)
- If the correct delivery GST rate differs from item GST rate, bills are **wrong**
- If delivery should have **0% GST** (as D-4 originally specified: "0 flat unless backend config exists"), then current code **over-charges** GST on delivery

---

## What needs to happen

### Step 1 — Backend/POS team confirmation (BLOCKING)
Confirm the **exact field name** the POS API exposes (or will expose) for delivery-specific GST rate:
- Is it `delivery_charge_tax`? (per original plan)
- Is it `delivery_charge_gst`? (per owner's mention)
- Is it something else?
- Does it exist today in the `/web/restaurant-info` response? For which restaurants?

### Step 2 — Code change (1 line, after confirmation)

**File:** `frontend/src/pages/ReviewOrder.jsx` line 684

**From:**
```js
const deliveryGstRate = parseFloat(restaurant?.gst_tax_percent) || 0;
```

**To (example, pending confirmed key name):**
```js
const deliveryGstRate = parseFloat(restaurant?.delivery_charge_gst) || 0;
```

The `|| 0` fallback ensures that if the field is absent/null, delivery GST = 0 (matching the original D-4 rule: "0 flat unless backend config exists").

### Step 3 — Validation
- Delivery order for restaurant WITH the field set → delivery GST applied at the correct rate
- Delivery order for restaurant WITHOUT the field → delivery GST = 0
- Dine-in / takeaway / room orders → unchanged (delivery GST gate `includeDelivery` = false)
- 716 multi-menu → unchanged

---

## Files affected

| File | Change |
|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | 1 line — switch `gst_tax_percent` → confirmed backend key |

---

## Constraints
- Do NOT change any other delivery/SC/tax logic
- Do NOT touch `OrderSuccess.jsx` (D-8 still deferred)
- Do NOT touch `orderService.ts` or `helpers.js`
- The `|| 0` fallback is mandatory (preserves D-4 zero-default behaviour)

---

## Blocked on
1. **POS team:** confirm the exact field name in `/web/restaurant-info` response
2. **Owner:** approve the 1-line switch after field name is confirmed

---

*Registered: 2026-06-17 | Status: REGISTERED — awaiting backend confirmation*
