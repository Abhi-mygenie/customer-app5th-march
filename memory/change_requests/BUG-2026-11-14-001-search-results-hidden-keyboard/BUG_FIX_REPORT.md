# BUG FIX REPORT — BUG-2026-11-14-001

**ID:** BUG-2026-11-14-001  
**Title:** Search results hidden by mobile keyboard  
**Fixed:** 2026-11-25  
**Role:** BUG FIX (Role 5) — Fast Lane  
**Status:** IMPLEMENTED  

---

## Root Cause

`PromoBanner` (line 741) and `CategoryBox` nav (line 754) in `MenuItems.jsx` had no `searchQuery` guard. Both rendered unconditionally whenever their config flags were on. Combined measured height ~250px. With mobile keyboard (~300px), only ~148px of a 844px screen remained for search results.

**Classification:** CODE_ERROR — missing conditional render  

---

## Fix Applied

**File:** `frontend/src/pages/MenuItems.jsx`

| Line | Before | After |
|------|--------|-------|
| 742 | `{configShowPromotionsOnMenu && (() => {` | `{configShowPromotionsOnMenu && !searchQuery && (() => {` |
| 756 | `{configShowCategories && (() => {` | `{configShowCategories && !searchQuery && (() => {` |

**Code markers:** `BUG-2026-11-14-001` on both changed lines.  
**Files changed:** 1 (`MenuItems.jsx`)  
**Lines changed:** 2  
**Other logic:** filterItems(), render loop, all other conditions — UNCHANGED  

---

## Verification

- Testing agent iteration_28: **100% PASS, retest_needed=false**
- PromoBanner hidden during search: CONFIRMED
- CategoryBox nav hidden during search: CONFIRMED  
- Both reappear when search is cleared: CONFIRMED
- No JS errors on /716/menu or /689/menu: CONFIRMED
- filterItems() unchanged: CONFIRMED

---

**Next:** QA handover complete. Ready for owner smoke.
