# INTAKE DOC — BUG-2026-11-14-002

**ID:** BUG-2026-11-14-002  
**Type:** BUG  
**Title:** Search ranking — exact item match not shown first; cross-category ordering causes exact match to be buried below partial matches  
**Registered:** 2026-11-14  
**Status:** INTAKE  
**Priority:** P1  
**Risk:** MEDIUM  
**Source:** INV-2026-11-14-001 Issue B + CR-2026-11-14-004 (expanded scope)  

---

## 1. Owner Report (verbatim)

> "also when we search the item the exact item don't appears on top of the list (when we search the item Tea it became below of the list, where it was exact match)"

**Screenshot:** See `screenshots/screenshot-miia-bella-tea-results.png`

---

## 2. Classification

**Type:** BUG — search result ordering incorrect  
**Severity:** P1 — Customers searching for a specific item by name cannot find it quickly; exact matches are buried below partial matches from unrelated categories

---

## 3. Reproduction Steps (from screenshot)

1. Open menu page at Miia Bella restaurant
2. Search "Tea"
3. Observe results:
   - 1st: "Lemon Ice Tea" (₹449) — name partial match, DRINKS category
   - 2nd: "Long Island Ice Tea" (₹749) — name partial match, COCKTAIL category
   - 3rd: **"Tea" (₹50)** — **exact match, BREAKFAST category** ← should be FIRST

---

## 4. Root Cause (confirmed by investigation — INV-2026-11-14-001 Issue B)

Two compounding flaws in `frontend/src/pages/MenuItems.jsx`:

### Flaw 1 — `filterItems()` has no relevance sort (lines 412–417)

```js
if (searchQuery) {
  filtered = filtered.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  // No sort → items keep POS food_order within section
}
```

### Flaw 2 — Render loop iterates sections in POS category order (lines 829–933)

```jsx
sectionsToDisplay.map((section, sectionIndex) => {
  const filteredItems = filterItems(orderedSectionItems, categoryId);
  return (
    <>
      <div class="category-info-header">{section.sectionName}</div>
      {filteredItems.map(item => <MenuItem .../>)}
    </>
  );
})
```

Each section is filtered independently. There is no cross-section view. An exact match in a late category (BREAKFAST) always renders after partial matches in early categories (DRINKS, COCKTAIL).

**CR-2026-11-14-004 scope gap:** The original CR-004 intake proposed a within-section sort only. Investigation revealed this is insufficient — the fix requires cross-section flattening.

---

## 5. Required Fix

**When `searchQuery` is active:** bypass the per-section render loop and produce a **single flat ranked list** across all sections.

### Relevance tiers:

| Tier | Condition | Example query "Tea" |
|---|---|---|
| 0 | `item.name.toLowerCase() === query` | **Tea** ← exact |
| 1 | `item.name.toLowerCase().startsWith(query)` | Tea Cake, Teal Drink |
| 2 | `item.name.toLowerCase().includes(query)` | Lemon Ice Tea, Long Island Ice Tea |
| 3 | description contains query, name does not | "Fresh Catch" (desc: "served with tea") |

### Implementation approach:

```js
// When searchQuery is active — replace per-section render with flat ranked list
if (searchQuery) {
  // 1. Collect + filter all items from all sections
  const allItems = sectionsToDisplay.flatMap(section => {
    const categoryId = section.categoryId;
    return filterItems(section.items, categoryId).map(item => ({
      ...item,
      _sectionName: section.sectionName
    }));
  });

  // 2. Score by relevance
  const q = searchQuery.toLowerCase();
  const score = (item) => {
    const name = item.name.toLowerCase();
    const desc = (item.description || '').toLowerCase();
    if (name === q)         return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q))   return 2;
    if (desc.includes(q))   return 3;
    return 99;
  };

  // 3. Sort and render as single list (no category headers needed during search)
  const ranked = allItems
    .filter(i => score(i) < 99)
    .sort((a, b) => score(a) - score(b));

  return <div id="items-section">
    {ranked.map(item => <MenuItem .../>)}
  </div>;
}

// When no search — existing per-section render (unchanged)
```

---

## 6. Relationship to CR-2026-11-14-004

**CR-2026-11-14-004** (registered same session) was the original intake for "search exact match first". It proposed a within-section sort only.

**This BUG (BUG-2026-11-14-002) supersedes CR-2026-11-14-004** because:
1. It is based on investigation-confirmed root cause
2. The fix requires cross-section flattening, not just within-section sorting
3. This is a live P1 bug with screenshot evidence; CR-004 was originally P2 enhancement

**Action on CR-2026-11-14-004:** Mark as DUPLICATE/SUPERSEDED by BUG-2026-11-14-002. No separate implementation needed for CR-004.

---

## 7. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| CR-2026-11-14-004 | Search exact match first | SUPERSEDED BY THIS BUG (narrower scope) |
| INV-2026-11-14-001 Issue B | Root cause confirmed | SOURCE |

**Verdict: DISTINCT (supersedes CR-2026-11-14-004)**

---

## 8. Risk Assessment

| Factor | Assessment |
|---|---|
| Money path | NO |
| Auth | NO |
| Data change | NO |
| Hotspot file | NO — MenuItems.jsx is not a listed hotspot |
| Regression risk | MEDIUM — render path changes when searchQuery active; must verify all filters (veg, dietary tags, cart reorder, stock-out, channel) still apply correctly in flat list |

**Risk: MEDIUM** — existing path (no search) is completely untouched; risk is only in the new search-active path.

---

## 9. Blast Radius

**Files that WILL change:** `frontend/src/pages/MenuItems.jsx` (search render branch, ~40 lines added)  
**Files that WILL NOT change:** `CartContext.js`, `ReviewOrder.jsx`, `AuthContext.jsx`, backend, any other component  
**Blast radius: SMALL-MEDIUM**

---

## 10. Acceptance Criteria

1. Search "Tea" → "Tea" (exact) is first result
2. Search "Ice Tea" → results containing "Ice Tea" in name come first, description-only matches after
3. All existing filters (Veg/Non-Veg/Egg, dietary tags, stock-out, channel) still apply in search results
4. Items in cart still appear at top within their relevance tier
5. When search is cleared → category-grouped view returns, unchanged

---

**Intake complete: BUG-2026-11-14-002**  
Classification: BUG (supersedes CR-2026-11-14-004)  
Severity: P1 | Risk: MEDIUM  
Duplicate check: DISTINCT (supersedes CR-004)  
Blast radius: SMALL-MEDIUM  
Docs: change_requests/BUG-2026-11-14-002-search-exact-match-not-first/INTAKE_DOC.md  
Next: Planning → Implementation
