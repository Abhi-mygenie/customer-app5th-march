# Smoke Test Brief — CR-2026-10-11-008

<div class="meta">MyGenie Customer App · Change: "Anonymous coupon validation + two-step silent login + full error messages" · QA status: PASS (iteration_21.json + live browser) · Tester: ____________ · Date: ____________</div>

## What this is about

When a diner reaches the checkout (Review Order) screen, they can now apply a coupon code even before they have logged in. This test checks three things: (1) generic coupons apply instantly with no login, (2) standard coupons trigger a silent background login and then apply, and (3) error messages are clear and specific instead of raw technical text.

## What was wrong

The Apply button on the coupon row was greyed out and disabled for any diner who had not completed the login step. If they typed a coupon code and tried to click Apply, nothing happened. They had to first go back, enter their phone, log in, and then try the coupon again — a frustrating extra step for what should be a one-tap discount.

Additionally, when a coupon was invalid, the error message shown was often a raw technical string from the server (e.g. "Minimum order value is Rs300.0" or "Coupon not valid for channel dine_in") rather than a friendly, readable sentence.

## What the change does

1. **Anonymous coupon apply** — the Apply button is now active even without login. Generic coupons (available to all diners) validate and apply instantly, no login needed.
2. **Two-step silent login** — if the coupon requires a customer account, the app silently calls the skip-otp service in the background using the phone already typed on screen. The diner never sees a login screen — the coupon just applies.
3. **Friendly error messages** — all 8 coupon error types now show a clear sentence. For example: "Minimum order value not met for this coupon" instead of the raw server string.

> **What must NOT have changed:** Loyalty points, coupon Remove button, order placement payload, name pre-fill, and all other price rows are untouched.

## Before you start

| You need | Notes |
|---|---|
| Restaurant **689** (Kunafa Mahal) | App: https://genie-customer-app-1.preview.emergentagent.com/689 |
| Test coupons on r689 | STO-GENERIC-10 (generic, 10% off) · STO-STANDARD (standard, 15% off) · STO-GENERIC-MIN (generic, ₹50 flat, min ₹300) |
| Test customer | Phone **9035133228** (Saurav) |
| Cart with items | Add items totalling at least ₹100 (use any available item or inject via localStorage if items are sold out) |

---

## The test — 4 steps (~10 minutes)

### Step 1 — Generic coupon applies without login

1. Open **https://genie-customer-app-1.preview.emergentagent.com/689**
2. **Do NOT tap Browse Menu** — instead go directly to Review Order (or navigate to `/689/review-order` with a cart already set)
3. Fill in name **"Saurav"** and phone **9035133228** in the Customer Details section (do not submit/login)
4. In the Price Breakdown section, type **STO-GENERIC-10** in the coupon input and tap **Apply**
5. **Expected:**
   - The Apply button is **active** (not greyed) before tapping
   - Toast appears: **"Coupon applied — ₹X off"** (10% of your cart total)
   - Coupon row shows **"STO-GENERIC-10 — ₹X off"** with a Remove button
   - Grand Total is reduced accordingly
   - **No login screen or phone prompt appeared**

> Old behaviour: Apply button was greyed — nothing happened when clicked.

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

### Step 2 — Standard coupon triggers silent login and applies

1. Clear the applied coupon (tap Remove if Step 1 left one applied)
2. Ensure name **"Saurav"** and phone **9035133228** are filled in Customer Details
3. Type **STO-STANDARD** in the coupon input and tap **Apply**
4. **Expected:**
   - The Apply button shows a brief loading indicator (**"..."**)
   - Toast appears: **"Coupon applied — ₹X off"** (15% of cart total)
   - Coupon row shows **"STO-STANDARD — ₹X off"** with Remove
   - **No login screen appeared** — the app handled it silently in the background
   - Loyalty points section activates (because the user is now logged in)

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

### Step 3 — Error message: minimum order not met

1. Remove any applied coupon
2. Ensure cart total is **below ₹300** (e.g. a single ₹199 item)
3. Type **STO-GENERIC-MIN** and tap **Apply**
4. **Expected:** Error text appears below the input: exactly **"Minimum order value not met for this coupon"**

> Old behaviour: showed raw server text "Minimum order value is Rs300.0".

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

### Step 4 — Error message: invalid code

1. Type **ZZZINVALID** (a code that does not exist) and tap **Apply**
2. **Expected:** Error text: **"Invalid coupon code"**

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

## Reporting

- All steps match → reply **"Smoke PASS CR-2026-10-11-008"**
- Anything different → reply **"Smoke FAIL CR-2026-10-11-008 — step N"** with what you saw and a screenshot if possible

<div class="box"><b>Overall:</b> ☐ PASS &nbsp; ☐ FAIL &nbsp;&nbsp; Signed: ______________________ &nbsp; Date: ____________</div>
