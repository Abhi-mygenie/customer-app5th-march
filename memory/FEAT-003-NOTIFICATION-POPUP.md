# FEAT-003: Notification Popup

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-003 |
| **Title** | Configurable Notification Popup |
| **Created** | January 11, 2026 |
| **Last Updated** | January 11, 2026 |
| **Status** | ✅ Done |
| **Priority** | P1 |
| **Depends On** | None |
| **Estimated Effort** | 6-8 hours |
| **Actual Effort** | ~5 hours |

---

## 1. Overview

A configurable popup that appears on landing, menu, review, or success pages. Each page can have its own popup (max 4). Appears after a configurable delay, stays until user closes it or auto-dismisses.

---

## 2. Configuration Schema

Stored in `customer_app_config` collection per restaurant.

```json
{
  "notificationPopups": [
    {
      "id": "popup-uuid",
      "enabled": true,
      "showOn": "landing",
      "delaySeconds": 3,
      "autoDismissSeconds": 0,
      "content": {
        "title": "Special Offer!",
        "message": "Get 20% off on your first order",
        "imageUrl": "/api/uploads/promo.png",
        "ctaText": "Order Now",
        "ctaLink": "/menu",
        "ctaAction": "navigate"
      },
      "style": {
        "position": "center",
        "type": "modal"
      }
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Default | Description |
|-------|------|:--------:|---------|-------------|
| `id` | string | auto | uuid | Unique popup ID |
| `enabled` | bool | yes | false | Master toggle |
| `showOn` | string | yes | — | Which page: `"landing"`, `"menu"`, `"review"`, or `"success"` |
| `delaySeconds` | number | no | 3 | Delay before showing |
| `autoDismissSeconds` | number | no | 0 | Auto-close after N seconds. `0` = manual close only |
| `content.title` | string | **yes** | — | Popup heading |
| `content.message` | string | **yes** | — | Body text |
| `content.imageUrl` | string | no | null | Optional promo image |
| `content.ctaText` | string | no | null | Button text. `null` = no button shown |
| `content.ctaLink` | string | no | null | Button destination |
| `content.ctaAction` | string | no | "navigate" | `navigate` / `dismiss` / `external_link` |
| `style.position` | string | no | "center" | `center` / `bottom` / `top` |
| `style.type` | string | no | "modal" | `modal` (overlay) / `banner` (inline) / `toast` (corner) |

**Only `title` and `message` are mandatory.** Everything else is optional.

### Rules

- **One popup per page** — if multiple popups have same `showOn`, only the first enabled one is shown
- **Every visit** — popup shows on every page visit, no session/day limiting
- **Max 4 popups** — one per page (landing, menu, review, success)

---

## 3. Behavior Flow

```
Page loads → wait {delaySeconds}
  │
  ├── Check: any enabled popup with showOn = current page? → No → skip
  │
  └── Show popup
        │
        ├── User clicks X → dismiss
        ├── User clicks CTA button →
        │     ├── ctaAction = "navigate" → route to ctaLink
        │     ├── ctaAction = "dismiss" → close popup
        │     └── ctaAction = "external_link" → open ctaLink in new tab
        └── autoDismissSeconds > 0 → auto-close after timer, show countdown
```

---

## 4. Implementation (Completed)

### Files Created

| File | Purpose |
|------|---------|
| `hooks/useNotificationPopup.js` | Hook — delay, auto-dismiss, page matching, stale cache re-trigger |
| `components/NotificationPopup/NotificationPopup.jsx` | Popup UI — modal/banner/toast with title, message, image, CTA, close |
| `components/NotificationPopup/NotificationPopup.css` | Styles for all 3 variants and 3 positions |

### Files Modified

| File | Change |
|------|--------|
| `backend/server.py` | Added `notificationPopups` to `AppConfigUpdate` model + default config |
| `context/RestaurantConfigContext.jsx` | Added `notificationPopups: []` to DEFAULT_CONFIG + value |
| `context/AdminConfigContext.jsx` | Added `notificationPopups: []` to defaultConfig |
| `pages/LandingPage.jsx` | Added `<NotificationPopup page="landing" />` |
| `pages/MenuItems.jsx` | Added `<NotificationPopup page="menu" />` |
| `pages/ReviewOrder.jsx` | Added `<NotificationPopup page="review" />` |
| `pages/OrderSuccess.jsx` | Added `<NotificationPopup page="success" />` |
| `pages/admin/AdminSettingsPage.jsx` | Full admin UI with grouped sections, visual selectors |
| `pages/admin/AdminPages.css` | Styles for admin popup config UI |

### Design Decisions

- **Brand colors used throughout**: Title uses `var(--text-color)`, message uses `var(--text-secondary-color)`, CTA uses `var(--color-primary)`, fonts use `var(--font-heading)` and `var(--font-body)`
- **Brand-colored border**: `border: 1px solid var(--color-primary)` on modal, banner, and toast
- **Visual position selector**: Phone mockups showing top/center/bottom bar placement (instead of dropdown)
- **Visual type selector**: Icon-based buttons for Modal/Banner/Toast
- **Toggle switch in header**: Prominent ON/OFF instead of buried checkbox
- **Grouped admin sections**: Content, Display, Timing — clear visual hierarchy
- **Stale cache safety**: Hook uses stable `popupKey` string to ensure re-trigger when config updates

---

## 5. Admin UI

### Layout

```
┌──────────────────────────────────────────────────┐
│  [Landing Page ▾]                   [ON/OFF] [🗑] │
├──────────────────────────────────────────────────┤
│  CONTENT                                          │
│  Title *        [________________________]        │
│  Message *      [________________________]        │
│  Image URL      [________________________]        │
│  Button Text    [________________________]        │
│  Button Link    [__________]  Action [▾ Nav]      │
├──────────────────────────────────────────────────┤
│  DISPLAY              │  TIMING                   │
│  Type  [Modal][Banner][Toast]  Show after [3] sec │
│  Position              │  Auto-close [0] sec      │
│  [Top] [Center] [Btm] │  0 = manual close only   │
└──────────────────────────────────────────────────┘
```

---

## 6. Test Cases (38 Total)

### A. Backend Config

| # | Test | Expected |
|---|------|----------|
| A1 | `GET /api/config/{id}` with no popup configured | Returns `notificationPopups: []` |
| A2 | `PUT /api/config/` with valid popup config | Saves and returns popup in config |
| A3 | `PUT /api/config/` with only title + message (minimum) | Saves successfully — all optional fields null |
| A4 | `GET /api/config/{id}` after save | Returns saved popup data |

### B. Hook Logic (`useNotificationPopup`)

| # | Test | Expected |
|---|------|----------|
| B1 | No popups in config | `isVisible = false`, `popup = null` |
| B2 | Popup enabled for "landing", current page = "landing" | Shows after delay |
| B3 | Popup enabled for "landing", current page = "review" | Does NOT show |
| B4 | Popup disabled (`enabled: false`) | Does NOT show |
| B5 | `delaySeconds: 5` | Popup appears after exactly 5 seconds |
| B6 | `delaySeconds: 3` | Popup appears after exactly 3 seconds |
| B7 | `autoDismissSeconds: 10` | Popup auto-closes after 10 seconds |
| B8 | `autoDismissSeconds: 0` | Popup stays until user closes |
| B9 | User calls `dismiss()` | Popup closes immediately |
| B10 | Multiple popups, same page ("landing") | Only first enabled one shows |
| B11 | 4 popups, one per page | Each page shows its own popup |
| B12 | Page unmount during delay timer | No error, timer cleans up |
| B13 | Page unmount during auto-dismiss timer | No error, timer cleans up |
| B14 | Config updates from cache → API (stale cache) | Popup re-triggers correctly |

### C. Component UI — Modal Variant

| # | Test | Expected |
|---|------|----------|
| C1 | Modal shows with title + message only | Title, message visible. No image, no CTA button |
| C2 | Modal shows with image | Image rendered |
| C3 | Modal shows with CTA button | Button visible with correct text |
| C4 | Click X button | Modal closes |
| C5 | Click backdrop overlay | Modal closes |
| C6 | Click CTA with `ctaAction: "navigate"` | Navigates to `ctaLink` route |
| C7 | Click CTA with `ctaAction: "dismiss"` | Modal closes |
| C8 | Click CTA with `ctaAction: "external_link"` | Opens `ctaLink` in new tab |
| C9 | Respects restaurant `primaryColor` | CTA button + border uses primaryColor |
| C10 | Respects restaurant `borderRadius` | Modal card uses configured radius |
| C11 | Uses `var(--text-color)` for title | Brand text color applied |
| C12 | Uses `var(--text-secondary-color)` for message | Brand secondary color applied |
| C13 | Has `border: 1px solid var(--color-primary)` | Brand-colored border visible |

### D. Component UI — Banner Variant

| # | Test | Expected |
|---|------|----------|
| D1 | Banner at `position: "top"` | Appears at top of page |
| D2 | Banner at `position: "bottom"` | Appears at bottom of page |
| D3 | Banner close button | Dismisses banner |
| D4 | Banner has brand-colored border | `border: 1px solid var(--color-primary)` |

### E. Component UI — Toast Variant

| # | Test | Expected |
|---|------|----------|
| E1 | Toast appears bottom-right | Positioned correctly |
| E2 | Toast auto-dismiss countdown visible | Shows seconds remaining |
| E3 | Toast close button | Dismisses toast |
| E4 | Toast has brand-colored border | `border: 1px solid var(--color-primary)` |
| E5 | Toast does NOT overlap `react-hot-toast` | Separate container, no collision |

### F. Page Integration

| # | Test | Expected |
|---|------|----------|
| F1 | Landing page with popup configured | Popup appears after delay |
| F2 | **Menu page with popup configured** | Popup appears after delay |
| F3 | Review page with popup configured | Popup appears after delay |
| F4 | Success page with popup configured | Popup appears after delay |
| F5 | Page with no popup configured | Nothing shown, no errors |
| F6 | Navigate away and back | Popup shows again (every visit) |
| F7 | Refresh page | Popup shows again |

### G. Admin Settings

| # | Test | Expected |
|---|------|----------|
| G1 | Add popup with title + message only | Saves successfully |
| G2 | Toggle popup enabled/disabled | Reflects on customer-facing pages |
| G3 | Change showOn from "landing" to "menu" | Popup moves to correct page |
| G4 | Visual position selector (top/center/bottom) | Correct position applied |
| G5 | Visual type selector (modal/banner/toast) | Correct type rendered |
| G6 | Max 4 popups (one per page) | Cannot add 5th popup |
| G7 | Delete a popup | Removed from config |

### H. Edge Cases

| # | Test | Expected |
|---|------|----------|
| H1 | Config fetch fails (network error) | No popup, no crash |
| H2 | Popup with invalid/broken imageUrl | Image hidden, title+message still show |
| H3 | Very long title/message text | Scrollable or truncated, no overflow |
| H4 | Config cached in localStorage, popup updated by admin | Fresh config fetched, new popup shown |

---

## 7. Deferred to Next Phase

| Item | Phase |
|------|-------|
| Admin preview before publishing | Next |
| Analytics (impressions/clicks) | Next |
| Scheduling (show between date range) | Future |
| Targeting (by tier, order count, etc.) | Future |
| Multiple popups per page (queue/priority) | Future |

---

*Created: January 11, 2026 | Status: ✅ Done — all 4 pages wired, admin UI complete, brand colors + border applied*
