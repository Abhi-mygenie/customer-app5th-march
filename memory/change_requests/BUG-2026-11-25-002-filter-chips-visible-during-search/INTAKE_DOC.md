# INTAKE DOC — BUG-2026-11-25-002

**ID:** BUG-2026-11-25-002
**Type:** BUG
**Title:** Filter chips (Veg/Non-Veg/Egg) remain visible during active search — wastes ~48px of viewport
**Registered:** 2026-11-25
**Status:** INTAKE
**Priority:** P1
**Risk:** LOW
**Source:** INV-2026-11-25-001 + owner screenshot review

---

## 1. Owner Report (verbatim)

> "spaces can be optimised is this considered" (owner highlighted the filter chips row in screenshot)

**Screenshots:** Owner zoomed in on the search bar + filter chips + category header area, pointing out the space occupied by each row.

---

## 2. Classification

**Type:** BUG — UI layout wastes vertical space in search mode
**Severity:** P1 — Filter chips row takes ~48px of vertical space that could be used for item results when keyboard is open.

---

## 3. Current Behaviour (from code)

`SearchAndFilterBar.jsx` renders the `veg-toggle-group` and `dietary-tags-row` unconditionally — no `searchQuery` guard exists. When the user types a search term, filter chips (Veg / Non-Veg / Egg) remain fully visible below the search input.

**Measured space wasted:** ~48px (40px chips + 8px padding/gap).

This is the exact same pattern that caused BUG-2026-11-14-001 (banner + category nav not hidden). The fix pattern is identical: `&& !searchQuery` on the render condition.

---

## 4. Required Behaviour

When `searchQuery.trim().length > 0`: filter chips row is hidden.
When `searchQuery` is empty: filter chips row shows normally.

**The veg/dietary filters still work during search** — `filterItems()` in MenuItems.jsx already applies veg/dietary filters to the flat-search results (confirmed in BUG-2026-11-14-002 implementation). Hiding the chips UI does NOT disable the filter logic.

---

## 5. Root Cause (confirmed by INV-2026-11-25-001)

`SearchAndFilterBar.jsx` has no `searchQuery` guard on the `veg-toggle-group` div.

**Fix:** Pass a `hideFilters` prop (or check `searchQuery` directly) to `SearchAndFilterBar`, wrap the filter chips in `{!hideFilters && ...}`.

**Classification:** `CODE_ERROR` — missing conditional render, same pattern as BUG-2026-11-14-001.

---

## 6. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| BUG-2026-11-14-001 | Banner + category nav hidden during search | RELATED (same fix pattern) — no conflict |
| INV-2026-11-25-001 | Search density investigation | SOURCE |

**Verdict: DISTINCT**

---

## 7. Files That WILL Change

| File | Change |
|---|---|
| `frontend/src/pages/MenuItems.jsx` | Pass `hideFilters={!!searchQuery.trim()}` to SearchAndFilterBar |
| `frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.jsx` | Accept `hideFilters` prop; wrap `veg-toggle-group` + dietary tags row in `{!hideFilters && ...}` |

**Files that WILL NOT change:** `MenuItem.jsx` · `CartContext.js` · `ReviewOrder.jsx` · `server.py`

---

## 8. Risk Assessment

| Factor | Assessment |
|---|---|
| Money path | NO |
| Auth | NO |
| Data change | NO |
| Hotspot file | NO |
| Filter logic impact | NONE — `filterItems()` in MenuItems.jsx still applies veg/dietary filters; hiding the UI chips does not change the applied filter state |
| Regression risk | LOW — `searchQuery` guard is additive; existing filter chip behavior in non-search mode unchanged |

**Risk: LOW**
**Fast Lane eligible:** YES (2 files, ~4 lines changed, LOW risk)

---

## 9. Blast Radius

**Files that WILL change:** `MenuItems.jsx` (1 prop) · `SearchAndFilterBar.jsx` (1 guard)
**Blast radius: SMALL**

---

## 10. Acceptance Criteria

1. Typing any search term → filter chips row disappears
2. Clearing search → filter chips row reappears
3. Active veg/dietary filter selected before search → filter stays applied in results (chips just hidden, not reset)
4. Normal browse (no search): filter chips fully visible and functional
5. No JS errors

---

**Intake complete: BUG-2026-11-25-002**
Classification: BUG
Severity: P1 | Risk: LOW
Duplicate check: DISTINCT
Blast radius: SMALL
Fast Lane: ELIGIBLE (owner approval needed)
Next: Implementation (Fast Lane)
