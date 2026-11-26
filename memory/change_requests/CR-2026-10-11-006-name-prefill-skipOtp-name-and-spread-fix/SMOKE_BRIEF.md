# Smoke Test Brief — CR-2026-10-11-006

<div class="meta">MyGenie Customer App · Change: "Customer name entered on landing page now correctly pre-fills on Review Order screen" · QA status: PASS (iteration_19.json) · Tester: ____________ · Date: ____________</div>

## What this is about

When a customer types their name and phone number on the restaurant landing page and taps Browse Menu, their name should automatically appear in the name field on the Review Order (checkout) screen. This test confirms the name flows correctly end-to-end — for brand new customers and for returning ones.

## What was wrong

A new customer typed "Ravi" on the landing page and tapped Browse Menu. The app called skip-otp to log them in silently. CRM came back with an empty name (because the customer was new and had no name stored yet). The app then overwrote the captured "Ravi" with the blank value from CRM — so the Review Order screen showed an empty name field. The customer had to type their name a second time.

A related issue: even if skip-otp was updated to accept and return the name, a background CRM profile fetch could fire just after and overwrite the correct name with an older blank value.

## What the change does

Three fixes were applied together:

1. **Spread order fixed** — the captured name from the landing page now always wins over any blank value returned by CRM.
2. **Name sent to CRM** — skip-otp now sends the captured name to CRM so it is stored on the new customer record immediately.
3. **Defensive merge** — a background profile refresh that runs after login can no longer overwrite a correct name with a blank one.

> **What must NOT have changed:** Browse Menu, order placement, loyalty points, coupon apply, delivery address, and all other screens are untouched. Only the name pre-fill path was changed.

## Before you start

| You need | Notes |
|---|---|
| Restaurant **689** (Kunafa Mahal) | App: https://genie-customer-app-1.preview.emergentagent.com/689 |
| A new (unused) phone number | e.g. **9100000001** — pick any number not previously used on r689 |
| Returning customer phone | **9579504871** |

---

## The test — 3 steps (~8 minutes)

### Step 1 — New customer: name pre-fills on Review Order

1. Open **https://genie-customer-app-1.preview.emergentagent.com/689**
2. Enter an unused phone number (e.g. **9100000001**) and name **"SmokeTest"**
3. Tap **Browse Menu**
4. Add any available item to the cart
5. Tap the cart icon and proceed to the **Review Order / checkout page**
6. **Expected:** The name field on Review Order already shows **"SmokeTest"** — it does not appear blank

> This was the bug. Old behaviour: name field was blank and the customer had to re-type it.

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

### Step 2 — New customer: name does NOT flash or get overwritten

1. Continuing from Step 1 — watch the name field for 5 seconds after the page loads
2. **Expected:** The name stays as **"SmokeTest"** throughout — it does not briefly disappear or change to a blank value

> The defensive merge (fix 3) prevents the background profile fetch from wiping the name.

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

### Step 3 — Returning customer: name pre-fills from CRM

1. Open **https://genie-customer-app-1.preview.emergentagent.com/689** in a new / cleared browser tab
2. Enter phone **9579504871** (returning customer) and leave the name field blank (or type anything)
3. Tap **Browse Menu**
4. Proceed to **Review Order**
5. **Expected:** Name field is pre-filled with the name stored in CRM for this customer (e.g. **"MYGENieT"** or similar)

> Wait at least 60 seconds between Step 1 and Step 3 to avoid CRM rate limits.

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

## Reporting

- All steps match → reply **"Smoke PASS CR-2026-10-11-006"**
- Anything different → reply **"Smoke FAIL CR-2026-10-11-006 — step N"** with what you saw and a screenshot if possible

<div class="box"><b>Overall:</b> ☐ PASS &nbsp; ☐ FAIL &nbsp;&nbsp; Signed: ______________________ &nbsp; Date: ____________</div>
