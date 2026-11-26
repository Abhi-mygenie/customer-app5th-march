# IMPACT ANALYSIS — CR-2026-11-25-003
# Review Order edit mode — new items first, previously ordered collapsed, price split

**ID:** CR-2026-11-25-003
**Stage:** Impact Analysis
**Author role:** PLANNING
**Date:** 2026-11-25
**Code reality:** FULL — all files read, exact lines verified

---

## 1. Code Reality Check

### 1a. ReviewOrder.jsx (2402 lines — CRITICAL hotspot)

**Current JSX block order (lines 1996–2041), edit mode:**

```
L1996-2005  PreviousOrderItems block   ← MOVES to after L2038
L2007-2035  New Items section          ← stays, becomes first
L2037-2038  Divider                    ← stays
L2040-2041  Price Breakdown opens      ← 2 new rows inserted after L2063
```

**Price breakdown insertion point (line 2063-2066):**
```jsx
<div className="review-order-price-card">
  {/* Item Total */}
  <div className="price-row">
    <span className="price-label">Item Total</span>
    <span className="price-value">₹{itemTotal.toFixed(2)}</span>
  </div>
```
Two new display rows insert **immediately before** the "Item Total" row.

**Variables already in scope (confirmed):**
- `subtotal` = `getTotalPrice()` — new cart items only (line 619)
- `previousSubtotal` = `getPreviousOrderTotal()` or `0` (line 680)
- `isEditMode` — boolean (line 121 CartContext)
- Both are already `0` / falsy in non-edit mode — the guard is safe

### 1b. PreviousOrderItems.jsx (165 lines — LOW risk)

**Current state:**
- Functional component, no `useState`, no `useCallback`
- `React` already imported (line 1)
- `subtotal` already computed at lines 93–99 — no new prop needed
- `items.length` available without new props
- `IoLockClosedOutline` already imported (line 2) — reuse for collapsed header

**What changes:**
- Add `useState` to React import
- Add `const [isExpanded, setIsExpanded] = useState(false)` after line 90
- Render collapsed one-row header when `!isExpanded`
- Render full item list only when `isExpanded`
- Chevron icon: use existing `IoTimeOutline` or inline SVG — no new dependency

### 1c. PreviousOrderItems.css (249 lines — LOW risk)

**Current state:**
- Has `.previous-order-section`, `.previous-order-header`, `.previous-order-items-list`
- Has `.previous-order-subtotal` class (lines 203–225) — currently unused in JSX (subtotal row was not rendered). Can reuse/adapt.
- Animation keyframe `statusPulse` already defined — slideDown animation is additive only

**What changes:**
- Add `.previous-order-collapsed-header` — the single-row tap target
- Add `.previous-order-chevron` with `transform: rotate(180deg)` for open state
- Add `@keyframes slideDown` for expand animation
- Existing classes unchanged

---

## 2. Conflict Check

**ReviewOrder.jsx open INTAKE items that touch this file:**

| ID | Status | Area touched | Conflict? |
|---|---|---|---|
| CR-2026-09-12-012 | INTAKE | Architecture decomposition of ReviewOrder | NONE — different scope (structural split), won't be built before this CR |
| BUG-2026-10-12-004 | INTAKE | loyalty max-redeemable `bill_amount` | NONE — touches loyalty section lines ~2145+; this CR touches lines 1996–2038 and 2063 only |
| CR-2026-11-14-003 | INTAKE | PromoBanner onClick — not in ReviewOrder | NONE |

**All existing code markers in the section being changed:**
- Line 2048: `{/* CR-2026-11-14-002: APS notice */}` — below the Price Breakdown header, untouched
- Lines 2077–2131: coupon rows — untouched
- Lines 2146+: loyalty rows — untouched

**No active conflicts.**

---

## 3. Data Flow Trace

```
CartContext
  ├── subtotal = getTotalPrice()           ← new items only
  ├── previousSubtotal = isEditMode        ← prev items only
  │     ? getPreviousOrderTotal() : 0
  └── previousOrderItems[]                 ← array passed to PreviousOrderItems

ReviewOrder.jsx (display)
  ├── itemTotal = previousSubtotal + subtotal   ← UNCHANGED, same calculation
  ├── New Items section (cartItems)             ← MOVES UP (position change only)
  ├── PreviousOrderItems                        ← MOVES DOWN + gains collapse state
  └── Price Breakdown
        ├── [NEW] New additions = subtotal      ← display only, isEditMode guard
        ├── [NEW] Previous order = previousSubtotal ← display only, isEditMode guard
        └── Item Total = itemTotal              ← UNCHANGED VALUE

PreviousOrderItems.jsx
  ├── subtotal (internal) = reduce(items)       ← UNCHANGED
  ├── [NEW] isExpanded = useState(false)        ← new local state
  └── Render: collapsed header OR full list
```

**Nothing in `itemTotal`, tax, `totalToPay`, API payloads, or `buildPreviousItems` changes.**

---

## 4. Affected Files — WILL Change

| File | Type of change | Lines affected | Risk |
|---|---|---|---|
| `pages/ReviewOrder.jsx` | (A) Move 10-line JSX block. (B) Insert 10 display-only lines in Price Breakdown. | Move: L1996–2005 → after L2038. Insert: after L2063. | MEDIUM — hotspot, tight scope |
| `components/PreviousOrderItems/PreviousOrderItems.jsx` | Add `useState`, collapsed header render, chevron toggle | +~25 lines, L1 (import) + L90 (state) + L101–161 (render restructure) | LOW |
| `components/PreviousOrderItems/PreviousOrderItems.css` | Add 3 new CSS rules + keyframe | +~25 lines, append only | LOW |

**Total lines changed:** ~60 across 3 files.

---

## 5. Files WILL NOT Change

```
CartContext.js                   — subtotal / previousSubtotal logic untouched
AuthContext.jsx                  — untouched
orderService.ts                  — untouched
cartTransformer.ts               — untouched
OrderItemCard.jsx / .css         — untouched
ReviewOrder.jsx lines 737, 741   — itemTotal calculation untouched
ReviewOrder.jsx API payloads     — buildOrderItems, buildPreviousItems untouched
ReviewOrder.jsx footer button    — "Update Order ₹X" value unchanged
backend/server.py                — untouched
Any non-edit-mode ReviewOrder    — all changes inside isEditMode guard
```

---

## 6. Risk Assessment

| Factor | Level | Rationale |
|---|---|---|
| Money / payment path | NONE | itemTotal, tax, totalToPay, all API payloads unchanged |
| Coupon / loyalty | NONE | Both disabled in edit mode; guard confirmed at L2122, 2129, 976, 1049 |
| Non-edit ReviewOrder | NONE | All new code behind `isEditMode && previousSubtotal > 0` |
| ReviewOrder.jsx hotspot | MEDIUM | 2 surgical changes, both display-only, no logic |
| PreviousOrderItems | LOW | Self-contained component, adds UI state |
| Regression surface | LOW | Edit mode only; non-edit flow completely unaffected |

**Overall risk: MEDIUM** (hotspot file, tight surgical scope)

---

## 7. Verification Matrix (for QA)

| # | Test | Expected |
|---|---|---|
| V-1 | Open ReviewOrder in **non-edit mode** | No change to layout or Price Breakdown. "Order Items" section appears as before. |
| V-2 | Open ReviewOrder in **edit mode** | "New Items" section appears first (before Previous Order section) |
| V-3 | Edit mode — Previously Ordered pill | Single collapsed row: 🔒 Previously Ordered · N items · ₹X ▼ |
| V-4 | Tap collapsed pill | Items expand with slide animation; chevron rotates ▲ |
| V-5 | Tap expanded pill | Items collapse; chevron returns ▼ |
| V-6 | Edit mode — Price Breakdown | "New additions ₹Y" row (green label) appears above Item Total |
| V-7 | Edit mode — Price Breakdown | "Previous order ₹Z" row (grey label) appears above Item Total |
| V-8 | Edit mode — Item Total | Value = `previousSubtotal + subtotal` — unchanged from today |
| V-9 | Edit mode — Grand Total | Unchanged value; "Update Order ₹X" button unchanged |
| V-10 | Quantity change in edit mode | New additions row updates live; Previous order row stays fixed |
| V-11 | Cancelled previous item | Excluded from previousSubtotal (existing logic unchanged) |
| V-12 | Edit mode with 0 previous items | No collapsed pill shown; Price Breakdown shows no split rows |
| V-13 | `data-testid` checks | `previous-order-section`, `previous-order-collapsed-header`, `previous-order-expanded-list` present |

---

## 8. Owner Decisions Already Confirmed

| Decision | Confirmed |
|---|---|
| New items first | ✅ 2026-11-25 |
| Previously ordered collapsed by default | ✅ 2026-11-25 |
| New items card: subtle, no green | ✅ 2026-11-25 |
| Split price rows | ✅ 2026-11-25 |
| Backend support verified | ✅ 2026-11-25 |
| Full gate (not Fast Lane) | Required — hotspot |

**No open owner decisions. Ready for Implementation Plan on owner approval.**

---

```
Planning complete: CR-2026-11-25-003
Stage: Impact Analysis
Code reality: FULL (all 3 files read, exact lines verified)
Risk: MEDIUM
Files WILL change: pages/ReviewOrder.jsx · components/PreviousOrderItems/PreviousOrderItems.jsx · components/PreviousOrderItems/PreviousOrderItems.css
Files WILL NOT touch: CartContext.js · AuthContext.jsx · orderService.ts · cartTransformer.ts · any non-edit ReviewOrder flow · all API payloads
Owner decisions: ALL CAPTURED — no open decisions
Conflicts: NONE
Docs: change_requests/CR-2026-11-25-003-review-order-edit-layout/IMPACT_ANALYSIS.md
Next: Owner approval → Implementation Plan → Implementation
```
