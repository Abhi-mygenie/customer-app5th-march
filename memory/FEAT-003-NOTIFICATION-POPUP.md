# FEAT-003: Notification Popup

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-003 |
| **Title** | Configurable Notification Popup |
| **Created** | January 11, 2026 |
| **Status** | Planning Complete — Ready for Implementation |
| **Priority** | P1 |
| **Depends On** | None — can start immediately |
| **Estimated Effort** | 6-8 hours |

---

## 1. Overview

A configurable popup that appears on landing, review, or success pages. Each page can have its own popup. Appears after a configurable delay (3-10 seconds), stays until user closes it or auto-dismisses.

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
| `showOn` | string | yes | — | Which page: `"landing"`, `"review"`, or `"success"` |
| `delaySeconds` | number | no | 3 | Delay before showing (3-10 seconds) |
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

- **One popup per page** — if multiple popups have `showOn: "landing"`, only the first enabled one is shown
- **Every visit** — popup shows on every page visit, no session/day limiting
- Each page (landing, review, success) can have its own different popup

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

## 4. Components

| Component | File | Purpose |
|-----------|------|---------|
| `NotificationPopup` | `components/NotificationPopup/NotificationPopup.jsx` | Popup UI — modal/banner/toast with title, message, image, CTA, close button |
| `NotificationPopup.css` | `components/NotificationPopup/NotificationPopup.css` | Styles for all 3 types (modal, banner, toast) and 3 positions |
| `useNotificationPopup` | `hooks/useNotificationPopup.js` | Hook — finds popup for current page, handles delay timer, auto-dismiss timer |

### Component Props

```jsx
<NotificationPopup
  page="landing"           // current page identifier
  config={appConfig}       // restaurant app config (contains notificationPopups array)
  primaryColor="#E8531E"   // restaurant branding
/>
```

### Hook API

```javascript
const { popup, isVisible, dismiss } = useNotificationPopup({
  page: "landing",
  popups: appConfig.notificationPopups || []
});
// popup = the popup config object (or null)
// isVisible = boolean (after delay)
// dismiss = function to close
```

---

## 5. Pages Modified

| Page | Change |
|------|--------|
| `LandingPage.jsx` | Add `<NotificationPopup page="landing" config={appConfig} />` |
| `ReviewOrder.jsx` | Add `<NotificationPopup page="review" config={appConfig} />` |
| `OrderSuccess.jsx` | Add `<NotificationPopup page="success" config={appConfig} />` |

Minimal change — one line per page. All logic lives in the component + hook.

---

## 6. Backend Changes

### 6.1 Config Model Update (`server.py`)

Add to `AppConfigUpdate` model:

```python
notificationPopups: Optional[List[dict]] = None
```

No new endpoints needed — uses existing `GET /api/config/{restaurant_id}` and `PUT /api/config/`.

### 6.2 Default Config

When `notificationPopups` is not set, default to empty array `[]` (no popups).

---

## 7. Admin Settings (Phase 1 — Simple)

Add a section in `AdminSettingsPage.jsx`:

| Field | Input Type |
|-------|-----------|
| Enable/Disable | Toggle switch |
| Show On | Dropdown: Landing / Review / Success |
| Delay (seconds) | Number input (3-10) |
| Auto-dismiss (seconds) | Number input (0 = off) |
| Title | Text input **(required)** |
| Message | Textarea **(required)** |
| Image | Image upload (optional) |
| Button Text | Text input (optional, leave empty = no button) |
| Button Link | Text input (optional) |
| Button Action | Dropdown: Navigate / Dismiss / External Link |
| Position | Dropdown: Center / Bottom / Top |
| Type | Dropdown: Modal / Banner / Toast |

Admin can add up to 3 popups (one per page).

---

## 8. UI Variants

### Modal (default, `type: "modal"`)
- Centered overlay with backdrop
- Card with title, message, optional image, optional CTA button
- X close button top-right
- Backdrop click dismisses

### Banner (`type: "banner"`)
- Full-width strip at top or bottom of page
- Inline, pushes content
- Close button on right

### Toast (`type: "toast"`)
- Small card in bottom-right corner
- Doesn't block interaction
- Close button

---

## 9. Implementation Checklist

| # | Task | Effort | File(s) |
|---|------|--------|---------|
| 1 | Backend: Add `notificationPopups` to AppConfigUpdate model | 15 min | `server.py` |
| 2 | Backend: Add `notificationPopups: []` to default config response | 15 min | `server.py` |
| 3 | Frontend: Create `useNotificationPopup` hook | 1 hr | `hooks/useNotificationPopup.js` |
| 4 | Frontend: Create `NotificationPopup` component (modal + banner + toast) | 2-3 hrs | `components/NotificationPopup/` |
| 5 | Frontend: Wire into LandingPage, ReviewOrder, OrderSuccess | 30 min | 3 page files |
| 6 | Frontend: Admin popup config UI in settings | 2-3 hrs | `AdminSettingsPage.jsx` |
| 7 | Test: All 3 popup types, all 3 pages, delay, auto-dismiss, CTA actions | 1 hr | — |
| **Total** | | **~6-8 hrs** | |

---

## 10. Test Cases (38 Total)

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
| B11 | 3 popups, one per page | Each page shows its own popup |
| B12 | Page unmount during delay timer | No error, timer cleans up |
| B13 | Page unmount during auto-dismiss timer | No error, timer cleans up |

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
| C9 | Respects restaurant `primaryColor` | CTA button uses primaryColor |
| C10 | Respects restaurant `borderRadius` | Modal card uses configured radius |

### D. Component UI — Banner Variant

| # | Test | Expected |
|---|------|----------|
| D1 | Banner at `position: "top"` | Appears at top of page |
| D2 | Banner at `position: "bottom"` | Appears at bottom of page |
| D3 | Banner close button | Dismisses banner |
| D4 | Banner with CTA | Button works same as modal CTA |

### E. Component UI — Toast Variant

| # | Test | Expected |
|---|------|----------|
| E1 | Toast appears bottom-right | Positioned correctly |
| E2 | Toast auto-dismiss countdown visible | Shows seconds remaining |
| E3 | Toast close button | Dismisses toast |
| E4 | Toast does NOT overlap `react-hot-toast` | Separate container, no collision |

### F. Page Integration

| # | Test | Expected |
|---|------|----------|
| F1 | Landing page with popup configured | Popup appears after delay |
| F2 | Review page with popup configured | Popup appears after delay |
| F3 | Success page with popup configured | Popup appears after delay |
| F4 | Landing page, no popup for this page | Nothing shown, no errors |
| F5 | Navigate landing → menu → back to landing | Popup shows again (every visit) |
| F6 | Popup on ReviewOrder (1600+ lines page) | No performance impact, renders correctly |

### G. Admin Settings

| # | Test | Expected |
|---|------|----------|
| G1 | Add popup with title + message only | Saves successfully |
| G2 | Add popup with all fields filled | Saves all fields |
| G3 | Toggle popup enabled/disabled | Reflects on customer-facing pages |
| G4 | Change showOn from "landing" to "review" | Popup moves to correct page |
| G5 | Set delay to 3, 5, 10 | Delay respected on customer page |
| G6 | Set auto-dismiss to 0, 5, 10 | Behavior matches setting |
| G7 | Upload popup image | Image URL saved and displayed |
| G8 | Max 3 popups (one per page) | Cannot add 4th popup |
| G9 | Delete a popup | Removed from config |
| G10 | Save empty title or message | Validation error — both required |

### H. Edge Cases

| # | Test | Expected |
|---|------|----------|
| H1 | Config fetch fails (network error) | No popup, no crash |
| H2 | Popup with invalid/broken imageUrl | Image gracefully hidden, title+message still show |
| H3 | Popup with `ctaLink` to invalid route | Navigate fails gracefully |
| H4 | Very long title/message text | Scrollable or truncated, no overflow |
| H5 | Rapid page navigation during delay | Timer cleans up, no stale popup |
| H6 | Config cached in localStorage, popup updated by admin | Fresh config fetched, new popup shown |

---

## 11. Deferred to Next Phase

| Item | Phase |
|------|-------|
| Admin preview before publishing | Next |
| Analytics (impressions/clicks) | Next |
| Scheduling (show between date range) | Future |
| Targeting (by tier, order count, etc.) | Future |
| Multiple popups per page (queue/priority) | Future |

---

*Created: January 11, 2026 | Status: Ready for implementation — no blockers*
