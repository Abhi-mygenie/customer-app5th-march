# QA HANDOVER — CR-2026-10-12-001
## Remove Emergent branding — title, meta description, favicon, theme-color

**From:** Role 3 — Implementation Agent · **Date:** 2026-10-12
**Plan followed:** `IMPACT_ANALYSIS_AND_PLAN.md` + `IMPACT_ANALYSIS_AND_PLAN_theme-color.md` (Option A). Owner opened gate by selecting Implementation role; recommended values used.
**Build:** `yarn build` PASS. Dev server restarted (CRA caches `public/index.html`).

## What changed — `frontend/public/index.html` only (6 insertions, 3 deletions)
| Before | After |
|---|---|
| `<meta name="theme-color" content="#000000">` | `#E8531E` (app `--color-primary`) |
| `<meta name="description" content="A product of emergent.sh">` | `Scan, order and pay at your favourite restaurant` |
| — (no icon) | `<link rel="icon" type="image/svg+xml" href="%PUBLIC_URL%/assets/images/mygenie_logo.svg">` |
| — | `<link rel="apple-touch-icon" href="%PUBLIC_URL%/assets/images/ic_login_logo.png">` |
| `<title>Emergent \| Fullstack App</title>` | `<title>MyGenie</title>` |
Marker: `<!-- CR-2026-10-12-001 … -->` above the block.
**Untouched (verify):** `emergent-main.js` script, PostHog `ap.emergent.sh` init, DataCloneError shim, Razorpay, fonts, all `src/`.

## Self-test (Role 3)
| # | Check | Result |
|---|---|---|
| 1 | Served HTML via preview URL contains all 5 new values | PASS |
| 2 | `build/index.html` carries them with `%PUBLIC_URL%` resolved to `/assets/images/…` | PASS |
| 3 | Both icon URLs → 200, correct content-type (`image/svg+xml`, `image/png`) | PASS |
| 4 | Platform scripts still present in served HTML (2 refs) | PASS |
| 5 | Headless DOM: `document.title === "MyGenie"`, `link[rel=icon].href` resolved, `meta[theme-color] === "#E8531E"` | PASS |
| 6 | Landing `/689` renders | **BLOCKED — environment**: POS preprod `preprod.mygenie.online/api/v1/web/restaurant-info` timing out (15 s, no response) at test time; page stays on skeleton. Our `/api/config/689` → 200. Not related to this change (static HTML). Re-check when POS is back |

## QA cases
| # | Case | Expected |
|---|---|---|
| Q1 | `curl <preview>/` | title `MyGenie`; description; theme-color `#E8531E`; 2 `<link>` tags; `emergent-main.js` + `ap.emergent.sh` still present |
| Q2 | Open `/689` (when POS is up) | tab icon = MyGenie logo; title "MyGenie" → restaurant name after `DocumentTitleManager` runs |
| Q3 | Non-restaurant route (`/login`) | title stays "MyGenie" |
| Q4 | Mobile Safari / Android Chrome (owner smoke — not headless-testable) | browser bar tinted orange-red, not black; "Add to Home Screen" shows `ic_login_logo.png` |
| Q5 | Link preview (WhatsApp/Slack paste of preview URL) | description "Scan, order and pay at your favourite restaurant" (no OG tags exist — description is what unfurlers fall back to) |
| Q6 | Regression: app boots, Razorpay script loads, no console errors from `index.html` | unchanged |

Exit: Q1–Q3, Q6 PASS → SMOKE_BRIEF (Q4/Q5 are owner-smoke steps).
