# Document Audit Status
- Source File: FEAT-003-NOTIFICATION-POPUP.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Partially Verified
- Confidence: High
- Last Reviewed Areas: frontend/src/components/NotificationPopup/NotificationPopup.jsx, frontend/src/hooks/useNotificationPopup.js, frontend/src/context/RestaurantConfigContext.jsx, frontend/src/context/AdminConfigContext.jsx, backend/server.py
- Notes: Rewritten to reflect the implemented popup capability and the current config-driven model.

# FEAT-003: Notification Popup

## Current Feature Position
Configurable notification popups are **implemented** in the current codebase.

## Where the Feature Exists
### Frontend runtime
- `NotificationPopup.jsx`
- `useNotificationPopup.js`

### Config source
- `RestaurantConfigContext.jsx`
- `AdminConfigContext.jsx`
- backend `AppConfigUpdate` in `server.py`

### Pages using the feature
Verified in code:
- landing page
- review order page
- order success page

---

## Current Supported Popup Model
### Page targets
Current code supports:
- `landing`
- `review`
- `success`

### Popup variants
Current code supports:
- `modal`
- `banner`
- `toast`

### CTA actions
Current code supports:
- dismiss
- internal navigate
- external link

### Optional content fields observed in code
- `title`
- `message`
- `imageUrl`
- `ctaText`
- `ctaLink`
- `ctaAction`

### Optional style fields observed in code
- `position`
- `type`

---

## Visibility / Timing Behavior
Verified in `useNotificationPopup.js`.

### Selection logic
- selects first enabled popup where `showOn === page`

### Delay logic
- uses `delaySeconds`
- defaults to 3 seconds if unset

### Auto-dismiss logic
- uses `autoDismissSeconds`
- if > 0, starts countdown and dismiss timer

### Re-trigger keying
- popup visibility re-evaluates using a derived `popupKey`

---

## Rendering Behavior by Type
### Modal
- overlay + dismiss on overlay click
- optional image, CTA, countdown

### Banner
- inline banner with close button
- optional image, CTA, countdown

### Toast
- compact popup with close button
- optional image, CTA, countdown

**Status:** Verified in code

---

## Config Plumbing
### Backend support
Verified in `server.py`.

`AppConfigUpdate` includes:
- `notificationPopups: Optional[List[dict]]`

Default backend config also returns:
- `notificationPopups: []`

### Frontend consumption
`RestaurantConfigContext.jsx` exposes:
- `notificationPopups`

`AdminConfigContext.jsx` includes:
- `notificationPopups` in admin config model/defaults

**Important note**
The admin configuration data path supports this feature, but the exact admin editing UI for popup content/config was not fully inspected in this pass.

---

## Implemented vs Partial
| Area | Status | Notes |
|---|---|---|
| Runtime popup component | Implemented | Verified |
| Delay + auto-dismiss | Implemented | Verified |
| Page targeting | Implemented | landing/review/success |
| Config field support backend/frontend | Implemented | Verified |
| Full admin authoring UX documentation | Partial | config support verified; exact authoring controls not fully mapped here |

---

## Key Caveats
1. Only the first matching enabled popup for a page is shown by current hook logic.
2. Popup behavior depends on config objects being well-formed; no strict schema enforcement beyond general dict/list handling was identified.
3. This is a config-driven feature, so production behavior depends on backend-stored config quality.

---

## Open Questions
1. Should multiple popups per page be supported in sequence, or is first-match intentional long term?
2. Should popup config have stronger validation/schema enforcement?
3. Should admin UI include previews for modal/banner/toast variants?

## Needs Backend Clarification
- desired schema guarantees for popup configuration
- whether popup analytics/tracking is needed

## Assumption Made
- The runtime behavior is considered the source of truth for feature support, even if admin authoring details were not exhaustively mapped in this pass.

---

## What changed from previous version
- shifted from feature-spec style to implementation-grounded reference
- explicitly documented current page targets, popup types, CTA behavior, and timer logic
- downgraded unverified admin-authoring detail instead of assuming it exists fully

## Unverified items
- exact admin UI used to manage popup arrays and nested content/style fields
- whether production config currently uses all supported popup variants

## Follow-ups recommended
1. Add a dedicated popup-config schema doc if this feature grows.
2. Document admin authoring UX once fully traced.
3. Consider preview/validation support for popup configs.