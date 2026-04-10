# Feature Specification: Admin Settings - Payment Configuration

---

## Document Info

| Field | Value |
|-------|-------|
| **Feature ID** | FEAT-001-ADMIN |
| **Title** | Admin Settings UI for Payment Options |
| **Parent Feature** | FEAT-001 (Dual Payment Options) |
| **Created** | April 10, 2026 |
| **Last Updated** | April 10, 2026 |
| **Status** | 📝 Draft |
| **Priority** | P2 - Medium |
| **Estimated Effort** | 1-2 days |
| **Assignee** | TBD |

---

## 1. Problem Statement

**Current State:**
- Payment options (COD, Online) can only be configured via API
- Restaurant owners cannot change payment settings without developer help
- No UI to customize payment labels

**Business Need:**
- Restaurant owners need self-service payment configuration
- Different order types may need different payment rules
- Custom labels for brand consistency

---

## 2. Proposed Solution

Add a "Payment Settings" section in Admin Settings page with toggles and input fields for all payment-related configurations.

---

## 3. UI/UX Design

### 3.1 Location

**Path:** Admin Panel → Settings → Payment Settings (new tab/section)

### 3.2 Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                                      │
├─────────────────────────────────────────────────────────────────┤
│ [Branding] [Display] [Payment Settings] [Notifications]         │
│                        ↑ Active Tab                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 💳 PAYMENT OPTIONS                                              │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Enable Cash on Delivery (COD)                          [Toggle] │
│ Allow customers to pay at counter/billing                       │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ 🌐 ONLINE PAYMENT BY ORDER TYPE                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Dine-in Orders                                         [Toggle] │
│ Takeaway Orders                                        [Toggle] │
│ Delivery Orders                                        [Toggle] │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ 🏷️ CUSTOM LABELS                                                │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Online Payment Label                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Pay Online                                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ Display text for online payment option (e.g., "UPI/Card")       │
│                                                                 │
│ COD Label                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Pay at Counter                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ Display text for COD option (e.g., "Cash", "Pay Later")         │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ ℹ️ Note: Online payment requires Razorpay configuration.        │
│    Contact support if you need to set up Razorpay.              │
│                                                                 │
│                                        [ Cancel ] [ Save ]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Component States

| Component | State | Behavior |
|-----------|-------|----------|
| COD Toggle | ON | COD option visible in checkout |
| COD Toggle | OFF | COD option hidden |
| Online Toggles | ON | Online payment for that order type |
| Online Toggles | OFF | Only COD for that order type |
| Labels | Empty | Use default labels |
| Labels | Filled | Use custom labels |

### 3.4 Validation Rules

| Field | Validation |
|-------|------------|
| `payOnlineLabel` | Max 30 characters |
| `payAtCounterLabel` | Max 30 characters |
| At least one option | COD or Online must be enabled |

---

## 4. Technical Implementation

### 4.1 Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `/frontend/src/pages/admin/AdminSettings/PaymentSettings.jsx` | Create | New component |
| `/frontend/src/pages/admin/AdminSettings/PaymentSettings.css` | Create | Styles |
| `/frontend/src/pages/admin/AdminSettings/AdminSettings.jsx` | Modify | Add tab for Payment Settings |
| `/frontend/src/pages/admin/AdminSettings/index.js` | Modify | Export new component |

### 4.2 Component Structure

```jsx
// PaymentSettings.jsx
const PaymentSettings = () => {
  const [settings, setSettings] = useState({
    codEnabled: false,
    onlinePaymentDinein: true,
    onlinePaymentTakeaway: true,
    onlinePaymentDelivery: true,
    payOnlineLabel: '',
    payAtCounterLabel: '',
  });

  // Fetch current settings on mount
  // Save settings on submit
  
  return (
    <div className="payment-settings">
      {/* COD Section */}
      {/* Online Payment Section */}
      {/* Labels Section */}
      {/* Save Button */}
    </div>
  );
};
```

### 4.3 API Integration

**Fetch Settings:**
```javascript
GET /api/config/{restaurantId}
// Extract payment fields from response
```

**Save Settings:**
```javascript
PUT /api/config/
{
  "codEnabled": true,
  "onlinePaymentDinein": true,
  "onlinePaymentTakeaway": true,
  "onlinePaymentDelivery": false,
  "payOnlineLabel": "UPI/Card",
  "payAtCounterLabel": "Cash Payment"
}
```

---

## 5. Test Cases

### TC-ADMIN-001: Load Existing Settings

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open Admin Settings → Payment | Page loads |
| 2 | Check toggles | Reflect current config values |
| 3 | Check labels | Show current labels or placeholder |

### TC-ADMIN-002: Toggle COD

| Step | Action | Expected |
|------|--------|----------|
| 1 | Toggle COD ON | Toggle animates to ON |
| 2 | Click Save | Success message |
| 3 | Refresh page | Toggle still ON |
| 4 | Check customer app | COD option visible |

### TC-ADMIN-003: Update Custom Labels

| Step | Action | Expected |
|------|--------|----------|
| 1 | Enter "UPI Payment" in Online label | Text entered |
| 2 | Enter "Cash Only" in COD label | Text entered |
| 3 | Click Save | Success message |
| 4 | Check customer app | Labels updated |

### TC-ADMIN-004: Validation - Empty State

| Step | Action | Expected |
|------|--------|----------|
| 1 | Turn OFF both COD and all Online toggles | - |
| 2 | Click Save | Error: "At least one payment method required" |

---

## 6. Acceptance Criteria

- [ ] Payment Settings tab visible in Admin Settings
- [ ] All toggles work and persist
- [ ] Custom labels save and appear in customer app
- [ ] Validation prevents no-payment-method state
- [ ] Changes reflect immediately in customer app (no cache issues)
- [ ] Mobile responsive design

---

## 7. Dependencies

| Dependency | Status |
|------------|--------|
| FEAT-001 Backend API | ✅ Done |
| Admin Settings Page | ✅ Exists |
| Auth for Admin | ✅ Exists |

---

## 8. Out of Scope

- Razorpay key configuration (handled separately)
- Payment method icons customization
- Order type management (dine-in/takeaway/delivery)

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Config cache in customer app | Force refresh or use timestamp |
| Admin saves invalid state | Frontend validation + backend validation |

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| Apr 10, 2026 | AI Agent | Initial draft |

