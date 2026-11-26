# INTAKE DOC — BUG-2026-11-25-001

**ID:** BUG-2026-11-25-001
**Type:** BUG
**Title:** Search mode item card wastes vertical space — category tag on standalone row + excess padding
**Registered:** 2026-11-25
**Status:** INTAKE
**Priority:** P1
**Risk:** LOW
**Source:** INV-2026-11-25-001 + owner screenshot review

---

## 1. Owner Report (verbatim)

> "this category also showing is taking space we can show in same line as price maybe is this considered"
> "category before price"

**Screenshots:** Owner provided zoomed screenshots showing the category tag ("Beer") occupying a full standalone row above the veg indicator on each search result card.

---

## 2. Classification

**Type:** BUG — UI layout wastes vertical space in search mode
**Severity:** P1 — With keyboard open, only 2 items are visible instead of 5. Card layout is the primary contributor.

---

## 3. Current Behaviour (from code + screenshots)

In `MenuItem.jsx` (headerBlock, lines 77–97), when in search mode (`categoryName` prop is set), the category tag renders as its **own standalone row** above the veg indicator:

```
[ BEER tag — full width grey pill, ~18px ]   ← own row, ~20px total with margin
[ veg dot ]  Item Name
₹180
```

Additionally, card padding is **12px top + 12px bottom = 24px** for no-image cards (`.menu-item--no-image`, MenuItem.css line 397).

**Combined impact per card:** ~20px (tag row) + 24px (padding) = **44px overhead per card** beyond the minimum needed.

---

## 4. Required Behaviour (owner decisions locked)

**Category tag:** Move inline on the same line as the price, **before** the price:

```
[ veg dot ]  Item Name
[ BEER ]  ₹180             ← category chip BEFORE price, same line
```

**Card padding in search mode:** Reduce from 12px → 7px each side (saves 10px per card).

**Result layout per card:**
```
[veg] Item Name
BEER  ₹180
              [ADD]
```

**Normal browse mode (no search):** 100% unchanged — full 12px padding, no category tag shown.

---

## 5. Root Cause (confirmed by INV-2026-11-25-001)

`MenuItem.jsx` headerBlock renders `categoryName` as a block-level `<span>` BEFORE the veg label — taking its own full row. Fix: wrap price + category tag in a `div.item-price-row` with `display: flex` and render category tag BEFORE the price element within it.

**Classification:** `CODE_ERROR` — missing flex row wrapper; tag placed at block level instead of inline.

---

## 6. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| BUG-2026-11-14-002 | Search ranking (flat list) | RELATED (same file, different scope) — no conflict |
| INV-2026-11-25-001 | Search density investigation | SOURCE |

**Verdict: DISTINCT**

---

## 7. Files That WILL Change

| File | Change |
|---|---|
| `frontend/src/components/MenuItem/MenuItem.jsx` | Wrap price + categoryName in flex row; category before price |
| `frontend/src/components/MenuItem/MenuItem.css` | Add `.item-price-row` + `.menu-item--search-compact` padding reduction |

**Files that WILL NOT change:** `MenuItems.jsx` · `CartContext.js` · `ReviewOrder.jsx` · `server.py`

---

## 8. Risk Assessment

| Factor | Assessment |
|---|---|
| Money path | NO |
| Auth | NO |
| Data change | NO |
| Hotspot file | NO — MenuItem.jsx is not a listed hotspot |
| Regression risk | LOW — change only active when `categoryName` prop is set (search mode); normal browse path unchanged |

**Risk: LOW**
**Fast Lane eligible:** YES (single file, ~10 lines changed, LOW risk, search-mode only)

---

## 9. Blast Radius

**Files that WILL change:** `MenuItem.jsx` (headerBlock) · `MenuItem.css` (new utility class)
**Blast radius: SMALL**

---

## 10. Acceptance Criteria

1. In search mode: category tag appears BEFORE price on the same line (`BEER  ₹180`)
2. Card top/bottom padding reduced to 7px in search mode
3. Normal browse (no search): card padding stays 12px, no category tag shown
4. Veg indicator, item name, ADD button — all unchanged
5. No JS errors, clean compile

---

**Intake complete: BUG-2026-11-25-001**
Classification: BUG
Severity: P1 | Risk: LOW
Duplicate check: DISTINCT
Blast radius: SMALL
Fast Lane: ELIGIBLE (owner approval needed)
Next: Implementation (Fast Lane)
