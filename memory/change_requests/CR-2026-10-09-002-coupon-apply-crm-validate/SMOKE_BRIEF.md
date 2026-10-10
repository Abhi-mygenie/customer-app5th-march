# Smoke Test Brief — CR-2026-10-09-002

<div class="meta">MyGenie Customer App · Change: "Coupon Apply button now validates against CRM and shows discount before order" · QA status: PASS (iteration_15.json) · Tester: ____________ · Date: ____________</div>

## What this is about

When a diner reaches the checkout page, there is a coupon code input box. Previously the Apply button did nothing — it was a silent no-op. The code got passed to POS in the order but with no discount applied in the UI and no feedback to the diner.

## What was wrong

The Apply button had no code wired to it. The diner typed a code, tapped Apply, and nothing happened. The Grand Total did not change. The diner had no way to know if the coupon worked.

## What the change does

The Apply button now calls CRM to validate the coupon code before the order is placed. If the code is valid, the discount appears in the price breakdown immediately — the Grand Total drops, taxes recalculate, and the diner sees exactly what they will pay. The discount also flows correctly to POS in the order payload.

If the code is invalid or expired, an error message appears below the input. The Apply button disables on empty input and when the diner is not signed in.

> **What must NOT have changed:** name auto-fill on the landing page, Browse Menu, loyalty points (Use / Remove), order placement, all other price rows.

## Before you start

| You need | Notes |
|---|---|
| Restaurant **689** (Kunafa Mahal) | Coupon feature is active here |
| Phone **9035133228** | Known customer — Gold tier |
| Coupon code **SEED_EDGE_STACKABLE** | A valid coupon — small discount, can be combined with loyalty points |
| A browser | Fresh tab |

---

## The test — 4 steps (~8 minutes)

### Step 1 — Land and add item

1. Open the restaurant 689 home page.
2. Type **9035133228**, wait for name "saurav" to auto-fill, tap **Browse Menu**.
3. Add any available item to the cart (e.g. "st edc" ₹10).
4. Tap the cart and proceed to the checkout / Review Order page.
5. **Expected:** checkout page loads. Price breakdown shows the item total and a coupon code input row with an **Apply** button.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 2 — Apply a valid coupon

1. In the coupon code input, type **SEED_EDGE_STACKABLE**.
2. Tap **Apply**.
3. **Expected:**
   - The input row is replaced by: **"🏷️ SEED_EDGE_STACKABLE — ₹X off"** with a **Remove** button.
   - A toast notification confirms the coupon was applied.
   - The Grand Total drops by ₹X.
   - The CGST and SGST rows show slightly lower values (tax recalculated on the discounted amount).

> The exact discount amount depends on CRM's current config for this coupon. The key check is that the total drops and taxes are lower.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 3 — Remove the coupon

1. Tap **Remove** next to the applied coupon.
2. **Expected:**
   - The coupon input row reappears (empty, ready to type).
   - Grand Total returns to the original amount.
   - Taxes return to their original values.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 4 — Invalid coupon

1. Type **BADCODE999** in the input and tap **Apply**.
2. **Expected:** Error text appears below the input: "Invalid coupon code: BADCODE999". The Apply button stays enabled (so the diner can correct the code). No change to the Grand Total.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Optional — Place an order with coupon applied (2 minutes)

1. Apply **SEED_EDGE_STACKABLE** again.
2. Place the order.
3. **Expected:** Order success page loads. The Bill Summary on the success page shows the discounted subtotal and correct taxes.

Result: ☐ PASS ☐ FAIL ☐ skipped

---

## Reporting

- All steps match → reply **"Smoke PASS CR-2026-10-09-002"**.
- Anything different → reply **"Smoke FAIL CR-2026-10-09-002 — step N"** with what you saw and a screenshot.

<div class="box"><b>Overall:</b> ☐ PASS &nbsp; ☐ FAIL &nbsp;&nbsp; Signed: ______________________ &nbsp; Date: ____________</div>
