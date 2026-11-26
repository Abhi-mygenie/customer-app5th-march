# QA HANDOVER — BUG-2026-11-14-002 + CR-2026-11-14-002

**Date:** 2026-11-25  
**From:** Role 3 (Implementation)  
**To:** Role 4 (QA)  
**Status:** IMPLEMENTED — ready for QA

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/MenuItems.jsx` | BUG-002: flat-search block before per-section render loop |
| `frontend/src/components/MenuItem/MenuItem.jsx` | BUG-002: categoryName prop + category tag · CR-002: isAPS + APS badge |
| `frontend/src/components/OrderItemCard/OrderItemCard.jsx` | CR-002: APS badge replaces ₹price when price===1 |
| `frontend/src/pages/ReviewOrder.jsx` | CR-002: APS notice above price breakdown |
| `frontend/src/pages/MenuItems.css` | BUG-002: search-meta-banner + empty-search-state styles |
| `frontend/src/components/MenuItem/MenuItem.css` | BUG-002: item-category-tag · CR-002: item-aps-badge styles |
| `frontend/src/components/OrderItemCard/OrderItemCard.css` | CR-002: order-item-aps-badge styles |
| `frontend/src/pages/ReviewOrder.css` | CR-002: review-aps-notice styles |

---

## Verification Matrix for QA

| # | Test | Expected | data-testid |
|---|---|---|---|
| V1 | Search "Tea" on a live restaurant | "Tea" (exact match) appears first | search-results-count-banner |
| V2 | Search "Ice Tea" | name matches before desc-only matches | — |
| V3 | Veg filter ON + search term | only veg items in flat list | — |
| V4 | Cart item exists + search | cart item at top of its relevance group | — |
| V5 | Clear search via banner button | category-grouped view restores | search-meta-clear-btn |
| V6 | Search term with zero matches | empty state shown | empty-search-state, empty-search-clear-btn |
| V7 | Clear from empty state | returns to normal menu | empty-search-clear-btn |
| V8 | No search, normal browse | category headers visible, existing view unchanged | — |
| V9 | item.price===1 on menu card | APS / As Per Size badge shown, no ₹1 | menu-item-aps-badge |
| V10 | item.price===50 on menu card | ₹50 shown, not APS | — |
| V11 | APS item in ReviewOrder | APS badge in item row | order-item-aps-badge |
| V12 | APS item in cart | APS notice shown above price breakdown | review-order-aps-notice |
| V13 | Mixed cart (APS + regular) | Regular items show price, APS items show badge | — |
| V14 | ADD button on APS item | adds to cart normally, no block | — |
| V15 | Bill total with APS item | ₹1 included in total (correct) | — |
| V16 | No tier/match labels visible | no "Exact match" / "Partial match" text anywhere | — |

---

## What MUST NOT Change (Regression Guard)

- `CartContext.js` — untouched
- `orderService.ts` — untouched  
- `AuthContext.jsx` — untouched
- `server.py` — untouched
- Payment flow — untouched
- Order placement — untouched
- Per-section render loop (no-search path) — untouched
