# OPEN ISSUE — Brand theme "flash" on hard refresh

**Date:** 2026-05-06
**Status:** 🟡 OPEN — investigation complete, awaiting product/tech approval before implementation
**Branch context:** `hyatt-fixes-7-may` @ `735c07d`
**Files of interest (read-only at handover):**
- `frontend/public/index.html` — pre-React HTML shell
- `frontend/src/index.css` — global `:root` CSS variables (lines 3–195)
- `frontend/src/index.js` — React bootstrap
- `frontend/src/App.js` — provider tree (line 59)
- `frontend/src/context/RestaurantConfigContext.jsx` — config + theme injection (lines 122–305)
- `frontend/src/constants/theme.js` — `DEFAULT_THEME` literal hex colors
- `frontend/src/pages/LandingPage.jsx` — inline-style fallback (lines 33, 523, 568, 700, 714, 737)

> ⚠️ No code changes have been made for this issue. This document is the investigation handover only.

---

## A. Root cause

On a hard refresh, the page paints **twice**:

1. **First paint** uses CSS variable values declared in `:root { ... }` of `frontend/src/index.css`. Those values are the **MyGenie brand defaults** (`#E8531E` orange, `#FFFFFF` white, `#000000` black). They paint **before** any JavaScript executes.
2. **Second paint** happens after React mounts → `LandingPage` `useEffect` fires → `fetchConfig(restaurantId)` runs → `loadConfigFromCache` (sync, only if cache hit) **or** API response (async) → a `useEffect` in `RestaurantConfigContext` calls `document.documentElement.style.setProperty('--color-primary', config.primaryColor)` etc. → browser repaints with restaurant brand colors.

For a Hyatt-Centric (rid `716`, brand = blue/teal), this means the user sees **MyGenie orange** for a brief window (~50 ms cache-hit / 100–600 ms cache-miss-but-API-fast / longer if network slow) before the page snaps to the correct brand.

There is a **secondary cause** that compounds the flash on the landing page specifically: **JSX inline `style={{ backgroundColor: btnColor }}`** on 4 buttons in `LandingPage.jsx`, where `btnColor = configPrimaryColor || DEFAULT_THEME.primaryColor` (L523). Inline styles bypass CSS variables — so even if a future fix sets `--color-primary` synchronously, those 4 buttons would still read orange from `DEFAULT_THEME.primaryColor` until React re-renders with the loaded config.

A localStorage cache (`restaurant_config_${restaurantId}`) **already exists** (lines 131–153) and is consulted, but **only inside `fetchConfig`, which runs in a `useEffect` AFTER first paint.** The cache infrastructure is ready; it's just consulted too late.

---

## B. Evidence with file/line references

### B.1 CSS-level fallbacks in `frontend/src/index.css`

| Line | CSS variable | Default value | Brand impact |
| :---: | --- | --- | --- |
| 7 | `--color-primary` | `#E8531E` (MyGenie orange) | Buttons, links, accents across **38 component CSS files** |
| 8 | `--color-primary-dark` | `#2E7D32` (MyGenie green) | Hover/active states |
| 9 | `--color-primary-light` | `#F4845F` | Light accents |
| 10 | `--color-primary-darker` | `#C44518` | Pressed states |
| 11 | `--color-primary-darkest` | `#8B3112` | — |
| 12 | `--color-primary-pale` | `#FADBD8` | Pale orange wash |
| 41 | `--bg-primary` | `#ffffff` | Page background |
| 52 | `--text-primary` | `#000000` | Body text |
| 53 | `--text-secondary` | `#333333` | Subtitles |
| 57 | `--button-text-color` | `#ffffff` | Button labels |
| 58 | `--text-link` | `#E8531E` | Links |
| 59 | `--text-link-hover` | `#C44518` | Link hover |
| 62–65 | `--text-blue-light/medium/dark/hero` | `#F4845F`/`#C44518`/`#5A1D0E`/`#E8531E` | Variants of orange (legacy "blue" naming) |
| 74 | `--border-primary` | `#E8531E` | Primary borders |
| 84 | `--font-heading` | `'Big Shoulders', sans-serif` | All headings |
| 85 | `--font-body` | `'Montserrat', sans-serif` | All body text |
| 153 | `--radius-button` | `var(--radius-md)` (`8px`) | Buttons |

Body styles (line 203–210) use `var(--bg-secondary)` (`#f5f5f5`) for background and `var(--text-primary)` (`#000000`) for text.

### B.2 JS-level fallbacks in `frontend/src/constants/theme.js`

```js
export const DEFAULT_THEME = {
  primaryColor: '#E8531E',
  secondaryColor: '#2E7D32',
  buttonTextColor: '#FFFFFF',
  backgroundColor: '#FFFFFF',
  textColor: '#333333',
  textSecondaryColor: '#666666',
};
```

### B.3 Runtime CSS variable injection — `RestaurantConfigContext.jsx`

`useEffect` at lines 209–305 sets the following CSS variables on `document.documentElement` once `config` updates:

| Variable | Source | Falls back to |
| --- | --- | --- |
| `--color-primary`, `--text-link`, `--border-primary`, `--text-blue-hero`, `--color-primary-darker`, `--color-primary-darkest`, `--text-blue-dark`, `--text-blue-medium`, `--text-blue-light` | `config.primaryColor` (only set if truthy — L213) | **CSS `:root` default** |
| `--color-primary-dark`, `--text-link-hover` | `config.secondaryColor` (only if truthy — L227) | **CSS `:root` default** |
| `--button-text-color` | `config.buttonTextColor` | `DEFAULT_THEME.buttonTextColor` |
| `--bg-primary` | `config.backgroundColor` | `DEFAULT_THEME.backgroundColor` |
| `--text-color`, `--text-primary` | `config.textColor` | `DEFAULT_THEME.textColor` |
| `--text-secondary-color`, `--text-secondary` | `config.textSecondaryColor` | `DEFAULT_THEME.textSecondaryColor` |
| `--font-heading` | `config.fontHeading` (mapped) | `'Poppins'` |
| `--font-body` | `config.fontBody` (mapped) | `'Poppins'` |
| `--radius-button` etc. | `config.borderRadius` (mapped) | **CSS `:root` default** |

### B.4 LocalStorage cache — already exists, consulted too late

`RestaurantConfigContext.jsx:128`
```js
const getConfigCacheKey = (restaurantId) => `restaurant_config_${restaurantId}`;
```

`RestaurantConfigContext.jsx:155–177` (`fetchConfig`):
```js
const fetchConfig = useCallback(async (restaurantId) => {
  if (!restaurantId || restaurantId === configRestaurantId) return;
  // Load from cache FIRST (instant brand colors)
  const hasCached = loadConfigFromCache(restaurantId);
  // Then fetch from API to get latest...
  ...
});
```

`fetchConfig` is invoked from **inside route components' `useEffect`**, e.g.:
- `LandingPage.jsx:147` — `useEffect(() => { if (restaurantId) fetchConfig(restaurantId); }, ...)`
- `MenuItems.jsx:137`, `ReviewOrder.jsx:117`, `OrderSuccess.jsx:362`, `AboutUs.jsx:17`, `ContactPage.jsx:16`, `FeedbackPage.jsx:21`

Because `useEffect` runs **after the first commit/paint**, the cache cannot help the first frame. The cache *does* prevent flicker on **subsequent** state updates within the same session.

### B.5 JSX inline-style fallback — `LandingPage.jsx`

```js
// L33  destructure
const { ..., primaryColor: configPrimaryColor, buttonTextColor: configButtonTextColor, ... } = useRestaurantConfig();

// L523
const btnColor = configPrimaryColor || DEFAULT_THEME.primaryColor;     // → '#E8531E' until config loads

// L568, L700, L714, L737 — 4 buttons render with inline orange
<button style={{ backgroundColor: btnColor, color: btnTextColor }}>...</button>
```

These 4 inline-style usages are the most user-visible because they are the **call-to-action buttons** on the landing page (`Browse Menu`, `Edit Order`, `Continue`, etc.). Even if a synchronous boot script fixed CSS variables, these buttons would still flash orange until React re-renders with the loaded config (an extra render tick after the cache hit).

### B.6 `frontend/public/index.html`

No inline `<style>` block, no preload of theme. `theme-color` meta is hardcoded to `#000000` (line 7), used by mobile browser chrome (Safari notch / Android nav bar) — out of scope for this issue but worth noting as a separate item.

### B.7 Provider/route tree — `App.js`

```jsx
<QueryClientProvider>
  <AuthProvider>
    <RestaurantConfigProvider>     ← config state lives here, but useState is initialized to DEFAULT_CONFIG (no localStorage read)
      <Router>
        <Routes>
          <Route path="/:restaurantId" element={<LandingPage />} />   ← restaurantId only available inside the route
```

The `restaurantId` is **only known after** React mounts and `BrowserRouter` matches — the provider above the router cannot read it synchronously.

---

## C. Fallback inventory table

| Surface | Where set | Fallback chain | When it applies | Visibility on hard refresh |
| --- | --- | --- | :---: | :---: |
| `:root --color-primary` | `index.css:7` | `#E8531E` (MyGenie orange) | Pre-JS first paint | 🔴 Always visible |
| `:root --bg-primary`, `--bg-secondary` | `index.css:41,42` | `#ffffff`, `#f5f5f5` | Pre-JS first paint | 🟡 OK (white is brand-neutral) |
| `:root --text-primary`, `--text-secondary` | `index.css:52,53` | `#000000`, `#333333` | Pre-JS first paint | 🟡 Mostly OK (dark on light is universal) |
| `:root --font-heading`, `--font-body` | `index.css:84,85` | `'Big Shoulders'`, `'Montserrat'` | Pre-JS first paint | 🟡 Brand-specific font flash possible |
| `:root --radius-button` etc. | `index.css:153–159` | `8px` (rounded) | Pre-JS first paint | 🟢 Layout-affecting, mild |
| JSX inline `btnColor` on 4 LandingPage buttons | `LandingPage.jsx:523` | `DEFAULT_THEME.primaryColor` = `#E8531E` | First React render, until config loads | 🔴 Highly visible (CTA buttons) |
| `setProperty('--button-text-color', ... \|\| DEFAULT_THEME...)` | `RestaurantConfigContext.jsx:234` | `DEFAULT_THEME.buttonTextColor` = `#FFFFFF` | After config load (loop closes the gap) | 🟢 Acceptable (white text on any brand color) |
| `setProperty('--text-color', textColor \|\| DEFAULT_THEME.textColor)` | `RestaurantConfigContext.jsx:241–243` | `DEFAULT_THEME.textColor` = `#333333` | After config load | 🟢 Acceptable |
| AdminSettings color pickers default | `AdminSettings.jsx:689,696,...` | `DEFAULT_THEME.*` | Inside admin panel only | 🟢 N/A (admin-only) |

**Total CSS files referencing `var(--color-primary)`:** 38 (count via `grep -rl`). Removing the fallback in `:root` would unstyle every one of them on first paint — that's why option 4 of your suggestions ("remove unsafe fallbacks") is unsafe by default.

---

## D. Current config loading sequence (timeline)

| t (approx) | Event | Visible state |
| --- | --- | --- |
| 0 ms | Browser parses `index.html`, fetches `index.css` | Blank `<div id="root">` |
| 5–20 ms | `:root` CSS variables applied | First paint: **MyGenie orange** brand defaults |
| 20–100 ms | JS bundle downloads + parses | Same — defaults still |
| ~100 ms | `index.js` runs → `<App>` mounts → providers mount | React tree exists, but `useEffect`s haven't run; `config` state = `DEFAULT_CONFIG` (all `null`); 4 LandingPage buttons render orange via inline style |
| ~100–110 ms | `LandingPage` `useEffect` runs (after commit) → `fetchConfig(restaurantId)` | Triggers cache load |
| ~110 ms | `loadConfigFromCache` (sync) → `setConfig(cached)` | Triggers re-render and CSS-var `useEffect` |
| ~115 ms | `useEffect` calls `document.documentElement.style.setProperty(...)` for primary, secondary, fonts, radius | **Brand colors applied** — flash ends (~115 ms total visible) on a cache hit |
| 200–800 ms | API call resolves → `setConfig({...DEFAULT_CONFIG, ...data})` → useEffect runs again | Latest values applied (no second flash, just a refinement) |

**Cache miss timeline** (first ever visit to that restaurant): step "loadConfigFromCache" returns false; the effect waits for the API response. Flash window = 200–800 ms typical, longer on flaky networks.

---

## E. Is this CSS, context-loading, or API timing?

**All three contribute, in this order of impact:**

1. **CSS-level (largest contributor on cache miss):** `:root` declares hardcoded MyGenie orange that paints before any JS runs. This is unavoidable for the very first frame unless a synchronous mechanism injects per-restaurant values **before** the CSS-vars-driven first paint.
2. **Context-loading-level (largest contributor on cache hit):** Cache exists and works, but is read inside a `useEffect`, which runs after first paint. Even on a returning visitor, you still get one frame of orange.
3. **API timing (only for cache miss):** Adds 200–800 ms of orange on top of the cache-load flash.

In the React-Router-with-dynamic-restaurant-id architecture, the **provider can't read the restaurantId synchronously at mount**, so the only way to get cached brand values into the very first paint is to **bypass React** and run a tiny synchronous boot script in `index.html` that reads localStorage based on `window.location.pathname` and sets the relevant CSS variables on `document.documentElement` **before** React renders.

---

## F. Proposed safe fix options

### Option 1 (RECOMMENDED) — Synchronous cached-theme boot script + minor JSX cleanup

**Three coordinated changes.** Estimated total: ~50 lines, 4 files, all additive (no behavioural change for users without cache).

**F.1 Add a tiny inline `<script>` to `frontend/public/index.html`** that runs *before* React mounts:
- Parse the first path segment from `window.location.pathname` as `restaurantId`.
- `localStorage.getItem('restaurant_config_<rid>')` → JSON.parse.
- For each color the existing `useEffect` sets, call `document.documentElement.style.setProperty(...)` with the cached value.
- Wrap in try/catch; on any failure silently fall through to the existing CSS `:root` defaults (zero regression).

This single addition fixes the **first-paint flash** for every returning visitor. It is well-known anti-flash technique used by Material-UI, Chakra, Next-themes, etc.

**F.2 In `RestaurantConfigContext.jsx`**, change `useState(DEFAULT_CONFIG)` to a synchronous initializer that **also** reads localStorage based on the URL path, so the first React render already has the cached `config` (eliminating the orange flash on the 4 inline-style LandingPage buttons too). Pseudocode:

```js
const [config, setConfig] = useState(() => {
  try {
    const rid = window.location.pathname.split('/').filter(Boolean)[0];
    if (rid) {
      const cached = localStorage.getItem(`restaurant_config_${rid}`);
      if (cached) return { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
    }
  } catch (_) { /* ignore */ }
  return DEFAULT_CONFIG;
});
const [configRestaurantId, setConfigRestaurantId] = useState(() => {
  try {
    const rid = window.location.pathname.split('/').filter(Boolean)[0];
    if (rid && localStorage.getItem(`restaurant_config_${rid}`)) return rid;
  } catch (_) {}
  return null;
});
```

This eliminates the second-tick re-render dance for the 4 inline-style buttons on `LandingPage.jsx`.

**F.3 (Optional, light)** Replace the 4 inline `style={{ backgroundColor: btnColor }}` patterns in `LandingPage.jsx` with `style={{ backgroundColor: 'var(--color-primary)', color: 'var(--button-text-color)' }}`. This makes them follow CSS variables, so the script in F.1 alone is enough to fix them — no React re-render needed. **Skip this if scope must stay extra-tight; F.1+F.2 alone resolves the flash.**

**Expected net result:**
- Cache hit (returning visitor): **zero visible flash** — first paint already in brand.
- Cache miss (first-ever visit to a restaurant): **flash unchanged** — short orange window until API responds. Acceptable (cache is now warmed for next visit).
- API failure: existing CSS `:root` fallbacks still render the page; no crash, no blank screen.
- Admin updates a brand color → `refreshConfig()` (already exists, lines 180–206) clears the localStorage entry and re-fetches → next refresh shows new colors. **No stale-cache risk** because the existing `refreshConfig` path already invalidates the cache.

### Option 2 — Neutral skeleton until config loads

Render a `null` / spinner / brand-neutral skeleton in `LandingPage` while `configLoading === true`. **Rejected** because:
- It introduces a visible "loading" state on every navigation (worse UX than the current 50–115 ms orange flash on a warm cache).
- It can't fix the pre-React first paint — the body background is still `var(--bg-secondary)` from CSS, regardless.
- The existing `configLoading` flag is already set to `false` when there is a cache hit (`setConfigLoading(!hasCached)` on line 162) — so even today the page wouldn't show a skeleton on cache hit.

### Option 3 — Move CSS variable application earlier

Already happening: `index.css` is loaded synchronously before JS. The values themselves are the issue, not the timing. **Rejected** as it doesn't address root cause.

### Option 4 — Remove or standardise unsafe CSS fallbacks

Removing the fallbacks (e.g., changing `--color-primary: #E8531E` to `--color-primary:` (empty)) would leave 38 CSS files with **transparent/black** primary color on the first frame for users without a cache. **Strictly worse.** Keeping the fallbacks is correct; the fix is to override them earlier. **Rejected.**

---

## G. Recommended option

**Option 1**, with sub-step F.3 deferred unless explicitly approved. This is the **same anti-flash pattern shipped by Next-themes, MUI, Chakra**, and matches the cache infrastructure already in this codebase.

Why F.1 + F.2 (without F.3) is enough:
- F.1 fixes pre-React paint for cache hits.
- F.2 fixes the first-React-render orange on the 4 inline-style buttons in LandingPage by hydrating React state synchronously from the same cache.
- F.3 is a polish step: switches the inline styles to CSS vars so future code doesn't re-introduce the inline-style flash. Not strictly required, can ship in a later cleanup.

---

## H. Exact files likely to change (Option 1, F.1 + F.2)

| File | Change | LOC est. | Risk |
| --- | --- | :---: | :---: |
| `frontend/public/index.html` | Insert `<script>` block in `<head>` (before any other script) that reads URL → localStorage → sets `--color-primary`, `--bg-primary`, `--text-primary`, `--text-secondary`, `--button-text-color`, `--font-heading`, `--font-body`, plus the `--text-link`, `--border-primary`, `--text-blue-*` aliases that the runtime effect sets, and the radius map. Wrapped in try/catch. | ~35–45 (mostly the radius/font maps, mirrors `RestaurantConfigContext.jsx:209–305`) | Low (try/catch falls through to existing `:root` defaults) |
| `frontend/src/context/RestaurantConfigContext.jsx` | Change `useState(DEFAULT_CONFIG)` → lazy initializer that reads cache (~10 lines). Same pattern for `configRestaurantId`. No change to `fetchConfig`/`refreshConfig` flow. | ~12–15 | Low (additive; cache miss still falls through) |
| `frontend/src/constants/theme.js` *(if needed for F.1)* | Export the same map keys the boot script reads, to keep one source of truth. Optional — could be inlined in the script. | 0–10 | Low |
| **(F.3 only — optional)** `frontend/src/pages/LandingPage.jsx` | 4 inline `style` props switched from `btnColor` JS variable to `'var(--color-primary)'` string. The `btnColor` local can stay for any non-CSS-var consumer or be removed. | ~5–8 | Low (CSS-var-driven; same visual result post-load) |

**Estimated total (F.1 + F.2 only):** ~50 lines across 2–3 files.

**Files NOT touched** (per strict scope):
- `useNotificationPopup.js`, `NotificationPopup.jsx` (closed popup fix)
- `OrderSuccess.css`, `OrderSuccess.jsx` (closed scroll fix; closed admin-message fix)
- All payment / GST / service charge / delivery charge / cart / scanner / room / session / order-placement code
- `backend/server.py` and any backend file (no backend change is required — the cache & schema are already client-side)

---

## I. Risks and validation plan

### I.1 Risks

| Risk | Likelihood | Mitigation |
| --- | :---: | --- |
| Boot script throws → blocks page render | Low | Wrap entire script in `try { ... } catch (_) {}`; existing CSS `:root` defaults remain. |
| Cached colors are stale after admin updates brand | Low | `refreshConfig` (already exists) clears the cache entry on save. Worst case: one extra refresh shows the new colors. |
| `localStorage` blocked (Safari private mode) | Low | `try/catch` already in code; falls through to existing path. |
| Cache contains malformed JSON | Low | `JSON.parse` inside `try`, catch silently → defaults. |
| Path parsing incorrect for nested routes (e.g., `/716/menu`, `/716/order-success`) | Low | First path segment after `/` is always the `rid` per `App.js` route table. Validated against all 13 routes. |
| Cache poisoning by attacker | Negligible | Cache is per-origin, same-origin sandboxed. Worst case the user sees attacker's brand colors on their own browser only. |
| F.2 lazy initializer runs in SSR / no-window environments | N/A | This is a CRA SPA, not SSR. `window` always defined. |
| Color flash now hidden but CSS-vars still race for components NOT yet in viewport | Low | Repaint is global, all components see the new value once `setProperty` runs. |
| Existing Jest tests assert on `DEFAULT_THEME.*` literals | Low | None found in current test suite (`__tests__/pages/OrderSuccess.test.js` checked). |

### I.2 Validation plan (matching your 5 cases)

**Test fixture setup:**
- Restaurant `716` is the canonical Hyatt restaurant in DB (`primaryColor` set to a non-orange brand color in admin config — verify via `GET /api/config/716`).
- Restaurant `689` (currently no brand colors set) for "no brand override" baseline.

**Pre-condition for test cases 1, 2, 5:** Visit `/716` once to warm the localStorage cache, then proceed.

| # | Case | Steps | Expected result |
| - | --- | --- | --- |
| 1 | Hard refresh on restaurant 716 (cache hit) | Cache warm → reload `/716` (Ctrl+Shift+R) | **No** orange flash. First paint already shows Hyatt brand colors. Title/buttons render correctly. |
| 2 | Normal navigation between pages | `/716` → click Browse Menu → `/716/menu` → back to landing | Brand colors stable across all transitions; no flash; no jitter. |
| 3 | Missing config / failed API | Throttle network or block `/api/config/689` | Page still renders with safe `:root` defaults. No crash. No infinite loading. |
| 4 | Mobile viewport | Repeat case 1 on 390×844 viewport | No unstyled flash, no layout shift, no horizontal scroll. |
| 5 | Admin brand color update | Login as restaurant 716 admin → change `primaryColor` to a new value → save → `refreshConfig` runs → reload `/716` | Hard refresh shows the **new** color (cache was invalidated by `refreshConfig`). No stale color. |
| 6 (regression) | First-ever visit (cache miss) on restaurant 716 | `localStorage.clear()` → reload `/716` | Same flash duration as today (not worse). Cache populated for next visit. |
| 7 (regression) | Order Success page rendering | Navigate through full order flow on cached restaurant | No regression in OrderSuccess hero (last fix), popup, scroll behavior. |

**Automated checks:**
- `eslint /app/frontend/src/context/RestaurantConfigContext.jsx`
- HTML validator on `index.html` for the inline script.
- Playwright timeline trace on hard refresh: capture frames at t=0, t=50ms, t=100ms, t=200ms; confirm no orange frame on a warmed cache.

---

## J. Approval required before implementation

The investigation is complete. **No code has been changed.** Before I edit anything, please confirm the following 4 items:

1. **Option choice:** Approve **Option 1**? (Recommended.)
2. **Sub-step F.3:** include now (cleaner, +5–8 LOC), or defer (4 inline styles untouched, slightly less robust against future regressions)?
3. **Boot-script colour set:** I propose mirroring exactly the variables that the existing `useEffect` (lines 209–305 in `RestaurantConfigContext.jsx`) sets — i.e., primary + 9 aliases, secondary + 2 aliases, button-text, bg, text-primary/-color, text-secondary/-color, font-heading, font-body, and the 6 radius vars. This gives 1:1 parity. Confirm?
4. **Strict-scope confirmations:** I will not touch payment/GST/SC/delivery/cart/scanner/room/session/order-placement code, the 3 closed bugfixes, or backend. Implementation will be confined to **`frontend/public/index.html` + `frontend/src/context/RestaurantConfigContext.jsx`** (+ `LandingPage.jsx` only if F.3 is approved). Confirm scope is acceptable?

Once I receive a green light on the 4 items above, I'll implement and validate per §I.2 in a single tight commit.

---

## K. Why this was not implemented yet

Per your task brief: *"Do not implement immediately. First investigate and report exact root cause + proposed fix."*  Investigation: complete. Implementation: pending your approval on §J.
