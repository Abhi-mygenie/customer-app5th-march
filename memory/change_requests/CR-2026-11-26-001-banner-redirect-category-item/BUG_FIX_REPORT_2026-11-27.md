# Bug Fix Report — CR-2026-11-26-001 (Standard-Menu Gap + Mount-Race)

**Date:** 2026-11-27
**Agent role:** Role 5 (Bug Fix)
**Status:** FIXED — all 7 tests PASS

---

## Bug 1 — Admin Picker Shows No Categories / Items

### Symptom
Admin banner picker dropdown showed only Static Pages (No link / Full Menu / Dining Stations / About Us / Contact). Categories "po" and "raom" and all items were invisible.

### Root cause
`useAllStationsMenuSections` in `useMenuData.js` relied entirely on `useStations`, which filters out all standard menu types (`Normal`, `Party`, `Premium`, `Aggregator`). Restaurant 69 (The Goan Kitchen) has ONLY standard menus → `stations = []` → `useQueries([])` → `allSections = []` → empty picker.

Confirmed: `POST /web/restaurant-product { restaurant_id:"69", category_id:"0" }` (no `food_for`) returns `po (11187, 19 items)` and `raom (11200, 2 items)`. Po and Raom are **categories**, not stations. The previous session handover incorrectly called them stations.

### Fix applied
**File:** `frontend/src/hooks/useMenuData.js` (useAllStationsMenuSections, lines 304-339)

Added `const defaultQuery = useQuery(buildMenuSectionsQueryOptions(restaurantId, undefined))`. Results tagged `stationId: null, stationName: ''`. Deduplicated against named-station sections by categoryId so multi-station restaurants don't get duplicates.

### Fix applied
**File:** `frontend/src/pages/admin/AdminBannersPage.jsx` (URL builder, lines 40-62)

For `s.stationId === null`: emits `/${rid}/menu?section=…` / `/${rid}/menu?item=…` (no station path segment). Previously would have emitted `/${rid}/menu/null?section=…` which passes `food_for="null"` to POS → 0 categories → broken menu page.

---

## Bug 2 — Category Banner Deep-Link Fails from Landing Page

### Symptom
Tapping a category banner (e.g. `/69/menu?section=11200`) from the **landing page** (`/69`) navigated correctly but showed "All" tab instead of "Raom". The same tap from the **menu page** worked correctly.

### Root cause (confirmed with live Playwright reproduction)

**Three-step failure chain:**

1. **LandingPage prefetch**: `LandingPage.jsx` lines 221-237 fires `queryClient.prefetchQuery(buildMenuSectionsQueryOptions(rid, undefined))` via `requestIdleCallback` after the user lands. This populates the React Query cache with `['menuSections', '69', null]` (undefined and null both JSON-serialize to null → same cache slot).

2. **Cache hit on mount**: When user taps banner → React Router client-side navigate → `MenuItems` mounts. `useMenuSections(null, '69')` hits the warm cache → `menuSections = [{po, raom}]` immediately on the **first render** (not empty).

3. **Effect race (the bug)**: Both effects fire after the first render, in declaration order:
   - `useEffect(deep-link, L177)` → `setSelectedCategory("raom")` ✓
   - `useEffect(reset, L387)` → `setSelectedCategory(null)` ✗ ← runs AFTER, wins in React 18 batch
   
   React 18 automatic batching groups all `setState` from effects of the same render cycle. Last write wins → `null` → "All" tab.

4. **Why items appear to work**: Item path also sets `setSelectedCategory` (also clobbered), BUT additionally fires `scrollIntoView` + `setHighlightedItemId` at 350ms via `setTimeout` — these run after the batch resolves, item is visible in "All" mode → user perceives as working. Category has no equivalent time-delayed visual → appears broken.

5. **Why it works from menu page**: Component already mounted, `stationId` unchanged → L387 does **not** re-fire. Only deep-link fires → "raom" selected ✓.

6. **Why `page.goto()` doesn't reproduce**: Full page reload → no LandingPage → no prefetch → `menuSections = []` on first render → deep-link returns early at L179 → L387 fires but no-op → data loads in second cycle → deep-link fires alone → works.

### Fix applied
**File:** `frontend/src/pages/MenuItems.jsx` (lines 71-75 ref + lines 391-399 effect)

```javascript
// Added near other useRef declarations (line 71-75):
const prevStationIdRef = useRef(stationId);

// Replaced the reset effect (lines 391-399):
useEffect(() => {
  if (prevStationIdRef.current === stationId) return; // skip initial mount
  prevStationIdRef.current = stationId;
  setSelectedCategory(null);
}, [stationId]);
```

`prevStationIdRef` is initialized to `stationId` at mount → first check always passes → early return on mount → no reset. When user genuinely switches stations (`/menu/Po` → `/menu/Raom`), `stationId` changes, `prevStationIdRef.current !== stationId` → reset fires correctly.

---

## Self-test results (testing_agent iteration_41.json)

| # | Test | Result |
|---|------|--------|
| 1 | Category banner from landing (warm cache, pushState) | **PASS** — Raom tab selected |
| 2 | Category banner from menu page | **PASS** — Raom tab selected |
| 3 | Station switch still resets category | **PASS** — category cleared on switch |
| 4 | Static Pages still work in picker | **PASS** — 5 entries present |
| 5 | Admin picker shows po and raom | **PASS** — Categories group visible |
| 6 | Category URL format correct | **PASS** — `/69/menu?section=11200` (no /null) |
| 7 | Menu loads with All tab default | **PASS** — All tab default correct |

**Frontend: 7/7 PASS. Backend: N/A. No regressions.**

---

## Files changed in this session

| File | Change |
|------|--------|
| `frontend/src/hooks/useMenuData.js` | V3: Add default null query in `useAllStationsMenuSections` |
| `frontend/src/pages/admin/AdminBannersPage.jsx` | V3: Fix URL builder for null stationId |
| `frontend/src/pages/MenuItems.jsx` | BUG-FIX: `prevStationIdRef` guard on station reset effect |

No backend changes. No auth changes. No cart/payment changes.
