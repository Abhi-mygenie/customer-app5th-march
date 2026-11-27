# INVESTIGATION REPORT P3 — BUG-2026-11-26-001

**Date:** 2026-11-26
**Role:** Investigation (Role 6)
**Scope:** Phase 3 — Remaining gaps after Phase 2 implementation

---

## Owner Report

Screenshots from live order at restaurant 69 showed:
1. CustomizeItemModal header shows `₹1.00` for melo fish (APS)
2. OrderSuccess shows `₹22.00` for melo fish + Boli variation × 2

## Gaps Identified

### GAP-1 — CustomizeItemModal header price

**File:** `CustomizeItemModal.jsx` line 204
**Code:** `<span>₹{parseFloat(item.price || 0).toFixed(2)}</span>`
**Root cause:** Phase 2 C-fixes only fixed the button text. The header `<span>` was never updated.
**Fix:** `{isAPS(item) ? 'APS' : '₹X.XX'}`

### GAP-2 — OrderSuccess per-item price for APS items WITH paid variations

**File:** `OrderSuccess.jsx` line 679
**Code:** `&& parseFloat(item.price) <= 1`
**Root cause:** `price <= 1` guard fails when variation (+₹10 Boli) makes unit price ₹11. POS sends `unit_price=11 > 1`.
**Decision:** Option A — pass `apsItemUnitPrices = {foodId: max(base+var+addon)}` from ReviewOrder navigate state.
**Fix:** Threshold widened to `(apsItemUnitPrices[fid] || 1) + 0.5`

## Evidence
- Owner screenshots × 2 (melo fish modal ₹1.00, OrderSuccess ₹22)
- POS API: melo fish variation `boli: optionPrice=10`, APS base = ₹1 → unit_price at order = ₹11

## Verification
iteration_40: 12/12 PASS (dev server + code-verified)

---
