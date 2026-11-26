# IMPACT ANALYSIS — BUG-2026-10-22-001

**ID:** BUG-2026-10-22-001  
**Title:** Veg / Non-Veg / Egg icons do not comply with FSSAI standard  
**Planning stage:** Impact Analysis  
**Date:** 2026-10-22  
**Status:** PLANNING  

---

## 1. Code Reality Check

Item is registered. Code inspection completed across all rendering surfaces.

**Finding: scope is LARGER than intake estimated.**  
Intake declared 3 files. Full trace reveals **6 CSS files** render veg/non-veg/egg icons.

---

## 2. Full Downstream Consumer Map

| Surface | Component | CSS file | Colour source | Shape mechanism |
|---|---|---|---|---|
| Menu item card | `MenuItem.jsx` line 73 | `MenuItem.css` | CSS variables `--color-veg/non-veg/egg` | `.veg-dot` with `border-radius: var(--radius-full)` → circle |
| Admin dietary-tag panel | `DietaryTagsAdmin.jsx` line 382 | `DietaryTagsAdmin.css` | **Hardcoded** `#329937` / `#dc2626` / `#d97706` | `.veg-dot` with `border-radius: 50%` → circle |
| Menu filter panel | `FilterPanel.jsx` line 19/29/39 | `FilterPanel.css` | CSS variables `--color-veg/non-veg/egg` | `.veg-dot` with `border-radius: var(--radius-full)` → circle |
| Order success page | `OrderSuccess.jsx` line 625 | `OrderSuccess.css` | **Hardcoded** `#0f8a0f` / `#b91c1c` (no egg) | `.veg-dot` with `border-radius: 50%` → circle |
| Search & filter bar | `SearchAndFilterBar.jsx` lines 68/76/84 | `SearchAndFilterBar.css` | **Hardcoded** `#329937` / `#dc2626` / `#d97706` | **Different pattern**: small square (2px radius) + `::after` filled circle — NOT the same `.veg-dot` base style |

---

## 3. Scope Expansion Declaration

**Intake said:** 3 files  
**Reality:** 5 CSS files + 1 CSS variable file = 6 files total

This is still LOW risk (CSS-only) but the scope is wider. Owner is informed here.  
No further approval gating required as risk classification does not change (LOW → LOW).

---

## 4. Risk Verification

| Risk area | Assessment |
|---|---|
| Logic / API / DB change | NONE — CSS only |
| Auth / payment / session | NONE |
| Cart / order flow | NONE |
| `ReviewOrder.jsx` (P0 hotspot) | NOT TOUCHED |
| `AuthContext.jsx` (CRITICAL hotspot) | NOT TOUCHED |
| `server.py` | NOT TOUCHED |
| localStorage keys | NOT TOUCHED |
| Provider order in `App.js` | NOT TOUCHED |

Risk confirmed: **LOW**

---

## 5. Conflicts With Active Items

Checked `index.yml` for all items with status INTAKE / PLANNING / IMPLEMENTED / QA touching the same files.  
**Result: No conflicts found.** All active items touch unrelated files.

---

## 6. Owner Decision — RESOLVED

**D1 — SearchAndFilterBar icons**

`SearchAndFilterBar.css` uses a unique rendering pattern: a small rounded-square wrapper (`border-radius: 2px`) with an `::after` pseudo-element filled circle inside. These appear in the **filter toggle buttons** (not food-label badges on items).

**Decision: Option A — Full FSSAI fix (owner approved 2026-10-22)**
Apply FSSAI colours + brown triangle shape to SearchAndFilterBar filter buttons.
`SearchAndFilterBar.css` is confirmed in scope for implementation.

---

## 7. Files WILL Change vs WILL NOT Change

### WILL change (confirmed):

| # | File | What changes |
|---|---|---|
| 1 | `frontend/src/index.css` | 6 CSS variable values (lines 18–20, 76–78) |
| 2 | `frontend/src/components/MenuItem/MenuItem.css` | Add `clip-path` triangle override for `.non-veg` and `.egg` dots (after line 73) |
| 3 | `frontend/src/components/AdminSettings/DietaryTagsAdmin.css` | 6 hardcoded colour values (lines 434, 438, 442, 452, 456, 460) + triangle shape override |
| 4 | `frontend/src/components/FilterPanel/FilterPanel.css` | Add triangle shape override for `.non-veg` and `.egg` dots; colours auto-fix via variable |
| 5 | `frontend/src/pages/OrderSuccess.css` | 4 hardcoded colour values (lines 352, 356, 366, 370) + triangle shape override |

### Subject to D1 owner decision:

| # | File | Pending decision |
|---|---|---|
| 6 | `frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.css` | D1 — full fix / colour only / no change |

### WILL NOT change:

- Any `.jsx` / `.tsx` / `.js` / `.ts` file (zero logic changes)
- `backend/server.py`
- Any `.env` file
- `useMenuData.js` — `isEgg` flag stays; CSS maps egg → non-veg icon
- `App.js` — provider order untouched
- All hotspot files listed in Part C of the agent prompt

---

## 8. Triangle Implementation Strategy

CSS `clip-path` polygon is the cleanest and most maintainable approach — no need to zero out width/height or fight the border-trick interaction with `background-color`.

```css
/* FSSAI non-veg triangle — upward-pointing equilateral */
clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
border-radius: 0;
background-color: <non-veg colour>;
```

Applied as a targeted override on:
- `.veg-label.non-veg .veg-dot`
- `.veg-label.egg .veg-dot`
- (and equivalent selectors in DietaryTagsAdmin, FilterPanel, OrderSuccess)

---

## 9. Verification Matrix

| Test | Method | Pass condition |
|---|---|---|
| V1 — Veg icon colour | Visual / screenshot | Green `#00A651` circle inside green square |
| V2 — Non-veg icon shape | Visual / screenshot | Brown triangle inside brown square |
| V3 — Non-veg icon colour | Visual / screenshot | Brown `#944A28` — NOT red, NOT orange |
| V4 — Egg icon | Visual / screenshot | Identical to non-veg (brown triangle) |
| V5 — Menu item cards | Screenshot `MenuItem` | All 3 types render correctly on menu page |
| V6 — Admin dietary panel | Screenshot `DietaryTagsAdmin` | Icons match FSSAI in admin panel |
| V7 — Filter panel | Screenshot `FilterPanel` | Non-veg/egg filter button shows brown triangle |
| V8 — Order success page | Screenshot `OrderSuccess` | Items show correct icon in order summary |
| V9 — No regression on other UI | Screenshot diff | No unintended colour/shape changes outside icon elements |

---

```
Planning complete: BUG-2026-10-22-001
Stage: Impact Analysis + Implementation Plan
Code reality: FULL (all 6 rendering surfaces located and inspected)
Risk: LOW (confirmed)
Scope expansion: YES — 3 → 6 files (CSS-only, risk unchanged)
Files WILL change: index.css · MenuItem.css · DietaryTagsAdmin.css · FilterPanel.css · OrderSuccess.css
Files subject to D1: SearchAndFilterBar.css
Files WILL NOT touch: all .jsx/.tsx/.js/.ts · server.py · .env · hotspot files
Owner decisions: D1 — SearchAndFilterBar treatment (full fix / colour only / no change)
Docs: change_requests/BUG-2026-10-22-001-fssai-icon-compliance/IMPACT_ANALYSIS.md
Next: Owner approves D1 → Implementation
```
