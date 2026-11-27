# QA HANDOVER — CR-2026-11-26-001 (Picker Redesign)

**ID:** CR-2026-11-26-001-REDESIGN
**Title:** Replace broken shadcn Popover+Command picker with custom CSS-first grouped searchable dropdown
**Status:** QA
**Implemented:** 2026-11-27
**Risk:** LOW
**Build:** PASS (yarn build, 0 errors)
**Design source:** design_guidelines.json (CR-2026-11-26-001-REDESIGN)

---

## What Changed

| Edit | File | What |
|---|---|---|
| R-E-1a | `AdminBannersPage.jsx` | Removed shadcn Popover+Command imports; added `useEffect` to React import; added `IoSearchOutline`, `IoChevronDownOutline`, `IoCheckmarkOutline`, `IoCloseCircleOutline` to io5 import |
| R-E-1b | `AdminBannersPage.jsx` | Added `pickerSearch` state, `pickerContainerRef` ref, `GROUP_CONFIG` array, `filteredOptions` derived from search, `useEffect` for outside-click + Escape close |
| R-E-1c | `AdminBannersPage.jsx` | Replaced Popover+Command JSX with custom `position:absolute z-60` dropdown: trigger with animated chevron, search bar, sticky group headers with count badges, blue selected state, group colour dots, loading/empty states |
| CSS-1 | `AdminPages.css` | Appended ~200 lines of `.admin-picker-*` CSS — matches admin form design tokens exactly |

**What did NOT change:** MenuItems.jsx (E-2a–d still correct), PromoBanner.jsx, server.py, all other files.

---

## Test Login

Admin: `owner@18march.com` / `Qplazm@10` → navigate to `/478/admin/banners`

---

## QA Test Cases

### Core UI (visual design from design_guidelines.json)

| ID | Steps | Expected |
|---|---|---|
| V-01 | Open Banners page → check "Tap Destination" field | Trigger button: same height/bg/border as "Display On" select. Animated chevron on right. |
| V-02 | Click trigger | **Floating dropdown opens ABOVE "Add Banner" button — does NOT push it off-screen** |
| V-03 | Inspect open state | Three groups: `STATIC PAGES` / `CATEGORIES` / `ITEMS` — uppercase, muted grey headers with count badge |
| V-04 | Inspect group dots | Grey dot (Static Pages), Blue dot (Categories), Amber dot (Items) |
| V-05 | Hover an item | Background `#f1f5f9`, dark text. No green. |
| V-06 | Select "Full Menu" | Blue `#eff6ff` background, `#1d4ed8` text, blue checkmark. No green. |
| V-07 | Check path preview | `→ /478/menu` shown below trigger in monospace grey |

### Interaction

| ID | Steps | Expected |
|---|---|---|
| V-08 | Type "po" in search input | Only matching categories/items/pages shown. Clear × button appears. |
| V-09 | Click × clear | Search cleared, all options shown again |
| V-10 | Click outside dropdown | Picker closes cleanly. "Add Banner" button still visible. |
| V-11 | Press Escape | Picker closes. |
| V-12 | Select a category → save banner | `bannerLink = /{rid}/menu?section={catId}` stored |
| V-13 | Select an item → save banner | `bannerLink = /{rid}/menu?item={itemId}` stored |
| V-14 | Re-open existing banner with category link | Trigger shows category name as selected with blue highlight |
| V-15 | POS data still loading | Spinner shown in list body. Static Pages still selectable. |

### Regression

| ID | Check | Expected |
|---|---|---|
| R-01 | "Display On" select (same form) | Unchanged — still native select |
| R-02 | Add banner flow end-to-end | Save/edit/delete still works |
| R-03 | Customer taps banner linked to `?section=` | Menu still scrolls to category (MenuItems.jsx E-2b unchanged) |
| R-04 | Customer taps banner linked to `?item=` | Menu still scrolls to item (MenuItems.jsx E-2c/d unchanged) |
