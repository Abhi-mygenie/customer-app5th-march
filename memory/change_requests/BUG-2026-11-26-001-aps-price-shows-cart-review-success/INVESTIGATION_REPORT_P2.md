# INVESTIGATION REPORT — BUG-2026-11-26-001 Phase 2

**ID:** BUG-2026-11-26-001 Phase 2
**Date:** 2026-11-26
**Role:** Investigation (Role 6)
**Steps used:** 10/10 + 1 POS API probe

---

## Owner Report (screenshots 2026-11-26)

5 live screenshots showing remaining APS price display gaps after Phase 1:

1. **Customisation modal "Add To Cart ₹1.00"** (restaurant 892, Crab APS)
2. **CartBar edit mode "APS + ₹0.00 = APS"** (restaurant 892)
3. **OrderSuccess King Fish x2 ₹2.00** (restaurant 892, Miia Bella, pre-fix order)
4. **ReviewOrder Grand Total "₹1.00 + APS"** (restaurant 69, melo fish, with rounding)
5. **OrderSuccess Grand Total "₹0.99 + APS"** (restaurant 69, melo fish, with SC/GST)

Owner also provided raw POS API item JSON showing `"aps": "yes"` field.

---

## POS API Probe Results

**Endpoint:** `POST /api/v1/web/restaurant-product {"restaurant_id":"69","category_id":"0"}`

```
Total items: 21
Items with aps="yes": 2
  id=248234  name="check in"   price=1  aps=yes  tax=0%  Exclusive
  id=248252  name="melo fish"  price=1  aps=yes  tax=5%  Exclusive
Non-APS items priced at ₹1: 0
All fields on items include: id, name, price, aps, tax, tax_type, tax_calc, variations, ...
```

**Key finding:** `aps: "yes"` exists on EVERY item from POS API — either `"yes"` or other value. The field is POS-authoritative.

---

## Root Causes

### Gap 1 — Customisation modal "Add To Cart ₹1.00"

**File:** `CustomizeItemModal.jsx:324`
**Root cause:** PLAN_GAP — `CustomizeItemModal` never included in Phase 1 scope.
`priceCalculation.total = basePrice(=1) + variations + addons = 1.00`. No APS detection.

---

### Gap 2 — CartBar edit mode "APS + ₹0.00 = APS"

**File:** `CartBar.jsx` edit mode IIFE
**Root cause:** PLAN_GAP — no guard for `previousItemsPrice === 0`.
String: `"APS" + " + ₹0.00 = " + "APS"` when `previousItemsPrice=0`.

---

### Gap 3 — OrderSuccess King Fish x2 ₹2.00

**Root cause:** Pre-Phase-1-Fix-C order. Order placed before `apsItemFoodIds` was wired into navigate state. `apsSuccessFoodIds` = empty Set. New orders placed after Fix C show correctly.

---

### Gap 4 — ReviewOrder Grand Total "₹1.00 + APS" (with rounding)
### Gap 5 — OrderSuccess Grand Total "₹0.99 + APS" (with SC/GST)

**Root cause: ARCHITECTURAL — arithmetic subtraction `total - apsCount` is wrong when GST/SC/rounding involved.**

**ReviewOrder trace (melo fish, 5% GST exclusive, `total_round=Yes`):**
```
itemTotal      = ₹1.00 (APS placeholder)
CGST 2.5%      = ₹0.025 (computed on ₹1)
SGST 2.5%      = ₹0.025 (computed on ₹1)
totalToPay     = ₹1.05
roundedTotal   = Math.ceil(1.05) = ₹2.00   ← rounding to next integer!
real           = 2.00 - 1 = ₹1.00  → "₹1.00 + APS"  ✗
```

**OrderSuccess trace (melo fish, POS polling):**
```
liveOrderAmount = ₹1.99  (POS: ₹1 + GST + SC + scGST on ₹1)
real            = 1.99 - 1 = ₹0.99  → "₹0.99 + APS"  ✗
```

---

### Gap 6 — Detection fragility (`price===1` as sole APS signal)

**Root cause:** `aps` field present in POS API response for every item but NOT extracted in `useMenuData.js` transformer (lines 64–130, 35 fields listed, `aps` absent). Every APS detection in codebase uses `parseFloat(item.price) === 1` only.

---

## Owner's Proposed Fix (validated)

**Use `aps:"yes"` tag + treat APS price as ₹0 for FE display calculations only. Keep ₹1 for POS payloads.**

This solves all 6 gaps:
- CustomiseModal: basePrice=0 → button shows APS
- CartBar: edit mode ₹0.00 guard + correct detection
- ReviewOrder: GST computed on ₹0 APS = ₹0 → no residual in Grand Total
- OrderSuccess: displayBillSummary passed from ReviewOrder (APS=0 pre-computed)
- Detection: `item.aps==="yes"` is POS-authoritative

---

## Recommendation

PLANNING (Role 2) → Implementation Plan for price=0 display approach.
Transformer 1-liner (`aps: item.aps || 'no'`) is the prerequisite.
All payload calculations stay on real ₹1 values.

---

*Investigation complete: BUG-2026-11-26-001 Phase 2*
*Classification: FE / DISPLAY_ONLY*
*Confidence: HIGH*
*Evidence: 5 owner screenshots + POS API probe + code read (6 files)*
