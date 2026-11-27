# CR-2026-11-26-001 — Deep-link post-implementation bug investigation

**Role:** Investigation (Role 1) — no code edited
**Date:** 2026-11-29
**Scope:** 3 defects reported against banner tap → menu deep-link

---

## Reported symptoms (owner)

1. Banner → **item** works from landing page, **but** the item is neither at the top of the list nor highlighted when it lands on `/{rid}/menu?item=…`.
2. Banner → **item** from **menu page** (banner tapped while already on `/{rid}/menu`) does nothing.
3. Banner → **category** does not work from **landing page**; it works from the **menu page**.

URL schema in use (from admin picker): `?section=<categoryId>` and `?item=<itemId>`.
Screenshots reviewed: edit-banner forms for `moo mwwt` → `/69/menu?item=248247` and `feel the taste` → `/69/menu?section=11200`; landing-navigation result pages showing “All” tab selected / `Po` first — target item not scrolled; target category not selected.

---

## Code under investigation (read-only)

- `frontend/src/pages/MenuItems.jsx` lines 54–60, 74–77, 106–142, 163–189, 306–309, 350–375, 825–854, 960–970, 1096–1120.
- `frontend/src/components/PromoBanner/PromoBanner.jsx` lines 43–80.
- `frontend/src/hooks/useMenuData.js` lines 60–141 (`id: String(item.id)`, `categoryId: String(product.category_id || '')`).
- `frontend/src/pages/admin/AdminBannersPage.jsx` picker — stores raw value `/{rid}/menu?section=<categoryId>` or `/{rid}/menu?item=<itemId>` from the same `useMenuSections(null, numericRid)` source used by `MenuItems`.

---

## Finding 1 — item is NOT scrolled to top and NOT highlighted (from landing)

**File:** `MenuItems.jsx` lines 163–189, 350–375, 967, 1098.

Flow when landing navigates to `/69/menu?item=248247`:
1. MenuItems mounts. `useSearchParams` → `targetItem = "248247"`. `selectedCategory` initial state is `null` → "All" view renders.
2. Menu data loads, `menuSections.length > 0` → deep-link effect runs **one-shot** (`deepLinkApplied` ref guard).
3. Effect iterates sections, finds the item in section `Po`, calls `handleCategoryClick('Po')`.
4. `handleCategoryClick` (line 350) sets `selectedCategory = 'Po'` and, after **100 ms**, runs a **smooth** `window.scrollTo` targeting `categoryHeaderRef` with offset 120 px (scrolls the *category header* up — not the item).
5. Then the effect’s **300 ms** `setTimeout` runs `document.querySelector('[data-item-id="248247"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })`.

Root causes of the observed behaviour:

- **Two consecutive `smooth` scrolls back-to-back (100 ms → 300 ms gap).** On Chrome the second smooth scroll interrupts the first; on many iOS Safari versions a second `scrollIntoView` while a prior smooth scroll is still animating is dropped silently. That explains the inconsistent “sometimes lands, sometimes doesn’t” feel.
- **`block: 'center'` positions the item in the vertical middle of the viewport**, not at the top. Owner’s expectation is “top of list” — current code intentionally centres.
- **There is no highlight implementation at all.** No state flag, no CSS class, no pulse/flash is applied to the item wrapper after scroll. The `[data-item-id]` wrapper is a plain `<div>`; nothing visually distinguishes the deep-linked item from any other row.

> Conclusion for Bug 1: three separate gaps (scroll race, wrong block alignment, no highlight feature). The current implementation shipped only `scroll near the item`, not “pin to top + highlight”. This is a functional gap vs. owner expectation, not just a race condition.

---

## Finding 2 — banner tap from the menu page does nothing

**File:** `MenuItems.jsx` lines 60, 163–189.

```js
const deepLinkApplied = useRef(false); // one-shot guard — do not re-fire on re-renders
…
useEffect(() => {
  if (deepLinkApplied.current) return;
  if (!menuSections || menuSections.length === 0) return;
  if (!targetSection && !targetItem) return;
  deepLinkApplied.current = true;
  …
}, [menuSections, targetSection, targetItem]);
```

Scenario: user is on `/69/menu` with no query, scrolls around, then taps a banner with link `/69/menu?item=248247`.

What actually happens:
- `PromoBanner.onTouchEnd` / `onClick` runs `navigate('/69/menu?item=248247')`.
- Because the pathname is unchanged, React Router keeps `MenuItems` mounted — it only updates `location.search`.
- `useSearchParams` re-renders with new values → `targetItem` changes from `null` to `"248247"`.
- The effect fires because `targetItem` changed. **But**: on this entry into the effect, is `deepLinkApplied.current` false (initial) or true (set by an earlier run)?
  - On a fresh menu-page mount with NO params, the effect’s earlier run returned at `if (!targetSection && !targetItem) return;` **before** flipping the guard → ref stays `false`. Good.
  - **But** `menuSections` is a `useMemo` with deps `[rawMenuSections, menuOrder, stationId]`. During menu bootstrap the memo often recomputes after `menuOrder` / dietary tags / `rawMenuSections` arrive. On those re-renders the effect also re-fires — but each of those runs is still blocked by the param check, so the ref still stays false until a tap arrives. So in theory the first tap should pass the guard.

What then breaks the tap in practice:

- Even when the effect does pass the guard and sets `deepLinkApplied.current = true`, the **tap arrives while `selectedCategory` might already equal the target section’s `sectionName`** (user previously scrolled into that category or used the side panel). Then `handleCategoryClick(section.sectionName)` on line 352 does the opposite — **it toggles the category off** (`selectedCategory === categoryName → setSelectedCategory(null)`). The 300 ms item scroll still fires, but `block: 'center'` on a brief “All → Po collapse” transition means the wrapper may not yet be mounted when `querySelector` runs, so nothing scrolls. UI appears idle.
- A second banner tap (on a DIFFERENT item) is now permanently blocked by `deepLinkApplied.current = true` — the ref is never reset, so every subsequent in-session tap is silently ignored for the rest of the MenuItems lifetime. **This matches the owner’s “from menu page — no effect” symptom exactly after the first tap.**

> Conclusion for Bug 2 — two root causes:
> 1. **`deepLinkApplied` is set once per mount and never reset on URL/search-param change**, so any second banner tap on the same mount is a no-op by design.
> 2. **`handleCategoryClick` is a toggle, not a setter** — if the user’s current `selectedCategory` already matches the banner’s section, the deep-link effect *unselects* it.

Both must be addressed to make the menu-page tap reliable.

---

## Finding 3 — banner → category from landing page doesn’t select the category

**File:** `MenuItems.jsx` lines 76–77, 106–142, 163–172.

Observed in screenshot `/69/menu?section=11200` after a landing-page tap: “All” tab is active, `Po` is first (not `Raom`) — i.e., `handleCategoryClick` was never called with `Raom`.

Lookup used:
```js
const section = menuSections.find(s => String(s.categoryId) === String(targetSection));
if (section) handleCategoryClick(section.sectionName);
```

Why the admin-stored `section=11200` fails to match after landing-page navigation:

- The admin picker reads data via `useMenuSections(null, numericRid)` — **`stationId = null`**. `useMenuSections` (`useMenuData.js`) hits the menu API without a station filter, producing one merged `rawMenuSections` array where each section is tagged with `category_id` as returned by the API.
- `MenuItems` reads data via `useMenuSections(effectiveStationId, numericRestaurantId)` where `effectiveStationId = stationId || foodFor`. On navigation from the landing page `foodFor` is derived from `useScannedTable()` → it reflects the scanned table’s `food_for` flag (or default). That call hits the menu API **with a station/menu filter**, returning only the sections belonging to that station.
- A multi-menu restaurant (69 uses `Po`, `Raom`) will return different category rows per station; the admin snapshot (no station) contains both, but `MenuItems` after landing only contains one station’s sections. If the banner points to a `categoryId` that lives in another station’s menu, `menuSections.find(...)` returns `undefined` → the effect silently no-ops.
- Why it then “works from menu page”: once you reach `/69/menu` by any route, you have a concrete `effectiveStationId` matching the station the owner is testing with. If the stored category_id happens to be in that same station’s menu, the find succeeds.
- Secondary consideration: `menuSections` is **re-ordered / filtered** by admin `categoryVisibility`. If the target category is hidden by admin config for the active station, it is dropped from `menuSections` at line 128, so the find also returns `undefined`.

> Conclusion for Bug 3: the deep-link lookup is scoped to the *station-filtered* `menuSections`, while the admin picker is **station-agnostic**. This mismatch, plus admin category-visibility filtering, lets the admin store `categoryId` values that MenuItems cannot resolve after landing-page navigation. The toggle behaviour from Finding 2 may also apply once a station match does happen.

---

## Cross-cutting observations

- The deep-link effect runs only `window.scrollTo` for the *category header* (not the item) in the category branch — i.e. `?section=` never scrolls to any specific item. That is per spec (owner Q1 = A: scroll to category).
- `data-item-id` wrappers exist in both the normal render (line 1098) and the search-ranked render (line 967). The search path would never apply during deep-link (search query is empty), so only the normal path matters.
- `category_id` and `item.id` are stored as **strings** in `useMenuData.js` — the comparison uses `String(...) === String(...)`, so type coercion is safe. ID matching is not the suspect.

---

## Summary of root causes (concise)

| # | Symptom | Root cause(s) |
|---|---------|---------------|
| 1 | Item not top / not highlighted (landing → menu) | (a) `scrollIntoView` uses `block: 'center'` — not top; (b) two overlapping smooth scrolls (category header @100 ms + item @300 ms) race and interrupt each other; (c) **no highlight is implemented at all** — gap vs. owner expectation |
| 2 | Banner tap from menu page does nothing | (a) `deepLinkApplied` ref guard is set once per mount and **never reset on search-param change**, so repeat taps are silent no-ops; (b) `handleCategoryClick` is a **toggle** — if user is already on the target category, the deep-link effect unselects it |
| 3 | Category deep-link fails from landing page | (a) Admin picker reads sections with `stationId = null` (all stations merged); `MenuItems` reads sections with `effectiveStationId = stationId‖foodFor` (station-filtered), so stored `categoryId` may not exist in the runtime list; (b) admin `categoryVisibility` can also hide the target section from `menuSections`; (c) when a station match *does* occur, the toggle behaviour from Finding 2 can still cancel the selection |

---

## Open questions for owner (before planning)

1. **Item deep-link UX:** owner originally picked “A: scroll to item in full menu”. The reported bug asks for “item at **top of list**, **highlighted**”. Should planning upgrade this to (i) scroll item to top (not center), and (ii) add a visible highlight (e.g., a 2 s orange pulse / outline)? Current code has neither.
2. **Station scope for category/item lookup:** acceptable to look up the target across **all stations** and (if needed) redirect/navigate to the correct station menu, or keep the lookup scoped to the current station and surface a friendly “not available here” message?
3. **Repeat taps on menu page:** confirm the deep-link effect should re-fire on every URL `?section=` / `?item=` change (expected), not only once per mount.

**No code changes made in this investigation.**
