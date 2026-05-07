# PRD — Hyatt / mygenie Customer App (`latest-hyatt-fixes-7-may`)

## Original problem statement
Pull the latest code, build, compile and run from
`https://github.com/Abhi-mygenie/customer-app5th-march.git` (branch
`latest-hyatt-fixes-7-may`). Iterative UI/UX improvements requested by user
across menu loading, menu item card layout, taxes display.

## Architecture
- React frontend (`/app/frontend`) — CRA, React Query for data fetching.
- FastAPI backend (`/app/backend`) — local container; the app talks to
  `https://preprod.mygenie.online/api/v1` directly via
  `REACT_APP_API_BASE_URL`.
- MongoDB (local, supervisor-managed; not actively touched in this session).

## Implemented (May 2026)
1. **Menu API prefetch (Hybrid A + B)**
   - `frontend/src/hooks/useMenuData.js`: exports
     `buildMenuSectionsQueryOptions` for React Query prefetching.
   - `frontend/src/pages/LandingPage.jsx`: idle-time single-menu prefetch.
   - `frontend/src/pages/DiningMenu.jsx`: hover-/touch-time prefetch on
     station cards.
   - `frontend/src/components/StationCard/StationCard.jsx`: wires
     `onPrefetch` to mouse/touch events.

2. **No-image menu item compact card — Hybrid (Option C)**
   - `frontend/src/components/MenuItem/MenuItem.jsx`: detects POS
     `food-default-image` placeholder and renders a compact two-column
     layout — left column has header + optional meta stacked, right column
     is the action area (ADD or Quantity Selector + Customisable pill).
   - `frontend/src/components/MenuItem/MenuItem.css`: card becomes a flex
     row at top level for `.menu-item--no-image`. Right column uses
     `align-self: stretch` + `justify-content: center` so ADD is
     vertically centered against the FULL card height (including meta),
     while staying connected to the left content. Image-present cards are
     untouched. Mobile breakpoints at 768/480/375 retained.

3. **SC-GST label fix on Order Success**
   - `frontend/src/pages/OrderSuccess.jsx`: SC-GST label now uses the
     configured value from `restaurant.service_charge_tax` (e.g. "9%")
     instead of a derived 8.99%.

## Backlog / Future tasks
- **P1**: Category navigation tile placeholders — replace grey
  placeholder boxes with cleaner icons or text-only chips when category
  images are missing (deferred until current MenuItem alignment is
  signed off).
- **P2**: Image performance: add `loading="lazy"` + `decoding="async"`
  on item images and memoize `RestaurantConfigContext` value.
- **P2**: Refactor server.py / backend route layout (not currently
  blocking).

## Health
- Frontend & backend running via supervisor.
- No regressions observed in image-mode cards, cart, or order flow
  during the session.
- No backend/API contract changes.

## Credentials / env
Login phone & password live in `frontend/.env`
(`REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD`). External
preprod APIs are used directly — no JWT auth was modified.
