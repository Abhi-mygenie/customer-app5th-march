# INVESTIGATION REPORT — Review Order Edit Mode Layout & UX

**ID:** CR-2026-11-25-003 (pre-registration — to be formally registered at Intake)
**Type:** Investigation → feeds into CR Intake
**Investigated:** 2026-11-25
**Files read:** ReviewOrder.jsx (2402 lines), PreviousOrderItems.jsx (165 lines),
               PreviousOrderItems.css, OrderItemCard.jsx
**Risk level:** HIGH (ReviewOrder.jsx is a CRITICAL hotspot — entire order flow lives here)

---

## 1. What the Owner Reported

> "In the review page, if we are editing an order, first we see previously ordered item,
> then new order and then some GST taxes and stuff. What we need is first we should show
> the new item added, then the previously ordered item with the collapsible thing,
> default collapsible and user want he can expand. It should not look like that same item
> which is added that time is actually the total sum."

---

## 2. Current Code Layout (Edit Mode)

From `ReviewOrder.jsx` lines 1996–2041:

```
EDIT MODE — CURRENT RENDER ORDER:
─────────────────────────────────
1. Customer Details
   ─── divider ───
2. PreviousOrderItems              ← FULLY EXPANDED, ALWAYS, NO COLLAPSE
   (all previously ordered items, locked, read-only)
   ─── divider ───
3. "New Items" section             ← NEW ADDITIONS BURIED HERE
   (OrderItemCard list, editable)
   ─── divider ───
4. Price Breakdown
   Item Total: ₹X                 ← COMBINED (previous + new), confusing
   GST / VAT
   Grand Total
```

**PreviousOrderItems.jsx** has no expand/collapse state at all — it always renders all
items fully. There is no `useState`, no toggle, no chevron.

---

## 3. The Two Problems Found

### Problem A — Wrong visual priority (order)

The previously ordered items are **locked** — the customer cannot change them. They are
background information. Yet they appear **first** and dominate the page.

The **new additions** — which is the entire reason the customer opened the edit flow —
are buried below the previous items. On a restaurant with 4–5 previous items, the
customer has to scroll past them to even see what they just added.

**Expected mental model:** "I added 1 coffee. Let me confirm it. Oh yes, here's what I
already ordered (collapsed below)."

**Actual experience:** "I see 4 previous items → scroll → then see my new coffee →
then a large total that includes everything."

### Problem B — The "total sum" confusion

From `ReviewOrder.jsx` line 737:
```js
const itemTotal = previousSubtotal + subtotal;
```

The Price Breakdown "Item Total" is the **combined** total (previous order + new items).
No line in the Price Breakdown separates the two. So a customer who had a ₹480 previous
order and just added a ₹160 coffee sees:

```
Item Total: ₹640     ← looks like their coffee costs ₹640
GST:        ₹32
To Pay:     ₹672
```

There is no row saying "Previous order: ₹480" or "New additions: ₹160". The customer
cannot tell how much their new item is costing without mental arithmetic.

---

## 4. Proposed Design

### 4a. Section order — flip new and previous

```
EDIT MODE — PROPOSED RENDER ORDER:
────────────────────────────────────
1. Customer Details
   ─── divider ───
2. "New Items" section             ← FIRST — focus on what's new
   (OrderItemCard list, editable, quantity controls)
   ─── divider ───
3. Previously Ordered              ← SECOND — collapsed by default
   [🔒 Previously Ordered  3 items · ₹480  ▼]
   (tapping ▼ expands; all items shown; tapping ▲ collapses)
   ─── divider ───
4. Price Breakdown
   New additions:   ₹160          ← NEW ROW (new items only)
   Previous order:  ₹480          ← NEW ROW (grey/muted, prev items only)
   ─────────────────────────
   Item Total:      ₹640
   GST (5%):        ₹32
   ─────────────────────────
   To Pay:          ₹672
```

### 4b. Collapsed state design for "Previously Ordered"

```
┌──────────────────────────────────────────────┐
│ 🔒  Previously Ordered    3 items · ₹480  ⌄  │
└──────────────────────────────────────────────┘
```

- One-line pill/row — same visual weight as a section header
- Shows: lock icon + label + item count + subtotal + chevron (▼/▲)
- Tapping anywhere on the row toggles expand/collapse
- Default: **collapsed**
- When expanded: items appear below with a smooth slide-down animation

### 4c. Expanded state

```
┌──────────────────────────────────────────────┐
│ 🔒  Previously Ordered    3 items · ₹480  ⌃  │
├──────────────────────────────────────────────┤
│  Cappuccino           x1          ₹160.00    │
│    Oat Milk, Extra Shot                      │
│    ● Preparing                               │
├──────────────────────────────────────────────┤
│  Flat White           x2          ₹320.00    │
│    ● Served                                  │
└──────────────────────────────────────────────┘
```

Same as current detail view, but now optional and secondary.

### 4d. Price Breakdown — split rows (edit mode only)

```
Price Breakdown
───────────────────────────────
New additions          ₹160.00   ← cartItems subtotal only
Previous order         ₹480.00   ← previousSubtotal (muted grey text)
───────────────────────────────
Item Total             ₹640.00
GST (5%)                ₹32.00
───────────────────────────────
To Pay                 ₹672.00
```

The two new rows appear **only in edit mode** (`isEditMode === true`). The existing
single "Item Total" row remains for normal (non-edit) flow — no change there.

---

## 5. Files That Will Change

| File | Change | Risk |
|---|---|---|
| `pages/ReviewOrder.jsx` | Move `PreviousOrderItems` block below New Items block (~5 line move). Add 2 new price rows in Price Breakdown section (edit mode only). | HIGH — hotspot. Scope is tight: position swap + 2 display rows. No logic change. |
| `components/PreviousOrderItems/PreviousOrderItems.jsx` | Add `useState(false)` for `isExpanded`. Render collapsed header when false. Add chevron icon. | LOW — self-contained component |
| `components/PreviousOrderItems/PreviousOrderItems.css` | Collapsed/expanded states + slide transition | LOW |

**Files that WILL NOT change:**
`CartContext.js`, `AuthContext.jsx`, `orderService.ts`, `cartTransformer.ts`,
any calculation logic (line 737 `itemTotal` unchanged), payment logic, POS API calls.

---

## 6. Risk Assessment

| Factor | Assessment |
|---|---|
| Money / payment path | NO — display only change, no calculation logic touched |
| Order submission | NO — `buildOrderItems`, `buildPreviousItems`, API calls unchanged |
| Existing non-edit mode | NO — all changes wrapped in `isEditMode` guard |
| ReviewOrder.jsx hotspot | YES — requires careful scoped edit, line-number verification before PR |
| PreviousOrderItems | LOW — small self-contained component |

**Overall risk: MEDIUM** (the section reorder in ReviewOrder.jsx is a 5-line move;
the price row addition is display-only behind `isEditMode`)

---

## 7. What Is NOT Changing

- Calculation: `itemTotal = previousSubtotal + subtotal` stays identical
- API payloads: `buildOrderItems`, `buildPreviousItems` untouched
- Non-edit ReviewOrder layout: unchanged
- CartContext, AuthContext, orderService: untouched
- POS API: untouched

---

## 8. Owner Decisions Needed Before Planning

1. **Confirm the proposed layout** (new items first, previous items collapsed below)
2. **Confirm the split price rows** in Price Breakdown (new additions + previous order
   as separate lines, or just keep single Item Total but move sections)
3. **Is this a Fast Lane item or full gate?** The section swap is 5 lines in a hotspot
   file — recommend full gate (not Fast Lane) given ReviewOrder.jsx risk level.

---

```
Investigation complete: CR-2026-11-25-003 (pre-registration)
Root cause: JSX section order wrong (previous before new) + no collapse on PreviousOrderItems + combined Item Total with no split
Classification: FE/UX
Confidence: HIGH
Steps used: 7/10
Recommendation: Formal Intake → Planning → Implementation (full gate, not Fast Lane, hotspot file)
Report: memory/change_requests/CR-2026-11-25-003-review-order-edit-layout/INVESTIGATION_REPORT.md
```
