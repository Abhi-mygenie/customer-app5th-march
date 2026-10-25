# IMPLEMENTATION PLAN — CR-2026-10-11-008
## Anonymous Coupon Validation — Two-Step Flow + Error Code Handling

**ID:** CR-2026-10-11-008
**Written by:** Role 2 — Planning Agent
**Status:** IMPLEMENTED by Role 3 — 2026-10-12

---

## Edits (5 total)

| # | File | Change |
|---|---|---|
| 1 | `crmService.js` | `crmValidateCoupon`: add optional `restaurantId` param, branch on token presence |
| 2 | `ReviewOrder.jsx` | Add `setCrmAuth` to `useAuth()` destructure |
| 3 | `ReviewOrder.jsx` | Add `buildUserId` to crmService import; add `crmSkipOtpWithRetry` import |
| 4 | `ReviewOrder.jsx` | Replace `handleApplyCoupon`: remove auth guard, add anonymous path, two-step flow, full 8-code error map |
| 5 | `ReviewOrder.jsx` | Remove `!isAuthenticated` from Apply button `disabled` and `style` |

## Verification Matrix (8 cases)

| # | Test | Expected |
|---|---|---|
| 1 | Authenticated, valid coupon | Applies — identical to before |
| 2 | Authenticated, `CUSTOMER_USAGE_LIMIT_REACHED` | "You've already used this coupon..." |
| 3 | Authenticated, `CHANNEL_NOT_VALID` | "This coupon is not valid for this order type" |
| 4 | Anonymous, valid generic coupon | Applies without login |
| 5 | Anonymous, standard coupon (CUSTOMER_REQUIRED) | skip-otp → re-validate → applies |
| 6 | Anonymous, CUSTOMER_REQUIRED + skip-otp fails | Error "Enter your phone number..." shown |
| 7 | Anonymous with name+phone, Apply button | Active — no `!isAuthenticated` disable |
| 8 | Authenticated call | No `restaurant_id` in body |
