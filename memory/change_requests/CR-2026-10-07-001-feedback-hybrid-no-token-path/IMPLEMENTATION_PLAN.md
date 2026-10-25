# IMPLEMENTATION PLAN — CR-2026-10-07-001
## Remove sign-in card + wire no-token feedback path

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-09
**Gate:** Gate 3 accepted (pending)
**Risk:** HIGH
**Files changing:** `crmService.js` · `FeedbackPage.jsx`
**Files NOT touched:** `server.py` · `AuthContext.jsx` · `LandingPage.jsx` · `App.js`

---

## Decisions locked

| D | Decision |
|---|---|
| D1 (thank-you screen) | **(a)** Single thank-you screen regardless of `linked`. Same "Thank You!" for all diners. |
| Phone source | Read `localStorage.guestCustomer.phone` on mount; diner can edit or clear |
| Phone validation | Optional — not validated; diner may leave blank for anonymous submission |
| `country_code` | Always `'+91'` when phone is provided (per CR-085-A ruling) |

---

## Pre-flight checks (Role 3 must run before first edit)

```bash
# 1. Confirm sign-in card location
grep -n "feedback-signin-required\|feedback-signin-btn\|!crmToken" frontend/src/pages/FeedbackPage.jsx | head -5
# Expected: lines 81-94

# 2. Confirm crmSubmitFeedback anchor
grep -n "crmSubmitFeedback\|crmAuthFetch.*feedback" frontend/src/api/services/crmService.js | head -3
# Expected: 434, 438

# 3. CRM no-token probe (confirm still live)
curl -s -X POST https://crm-preprod-7.preview.emergentagent.com/api/scan/feedback \
  -H "Content-Type: application/json" \
  -d '{"rating":4,"restaurant_id":"689"}' | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if d.get('success') else 'FAIL')"
# Expected: ok

# 4. No existing guestPhone
grep -rn "guestPhone" frontend/src/pages/FeedbackPage.jsx
# Expected: 0 results
```

---

## Edits — 5 exact edits

---

### E1 · `crmService.js:434–439` — extend `crmSubmitFeedback` with no-token branch

**Before:**
```javascript
/**
 * CR-2026-10-03-003: submit diner feedback to CRM (token path; CRM CR-096).
 * Body per contract §4c: { rating, message?, order_id? } + restaurant_id (short form).
 * Response shape untyped (contract L7) — callers only need the 2xx.
 */
export const crmSubmitFeedback = async (token, { rating, message, orderId, restaurantId }) => {
  const body = { rating, restaurant_id: String(restaurantId) };
  if (message) body.message = message;
  if (orderId) body.order_id = orderId;
  return crmAuthFetch('/scan/feedback', token, { method: 'POST', body: JSON.stringify(body) });
};
```

**After:**
```javascript
/**
 * CR-2026-10-03-003: submit diner feedback to CRM.
 * CR-2026-10-07-001: hybrid — token path (crmAuthFetch) OR no-token path (crmFetch + optional phone).
 * Token path: { rating, message?, order_id? } + restaurant_id.
 * No-token path: same + optional { phone, country_code } — CRM links if phone matches, else anonymous.
 * Response: { success, data: { linked: bool, feedback_id } } — caller needs only the 2xx; linked is informational.
 * Rate limit: 10/min IP, 3/10min per phone+restaurant → caller handles 429.
 */
export const crmSubmitFeedback = async (token, { rating, message, orderId, restaurantId, phone }) => {
  const body = { rating, restaurant_id: String(restaurantId) };
  if (message) body.message = message;
  if (orderId) body.order_id = orderId;
  if (!token && phone) {
    // CR-2026-10-07-001: no-token path — phone + country_code for optional linking
    body.phone = phone;
    body.country_code = '+91'; // CR-085-A: send separately for canonical matching
  }
  if (token) {
    return crmAuthFetch('/scan/feedback', token, { method: 'POST', body: JSON.stringify(body) });
  }
  // No token: use crmFetch (no Authorization header added)
  return crmFetch('/scan/feedback', { method: 'POST', body: JSON.stringify(body) });
};
```

---

### E2 · `FeedbackPage.jsx:18–23` — add `guestPhone` state

**Before:**
```javascript
  const [form, setForm] = useState({ rating: 0, message: '' });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState(null);
  const [scopeReady, setScopeReady] = useState(false);
```

**After:**
```javascript
  const [form, setForm] = useState({ rating: 0, message: '' });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState(null);
  const [scopeReady, setScopeReady] = useState(false);
  // CR-2026-10-07-001: guest phone for no-token feedback path
  const [guestPhone, setGuestPhone] = useState('');
```

---

### E3 · `FeedbackPage.jsx` — add guestPhone pre-fill effect after `latestOrderId` effect (after line 41)

**Add** immediately after `}, [crmToken]);` (the latestOrderId effect's closing):

```javascript
  // CR-2026-10-07-001: pre-fill phone from LandingPage capture (no-token path)
  useEffect(() => {
    if (crmToken) return;
    try {
      const guest = JSON.parse(localStorage.getItem('guestCustomer') || '{}');
      if (guest.phone) setGuestPhone(guest.phone);
    } catch {}
  }, [crmToken]);
```

---

### E4 · `FeedbackPage.jsx:45–66` — extend `handleSubmit` with no-token routing and 429 handling

**Before:**
```javascript
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating || !form.message.trim()) {
      toast.error('Please add a rating and a message');
      return;
    }
    setSubmitting(true);
    try {
      await crmSubmitFeedback(crmToken, {
        rating: form.rating,
        message: form.message.trim(),
        orderId: latestOrderId,
        restaurantId,
      });
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
```

**After:**
```javascript
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating || !form.message.trim()) {
      toast.error('Please add a rating and a message');
      return;
    }
    setSubmitting(true);
    try {
      // CR-2026-10-07-001: pass phone only on no-token path
      await crmSubmitFeedback(crmToken, {
        rating: form.rating,
        message: form.message.trim(),
        orderId: latestOrderId,
        restaurantId,
        phone: !crmToken ? (guestPhone || undefined) : undefined,
      });
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (err) {
      // CR-2026-10-07-001: handle CRM rate limiter (10/min IP, 3/10min per phone)
      if (err?.status === 429) {
        toast.error('Too many attempts. Please try again shortly.');
      } else {
        toast.error('Failed to submit. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
```

---

### E5 · `FeedbackPage.jsx:78–149` — remove sign-in card, unify form for all diners

**Before:**
```javascript
      <div className="feedback-content">
        {!scopeReady ? (
          <p className="feedback-intro" data-testid="feedback-loading">Loading…</p>
        ) : !crmToken ? (
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
        ) : submitted ? (
          <div className="feedback-success" data-testid="feedback-success">
            <div className="feedback-success-icon">&#10003;</div>
            <h2>Thank You!</h2>
            <p>Your feedback has been submitted. We appreciate you taking the time to help us improve.</p>
            <button className="feedback-btn" onClick={() => navigate(-1)} data-testid="feedback-back-after-submit">
              Back to Menu
            </button>
          </div>
        ) : (
          <>
            <p className="feedback-intro">{introText}</p>

            <form onSubmit={handleSubmit} className="feedback-form" data-testid="feedback-form">
              <div className="feedback-field">
                <label className="feedback-label">Rating *</label>
                <div className="feedback-stars" data-testid="feedback-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`feedback-star ${star <= (hoveredStar || form.rating) ? 'active' : ''}`}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setForm(p => ({ ...p, rating: star }))}
                      data-testid={`feedback-star-${star}`}
                    >
                      {star <= (hoveredStar || form.rating) ? <IoStar /> : <IoStarOutline />}
                    </button>
                  ))}
                  {form.rating > 0 && <span className="feedback-rating-text">{form.rating}/5</span>}
                </div>
              </div>

              <div className="feedback-field">
                <label className="feedback-label">Your Message *</label>
                <textarea
                  className="feedback-textarea"
                  placeholder="Tell us about your experience..."
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                  data-testid="feedback-message"
                />
              </div>

              <button type="submit" className="feedback-btn" disabled={submitting} data-testid="feedback-submit-btn">
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </>
        )}
      </div>
```

**After:**
```javascript
      <div className="feedback-content">
        {!scopeReady ? (
          <p className="feedback-intro" data-testid="feedback-loading">Loading…</p>
        ) : submitted ? (
          <div className="feedback-success" data-testid="feedback-success">
            <div className="feedback-success-icon">&#10003;</div>
            <h2>Thank You!</h2>
            <p>Your feedback has been submitted. We appreciate you taking the time to help us improve.</p>
            <button className="feedback-btn" onClick={() => navigate(-1)} data-testid="feedback-back-after-submit">
              Back to Menu
            </button>
          </div>
        ) : (
          // CR-2026-10-07-001: form shown for all diners (token + no-token); phone input conditional
          <>
            <p className="feedback-intro">{introText}</p>

            <form onSubmit={handleSubmit} className="feedback-form" data-testid="feedback-form">
              {/* CR-2026-10-07-001: optional phone for no-token diners — links feedback to their profile */}
              {!crmToken && (
                <div className="feedback-field" data-testid="feedback-guest-phone-field">
                  <label className="feedback-label">Your phone (optional)</label>
                  <input
                    type="tel"
                    className="feedback-phone-input"
                    placeholder="e.g. 9876543210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    data-testid="feedback-guest-phone"
                  />
                  <span className="feedback-phone-hint" style={{ fontSize: '12px', color: '#888', marginTop: 4, display: 'block' }}>
                    Enter your number to link this feedback to your profile
                  </span>
                </div>
              )}

              <div className="feedback-field">
                <label className="feedback-label">Rating *</label>
                <div className="feedback-stars" data-testid="feedback-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`feedback-star ${star <= (hoveredStar || form.rating) ? 'active' : ''}`}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setForm(p => ({ ...p, rating: star }))}
                      data-testid={`feedback-star-${star}`}
                    >
                      {star <= (hoveredStar || form.rating) ? <IoStar /> : <IoStarOutline />}
                    </button>
                  ))}
                  {form.rating > 0 && <span className="feedback-rating-text">{form.rating}/5</span>}
                </div>
              </div>

              <div className="feedback-field">
                <label className="feedback-label">Your Message *</label>
                <textarea
                  className="feedback-textarea"
                  placeholder="Tell us about your experience..."
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                  data-testid="feedback-message"
                />
              </div>

              <button type="submit" className="feedback-btn" disabled={submitting} data-testid="feedback-submit-btn">
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </>
        )}
      </div>
```

---

## Edit summary

| ID | File | What | Risk |
|---|---|---|---|
| E1 | `crmService.js:434–439` | Extend `crmSubmitFeedback` — no-token branch via `crmFetch` + `phone` field | HIGH — token path must stay unchanged |
| E2 | `FeedbackPage.jsx:18–23` | Add `guestPhone` state | LOW |
| E3 | `FeedbackPage.jsx` after line 41 | Add guestPhone pre-fill effect from `localStorage.guestCustomer` | LOW |
| E4 | `FeedbackPage.jsx:45–66` | Extend `handleSubmit` — pass `phone` on no-token path + 429 handling | HIGH |
| E5 | `FeedbackPage.jsx:78–149` | Remove sign-in card branch · unify form · add optional phone input | HIGH |

**Net: ~20 lines removed (sign-in card), ~30 lines added. 2 files.**

---

## Apply order (bottom-up within FeedbackPage.jsx)

1. `crmService.js` — E1 (independent)
2. `FeedbackPage.jsx` — E5 (~line 78, but largest block) → E4 (~45) → E3 (add after ~41) → E2 (~18)

> Note: E5 is at line ~78 which is AFTER E4 (~45). Apply E5 first (bottom-up), then E4, then E3, then E2.

---

## Self-test checklist (Role 3 must complete before QA handover)

| ST | Test | How | Expected |
|---|---|---|---|
| ST1 | Sign-in card gone | `grep "feedback-signin-required" FeedbackPage.jsx` | 0 results |
| ST2 | No-token → form shown | Browser, not logged in → go to /689/feedback | Form shows with optional phone input. No sign-in card. |
| ST3 | No-token, no phone, submit | Browser | 200 response, thank-you screen |
| ST4 | No-token, with phone, submit | Browser with phone pre-filled | 200 response, thank-you screen |
| ST5 | Token path unchanged | Browser, logged in → submit | Thank-you screen, no phone input shown |
| ST6 | 429 handled | Rapid repeated submissions | Toast "Too many attempts..." |
| ST7 | `yarn build` | `cd /app/frontend && yarn build` | Clean — 0 errors |

---

## QA test cases

| T | Scenario | Expected |
|---|---|---|
| T1 | No-token diner navigates to `/689/feedback` | Form shown — optional phone input visible, `data-testid="feedback-guest-phone-field"` present. `feedback-signin-required` NOT in DOM |
| T2 | `localStorage.guestCustomer` has phone set | Phone field pre-populated |
| T3 | No-token, leave phone blank, 4 stars + message, Submit | Thank-you screen. CRM called with no phone (anonymous, `linked:false`) |
| T4 | No-token, enter phone 9035133228, Submit | Thank-you screen. CRM called with phone + country_code, `linked:true` |
| T5 | Authenticated diner submits | Thank-you screen. Token path used. No phone in body. Phone field not shown. |
| T6 | 429 from CRM | Toast "Too many attempts. Please try again shortly." Form stays |
| T7 | `yarn build` | Clean |

---

## Code markers

```javascript
// CR-2026-10-07-001: <brief reason>
```

---

```
Planning complete: CR-2026-10-07-001
Stage: Impact Analysis + Implementation Plan (both complete)
Code reality: FULL — 5 exact edits with before/after anchored to current file state
Risk: HIGH
Files WILL change: crmService.js (E1) · FeedbackPage.jsx (E2–E5)
Files WILL NOT touch: server.py · AuthContext.jsx · LandingPage.jsx
Decisions: D1=(a) single thank-you · phone optional · country_code +91 when present
Status: AT GATE — awaiting "Gate 3 accepted for CR-2026-10-07-001"
```
