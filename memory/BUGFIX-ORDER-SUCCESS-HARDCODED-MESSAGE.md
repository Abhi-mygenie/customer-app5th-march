# Bugfix — Order Success message block was hardcoded

**Date opened:** 2026-05-06
**Date closed:** 2026-05-06
**Status:** ✅ Closed (accepted by user)
**Branch:** `hyatt-fixes-7-may` @ `735c07d` (last remote commit before fix: 2026-05-06 16:08:06 UTC)
**Files changed (5):**

| # | File | Change |
| - | --- | --- |
| 1 | `backend/server.py` | +3 lines — added `successTitle: Optional[str] = None` and `successMessage: Optional[str] = None` to the `AppConfigUpdate` Pydantic model (right after `welcomeMessage`/`tagline`) |
| 2 | `frontend/src/context/RestaurantConfigContext.jsx` | +6 lines — added 2 fields to defaults map (L62 area) and 2 fields to API→consumer mapping (L364 area) |
| 3 | `frontend/src/context/AdminConfigContext.jsx` | +3 lines — added 2 fields to admin-side defaults |
| 4 | `frontend/src/pages/admin/AdminSettingsPage.jsx` | +33 lines — new "Order Success Page Text" admin section with 2 input controls placed right after the Landing Page Text section |
| 5 | `frontend/src/pages/OrderSuccess.jsx` | +5 / −3 — destructured new fields from `useRestaurantConfig` and replaced the 2 hardcoded h1/p strings with a fallback chain |

**Net delta:** +50 / −3 across 5 files.

---

## 1. Issue (verbatim)

> "BUG / REQUIREMENT — Order Success message block is hardcoded"

The hero block on the Order Success page contained two strings inlined in JSX with no admin override. They could not be customised per restaurant.

```jsx
// frontend/src/pages/OrderSuccess.jsx (before fix)
<h1 className="order-success-title-compact">Order Placed!</h1>
<p className="order-success-message-compact">Your order is being processed</p>
```

---

## 2. Decision

User approved **Option A**: add **2 optional admin-configurable fields** (`successTitle`, `successMessage`) with frontend fallbacks. Plain text only. No Markdown/HTML, no per-state variants. Admin UI grouped near existing content/branding settings.

Other options considered (and rejected):
- Option B: 1 field only (message). Rejected — user wanted both.
- Option C: reuse existing `notificationPopups` overlay. Rejected — overlay is on top of the hero, doesn't replace the hero text itself.
- Option D: full i18n. Rejected — out of scope.

---

## 3. Implementation

### 3.1 Backend — `backend/server.py` (Pydantic model `AppConfigUpdate`)

```python
# Branding - Text
welcomeMessage: Optional[str] = None
tagline: Optional[str] = None
# Order Success Page (admin-configurable; UI falls back to defaults when None/empty)
successTitle: Optional[str] = None
successMessage: Optional[str] = None
```

No migration needed — existing Mongo docs without these keys deserialize as `None`. The existing `GET /api/config/{restaurant_id}` route returns the raw Mongo doc (or a hardcoded defaults dict when the doc is missing); both paths now correctly omit/include the new keys.

### 3.2 Frontend default map — `RestaurantConfigContext.jsx`

```jsx
// Branding - Text
welcomeMessage: null,
tagline: null,
// Order Success Page (admin-configurable; consumer falls back to defaults when null/empty)
successTitle: null,
successMessage: null,
```

And the API→consumer mapping:

```jsx
// Order Success Page (admin-configurable; UI falls back to defaults when null/empty)
successTitle: config.successTitle,
successMessage: config.successMessage,
```

### 3.3 Frontend admin defaults — `AdminConfigContext.jsx`

```jsx
// Order Success Page (admin-configurable; consumer falls back to defaults when empty)
successTitle: '',
successMessage: '',
```

### 3.4 Admin UI — `AdminSettingsPage.jsx`

New section, placed immediately after the existing **Landing Page Text** section:

```jsx
{/* Order Success Page Text Section */}
<div className="admin-section">
  <h2 className="admin-section-title">Order Success Page Text</h2>

  <div className="admin-form-grid">
    <div className="admin-form-group">
      <label className="admin-form-label">Order Success — Title</label>
      <input
        type="text"
        className="admin-form-input"
        placeholder="Order Placed!"
        value={config.successTitle || ''}
        onChange={(e) => updateField('successTitle', e.target.value)}
        data-testid="input-successTitle"
      />
      <span className="admin-form-hint">
        Shown as the headline on the Order Success page. Leave blank to use default ("Order Placed!").
      </span>
    </div>

    <div className="admin-form-group">
      <label className="admin-form-label">Order Success — Message</label>
      <input
        type="text"
        className="admin-form-input"
        placeholder="Your order is being processed"
        value={config.successMessage || ''}
        onChange={(e) => updateField('successMessage', e.target.value)}
        data-testid="input-successMessage"
      />
      <span className="admin-form-hint">
        Shown below the headline. Leave blank to use default ("Your order is being processed").
      </span>
    </div>
  </div>
</div>
```

### 3.5 Consumer — `OrderSuccess.jsx`

Destructured 2 new fields from `useRestaurantConfig`:

```jsx
const {
  logoUrl: configLogoUrl, phone: configPhone, fetchConfig,
  showFoodStatus, showOrderStatusTracker,
  showCallWaiter: configShowCallWaiter, showPayBill: configShowPayBill,
  successTitle: configSuccessTitle, successMessage: configSuccessMessage,
} = useRestaurantConfig();
```

Hero block now uses the fallback chain:

```jsx
<div className="order-success-hero-text">
  <h1 className="order-success-title-compact" data-testid="order-success-title">
    {(configSuccessTitle && configSuccessTitle.trim()) || 'Order Placed!'}
  </h1>
  <p className="order-success-message-compact" data-testid="order-success-message">
    {(configSuccessMessage && configSuccessMessage.trim()) || 'Your order is being processed'}
  </p>
</div>
```

The fallback handles all 4 falsy/blank cases: `undefined` (key missing) · `null` · `''` · `'   '` (whitespace-only).

---

## 4. Validation results (accepted by user)

| # | Case | Restaurant | State | Title | Message | Result |
| - | --- | --- | --- | --- | --- | :---: |
| 1 | Custom admin text | `716` | `successTitle="Order Placed"`, `successMessage="Kindly allow us approximately 30-35 minutes to prepare your order"` (set by live admin via the new UI during validation window) | `Order Placed` | `Kindly allow us approximately 30-35 minutes to prepare your order` | ✅ |
| 2 | Fields missing/null/empty → fallback | `689` | `successTitle`/`successMessage` keys absent | `Order Placed!` | `Your order is being processed` | ✅ |
| 3 | Long admin text wraps on mobile | `689` | 114-char title, 266-char message | wraps to 5 lines | wraps to 6 lines | ✅ |

**V3 measurement (mobile 390×844 viewport):**
- `document.scrollWidth (390) === clientWidth (390)` → no horizontal scroll
- Title: `width=290px`, `height=100px` (5 lines, no clipping)
- Message: `width=290px`, `height=102px` (6 lines, no clipping)
- Hero card width `366px` with 12px page padding — intact
- Order # / Items / Bill Summary / Browse Menu button below all render correctly — layout did not break

**Lint:**
- `ruff check backend/server.py` → All checks passed
- `eslint frontend/src/pages/OrderSuccess.jsx` → No issues
- `eslint frontend/src/pages/admin/AdminSettingsPage.jsx` → No issues

**Backend hot-reload after Pydantic schema change:** ✅ `Application startup complete`, no errors.

**Test data cleanup:** rid `689` reverted with `$unset successTitle, successMessage` — only `welcomeMessage: 'Welcome!'` remains, matching its pre-test state. Rid `716` was not modified by the agent (the values there were set by the live admin user via the new UI during validation, and were preserved).

---

## 5. Strict-scope confirmations

- ✅ No changes to closed popup fix (`useNotificationPopup.js`, `NotificationPopup.jsx`)
- ✅ No changes to closed scroll fix (`OrderSuccess.css`)
- ✅ No changes to payment / GST / service charge / delivery charge / cart / scanner / room / session / order-placement payload code
- ✅ No redesign of Order Success page — only the 2 hardcoded strings replaced; all surrounding markup, classes, and styles unchanged
- ✅ Other hardcoded strings (`CALL WAITER`, `PAY BILL`, `Item Total`, etc.) NOT touched — parked as separate i18n initiative
- ✅ Plain text only; no Markdown/HTML support added
- ✅ No per-state variants — single hero block
- ✅ Notification popup system untouched

---

## 6. Closure

Status: **✅ Closed (accepted by user on 2026-05-06).**
The fix is live on the running deployment. Admins can now configure the Order Success hero block via *Admin Settings → Order Success Page Text*; restaurants that leave the fields blank continue to see the original `Order Placed!` / `Your order is being processed` text unchanged.
