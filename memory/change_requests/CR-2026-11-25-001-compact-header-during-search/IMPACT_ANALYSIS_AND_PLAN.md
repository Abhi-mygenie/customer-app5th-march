# IMPACT ANALYSIS + IMPLEMENTATION PLAN — CR-2026-11-25-001

**Item:** Compact header during search, Option C (search takes over the top)
**Role:** Planning (Role 2)
**Date:** 2026-11-25
**Owner decision:** Option C (see INTAKE_DOC §7c)
**Code reality:** NONE (no compact or hidden header exists today)
**Risk:** LOW
**Blast radius:** SMALL (MenuItems page only)

---

## PART A — IMPACT ANALYSIS

### A1. Code reality (live tree, 2026-11-25)

| Location | Today |
|---|---|
| `pages/MenuItems.jsx` L637–645 | `{(restaurantLoading \|\| restaurantFetching) ? <HeaderSkeleton/> : <Header brandText phone onBackClick={handleBackToMenu}/>}`. Always rendered, search-unaware. |
| `pages/MenuItems.jsx` L41 | `searchQuery` state, cleared via `setSearchQuery('')` at L917 (results header "Clear") and L973 (empty-state "Clear Search"). |
| `pages/MenuItems.jsx` L698–707 | `<SearchAndFilterBar … hideFilters={!!searchQuery.trim()} />` |
| `components/SearchAndFilterBar/SearchAndFilterBar.jsx` | The search row is the magnifier icon plus the input. There is **no back arrow and no "x" clear button**. Its only consumer is MenuItems.jsx. |
| `SearchAndFilterBar.css` L2–8 | Container `position: sticky; top: 0; z-index: 99`. |
| `components/Header/Header.jsx` | Shared by MenuItems, DiningMenu and OrderSuccess. **Not touched by this plan.** |

Correction to intake §7c point 4: the input has no "x" clear button today. The ways to clear a search are deleting the text, the results-header "Clear", the empty-state "Clear Search", and (new) the back arrow. No "x" is added, because it is out of scope.

### A2. Data / state flow

```
searchQuery (MenuItems state)
  ├─ isSearching = !!searchQuery.trim()
  ├─ Header render       ← NEW: skipped when isSearching
  ├─ SearchAndFilterBar  ← hideFilters (existing) + onSearchBack (NEW)
  ├─ PromoBanner / CategoryNav (existing !searchQuery guards)
  └─ flat ranked results (existing BUG-2026-11-14-002)
```

This is UI-only. No change to cart, order, payment, API, context, config or backend. `money_path: null`.

### A3. Behaviour checks

| Concern | Analysis | Result |
|---|---|---|
| Keyboard drops when the header disappears | The Header sits in its own JSX slot before `<MenuPanel>` and `menu-items-content`. Rendering `null` in that slot does **not** remount `SearchAndFilterBar`, so the `<input>` DOM node and its focus survive. | Safe. QA must verify on mobile. |
| Layout jump on first character | The content shifts up ~73px once. This is intended (the Swiggy pattern). The input moves to the top; the caret and focus are kept. | Accepted UX |
| Whitespace-only query | Uses `.trim()`, the same as `hideFilters`, so the header and filters always toggle together. | Consistent |
| Sticky search bar | Already `top: 0`. With the header gone, it is naturally the topmost element. No CSS offset change. | No change |
| Header back button (leaves the page) | Hidden while searching. The new search back arrow only clears the search. Two different actions, never shown at the same time. | Clear |
| Hamburger / phone hidden while searching | Per owner decision; they return when the search is cleared. The floating "Menu" button is unaffected. | Accepted |
| Loading skeleton | While the restaurant is loading the skeleton still shows (searching during load is unlikely). The guard applies to the whole header slot, so the skeleton is hidden too while searching. | Safe |
| Scroll-to-category logic L323–339 (60px offset) | Only used for category clicks, and category nav is hidden while searching. | Not affected |
| DiningMenu / OrderSuccess | Do not use SearchAndFilterBar; Header.jsx is unchanged. | Not affected |
| Desktop | Same behaviour. Acceptable, as search is a focused mode. | Accepted |

### A4. Conflicts / recent changes

- `MenuItems.jsx` and `SearchAndFilterBar.jsx` were edited by BUG-2026-11-14-001, BUG-2026-11-14-002 and BUG-2026-11-25-002 (all IMPLEMENTED). This plan builds on their guards and does not modify them.
- No other open item touches these lines. CR-2026-11-14-003 touches PromoBanner only.

### A5. Risk: LOW
Two-line render guard, one optional prop, one new button, small CSS. Default prop values keep existing behaviour.

---

## PART B — IMPLEMENTATION PLAN (edit by edit)

### E1 — `frontend/src/pages/MenuItems.jsx`: hide the header while searching (L636–645)

Wrap the existing header slot:

```jsx
{/* CR-2026-11-25-001: header hidden during active search (Option C) */}
{!searchQuery.trim() && (
  (restaurantLoading || restaurantFetching) ? (
    <HeaderSkeleton showSearchIcon={true} />
  ) : (
    <Header
      brandText={restaurant?.name}
      phone={configPhone || restaurant?.phone}
      onBackClick={handleBackToMenu}
    />
  )
)}
```

### E2 — `frontend/src/pages/MenuItems.jsx`: pass the back handler (L698–707)

Add one prop to the existing `<SearchAndFilterBar>`:

```jsx
onSearchBack={() => setSearchQuery('')}  // CR-2026-11-25-001
```

### E3 — `SearchAndFilterBar.jsx`: new optional prop

Props: `onSearchBack,  // CR-2026-11-25-001: back arrow during search, clears query`

### E4 — `SearchAndFilterBar.jsx`: render the back arrow before `.search-bar-section` (inside `.search-filter-row`)

```jsx
{/* CR-2026-11-25-001: back arrow replaces app header during search */}
{hideFilters && onSearchBack && (
  <button
    type="button"
    className="search-back-btn"
    onClick={onSearchBack}
    aria-label="Clear search and go back to menu"
    data-testid="search-back-btn"
  >
    <IoArrowBackOutline />
  </button>
)}
```

Import: `import { IoArrowBackOutline } from 'react-icons/io5';` (already a dependency, used by Header.jsx).
The visibility condition reuses `hideFilters` (= active search), so no new state is needed.

### E5 — `SearchAndFilterBar.css`: append

```css
/* CR-2026-11-25-001: back arrow shown during active search */
.search-back-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-primary);
  font-size: 22px;
  cursor: pointer;
  transition: background-color var(--transition-base), transform var(--transition-base);
}
.search-back-btn:active { transform: scale(0.92); }
.search-back-btn:hover  { background-color: var(--bg-secondary, #f5f5f5); }
```

Mobile check (**verified in code, fix REQUIRED**): the ≤600px block (L237–246) sets `.search-filter-row { flex-wrap: wrap }` and `.search-bar-section { flex: 1 1 100%; order: 1 }`. Without an override, the 36px back arrow (order 0) would sit on its **own line** above the input, wasting about 44px and undoing part of the gain. Append inside E5:

```css
@media (max-width: 600px) {
  .search-back-btn + .search-bar-section {
    flex: 1 1 0;
    min-width: 0;
  }
}
```

The adjacent-sibling selector only matches while the arrow is rendered, so the no-search mobile layout is untouched.

### Files WILL change
- `frontend/src/pages/MenuItems.jsx` (E1, E2)
- `frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.jsx` (E3, E4)
- `frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.css` (E5)

### Files WILL NOT change
- `components/Header/Header.jsx`, `Header.css`
- `pages/DiningMenu.jsx`, `pages/OrderSuccess.jsx`, `pages/ReviewOrder.jsx`
- `components/MenuItem/*`, PromoBanner, CategoryNav, MenuPanel, HamburgerMenu
- Any context, API service, or backend file

---

## PART C — VERIFICATION MATRIX (390px mobile, restaurant 716)

| # | Step | Expected |
|---|---|---|
| V1 | Open the menu with no search | Orange header (back, name, hamburger) visible. No search back arrow. |
| V2 | Type 1 character | Header disappears, search row at the top, back arrow on its left, input still focused (keyboard stays) and the character is in the input |
| V3 | Keep typing | No flicker; header stays hidden; results ranked as before |
| V4 | Tap the search back arrow | Query cleared, header + banner + category nav + filters are back, **still on the menu page** (URL unchanged) |
| V5 | Type, then delete all the text | Header returns |
| V6 | Type only spaces | Header stays visible (trim) |
| V7 | Search, then results-header "Clear" / empty-state "Clear Search" | Header returns |
| V8 | Header back button (no search) | Navigates back as before (regression) |
| V9 | Space gained | First result card's top moves up by ≈73px compared with before |
| V10 | DiningMenu `/716/stations` and OrderSuccess | Header unchanged (regression) |
| V11 | Filter state preserved | Pick Veg, search, clear: Veg is still active (BUG-2026-11-25-002 regression) |
| V12 | Desktop 1280px | Same behaviour, no layout break |

---

## PART D — Owner decisions
None open. Option C was confirmed. The input "x" clear button is **not** added (out of scope; it can be raised as a separate CR if wanted).

**Next:** gate approval, then Implementation (Role 3).

---

## PART E — IMPLEMENTATION RECORD (2026-11-25, Role 3)

- E1–E5 implemented exactly as planned (markers `CR-2026-11-25-001`).
- Extra edit from a testing finding: the header skeleton condition changed to `!restaurant && (restaurantLoading || restaurantFetching)`, so clearing a search does not show a pulsing skeleton during a background refetch when restaurant data is already cached.
- Testing agent `/app/test_reports/iteration_31.json`: V1–V12 PASS, and BUG-2026-11-25-001 inline category-before-price PASS (13/13).
- Known environment issue (not in scope): preprod restaurant-product and restaurant-info take 8–13s against an 8s axios timeout, so the preview menu can show "No menu items available".
