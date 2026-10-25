# Smoke Test Brief — CR-2026-10-09-003

<div class="meta">MyGenie Customer App · Change: "Loyalty points redemption cap now calculated server-side by CRM" · QA status: PASS (iteration_12.json) · Tester: ____________ · Date: ____________</div>

## What this is about

When a diner reaches the checkout page, the app shows how many loyalty points they can redeem on that order. Previously the app calculated this cap itself using several fields from the loyalty config — but the calculation was approximate and tier-blind. Now the app asks CRM directly, gets an exact server-calculated answer, and shows it to the diner.

## What was wrong

The checkout page calculated the max redeemable points client-side using three separate cap values from the loyalty config, applied independently. A Gold diner on restaurant 689 was being shown the wrong cap — the calculation ignored per-tier rates and could allow more or less redemption than CRM would actually honour.

## What the change does

When a logged-in diner opens the checkout page, the app calls CRM's `/scan/max-redeemable` endpoint with the cart total. CRM returns the exact number of points the diner can redeem (`max_points_redeemable`) and the exact ₹ ceiling (`max_discount_value`), accounting for their tier, all caps, and the order amount together.

The diner now sees: **"Use up to 36 pts (₹108 off)"** instead of the old **"2000 points (Worth ₹6000)"**. The Use button applies exactly what CRM authorised — no more, no less.

The earn preview ("You will earn X points on this order") also now shows CRM's server-calculated figure.

> **What must NOT have changed:** Name auto-fill on landing, Browse Menu flow, adding items to cart, order placement, all other price breakdown rows, GST calculation.

## Before you start

| You need | Notes |
|---|---|
| Restaurant **689** (Kunafa Mahal) | Loyalty is active here |
| Phone **9035133228** | Known customer — Gold tier, 2,000 points |
| A browser | Fresh tab recommended |

---

## The test — 5 steps (~10 minutes)

### Step 1 — Land and auto-fill

1. Open the restaurant 689 home page.
2. Type **9035133228** in the phone field and wait 1 second.
3. **Expected:** name field fills with "saurav". "Welcome back, saurav!" hint appears.
4. Tap **Browse Menu**. You should land on the menu page.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 2 — Add an item and reach checkout

1. On the menu, add any available item to the cart (e.g. "st edc" ₹10, or any non-sold-out item).
2. Tap the cart / View Order button.
3. **Expected:** the Review Order (checkout) page loads without error. You see the price breakdown card.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 3 — Loyalty row shows CRM cap

1. In the Price Breakdown section, find the loyalty points row (🎁 icon).
2. **Expected:** the row shows text in the form **"Use up to N pts (₹X off)"** — a specific cap, not "2000 points".
3. Below that, "2,000 pts available" subtext.
4. The **Use** button is either enabled (order above minimum threshold) or disabled with a hint like "Add ₹X more to redeem" (order below minimum).

> This is the key change. The old UI showed "2000 points (Worth ₹6000)" — the total balance with no cap. The new UI shows the CRM-approved redeemable amount for this specific order.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 4 — Use and Remove

*(Only if Use button is enabled in Step 3)*

1. Tap **Use**.
2. **Expected:** the row changes to "Using N points (−₹X)". The Grand Total decreases by ₹X. A **Remove** button appears.
3. Tap **Remove**.
4. **Expected:** the discount clears. Grand Total returns to original.

Result: ☐ PASS ☐ FAIL ☐ skipped (Use was disabled) — notes: ______________________________

---

### Step 5 — Earn preview

1. Scroll below the price breakdown card.
2. Look for the "You will earn X points" section.
3. **Expected:** the section appears showing a points earn figure and "Worth ₹Y". The numbers come from CRM and may differ from what the app showed previously.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

## Reporting

- All steps match → reply **"Smoke PASS CR-2026-10-09-003"**.
- Anything different → reply **"Smoke FAIL CR-2026-10-09-003 — step N"** with what you saw and a screenshot.

<div class="box"><b>Overall:</b> ☐ PASS &nbsp; ☐ FAIL &nbsp;&nbsp; Signed: ______________________ &nbsp; Date: ____________</div>
