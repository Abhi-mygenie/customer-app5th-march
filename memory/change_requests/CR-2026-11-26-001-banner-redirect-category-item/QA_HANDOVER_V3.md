# QA Handover V3 — CR-2026-11-26-001

**Date:** 2026-11-27
**Status after this session:** All 7 automated tests PASS. Awaiting owner phone smoke test.

---

## What was fixed this session (V3 + Bug Fix)

| Fix | File | Lines |
|-----|------|-------|
| V3-E1: Default query in `useAllStationsMenuSections` | `useMenuData.js` | 304-339 |
| V3-E2: Null stationId URL builder | `AdminBannersPage.jsx` | 40-62 |
| BUG-FIX: `prevStationIdRef` mount-skip guard | `MenuItems.jsx` | 71-75, 391-399 |

---

## Test setup

- **Admin login:** `kds@thegoankitchen.com` / `Qplazm@10` → restaurant 69 (The Goan Kitchen)
- **Admin route:** `/admin/banners` (login via `/login`, then navigate)
- **Existing banners:** "pink dust" → `/69/menu?section=11200` (raom); "start the fight" → `/69/menu?item=248247`
- **Restaurant landing:** `/69`

---

## T-matrix for owner smoke test

| # | Start | Action | Expected |
|---|-------|--------|---------|
| **T1** | `/69` (wait 4s) | Tap "pink dust" banner | Navigates to `/69/menu?section=11200`; **Raom tab selected**; only Raom items (njo, nol) shown |
| **T2** | `/69/menu` | Tap "pink dust" banner | Same result — Raom tab selected |
| **T3** | `/69/menu?section=11200` | Tap "All" tab | All categories show |
| **T4** | `/69/admin/banners` | Open "Tap Destination" picker | Dropdown shows **Static Pages** (5 entries), **Categories** (po, raom), **Items** (all items from both categories) |
| **T5** | Picker open | Select "raom" category | Preview shows `→ /69/menu?section=11200` |
| **T6** | Save banner, re-open it | — | Trigger label shows "raom" (not "Custom: ...") |
| **T7** | `/69/menu` (no params) | Load page | "All" tab selected by default |

---

## Notes for QA

- T1 is the core regression: **wait at least 3-4 seconds on the landing page before tapping** to allow the idle prefetch to warm the cache. This was the exact scenario where the bug occurred.
- Station switch regression (not in owner matrix): navigate to `/69/menu/Po` then `/69/menu/Raom` — verify category resets on station change.
- Item banner ("start the fight" → `/69/menu?item=248247`) should still scroll and pulse the item. This was not affected by any of these fixes.
