# CR-2026-11-26-001 — Planning (deep-link bug fix pack)

**Role:** Planning (Role 2) — no code
**Date:** 2026-11-29
**Depends on:** `INVESTIGATION_DEEPLINK_BUGS.md` (same folder)

## Owner decisions (locked)

| # | Decision |
|---|---|
| Q1 — Item UX | **Highlight only** — transient 2 s orange pulse on target item. Keep current `scrollIntoView` positioning (centre). No "scroll to top" change. |
| Q2 — Station scope | **Search across all stations and auto-switch.** |
| Q3 — Repeat taps | **Deep-link effect must re-fire every time** `?section=` / `?item=` / `/{station}` changes on the same mount, not one-shot. |

---

## Target behaviour (acceptance)

1. **From landing** → tap banner → menu opens on the correct **station**, correct **category** is selected, correct **item** (if any) is scrolled into view with a 2 s orange pulse highlight. Works whether the current station holds the target or not.
2. **From menu page** (banner tap while already on `/{rid}/menu/{station}`) → URL updates, effect re-fires, target is applied every time; multiple taps in a row all work.
3. **Category deep-link** → correct category is **selected** (not merely rendered first).
4. **Item deep-link** → category of the item is selected; item is scrolled into view and pulses for 2 s.
5. **Auto-switch** → if the URL's station (or the discovered owning station for a plain `?section=` / `?item=`) differs from the current station, the page navigates to the correct station menu once, then applies the deep-link.
6. **Robust to unknown targets** → if a `?section=` / `?item=` cannot be resolved in any station, we silently open the default menu (no toast per current scope).

---

## Impact map (files touched)

| File | Change kind | Why |
|---|---|---|
| `frontend/src/pages/MenuItems.jsx` | modify | Deep-link effect: signature-based re-fire, direct setter (no toggle), single scroll, highlight state; cross-station resolution with auto-navigate. |
| `frontend/src/pages/admin/AdminBannersPage.jsx` | modify | Picker must enumerate **every** station's categories/items (not just the default menu) and store `/{rid}/menu/{station}?section=…` / `?item=…` in `bannerLink`. |
| `frontend/src/hooks/useMenuData.js` | modify | Export `fetchMenuSections` so other callers can probe per-station menus without re-triggering React Query. |
| `frontend/src/pages/MenuItems.css` (or co-located module) | modify | Add `.menu-item-pulse` keyframe animation (2 s orange outline fade). |
| `memory/change_requests/CR-2026-11-26-001-banner-redirect-category-item/` | add | `PLANNING_DOC_V2.md` (this file) + follow-up `QA_HANDOVER_V2.md` after implementation. |

**Non-goals (explicit):** no backend changes, no API change, no change to banner table/schema (reuses `bannerLink`), no visual redesign of the admin picker, no change to scroll offset or scroll positioning for items (owner declined top-scroll).

---

## URL contract (new)

Both admin picker and MenuItems agree on:

```
Static page   : /{rid}/menu                     (e.g. /69/menu)   – unchanged
Category      : /{rid}/menu/{station}?section=<categoryId>
Item          : /{rid}/menu/{station}?item=<itemId>
```

- `{station}` is `menu_name` (the same string `useStations` returns as `station.id`).
- Legacy stored values (`/{rid}/menu?section=…` / `?item=…`, no station segment) must still work — MenuItems falls back to cross-station probe + auto-switch.
- Static pages (`/{rid}/menu`, `/{rid}/stations`, `/{rid}/about`, `/{rid}/contact`, `""`) are unchanged.

---

## Plan — `MenuItems.jsx`

### E-1. Signature-based deep-link effect (replaces one-shot ref)

- Replace `useRef(false)` with `useRef('')` holding the **last-applied key** `` `${effectiveStationId}|${targetSection}|${targetItem}` ``.
- Effect deps unchanged except we read the current key each render. Apply when key ≠ last-applied AND `menuSections.length > 0` AND at least one of `targetSection`/`targetItem` is truthy.
- Clear/update the ref at the end of a successful apply.
- Result: tap→tap→tap on the menu page keeps working; same URL twice doesn't double-fire.

### E-2. Direct setter + single scroll (kills the toggle + the race)

- **`?section=` branch:**
  1. Resolve target `section` across current `menuSections` by `categoryId`.
  2. If not found → run E-3 cross-station probe.
  3. If found: `setSelectedCategory(section.sectionName)` directly (no `handleCategoryClick`, no toggle risk).
  4. Single `window.scrollTo` for the category header on a 100 ms timeout (keep existing offset math).

- **`?item=` branch:**
  1. Resolve target item across current `menuSections`.
  2. If not found → run E-3 cross-station probe.
  3. If found: `setSelectedCategory(section.sectionName)` directly.
  4. One `setTimeout(350 ms)` that **only** runs `document.querySelector('[data-item-id="…"]').scrollIntoView({ behavior: 'smooth', block: 'center' })` — do **not** also scroll to category header (kills the race).
  5. Set `highlightedItemId = targetItem` and clear it after **2000 ms** via a tracked `setTimeout` (store id in a ref so unmount cancels it).

### E-3. Cross-station probe + auto-navigate

- Precondition: target not found in current station's `menuSections`.
- Use `useStations(numericRestaurantId)` (already imported) to get the full station list.
- Iterate station IDs asynchronously using `queryClient.fetchQuery(buildMenuSectionsQueryOptions(rid, stationId))` (React-Query cache-aware; no extra network call if a station's menu is already warm). Stop at first match.
  - Reuses the same cache slot `useMenuSections` consumes — no duplicate fetches, no key drift.
  - Requires `useQueryClient` from `@tanstack/react-query` (already a project dep).
- On match: `navigate('/{rid}/menu/{owningStationId}?section=<cid>' or '?item=<iid>', { replace: true })`.
  - `replace: true` so the user's Back button goes to the previous screen (banner origin), not the pre-switch menu.
  - After navigation, the deep-link effect runs again on the new mount, finds the target in the matching station's `menuSections`, and applies normally.
- No match in any station → log debug + fall through (no toast per scope).

### E-4. Highlight state wiring

- Add `const [highlightedItemId, setHighlightedItemId] = useState(null);`.
- Add `const highlightTimerRef = useRef(null);` to clear timer on unmount or on new highlight.
- In both render paths (normal `line ~1098` and search `line ~967`) add `className={highlightedItemId === String(item.id) ? 'menu-item-pulse' : undefined}` to the `<div data-item-id={item.id}>` wrapper. Keep `data-item-id` intact for the scroll query.
- No MenuItem component change — animation is on the wrapper only.

### E-5. Deep-link effect — static pages pass-through

- When `targetSection` and `targetItem` are both falsy, the effect is a no-op (current behaviour preserved). Reaching `/{rid}/menu` from a static-page banner is handled upstream by `navigate(promo.link)` — already working.

---

## Plan — `AdminBannersPage.jsx`

### E-6. Enumerate all stations' menus in the picker

- Keep current UI shell (custom CSS picker, grouped list, search, selected state, mobile).
- Add a small internal fetcher (either a new hook `useAllStationsMenu(rid)` inside `useMenuData.js` or an inline `useEffect` here) that:
  1. Calls `useStations(rid)` → station list.
  2. For each station, uses `queryClient.fetchQuery(buildMenuSectionsQueryOptions(rid, station.id))` and accumulates results into local state tagged with `stationId`.
  3. Produces `categoryOptions` and `itemOptions` across **all** stations:
     - `value: /{rid}/menu/{stationId}?section=<categoryId>`
     - `value: /{rid}/menu/{stationId}?item=<itemId>`
     - `label`: the same `sectionName` / item `name` as today.
  4. Prefix duplicate category names with the station (`"Po — Snacks"` / `"Raom — Snacks"`) only when the same name appears in >1 station; otherwise leave the label clean.
- Keep `"No link"` and `"Legacy custom URL"` behaviour.

### E-7. Preserve legacy bannerLink display

- If `bannerLink` matches an old station-less schema (`/{rid}/menu?section=…` or `?item=…`), still show the resolved label in the picker if we can locate a matching option by trailing `?section=/?item=` id; otherwise fall through to the existing "Custom URL" row. This keeps already-saved banners readable without migration.

---

## Plan — `useMenuData.js`

### E-8. Export the raw fetcher (if not already imported elsewhere)

- Confirm `fetchMenuSections` is not exported today (private module function). Either:
  - **Option A (preferred):** add `export { fetchMenuSections };` so `MenuItems` and `AdminBannersPage` can probe specific stations via `queryClient.fetchQuery(buildMenuSectionsQueryOptions(...))` (already exported) — no new fetcher needed, just reuse the exported query-options builder. In that case this file **might not need a change** at all.
  - **Option B (fallback):** export a thin `fetchStationMenuSections(rid, stationId)` helper.
- Decision at implementation time based on first-touch of the file.

---

## Plan — CSS (`MenuItems.css` or equivalent)

### E-9. Pulse keyframe

- Add:

```css
@keyframes menu-item-pulse-kf {
  0%   { box-shadow: 0 0 0 0 rgba(255,140,0,0.65); }
  50%  { box-shadow: 0 0 0 8px rgba(255,140,0,0.25); }
  100% { box-shadow: 0 0 0 0 rgba(255,140,0,0); }
}
.menu-item-pulse {
  animation: menu-item-pulse-kf 2000ms ease-out 1;
  border-radius: 8px;            /* matches existing item row rounding */
}
```

- Scope the class to the `<div data-item-id>` wrapper only — zero layout impact.
- Confirm the active brand accent at implementation time; if the house palette is `#f97316` (tailwind orange-500) use that instead of literal `255,140,0`.

---

## Edge cases to cover in implementation + QA

1. Banner stored with legacy schema (no `{station}`) — must resolve via probe and auto-switch.
2. Banner stored with correct `{station}` matching current mount — no navigate, direct apply.
3. Target category hidden by admin `categoryVisibility` → still selected? Clarify: current `menuSections` memo drops hidden categories. If owner hides the category, deep-link to it should **silently fail** (the admin already intentionally hid it). Keep that behaviour — probe will not find it in any station's post-visibility list.
4. Rapid repeat taps (debounce not needed — the signature guard prevents double-apply of the same key; distinct keys always apply).
5. Deep-link during menu refetch (slow network) — effect waits for `menuSections.length > 0` and re-fires after data arrives. Signature ref ensures single apply per key.
6. Cross-station navigate while the user is mid-scroll — `replace: true` + new mount resets scroll position, which is acceptable.
7. iOS Safari single-smooth-scroll — now there's only **one** smooth scroll per deep-link, so the historic race is gone.
8. Highlight timer cleanup on unmount (prevents React warning).

---

## QA checklist (handed to Role 4 after implementation)

**Setup** — restaurant 69 (multi-menu: `Po`, `Raom`). Two admin banners:
- A: destination `Raom → <some item>`
- B: destination `Po → <some category>`

**Scenarios:**

| Entry point | Banner | Expected |
|---|---|---|
| Landing `/69` → tap A (item in Raom, current station Po) | item banner | Auto-switches to Raom, selects that category, scrolls to item, pulses 2 s |
| Landing `/69` → tap B (category in Po) | category banner | Opens `/69/menu/Po`, category Po selected |
| On `/69/menu/Po` → tap A (item in Raom) | item banner | Auto-switches to Raom, selects category, scrolls to item, pulses |
| On `/69/menu/Raom` → tap A (item in Raom) | item banner | No navigate needed, category selected, item pulses |
| On `/69/menu/Po` → tap B (category in Po) | category banner | Category Po selected (direct, no navigate) |
| On menu page → tap A, then tap B rapidly | both | Both applied in order, no stuck state |
| Open legacy saved banner `/69/menu?item=…` (no station) | item banner | Probes stations, navigates to owning station, highlights |
| Target item deleted / not found anywhere | item banner | Lands on default menu, no crash, no toast |
| Target category hidden by admin | category banner | Opens menu, no crash, no selection (category intentionally hidden) |
| Admin picker | — | Shows categories + items from **every** station, searchable, grouped; saves station-prefixed URL |
| Admin picker — reopen a legacy saved banner | — | Displays the saved label (old or new schema) in the trigger |
| Mobile 390 px width | — | Picker dropdown renders without horizontal overflow; highlight pulse is visible on item row |

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `queryClient.fetchQuery` probing N stations slows deep-link apply | Low (N ≤ ~10; usually cached) | React-Query cache dedupes; probe only runs when current-station lookup misses. |
| Category auto-switch confuses user who expected to stay in current station | Low (explicitly owner-requested) | Behaviour is the owner's Q2 choice; QA validates. |
| Legacy `/{rid}/menu?item=…` saved banners break during rollout | Medium | Explicit fallback probe handles the legacy schema (E-3). |
| Pulse animation janks on low-end Android | Low | `box-shadow` + 2 s single play — cheap. No transform. |
| `replace: true` breaks Back navigation | Low | Acceptable per design: Back goes to banner origin (landing or wherever the user came from before the single tap). |
| Hidden categories deep-linked by old banners | Low | Silent no-op matches admin intent. |
| Admin picker now runs N-station fetches on open → slower mount | Low | Uses React Query cache; cached slots on subsequent opens. Loading state kept. |

---

## Rollout plan

1. Role 3 (implementation) implements E-1 → E-9 in one commit on `main` (local, unpushed).
2. Role 3 runs `yarn build` + one smoke screenshot of admin banner edit page + one of `/69/menu/<station>?item=…`.
3. Role 4 (QA) runs the table above in preview against restaurant 69 as admin owner. Captures evidence screenshots per row.
4. On Role 4 PASS: owner approves push. Then push `main`.
5. On Role 4 FAIL: Role 3 patches, re-runs Role 4; no push until green.

---

## Out of scope / deferred

- Station-timing / availability gating on deep-link target (if target station closed — current behaviour: still render menu; owner may want "closed" toast later).
- Deep-link from external web referrers (QR codes with `?section=` / `?item=`) — the new runtime logic already handles it, but not explicitly tested here.
- Keyboard-focus of the target item for a11y — current scope is visual pulse only.

---

**Awaiting owner approval to proceed to Role 3 (Implementation).**
