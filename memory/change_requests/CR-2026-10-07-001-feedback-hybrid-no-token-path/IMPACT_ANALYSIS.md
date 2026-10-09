# IMPACT ANALYSIS — CR-2026-10-07-001
## Remove sign-in card + wire no-token feedback path to CRM

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-09
**Based on:** INTAKE_DOC · FeedbackPage.jsx (full read) · crmService.js:434–439 · CRM CR-096 live probe · design_guidelines.json
**Precondition confirmed:** CRM CR-096 live — anonymous `{rating, restaurant_id}` → 200 `linked:false`; with phone → 200 `linked:true`. Probed 2026-10-09.

---

## 1. What this CR does

Removes the sign-in card (lines 81–94 in FeedbackPage.jsx) and replaces it with a phone input for diners without a CRM token. The diner enters their phone (optional), taps Submit Feedback, and CRM receives `{phone?, restaurant_id, rating, message?}`. If the phone matches a known customer, CRM links the feedback (`linked:true`); otherwise it stores it as anonymous (`linked:false`). The diner sees a thank-you screen either way.

The token path (existing, authenticated) is unchanged.

---

## 2. Current code — exact touch points

### T1 · `FeedbackPage.jsx:81–94` — the sign-in card (to be replaced)

```jsx
} : !crmToken ? (
  // CR-2026-10-03-003 D2=a / D10=a: token-only until CRM CR-096 ships (CR-2026-10-07-001)
  <div className="feedback-signin" data-testid="feedback-signin-required">
    <p className="feedback-intro">
      Feedback is available to signed-in diners. Sign in from the home page by entering your phone number.
    </p>
    <button
      className="feedback-btn"
      onClick={() => navigate(`/${restaurantId}`)}
      data-testid="feedback-signin-btn"
    >
      Sign in
    </button>
  </div>
```

**Replace with:** phone input (optional) + Submit Feedback button. Phone pre-populated from `localStorage.guestCustomer.phone` if available.

### T2 · `FeedbackPage.jsx:45–66` — `handleSubmit` (to be extended)

Currently calls `crmSubmitFeedback(crmToken, ...)` — always passes token. Must route through no-token path when `!crmToken`.

### T3 · `FeedbackPage.jsx:state` — new state needed

`const [guestPhone, setGuestPhone] = useState('')` — for no-token path phone input.

### T4 · `crmService.js:434–439` — `crmSubmitFeedback` (to be extended)

```javascript
export const crmSubmitFeedback = async (token, { rating, message, orderId, restaurantId }) => {
  const body = { rating, restaurant_id: String(restaurantId) };
  if (message) body.message = message;
  if (orderId) body.order_id = orderId;
  return crmAuthFetch('/scan/feedback', token, { method: 'POST', body: JSON.stringify(body) });
};
```

Currently uses `crmAuthFetch` (always adds Bearer token). No-token path must use `crmFetch` (no auth header). Needs a `phone` and `country_code` field added for no-token.

---

## 3. CRM contract — confirmed live (CR-096)

**`POST /scan/coupons/validate`** — no wait, `POST /scan/feedback`

**No-token request:**
```json
{ "rating": 4, "restaurant_id": "689", "phone": "9035133228", "country_code": "+91" }
```
- `phone` is optional — anonymous submission works without it
- `country_code` — send `'+91'` when phone is present (per CR-085-A ruling: always send separately)
- Response: `{ success:true, data: { linked: bool, feedback_id: string } }`
- `linked:true` = phone matched a known customer. `linked:false` = anonymous.

**Rate limits:** 10/min IP · 3/10 min per phone+restaurant → handle 429 with toast.

**Token path unchanged:** `crmAuthFetch('/scan/feedback', token, ...)` — no changes to this path.

---

## 4. Phone source for no-token path

`localStorage.guestCustomer` is set by LandingPage whenever the diner enters their phone. Shape: `{ name, phone, restaurantId }`.

On FeedbackPage mount (no-token path): read `guestCustomer.phone` and pre-populate `guestPhone` state. Diner can edit or clear it before submitting.

Phone input is **optional** — diner can submit feedback with no phone (anonymous). No OTP, no skip-otp, no customer creation per contract.

---

## 5. Two thank-you states (D1 — owner decision)

CRM returns `linked: bool`. Should the thank-you screen differ based on this?

| Option | Behaviour |
|---|---|
| **(a) Single thank-you** | Same "Thank You!" screen regardless of `linked`. Simpler, no UI branching. |
| **(b) Linked/unlinked thank-you** | Linked: "Thank you, your feedback has been linked to your profile." · Unlinked: "Thank you! Enter your phone next time to link feedback to your profile." |

Recommendation: **(a)** — simpler, no visible difference to the diner. `linked` is informational only.

---

## 6. Open questions from intake — resolved

**Q1 — Phone validation:** Yes, reuse `isPhoneValid` from `LandingCustomerCapture`. Indian 10-digit (`+91` E.164 format). Input uses the same PhoneInput component for consistency.

**Q2 — Save guest phone to `guestCustomer`?** No — single-purpose submission. Do not overwrite the existing `guestCustomer` record with a phone entered only for feedback.

---

## 7. Files WILL change

| File | Change |
|---|---|
| `frontend/src/pages/FeedbackPage.jsx` | T1 (replace sign-in card), T2 (extend handleSubmit), T3 (add guestPhone state + guestCustomer prefill) |
| `frontend/src/api/services/crmService.js` | T4 — `crmSubmitFeedback` gains no-token branch via `crmFetch` |

## 8. Files WILL NOT touch

`server.py` · `AuthContext.jsx` · `CartContext.js` · `ReviewOrder.jsx` · `LandingPage.jsx` · `App.js`

---

## 9. Risk

| Area | Rating | Reason |
|---|---|---|
| Overall | **HIGH** | FeedbackPage edit + `crmSubmitFeedback` change; but scoped to one page |
| Token path regression | HIGH | `crmSubmitFeedback` change must not break authenticated submissions |
| No-token path | MEDIUM | New branch, graceful error handling + 429 handling needed |
| Phone pre-fill | LOW | Read-only from localStorage, no side effects |

---

## 10. Verification matrix

| T | Scenario | Expected |
|---|---|---|
| T1 | No-token diner lands on FeedbackPage | Phone input shows (pre-filled if `guestCustomer` present), NOT sign-in card |
| T2 | No-token, no phone, submit 4-star + message | CRM called with no phone, `linked:false` response, thank-you screen |
| T3 | No-token, with phone 9035133228, submit | CRM called with phone + country_code, `linked:true`, thank-you screen |
| T4 | Authenticated diner submits | Token path unchanged — `crmAuthFetch` used, no phone in body |
| T5 | 429 from CRM | Toast "Too many attempts. Please try again shortly." |
| T6 | Sign-in card gone | `data-testid="feedback-signin-required"` NOT present in DOM |
| T7 | `yarn build` | Clean |

---

```
Planning complete: CR-2026-10-07-001
Stage: Impact Analysis
Code reality: FULL — 4 exact touch points, CRM probe confirmed
Risk: HIGH
Files WILL change: FeedbackPage.jsx · crmService.js
Files WILL NOT touch: server.py · AuthContext.jsx · LandingPage.jsx
Owner decisions: D1 (linked/unlinked thank-you — rec: a single thank-you)
Status: AT GATE — awaiting D1 confirmation then Implementation Plan
```
