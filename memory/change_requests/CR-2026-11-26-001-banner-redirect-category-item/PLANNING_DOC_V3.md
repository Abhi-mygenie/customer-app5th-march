# Planning Doc V3 — CR-2026-11-26-001
## Standard-Menu Restaurant Gap (follow-up to V2)

**Status:** PLANNING COMPLETE — awaiting owner approval to implement
**Date:** 2026-11-27
**Risk:** LOW-MEDIUM (navigation / display — no payment, auth, or data change)
**Scope:** 2 files, ~18 lines

---

## 1. What this plan fixes

V2 (commit `9e38a0b`) built the picker and deep-link around a **station-switching model**
that was validated on a restaurant assumed to have stations "Po" and "Raom".

Investigation confirmed those are **categories**, not stations. Restaurant 69 has four
menus from `menu-master` (Normal, Party, Premium, Aggregator), all of which are in the
`STANDARD_MENUS` blocklist inside `useStations`. That filter was correct for the tab UI
(we don't want Normal/Party/etc. showing as navigation tabs), but it has the side-effect
of making `useAllStationsMenuSections` return an empty list — so the admin picker shows
no categories and no items.

```
POS /web/menu-master    → Normal (218), Party (217), Premium (216), Aggregator (4235)
useStations filter      → removes all 4 → stations = []
useAllStationsMenuSections → useQueries([]) → allSections = []
Picker                  → only Static Pages visible
```

The correct data lives at `POST /web/restaurant-product { restaurant_id:"69", category_id:"0" }`
with **no `food_for`** — which returns `po (11187, 19 items)` and `raom (11200, 2 items)`.
This is called the **default query** (stationId = undefined/null).

---

## 2. Code reality check

| Concern | Reality |
|---------|---------|
| Does `useMenuSections(null, rid)` already work? | YES — `buildMenuSectionsQueryOptions(rid, undefined)` is a valid cache slot and `fetchMenuSections` omits `food_for` when stationId is falsy (line 75 of restaurantService.js) |
| Does `MenuItems.jsx` deep-link already handle `?section=` without a station path? | YES — when `stationId` is undefined, `effectiveStationId = foodFor`, `useMenuSections(foodFor, rid)` loads po+raom, the effect finds the category and calls `setSelectedCategory(sectionName)` |
| Does the probe guard (`stationsData.length <= 1`) block anything? | NO — for null-station categories the first-pass search succeeds without needing the probe |
| Is there a risk of null being stringified as `"null"` in a URL? | YES — current line 41: `encodeURIComponent(s.stationId)` where `stationId === null` → produces the string `"null"` in the path, which breaks `useMenuSections("null", rid)`. Fix is to skip the station path segment when stationId is null |
| Does this break multi-station restaurants? | NO — deduplication by categoryId ensures named-station sections take priority; default sections only fill in categories not already covered by a named station |

---

## 3. Impact map

### Files that WILL change — 2 only

| File | Lines (approx) | What changes |
|------|---------------|-------------|
| `frontend/src/hooks/useMenuData.js` | ~8 lines | Add `useQuery(buildMenuSectionsQueryOptions(rid, undefined))` as a default query inside `useAllStationsMenuSections`. Include its data (tagged `stationId: null, stationName: ''`) after deduplication against named-station sections. Update loading flag. |
| `frontend/src/pages/admin/AdminBannersPage.jsx` | ~6 lines | In `categoryOptions` and `itemOptions` URL builders, emit `/${rid}/menu?section=…` / `/${rid}/menu?item=…` when `s.stationId === null`; keep `/${rid}/menu/${enc(stationId)}?…` for named stations. |

### Files that WILL NOT change

| File | Reason |
|------|--------|
| `frontend/src/pages/MenuItems.jsx` | Deep-link effect already handles `/${rid}/menu?section=<id>` and `/${rid}/menu?item=<id>` correctly when `stationId` is undefined — no change needed |
| `frontend/src/pages/MenuItems.css` | No visual change |
| `backend/server.py` | No backend change |
| `frontend/src/components/PromoBanner/PromoBanner.jsx` | Passes `bannerLink` to `navigate()` as-is — correct |
| All context files, cart, auth, `ReviewOrder.jsx` | Untouched |

---

## 4. Exact edits

### E-1 — `useMenuData.js`: add default query in `useAllStationsMenuSections`

**Location:** lines 304–322 — replace the entire function body.

**Before (current):**
```javascript
export const useAllStationsMenuSections = (restaurantId) => {
  const { stations, loading: stationsLoading } = useStations(restaurantId);

  const queries = useQueries({
    queries: (stations || []).map(station =>
      buildMenuSectionsQueryOptions(restaurantId, station.id)
    ),
  });

  const queriesLoading = queries.some(q => q.isLoading || q.isPending);
  const loading = stationsLoading || (stations && stations.length > 0 && queriesLoading);

  const allSections = (stations || []).flatMap((station, idx) => {
    const data = queries[idx]?.data || [];
    return data.map(s => ({ ...s, stationId: station.id, stationName: station.name }));
  });

  return { allSections, stations: stations || [], loading };
};
```

**After:**
```javascript
export const useAllStationsMenuSections = (restaurantId) => {
  const { stations, loading: stationsLoading } = useStations(restaurantId);

  // CR-2026-11-26-001 V3: always query the default (null food_for) menu so that
  // restaurants with only standard menus (Normal/Party/Premium/Aggregator) still
  // expose their categories and items in the admin picker.
  const defaultQuery = useQuery(buildMenuSectionsQueryOptions(restaurantId, undefined));

  const queries = useQueries({
    queries: (stations || []).map(station =>
      buildMenuSectionsQueryOptions(restaurantId, station.id)
    ),
  });

  const queriesLoading = queries.some(q => q.isLoading || q.isPending);
  const loading = stationsLoading || defaultQuery.isLoading ||
    (stations && stations.length > 0 && queriesLoading);

  // Named-station sections (tagged with their station)
  const stationSections = (stations || []).flatMap((station, idx) => {
    const data = queries[idx]?.data || [];
    return data.map(s => ({ ...s, stationId: station.id, stationName: station.name }));
  });

  // Default sections (stationId: null) — only include categories not already
  // covered by a named station (prevents duplicates on multi-station restaurants).
  const stationCategoryIds = new Set(stationSections.map(s => s.categoryId));
  const defaultSections = (defaultQuery.data || [])
    .filter(s => !stationCategoryIds.has(s.categoryId))
    .map(s => ({ ...s, stationId: null, stationName: '' }));

  const allSections = [...defaultSections, ...stationSections];

  return { allSections, stations: stations || [], loading };
};
```

**Lines added:** ~12 net. **No other hook changed.**

---

### E-2 — `AdminBannersPage.jsx`: fix URL builder for null stationId

**Location:** lines 40–55 — replace `categoryOptions` and `itemOptions` builders.

**Before (current):**
```javascript
const categoryOptions = (pickerSections || []).map(s => ({
  value: `/${rid}/menu/${encodeURIComponent(s.stationId)}?section=${s.categoryId}`,
  label: categoryLabelCounts[s.sectionName] > 1
    ? `${s.stationName} — ${s.sectionName}`
    : s.sectionName,
  group: 'Categories',
}));
const itemOptions = (pickerSections || []).flatMap(s =>
  (s.items || []).map(i => ({
    value: `/${rid}/menu/${encodeURIComponent(s.stationId)}?item=${i.id}`,
    label: itemLabelCounts[i.name] > 1
      ? `${s.stationName} — ${i.name}`
      : i.name,
    group: 'Items',
  }))
);
```

**After:**
```javascript
// CR-2026-11-26-001 V3: when stationId is null (default menu, no food_for),
// omit the station path segment so the URL is /{rid}/menu?section=... rather
// than /{rid}/menu/null?section=... (which would pass food_for="null" to POS).
const categoryOptions = (pickerSections || []).map(s => ({
  value: s.stationId
    ? `/${rid}/menu/${encodeURIComponent(s.stationId)}?section=${s.categoryId}`
    : `/${rid}/menu?section=${s.categoryId}`,
  label: categoryLabelCounts[s.sectionName] > 1
    ? `${s.stationName} — ${s.sectionName}`
    : s.sectionName,
  group: 'Categories',
}));
const itemOptions = (pickerSections || []).flatMap(s =>
  (s.items || []).map(i => ({
    value: s.stationId
      ? `/${rid}/menu/${encodeURIComponent(s.stationId)}?item=${i.id}`
      : `/${rid}/menu?item=${i.id}`,
    label: itemLabelCounts[i.name] > 1
      ? `${s.stationName} — ${i.name}`
      : i.name,
    group: 'Items',
  }))
);
```

**Lines changed:** 6 net (2 value fields). **No other picker logic changed.**

---

## 5. Verification matrix

| # | Setup | Action | Expected |
|---|-------|--------|---------|
| V1 | Log in as kds@thegoankitchen.com | Open admin banner picker | "Categories" group shows "po" and "raom"; "Items" group shows items |
| V2 | Picker open | Select "raom" category | `bannerLink = /69/menu?section=11200` (no station path) |
| V3 | Picker open | Select any item in "po" | `bannerLink = /69/menu?item=<id>` (no station path) |
| V4 | Save raom banner, navigate to `/69` | Tap the banner | Navigates to `/69/menu?section=11200`; raom tab selected |
| V5 | Re-open the saved banner in admin | — | Trigger label shows "raom", not "Custom: ..." |
| V6 | Picker loading | Open picker before data arrives | Shows loading or Static Pages only (no crash) |
| V7 | Multi-station restaurant (hypothetical) | Open picker | Named-station categories shown; no duplicates from default query |
| V8 | Static Pages | Select "Full Menu" | Still works — `/${rid}/menu` stored and resolved correctly |

---

## 5. Owner decisions

No new owner decisions required. The fix is consistent with the owner's answers from V2 planning (Q2 = auto-switch already handled; Q3 = re-fire on URL change already works). The null-station URL format `/${rid}/menu?section=…` was already the pre-V2 format and MenuItems.jsx handles it correctly.

---

## 6. Risk register

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Default query returns different data than named-station query | LOW — POS returns same categories for `food_for=null` and `food_for=Normal` on restaurant 69 | Deduplication by categoryId prevents any double-listing |
| Default query fails (network / permission) | LOW | `defaultQuery.data || []` defaults to empty → picker still shows Static Pages |
| Multi-station restaurant gets duplicate categories | LOW | `stationCategoryIds` Set filters them out |
| `encodeURIComponent(null)` bug re-introduced | NONE — the ternary check `s.stationId ? … : …` prevents it | — |

---

## 7. Files changed summary

```
Files WILL change:
  frontend/src/hooks/useMenuData.js          (+12 lines, useAllStationsMenuSections)
  frontend/src/pages/admin/AdminBannersPage.jsx   (+6 lines, URL builder)

Files WILL NOT change:
  frontend/src/pages/MenuItems.jsx
  frontend/src/pages/MenuItems.css
  backend/server.py
  frontend/src/components/PromoBanner/PromoBanner.jsx
  All context, cart, auth files
```

---

```
Planning complete: CR-2026-11-26-001 V3
Stage: Implementation Plan
Code reality: PLAN_GAP confirmed from V2 (wrong station/category model)
Risk: LOW-MEDIUM
Files WILL change: useMenuData.js, AdminBannersPage.jsx
Files WILL NOT touch: MenuItems.jsx, MenuItems.css, server.py, PromoBanner.jsx
Owner decisions: none required
Docs: memory/change_requests/CR-2026-11-26-001.../PLANNING_DOC_V3.md
Next: Owner approval → Implementation (Role 3)
```

---

**OWNER APPROVAL REQUIRED**
**Reason:** Planning for CR-2026-11-26-001 V3 is complete. Ready to implement 2 targeted edits.
**Risk:** LOW-MEDIUM (picker display + URL format — no payment, auth, or backend change)
**Proposed next step:** Implementation (Role 3) — apply E-1 and E-2, self-test V1–V8, write QA handover.
**I will not proceed until owner approves.**
