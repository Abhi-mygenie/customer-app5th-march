# INTAKE DOC — CR-2026-11-25-001

**ID:** CR-2026-11-25-001
**Type:** CR — UI layout / space optimisation
**Title:** Make the top app header smaller while a menu search is active, so more results fit above the mobile keyboard
**Registered:** 2026-11-25
**Status:** INTAKE → READY FOR PLANNING
**Priority:** P2
**Risk:** LOW
**Blast radius:** SMALL (if limited to the MenuItems page)

---

## 1. Owner Request (verbatim)

> "Compact Header: Reduce the top header size while searching to display more dishes above the keyboard was this not done in last bug fix when we optimized space confirm ??"
> "choose intake role and register CR for this gap"

## 2. Background / Gap

INV-2026-11-25-001 (Swiggy comparison: ~2 visible results vs ~5) looked at five ways to save space. Four were done:

| Optimisation | Item | Status |
|---|---|---|
| Hide promo banner + category nav while searching | BUG-2026-11-14-001 | IMPLEMENTED |
| Hide Veg/Non-Veg/Egg + dietary chips while searching | BUG-2026-11-25-002 | IMPLEMENTED |
| Compact search-result cards, category placed before the price on the same line | BUG-2026-11-25-001 | IMPLEMENTED |
| Flat ranked result list (no category group headers) | BUG-2026-11-14-002 | IMPLEMENTED |
| **Compact the app header while searching** | **— (this CR)** | **NOT DONE: noted as optional, never registered** |

This CR registers the remaining gap.

## 3. Current Behaviour (from live code)

- `frontend/src/pages/MenuItems.jsx` lines 640–644 render `<Header brandText phone onBackClick />` the same way whether or not a search is active. `searchQuery` is **not** passed to Header.
- `frontend/src/components/Header/Header.jsx`: shows the back button, the restaurant name (`h1.header-title`) and the HamburgerMenu. It has no compact mode.
- `frontend/src/components/Header/Header.css`:
  - `.menu-items-header`: `position: sticky; top: 0`, padding `var(--spacing-md)`, 3px bottom border, shadow.
  - At ≤480px: padding `12px 15px`, icon sizes 24px.
  - Estimated rendered height on mobile: **~55–60px** (a comment in MenuItems.jsx line 328 says "Header (60px)").
- `SearchAndFilterBar.css` is also `position: sticky; top: 0`. Planning must check how the two sticky elements stack.

## 4. Expected Behaviour

While `searchQuery.trim()` is not empty on the MenuItems page:
- The header shrinks (for example, smaller vertical padding and title size, or a slim bar), giving back about 20–30px for results.
- The back button and the hamburger menu stay reachable (design decision for Planning/Design).
- When the search is cleared, the header goes back to its normal size, ideally with a smooth transition.

## 5. Scope / Blast Radius

`Header` is shared by:
- `pages/MenuItems.jsx` (in scope)
- `pages/DiningMenu.jsx` (must NOT change)
- `pages/OrderSuccess.jsx` (must NOT change)

Recommended approach for Planning: an opt-in prop (e.g. `compact`) that defaults to `false`, so the other pages are unaffected.

Likely files: `MenuItems.jsx` (pass prop) · `Header.jsx` (modifier class) · `Header.css` (compact styles).
No backend, data, cart or payment impact. `money_path: null`.

## 6. Risks / Open Questions for Planning & Design

1. How compact? Options: (a) reduced padding and font only, (b) hide the restaurant name and keep only the icons, (c) the search bar replaces the header. Owner/design to decide.
2. Is the hamburger menu still needed while searching?
3. Sticky stacking between the header and the search bar (both `top: 0`).
4. Avoid layout jump or flicker when typing the first or last character (the CSS transition should only affect padding, height and font-size).
5. The scroll offset logic in MenuItems.jsx (~line 323–339) assumes a 60px header. Check whether it still holds while searching (search mode uses a flat list, so it is probably not affected).

## 7. Evidence

- Code references above (captured from the live working tree on 2026-11-25).
- Owner screenshots from INV-2026-11-25-001 (Swiggy vs Scan & Order) show the header taking up space above the results.
- Estimated gain: about 20–30px, roughly a third to half of one more compact result card.

## 7a. Measured Evidence (2026-11-25, 390px viewport, restaurant 716, query "chicken")

- App header actual height: **73px** (not 55–60px as estimated).
- Search bar row: top 78px, height 56px, so results start at about 140px.
- After scrolling, the header scrolls away (top -131px) and only the search bar stays pinned at the top. The header only costs space before the user scrolls, but that is exactly when the keyboard first opens.
- Review Order header (`.review-order-header`) uses the same padding, 3px border and font scale, so reusing it gives about 0px gain. Rejected.

## 7b. Options for Planning (owner asked for a recommendation, customer experience first)

| Option | What the customer sees while searching | Space gained |
|---|---|---|
| A. Reuse Review header | Same as today | ~0px |
| B. Slim header | Thinner orange bar with a smaller name | ~25–30px |
| C. Search takes over the top (Swiggy/Zomato pattern) **RECOMMENDED** | Orange bar hidden; the search row gets a back arrow that clears the search | ~73px |

Recommendation: C. It uses the most space, is a familiar search pattern and keeps the top uncluttered. The back arrow must **clear the search** (go back to the full menu), not leave the page. Hamburger and phone are hidden only while typing. Pending owner decision.

## 8. Duplicate Check

DISTINCT. Related to BUG-2026-11-14-001, BUG-2026-11-25-001, BUG-2026-11-25-002 and INV-2026-11-25-001 (same space-optimisation theme, different element).

## 9. Next

Planning (impact analysis + implementation plan), then Design (compact header visual), then the owner gate.
