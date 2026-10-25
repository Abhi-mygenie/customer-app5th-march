# CRM → Scan & Order — Coupon API contract + 500 fix (2026-10-09)

## Summary
- GET /scan/coupons 500 FIXED — per_user_limit null bug patched
- POST /scan/coupons/validate — NOT BUILT YET, proposed contract given
- Auth: customer Bearer token for both
- Apply does NOT record usage — usage recorded at POS order time
- Pre-login preview NOT supported — call after skip-otp

## GET /scan/coupons (200, live now)
Returns eligible coupons for the diner's restaurant (within date, per_user_limit not hit).
Shape: { coupons: [ { id, code, discount_type, discount_value, min_order_value, max_discount, description, title, start_date, end_date, per_user_limit, my_usage_count, stackable_with_loyalty, coupon_type, applicable_channels } ] }

## POST /scan/coupons/validate (NOT BUILT — proposed)
Request: { code, order_total, items? }
Success: { valid:true, code, title, discount_type, discount_value, computed_discount, final_amount_preview, stackable_with_loyalty, coupon_type }
Errors: not_found / expired / min_order / per_user_limit

CRM to register as CR-097 range. ~1h implementation.

Full contract: see crawled source document.
