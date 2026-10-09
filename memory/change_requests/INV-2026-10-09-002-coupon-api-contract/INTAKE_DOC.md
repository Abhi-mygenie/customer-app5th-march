# INTAKE DOC — INV-2026-10-09-002

## Item Identity

| Field | Value |
|---|---|
| **ID** | INV-2026-10-09-002 |
| **Title** | Coupon Apply button is a no-op — CRM coupon API contract unknown |
| **Classification** | INVESTIGATION → will become a CR once CRM provides the contract |
| **Date Registered** | 2026-10-09 |
| **Severity** | P2 — revenue path (discount not applied, diner gets no feedback) |
| **Risk** | HIGH — touches ReviewOrder.jsx (CRITICAL file) and requires new CRM API contract |
| **Status** | BLOCKED — waiting on CRM to provide coupon endpoint contract |

## 1. What was found

### Our side
`ReviewOrder.jsx:1839` — Apply button has **no onClick handler**. It is a no-op. The coupon code is captured in state and passed in the POS order payload (`couponCode` at lines 1344 and 1523) but there is zero CRM validation, zero discount preview, and zero user feedback. Never implemented.

### CRM side
| Endpoint | Status |
|---|---|
| `GET /scan/coupons?restaurant_id=689` (in frozen contract §4a) | **500 Internal Server Error** |
| `POST /scan/coupon/validate` | 404 — does not exist |
| All other POST coupon paths probed | 404 |

`loyalty-rules/689` returns `coupon_enabled: false`. Coupon section shows because `restaurant.is_coupon === 'Yes'` (POS flag) — but CRM has coupons disabled for this restaurant.

### Current end-to-end behaviour
Coupon code the diner types IS sent to POS in the order payload. POS may or may not apply it server-side. Diner gets no feedback, no discount preview, no confirmation before placing the order.

## 2. What is needed from CRM (sent 2026-10-09)

1. Coupon API endpoint: method, path, request body, response shape, auth requirement, rate limits
2. Explanation of `GET /scan/coupons` 500 error
3. Confirmation of whether `coupon_enabled` in loyalty-rules is the flag we should gate the UI on

Filed at: `memory/inbox/OUTBOUND_TO_CRM_COUPON_API_CONTRACT_REQUEST_2026_10_09.md`

## 3. What we will build (once CRM replies)

- Wire Apply button to CRM's coupon validate endpoint
- Show discount amount before order placement
- Handle invalid / expired / not-applicable responses
- Files: `ReviewOrder.jsx` (CRITICAL) · `crmService.js`
- New CR to be registered on receipt of CRM contract

## 4. Blocked on

CRM reply with coupon API contract.
