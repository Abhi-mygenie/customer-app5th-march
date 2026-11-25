# INVESTIGATION REPORT — INV-2026-11-14-001

**ID:** INV-2026-11-14-001  
**Type:** INVESTIGATION  
**Title:** Search UX — results hidden by keyboard (layout) + exact match not first (ranking)  
**Registered:** 2026-11-14  
**Status:** INVESTIGATION COMPLETE  
**Risk:** MEDIUM  

---

## Symptoms (from owner + screenshots)

**Issue A:** When searching for an item with the mobile keyboard open, the banner carousel and category navigation row remain visible, taking up ~250px of screen space. Combined with the keyboard (~300px), search results are pushed entirely off-screen. The items ARE filtered correctly — they just cannot be seen without dismissing the keyboard.

**Issue B:** Searching "Tea" shows "Lemon Ice Tea" (partial match) and "Long Island Ice Tea" (partial match) before "Tea" (exact match). The exact match appears at the bottom of results.

---

## Hypotheses Tested

| # | Hypothesis | Result |
|---|---|---|
| H1 | Banner + category nav stay visible during search, pushing results off-screen | **CONFIRMED** |
| H2 | `filterItems()` only filters, no relevance sort; cross-category items render in POS category order | **CONFIRMED** |
| H3 | CSS scroll container issue | NOT A ROOT CAUSE |

---

## Root Cause A — Layout (Issue A)

**File:** `frontend/src/pages/MenuItems.jsx`  
**Lines:** 741 (PromoBanner), 754 (CategoryBox nav)

```jsx
// CURRENT — no searchQuery guard
{configShowPromotionsOnMenu && (() => {
  return <PromoBanner ... compact />;
})()}

{configShowCategories && (() => {
  return <div className="category-nav">...</div>;
})()}
```

Neither the `PromoBanner` nor the `CategoryBox` navigation checks `searchQuery`. Both render unconditionally when their config flags are on. 

**Measured space consumed on mobile (from screenshots):**
- Header: ~56px
- SearchAndFilterBar: ~90px  
- PromoBanner (compact): ~150px  
- CategoryBox nav: ~100px  
- **Total above results: ~396px**
- Mobile keyboard: ~300px  
- **Usable results area on 844px phone: ~148px ≈ 1 item visible**

The `SearchAndFilterBar` has `position: sticky; z-index: 99` (SearchAndFilterBar.css line 4) — it stays at the top correctly. But the banner and category nav below it also remain, taking away the entire scroll area.

**Classification:** `CODE_ERROR` — missing conditional render

---

## Root Cause B — Ranking (Issue B)

**File:** `frontend/src/pages/MenuItems.jsx`  
**Lines:** 412–417 (`filterItems()`), 829–933 (section render loop)

**Step 1 — `filterItems()` has no sort:**
```js
if (searchQuery) {
  filtered = filtered.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  // ← No relevance sort applied
}
```
Items within a section return in POS `food_order` — no relevance ranking.

**Step 2 — Render loop iterates sections in POS category order:**
```jsx
sectionsToDisplay.map((section, sectionIndex) => {
  const filteredItems = filterItems(orderedSectionItems, categoryId);
  ...
  return (
    <>
      <div class="category-info-header">{section.sectionName}</div>
      {filteredItems.map(item => <MenuItem .../>)}
    </>
  );
})
```
Each section is filtered independently and rendered in its original POS order. There is no mechanism to compare items ACROSS sections — a partial match in an early category always renders before an exact match in a late category.

**"Tea" trace:**

| Section (POS order) | Item | Match type | Position |
|---|---|---|---|
| DRINKS | Lemon Ice Tea | name partial | 1st |
| COCKTAIL | Long Island Ice Tea | name partial | 2nd |
| BREAKFAST | **Tea** | **exact name** | 3rd |

**Classification:** `PLAN_GAP` — search was designed as a filter-only operation. No ranking was planned.

**Note:** This root cause is the same as registered in CR-2026-11-14-004. That CR proposed a within-section sort only. The correct fix requires cross-section flattening when search is active.

---

## Recommended Fix Approach

### Fix A — Hide banner + category nav during search (Issue A)

```jsx
// MenuItems.jsx line 741 — add searchQuery guard
{configShowPromotionsOnMenu && !searchQuery && (() => {
  return <PromoBanner ... />;
})()}

// MenuItems.jsx line 754 — add searchQuery guard
{configShowCategories && !searchQuery && (() => {
  return <div className="category-nav">...</div>;
})()}
```

**Effect:** When the user starts typing in the search bar, banner and category nav disappear immediately, giving full screen height to results.  
**Risk:** LOW — visual only, no data/logic change.  
**Files:** `MenuItems.jsx` lines 741, 754 — 2 character additions.

---

### Fix B — Flatten + rank search results across all categories (Issue B)

When `searchQuery` is active, bypass the per-section render loop and instead:

1. Flatten all items from all sections into a single array
2. Apply all existing filters (channel, availability, stock, veg/dietary)
3. Apply relevance scoring:

```js
const score = (item) => {
  const q = searchQuery.toLowerCase();
  const name = item.name.toLowerCase();
  const desc = (item.description || '').toLowerCase();
  if (name === q)           return 0;  // Tier 1: exact match
  if (name.startsWith(q))   return 1;  // Tier 2: starts with
  if (name.includes(q))     return 2;  // Tier 3: name partial
  if (desc.includes(q))     return 3;  // Tier 4: description only
  return 99;
};
filtered = filtered.filter(i => score(i) < 99).sort((a, b) => score(a) - score(b));
```

4. Render as a single flat list (no category group headers during search — or optionally show category name next to item)

**Effect:** "Tea" (exact, Tier 0) renders first; "Lemon Ice Tea" (partial, Tier 2) after.  
**Risk:** LOW-MEDIUM — changes render path only when `searchQuery > 0`; existing path unchanged when no search.  
**Files:** `MenuItems.jsx` — search render branch.

---

## Relationship to CR-2026-11-14-004

CR-2026-11-14-004 (registered in this session) already captured Issue B at intake. This investigation has:
- Confirmed the root cause at code level
- Elevated scope: the fix requires cross-section flattening, not just within-section sorting as the intake doc suggested
- Fix A (layout) is a new finding not covered by CR-004

**Recommendation:** Merge both fixes into a single bug-fix CR or handle Issue A as a Fast Lane fix (2-line LOW risk) and Issue B as a planned implementation.

---

## Steps Used: 8/10

1. Read system prompt and screenshots
2. Read `MenuItems.jsx` structure and state variables
3. Traced `showSearch` / `searchQuery` state through render JSX
4. Examined `PromoBanner` and `CategoryBox` conditional rendering — no `searchQuery` guard
5. Read `SearchAndFilterBar.css` — confirmed `position: sticky`
6. Read `MenuItems.css` — no search-active layout rules
7. Traced `filterItems()` search block — no sort
8. Traced section render loop — confirmed cross-section ordering cannot surface exact matches

---

## Output

```
Investigation complete: INV-2026-11-14-001
Root cause A: PromoBanner + CategoryBox not hidden during search → keyboard obscures results
Root cause B: filterItems() no sort + per-section render → cross-category exact match buried
Classification: CODE_ERROR (A) · PLAN_GAP (B)
Confidence: HIGH
Steps used: 8/10
Evidence: code-level, confirmed at exact lines
Recommendation: Bug Fix (A) is LOW risk Fast Lane eligible · Bug Fix (B) is MEDIUM, requires
  flattening render path when searchQuery active · update CR-2026-11-14-004 scope
Report: change_requests/INV-2026-11-14-001-search-layout-and-ranking/INVESTIGATION_REPORT.md
```
