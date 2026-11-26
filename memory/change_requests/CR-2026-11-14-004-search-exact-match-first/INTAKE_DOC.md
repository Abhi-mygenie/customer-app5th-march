# INTAKE DOC — CR-2026-11-14-004

**ID:** CR-2026-11-14-004  
**Type:** CR (Change Request)  
**Title:** Item search in Scan & Order — exact name match shown first, related items after  
**Registered:** 2026-11-14  
**Registered by:** Owner (via session)  
**Status:** INTAKE  
**Priority:** P2  
**Risk:** LOW  

---

## 1. Owner Request (verbatim)

> "In scan and order upon item search the exact match item must come first and then related items"

---

## 2. Classification

**Type:** CR — Search result ordering / ranking  
**Severity:** P2 — UX improvement; existing search works but returns results in category/POS order rather than relevance order. Customer experience impact when searching for a specific dish name.

---

## 3. Current Behaviour

**Code verified in `MenuItems.jsx` lines 412-416:**

```js
if (searchQuery) {
  filtered = filtered.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
}
```

- Items are **filtered** (include/exclude) but **NOT ranked** by relevance.
- Results are returned in the original POS category order.
- A search for "Butter Chicken" may show "Butter Chicken Masala" (name match) and "Chicken Tikka" (description match) in arbitrary order — the exact match is not guaranteed to appear first.

---

## 4. Requested Behaviour

After filtering, results should be **sorted by relevance tier**:

| Tier | Condition | Example query "fish" |
|---|---|---|
| 1 — Exact name match | `item.name.toLowerCase() === query` | "Fish" |
| 2 — Name starts with query | `item.name.toLowerCase().startsWith(query)` | "Fish Curry", "Fish Fry" |
| 3 — Name contains query (partial) | `item.name.toLowerCase().includes(query)` | "Grilled Fish Steak" |
| 4 — Description match only | name does NOT include query, description does | "Catch of the Day" (description: "fresh fish…") |

Items within the same tier retain their original order.

---

## 5. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| None found | — | DISTINCT |

---

## 6. Evidence / Code Locations

| File | Location | Relevance |
|---|---|---|
| `frontend/src/pages/MenuItems.jsx` | Lines 412-416 (`filterItems` function) | Only change needed |
| `frontend/src/components/SearchBar/SearchBar.jsx` | Entire file | Input component — no change needed |

---

## 7. Blast Radius

**Files that WILL change:** `MenuItems.jsx` (lines 412-416, add sort after filter)  
**Files that WILL NOT change:** `SearchBar.jsx`, `CartContext.js`, `ReviewOrder.jsx`, backend, config  
**Blast radius: SMALL**

---

## 8. Risk Assessment

| Factor | Assessment |
|---|---|
| Money path | NO |
| Auth | NO |
| API / DB change | NO |
| Hotspot file | NO — MenuItems.jsx is not listed as a hotspot |
| Regression risk | LOW — only affects sort order of already-filtered results |

**Risk: LOW**

**Fast Lane eligibility:** Potentially YES (single file, ~10 lines, LOW risk, no hotspot) — requires owner approval for Fast Lane.

---

## 9. Recommended Implementation (for Planning)

Replace the current filter-only logic with a filter + score + sort pattern:

```js
if (searchQuery) {
  const q = searchQuery.toLowerCase();
  const score = (item) => {
    const name = item.name.toLowerCase();
    const desc = (item.description || '').toLowerCase();
    if (name === q) return 0;                    // Tier 1: exact
    if (name.startsWith(q)) return 1;            // Tier 2: starts with
    if (name.includes(q)) return 2;              // Tier 3: name partial
    if (desc.includes(q)) return 3;              // Tier 4: description only
    return 99;                                   // should not happen after filter
  };
  filtered = filtered
    .filter(item => score(item) < 99)
    .sort((a, b) => score(a) - score(b));
}
```

**Estimated complexity:** LOW — ~15 lines replacing ~5 lines. Same file, same function.

---

**Intake complete.**
