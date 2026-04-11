# Manual Test Cases - MyGenie Customer App

## Last Updated: April 10, 2026

---

## 📊 Test Execution Summary

| Test ID | Feature | Priority | Status | Tested By | Date | Build |
|---------|---------|----------|--------|-----------|------|-------|
| TC-001 | COD Payment Selection | Critical | ⏳ Pending | - | - | - |
| TC-002 | Online Payment Selection | Critical | ⏳ Pending | - | - | - |
| TC-003 | COD Order Placement | Critical | ⏳ Pending | - | - | - |
| TC-004 | Online Order + Razorpay | Critical | ⏳ Pending | - | - | - |
| TC-005 | Custom Labels Display | Medium | ⏳ Pending | - | - | - |
| TC-006 | Selector Hidden (Single Option) | Medium | ⏳ Pending | - | - | - |
| TC-007 | Button Text Changes | High | ⏳ Pending | - | - | - |
| TC-008 | Edit Order Mode (No Selector) | Medium | ⏳ Pending | - | - | - |

### Summary Stats

| Metric | Count |
|--------|-------|
| Total Test Cases | 8 |
| ✅ Passed | 0 |
| ❌ Failed | 0 |
| ⏳ Pending | 8 |
| 🚫 Blocked | 0 |
| ⏭️ Skipped | 0 |

**Legend:** ✅ Passed | ❌ Failed | ⏳ Pending | 🚫 Blocked | ⏭️ Skipped

---

## 🔧 Test Environment

| Property | Value |
|----------|-------|
| **App URL** | https://app-build-deploy.preview.emergentagent.com |
| **Test Restaurant** | 510 (Mygenie Dev) |
| **Test Credentials** | owner@mygeniedev.com / Qplazm@10 |
| **Browser** | Chrome/Safari/Firefox |
| **Device** | Desktop / Mobile |

### Pre-requisites
- [ ] Restaurant 510 has Razorpay configured
- [ ] Config: `codEnabled: true`
- [ ] Config: `onlinePaymentDinein: true`
- [ ] Items available in menu

---

## 📝 Detailed Test Cases

---

### TC-001: COD Payment Selection

| Field | Value |
|-------|-------|
| **Test ID** | TC-001 |
| **Feature** | FEAT-001 Dual Payment Options |
| **Priority** | 🔴 Critical |
| **Type** | Functional |
| **Estimated Time** | 2 mins |

**Objective:** Verify user can select "Pay at Counter" option

**Pre-conditions:**
- Both payment options enabled in config
- Cart has at least 1 item

**Test Steps:**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Navigate to `/510/menu` | Menu page loads | | |
| 2 | Add any item to cart | Item added, cart shows 1 item | | |
| 3 | Click "View Cart" | Review Order page opens | | |
| 4 | Scroll to bottom | Payment Method selector visible in footer | | |
| 5 | Click "Pay at Counter" option | Option gets selected (highlighted) | | |
| 6 | Observe button text | Button shows "Place Order ₹XX.XX" | | |

**Result:** ⏳ Pending

**Tester Notes:**
```
[Add observations here]
```

---

### TC-002: Online Payment Selection

| Field | Value |
|-------|-------|
| **Test ID** | TC-002 |
| **Feature** | FEAT-001 Dual Payment Options |
| **Priority** | 🔴 Critical |
| **Type** | Functional |
| **Estimated Time** | 2 mins |

**Objective:** Verify user can select "Pay Online" option

**Pre-conditions:**
- Both payment options enabled in config
- Restaurant has Razorpay key configured

**Test Steps:**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Navigate to Review Order page | Page loads with payment selector | | |
| 2 | Verify "Pay Online" is selected by default | Pay Online has filled radio | | |
| 3 | Click "Pay at Counter" | Counter option selected | | |
| 4 | Click "Pay Online" again | Online option selected again | | |
| 5 | Observe button text | Button shows "Pay & Proceed ₹XX.XX" | | |

**Result:** ⏳ Pending

**Tester Notes:**
```
[Add observations here]
```

---

### TC-003: COD Order Placement (E2E)

| Field | Value |
|-------|-------|
| **Test ID** | TC-003 |
| **Feature** | FEAT-001 Dual Payment Options |
| **Priority** | 🔴 Critical |
| **Type** | E2E |
| **Estimated Time** | 3 mins |

**Objective:** Verify COD order is placed without Razorpay

**Pre-conditions:**
- Both payment options enabled
- Valid cart items

**Test Steps:**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Add item to cart | Item added | | |
| 2 | Go to Review Order | Page loads | | |
| 3 | Select "Pay at Counter" | Option selected, button says "Place Order" | | |
| 4 | Open browser DevTools Console | Console visible | | |
| 5 | Click "Place Order" | Order starts processing | | |
| 6 | Check console log | Should show `payment_type: 'postpaid'` | | |
| 7 | Verify NO Razorpay popup | Razorpay SDK should NOT open | | |
| 8 | Verify redirect | Should go to Order Success page | | |
| 9 | Verify order status | Order created successfully | | |

**Console Log Expected:**
```javascript
[FEAT-001] Payment Config: {
  paymentMethod: 'cod',
  selectedPaymentType: 'postpaid',
  shouldTriggerRazorpay: false
}
```

**Result:** ⏳ Pending

**Tester Notes:**
```
[Add observations here]
```

---

### TC-004: Online Order + Razorpay (E2E)

| Field | Value |
|-------|-------|
| **Test ID** | TC-004 |
| **Feature** | FEAT-001 Dual Payment Options |
| **Priority** | 🔴 Critical |
| **Type** | E2E |
| **Estimated Time** | 5 mins |

**Objective:** Verify online payment triggers Razorpay

**Pre-conditions:**
- Restaurant has Razorpay test key configured
- Both payment options enabled

**Test Steps:**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Add item to cart | Item added | | |
| 2 | Go to Review Order | Page loads | | |
| 3 | Select "Pay Online" (or verify default) | Option selected, button says "Pay & Proceed" | | |
| 4 | Open browser DevTools Console | Console visible | | |
| 5 | Click "Pay & Proceed" | Order starts processing | | |
| 6 | Check console log | Should show `payment_type: 'prepaid'` | | |
| 7 | Verify Razorpay popup | Razorpay SDK should open | | |
| 8 | Complete test payment | Use test card: 4111 1111 1111 1111 | | |
| 9 | Verify redirect | Should go to Order Success page | | |

**Console Log Expected:**
```javascript
[FEAT-001] Payment Config: {
  paymentMethod: 'online',
  selectedPaymentType: 'prepaid',
  shouldTriggerRazorpay: true
}
```

**Razorpay Test Cards:**
| Card Type | Number | CVV | Expiry |
|-----------|--------|-----|--------|
| Success | 4111 1111 1111 1111 | Any 3 digits | Any future date |
| Failure | 4000 0000 0000 0002 | Any 3 digits | Any future date |

**Result:** ⏳ Pending

**Tester Notes:**
```
[Add observations here]
```

---

### TC-005: Custom Labels Display

| Field | Value |
|-------|-------|
| **Test ID** | TC-005 |
| **Feature** | FEAT-001 Dual Payment Options |
| **Priority** | 🟡 Medium |
| **Type** | UI |
| **Estimated Time** | 3 mins |

**Objective:** Verify custom labels from config are displayed

**Pre-conditions:**
- Config has custom labels set:
  - `payOnlineLabel: "UPI/Card"`
  - `payAtCounterLabel: "Cash Payment"`

**Test Steps:**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Update config via API or admin | Labels updated | | |
| 2 | Hard refresh the app (Ctrl+Shift+R) | Cache cleared | | |
| 3 | Go to Review Order page | Page loads | | |
| 4 | Check online option label | Shows "UPI/Card" (not "Pay Online") | | |
| 5 | Check COD option label | Shows "Cash Payment" (not "Pay at Counter") | | |

**API to Update Labels:**
```bash
curl -X PUT /api/config/ -H "Authorization: Bearer TOKEN" \
  -d '{"payOnlineLabel": "UPI/Card", "payAtCounterLabel": "Cash Payment"}'
```

**Result:** ⏳ Pending

**Tester Notes:**
```
[Add observations here]
```

---

### TC-006: Selector Hidden (Single Option)

| Field | Value |
|-------|-------|
| **Test ID** | TC-006 |
| **Feature** | FEAT-001 Dual Payment Options |
| **Priority** | 🟡 Medium |
| **Type** | UI |
| **Estimated Time** | 3 mins |

**Objective:** Verify selector is hidden when only one option available

**Scenario A: Only Online (COD disabled)**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Set config: `codEnabled: false` | Config updated | | |
| 2 | Go to Review Order | Page loads | | |
| 3 | Check footer | Payment selector NOT visible | | |
| 4 | Check button | Shows "Pay & Proceed ₹XX.XX" | | |

**Scenario B: Only COD (No Razorpay key)**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Use restaurant without Razorpay key | - | | |
| 2 | Set config: `codEnabled: true` | Config updated | | |
| 3 | Go to Review Order | Page loads | | |
| 4 | Check footer | Payment selector NOT visible | | |
| 5 | Check button | Shows "Place Order ₹XX.XX" | | |

**Result:** ⏳ Pending

**Tester Notes:**
```
[Add observations here]
```

---

### TC-007: Button Text Changes Dynamically

| Field | Value |
|-------|-------|
| **Test ID** | TC-007 |
| **Feature** | FEAT-001 Dual Payment Options |
| **Priority** | 🟠 High |
| **Type** | UI |
| **Estimated Time** | 2 mins |

**Objective:** Verify button text updates when selection changes

**Test Steps:**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Go to Review Order | "Pay Online" selected by default | | |
| 2 | Observe button | Shows "Pay & Proceed ₹XX.XX" | | |
| 3 | Click "Pay at Counter" | Option selected | | |
| 4 | Observe button immediately | Shows "Place Order ₹XX.XX" | | |
| 5 | Click "Pay Online" | Option selected | | |
| 6 | Observe button immediately | Shows "Pay & Proceed ₹XX.XX" | | |

**Result:** ⏳ Pending

**Tester Notes:**
```
[Add observations here]
```

---

### TC-008: Edit Order Mode (No Selector)

| Field | Value |
|-------|-------|
| **Test ID** | TC-008 |
| **Feature** | FEAT-001 Dual Payment Options |
| **Priority** | 🟡 Medium |
| **Type** | Functional |
| **Estimated Time** | 5 mins |

**Objective:** Verify payment selector is hidden in edit order mode

**Pre-conditions:**
- Existing order that can be edited

**Test Steps:**

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Place an order first | Order created | | |
| 2 | Go to Order Status page | Order details visible | | |
| 3 | Click "Edit Order" (if available) | Review Order opens in edit mode | | |
| 4 | Check footer | Payment selector NOT visible | | |
| 5 | Check button | Shows "Update Order ₹XX.XX" | | |

**Result:** ⏳ Pending

**Tester Notes:**
```
[Add observations here]
```

---

## 🐛 Defects Found

| Defect ID | Test Case | Severity | Summary | Status |
|-----------|-----------|----------|---------|--------|
| - | - | - | - | - |

---

## 📋 Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Tester | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

## 📎 Attachments

- [ ] Screenshots
- [ ] Console logs
- [ ] Video recordings (if any)

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| Apr 10, 2026 | AI Agent | Initial test cases for FEAT-001 |

