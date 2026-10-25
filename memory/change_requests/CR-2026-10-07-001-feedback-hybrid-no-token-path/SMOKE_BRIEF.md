# Smoke Test Brief — CR-2026-10-07-001

<div class="meta">MyGenie Customer App · Change: "Feedback form now open to all diners — no sign-in required" · QA status: PASS (iteration_16.json) · Tester: ____________ · Date: ____________</div>

## What this is about

The feedback page previously showed a "Sign in to leave feedback" card to any diner who hadn't logged in. They had no way to submit feedback without going back to the home page, signing in, and returning. Most diners never did.

## What was wrong

The Submit Feedback form was hidden behind a sign-in gate. Diners who arrived on the feedback page without a session (common on low-friction scan-and-order flows) saw only a "Sign in" button and gave up.

## What the change does

The sign-in card is gone. Every diner — logged in or not — now sees the feedback form. There is a new optional phone number field at the top for non-logged-in diners. Entering your phone links the feedback to your loyalty profile; leaving it blank submits anonymously. Either way, the feedback goes through.

> **What must NOT have changed:** logged-in diners still see the same form (without the phone field), rating + message fields work identically, thank-you screen is the same.

## Before you start

| You need | Notes |
|---|---|
| Restaurant **689** | Feedback enabled here |
| A browser | Fresh tab, not logged in |

---

## The test — 3 steps (~5 minutes)

### Step 1 — No sign-in card

1. Open `https://mygenie-diners.preview.emergentagent.com/689/feedback` directly in a fresh browser tab (do not log in first).
2. **Expected:** The feedback form appears with a **"Your phone (optional)"** field at the top and the usual star rating and message fields below. There is **no** "Sign in" button and **no** "Feedback is available to signed-in diners" message.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 2 — Submit without phone (anonymous)

1. Leave the phone field blank.
2. Select any star rating (e.g. 4 stars).
3. Type a message (e.g. "Great food!").
4. Tap **Submit Feedback**.
5. **Expected:** Thank You screen appears. "Your feedback has been submitted."

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 3 — Logged-in diner sees no phone field

1. Go to the home page `/689`, type phone **9035133228**, wait for name to auto-fill, tap Browse Menu.
2. Navigate to `/689/feedback`.
3. **Expected:** Feedback form appears **without** the phone number field. Only stars and message. Submit works as before.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

## Reporting

- All steps match → reply **"Smoke PASS CR-2026-10-07-001"**.
- Anything different → reply **"Smoke FAIL CR-2026-10-07-001 — step N"** with what you saw and a screenshot.

<div class="box"><b>Overall:</b> ☐ PASS &nbsp; ☐ FAIL &nbsp;&nbsp; Signed: ______________________ &nbsp; Date: ____________</div>
