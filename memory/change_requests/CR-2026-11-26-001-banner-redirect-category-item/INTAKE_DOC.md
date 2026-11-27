# INTAKE DOC — CR-2026-11-26-001

**ID:** CR-2026-11-26-001
**Type:** CR (scope extension of CR-2026-11-14-003)
**Title:** Banner tap destination — extend picker to support specific menu category or specific menu item (not just static pages)
**Registered:** 2026-11-26
**Status:** INTAKE
**Priority:** P2
**Risk:** MEDIUM

---

## 1. Owner Request (verbatim, 2026-11-26)

> "banner tap redirection should redirect to specific item and category also — dont edit code"

Screenshot shows current admin picker with 5 static options:
- No link
- Full Menu
- Dining Stations
- About Us
- Contact

Owner wants: **specific category** (e.g. "Po", "Beverages") and **specific menu item** (e.g. "melo fish", "Classic Burger") as linkable destinations.

---

## 2. Classification

**Type:** CR — feature extension
**Parent CR:** CR-2026-11-14-003 (SMOKE) — implemented static destinations only
**Severity:** P2 — existing static destinations still work; this adds deeper linking
**Risk:** MEDIUM — requires fetching live category/item list from POS API; dynamic picker; ?section= param must be supported

---

## 3. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| CR-2026-11-14-003 | Banner click → static internal pages | PARENT (scope extension, not duplicate) |

CR-2026-11-14-003 delivered static destinations. This CR adds dynamic deep-link destinations.

---

## 4. Current State (code reality)

**CR-2026-11-14-003 delivered:**
```js
// AdminBannersPage.jsx — static LINK_OPTIONS
const LINK_OPTIONS = [
  { label: 'No link',         value: '' },
  { label: 'Full Menu',       value: `/${rid}/menu` },
  { label: 'Dining Stations', value: `/${rid}/stations` },
  { label: 'About Us',        value: `/${rid}/about` },
  { label: 'Contact',         value: `/${rid}/contact` },
];
```

**What is NOT supported today:**
- `/{rid}/menu?section={categoryId}` — scroll to / filter by category
- `/{rid}/menu?item={itemId}` — scroll to or highlight specific item

**?section= param support in MenuItems.jsx:** NOT implemented (confirmed in CR-2026-11-14-003 planning). Must be investigated as part of Planning for this CR.

---

## 5. Impact Scope (preliminary)

**Files likely to change:**

| File | Why |
|---|---|
| `frontend/src/pages/admin/AdminBannersPage.jsx` | Replace static `<select>` with two-level picker: Static Pages / Category / Item. Fetch live category/item list from POS on mount. |
| `frontend/src/pages/MenuItems.jsx` | May need to add `?section=catId` or `?item=itemId` URL param handling to scroll/filter on load |
| `frontend/src/pages/LandingPage.jsx` | May need similar `?section=` handling if banner can appear on landing page too |

**Files WILL NOT change:**
- `PromoBanner.jsx` — already navigates to `promo.link` via React Router; no change needed
- `server.py` — `bannerLink` field already exists in DB model
- `CartContext.js`, `ReviewOrder.jsx` — untouched

---

## 6. Open Questions — Must Be Answered Before Planning

1. **Category deep-link UX:** When customer taps a banner linked to "Po" category, should the app:
   - Option A: Open menu and **scroll** to the "Po" category (smooth scroll)
   - Option B: Open menu and **filter** to show only "Po" items (like a category tab click)
   - Option C: Open menu and **highlight** the category header

2. **Item deep-link UX:** When banner links to "melo fish":
   - Option A: Scroll to the item in the full menu
   - Option B: Show a modal/detail card for that item

3. **Admin picker UX:** How should the admin pick category/item?
   - Option A: Two additional dropdowns (Destination Type → Category/Item, then which one)
   - Option B: Single grouped dropdown with sections (-- Static Pages --, -- Categories --, -- Items --)
   - Option C: Searchable text field that auto-suggests categories and items

4. **?section= param:** Currently NOT supported in MenuItems.jsx. Must this CR add it, or is a scroll-based approach preferred?

5. **Live data source:** Category and item list must be fetched from POS. Which endpoint?
   - `REACT_APP_API_BASE_URL/restaurant-product/{restaurantId}` already used by MenuItems — reuse?
   - Or a lighter endpoint?

---

## 7. Risk Assessment

| Factor | Assessment |
|---|---|
| Money path | NO |
| Auth | NO |
| Data change | NO (bannerLink already a free string in DB) |
| Hotspot file | MEDIUM — MenuItems.jsx is a hotspot (1200+ lines, touched by 5 items in Nov) |
| Dynamic POS data | MEDIUM — admin picker needs live category/item list; loading/error states needed |
| URL param support | MEDIUM — `?section=` or `?item=` params not currently handled; risk of regression |

**Risk: MEDIUM**

---

## 8. Owner Decisions — ANSWERED 2026-11-27

| Q | Decision |
|---|---|
| Q1 — Category UX | **A** — scroll to that category in the full menu |
| Q2 — Item UX | **A** — scroll to the item in the full menu |
| Q3 — Admin picker UX | **B + searchable** — one grouped dropdown (Static Pages / Categories / Items) with type-to-filter search |
| Q4 — URL param | **A** — `?section={categoryId}` and `?item={itemId}` in MenuItems.jsx |
| Q5 — POS data source | **A** — reuse `restaurant-product/{rid}` via `useMenuSections` hook |

---

## 9. Status

**PLANNING COMPLETE. See PLANNING_DOC.md. Awaiting owner approval for Implementation.**

---

**Intake complete: CR-2026-11-26-001**
Classification: CR (scope extension)
Severity: P2 | Risk: MEDIUM
Duplicate check: DISTINCT (parent: CR-2026-11-14-003)
Evidence: screenshot + code reality check
Blast radius: MEDIUM (AdminBannersPage.jsx + MenuItems.jsx URL param handling)
Decisions: Q1–Q5 answered 2026-11-27
Next: Owner approval → Implementation (Role 3)
