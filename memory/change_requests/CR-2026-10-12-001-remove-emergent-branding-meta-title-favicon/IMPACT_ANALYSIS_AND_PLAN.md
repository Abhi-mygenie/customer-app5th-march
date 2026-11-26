# IMPACT ANALYSIS — CR-2026-10-12-001
## Remove Emergent branding — `<title>`, meta description, favicon

**Written by:** Role 2 — Planning Agent · **Date:** 2026-10-12 · **Status:** COMPLETE — awaiting owner wording + gate

## Code Reality Check
| Item | Location | Status |
|---|---|---|
| `<meta name="description" content="A product of emergent.sh" />` | `public/index.html` L7 | ✅ CONFIRMED |
| `<title>Emergent \| Fullstack App</title>` | L25 | ✅ CONFIRMED |
| No `<link rel="icon">` / `apple-touch-icon` / `manifest.json` anywhere | L1–28; `public/` has no `manifest.json`, no favicon | ✅ CONFIRMED |
| Platform scripts present and must stay: `emergent-main.js` (L27), PostHog `ap.emergent.sh` (L42–112), DataCloneError shim (L26) | | ✅ CONFIRMED — out of scope |
| `DocumentTitleManager` sets `document.title` to restaurant name on restaurant routes, `MyGenie` elsewhere | `DocumentTitleManager.jsx` L20, L34, L39 | ✅ CONFIRMED — static `<title>` only matters pre-hydration, non-restaurant routes, and crawlers/link previews |
| Candidate icon assets | `public/assets/images/mygenie_logo.svg`, `ic_login_logo.png` | ✅ EXIST |
| `theme-color` is `#000000` | L6 | present; not in CR scope (flag only) |

## Data flow / consumers
Static HTML shell. Consumers: browser tab (pre-hydration), search engines, WhatsApp/iMessage/Slack link unfurls (description; no OG tags exist), iOS "Add to Home Screen" (apple-touch-icon). No JS reads these tags.

## Risk
**LOW** — static markup, no logic. Not a hotspot file. CRA injects `%PUBLIC_URL%` at build; tags must use `%PUBLIC_URL%/assets/images/…`.

## Files
- WILL change: `frontend/public/index.html` only (title, description, +2 `<link>` tags)
- WILL NOT touch: `DocumentTitleManager.jsx`, any `src/`, platform scripts, Razorpay/fonts tags, `theme-color`, `.env`

## Owner decisions (required before gate)
| # | Decision | Recommended |
|---|---|---|
| 1 | `<title>` | `MyGenie` (matches `DEFAULT_TITLE` so no flash on hydration) |
| 2 | Meta description | `Scan, order and pay at your favourite restaurant` |
| 3 | Favicon | `mygenie_logo.svg` as `rel="icon" type="image/svg+xml"`; `ic_login_logo.png` as `apple-touch-icon` (iOS ignores SVG) |
| 4 | (optional, out of scope) `theme-color` → MyGenie orange `#E5800A`? | Not in CR; say yes to add as scope extension |

## Verification matrix
| # | Case | Expected |
|---|---|---|
| 1 | `curl /` → HTML | contains `<title>MyGenie</title>`, new description, two `<link rel=…>` with resolved asset paths |
| 2 | Hard-load any route | tab shows MyGenie icon; title "MyGenie" then restaurant name on restaurant routes |
| 3 | `curl -I` on both icon URLs | 200 |
| 4 | Platform overlay / PostHog still load | scripts unchanged (diff shows only 4 lines touched) |
| 5 | `yarn build` | clean; build/index.html carries the tags |

---

# IMPLEMENTATION PLAN — CR-2026-10-12-001

**Fast Lane eligible** (LOW, 1 file, ≤6 lines, no logic) if owner approves Fast Lane.

1. `public/index.html` L7: description → owner-approved text. Marker as HTML comment `<!-- CR-2026-10-12-001 -->` on the changed block.
2. L25: `<title>MyGenie</title>` (or owner wording).
3. After L7 add:
   `<link rel="icon" type="image/svg+xml" href="%PUBLIC_URL%/assets/images/mygenie_logo.svg" />`
   `<link rel="apple-touch-icon" href="%PUBLIC_URL%/assets/images/ic_login_logo.png" />`
4. Self-test: curl HTML + both asset URLs; one screenshot of tab/landing.
5. QA spot-check (matrix) → SMOKE_BRIEF → owner smoke. Dev server picks up `public/` changes on reload; no restart needed.
