# INTAKE DOC — BUG-2026-11-14-001

**ID:** BUG-2026-11-14-001  
**Type:** BUG  
**Title:** Search results hidden by mobile keyboard — banner and category navigation not hidden when search is active  
**Registered:** 2026-11-14  
**Status:** INTAKE  
**Priority:** P1  
**Risk:** LOW  
**Source:** INV-2026-11-14-001 Issue A (root cause confirmed)  

---

## 1. Owner Report (verbatim)

> "when searching for the item we not able to see any items which are search results, we need to refactor as the search items becomes only list to show in screen (as example on screen the banner and category with the keyboard hides the search result)"

**Screenshots:** See `screenshots/screenshot-miia-bella-search-keyboard.png`, `screenshots/screenshot-vestar-golden-keyboard.png`

---

## 2. Classification

**Type:** BUG — UI layout regression on mobile  
**Severity:** P1 — Search is a primary discovery tool; on mobile it is entirely unusable because results are off-screen when the keyboard is open

---

## 3. Reproduction Steps

1. Open menu page on mobile (e.g., abella.mygenie.online / vestar.mygenie.online)
2. Tap the search bar → mobile keyboard opens
3. Type any search term (e.g., "Tea", "Golden")
4. Observe: banner carousel and category row remain fully visible below the search bar
5. Observe: search results are pushed below the keyboard → invisible

---

## 4. Root Cause (confirmed by investigation)

**File:** `frontend/src/pages/MenuItems.jsx`

| Element | Line | Current condition | Problem |
|---|---|---|---|
| `PromoBanner` | 741 | `configShowPromotionsOnMenu` | No `searchQuery` guard |
| `CategoryBox` nav | 754 | `configShowCategories` | No `searchQuery` guard |

Both elements render unconditionally when their config flags are on. Combined measured height ~250px. With mobile keyboard (~300px), only ~148px of a standard 844px screen is available for results — roughly 1 item or zero.

---

## 5. Exact Fix (1 line each)

```jsx
// Line 741 — BEFORE
{configShowPromotionsOnMenu && (() => { ... })()}

// Line 741 — AFTER
{configShowPromotionsOnMenu && !searchQuery && (() => { ... })()}

// Line 754 — BEFORE
{configShowCategories && (() => { ... })()}

// Line 754 — AFTER
{configShowCategories && !searchQuery && (() => { ... })()}
```

**Effect:** As soon as the user starts typing, banner and category row disappear. Full screen height becomes available for results. When search is cleared, they reappear.

---

## 6. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| INV-2026-11-14-001 Issue A | Root cause investigation | SOURCE — not duplicate |
| None in registry | — | DISTINCT |

---

## 7. Risk Assessment

| Factor | Assessment |
|---|---|
| Money path | NO |
| Auth | NO |
| Data change | NO |
| Hotspot file | NO — MenuItems.jsx is not listed (§6 only lists ReviewOrder, AuthContext, CartContext, RestaurantConfigContext, server.py, interceptors, LandingPage, OrderSuccess) |
| Regression risk | LOW — only affects visual render during search; existing path unchanged when no search |

**Risk: LOW**  
**Fast Lane eligible:** YES (single file, 2 × 1-character insertions, LOW risk, no business logic)

---

## 8. Blast Radius

**Files that WILL change:** `frontend/src/pages/MenuItems.jsx` (lines 741, 754)  
**Files that WILL NOT change:** Any other file  
**Blast radius: SMALL**

---

## 9. Acceptance Criteria

1. On mobile, type any query in the search bar → banner and category row are no longer visible
2. Search results are visible in the space above the keyboard
3. Clearing the search input → banner and category row reappear
4. Desktop: same behavior (banner/category hidden during search)
5. No change to search filtering logic

---

**Intake complete: BUG-2026-11-14-001**  
Classification: BUG  
Severity: P1 | Risk: LOW  
Duplicate check: DISTINCT  
Blast radius: SMALL  
Fast Lane: ELIGIBLE (owner approval needed)  
Docs: change_requests/BUG-2026-11-14-001-search-results-hidden-keyboard/INTAKE_DOC.md  
Next: Bug Fix (Fast Lane)
