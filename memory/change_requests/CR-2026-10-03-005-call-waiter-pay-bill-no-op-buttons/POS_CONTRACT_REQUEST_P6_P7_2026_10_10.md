# Scan & Order → POS — Call Waiter / Pay Bill direction + Pay Bill semantics
## Formal brief covering POS open items P6, P7, and one login improvement (P5-follow-up)
**Date:** 2026-10-10
**From:** Scan & Order (Customer App) team
**To:** MyGenie POS platform team
**Reference:** CR-2026-10-03-005 · Contract §7 O-4 · Contract §3 I6

---

## Background

The Customer App has "Call Waiter" and "Pay Bill" buttons on both the diner landing page and the order-success page. These buttons are currently silent no-ops — they fire a console log and nothing else. The diner believes a waiter has been called; nobody is notified.

The technical path is:
1. Our app calls CRM's `POST /scan/call-waiter` or `POST /scan/request-bill` endpoint.
2. CRM writes one record into the `pos_event_logs` collection.
3. **Nothing reads that collection.** POS confirmed on 2026-10-03 that it does not read `pos_event_logs`. CRM confirmed it only writes. So every event ever produced by these buttons is unread.

The buttons cannot work until this delivery gap is closed. We need your decision on how to close it.

---

## P6 — Direction: how does the notification actually reach a waiter?

Two live options (reading the shared database is not on the table — confirmed by POS):

**Option A — CRM pushes to POS:**
CRM, on receiving the call-waiter or pay-bill request, actively pushes a notification to POS (via webhook, POS API call, or another mechanism). POS then alerts staff on their device.

**Option B — Move the actions to POS directly:**
Instead of going through CRM at all, our app calls a POS endpoint directly (similar to the vendoremployee API we now use for admin login). POS handles the notification entirely.

**Questions for POS:**

| # | Question |
|---|---|
| 1 | Which option do you prefer — CRM-push (A) or POS-direct (B)? |
| 2 | If Option A: does CRM currently have a mechanism to push to POS, or does this require new work on your side? |
| 3 | If Option B: what is the POS endpoint path, authentication requirement, and request body for "call waiter" and "request bill"? |
| 4 | **Most important:** when the event arrives at POS, how does a waiter actually see it? On which device or screen does the notification appear? If this answer is "we haven't built it yet", we need to know — the feature cannot go live without it. |

---

## P7 — Pay Bill: request to settle, or in-app payment?

The Contract (§3 I6) reserves this question: **"Pay Bill" must be confirmed to mean a request to settle the bill at the table — NOT a payment flow.**

Our interpretation: the diner presses "Pay Bill", a notification goes to the waiter, and the waiter comes to the table to collect payment (cash, card terminal, UPI, etc.) in person. The app is not involved in the payment itself.

**Please confirm or correct:**

| # | Question |
|---|---|
| 1 | Does "Pay Bill" = a staff notification only, with no in-app payment processing? |
| 2 | Or does "Pay Bill" involve any payment capture in the POS system (card, UPI, online)? |
| 3 | Is there any ambiguity with the "Pay Online" / Razorpay flow? Those are separate and handled separately — we want to confirm "Pay Bill" is not in that category. |

Until this is confirmed, no planning or implementation may touch "Pay Bill" as a payments feature — it is reserved under the contract.

---

## Login improvement (minor, no urgency)

When we call `POST /api/v1/auth/vendoremployee/login`, the response does not include `restaurant_id`. We currently make a second call to `GET /api/v1/vendoremployee/profile` to get it.

If `restaurant_id` (the integer restaurant ID, e.g. `689`) were included in the login response, we could eliminate the second call.

**Request:** Consider adding `restaurant_id` (or `restaurants[0].id`) to the vendoremployee login response in a future release. This is not blocking anything today.

---

## Proposed reply format

```
P6 — Direction:
  Preferred option: A (CRM pushes) / B (POS direct) / other
  If A — CRM push mechanism exists: yes / needs building
  If B — POS endpoint: <path, method, auth, body>
  How waiter sees notification: <device / screen / not built yet>

P7 — Pay Bill semantics:
  Pay Bill = staff notification only (no payment capture): yes / no
  If no — clarification: <what it involves>
  Separate from Razorpay / online payment: yes / no

Login improvement:
  Will consider adding restaurant_id to login response: yes / backlog / no
```

---

*Filed by: Scan & Order engineering team*
*Tracked as: CR-2026-10-03-005 · Contract §7 O-4, O-11, A-1 · §3 I6*
*Related: CR-2026-09-15-004 (login improvement)*
