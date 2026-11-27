# QA HANDOVER — CR-2026-11-26-001

**ID:** CR-2026-11-26-001
**Title:** Banner tap destination — grouped searchable picker + ?section=/?item= deep-link
**Status:** QA
**Implemented:** 2026-11-27
**Risk:** MEDIUM
**Build:** PASS (yarn build, 0 errors)

---

## What Changed

| Edit | File | What |
|---|---|---|
| E-1a | `AdminBannersPage.jsx` | Added imports: `useMenuSections`, `Popover/PopoverContent/PopoverTrigger`, `Command/CommandInput/CommandList/CommandEmpty/CommandGroup/CommandItem` |
| E-1b | `AdminBannersPage.jsx` | Fetches live POS menu via `useMenuSections(null, numericRid)`; builds `ALL_LINK_OPTIONS` grouped into Static Pages / Categories / Items |
| E-1c | `AdminBannersPage.jsx` | Replaced static `<select>` with `Popover` + `Command` grouped searchable picker; legacy custom-URL banners show as "Custom: {url}" read-only |
| E-2a | `MenuItems.jsx` | Added `useSearchParams` to react-router-dom import |
| E-2b | `MenuItems.jsx` | Reads `?section={catId}` and `?item={itemId}` params; one-shot `useEffect` after menu loads → calls `handleCategoryClick` for section, then `scrollIntoView` for item |
| E-2c | `MenuItems.jsx` | Wrapped `<MenuItem>` in `<div data-item-id={item.id}>` in search/flat render path |
| E-2d | `MenuItems.jsx` | Wrapped `<MenuItem>` in `<div data-item-id={item.id}>` in normal sectioned render path |

**What did NOT change:** PromoBanner.jsx, useMenuData.js, server.py, CartContext.js, ReviewOrder.jsx, any CSS.  
**PromoBanner already navigates to `promo.link` via React Router — no change needed.**

---

## Test Login

Admin: `owner@18march.com` / `Qplazm@10` (restaurant 478 — 18march)

---

## QA Test Cases

### Admin picker (requires admin login → Banners page)

| ID | Steps | Expected |
|---|---|---|
| V-01 | Admin → Banners → Add Banner → click "Tap Destination" | Popover opens. Three groups visible: Static Pages / Categories / Items |
| V-02 | Type "bev" in search input | Only options matching "bev" shown across all groups |
| V-03 | Pick a category from Categories group → check path preview | Preview shows `→ /{rid}/menu?section={catId}` |
| V-04 | Pick an item from Items group → check path preview | Preview shows `→ /{rid}/menu?item={itemId}` |
| V-05 | Pick "Full Menu" from Static Pages → save banner | `bannerLink = /{rid}/menu` unchanged |
| V-06 | Pick "No link" → save banner | `bannerLink = ''` (empty), no preview hint |
| V-07 | Open an existing banner that had a custom free-text URL | Trigger shows "Custom: {url}", value preserved after save |
| V-08 | Pick category → save → re-open banner for edit | Picker shows the saved category name correctly |

### Customer deep-link (navigate directly to URL or tap banner)

| ID | Steps | Expected |
|---|---|---|
| V-09 | Navigate to `/{rid}/menu?section={catId}` | Menu opens, scrolls to and filters to that category |
| V-10 | Navigate to `/{rid}/menu?item={itemId}` | Menu opens, filters to item's section, scrolls to item |
| V-11 | Navigate to `/{rid}/menu` (no params) | Menu opens normally — no category filter, no scroll effect |
| V-12 | Navigate to `/{rid}/menu?section=UNKNOWN_ID` | Menu opens normally at "All Items" — no crash |
| V-13 | Navigate to `/{rid}/menu?item=UNKNOWN_ID` | Menu opens normally at "All Items" — no crash |
| V-14 | On menu page, tap a category tab manually after deep-link | Category click still works normally — no interference |

### Regression

| ID | Check | Expected |
|---|---|---|
| R-01 | Normal menu browse (no URL params) | Category tap / scroll / filter unchanged |
| R-02 | Search flow | Search results still render correctly with `data-item-id` wrappers |
| R-03 | Existing static destinations (Full Menu, Stations, etc.) | Still work via PromoBanner navigate — unchanged |
| R-04 | POS data load failure in admin picker | Shows only Static Pages group, no crash |
| R-05 | Admin saves banner with category destination → customer taps → cart unaffected | Cart state unchanged by deep-link |

---

## Known Limitation

V-03 / V-04 deep-link tests require the banner to be saved first and then accessed via the customer-facing preview URL. The `?section=` / `?item=` URL can also be tested directly in the browser address bar using a known `categoryId` from the POS menu.
