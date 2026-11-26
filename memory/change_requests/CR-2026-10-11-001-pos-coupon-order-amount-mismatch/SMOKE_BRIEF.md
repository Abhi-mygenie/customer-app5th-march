# Smoke Test Brief — CR-2026-10-11-001

<div class="meta">MyGenie Customer App · Change: "Coupon code no longer sent to POS unless CRM has validated it" · QA status: PASS (iteration_18.json) · Tester: ____________ · Date: ____________</div>

## What this is about

When a diner reaches the checkout page and types a coupon code, the app asks CRM to validate it. This test checks that if CRM does not recognise the code — or the coupon only exists inside POS but not in CRM — the coupon is cleanly dropped and does not silently reach POS behind the diner's back.

## What was wrong

When a diner typed a coupon code and tapped Apply, the app sent it to CRM to validate. If CRM said "I don't know this code", the app correctly showed an error and set the discount to ₹0. However it was still sending the raw coupon code to POS in the order payload. POS, seeing a code it recognised, applied its own discount — say ₹197 off. POS's final total (₹109) and the amount our app sent as `order_amount` (₹315, calculated without that discount) were now completely different numbers. The diner was charged the wrong amount by Razorpay, POS's records were wrong, and loyalty earn points were based on the wrong total.

## What the change does

The app now only sends a coupon code to POS if CRM has already confirmed it is valid. If CRM rejects the code for any reason, the code is silently dropped from the order payload — POS receives an empty coupon field and applies no discount of its own. The error message shown to the diner was also updated from the generic "Could not validate coupon. Please try again." to the clearer **"Coupon not recognized for online orders."**

> **What must NOT have changed:** valid CRM coupons still work exactly as before — the discount shows in the price breakdown and flows to POS correctly. Loyalty points, name auto-fill, Browse Menu, and all other price rows are untouched.

## Before you start

| You need | Notes |
|---|---|
| Restaurant **689** (Kunafa Mahal) | Coupon feature is active here |
| A signed-in customer account | Phone **+919579504871** — use at landing page |
| An item in the cart | Any available menu item |
| Coupon code **TESTINVALIDXYZ** | A code that does not exist in CRM |

---

## The test — 3 steps (~6 minutes)

### Step 1 — Land and add item

1. Open the restaurant 689 home page.
2. Type **+919579504871** at the landing page and tap **Browse Menu**.
3. Add any available item to the cart (e.g. ₹10 item).
4. Tap the cart and proceed to the **Review Order / checkout page**.
5. **Expected:** checkout page loads with a coupon code input row and an **Apply** button visible in the price section.

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

### Step 2 — Apply an unrecognised coupon code

1. In the coupon input, type **TESTINVALIDXYZ**.
2. Tap **Apply**.
3. **Expected:**
   - A toast notification appears saying exactly: **"Coupon not recognized for online orders."**
   - The coupon is **not** shown as applied in the price breakdown.
   - The Grand Total does **not** change.
   - The Apply button becomes available again after the error.

> This was the bug scenario. The old message said "Could not validate coupon. Please try again." — if you see the old wording, that is a FAIL.

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

### Step 3 — Place the order and check the amount

1. With **no coupon applied**, place the order (tap Place Order / Pay).
2. **Expected:**
   - The order success page loads.
   - The total shown on the success page matches what was displayed on the Review Order page before placing.
   - The amount is a realistic non-zero number (e.g. ₹10 or more — **not ₹0, not ₹6**).

> This confirms the payload mismatch is gone. The old bug could result in `order_amount = ₹0` or ₹6 being sent to POS while the screen showed a different number.

Result: ☐ PASS &nbsp; ☐ FAIL — notes: ______________________________

---

## Reporting

- All steps match → reply **"Smoke PASS CR-2026-10-11-001"**.
- Anything different → reply **"Smoke FAIL CR-2026-10-11-001 — step N"** with what you saw and a screenshot if possible.

<div class="box"><b>Overall:</b> ☐ PASS &nbsp; ☐ FAIL &nbsp;&nbsp; Signed: ______________________ &nbsp; Date: ____________</div>
