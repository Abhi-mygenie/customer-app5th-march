# PLANNING DOC — CR-2026-11-26-001

**ID:** CR-2026-11-26-001
**Date:** 2026-11-27
**Role:** Planning (Role 2)
**Source:** INTAKE_DOC.md + owner decisions 2026-11-27
**Stage:** Impact Analysis + Implementation Plan

---

## 1. Owner Decisions Recorded

| Q | Decision |
|---|---|
| Q1 — Category UX | **A** — scroll to that category in the full menu |
| Q2 — Item UX | **A** — scroll to the item in the full menu |
| Q3 — Admin picker UX | **B + searchable** — one grouped dropdown (Static Pages / Categories / Items) with type-to-filter search built in |
| Q4 — URL param | **A** — `?section={categoryId}` and `?item={itemId}` URL param support in MenuItems.jsx |
| Q5 — POS data source | **A** — reuse `restaurant-product/{rid}` via existing `useMenuSections` hook (already cached by React Query) |

---

## 2. Code Reality Verified

### AdminBannersPage.jsx (319 lines)

- `LINK_OPTIONS` — 5-item static array computed on render, using `rid = user?.restaurant_id || user?.id`
- Current picker: native `<select className="admin-form-select">` (lines 235–258)
- `bannerLink` stored as free string in DB — already supports any path value ✅
- Path preview hint already present at line 254 (`→ {bannerLink}`)
- Legacy "Custom: {url}" fallback for existing banners at line 251 — must be preserved
- **No POS data fetch today** — needs `useMenuSections` added

### MenuItems.jsx (1142 lines — HOTSPOT)

- `selectedCategory` state (line 48): `null` = all items; string = category name
- `handleCategoryClick(categoryName)` (line 317): sets `selectedCategory`, 100ms timeout → `window.scrollTo` via `categoryHeaderRef`
- `useMenuSections(effectiveStationId, numericRestaurantId)` (line 72): fetches and caches POS menu. Returns sections with shape `{ categoryId: String, sectionName: String, items: [{id, name, ...}] }`
- **No `useSearchParams`** — not imported, not used
- **No `?section=` / `?item=` handling** — confirmed absent
- Two `<MenuItem>` render paths: search path (line ~933), normal path (line ~1062) — neither has `data-item-id`

### shadcn components available

`command.jsx` (`cmdk` library) + `popover.jsx` — both present in `/app/frontend/src/components/ui/`. This is the standard shadcn Combobox pattern. Provides grouped sections + built-in type-to-filter. ✅

---

## 3. Impact Analysis

| File | Scope | Risk |
|---|---|---|
| `AdminBannersPage.jsx` | Replace static `<select>` with Popover+Command picker; add `useMenuSections` call | MEDIUM — new async data fetch; loading/error states needed |
| `MenuItems.jsx` | Add `useSearchParams`; add one-shot `useEffect` for URL param → scroll; add `data-item-id` on item wrappers | MEDIUM — hotspot file; effect must be one-shot and not interfere with normal navigation |

**Files WILL NOT change:**
- `PromoBanner.jsx` — already navigates to `promo.link` via React Router ✅
- `server.py` — `bannerLink` field already free string in DB ✅
- `CartContext.js`, `ReviewOrder.jsx`, `AuthContext.jsx` — untouched ✅
- `useMenuData.js` — no change to hook ✅
- Any CSS beyond minor admin form additions

**Interaction check:**
- `useMenuSections` in AdminBannersPage uses same React Query key `['menuSections', rid, null]`. If the customer-facing menu is already loaded with the same `rid`, it reuses the cache. ✅
- `?section=` / `?item=` effect runs only on first load (guarded by ref). No interference with `handleCategoryClick` triggered by user taps. ✅
- Existing "Full Menu / Stations / About / Contact" banner links continue working unchanged. ✅
- Legacy banners with custom free-text URLs are preserved as read-only "Custom:" display. ✅

---

## 4. Implementation Plan — 7 Edits, 2 Files

### FILE 1: `frontend/src/pages/admin/AdminBannersPage.jsx`

---

#### Edit E-1a — Add imports

**Add after line 4 (existing imports):**
```jsx
import { useState as _u } from 'react'; // already imported — no change needed
// Add:
import { useMenuSections } from '../../hooks/useMenuData';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../../components/ui/command';
```

---

#### Edit E-1b — Add state + data fetch

**Add after line 11 (after `const rid = ...`):**
```jsx
// CR-2026-11-26-001: fetch live categories + items for grouped picker
const numericRid = rid ? parseInt(rid, 10) : null;
const { menuSections: pickerSections, loading: pickerLoading } = useMenuSections(null, numericRid);
const [pickerOpen, setPickerOpen] = useState(false);

// Build grouped options: static + categories + items
const categoryOptions = (pickerSections || []).map(s => ({
  value: `/${rid}/menu?section=${s.categoryId}`,
  label: s.sectionName,
  group: 'Categories',
}));
const itemOptions = (pickerSections || []).flatMap(s =>
  (s.items || []).map(i => ({
    value: `/${rid}/menu?item=${i.id}`,
    label: i.name,
    group: 'Items',
  }))
);
const ALL_LINK_OPTIONS = [
  ...LINK_OPTIONS.map(o => ({ ...o, group: 'Static Pages' })),
  ...categoryOptions,
  ...itemOptions,
];

// Label shown on the trigger button
const selectedLabel = ALL_LINK_OPTIONS.find(o => o.value === newBanner.bannerLink)?.label
  || (newBanner.bannerLink ? `Custom: ${newBanner.bannerLink}` : 'No link');
```

---

#### Edit E-1c — Replace `<select>` with Popover+Command picker

**Replace lines 232–258 (the entire `{/* CR-2026-11-14-003: destination picker */}` block):**
```jsx
{/* CR-2026-11-26-001: grouped searchable destination picker */}
<div className="admin-form-group">
  <label className="admin-form-label">Tap Destination (optional)</label>
  <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="admin-form-select"
        style={{ textAlign: 'left', cursor: 'pointer' }}
        data-testid="select-bannerLink"
      >
        {selectedLabel}
      </button>
    </PopoverTrigger>
    <PopoverContent className="p-0 w-72" align="start">
      <Command>
        <CommandInput placeholder={pickerLoading ? 'Loading…' : 'Search pages, categories, items…'} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {['Static Pages', 'Categories', 'Items'].map(group => {
            const opts = ALL_LINK_OPTIONS.filter(o => o.group === group);
            if (opts.length === 0) return null;
            return (
              <CommandGroup key={group} heading={group}>
                {opts.map(o => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => {
                      setNewBanner(prev => ({ ...prev, bannerLink: o.value }));
                      setPickerOpen(false);
                    }}
                    data-testid={`picker-option-${o.value}`}
                  >
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
  {newBanner.bannerLink && (
    <span className="admin-form-hint" data-testid="banner-link-preview">
      → {newBanner.bannerLink}
    </span>
  )}
</div>
```

**Note:** Legacy "Custom: {url}" banners will display their URL in the trigger button via `selectedLabel` fallback and are NOT selectable from the picker — value is preserved in state untouched.

---

### FILE 2: `frontend/src/pages/MenuItems.jsx`

---

#### Edit E-2a — Add `useSearchParams` to import

**Line 2 — change:**
```jsx
// Before:
import { useParams, useNavigate } from 'react-router-dom';
// After:
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
```

---

#### Edit E-2b — Read URL params + one-shot scroll effect

**Add after line 55 (`const categoryHeaderRef = useRef(null);`):**
```jsx
// CR-2026-11-26-001: deep-link URL params from banner tap
const [searchParams] = useSearchParams();
const targetSection = searchParams.get('section'); // categoryId string
const targetItem    = searchParams.get('item');    // item id string
const deepLinkApplied = useRef(false);             // one-shot guard — do not re-fire on re-renders
```

**Add a new `useEffect` after the existing station/config effects (around line 155 area):**
```jsx
// CR-2026-11-26-001: apply ?section= or ?item= URL param once after menu data loads
useEffect(() => {
  if (deepLinkApplied.current) return;
  if (!menuSections || menuSections.length === 0) return;
  if (!targetSection && !targetItem) return;

  deepLinkApplied.current = true;

  if (targetSection) {
    // Find section by categoryId — call existing handleCategoryClick (triggers filter + scroll)
    const section = menuSections.find(s => String(s.categoryId) === String(targetSection));
    if (section) handleCategoryClick(section.sectionName);
  } else if (targetItem) {
    // Find item across all sections → filter to its section → scroll to item
    for (const section of menuSections) {
      const found = (section.items || []).find(i => String(i.id) === String(targetItem));
      if (found) {
        handleCategoryClick(section.sectionName);
        setTimeout(() => {
          document.querySelector(`[data-item-id="${targetItem}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // wait for category filter + render
        break;
      }
    }
  }
}, [menuSections, targetSection, targetItem]); // handleCategoryClick intentionally omitted — stable enough for one-shot
```

---

#### Edit E-2c — Add `data-item-id` wrapper in **search render path** (line ~932)

**Wrap the `<MenuItem>` at line ~933 (search/flat list path):**
```jsx
// Before:
return (
  <MenuItem
    key={item.id}
    item={item}
    categoryName={item._sectionName}
    ...
  />
);

// After:
return (
  <div key={item.id} data-item-id={item.id}>
    <MenuItem
      item={item}
      categoryName={item._sectionName}
      ...
    />
  </div>
);
```
*(Remove `key` from `<MenuItem>` and place on the wrapper `<div>`)*

---

#### Edit E-2d — Add `data-item-id` wrapper in **normal render path** (line ~1062)

**Wrap the `<MenuItem>` at line ~1062 (normal sectioned path):**
```jsx
// Before:
return (
  <MenuItem
    key={item.id}
    item={item}
    isExpanded={...}
    ...
  />
);

// After:
return (
  <div key={item.id} data-item-id={item.id}>
    <MenuItem
      item={item}
      isExpanded={...}
      ...
    />
  </div>
);
```

---

## 5. Verification Matrix

| ID | Steps | Expected |
|---|---|---|
| V-01 | Admin → Add Banner → open picker → see groups: Static Pages / Categories / Items | Three groups visible |
| V-02 | Admin → type "bev" → picker filters to items/categories matching "bev" | Only matching options shown |
| V-03 | Admin → pick a category (e.g. "Po") → save banner | `bannerLink = /{rid}/menu?section={poId}` stored in DB |
| V-04 | Admin → pick an item (e.g. "melo fish") → save banner | `bannerLink = /{rid}/menu?item={melo_id}` stored in DB |
| V-05 | Admin → pick "Full Menu" → save | `bannerLink = /{rid}/menu` unchanged |
| V-06 | Admin → existing banner with custom free-text URL | Trigger shows "Custom: {url}", value preserved |
| V-07 | Customer → tap banner linked to `?section={catId}` → menu opens | Menu scrolls to and filters to that category |
| V-08 | Customer → tap banner linked to `?item={itemId}` → menu opens | Menu filters to item's section, scrolls to that item |
| V-09 | Customer → tap banner linked to Full Menu | Menu opens normally, no category filter |
| V-10 | Navigate to `/{rid}/menu?section=UNKNOWN` | Menu opens at "All Items", no crash |
| V-11 | Navigate to `/{rid}/menu?item=UNKNOWN` | Menu opens at "All Items", no crash |
| V-12 | Normal menu browse (no URL params) | Existing category click / scroll unaffected |
| V-13 | POS data fetch fails in admin picker | Shows only "Static Pages" group, no crash |

---

## 6. Open Questions — None

All 5 owner decisions answered. No business-rule ambiguity.

**One implementation note for Role 3:** `handleCategoryClick` is not wrapped in `useCallback` — intentionally omitted from `useEffect` deps. This is safe because the effect is one-shot (guarded by `deepLinkApplied.current`). Flag in code with a comment.

---

## 7. Files WILL change / WILL NOT change

**WILL change:**
- `frontend/src/pages/admin/AdminBannersPage.jsx` — E-1a, E-1b, E-1c
- `frontend/src/pages/MenuItems.jsx` — E-2a, E-2b, E-2c, E-2d

**WILL NOT change:**
- `frontend/src/components/PromoBanner/PromoBanner.jsx`
- `frontend/src/hooks/useMenuData.js`
- `backend/server.py`
- `frontend/src/context/CartContext.js`
- `frontend/src/pages/ReviewOrder.jsx`
- `frontend/src/context/AuthContext.jsx`
- Any existing CSS files

---

```
Planning complete: CR-2026-11-26-001
Stage: Impact Analysis + Implementation Plan
Code reality: FULL — all edit locations confirmed, all unknowns resolved
Risk: MEDIUM (MenuItems.jsx hotspot; one-shot URL param effect)
Files WILL change: AdminBannersPage.jsx (E-1a/b/c), MenuItems.jsx (E-2a/b/c/d)
Files WILL NOT touch: PromoBanner.jsx, useMenuData.js, server.py, CartContext.js, ReviewOrder.jsx
Owner decisions: Q1–Q5 all answered 2026-11-27
Docs: PLANNING_DOC.md
Next: Owner approval → Implementation (Role 3)
```
