# INTAKE DOC — CR-2026-11-14-003 (Updated with Owner Decisions)

**ID:** CR-2026-11-14-003  
**Type:** CR  
**Title:** Banner click on landing page redirects to internal app page (menu, category, or item)  
**Registered:** 2026-11-14  
**Updated:** 2026-11-14  
**Status:** INTAKE → READY FOR PLANNING  
**Priority:** P2  
**Risk:** MEDIUM  

---

## 1. Owner Request (verbatim)

> "once you click on banner promotion menu, it should redirect to banner menu"

## Owner Decision (received 2026-11-14)

> "bannerLink will support only for internal app only, you can suggest where all it can redirect within the online ordering page like to the menu, category or item"

---

## 2. Classification

**Type:** CR — UI navigation behaviour  
**Severity:** P2 — Promotional effectiveness improvement; non-blocking  

---

## 3. Current Behaviour

- `PromoBanner.jsx` slides have no `onClick` handler.
- `bannerLink` field exists in DB (backend `server.py` line 243) and is passed from `LandingPage.jsx` (line 959) but is ignored by `PromoBanner.jsx`.
- Clicking a banner currently does nothing.

---

## 4. Supported Internal Link Destinations

Based on `App.js` route inspection (all routes under `/:restaurantId`):

| Destination | Route Pattern | Example | Notes |
|---|---|---|---|
| **Full Menu** | `/:restaurantId/menu` | `/716/menu` | Shows all categories, all items |
| **Menu (Station)** | `/:restaurantId/menu/:stationId` | `/716/menu/3` | For multi-menu restaurants |
| **Menu with Category** | `/:restaurantId/menu?section=<categoryId>` | `/716/menu?section=42` | Scroll-to or filter by category — Planning must confirm if `?section=` param is supported |
| **Dining Stations** | `/:restaurantId/stations` | `/716/stations` | Multi-menu station selector |
| **About Us** | `/:restaurantId/about` | `/716/about` | Static info page |
| **Contact** | `/:restaurantId/contact` | `/716/contact` | Contact page |

**NOT supported (internal admin/auth routes, excluded intentionally):**  
`/admin/*`, `/login`, `/profile`, `/review-order`, `/order-success`, `/delivery-address`

**Recommendation for Admin UX:** The `bannerLink` field in the Admin Banners page should offer a **dropdown/picker** with the destinations above, auto-generating the full relative path (e.g., selecting "Menu" sets `bannerLink` to `/{restaurantId}/menu` automatically, without requiring the admin to know the URL format).

---

## 5. Required Behaviour

**On banner click (not swipe):**
1. If `bannerLink` is set → `navigate(link)` using React Router
2. If `bannerLink` is empty/null → no action (banner is non-interactive)
3. Must NOT trigger on swipe — only on a deliberate tap/click with minimal drag distance

**Visual feedback:**  
- Slides with a `bannerLink` get `cursor: pointer`
- No other visual change needed

---

## 6. Impact Scope

**Files that WILL change:**  
1. `frontend/src/components/PromoBanner/PromoBanner.jsx` — add `onClick` handler, use `link` prop  
2. `frontend/src/pages/admin/AdminBannersPage.jsx` — add link picker/dropdown for destinations  

**Files that WILL NOT change:**  
`LandingPage.jsx` (already passes `link: b.bannerLink`), `server.py` (bannerLink already in model), `CartContext.js`, `ReviewOrder.jsx`

---

## 7. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| None found | — | DISTINCT |

---

## 8. Risk Assessment

| Factor | Assessment |
|---|---|
| Money path | NO |
| Auth | NO |
| Data change | NO (bannerLink already stored; admin can set it today) |
| Hotspot file | NO |
| Swipe conflict | MEDIUM — click handler must check drag distance before navigating |

**Risk: MEDIUM** (swipe-vs-click disambiguation is the main implementation risk)

---

## 9. Status After Owner Decision

Owner confirmed internal links only; destinations mapped.  
**READY FOR PLANNING.**

Fast Lane consideration: `PromoBanner.jsx` change is ~15 lines. With owner approval, this qualifies. Admin Banners page enhancement is a separate scope item.

---

**Intake complete: CR-2026-11-14-003**  
Classification: CR  
Severity: P2 | Risk: MEDIUM  
Duplicate check: DISTINCT  
Evidence: captured  
Blast radius: SMALL (PromoBanner.jsx) + SMALL (AdminBannersPage.jsx)  
Docs: change_requests/CR-2026-11-14-003-banner-click-redirect-menu/INTAKE_DOC.md  
Next: Planning
