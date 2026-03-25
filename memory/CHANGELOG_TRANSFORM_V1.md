# Transform & Refactor v1 - Change Document

## Date: March 25, 2026

## Overview
This document captures all changes made during the TypeScript Transformer Integration (Phase 2) and related bug fixes.

---

## 1. Architecture Changes

### Before (Old Architecture)
```
Component (JSX) → orderService.js → API
                      ↓
              (inline transformations)
```

### After (New Architecture)
```
RECEIVE FLOW (API → App):
API Response → orderTransformer.ts → Component

SEND FLOW (App → API):
Component → helpers.js → orderService.ts → API
```

### New File Structure
```
/app/frontend/src/api/
├── transformers/
│   ├── orderTransformer.ts   ← RECEIVE transformers (API → App)
│   ├── cartTransformer.ts    ← Type definitions
│   ├── helpers.js            ← SEND transformers (App → API)
│   ├── index.ts              ← TypeScript exports
│   └── index.js              ← JS wrapper for bundler
├── services/
│   ├── orderService.ts       ← Main service (TypeScript)
│   └── orderService.js       ← JS wrapper for bundler compatibility
└── types/
    ├── api/order.types.ts    ← API response types
    └── models/order.types.ts ← Internal model types
```

---

## 2. Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `orderService.ts` | REWRITTEN | TypeScript with multi-menu support |
| `orderService.js` | NEW | Wrapper that re-exports from .ts |
| `helpers.js` | EXPANDED | Added SEND transformers + utilities |
| `orderTransformer.ts` | FIXED | `food_status` snake_case handling |
| `OrderSuccess.jsx` | UPDATED | Uses transformer properties |
| `PreviousOrderItems.jsx` | UPDATED | Imports from helpers.js |
| `CartContext.js` | UPDATED | Uses `fullPrice` from transformer |
| `LandingPage.jsx` | FIXED | Reset isChecked on mount |

---

## 3. Functions Added to helpers.js

### RECEIVE Helpers (Display)
| Function | Purpose |
|----------|---------|
| `getVariationLabels(variations)` | Format variation labels for display |
| `getAddonLabels(addons)` | Format addon labels for display |
| `calculateVariationsTotal(variations)` | Sum of variation prices |
| `calculateAddonsTotal(addons)` | Sum of addon prices |

### SEND Helpers (API Payload)
| Function | Purpose |
|----------|---------|
| `transformVariationsForApi(cartItem)` | Convert variations to API format |
| `transformAddonsForApi(cartItem)` | Convert addons to API format |
| `transformCartItemForApi(cartItem)` | Convert single cart item |
| `transformCartItemsForApi(cartItems)` | Convert all cart items |
| `calculateCartItemPrice(cartItem)` | Calculate full item price |

### Utility Functions
| Function | Purpose |
|----------|---------|
| `extractPhoneNumber(phone)` | Remove country code from phone |
| `getDialCode(phone)` | Extract country code |

### Multi-Menu Functions
| Function | Purpose |
|----------|---------|
| `transformCartItemForMultiMenu(item, gst)` | Multi-menu item format |
| `transformCartItemsForMultiMenu(items, gst)` | All items for multi-menu |
| `buildMultiMenuPayload(orderData, gst)` | Complete multi-menu payload |

---

## 4. Property Name Mappings

### API (snake_case) → Internal (camelCase)

| API Field | Internal Property | Notes |
|-----------|-------------------|-------|
| `food_status` | `status`, `foodStatus` | Item status (1-7) |
| `unit_price` | `price`, `unitPrice` | Base price per unit |
| `food_id` | `foodId` | Item ID |
| `food_details` | Spread into item | Name, description, etc. |
| `food_level_notes` | `notes` | Cooking instructions |
| `add_ons` | `addons` | Addon array |
| `variation` | `variations` | Variation array |

### Variation Format
```javascript
// API Format (RECEIVE)
variation: [{
  name: "SIZE",
  values: [{ label: "60ML", optionPrice: "10" }]
}]

// Internal Format
variations: [{
  name: "SIZE",
  values: [{ label: "60ML", price: 10 }]
}]

// API Format (SEND)
variations: [{
  name: "SIZE",
  values: { label: ["60ML"] }  // Note: object with array
}]
```

---

## 5. Bugs Fixed

| Bug ID | Description | Root Cause | Fix |
|--------|-------------|------------|-----|
| BUG-020 | Item price wrong on OrderSuccess | `.js` vs `.ts` module resolution | Created JS wrapper |
| BUG-021 | `table_id: 'undefined'` error | `tableId` vs `tableNumber` | Accept both properties |
| BUG-022 | `air_bnb_id` missing error | Field not in payload | Added to both payloads |
| BUG-023 | All items show "Yet to be confirmed" | `foodStatus` vs `food_status` | Read snake_case field |
| BUG-024 | LandingPage shows paid orders | `isChecked` never reset | Reset on component mount |
| BUG-025 | Multi-menu orders broken | Missing functions | Added multi-menu support |

---

## 6. Payload Changes

### placeOrder - Normal (Single Menu)
```javascript
{
  table_id: String(tableId || tableNumber || ''),
  air_bnb_id: '',                    // ← ADDED
  coupon_discount_title: null,       // ← Changed from ''
  subscription_days: '[]',           // ← Changed from []
  discount_type: pointsRedeemed > 0 ? 'Loyality' : '',  // ← ADDED logic
  cust_phone: extractPhoneNumber(phone),  // ← Now uses utility
  dial_code: getDialCode(phone),          // ← Now uses utility
  // ... rest same
}
```

### placeOrder - Multi-Menu
```javascript
{
  data: {
    cart: transformCartItemsForMultiMenu(items),  // ← Different format
    total_gst_tax_amount: X,    // ← Multi-menu specific
    total_vat_tax_amount: X,    // ← Multi-menu specific
    total_service_tax_amount: 0,
    // ... rest similar
  }
}
// Uses PLACE_ORDER_AUTOPAID endpoint
```

---

## 7. Breaking Changes

| Change | Impact | Migration |
|--------|--------|-----------|
| `add_ons` → `addons` | Components must use `addons` | Update property access |
| `foodStatus` → `status` | Both available for compatibility | Use `status ?? foodStatus` |
| `item.item?.name` → `item.name` | Transformer flattens structure | Use direct property |

---

## 8. Backup Files Created

| File | Purpose |
|------|---------|
| `orderService.js.old-backup-2026-03-25` | Original JS before TypeScript |
| `orderService.ts.backup-2026-03-25` | TS backup before refactor |

---

## 9. Testing Checklist

- [ ] Place new order (single menu)
- [ ] Place new order (multi-menu)
- [ ] Edit existing order
- [ ] Verify item prices on OrderSuccess
- [ ] Verify item status badges
- [ ] Verify variation/addon labels display
- [ ] Test with variations + addons
- [ ] Test LandingPage after order paid on POS

---

## 10. Known Limitations

1. **TypeScript not fully enforced**: Some `any` types used for flexibility
2. **JS wrappers required**: Bundler can't resolve `.ts` directly from `.jsx`
3. **Backward compatibility**: Legacy properties (`unitPrice`, `foodStatus`) still returned

---

## Author
Transform & Refactor v1 - March 25, 2026
