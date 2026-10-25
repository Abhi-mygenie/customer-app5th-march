# Scan & Order → CRM — Coupon API contract request
**Date:** 2026-10-09
**From:** Scan & Order (Customer App) team
**To:** CRM team
**Re:** Coupon code feature — we need the API contract before we can wire the Apply button

---

Hi team,

We are implementing the coupon code flow on the checkout page. The diner enters a coupon code and taps Apply — we need to validate the code against your API and show the discount before the order is placed.

We noticed `coupon_enabled` is one of the flags returned in `/scan/loyalty-rules/{rid}`. We are ready to wire the feature once we have the contract.

Two questions:

**1. What is the coupon API endpoint and what is the request/response contract?**

Specifically we need:
- The HTTP method and path
- The request body shape (which fields: coupon code, restaurant id, order total, customer token — required vs optional?)
- The success response shape — does it return the discount amount, discount type (flat / percent), and validity confirmation?
- The error response shape — invalid code, expired, not applicable to this restaurant
- Authentication requirement — customer token required, or public?
- Rate limits if any

**2. We are seeing a 500 Internal Server Error on `GET /scan/coupons` with a valid customer Bearer token on restaurant 689.**

Please confirm whether that endpoint is live and what it is intended to return (list of available coupons for the restaurant? or something else?). If it is not ready yet, please let us know the timeline.

Once we have the contract, we will register the CR on our side and plan the implementation.

Thank you.
