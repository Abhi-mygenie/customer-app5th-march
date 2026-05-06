# Bugfix — Order Success page bottom-scroll trapped on long item lists

**Date:** 2026-05-06
**Status:** ✅ Closed (accepted by user)
**Branch:** `7-may` @ `9ab9781` (pushed 2026-05-06 10:14:01 UTC)
**File changed (only one):** `frontend/src/pages/OrderSuccess.css`

---

## 1. Issue

On the Order Success page, when an order had many items, the user could not scroll all the way to the bottom — the content was effectively trapped before reaching the page footer (Bill Summary, Grand Total, action buttons). Reproduced on mobile viewport.

---

## 2. Root cause

`.order-success-page` was the **only page in the entire app** applying `display: flex; flex-direction: column` to its outermost wrapper alongside `min-height: 100vh`. Every other long-content page (`MenuItems`, `ReviewOrder`, `Profile`, `LandingPage`, `AboutUs`, `ContactPage`, etc.) uses plain block layout on the page wrapper and scrolls correctly with many items.

The flex-column wrapper put the page into a flex formatting context whose base size is 100vh. With the items list expanding past 100vh, the flex algorithm under-reported `scrollHeight` on certain mobile browsers (notably iOS Safari) — visible as "page stops scrolling before bottom".

---

## 3. Fix applied

```diff
@@ frontend/src/pages/OrderSuccess.css, .order-success-page (lines 5-12) @@
   .order-success-page {
     max-width: 600px;
     margin: 0 auto;
     min-height: 100vh;
-    display: flex;
-    flex-direction: column;
     background-color: var(--bg-secondary, #f7f8fa);
   }
```

= **2 lines deleted, 0 added.** CSS-only. Single file. No JSX / component / logic changes.

`.order-success-page` now matches the proven-working pattern used by every other long-content page in the codebase.

---

## 4. Validation accepted

POS API was intercepted with synthetic `get-order-details` payloads to keep `OrderSuccess` mounted during testing.

| Case | Setup | Result |
| --- | --- | --- |
| **Case 1** — Few items, layout sanity | 3 items, desktop viewport | `display: 'block'` ✅ · header & actions visible · layout intact · few-item order looks unchanged |
| **Case 2** — Many items, full bottom scroll | 60 items, desktop viewport | `scrollable: true` · `scrollHeight: 2997 > clientHeight: 1080` · reached `scrollMax = 1917` · bottom **Browse Menu** button fully in viewport (top=1017, bottom=1064, vh=1080) ✅ |
| **Case 3** — Many items, mobile viewport | 60 items, mobile viewport | `scrollable: true` · reached `scrollMax` · bottom action visible · bottom NOT clipped ✅ |

Files NOT changed (confirmed via `git status`):
- Order placement / payment / GST / service-charge / delivery-charge logic — untouched
- Cart / scanner / popup / API logic — untouched
- Backend / schema / admin — untouched
- Other pages — untouched

```
$ git status --short
 M frontend/src/pages/OrderSuccess.css
```

---

## 5. Parked note (out of scope, not for this fix)

During validation a **pre-existing CSS specificity conflict** was discovered between:

- `frontend/src/components/Header/Header.css:2-14` → `.menu-items-header { position: sticky; top: 0; }`
- `frontend/src/pages/MenuItems.css:278-289` → `.menu-items-header { position: relative; ... }`

The MenuItems.css rule loads later in the bundle and, with equal specificity, overrides the sticky behavior **globally** for every page that renders the `Header` component. Verified: `getComputedStyle('.menu-items-header').position === 'relative'` on `/716/menu` (an unmodified page) too, with `top: -500px` after scrolling.

This is **not caused by this fix**, exists identically on the `/menu` page, was reproducible before the fix, and is **explicitly not part of this scope**. Parked as an optional future CSS cleanup — any of the following would resolve it cleanly when prioritised:

- Scope the override: change `MenuItems.css:278-289` to `.menu-items-page > .menu-items-header { ... }`.
- Or remove the duplicate block entirely if no longer needed.
- Or move the override into a media query / utility class.

No action required for this issue.

---

## 6. Status

**Issue closed.** Accepted fix in §3 verified for the three required cases. Pre-existing sticky-header conflict (§5) is parked separately.
