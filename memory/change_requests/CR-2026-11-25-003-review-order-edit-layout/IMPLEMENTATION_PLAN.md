# IMPLEMENTATION PLAN — CR-2026-11-25-003
# Review Order edit mode — new items first, previously ordered collapsed, price split

**ID:** CR-2026-11-25-003
**Stage:** Implementation Plan
**Author role:** PLANNING
**Date:** 2026-11-25
**Based on:** IMPACT_ANALYSIS.md (code reality FULL, all lines verified)
**Risk:** MEDIUM
**Approvals required before coding:** Owner approval of this plan

---

## Pre-flight checklist (Implementation agent must verify before first edit)

- [ ] Read current `ReviewOrder.jsx` lines 1996–2066 and confirm they match this plan
- [ ] Read current `PreviousOrderItems.jsx` lines 1–165 and confirm they match this plan
- [ ] Run `sudo supervisorctl status` — both backend and frontend RUNNING
- [ ] No other agent is mid-edit on these files
- [ ] `index.yml` entry for CR-2026-11-25-003 exists

---

## Edits — ordered, do not reorder or combine

### E-1 · ReviewOrder.jsx · Remove PreviousOrderItems from its current position

**File:** `frontend/src/pages/ReviewOrder.jsx`

**What:** Delete lines 1996–2005 (the entire PreviousOrderItems conditional block plus its surrounding comment). This is a pure removal — the block will be re-inserted at E-2.

**Remove exactly this block (lines 1996–2005):**
```jsx
          {/* Previous Order Items - Show only in edit mode */}
          {isEditMode && previousOrderItems && previousOrderItems.length > 0 && (
            <>
              <PreviousOrderItems 
                items={previousOrderItems} 
                orderId={editingOrderId}
              />
              <div className="review-order-divider"></div>
            </>
          )}
```

**After removal:** Line 1995 (`{/* Divider after Customer Details */}`) is followed directly by the New Items section comment at what was line 2007.

**Self-test:** File still compiles. `PreviousOrderItems` import at line 19 stays — it is used in E-2.

---

### E-2 · ReviewOrder.jsx · Insert PreviousOrderItems after New Items section

**File:** `frontend/src/pages/ReviewOrder.jsx`

**What:** After E-1, the "Divider after Order Items" `<div>` (was line 2037–2038, now shifted up by ~10 lines) is the insertion point. Insert the PreviousOrderItems block **after** that divider.

**Find this exact string (the divider after the New Items section):**
```jsx
          {/* Divider after Order Items */}
          <div className="review-order-divider"></div>
```

**Insert immediately after it:**
```jsx

          {/* CR-2026-11-25-003: Previously Ordered — collapsed by default in edit mode */}
          {isEditMode && previousOrderItems && previousOrderItems.length > 0 && (
            <>
              <PreviousOrderItems 
                items={previousOrderItems} 
                orderId={editingOrderId}
              />
              <div className="review-order-divider"></div>
            </>
          )}
```

**Self-test after E-1 + E-2:** Scroll through the JSX — New Items section now appears above PreviousOrderItems. Both sections still render correctly in edit mode.

---

### E-3 · ReviewOrder.jsx · Add split price rows in Price Breakdown

**File:** `frontend/src/pages/ReviewOrder.jsx`

**What:** Add two display-only rows immediately before the existing "Item Total" row. Gated by `isEditMode && previousSubtotal > 0`.

**Find this exact string:**
```jsx
            <div className="review-order-price-card">
              {/* Item Total */}
              <div className="price-row">
                <span className="price-label">Item Total</span>
                <span className="price-value">₹{itemTotal.toFixed(2)}</span>
              </div>
```

**Replace with:**
```jsx
            <div className="review-order-price-card">
              {/* CR-2026-11-25-003: Split price rows — edit mode only */}
              {isEditMode && previousSubtotal > 0 && (
                <>
                  <div className="price-row price-row-new-additions" data-testid="row-new-additions">
                    <span className="price-label">New additions</span>
                    <span className="price-value price-value-new">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="price-row price-row-sub" data-testid="row-previous-order">
                    <span className="price-label-sub">Previous order</span>
                    <span className="price-value-sub">₹{previousSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="price-row-separator" />
                </>
              )}
              {/* Item Total */}
              <div className="price-row">
                <span className="price-label">Item Total</span>
                <span className="price-value">₹{itemTotal.toFixed(2)}</span>
              </div>
```

**Variables confirmed in scope:** `isEditMode` (L121 CartContext), `previousSubtotal` (L680), `subtotal` (L619). All already declared before this JSX block.

**Self-test after E-3:** In non-edit mode, the two new rows are invisible. In edit mode, "New additions" and "Previous order" appear above "Item Total". The `itemTotal` value is unchanged.

---

### E-4 · ReviewOrder.jsx · Add CSS classes for new price rows

**File:** Find the ReviewOrder CSS file and add styles for `.price-row-new-additions`, `.price-value-new`, `.price-row-separator`.

**Find the ReviewOrder stylesheet:**
```bash
find /app/frontend/src -name "ReviewOrder.css" -o -name "ReviewOrder.module.css"
```

**Add at the end of that file:**
```css
/* CR-2026-11-25-003: Edit mode price split rows */
.price-row-new-additions .price-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.price-value-new {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-primary, #E8622A);
}

.price-row-separator {
  height: 1px;
  background: var(--border-light, #eee);
  margin: 4px 0 6px;
}
```

---

### E-5 · PreviousOrderItems.jsx · Add collapse/expand state

**File:** `frontend/src/components/PreviousOrderItems/PreviousOrderItems.jsx`

**What:** Add `useState` to React import, add `isExpanded` state defaulting to `false`, restructure the return to show collapsed header or full list.

**E-5a — Update React import (line 1):**

Replace:
```jsx
import React from 'react';
```
With:
```jsx
import React, { useState } from 'react';
```

**E-5b — Add chevron icon import (line 2, after existing io5 imports):**

Replace:
```jsx
import { IoLockClosedOutline, IoTimeOutline, IoCheckmarkOutline, IoCheckmarkDoneOutline } from 'react-icons/io5';
```
With:
```jsx
import { IoLockClosedOutline, IoTimeOutline, IoCheckmarkOutline, IoCheckmarkDoneOutline, IoChevronDownOutline } from 'react-icons/io5';
```

**E-5c — Add state after the early-return guard (after line 90):**

Find:
```jsx
  if (!items || items.length === 0) return null;
```
Insert immediately after:
```jsx

  // CR-2026-11-25-003: collapsed by default
  const [isExpanded, setIsExpanded] = useState(false);
  const itemCount = items.filter(i => (i.status ?? i.foodStatus) !== 3).length;
```

Note: `itemCount` excludes cancelled items (status 3), consistent with how `subtotal` already skips them at line 95.

**E-5d — Replace the JSX return block (lines 101–161):**

Replace the entire return statement with:
```jsx
  return (
    <div className="previous-order-section" data-testid="previous-order-section">

      {/* Collapsed/Expanded header — CR-2026-11-25-003 */}
      <div
        className="previous-order-collapsed-header"
        data-testid="previous-order-collapsed-header"
        onClick={() => setIsExpanded(prev => !prev)}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className="previous-order-title-row">
          <IoLockClosedOutline className="previous-order-lock-icon" />
          <h3 className="previous-order-title">Previously Ordered</h3>
        </div>
        <div className="previous-order-collapsed-meta">
          <span className="previous-order-meta-text">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · ₹{subtotal.toFixed(2)}
          </span>
          <IoChevronDownOutline
            className={`previous-order-chevron ${isExpanded ? 'previous-order-chevron--open' : ''}`}
          />
        </div>
      </div>

      {/* Expandable items list */}
      {isExpanded && (
        <div className="previous-order-items-list previous-order-items-expanded" data-testid="previous-order-expanded-list">
          {items.map((item, index) => {
            const fullPrice = item.fullPrice ?? item.price ?? 0;
            const variationLabels = getVariationLabels(item.variations || []);
            const addonLabels = getAddonLabels(item.addons || []);

            return (
              <div
                key={item.id || index}
                className="previous-order-item"
                data-testid={`previous-order-item-${item.id || index}`}
              >
                <div className="previous-order-item-info">
                  <span className="previous-order-item-name">{item.name || item.item?.name || 'Unknown Item'}</span>
                  {variationLabels && (
                    <span className="previous-order-item-customization" data-testid={`prev-item-variants-${index}`}>
                      Variants: {variationLabels}
                    </span>
                  )}
                  {addonLabels && (
                    <span className="previous-order-item-customization" data-testid={`prev-item-addons-${index}`}>
                      Addons: {addonLabels}
                    </span>
                  )}
                </div>
                <div className="previous-order-item-right">
                  <span className="previous-order-item-quantity">x{item.quantity || 1}</span>
                  <span className="previous-order-item-price">
                    ₹{(fullPrice * (item.quantity || 1)).toFixed(2)}
                  </span>
                  {showFoodStatus && <ItemStatusBadge status={mapFoodOrderStatus(item)} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
```

**Self-test after E-5:** Component renders a one-row collapsed header. Tapping it toggles the full item list. No props changed — all callers (`ReviewOrder.jsx`) pass the same `items` and `orderId`.

---

### E-6 · PreviousOrderItems.css · Add collapse styles

**File:** `frontend/src/components/PreviousOrderItems/PreviousOrderItems.css`

**What:** Append new rules at the end of the file. No existing rules removed or modified.

**Append to end of file:**
```css
/* ── CR-2026-11-25-003: Collapsed header ───────────────── */
.previous-order-collapsed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 2px 0 6px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.previous-order-collapsed-header:active {
  opacity: 0.75;
}

.previous-order-collapsed-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.previous-order-meta-text {
  font-family: var(--font-body, 'Montserrat', sans-serif);
  font-size: 0.72rem;
  color: var(--text-tertiary, #888);
  font-weight: 500;
}

.previous-order-chevron {
  width: 14px;
  height: 14px;
  color: var(--text-tertiary, #888);
  transition: transform 0.25s ease;
}

.previous-order-chevron--open {
  transform: rotate(180deg);
}

/* ── Expanded items slide-down ──────────────────────────── */
.previous-order-items-expanded {
  animation: prevItemsSlideDown 0.22s ease;
  overflow: hidden;
}

@keyframes prevItemsSlideDown {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Code markers to add

Each changed block must carry the CR marker. Already included in E-1 comment and E-3 comment above. For E-5, the `useState` line comment `// CR-2026-11-25-003: collapsed by default` covers it. For E-6, the `/* ── CR-2026-11-25-003 */` block comment covers it.

---

## Exit gate (Implementation agent must confirm all 7 before handing to QA)

```
1. [ ] Registry updated — CR-2026-11-25-003 status → IMPLEMENTED
2. [ ] index.yml YAML valid (python3 -c "import yaml; yaml.safe_load(open('index.yml'))")
3. [ ] File ownership updated in this doc
4. [ ] Code markers CR-2026-11-25-003 present in all 3 changed files
5. [ ] yarn build / frontend compile clean (no new errors)
6. [ ] Self-test: edit mode renders New Items first, collapsed pill visible
7. [ ] QA handover written
```

---

## QA Handover (13-point matrix — from IMPACT_ANALYSIS.md)

**Test environment:** Restaurant 541 or 716. Must be in edit mode (use an existing order).
**Test account:** `preprod-customer-default` (phone: REACT_APP_LOGIN_PHONE)

| # | Step | Expected | Pass/Fail |
|---|---|---|---|
| V-1 | Open ReviewOrder in **non-edit mode** | No section order change. "Order Items" label shown. No split price rows. |  |
| V-2 | Open ReviewOrder in **edit mode** | "New Items" section appears first (above Previously Ordered) |  |
| V-3 | Edit mode — Previously Ordered pill | Single collapsed row: 🔒 Previously Ordered · N items · ₹X · ▼ chevron |  |
| V-4 | Tap collapsed pill | Items expand with slide animation; chevron rotates to ▲ |  |
| V-5 | Tap expanded pill | Items collapse; chevron returns to ▼ |  |
| V-6 | Edit mode — Price Breakdown | "New additions ₹Y" row (orange value) appears above Item Total |  |
| V-7 | Edit mode — Price Breakdown | "Previous order ₹Z" row (grey/muted) appears above Item Total |  |
| V-8 | Edit mode — Item Total value | Equals `previousSubtotal + newSubtotal` — same as before this CR |  |
| V-9 | Edit mode — Grand Total + button | "Update Order ₹X" value unchanged from pre-CR |  |
| V-10 | Change quantity of new item | "New additions" row updates; "Previous order" stays fixed |  |
| V-11 | Previous item with status 3 (cancelled) | Excluded from item count in pill and from subtotal |  |
| V-12 | Edit mode with zero previous items | No collapsed pill shown; no split rows in Price Breakdown |  |
| V-13 | data-testid checks | `previous-order-collapsed-header`, `previous-order-expanded-list`, `row-new-additions`, `row-previous-order` all present in DOM |  |

---

```
Planning complete: CR-2026-11-25-003
Stage: Impact Analysis + Implementation Plan (both)
Code reality: FULL
Risk: MEDIUM
Edits: E-1 through E-6 (3 files, ~60 lines)
Files WILL change: pages/ReviewOrder.jsx · components/PreviousOrderItems/PreviousOrderItems.jsx · components/PreviousOrderItems/PreviousOrderItems.css
Files WILL NOT touch: CartContext.js · AuthContext.jsx · orderService.ts · all API payloads · non-edit ReviewOrder flow
Owner decisions: ALL CAPTURED
Conflicts: NONE
Exit gate: 7-point checklist
QA handover: 13-point verification matrix
Docs: IMPACT_ANALYSIS.md · IMPLEMENTATION_PLAN.md
Next: Owner approval → Implementation (Role 3)
```
