# INVESTIGATION REPORT — INV-2026-11-25-001

**Title:** Search screen space density, Scan & Order vs Swiggy (~2 visible results vs ~5 with the keyboard open)
**Role:** Investigation
**Date:** 2026-11-25 (registered retroactively on the same day; it was referenced by the BUG-2026-11-25-001/002 and CR-2026-11-25-001 docs but never entered in the registry)
**Status:** CLOSED — every finding was split into registered items, all IMPLEMENTED

---

## 1. Owner report (verbatim)

> "Compare to Swiggy - scan and order ui - space is more wasted - in Swiggy we almost can see 5 items but in scanandorder we only have 2 suggest what can be done for better experience"

Follow-ups:
> "suggestion attached spaces can be optimised is thsi considdered  Item card is too tall this is as per needed right ??"
> "this category also showing is taking space we can show in same line as price may be is this considered"
> "category before price"

Evidence: owner screenshots (Swiggy search vs Scan & Order search, mobile, keyboard open).

## 2. Findings: where vertical space was lost (mobile, keyboard open)

| # | Space consumer | Approx px | Root cause | Split into | Status |
|---|---|---|---|---|---|
| F1 | Promo banner + category nav visible during search | large | no `!searchQuery` guard | BUG-2026-11-14-001 | IMPLEMENTED |
| F2 | Veg/Non-Veg/Egg + dietary chips visible during search | ~48 | no search guard on SearchAndFilterBar | BUG-2026-11-25-002 | IMPLEMENTED |
| F3 | Search card padding too generous; category tag on its own row | ~20/card + padding | category tag rendered block-level; no compact mode | BUG-2026-11-25-001 | IMPLEMENTED (category BEFORE price, same line; `.item-price-row` flex) |
| F4 | Category group headers between results | per group | per-section render loop | BUG-2026-11-14-002 (flat ranked list) | IMPLEMENTED |
| F5 | App header (73px measured at 390px) still shown while searching | 73 | header search-unaware | CR-2026-11-25-001 (Option C) | IMPLEMENTED |

Card height itself (image + name + price + ADD) was judged appropriate. Only padding and the category row were reduced.

## 3. Outcome

- Search input top moved 86px → 13px at a 390px viewport (iteration_31 V9).
- Expected visible results with the keyboard open: about 2 → about 5 (owner to confirm on device).

## 4. Not done / possible follow-ups

- Clear "x" button inside the search input: suggested, not requested and not registered.
