# Architecture Documentation

## Overview
This document describes the frontend architecture after the TypeScript Transformer Integration (v1).

---

## Directory Structure

```
/app/frontend/src/
├── api/
│   ├── config/
│   │   ├── axios.js           # Axios instance configuration
│   │   └── endpoints.js       # API endpoint URLs
│   │
│   ├── transformers/          # Data transformation layer
│   │   ├── orderTransformer.ts    # RECEIVE: API → App
│   │   ├── cartTransformer.ts     # Type definitions
│   │   ├── helpers.js             # SEND: App → API
│   │   ├── index.ts               # TypeScript exports
│   │   └── index.js               # JS wrapper for bundler
│   │
│   ├── services/              # API service functions
│   │   ├── orderService.ts        # Order operations (TS)
│   │   ├── orderService.js        # Wrapper for bundler
│   │   ├── restaurantService.js   # Restaurant data
│   │   ├── stationService.js      # Station/KDS data
│   │   └── tableRoomService.js    # Table/Room data
│   │
│   └── utils/
│       └── restaurantIdConfig.js  # Multi-menu detection
│
├── types/
│   ├── api/
│   │   └── order.types.ts     # API response interfaces
│   └── models/
│       └── order.types.ts     # Internal model interfaces
│
├── context/
│   └── CartContext.js         # Cart state management
│
├── pages/
│   ├── LandingPage.jsx        # Entry point
│   ├── ReviewOrder.jsx        # Order review & checkout
│   └── OrderSuccess.jsx       # Order confirmation
│
└── components/
    └── PreviousOrderItems/    # Read-only previous items
```

---

## Data Flow

### RECEIVE Flow (API → Component)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌───────────┐
│   API       │ ──▶ │ orderService.ts  │ ──▶ │ orderTransformer│ ──▶ │ Component │
│  Response   │     │ getOrderDetails()│     │ .ts             │     │   (JSX)   │
└─────────────┘     └──────────────────┘     └─────────────────┘     └───────────┘
     │                      │                        │                      │
     │                      │                        │                      │
   JSON               Calls transformer        Normalizes:              Uses:
   snake_case         for each item            - snake → camel         - item.name
                                               - calculates fullPrice  - item.fullPrice
                                               - flattens structure    - item.variations
```

### SEND Flow (Component → API)

```
┌───────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Component │ ──▶ │   helpers.js    │ ──▶ │ orderService.ts  │ ──▶ │    API      │
│   (JSX)   │     │ transformForApi │     │ placeOrder()     │     │   Request   │
└───────────┘     └─────────────────┘     └──────────────────┘     └─────────────┘
     │                    │                        │                      │
     │                    │                        │                      │
   Cart items        Converts:               Builds payload:          FormData
   from context      - variations format     - normal or multi-menu   JSON string
                     - addons format         - all required fields
                     - calculates totals
```

---

## Transformer Layer

### Purpose
- **Single source of truth** for data transformation
- **Consistent property names** across components
- **Pre-calculated values** (fullPrice, totals)
- **Type safety** with TypeScript interfaces

### RECEIVE Transformers (orderTransformer.ts)

| Function | Input | Output |
|----------|-------|--------|
| `transformPreviousOrderItem(api)` | API detail item | `PreviousOrderItem` |
| `transformOrderItem(api)` | API detail item | `OrderItem` |
| `transformVariation(api)` | API variation | `Variation` |
| `transformAddon(api)` | API addon | `Addon` |
| `transformTableStatus(api)` | API status | `TableStatus` |
| `transformOrderDetails(api)` | Full API response | `OrderDetails` |

### SEND Transformers (helpers.js)

| Function | Input | Output |
|----------|-------|--------|
| `transformCartItemForApi(cartItem)` | Cart item | API cart format |
| `transformVariationsForApi(cartItem)` | Cart item | `[{name, values:{label:[]}}]` |
| `transformAddonsForApi(cartItem)` | Cart item | `{add_on_ids, add_ons, add_on_qtys}` |
| `buildMultiMenuPayload(orderData)` | Order data | Complete multi-menu payload |

---

## Property Naming Convention

### API Response (snake_case)
```javascript
{
  food_status: 1,
  unit_price: "34.00",
  food_id: 123,
  food_details: { name: "Item", price: 34 },
  food_level_notes: "Extra spicy",
  add_ons: [...],
  variation: [...]
}
```

### Internal Model (camelCase)
```javascript
{
  status: 1,           // Preferred
  foodStatus: 1,       // Legacy alias
  price: 34,           // Base price
  fullPrice: 44,       // Base + variations + addons
  foodId: 123,
  name: "Item",        // Flattened from food_details
  notes: "Extra spicy",
  addons: [...],       // Note: no underscore
  variations: [...]    // Note: plural
}
```

---

## Multi-Menu Support

### Detection
```javascript
import { isMultipleMenu } from '../api/utils/restaurantIdConfig';

const isMultiMenu = isMultipleMenu(restaurant);
// or from orderData.isMultipleMenuType
```

### Different Payload Structure
```javascript
// Normal (single menu)
{
  cart: [...],
  order_amount: X,
  // ... flat structure
}

// Multi-menu
{
  data: {
    cart: [...],  // Different item format
    total_gst_tax_amount: X,
    total_vat_tax_amount: X,
    // ... nested in 'data' property
  }
}
```

### Different Endpoint
- Normal: `ENDPOINTS.PLACE_ORDER()`
- Multi-menu: `ENDPOINTS.PLACE_ORDER_AUTOPAID()`

---

## TypeScript + JavaScript Coexistence

### Problem
- React bundler (webpack via CRA) prefers `.js` over `.ts`
- JSX components can't directly import `.ts` files

### Solution: JS Wrappers
```javascript
// orderService.js (wrapper)
export * from './orderService.ts';
export { placeOrder, getOrderDetails, ... } from './orderService.ts';
```

### Import Pattern
```javascript
// In JSX components - import from .js (no extension)
import { getOrderDetails } from '../api/services/orderService';
// This loads orderService.js which re-exports from orderService.ts
```

---

## State Management

### CartContext
- Stores cart items with `add_ons` (underscore) format
- Stores `previousOrderItems` from transformer (camelCase format)
- Provides `getPreviousOrderTotal()` using `fullPrice`

### Key Properties
| Context Property | Format | Source |
|-----------------|--------|--------|
| `cart.items` | Cart format (`add_ons`) | User selections |
| `previousOrderItems` | Transformer format (`addons`) | API via transformer |
| `editMode` | Boolean | Set when editing order |

---

## Error Handling

### API Errors
```javascript
try {
  const result = await getOrderDetails(orderId);
} catch (error) {
  // error.response?.data?.errors - API error array
  // error.message - Network/JS error
}
```

### Transformer Fallbacks
```javascript
// Always provide fallbacks for missing data
const basePrice = parseFloat(api.unit_price) || api.food_details?.price || 0;
const status = (api as any).food_status ?? api.foodStatus;
```

---

## Future Improvements

1. **Full TypeScript Migration**: Convert all JSX to TSX
2. **Remove JS Wrappers**: Configure bundler to prefer TS
3. **Strict Types**: Remove `any` types
4. **Custom Hooks**: Extract `useOrderCalculations`, `usePreviousOrder`
5. **Component Decomposition**: Split ReviewOrder.jsx (1600+ lines)

---

## Payment Flow Architecture (NEW - Session 7)

### Razorpay Payment Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REVIEW ORDER PAGE                                    │
│                                                                             │
│  Check: restaurant.razorpay.razorpay_key exists?                            │
│         │                                                                   │
│         ├── NO  → Button: "Place Order" (existing COD flow)                 │
│         │                                                                   │
│         └── YES → Button: "Pay & Proceed" (Razorpay flow)                   │
│                   │                                                         │
│                   ▼                                                         │
│         1. Place Order API → { order_id, razorpay_id, total_amount }        │
│                   │                                                         │
│                   ▼                                                         │
│         2. Create Razorpay Order API → { order_id: "order_XXXXX" }          │
│                   │                                                         │
│                   ▼                                                         │
│         3. Open Razorpay SDK with actual order_id                           │
│                   │                                                         │
│                   ├── Success → Navigate to Order Success                   │
│                   └── Cancel → Stay on page, show error toast               │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORDER SUCCESS PAGE                                   │
│                                                                             │
│  On Load (if isPaid: true):                                                 │
│         │                                                                   │
│         ▼                                                                   │
│  4. Verify Payment API                                                      │
│         │                                                                   │
│         ├── status: "success" → Show "Payment Successful" (green)           │
│         └── status: "failed" → Show "Payment Pending" (red)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Payment Data Flow

| Step | Component | Data |
|------|-----------|------|
| 1 | ReviewOrder.jsx | Sends: order payload |
| 1 | Place Order API | Returns: `{ order_id, razorpay_id, total_amount }` |
| 2 | ReviewOrder.jsx | Sends: `{ order_id }` |
| 2 | Create Razorpay Order | Returns: `{ order_id: "order_XXX", amount_in_paise }` |
| 3 | Razorpay SDK | Returns: `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }` |
| 4 | OrderSuccess.jsx | Sends: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` |
| 4 | Verify Payment | Returns: `{ status: "success/failed" }` |

### Files Involved

| File | Responsibility |
|------|----------------|
| `ReviewOrder.jsx` | Button logic, place order, create razorpay order, open SDK |
| `OrderSuccess.jsx` | Verify payment, show payment status |
| `index.html` | Razorpay SDK script |

---

## QR Code Architecture (Updated - Session 7)

### QR Code Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN QR PAGE                                        │
│                                                                             │
│  Filters:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Type: [All] [Tables] [Rooms]     Menu: [Normal ▼]                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Data Flow:                                                                 │
│  1. Fetch /api/table-config → Returns tables/rooms with qr_code_urls       │
│  2. Extract menu masters from qr_code_urls keys                            │
│  3. Filter by type (all/table/room)                                        │
│  4. Use qr_code_urls[selectedMenu] for QR generation                       │
│  5. qrcode.react renders QR codes client-side                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### QR URL Structure (from POS API)

```
https://{subdomain}.mygenie.online/{restaurantId}
  ?tableId={id}
  &tableName={table_no}
  &type={room|table}
  &orderType=dinein
  &foodFor={MenuMaster}  ← Menu filter
```

### Key Change (Session 7)

| Before | After |
|--------|-------|
| Building URLs manually | Using `qr_code_urls` from POS API directly |
| No menu filtering | Filter by menu master from dropdown |
| Separate table/room sections | Combined with type filter |

---

## Document History

| Date | Session | Changes |
|------|---------|---------|
| Mar 26, 2026 | Session 7 | Added Payment Flow Architecture, Updated QR Code Architecture |
| Mar 25, 2026 | Session 3 | Initial architecture documentation |

---
*Last Revised: April 11, 2026 — 21:30 IST | No changes this session*
