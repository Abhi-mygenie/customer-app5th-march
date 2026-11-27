# CR-2026-11-26-001 V2 — QA Handover

**Role 3 (Implementation) — complete, local commit `9e38a0b` on `main` (unpushed).**
Depends on `PLANNING_DOC_V2.md`.

## What shipped (E-1 → E-9)

| ID | File | Change |
|---|---|---|
| E-1 | `MenuItems.jsx` | `deepLinkAppliedKey = useRef('')` keyed by `${station}|${section}|${item}` — re-fires on every URL change, never double-applies same key. Separate `deepLinkProbeKey` ref guards cross-station probe. |
| E-2 | `MenuItems.jsx` | Deep-link effect calls `setSelectedCategory(...)` directly (no toggle). `?section=` runs one smooth `window.scrollTo` for the category header (100 ms). `?item=` runs one smooth `scrollIntoView({block:'center'})` on the item at 350 ms — no competing category scroll. |
| E-3 | `MenuItems.jsx` | On current-station miss, probes other stations via `queryClient.fetchQuery(buildMenuSectionsQueryOptions(rid, stationId))` sequentially; on hit → `navigate('/{rid}/menu/{owningStation}?...', { replace: true })`. |
| E-4 | `MenuItems.jsx` | `highlightedItemId` state + `highlightTimerRef` ref. Applied as `className="menu-item-pulse"` on BOTH data-item-id wrappers (normal + search render paths). Timer cleared on unmount. |
| E-5 | `MenuItems.jsx` | When `?section` and `?item` are both absent, effect is a no-op — static-page navigation unchanged. |
| E-6 | `AdminBannersPage.jsx` | Picker uses new `useAllStationsMenuSections(numericRid)`. Options stored as `/{rid}/menu/{stationId}?section=<catId>` or `?item=<itemId>`. Labels prefixed with `<stationName> — ` only when the same label appears in >1 station. |
| E-7 | `AdminBannersPage.jsx` | Legacy saved `bannerLink` (old schema `/{rid}/menu?section|item=...`) resolves to a human label in the trigger via a trailing-suffix match against `ALL_LINK_OPTIONS`. Unknown links fall back to `Custom: …`. |
| E-8 | `useMenuData.js` | New `useAllStationsMenuSections(rid)` hook using `useQueries` — reuses the same cache slot as `useMenuSections(stationId, rid)` so no duplicate network calls. |
| E-9 | `MenuItems.css` | `.menu-item-pulse` keyframe (2 s, `box-shadow` 0→10 px orange, single run) + `scroll-margin-top: 140 px` so sticky header doesn't cover the scrolled item. |

## Smoke evidence captured (main agent)

- `yarn build` → PASS, no new warnings (only pre-existing ones in `Profile.jsx` / `ReviewOrder.jsx`).
- GET `/69/menu?item=248247` (legacy URL, incognito) → **Po category now auto-selected** (previously "All"). Previously-reported Bug 3 symptom confirmed resolved on this path.

## Setup for Role 4 QA

Restaurant **69** (multi-menu: `Po`, `Raom`).

1. Sign in to admin for restaurant 69.
2. Create/edit 2 banners on `/69/admin/banners`:
   - **Banner A — item target in a non-default station.** Pick an item under `Raom`. Save.
   - **Banner B — category target.** Pick category `Po`. Save.
3. Also keep an existing banner whose `bannerLink` uses the **legacy** schema (`/69/menu?section=…` or `/69/menu?item=…`, no station) to test E-7.

## Test cases (table)

| # | Entry | Action | Expected |
|---|---|---|---|
| T1 | `/69` landing | Tap Banner A (item in Raom) | URL becomes `/69/menu/Raom?item=<id>`, `Raom` tab selected, item in viewport, 2 s orange pulse on item |
| T2 | `/69` landing | Tap Banner B (category Po) | URL `/69/menu/Po?section=<id>`, `Po` tab selected, scrolls to Po header |
| T3 | On `/69/menu/Po` | Tap Banner A (item in Raom) | Auto-navigates to `/69/menu/Raom?item=<id>`, Raom tab selected, item pulses |
| T4 | On `/69/menu/Raom` | Tap Banner A (item in Raom) | No navigate, Raom already selected, item scrolls into view and pulses |
| T5 | On `/69/menu/Po` | Tap Banner B (category Po) | Same URL, Po selected, category header scrolls — no reload, no flash |
| T6 | On menu page | Tap A then B rapidly | Both apply in order; no stuck state; second tap is NOT a no-op |
| T7 | Legacy banner `/69/menu?item=<id>` | Tap from landing | Probes stations, auto-switches to owning station, item pulses |
| T8 | Legacy banner `/69/menu?section=<id>` | Tap from landing | Probes stations, auto-switches, category selected |
| T9 | Banner pointing to a deleted item/category | Tap | No crash; menu loads; no toast (silent per scope) |
| T10 | `/69/admin/banners` | Open picker | Shows categories + items from **every** station; grouped, searchable; duplicate labels prefixed with station |
| T11 | `/69/admin/banners` | Re-open a saved banner that uses legacy URL | Trigger shows resolved label (not "Custom: …") when the target still exists |
| T12 | `/69/admin/banners` | Save banner with item target from `Raom` | Stored `bannerLink` = `/69/menu/Raom?item=<id>` (verify in DB / re-open the edit form) |
| T13 | Mobile 390 px viewport | T1–T6 | Picker dropdown readable, no horizontal overflow; item pulse visible |
| T14 | Repeat T1 but with slow network | Tap | Menu loads first (skeleton), then deep-link applies once data arrives. No double-apply. |

## Must-check regressions

- Normal (no `?section|?item`) menu navigation unchanged.
- "All" category tab still works.
- Category toggle-off by tapping the same category tab (user action) still works (`handleCategoryClick` unchanged).
- Search results still show items with pulse class only when `highlightedItemId` matches.

## Known limitations (deferred per scope)

- No toast if target is not found (owner declined).
- No change to `scrollIntoView` positioning for items (`block: 'center'` kept per owner Q1).
- No deep-link to closed stations gating (deferred).

## Files touched

- `frontend/src/pages/MenuItems.jsx`
- `frontend/src/pages/MenuItems.css`
- `frontend/src/pages/admin/AdminBannersPage.jsx`
- `frontend/src/hooks/useMenuData.js`
- `memory/change_requests/CR-2026-11-26-001-banner-redirect-category-item/QA_HANDOVER_V2.md` (this file)

**Commit:** `9e38a0b` on `main`. Local only — awaiting push approval after QA.
