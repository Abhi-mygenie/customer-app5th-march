# IMPACT ANALYSIS + IMPLEMENTATION PLAN — CR-2026-10-12-001 · scope extension: `theme-color`

**Written by:** Role 2 — Planning Agent · **Date:** 2026-10-12 · **Status:** COMPLETE — awaiting gate
**Parent:** `IMPACT_ANALYSIS_AND_PLAN.md` (title / description / favicon). This addendum covers decision #4 only.

## Code Reality Check
| Item | Location | Status |
|---|---|---|
| `<meta name="theme-color" content="#000000" />` | `public/index.html` L6 | ✅ CONFIRMED — black, CRA default |
| App default brand primary | `src/index.css` L7 `--color-primary: #E8531E` | ✅ CONFIRMED (MyGenie orange-red) |
| Per-restaurant override: `RestaurantConfigContext` sets `--color-primary` etc. from `config.primaryColor` at runtime | `RestaurantConfigContext.jsx` L309–324 | ✅ CONFIRMED — CSS vars only |
| Anything writing `meta[name=theme-color]` at runtime | grep `src/` | ❌ NONE |
| `design_guidelines.json` primary | `#E8632B` (Review Order redesign spec) | differs from CSS default; CSS is truth (R1) |

## What `theme-color` does
Colours the browser chrome around the page: Android Chrome address bar, Safari 15+ tab/toolbar tint (iOS + macOS), PWA title bar. Today every restaurant's diner sees a **black** bar above a white/orange app — the one visible Emergent/CRA default left after the parent CR.

## Options
| | Option A — static brand colour | Option B — dynamic per restaurant |
|---|---|---|
| Change | `content="#000000"` → `content="#E8531E"` in `index.html` | Keep A as fallback **and** in `RestaurantConfigContext` branding effect: `document.querySelector('meta[name=theme-color]')?.setAttribute('content', config.primaryColor)` when set |
| Files | `public/index.html` (1 attr) | + `RestaurantConfigContext.jsx` (hotspot §6.4) |
| Risk | LOW | MEDIUM (hotspot; affects every restaurant's chrome; needs regression of branding effect) |
| Fits CR-001? | **Yes** — same file, same intent (de-Emergent the shell) | **No** — behaviour change; register as its own CR |
| White-label restaurants (e.g. Hyatt assets in repo) | bar is MyGenie orange even if restaurant primary is navy | bar matches restaurant primary |

**Recommendation:** approve **A inside CR-001** now (LOW, one attribute). Register **B as a new CR** ("Dynamic theme-color from restaurant primaryColor") for later — it is the right long-term answer for white-label but does not belong in a static-HTML housekeeping CR.

## Owner decisions
1. Approve scope extension A into CR-2026-10-12-001 — yes/no.
2. Colour value: `#E8531E` (CSS default, recommended — consistent with what the app renders when no restaurant override) vs `#E8632B` (design-guidelines value).
3. Register Option B as a new CR now — yes/no.

## Files
- WILL change (A): `frontend/public/index.html` L6 only (now 5 touched lines total in CR-001: L6, L7, L25, +2 `<link>`)
- WILL NOT touch: `index.css`, `RestaurantConfigContext.jsx`, any `src/`, platform scripts

## Verification matrix (adds to parent matrix)
| # | Case | Expected |
|---|---|---|
| T1 | `curl /` HTML | `<meta name="theme-color" content="#E8531E" />` |
| T2 | Android Chrome / iOS Safari 15+ on preview | address/tab bar tinted orange-red, not black |
| T3 | Desktop Chrome | no visible change (ignores theme-color) — not a failure |
| T4 | `yarn build` | clean; tag present in `build/index.html` |

## Implementation steps (merge into parent plan step list)
0. Parent steps 1–3 unchanged.
0b. `public/index.html` L6: `content="#000000"` → `content="#E8531E"` (or owner value). Same `<!-- CR-2026-10-12-001 -->` marker block.
4. Self-test: curl HTML for all 5 changes; one mobile-viewport screenshot (theme-color itself is not capturable in a headless screenshot — T2 is an owner-smoke step on a real phone; state this in SMOKE_BRIEF).
5. QA spot-check → SMOKE_BRIEF → owner smoke.

Fast Lane: still eligible (LOW, 1 file, ≤6 lines) if owner grants it.
