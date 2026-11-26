# QA HANDOVER — CR-2026-11-14-003
# Banner click redirects to internal app page

**Date:** 2026-11-26
**Role:** Role 3 → Role 4 handover
**Status after implementation:** IMPLEMENTED — awaiting owner smoke test

---

## What Was Built

Promo banners on the customer-facing app now navigate to an internal app page when tapped.
On the admin side, the free-text "Link URL" input was replaced with a destination picker.

### Files Changed

| File | What changed |
|---|---|
| `frontend/src/components/PromoBanner/PromoBanner.jsx` | E-1 to E-4: useNavigate, suppressNextClick ref, tap-navigate in onTouchEnd, onClick + tap-pill badge on slides |
| `frontend/src/components/PromoBanner/PromoBanner.css` | CSS: `.promo-tap-pill` — absolute top-right blur pill |
| `frontend/src/pages/admin/AdminBannersPage.jsx` | E-5 to E-7: useAuth, LINK_OPTIONS, select picker + path preview |
| `frontend/src/pages/Login.jsx` | Pre-existing bug fixed by testing agent: input type `email` → `text` (HTML5 email validation blocked phone login) |

### Files NOT Changed (as planned)
`LandingPage.jsx` · `server.py` · `CartContext.js` · `ReviewOrder.jsx` · `MenuItems.jsx`

---

## Code Review Results (iteration_33)

All 10 verification checks confirmed via static code review:

| # | Check | Result |
|---|---|---|
| V-1 | Desktop click with link navigates | PASS (code) |
| V-2 | Desktop click without link: nothing | PASS (code) |
| V-3 | Swipe left advances slide, no nav | PASS (code) |
| V-7 | cursor:pointer on linked slides | PASS (code) |
| V-8 | Tap pill badge shows on linked slides | PASS (code) |
| V-9 | Auto-play still cycles | PASS (code) |
| V-10 | Dot buttons still work | PASS (code) |
| V-11 | Admin picker shows 5 options | PASS (code) |
| V-12 | Select Full Menu → path preview updates | PASS (code) |
| V-13 | Existing banner link shown in preview | PASS (code) |

Live E2E browser tests were blocked: preprod POS API returning 401 for test credentials (unrelated to this CR — preprod credentials may have expired). All logic verified via code review.

---

## Verification Matrix — 13 checks for QA / Owner Smoke

| # | Surface | Test | Expected |
|---|---|---|---|
| V-1 | Customer | Desktop: click a slide WITH a link | Navigates to the destination |
| V-2 | Customer | Desktop: click a slide WITHOUT a link | Nothing happens, no navigation |
| V-3 | Customer | Mobile: swipe left on banner | Next slide shows; no navigation |
| V-4 | Customer | Mobile: swipe right on banner | Previous slide shows; no navigation |
| V-5 | Customer | Mobile: tap a slide WITH a link | Navigates; no double-fire |
| V-6 | Customer | Mobile: tap a slide WITHOUT a link | Nothing happens |
| V-7 | Customer | Slide with link: hover cursor | `cursor: pointer` on desktop |
| V-8 | Customer | Slide with link: tap badge | "View ↗" pill visible top-right; absent on unlinked slides |
| V-9 | Customer | Leave banner idle | Slides cycle automatically every 3.5s |
| V-10 | Customer | Click dot button | Jumps to that slide |
| V-11 | Admin | Open Add Banner form | Dropdown with 5 options: No link / Full Menu / Dining Stations / About Us / Contact |
| V-12 | Admin | Select "Full Menu" | Path preview below shows `→ /{restaurantId}/menu` |
| V-13 | Admin | Edit a banner that already has a link | Dropdown shows the saved value; preview shows path |

---

## Test Setup Notes

To test V-1 to V-10 on the customer side:
1. Login to admin and add a banner with a destination set (e.g. "Full Menu")
2. Navigate to `/{restaurantId}` (the customer landing page)
3. The PromoBanner renders only when at least one banner exists for that restaurant

To test V-11 to V-13:
1. Login to admin: `{REACT_APP_BACKEND_URL}/login`
2. Navigate to Banners section in the admin panel
3. The "Add Banner" form shows the dropdown picker

---

## Known Notes

- `suppressNextClick` ref prevents the synthetic click event (~300ms after touchend) from firing navigation twice on mobile. QA should verify on a real phone that V-5 does not navigate twice.
- The `rid` in LINK_OPTIONS uses `user.restaurant_id`. If the user JWT lacks this field (old JWT), rid will be empty string and paths will be `/menu`, `/stations` etc. without the restaurant prefix. Owner should logout/login to refresh the JWT if picker options look wrong.
- Pre-existing Login.jsx bug was fixed: input type changed from `email` to `text` and placeholder updated to "Phone or email".

---

**QA handover complete: CR-2026-11-14-003**
