# Feature Specification: Dual Payment Options

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-001 |
| **Title** | Dual Payment Options (Online + COD) |
| **Created** | April 10, 2026 |
| **Last Updated** | April 10, 2026 |
| **Status** | 📝 Draft |
| **Priority** | P1 - High |
| **Estimated Effort** | 3-4 days |
| **Assignee** | TBD |

---

## 1. Problem Statement

**Current Behavior:**
- If restaurant has Razorpay → Only "Pay & Proceed" (prepaid)
- If restaurant has no Razorpay → Only "Place Order" (postpaid/COD)
- No choice given to customer

**Business Need:**
- Restaurants want to offer BOTH payment options
- Different order types (dine-in, takeaway, delivery) may have different payment rules
- Button labels should be customizable per restaurant branding

---

## 2. Proposed Solution

Add configurable dual payment options on ReviewOrder page:
- Customer can choose between Online Payment or COD
- Visibility controlled by settings per order type
- Button labels customizable from settings

---

## 3. Configuration Schema

### 3.1 New Settings Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `codEnabled` | boolean | `false` | Show COD option |
| `onlinePaymentDinein` | boolean | `true` | Online payment for dine-in |
| `onlinePaymentTakeaway` | boolean | `true` | Online payment for takeaway |
| `onlinePaymentDelivery` | boolean | `false` | Online payment for delivery |
| `payOnlineLabel` | string | `"Pay Online"` | Customizable label |
| `payAtCounterLabel` | string | `"Pay at Counter"` | Customizable label |

### 3.2 Settings Logic

```javascript
// Determine which options to show
const showOnlineOption = restaurant.razorpay?.razorpay_key && 
  settings[`onlinePayment${orderType}`]; // e.g., onlinePaymentDinein

const showCodOption = settings.codEnabled;

// Labels
const onlineLabel = settings.payOnlineLabel || "Pay Online";
const codLabel = settings.payAtCounterLabel || "Pay at Counter";
```

### 3.3 Display Rules

| Condition | Show Online | Show COD | Default Selection |
|-----------|-------------|----------|-------------------|
| Both enabled | ✅ | ✅ | Online |
| Only Online | ✅ | ❌ | Online |
| Only COD | ❌ | ✅ | COD |
| Neither | ❌ | ❌ | Error state |

---

## 4. UI/UX Changes

### 4.1 ReviewOrder Page - Payment Method Selector

**Location:** Above "Earn rewards" section, below Price Breakdown

**Design:**
```
┌─────────────────────────────────────────────────┐
│ 💳 Payment Method                               │
│                                                 │
│ ┌─────────────────┐  ┌─────────────────────┐   │
│ │ ● Pay Online    │  │ ○ Pay at Counter    │   │
│ │   (UPI/Card)    │  │   (Cash)            │   │
│ └─────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**States:**
- Selected: Filled radio, highlighted border (primary color)
- Unselected: Empty radio, subtle border

### 4.2 Submit Button Text

| Selection | Button Text |
|-----------|-------------|
| Online | "Pay & Proceed ₹{amount}" |
| COD | "Place Order" |

### 4.3 Visibility Rules

- If only one option available → Hide selector, show only button
- If both options → Show selector with default = Online

---

## 5. Flow Diagrams

### 5.1 Order Placement Flow

```
                    ┌─────────────────┐
                    │  ReviewOrder    │
                    │  Page Loads     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Check Settings  │
                    │ & Razorpay Key  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐
       │ Both Options│ │Online Only│ │ COD Only  │
       │   Enabled   │ │  Enabled  │ │  Enabled  │
       └──────┬──────┘ └─────┬─────┘ └─────┬─────┘
              │              │              │
       ┌──────▼──────┐       │              │
       │Show Selector│       │              │
       └──────┬──────┘       │              │
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │ Customer Clicks │
                    │    Submit       │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
       ┌──────▼──────┐              ┌──────▼──────┐
       │   Online    │              │     COD     │
       │  Selected   │              │  Selected   │
       └──────┬──────┘              └──────┬──────┘
              │                             │
       ┌──────▼──────┐              ┌──────▼──────┐
       │payment_type │              │payment_type │
       │ = 'prepaid' │              │= 'postpaid' │
       └──────┬──────┘              └──────┬──────┘
              │                             │
       ┌──────▼──────┐              ┌──────▼──────┐
       │  Razorpay   │              │   Direct    │
       │    Flow     │              │  Success    │
       └──────┬──────┘              └──────┬──────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │  Order Success  │
                    │     Page        │
                    └─────────────────┘
```

### 5.2 Pay Bill Flow (COD → Online)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Order Success  │────▶│  Click Pay Bill │────▶│  Razorpay Flow  │
│   (Unpaid)      │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                ┌────────▼────────┐
                                                │  Order Success  │
                                                │    (Paid)       │
                                                └─────────────────┘
```

---

## 6. API Changes

### 6.1 Existing APIs Used

| API | Change | Notes |
|-----|--------|-------|
| `/customer/order/place` | No change | `payment_type` already supported |
| Razorpay Create Order | No change | Reuse for Pay Bill |
| Razorpay Verify | No change | Reuse for Pay Bill |

### 6.2 Config API Changes

| Endpoint | Change |
|----------|--------|
| `GET /config/{restaurantId}` | Add new settings fields |
| `PUT /config` | Support new settings fields |

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `/frontend/src/pages/ReviewOrder.jsx` | Add payment selector UI, handle selection state |
| `/frontend/src/pages/OrderSuccess.jsx` | Pay Bill triggers Razorpay (validate reuse) |
| `/backend/server.py` | Add new config fields to schema |
| `/frontend/src/pages/admin/SettingsPage.jsx` | Add payment config options (if exists) |

---

## 8. Test Cases

### TC-001: Payment Selector Visibility - Both Options Enabled

| Field | Value |
|-------|-------|
| **Test ID** | TC-001 |
| **Type** | UI / Unit |
| **Priority** | Critical |

**Preconditions:**
- Restaurant has Razorpay key configured
- `codEnabled: true`
- `onlinePaymentDinein: true`
- Order type is `dinein`

**Steps:**
1. Add items to cart
2. Navigate to ReviewOrder page

**Expected Result:**
- Payment Method selector is visible
- Both "Pay Online" and "Pay at Counter" options shown
- "Pay Online" is selected by default
- Button shows "Pay & Proceed ₹{amount}"

---

### TC-002: Payment Selector Visibility - Only COD Enabled

| Field | Value |
|-------|-------|
| **Test ID** | TC-002 |
| **Type** | UI / Unit |
| **Priority** | Critical |

**Preconditions:**
- Restaurant has NO Razorpay key OR `onlinePaymentDinein: false`
- `codEnabled: true`

**Steps:**
1. Navigate to ReviewOrder page

**Expected Result:**
- Payment Method selector is NOT visible
- Button shows "Place Order"
- `payment_type: 'postpaid'` sent to API

---

### TC-003: COD Selection → Correct Payload

| Field | Value |
|-------|-------|
| **Test ID** | TC-003 |
| **Type** | Integration |
| **Priority** | Critical |

**Preconditions:**
- Both options enabled

**Steps:**
1. Navigate to ReviewOrder page
2. Select "Pay at Counter" option
3. Click "Place Order"
4. Check console/network logs

**Expected Result:**
- `payment_type: 'postpaid'` in API payload
- No Razorpay SDK triggered
- Redirect to Order Success page directly

---

### TC-004: Custom Labels Display

| Field | Value |
|-------|-------|
| **Test ID** | TC-004 |
| **Type** | UI / Unit |
| **Priority** | Medium |

**Preconditions:**
- Settings configured:
  - `payOnlineLabel: "UPI/Card Payment"`
  - `payAtCounterLabel: "Cash at Billing"`

**Steps:**
1. Navigate to ReviewOrder page

**Expected Result:**
- Online option shows "UPI/Card Payment"
- COD option shows "Cash at Billing"
- NOT default "Pay Online" / "Pay at Counter"

---

### TC-005: Pay Bill Flow (COD → Online)

| Field | Value |
|-------|-------|
| **Test ID** | TC-005 |
| **Type** | E2E |
| **Priority** | Critical |

**Preconditions:**
- Existing COD order (unpaid)
- Restaurant has Razorpay configured

**Steps:**
1. Go to Order Success page for unpaid order
2. Click "Pay Bill" button
3. Complete Razorpay payment

**Expected Result:**
- Razorpay SDK opens with correct amount
- On success, order marked as paid
- Success page shows paid status

---

## 9. Acceptance Criteria

- [ ] Payment selector visible when both options enabled
- [ ] Selector hidden when only one option available
- [ ] Custom labels render correctly from settings
- [ ] Online selection → `payment_type: 'prepaid'` → Razorpay flow
- [ ] COD selection → `payment_type: 'postpaid'` → Direct success
- [ ] Pay Bill reuses Razorpay flow for COD orders
- [ ] Settings admin can configure all new fields

---

## 10. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Razorpay Integration | ✅ Done | Existing |
| Config API | ✅ Done | Need to add fields |
| Pay Bill API | ⚠️ Validate | Check if reusable |

---

## 11. Rollback Plan

If issues arise:
1. Set `codEnabled: false` for affected restaurants
2. Reverts to current single-option behavior
3. No data migration needed

---

## 12. Related Bugs/Features

| ID | Title | Relationship |
|----|-------|--------------|
| BUG-035 | f_order_status for Razorpay | `payment_type` logic reused |
| BUG-034 | Incorrect payment_type | Fixed - prerequisite |
| FEAT-002 | Firebase Notifications | Phase 2 - depends on this |

---

## 13. Security Considerations

| Risk | Mitigation |
|------|------------|
| Payment type tampering | Validate `payment_type` on backend, don't trust frontend |
| Razorpay key exposure | Key already in frontend (required by SDK), use test keys in dev |
| COD fraud | Backend should enforce restaurant's payment settings |
| Replay attacks | Razorpay signature verification already in place |

**Checklist:**
- [ ] Backend validates payment_type against restaurant settings
- [ ] Cannot place prepaid order if Razorpay not configured
- [ ] Cannot place COD order if codEnabled is false
- [ ] Razorpay signature verified before marking paid

---

## 14. Performance Impact

| Area | Impact | Notes |
|------|--------|-------|
| API Calls | None | No additional API calls |
| Bundle Size | Minimal | ~1KB for selector component |
| Render Time | None | Simple radio buttons |
| Settings Load | None | Piggybacks on existing config API |

**No performance concerns identified.**

---

## 15. Localization

| Label Key | English (Default) | Hindi | Notes |
|-----------|-------------------|-------|-------|
| `paymentMethodTitle` | "Payment Method" | "भुगतान विधि" | Section header |
| `payOnlineLabel` | "Pay Online" | "ऑनलाइन भुगतान" | Configurable |
| `payAtCounterLabel` | "Pay at Counter" | "काउंटर पर भुगतान" | Configurable |
| `payAndProceed` | "Pay & Proceed" | "भुगतान करें" | Button text |
| `placeOrder` | "Place Order" | "ऑर्डर करें" | Button text |

**Implementation:**
- Labels from settings override i18n defaults
- If settings label empty → fallback to i18n
- Future: Add language selector to settings

---

## 16. A/B Testing

| Variant | Description | Hypothesis |
|---------|-------------|------------|
| A (Control) | Online pre-selected | Current assumption |
| B | COD pre-selected | May increase conversions for hesitant users |
| C | No default (must select) | Forces conscious choice |

**Metrics to Compare:**
- Order completion rate
- Payment success rate
- Average order value
- Time to checkout

**Implementation:** Add `paymentDefaultSelection` setting: `"online"` | `"cod"` | `"none"`

---

## 17. Metrics to Track

### 17.1 Business Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Online Payment Adoption | % orders using online payment | Track baseline first |
| COD to Online Conversion | % COD orders later paid via Pay Bill | > 20% |
| Checkout Abandonment | Drop-off at payment selection | < 5% increase |
| Order Completion Rate | Orders placed / checkout started | No regression |

### 17.2 Technical Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Payment Selector Render Time | Time to show options | > 100ms |
| Razorpay SDK Load Time | Time to load SDK | > 2s |
| Payment API Error Rate | Failed payment attempts | > 5% |
| Config API Latency | Settings fetch time | > 500ms |

### 17.3 Tracking Implementation

```javascript
// Analytics events to add
analytics.track('payment_method_viewed', { 
  options_shown: ['online', 'cod'],
  default_selection: 'online'
});

analytics.track('payment_method_selected', {
  selected: 'cod',  // or 'online'
  changed_from_default: true
});

analytics.track('order_placed', {
  payment_type: 'postpaid',
  amount: 1600
});
```

---

## 18. Future Enhancements (Phase 2)

| Feature | Description |
|---------|-------------|
| Firebase Notifications | Pay Bill / Call Waiter sends notification to staff |
| Payment Analytics | Track online vs COD preference |
| Dynamic Default | Set default based on order history |

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| Apr 10, 2026 | AI Agent | Initial draft |
| Apr 10, 2026 | AI Agent | Added: Related Bugs, Security, Performance, Localization, A/B Testing, Metrics |

