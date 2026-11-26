# OUTBOUND TO CRM — Customer Name Update Endpoint
## BUG-2026-10-11-004 · Point 5

**To:** CRM Team
**From:** MyGenie Customer App (Scan & Order)
**Date:** 2026-10-11
**Ref:** BUG-2026-10-11-004 — New customer name not pre-filling on review screen

---

## Background — What We Are Building

When a new customer uses our scan & order app for the first time:

1. They enter their **phone number and name** on the landing page
2. They click **Browse Menu**
3. We call `POST /scan/auth/skip-otp` — we will now include `name` in the body
   (confirmed supported per CRM contract)
4. CRM creates the customer record with their name
5. The customer reaches the **Review Order** page — name and phone are pre-filled
   from the CRM profile

This is the happy path. Two edge cases arise on the Review Order page that
we need your help with.

---

## Edge Case 1 — Customer Corrects Their Name on Review Screen

**Scenario:**

```
Landing page:
  Customer types: phone = 9535310660, name = "Jon"  ← typo
  Clicks Browse Menu

skip-otp called:
  POST /scan/auth/skip-otp  { phone: "9535310660", name: "Jon", ... }
  CRM creates customer, name stored as "Jon"
  Token returned, crmGetProfile called → name "Jon" shown on review screen

Review Order page:
  Customer notices the typo
  Edits name field: "Jon" → "John"
  Clicks Place Order
```

At this point, CRM still has `name: "Jon"`. The order goes through with
`cust_name: "John"` in the POS payload. CRM's record and the order record
are now inconsistent.

**What we need:**
When the customer changes their name on the review page, we want to call
CRM to update the stored name so it stays in sync.

**Our ask:**
Is there an endpoint to update a customer's name?

Ideally:
```
PATCH /scan/auth/me
Authorization: Bearer <customer_crm_token>
Body: { "name": "John" }

Response: { success: true }
```

Or any equivalent path you already expose for profile updates.

---

## Edge Case 2 — Customer Changes Phone Number on Review Screen

**Scenario:**

```
Landing page:
  Customer types: phone = 9535310660, name = "John"
  Clicks Browse Menu

skip-otp called → CRM authenticates/creates customer for 9535310660
Token for 9535310660 stored

Review Order page:
  Customer realises they entered the wrong number
  Edits phone field: 9535310660 → 9535310661
  Clicks Place Order
```

At this point, we have a CRM token for 9535310660. But the order will be
placed with phone 9535310661. CRM's loyalty, points, and profile are linked
to the wrong number.

**What we need:**
When the customer changes their phone on the review page, we want to
re-authenticate with the new number — essentially call skip-otp again
with the new phone.

```
POST /scan/auth/skip-otp
Body: { "phone": "9535310661", "name": "John", "restaurant_id": "689" }

Response: new token for 9535310661
```

We will discard the old token and replace it with the new one.

**Questions:**
1. Does skip-otp work correctly for this re-authentication flow?
2. If 9535310661 is a new customer, will CRM create a fresh record?
3. If 9535310661 already exists in CRM, will CRM return their existing profile
   (name, points, tier)?

---

## Summary of What We Need From CRM

| # | Need | Endpoint guess | Confirmed? |
|---|---|---|---|
| 1 | Update customer name after creation | `PATCH /scan/auth/me` or similar | **Needs confirmation** |
| 2 | Re-authenticate with a different phone on same session | `POST /scan/auth/skip-otp` (repeat call) | Likely yes — needs confirmation |

---

## What We Are NOT Asking

- We are not asking for any change to skip-otp (name field confirmed supported)
- We are not asking to merge or link two customer accounts
- We are not asking for OTP verification on phone change — the existing
  skip-otp frictionless flow is sufficient

---

## Priority

P2 — The app works without these (customer can still place orders). But
CRM will have stale or wrong name/phone data for customers who correct
their details on the review screen.

Please reply with:
1. The exact endpoint path and method for name update
2. Confirmation that repeat skip-otp calls work for phone change
3. Any constraints (rate limits, fields accepted, auth requirements)
