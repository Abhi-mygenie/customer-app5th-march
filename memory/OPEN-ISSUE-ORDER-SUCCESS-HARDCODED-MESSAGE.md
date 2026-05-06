# OPEN ISSUE — Order Success message block is hardcoded

**Date:** 2026-05-06
**Status:** 🟡 OPEN — investigation complete, awaiting product decision before implementation
**Branch context:** `7-may` @ `9ab9781` (pushed 2026-05-06 10:14:01 UTC)
**Files of interest (read-only at handover):**
- `frontend/src/pages/OrderSuccess.jsx` — consumer (lines 503–514)
- `frontend/src/pages/admin/AdminSettingsPage.jsx` — admin UI (where new inputs would go)
- `frontend/src/context/RestaurantConfigContext.jsx` / `AdminConfigContext.jsx` — frontend defaults map
- `backend/server.py` — `RestaurantConfig` Pydantic model (lines 200–260)
- `frontend/src/hooks/useNotificationPopup.js` — already-wired alternative (option C below)

> ⚠️ No code changes have been made for this issue. This document is the investigation handover only.

---

## 1. The bug / requirement (verbatim from user)

> "BUG / REQUIREMENT — Order Success message block is hardcoded"

The hero block on the Order Success page is two strings inlined in JSX with no admin override. They cannot be customised per restaurant.

---

## 2. What's hardcoded today

```jsx
// frontend/src/pages/OrderSuccess.jsx, lines 503–514
<div className="order-success-hero-compact">
  <div className="order-success-icon-small" data-testid="order-success-icon">
    <IoCheckmarkCircle />
  </div>
  <div className="order-success-hero-text">
    <h1 className="order-success-title-compact">Order Placed!</h1>            {/* hardcoded */}
    <p  className="order-success-message-compact">Your order is being processed</p>  {/* hardcoded */}
  </div>
</div>
```

Two hardcoded strings:
- `Order Placed!` — hero title
- `Your order is being processed` — hero subtitle

The live config payload `GET /api/config/716` (verified) returns 80+ fields. There is **no** field for these two strings today.

### Other hardcoded strings on the same page (out of stated scope, listed for awareness)

- `Yet to be confirmed` (item-status badge default), L759
- `CALL WAITER`, L797 — button label
- `PAY BILL`, L807 — button label
- `Item Total`, `Grand Total`, `Subtotal`, `Service Charge (Optional)`, `CGST on SC`, `SGST on SC` — bill rows, L655–713
- `Verifying payment...`, `Payment Successful`, `Payment Pending`, L534/538/543
- `Fetching order details...`, L583
- `Loading Items...`, L572
- Items toggle: ``Items Ordered (${count})``, L572

These are NOT part of the user's stated scope. Recommended: park as a separate i18n/labels initiative; do not bundle into this fix unless the next agent gets explicit approval.

---

## 3. Existing infrastructure already in place

### Configurable string fields that DO exist today (precedent we can copy)

In `RestaurantConfig` (backend Pydantic model + frontend `AdminConfigContext`):

- `welcomeMessage` (landing-page welcome text)
- `browseMenuButtonText`
- `payAtCounterLabel`, `payOnlineLabel`
- `feedbackIntroText`
- `tagline`, `footerText`
- `poweredByText`

These all use the `Optional[str] = None` pattern with a safe fallback in the React consumer.

### Notification popup mechanism (already-wired, alternative path — see Option C)

`OrderSuccess.jsx:131` already calls `useNotificationPopup({ page: 'success' })`. Admins can configure `notificationPopups[]` with `showOn: 'success'` to overlay a modal/banner/toast on top of the page. This is functional today — but it's an **overlay**, not a replacement for the hero h1/p text.

---

## 4. Implementation options (presented to user; awaiting choice)

| Option | Surface | Approx LOC | Notes |
| --- | --- | --- | --- |
| **A** — Add 2 new config fields (`successTitle`, `successMessage`) | Backend schema + admin UI + context default + 1 consumer file | ~12–18 lines, 4 files | Closest to user's wording. Matches `welcomeMessage` precedent. **Recommended.** |
| **B** — Add 1 field (`successMessage` only); leave title as `Order Placed!` | Same as A minus title | ~8–10 lines | If product wants title to remain a brand-universal phrase |
| **C** — Use existing `notificationPopups` with `showOn: 'success'` | 0 code changes | 0 | Already works as overlay. Doesn't change the hero block itself. |
| **D** — Full i18n / locale system | 100+ lines, many files | Out of scope; not minimal |

---

## 5. Recommended minimal plan (Option A)

If product approves Option A, implement in this order. Each step is independent and small.

### 5.1 Backend Pydantic model

`backend/server.py` — `RestaurantConfig` class, near the existing string fields (`welcomeMessage`, `tagline`, `footerText` block):

```python
# Order Success hero (admin-configurable, optional — falls back to defaults in UI)
successTitle: Optional[str] = None
successMessage: Optional[str] = None
```

No migration needed; existing Mongo docs without these keys will deserialize as `None`.

### 5.2 Frontend default map

`frontend/src/context/AdminConfigContext.jsx` (and `RestaurantConfigContext.jsx` if it has a defaults block) — add to the defaults object:

```js
successTitle: '',
successMessage: '',
```

### 5.3 Frontend admin UI

`frontend/src/pages/admin/AdminSettingsPage.jsx` — add two `<input>` (or textarea for the message) controls in the Branding / Content section near the existing `welcomeMessage` input. Pattern (mirror `welcomeMessage`):

```jsx
<div className="admin-field">
  <label htmlFor="successTitle">Order Success — Title</label>
  <input
    id="successTitle"
    type="text"
    value={config.successTitle || ''}
    onChange={(e) => updateField('successTitle', e.target.value)}
    placeholder="Order Placed!"
    data-testid="admin-success-title-input"
  />
  <small>Shown as the headline on the Order Success page. Leave blank to use default ("Order Placed!").</small>
</div>

<div className="admin-field">
  <label htmlFor="successMessage">Order Success — Message</label>
  <input
    id="successMessage"
    type="text"
    value={config.successMessage || ''}
    onChange={(e) => updateField('successMessage', e.target.value)}
    placeholder="Your order is being processed"
    data-testid="admin-success-message-input"
  />
  <small>Shown below the headline. Leave blank to use default ("Your order is being processed").</small>
</div>
```

### 5.4 Frontend consumer (the only change in OrderSuccess.jsx)

`frontend/src/pages/OrderSuccess.jsx` — replace lines 509 and 511. Use the existing `RestaurantConfigContext` (already imported in this file as `useRestaurantConfig` — verify before editing):

```jsx
// Before:
<h1 className="order-success-title-compact">Order Placed!</h1>
<p  className="order-success-message-compact">Your order is being processed</p>

// After:
<h1 className="order-success-title-compact">
  {config?.successTitle || 'Order Placed!'}
</h1>
<p className="order-success-message-compact">
  {config?.successMessage || 'Your order is being processed'}
</p>
```

`config` should already be in scope from the existing `RestaurantConfigContext` consumer in this file. Verify by `grep -n "useRestaurantConfig\|RestaurantConfigContext" pages/OrderSuccess.jsx` before editing.

### 5.5 Total footprint

| File | Lines added/changed |
| --- | --- |
| `backend/server.py` | +2 |
| `frontend/src/context/AdminConfigContext.jsx` (and/or `RestaurantConfigContext.jsx`) | +2 |
| `frontend/src/pages/admin/AdminSettingsPage.jsx` | +~12 (two input groups) |
| `frontend/src/pages/OrderSuccess.jsx` | 2 lines edited (no net add) |
| **Total** | ~16 lines, 4 files |

No changes to: order placement, payment, GST, service charge, delivery charge, cart, scanner, popup, API contract.

---

## 6. Validation plan (for the next agent)

After implementation, validate the following without exercising the full real order flow (use the same Playwright route-interception approach used in `BUGFIX-ORDER-SUCCESS-SCROLL.md` if needed):

1. **Backend** — Restart backend; `GET /api/config/<rid>` returns `successTitle` and `successMessage` keys (null when not set). Use curl.
2. **Admin UI** — Open AdminSettingsPage, the two new inputs render with placeholders showing the defaults; saving propagates to `/api/config/<rid>`.
3. **Defaults preserved (regression check)** — On a restaurant with both fields blank/null, OrderSuccess hero shows `Order Placed!` / `Your order is being processed` exactly as today.
4. **Custom values** — On a restaurant with `successTitle: "Thank you for your order"` and `successMessage: "We'll bring it to your table soon"`, OrderSuccess hero shows those strings.
5. **Mixed** — Title set, message blank → custom title + default message (and vice versa).
6. **Existing Jest tests** in `__tests__/pages/OrderSuccess.test.js` continue to pass (they may assert on the literal string "Order Placed!"; check before editing — if they do, update the assertion to also accept the new fallback path or pass an explicit config with default values).

---

## 7. Open questions for product / handover

The user already approved this issue would be implemented but did NOT yet pick an option. Before the next agent edits, get explicit answers:

- **Q1 — Option A or B?** (2 fields vs 1 field — see §4)
- **Q2 — Scope creep**: should other hardcoded strings (CALL WAITER, PAY BILL, Item Total, etc.) be configurable in the same change? Recommended answer: NO — keep this change tight; raise i18n separately.
- **Q3 — Field placement** in admin UI: group with `welcomeMessage` under Branding/Content? Recommended answer: YES.
- **Q4 — Markdown/HTML support** in `successMessage`? Recommended answer: NO — keep plain text to match `welcomeMessage` behavior; a sanitiser would be needed otherwise.
- **Q5 — Per-page-state variants** (e.g., one message when payment success, another when payment pending)? Recommended answer: NO for v1 — single hero block; revisit if needed.

---

## 8. Why this was not implemented yet

The user's last message was `"document this for next agent"` after I presented options A/B/C and asked for approval (see §4). The user has not yet selected an option. Per session discipline ("ask approval before code edit"), no code was changed.

The next agent should:
1. Confirm the option choice (A recommended) with the user.
2. Confirm answers to the §7 open questions.
3. Then implement per §5 — single small commit, single PR.

---

## 9. Status

**Open. Investigation complete. Implementation pending product decision.** Estimated effort: 30–60 minutes including validation, assuming Option A and no scope creep.
