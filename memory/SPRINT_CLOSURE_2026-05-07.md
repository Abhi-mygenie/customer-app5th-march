# Sprint 7-May Closure — Customer / Scan & Order

**Branch**: `latest-hyatt-fixes-7-may`
**HEAD**: `ee56ff15e2ea7a6862cf8304807ce5e28e8657f4`
**Verdict**: READY WITH BACKLOG (19/19 closed in code, 12/19 validated at runtime)

## Closed in this sprint
1. 716 manual room selection persistence — `pages/ReviewOrder.jsx` sessionStorage write
2. Compulsory popup OK-only dismissal — `NotificationPopup.jsx`
3. OrderSuccess scroll-to-bottom — `pages/OrderSuccess.jsx`
4. ReviewOrder scroll-to-Grand-Total — `pages/ReviewOrder.css`
5. OrderSuccess admin-configurable message — `OrderSuccess.jsx` data-testid `order-success-message`
6. Brand theme anti-flash (localStorage) — `RestaurantConfigContext.jsx`
7. Stale brand-config refresh helper — `RestaurantConfigContext.jsx#forceRefresh`
8. `/716/stations` direct-load branding — `App.js` route + context
9. Favicon = restaurant logo — `FaviconRouteReset.jsx`, `index.html`
10. Browser tab title = restaurant name — `DocumentTitleManager.jsx`
11. SC-GST label 8.99 → 9% — `OrderSuccess.jsx` reads `restaurant.service_charge_tax`
12. False network-loss warning — `ReviewOrder.jsx` lines 1208–1216
13. OrderSuccess "Yet to confirm" / Browse Menu gating — `OrderSuccess.jsx` lines 501–505
14. Menu API prefetch (Hybrid A+B) — `useMenuData.js`, `LandingPage.jsx`, `DiningMenu.jsx`, `StationCard.jsx`
15. Menu item no-image placeholder removed — `MenuItem.jsx`, `MenuItem.css`
16. No-image ADD/quantity alignment (Option C Hybrid) — `MenuItem.jsx`, `MenuItem.css`
17. Category section header UX (brand accent + divider) — `MenuItems.css`
18. Category nav tile placeholder → first-letter fallback — `CategoryBox.jsx`, `CategoryBox.css`
19. Category tile theme tint fix (token-level `color-mix`) — `index.css`, `CategoryBox.css`

## Runtime-validated on live preview (2026-05-07)
- `/716`, `/716/stations`, `/716/menu/FOOD%20MENU` — blue brand `#62b5e5`, title "Hyatt Centric", restaurant logo favicon.
- 11 category-nav tiles render initials only (B, I, B, I, D, S, S, S, A, W).
- 11 section headers carry brand-accent `border-left rgb(98,181,229)`.
- 84 no-image item cards in compact layout; 1 image card unchanged.
- Compulsory popup shows OK-only dismiss (no countdown).
- `--color-primary-pale` resolves to `color-mix(in srgb, #62b5e5 12%, white)` — no pink.
- `/478` keeps default orange `#E8531E` theme with local favicon.

## Backlog (not in this sprint)
- B1 Sticky-on-scroll category section headers
- B2 Lift `--color-primary-light/-darker/-darkest` to `color-mix`
- B3 First-time visitor brand flash
- B4 Image `loading=lazy` + RestaurantConfigContext memoisation
- B5 Backend route restructuring
- B6 Admin-side stale-config refresh trigger
- B7 2-character category initials for same-letter clusters

## Pending user-side verification (preview lacks a live cart/order)
Issues 1, 3, 4, 5, 11, 12, 13 are code-correct but need one manual end-to-end run on a real 716 device.

## Notes
- `frontend/yarn.lock` is currently untracked. Recommend committing it for build reproducibility before pushing.
- No remote is configured for the branch; use Emergent "Save to GitHub" to push.
