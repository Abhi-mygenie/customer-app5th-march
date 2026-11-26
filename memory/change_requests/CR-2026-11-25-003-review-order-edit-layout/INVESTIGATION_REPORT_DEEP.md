# INVESTIGATION REPORT — Review Order Edit Mode (Deep Dive)
# Addendum to: CR-2026-11-25-003 initial investigation report

**Date:** 2026-11-25  
**Scope:** Full code trace of both UX problems in edit-mode ReviewOrder  
**Files read:** ReviewOrder.jsx (all 2402 lines), PreviousOrderItems.jsx, CartContext.js (variable sources)

---

## PART 1 — Section Order Problem (confirmed from initial report)

**Current JSX render order (lines 1996–2041):**

```
1. Customer Details
2. PreviousOrderItems  ← FIRST (locked, read-only, fully expanded)
3. ─── divider ───
4. "New Items" section ← SECOND (editable, what the customer just added)
5. ─── divider ───
6. Price Breakdown
```

**Root cause:** Lines 1997–2005 render `<PreviousOrderItems>` unconditionally before the
new items section at line 2008. No collapse state exists in `PreviousOrderItems.jsx`
(confirmed: no `useState`, no toggle, no chevron icon in that file).

---

## PART 2 — Price Breakdown Confusion (deep trace)

### 2a. Variable sources

```js
// From CartContext via destructure (line 144, 151):
const subtotal        = getTotalPrice();          // new cart items ONLY
const previousSubtotal = isEditMode
                          ? getPreviousOrderTotal()  // previous order items only
                          : 0;

// Combined (line 737):
const itemTotal = previousSubtotal + subtotal;    // ← what shows as "Item Total"
```

Both `subtotal` and `previousSubtotal` are **already computed and in scope**.
No new calculation is needed to display them separately — they just aren't shown separately today.

### 2b. What the customer sees today (edit mode example)

```
Previous order: Cappuccino x2 + Flat White x1 = ₹480
New addition: Organic Espresso x1 = ₹160

Price Breakdown shows:
  Item Total      ₹640.00   ← looks like the espresso costs ₹640
  CGST 2.5%        ₹16.00
  SGST 2.5%        ₹16.00
  Subtotal        ₹640.00   (finalSubtotal before rounding — same as itemTotal here, no discounts in edit)
  Grand Total     ₹672.00
                             ← "Update Order ₹672.00" button

Customer thinks: "I added a ₹160 coffee. Why is my bill ₹672?"
```

### 2c. Are discounts relevant in edit mode?

Checked: **coupons and loyalty points are both disabled in edit mode.**

```jsx
// Line 2122: coupon input disabled
disabled={couponLoading || isEditMode}

// Line 2129: Apply coupon button disabled
disabled={couponLoading || !couponCode.trim() || isEditMode}

// Line 976: loyalty auto-apply guard
if (!codeToUse || isEditMode) return;

// Line 1049: loyalty auto-apply guard
if (autoApplyAttempted.current || !recommendedCode || isEditMode) return;
```

Therefore in edit mode: `couponDiscount = 0`, `pointsDiscount = 0`, and:
```js
subtotalAfterDiscount = max(0, itemTotal - 0 - 0) = itemTotal
```

This simplifies everything — no discount edge cases to handle in the split display.

### 2d. What the "Update Order ₹672" button amount means

`roundedTotal` = combined bill (previous + new + taxes). When the customer confirms,
the POS receives the **entire revised order** (previous items + new items) and rebills
the full amount. The customer pays the grand total at the end of their meal, not just
the delta. This is correct — but the UI gives no context for this.

### 2e. The fix: 2 display-only rows in Price Breakdown (edit mode only)

**Zero calculation change.** Both values already exist. Add two rows in the JSX
**before the existing "Item Total" row**, visible only when `isEditMode && previousSubtotal > 0`:

```
Price Breakdown (edit mode):
─────────────────────────────────────────────
  New additions          ₹160.00   ← subtotal (new items only, prominent)
  Previous order         ₹480.00   ← previousSubtotal (muted grey, context)
  ─────────────────────────────────
  Item Total             ₹640.00   ← itemTotal (unchanged, combined)
  CGST 2.5%               ₹16.00
  SGST 2.5%               ₹16.00
  ─────────────────────────────────
  Grand Total            ₹672.00
```

The existing "Item Total" row on line 2063 stays exactly as-is.
No calculation touched. 2 new `<div className="price-row">` elements added above it.

---

## PART 3 — Combined Change Summary

### What changes

| File | Change | Lines | Risk |
|---|---|---|---|
| `ReviewOrder.jsx` | Move `<PreviousOrderItems>` block (lines 1997–2005) to AFTER New Items section (after line 2035). Add 2 display rows in Price Breakdown above "Item Total" (after line 2061), gated by `isEditMode && previousSubtotal > 0`. | ~10 lines moved + 10 new display lines | MEDIUM — hotspot file, tight scope |
| `PreviousOrderItems.jsx` | Add `const [expanded, setExpanded] = useState(false)`. Render collapsed header when `!expanded`, full list when `expanded`. Add chevron icon toggle. Pass `subtotal` as prop or compute it inside (already computed at line 93). | ~30 lines changed | LOW — self-contained |
| `PreviousOrderItems.css` | Collapsed one-line header style. Expand/collapse transition. | ~20 lines new | LOW |

### What does NOT change

| Item | Why safe |
|---|---|
| `itemTotal = previousSubtotal + subtotal` (line 737) | Untouched — same value, same position |
| `subtotalAfterDiscount`, `discountRatio`, all tax calcs | Untouched |
| `buildOrderItems`, `buildPreviousItems`, API payloads | Untouched |
| `roundedTotal` / "Update Order ₹X" button | Value unchanged — displays correctly |
| Non-edit mode ReviewOrder layout | All changes wrapped in `isEditMode` guard |
| CartContext, AuthContext, orderService | Untouched |

---

## PART 4 — Collapsed Header Design Spec

```
COLLAPSED (default):
┌─────────────────────────────────────────────────┐
│  🔒  Previously Ordered    3 items · ₹480    ▼  │
└─────────────────────────────────────────────────┘

EXPANDED (after tap):
┌─────────────────────────────────────────────────┐
│  🔒  Previously Ordered    3 items · ₹480    ▲  │
├─────────────────────────────────────────────────┤
│  Cappuccino          x2            ₹320.00      │
│    Oat Milk, Extra Shot                         │
│    ● Preparing                                  │
├─────────────────────────────────────────────────┤
│  Flat White          x1            ₹160.00      │
│    ● Served                                     │
└─────────────────────────────────────────────────┘
```

Props change needed: pass `itemCount` and `subtotal` from `ReviewOrder.jsx` to
`PreviousOrderItems` so the collapsed header can show them without computing in
the child. OR: compute inside the component using `items.length` and the existing
`subtotal` local variable (line 93 of `PreviousOrderItems.jsx`) — no prop change needed.

---

## PART 5 — Risk Assessment

| Factor | Assessment |
|---|---|
| Money / payment path | NO — `itemTotal`, tax, `totalToPay`, API payloads all untouched |
| Coupon / loyalty | NO — both disabled in edit mode; display rows gated on `isEditMode` |
| Non-edit mode | NO — all changes behind `isEditMode` guard |
| ReviewOrder.jsx hotspot | YES — two changes in this file. Scope is tight: (a) 5-line block move, (b) 2 new display rows in Price Breakdown. Neither touches any calculation. |
| PreviousOrderItems | LOW — self-contained, no business logic |
| POS API | NO |

**Risk: MEDIUM** (hotspot file, tight scope, zero calc logic touched)

---

## PART 6 — Planning Guidance

Before Planning writes the implementation plan:

1. **Owner confirmed both fixes are in scope** (layout reorder + price split rows)?
2. **Collapsed by default** confirmed (not expanded by default)?
3. **Split price rows format confirmed** — "New additions" + "Previous order" as separate
   rows above Item Total, or just show "New additions" and suppress "Previous order" label?

Recommendation on Q3: show both rows. The customer needs to understand that Grand Total
includes both — otherwise "Update Order ₹672" is still confusing.

---

```
Investigation complete: CR-2026-11-25-003 (addendum — full price breakdown trace)
Root cause confirmed:
  Problem A: JSX section order wrong (lines 1997–2041) + no collapse on PreviousOrderItems
  Problem B: itemTotal shows combined total with no split (line 737, line 2063–2066)
  Both fixable with display-only changes — zero calculation logic touched
Classification: FE/UX
Confidence: HIGH
Recommendation: Intake → Planning → Implementation (full gate, ReviewOrder.jsx is CRITICAL)
```
