# INTAKE DOC — CR-2026-11-25-003

**ID:** CR-2026-11-25-003
**Type:** CR
**Title:** Review Order edit mode — new items first, previously ordered collapsed by default, price breakdown split
**Registered:** 2026-11-25
**Status:** INTAKE → READY FOR PLANNING
**Priority:** P1
**Risk:** MEDIUM
**Blast radius:** MEDIUM

---

## 1. Owner Request

> "In the review page, if we are editing an order, first we see previously ordered item,
> then new order and then some GST taxes. What we need is first we should show the new item
> added, then the previously ordered item with the collapsible thing, default collapsible
> and user can expand. It should not look like that same item which is added that time is
> actually the total sum."

Additional confirmed (2026-11-25):
- New Items card: subtle styling, no aggressive green highlight
- Backend support for collapsed/expanded previously ordered: CONFIRMED (see §6)

---

## 2. Current Behaviour (from investigation)

Edit mode render order in `ReviewOrder.jsx` (lines 1996–2041):

```
1. Customer Details
2. PreviousOrderItems  ← FIRST (always fully expanded, no collapse)
3. New Items           ← SECOND (buried below previous items)
4. Price Breakdown: "Item Total ₹800" ← combined total, no split shown
```

`PreviousOrderItems.jsx` has zero collapse logic — no `useState`, no toggle.
`itemTotal = previousSubtotal + subtotal` (line 737) — combined, no visual separation.

---

## 3. Required Behaviour

```
PROPOSED edit mode render order:
1. Customer Details
2. New Items           ← FIRST (standard white card, subtle orange badge)
3. Previously Ordered  ← SECOND, COLLAPSED by default
   [🔒 Previously Ordered · N items · ₹X  ▼]  — tap to expand
4. Price Breakdown:
   New additions    ₹Y   ← new only (green label, edit mode only)
   Previous order   ₹Z   ← muted grey (edit mode only)
   ──────────────────
   Item Total       ₹X+Y ← unchanged combined value
   CGST / SGST
   Grand Total
```

---

## 4. Files WILL Change

| File | Change | Risk |
|---|---|---|
| `pages/ReviewOrder.jsx` | (a) Move `<PreviousOrderItems>` block (lines 1997–2005) to after New Items section. (b) Add 2 display-only rows in Price Breakdown, gated by `isEditMode && previousSubtotal > 0`. | HIGH — hotspot. Scope: 5-line move + 10 display lines. Zero calc logic change. |
| `components/PreviousOrderItems/PreviousOrderItems.jsx` | Add `useState(false)` for `isExpanded`. Render collapsed one-line header when false; full item list when true. Add chevron icon. | LOW — self-contained |
| `components/PreviousOrderItems/PreviousOrderItems.css` | Collapsed header style + slide-down animation | LOW |

## 5. Files WILL NOT Change

`CartContext.js`, `AuthContext.jsx`, `orderService.ts`, `cartTransformer.ts`,
any calculation at line 737 (`itemTotal = previousSubtotal + subtotal`),
API payloads (`buildOrderItems`, `buildPreviousItems`), payment logic,
non-edit mode ReviewOrder layout.

---

## 6. Backend Support Confirmed

Investigation confirmed the entire `previousOrderItems` data is already:
- Fetched via `GET /api/air-bnb/get-order-details/{orderId}` (proxied to POS)
- Transformed by `transformPreviousOrderItem()` in `orderTransformer.ts`
- Each item has: `name`, `quantity`, `fullPrice`, `veg`, `variations`, `addons`, `foodStatus`, `food_level_notes`
- Stored in `localStorage` as `editOrder.previousItems`
- Passed to `<PreviousOrderItems>` already

The collapsed header needs: `items.length` (from array) + `subtotal` (line 93 of `PreviousOrderItems.jsx`, already computed). **No new API calls, no new fields, no backend changes needed.**

---

## 7. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| CR-2026-09-12-012 | Thick-page decomposition ReviewOrder.jsx | RELATED but different scope — that CR is about splitting ReviewOrder.jsx into sub-components (architecture); this CR is about UX behaviour. Not a duplicate. |

DISTINCT.

---

## 8. Risk Assessment

| Factor | Assessment |
|---|---|
| Money / payment path | NO — `itemTotal`, tax, `totalToPay`, API payloads all untouched |
| Coupon / loyalty | NO — both disabled in edit mode (confirmed lines 2122, 2129, 976, 1049) |
| Non-edit mode | NO — all changes behind `isEditMode` guard |
| ReviewOrder.jsx hotspot | YES — requires careful scoped edit, line-number re-read before change |
| PreviousOrderItems | LOW — self-contained component |
| Backend / POS | NO change needed |

**Risk: MEDIUM**

---

## 9. Owner Decisions Captured

| Decision | Value | Date |
|---|---|---|
| New items first | Confirmed | 2026-11-25 |
| Previously ordered collapsed by default | Confirmed | 2026-11-25 |
| New items card: no green highlight, subtle | Confirmed | 2026-11-25 |
| Split price rows (New additions + Previous order) | Confirmed | 2026-11-25 |
| Backend support verified | YES | 2026-11-25 |
| Full gate (not Fast Lane) | Required — ReviewOrder.jsx is hotspot | Per Alpha prompt |

---

## 10. Design Reference

Static comparison file: `/app/frontend/public/review-order-comparison.html`
Live URL: `{PREVIEW_URL}/review-order-comparison.html`

---

```
Intake complete: CR-2026-11-25-003
Classification: CR (UX / layout)
Severity: P1 | Risk: MEDIUM
Duplicate check: DISTINCT (related: CR-2026-09-12-012)
Evidence: INVESTIGATION_REPORT.md, INVESTIGATION_REPORT_DEEP.md, review-order-comparison.html
Blast radius: MEDIUM (3 files, 1 hotspot)
Docs: change_requests/CR-2026-11-25-003-review-order-edit-layout/INTAKE_DOC.md
Next: Planning — owner has approved direction, ready to proceed
```
