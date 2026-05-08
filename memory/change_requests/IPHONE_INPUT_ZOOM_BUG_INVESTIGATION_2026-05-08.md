# BUG INVESTIGATION — iPhone Input Focus Zoom / Disturbed UI on Scan & Order

**Date:** 2026-05-08
**Owner:** E1 Agent (investigation only — **NO CODE CHANGED**, no fix applied)
**Branch checked out at /app:** `main` @ `b89587d` (with `/app/memory/` synced from branch `6-may` per prior owner directive)
**Scope:** Investigation only. Fix gated on owner approval.

---

## 1. Bug classification

| Field | Value |
|---|---|
| Type | UI / Mobile-browser behavior |
| Class | iOS Safari & Chrome auto-zoom on focus of form fields with `font-size < 16px` |
| Severity | Medium (UX disruption; layout appears “zoomed/disturbed” after keyboard opens) |
| Reproducibility | Deterministic on iPhone Safari/Chrome where the focused field is < 16px |
| Affects business logic? | **No.** Pure styling. Order placement, totals, payloads, payment, sockets, KOT — unaffected. |
| Affects desktop? | No (desktop browsers don't auto-zoom on focus) |

---

## 2. Affected flow

**Scan & Order customer ordering flow** — primarily the **Review/Cart screen** (`/:restaurantId/review-order`), where Customer Details, Phone, and the order-note textarea live alongside the “Cooking Instructions” / “Special Instructions” fields shown in the screenshot.

Secondary screens that share the same defect family:
- Landing customer-capture (Name + Phone on `/:restaurantId`)
- Delivery Address (`/:restaurantId/delivery-address`) — uses similar low-font inputs

---

## 3. Files / components inspected (read-only)

| Layer | File | Why |
|---|---|---|
| Viewport meta | `/app/frontend/public/index.html` (line 6) | iOS zoom gate |
| Global CSS | `/app/frontend/src/index.css`, `/app/frontend/src/App.css` | `--font-size-*` token values |
| Tailwind | `/app/frontend/tailwind.config.js` | confirms no global mobile font override |
| Shared primitives | `/app/frontend/src/components/ui/input.jsx`, `/app/frontend/src/components/ui/textarea.jsx` | shared shadcn inputs |
| Cart/Review screen | `/app/frontend/src/pages/ReviewOrder.jsx` (lines 1546–1556 special instructions) | the textarea visible in screenshot |
| Cart/Review styles | `/app/frontend/src/pages/ReviewOrder.css` (lines 144–160 inline textarea, 430–451 secondary textarea, 294–298 select) | font-size of every form field on the screen |
| Customer details (name + phone) | `/app/frontend/src/components/CustomerDetails/CustomerDetails.jsx` + `.css` | most likely actual zoom trigger |
| Cooking instructions modal | `/app/frontend/src/components/CookingInstructionsModal/CookingInstructionsModal.css` (lines 104–120) | per-item cooking-note textarea |
| Landing capture | `/app/frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.css` (lines 21–99) | landing name+phone capture |
| Table/Room selector | `/app/frontend/src/components/TableRoomSelector/TableRoomSelector.jsx` | select on review screen |
| Token values | `index.css` lines 92–105 → `--font-size-xs=0.75rem (12px)`, `--font-size-sm=0.875rem (14px)`, `--font-size-base=1rem (16px)` | conversion proof |

---

## 4. Hypothesis verified — Root Cause

> **iOS Safari and iOS Chrome auto-zoom when the focused `<input>`, `<textarea>` or `<select>` has a *computed* `font-size < 16px`.** This is the documented iOS behavior, not a bug in our app.

### 4.1 What's already correctly protected (≥ 16 px)
These fields **already** carry the 16-px iOS protection — note the explicit comment in code “`/* Minimum 16px to prevent iOS Safari auto-zoom on focus */`”:

| Selector | File / line | Computed font-size |
|---|---|---|
| `.review-order-textarea-inline` *(Special Instructions on review screen — the field circled in the screenshot)* | `pages/ReviewOrder.css:144–155` | **16 px** ✅ |
| `.cooking-instructions-modal-textarea` *(per-item cooking-instructions textarea opened from `OrderItemCard`)* | `components/CookingInstructionsModal/CookingInstructionsModal.css:104–120` | **16 px** ✅ |
| `.review-order-select` *(table number react-select)* | `pages/ReviewOrder.css:294–298` | `var(--font-size-base)` = **16 px** ✅ |
| `.password-input` *(PasswordSetup)* | `pages/PasswordSetup.css:42–53` | `1rem` = **16 px** ✅ |
| `.otp-input` *(OTP)* | `pages/PasswordSetup.css:178–184` | `1.5rem` = **24 px** ✅ |
| Shared `<Input>` / `<Textarea>` shadcn primitives | `components/ui/input.jsx:10`, `components/ui/textarea.jsx:9` | `text-base` (16 px) on mobile; `md:text-sm` (14 px) only at ≥768 px ✅ |

### 4.2 The actual offenders — fields visible on the same screen that DO trigger the zoom

| Selector | File / line | Computed font-size on iPhone | Field shown to user |
|---|---|---|---|
| `.customer-details-input` | `components/CustomerDetails/CustomerDetails.css:44–55` | `var(--font-size-sm)` = **14 px** 🔴 | **Customer Name** (review screen) |
| `.customer-details-phone-input .PhoneInputInput` | `components/CustomerDetails/CustomerDetails.css:122–134` | `var(--font-size-sm)` = **14 px** 🔴 | **Phone number** (review screen) |
| `.customer-details-phone-input .PhoneInputCountrySelect` | `components/CustomerDetails/CustomerDetails.css:100–113` | `var(--font-size-sm)` = **14 px** 🔴 | Phone country dropdown |
| `.customer-details-input` (mobile media query) | `components/CustomerDetails/CustomerDetails.css:171–173` (`@media (max-width: 480px)`) | `var(--font-size-sm)` = **14 px** 🔴 | re-asserts the bug at mobile breakpoint |
| `.customer-details-phone-input .PhoneInputInput` (mobile media query) | `components/CustomerDetails/CustomerDetails.css:175–177` | `var(--font-size-sm)` = **14 px** 🔴 | |
| `.customer-details-phone-input .PhoneInputCountrySelect` (mobile media query) | `components/CustomerDetails/CustomerDetails.css:179–181` | `var(--font-size-xs)` = **12 px** 🔴🔴 | worst offender — country code |
| `.review-order-textarea` *(secondary order-note textarea elsewhere in the page)* | `pages/ReviewOrder.css:430–451` | `var(--font-size-sm)` = **14 px** 🔴 | |
| `.capture-input` (Landing name) | `components/LandingCustomerCapture/LandingCustomerCapture.css:21–32` | `15 px` 🔴 | Landing capture name |
| `.capture-phone-input .PhoneInputInput` (Landing phone) | `components/LandingCustomerCapture/LandingCustomerCapture.css:84–95` | `15 px` 🔴 | Landing capture phone |
| `.capture-phone-input .PhoneInputCountrySelect` | `components/LandingCustomerCapture/LandingCustomerCapture.css:~73` | inferred ≤ 14 px 🔴 | |

> **Verified token values** (from `index.css:92–105`):
> `--font-size-xs = 0.75rem (12 px)`, `--font-size-sm = 0.875rem (14 px)`, `--font-size-base = 1rem (16 px)`.
> Root font-size has not been changed (no `html { font-size: ... }` override found), so 1 rem = 16 px.

### 4.3 Viewport meta — clean
`/app/frontend/public/index.html:6`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```
- No `maximum-scale=1` and no `user-scalable=no` → **good** (those would block accessibility pinch-zoom but would NOT prevent the focus-zoom anyway, since iOS focus-zoom is governed by font-size, not viewport).
- No `transform`, `zoom`, or `scale` rules found on the affected screen wrappers that would explain the “disturbed” layout independently of the focus-zoom.
- No fixed-height/`overflow:hidden` ancestor on the form area was found that would cause the zoom-then-clip illusion.

### 4.4 Summary of why the user sees what they see
When the user taps **Customer Name** or **Phone** on the review screen (both ~14 px), iOS Safari/Chrome zooms the page so the focused input becomes ≥ 16 px effective. Because the page wasn't pinched in, iOS doesn't snap back when the keyboard closes, leaving the layout visibly “shifted/disturbed”. Tapping the labelled "Cooking Instructions" / "Special Instructions" textarea by itself does **not** trigger zoom (those are protected at 16 px) — but the bug is reported as if it does because the user is on the same screen and likely tapped Name/Phone first, or the keyboard from a previous low-font field caused the carry-over zoom that persists when they then touch the cooking-instructions field.

---

## 5. Does this affect ONE field or ALL form fields?

**Mixed.** It is **not all** form fields — several are already protected. It IS several fields that all happen to be visible together on the Scan & Order review screen. Concretely:

| Field on review screen | Protected? |
|---|---|
| Special Instructions textarea (inline) | ✅ already 16 px |
| Cooking Instructions modal textarea | ✅ already 16 px |
| Table number react-select | ✅ already 16 px |
| **Customer Name input** | 🔴 14 px |
| **Phone number input** | 🔴 14 px |
| **Phone country selector** | 🔴 14 px (12 px on ≤480 px viewports) |
| Coupon code input *(no dedicated CSS rule found, may inherit 14 px)* | ⚠ likely 14 px, **needs runtime check** |
| Secondary `.review-order-textarea` (if rendered in some flows) | 🔴 14 px |

Landing-capture and Delivery-Address screens have the same family of <16 px inputs and would zoom the same way if the user reaches them on iPhone.

---

## 6. Proposed minimal fix (NOT applied — for owner approval)

### Goal
Force every customer-app form control on mobile (≤ ~480–768 px) to render at **exactly 16 px** (or larger) so iOS does not auto-zoom on focus. Keep desktop sizing exactly as today.

### Option A — Surgical (recommended, lowest risk)
Edit only the offender selectors to bump to 16 px on mobile. **No global CSS rule, no JS, no shared-component change.**

Files to touch (CSS only, no logic):
1. `frontend/src/components/CustomerDetails/CustomerDetails.css`
   - `.customer-details-input` → `font-size: 16px;`
   - `.customer-details-phone-input .PhoneInputInput` → `font-size: 16px;`
   - `.customer-details-phone-input .PhoneInputCountrySelect` → `font-size: 16px;`
   - The `@media (max-width: 480px)` block (lines 166–187) → bump the same three rules to `16px`.
2. `frontend/src/pages/ReviewOrder.css`
   - `.review-order-textarea` (line 430) → `font-size: 16px;` *(matches the comment already present on `.review-order-textarea-inline`)*
   - Verify `.review-order-coupon-input` (or whatever class wraps `data-testid="coupon-input"` at JSX line 1597) and bump if needed.
3. `frontend/src/components/LandingCustomerCapture/LandingCustomerCapture.css`
   - `.capture-input` (line 26) → `font-size: 16px;`
   - `.capture-phone-input .PhoneInputInput` (line 89) → `font-size: 16px;`
   - `.capture-phone-input .PhoneInputCountrySelect` → `font-size: 16px;`
4. `frontend/src/pages/DeliveryAddress.css` — repeat the same audit; bump any `<input>`/`<select>`/`<textarea>` rule that is below 16 px.

**Optional desktop-preserving variant** (if owner wants visual sizing unchanged on desktop):
```css
@media (max-width: 767px) {
  .customer-details-input,
  .customer-details-phone-input .PhoneInputInput,
  .customer-details-phone-input .PhoneInputCountrySelect,
  .capture-input,
  .capture-phone-input .PhoneInputInput,
  .capture-phone-input .PhoneInputCountrySelect,
  .review-order-textarea {
    font-size: 16px;
  }
}
```

### Option B — Defensive global rule (broadest coverage, slightly higher visual risk)
Add **one block** to `frontend/src/index.css` (mobile-only, defensive):
```css
@media (max-width: 767px) {
  input, textarea, select { font-size: 16px; }
}
```
This guarantees the bug cannot recur on any new field added later. Risk: minor visual size change on any custom input that intentionally uses 14 px on mobile.

### Why NOT to use viewport-meta fix
Adding `maximum-scale=1, user-scalable=no` to the viewport meta **does** suppress focus-zoom on older Safari but:
- breaks accessibility (users can no longer pinch to zoom),
- is ignored by current iOS Safari (≥ 10) for focus-zoom anyway when font-size < 16 px,
- is an anti-pattern the WCAG/Apple HIG explicitly discourage.
Recommendation: **do not** use this approach.

---

## 7. Risk assessment

| Risk | Level | Why |
|---|---|---|
| Breaking order placement / payment / KOT | **None** | Fix is CSS-only, no JS / payload change |
| Breaking cart, totals, tax, service charge | **None** | Same — CSS only |
| Visual size change on customer-app mobile | **Low** | 14 px → 16 px on Name / Phone / Country / order note. Will look slightly larger; intentional and improves legibility. |
| Visual size change on desktop | **None (Option A) / minimal (Option B)** | Option A wraps in `@media (max-width: 767px)`; Option B includes desktop too. |
| Affecting Admin pages | **None** | Admin selectors (`.admin-color-input input`, etc.) are scoped and won't be touched in Option A. Option B would touch them — but admin is desktop-only in practice. |
| Regression to already-protected textareas | **None** | The Special Instructions and Cooking Instructions textareas already use 16 px and won't be modified. |
| Shared `<Input>` / `<Textarea>` shadcn primitives | **None** | Already 16 px on mobile (`text-base`). Not touched. |
| Phone-input library overrides | **Low** | `react-phone-number-input` styles its own internal `.PhoneInputInput`; we're already overriding it via `.customer-details-phone-input .PhoneInputInput`. Increasing font-size is purely additive. |
| Tests breakage | **None** | No selectors, no DOM structure, no `data-testid` change. |

---

## 8. Validation checklist (to run AFTER the owner approves the fix)

### Functional regression — must remain unchanged
- [ ] Cart quantities, item totals, subtotal, tax, service charge, delivery charge displayed identically to pre-fix
- [ ] Place Order succeeds (dine-in, takeaway, delivery)
- [ ] Edit Order succeeds and posts identical payload (verified by network log diff)
- [ ] Razorpay flow opens and verifies same as before
- [ ] KOT/bill on POS side identical (no payload change is possible since CSS is the only thing touched)
- [ ] Coupon UI still rendered the same; loyalty/wallet sections untouched
- [ ] Admin screens unaffected

### Mobile zoom validation — primary
- [ ] iPhone Safari (latest iOS): tap Customer Name → keyboard opens, page does NOT zoom
- [ ] iPhone Safari: tap Phone Number → no zoom
- [ ] iPhone Safari: tap Phone Country dropdown → no zoom
- [ ] iPhone Safari: tap Special Instructions textarea → no zoom (regression check — should already pass)
- [ ] iPhone Safari: tap Cooking Instructions modal textarea → no zoom (regression check)
- [ ] iPhone Safari: tap Coupon Code input → no zoom
- [ ] iPhone Safari: tap Table Number select → no zoom
- [ ] iPhone Safari: tap Landing customer-capture Name + Phone → no zoom
- [ ] iPhone Safari: tap Delivery-Address fields → no zoom (verify after Delivery audit)
- [ ] iPhone **Chrome** (uses iOS WebView/WKWebView): repeat the above
- [ ] After typing, dismissing keyboard returns user to the original layout (no leftover zoom artifact)

### Cross-platform smoke
- [ ] Android Chrome: typing works, no visual regression
- [ ] Android Firefox: typing works, no visual regression
- [ ] Desktop Chrome / Safari / Firefox: review screen visually identical to pre-fix
- [ ] Tablet (iPad portrait, ~768 px): layout behaves correctly at the breakpoint

### Typing behavior
- [ ] Note typing still echoes characters live (no stale state)
- [ ] Phone formatting (`react-phone-number-input`) still validates and formats
- [ ] Customer-name autofill (browser saved entries) still works

---

## 9. What is NOT changing as part of the proposed fix

Per strict scope:
- ❌ No order placement payload changes
- ❌ No tax / service charge / delivery charge calculation changes
- ❌ No payment / Razorpay / payment-method-selector changes
- ❌ No KOT / bill / print payload changes
- ❌ No backend API contract / endpoint changes
- ❌ No socket / Firebase / notification / buzzer changes
- ❌ No unrelated UI components touched
- ❌ No desktop layout changes (Option A) / minimal layout-neutral changes (Option B)
- ❌ No business logic, no JSX restructuring, no data-testid changes

---

## 10. Implementation approval gate

> 🛑 **No code has been changed. Awaiting owner approval before any edit.**

Please confirm:

1. **Approve fix?** ✅ Yes, proceed / ❌ No / 🔄 Need clarification.
2. **Which option?**
   - **(A) Surgical** — touch only the listed offending selectors in `CustomerDetails.css`, `ReviewOrder.css`, `LandingCustomerCapture.css`, `DeliveryAddress.css` (recommended).
   - **(B) Defensive global rule** — add one `@media (max-width: 767px) { input, textarea, select { font-size: 16px; } }` rule in `index.css` AND fix the explicit offenders.
3. **Mobile breakpoint to use** — `767px` (Tailwind `md`) or `480px` (existing CSS pattern in `CustomerDetails.css`)?
4. **Any field to leave at <16 px** for product reasons?
5. **Permission to run the testing agent** afterward to validate the iOS zoom is gone (Playwright / mobile-emulation only — backend untouched)?

Once you reply with the chosen option and approval, I'll apply the fix in a single non-business-logic CSS PR-style change and trigger the validation checklist above.
