# API Mapping Document

## Last Updated: March 26, 2026 (Session 5 - POS Token Architecture)

---

## IMPORTANT: Token Architecture (Updated Session 5)

### Two Token Types

| Token | Storage | Purpose | Obtained |
|-------|---------|---------|----------|
| `auth_token` | localStorage | Our backend API auth | On login (our backend) |
| `pos_token` | localStorage | POS API auth (admin ops) | On login (POS vendoremployee/login) |
| `order_auth_token` | localStorage | POS API auth (customer orders) | Hardcoded credentials in authToken.js |

### Admin Login Flow
```
1. Frontend → Our Backend /api/auth/login
2. Our Backend → Verify password (db.users)
3. Our Backend → POS API /auth/vendoremployee/login
4. Our Backend → Return {token, pos_token, user}
5. Frontend → Store auth_token, pos_token in localStorage
```

---

## IMPORTANT: Transformer Layer

As of March 25, 2026, all API data flows through a **Transformer Layer**:

```
RECEIVE: API Response → orderTransformer.ts → Component
SEND:    Component → helpers.js → orderService.ts → API
```

See `/app/memory/ARCHITECTURE.md` for full details.

### Key Property Mappings (API → Internal)

| API Field (snake_case) | Internal (camelCase) | Notes |
|------------------------|---------------------|-------|
| `food_status` | `status`, `foodStatus` | Always read snake_case first |
| `unit_price` | `price`, `unitPrice` | Base price per unit |
| `food_id` | `foodId` | Item ID |
| `food_details.name` | `name` | Flattened |
| `food_level_notes` | `notes` | Cooking instructions |
| `add_ons` | `addons` | No underscore internally |
| `variation` | `variations` | Plural internally |

---

## Table of Contents
1. [Restaurant Info API](#1-restaurant-info-api)
2. [Restaurant Product API](#2-restaurant-product-api)
3. [Order Details API](#3-order-details-api)
4. [Place Order API](#4-place-order-api)
5. [Check Table Status API](#5-check-table-status-api)
6. [Menu Master API](#6-menu-master-api)
7. [Table Config API](#7-table-config-api)
8. [Auth Login API](#8-auth-login-api)

---

## API Endpoints Summary

| # | Endpoint | Method | Status | Used In |
|---|----------|--------|--------|---------|
| 1 | `/auth/login` | POST | ✅ Active | `authToken.js` |
| 2 | `/web/restaurant-info` | POST | ✅ Active | `useMenuData.js`, `restaurantService.js` |
| 3 | `/web/restaurant-product` | POST | ✅ Active | `useMenuData.js` |
| 4 | `/web/menu-master` | POST | ✅ Active | `useMenuData.js` |
| 5 | `/web/table-config` | POST | ✅ Active | `useMenuData.js` |
| 6 | `/air-bnb/get-order-details/{id}` | GET | ✅ Active | `orderService.js` |
| 7 | `/customer/order/place` | POST | ✅ Active | `orderService.js` |
| 8 | `/customer/order/autopaid-place-prepaid-order` | POST | ✅ Active | `orderService.js` |
| 9 | `/customer/check-table-status` | GET | ✅ Active | `orderService.js` |
| 10 | `/restaurants/{id}/menu` | - | ❌ Dead | `endpoints.js` (never called) |
| 11 | `/restaurants/{id}/menu/sections` | - | ❌ Dead | `endpoints.js` (never called) |
| 12 | `/restaurants/{id}/stations` | - | ❌ Dead | `endpoints.js` (never called) |
| 13 | `/restaurants/{id}/stations/{sid}` | - | ❌ Dead | `endpoints.js` (never called) |
| 14 | `/restaurants/{id}/stations/{sid}/categories` | - | ❌ Dead | `endpoints.js` (never called) |

---

## 1. Restaurant Info API

### Endpoint
```
POST https://preprod.mygenie.online/api/v1/web/restaurant-info
```

### Request
```json
{
  "restaurant_web": "675"
}
```

### Response Fields - Tax/GST Related

| Field | Type | Example | Used? | Mapped To | Notes |
|-------|------|---------|-------|-----------|-------|
| `gst_status` | boolean | `true` | ✅ YES | `restaurant.gst_status` | **If false, skip ALL GST calculation** |
| `gst_tax` | string | `"5.00"` | ❌ NO | - | Restaurant-level GST % (unused) |
| `gst_code` | string | `"abdc"` | ❌ NO | - | GST registration number |
| `restaurent_gst` | string | `"category"` | ❌ NO | - | `"category"` = use item tax, `"restaurant"` = use gst_tax |
| `vat` | object | `{"status":"1","code":"..."}` | ❌ NO | - | VAT status and code |
| `tax` | int | `22` | ❌ NO | - | Unknown purpose |
| `service_charge` | string | `"No"` | ❌ NO | - | Service charge enabled |
| `service_charge_percentage` | string | `"5.00"` | ❌ NO | - | Service charge % |
| `service_charge_tax` | string | `"0.00"` | ❌ NO | - | Tax on service charge |
| `tip` | string | `"No"` | ❌ NO | - | Tip enabled |
| `tip_tax` | string | `"0.00"` | ❌ NO | - | Tax on tips |

### Response Fields - Other Settings

| Field | Type | Example | Used? | Mapped To | Notes |
|-------|------|---------|-------|-----------|-------|
| `id` | int | `675` | ✅ YES | `restaurant.id` | Restaurant ID |
| `name` | string | `"Restaurant Name"` | ✅ YES | `restaurant.name` | Display name |
| `logo` | string | `"logo.png"` | ✅ YES | `restaurant.logo` | Logo image |
| `address` | string | `"..."` | ✅ YES | `restaurant.address` | Address |
| `phone` | string | `"9876543210"` | ✅ YES | `restaurant.phone` | Contact number |
| `opening_time` | string | `"10:00"` | ✅ YES | `restaurant.opening_time` | Opening time |
| `closing_time` | string | `"23:00"` | ✅ YES | `restaurant.closing_time` | Closing time |
| `total_round` | string | `"Yes"` | ✅ YES | `restaurant.total_round` | Round up total |
| `is_loyalty` | string | `"Yes"` | ✅ YES | `restaurant.is_loyalty` | Loyalty enabled |
| `is_coupon` | string | `"Yes"` | ✅ YES | `restaurant.is_coupon` | Coupon enabled |
| `multiple_menu` | string | `"Yes"` | ✅ YES | `isMultipleMenu()` | Multi-menu mode |
| `success_config` | object | `{...}` | ✅ YES | `restaurant.success_config` | OrderSuccess UI config |

### Unmapped Fields (131+ fields not used)
- `auto_accept`, `auto_accept_kot`, `auto_reject`
- `delivery_time`, `delivery_charge`, `minimum_order`
- `pos_system`, `pos_merchant_key`, `pos_client_id`
- `razorpay_key`, `razorpay_secret`
- `firebase_*`, `fcm_token`
- Many more...

---

## 2. Restaurant Product API

### Endpoint
```
POST https://preprod.mygenie.online/api/v1/web/restaurant-product
```

### Request
```json
{
  "restaurant_id": "675",
  "category_id": "0"
}
```

### Response - Item Level Fields

| Field | Type | Example | Used? | Mapped To | Notes |
|-------|------|---------|-------|-----------|-------|
| **Basic Info** ||||||
| `id` | int | `178109` | ✅ YES | `item.id` | Item ID |
| `name` | string | `"Cabo Rum"` | ✅ YES | `item.name` | Display name |
| `description` | string | `"..."` | ✅ YES | `item.description` | Item description |
| `price` | int | `150` | ✅ YES | `item.price` | Base price |
| `image` | string | `"url"` | ✅ YES | `item.image` | Image URL |
| **Tax Fields** ||||||
| `tax` | int | `5` | ✅ YES | `item.tax` | Tax percentage (0-100) |
| `tax_type` | string | `"GST"` | ✅ YES | `item.tax_type` | `"GST"` or `"VAT"` |
| `tax_calc` | string | `"Exclusive"` | ❌ NO | - | `"Exclusive"` or `"Inclusive"` |
| **Dietary** ||||||
| `veg` | int | `1` | ✅ YES | `item.veg` | 1=Veg, 0=Non-veg, 2=Egg |
| `egg` | int | `0` | ❌ NO | - | Egg indicator |
| `jain` | int | `0` | ❌ NO | - | Jain food |
| `allergens` | array | `[]` | ✅ YES | `item.allergens` | Allergen list |
| **Availability** ||||||
| `live_web` | string | `"Y"` | ✅ YES | `item.live_web` | Web availability |
| `web_available_time_starts` | string | `"09:00"` | ✅ YES | `item.web_available_time_starts` | Start time |
| `web_available_time_ends` | string | `"22:00"` | ✅ YES | `item.web_available_time_ends` | End time |
| `station_name` | string | `"BAR"` | ✅ YES | `item.station` | Kitchen station |
| **Discount** ||||||
| `discount` | int | `10` | ❌ NO | - | Discount % |
| `discount_type` | string | `"percent"` | ❌ NO | - | Discount type |
| **Customization** ||||||
| `variations` | array | `[...]` | ✅ YES | `item.variations` | Variation options |
| `add_ons` | array | `[...]` | ✅ YES | `item.add_ons` | Add-on options |

### Variations Structure

#### Field Usage Summary

| Field | Used? | Purpose |
|-------|-------|---------|
| `name` | ✅ YES | Display - variation group name |
| `type` | ❌ NO | Not used (always "single" or "multiple") |
| `min` | ❌ NO | Not used (minimum selections) |
| `max` | ❌ NO | Not used (maximum selections) |
| `required` | ❌ NO | Not used (selection requirement) |
| `values[].label` | ✅ YES | Display - option label |
| `values[].optionPrice` | ✅ YES | Price calculation - additional cost |

```json
{
  "variations": [
    {
      "name": "Choice Of Size",       // ✅ Used for display
      "type": "single",               // ❌ Not used
      "min": 0,                       // ❌ Not used
      "max": 0,                       // ❌ Not used
      "required": "on",               // ❌ Not used
      "values": [
        {
          "label": "30ml",            // ✅ Used for display
          "optionPrice": "0"          // ✅ Used for price calc
        },
        {
          "label": "60ml",
          "optionPrice": "40"
        }
      ]
    }
  ]
}
```

> **Note:** Fields like `type`, `min`, `max`, `required` exist in the API structure but are NOT currently consumed by the app. These may be needed for future validation logic (e.g., enforcing minimum/maximum selections).

### Add-ons Structure

#### Field Usage Summary

| Field | Used? | Purpose |
|-------|-------|---------|
| `id` | ✅ YES | Identification |
| `name` | ✅ YES | Display - add-on name |
| `price` | ✅ YES | Price calculation |

```json
{
  "add_ons": [
    {
      "id": 11502,                    // ✅ Used
      "name": "Prawns",               // ✅ Used for display
      "price": 100                    // ✅ Used for price calc
    }
  ]
}
```

---

## 3. Order Details API

### Endpoint
```
GET https://preprod.mygenie.online/api/v1/air-bnb/get-order-details/{orderId}
```

### Response Structure

```json
{
  "details": [...],                   // Array of order items
  "subscription_schedules": null,
  "delivery_charge": 0,
  "table_id": 3794,
  "table_no": "3",
  "restaurant": {...},
  "loyalty_info": null,
  "airbnb": null
}
```

### Response - Top Level Fields

| Field | Type | Example | Used? | Mapped To | Notes |
|-------|------|---------|-------|-----------|-------|
| `details` | array | `[...]` | ✅ YES | `previousItems` | Order line items |
| `table_id` | int | `3794` | ✅ YES | `orderDetails.tableId` | Table ID |
| `table_no` | string | `"3"` | ✅ YES | `orderDetails.tableNo` | Table number |
| `restaurant` | object | `{...}` | ✅ YES | `orderDetails.restaurant` | Restaurant info |
| `delivery_charge` | int | `0` | ✅ YES | `orderDetails.deliveryCharge` | Delivery charge |
| `subscription_schedules` | null | `null` | ❌ NO | - | Not used |
| `loyalty_info` | null | `null` | ❌ NO | - | Not used |
| `airbnb` | null | `null` | ❌ NO | - | Not used |

### Response - Detail Item Fields (per item in details[])

| Field | Type | Example | Used? | Mapped To | Notes |
|-------|------|---------|-------|-----------|-------|
| **IDs** ||||||
| `id` | int | `1801749` | ✅ YES | `item.id` | Detail line ID |
| `food_id` | int | `125229` | ✅ YES | `item.foodId` | Food item ID |
| `order_id` | int | `695591` | ✅ YES | `item.orderId` | Order ID |
| **Pricing** ||||||
| `unit_price` | string | `"70.00"` | ✅ YES | `item.unitPrice` | Unit price (BASE only) |
| `price` | int | `70` | ✅ YES | `item.price` | Price |
| `total_add_on_price` | int | `0` | ❌ NO | - | Total addon price (not used, recalculated) |
| `total_variation_price` | string | `"0.00"` | ❌ NO | - | Total variation price (not used, recalculated) |
| **Quantity** ||||||
| `quantity` | int | `1` | ✅ YES | `item.quantity` | Item quantity |
| **Status** ||||||
| `food_status` | int | `3` | ✅ YES | `item.foodStatus` | 1=Confirmed, 2=Preparing, 3=Cancelled, 5=Served |
| `f_order_status` | int | `3` | ✅ YES | `fOrderStatus` | Order status |
| **Customization** ||||||
| `variation` | array | `[...]` | ✅ YES | `item.variations` | Selected variations (see structure below) |
| `add_ons` | array | `[...]` | ✅ YES | `item.add_ons` | Selected add-ons (see structure below) |
| `food_level_notes` | string | `""` | ✅ YES | `item.foodLevelNotes` | Cooking instructions |

#### Variation Structure (CONFIRMED from live API)
```json
"variation": [
  {
    "name": "CHOICE OF SIZE",      // Variation group name (e.g., "Size", "Spice Level")
    "type": "single",              // Selection type: "single" or "multiple"
    "min": "0",                    // Minimum selections required
    "max": "0",                    // Maximum selections allowed
    "required": "on",              // Whether selection is required
    "values": [                    // ARRAY of selected option(s)
      {
        "label": "30ML",           // Display label for the selected option
        "optionPrice": "0"         // Additional price for this option
      }
    ]
  }
]
```

**Important:** `values` is always an **ARRAY** even for single selections.

#### Add-ons Structure (CONFIRMED from live API)
```json
"add_ons": [
  {
    "id": 10670,                   // Add-on ID
    "name": "coconut",             // Add-on name
    "price": 60,                   // Price per unit
    "quantity": 1                  // Quantity selected
  }
]
```

| **Food Details (nested)** ||||||
| `food_details.id` | int | `125229` | ✅ YES | `item.item.id` | Food ID |
| `food_details.name` | string | `"Pizza"` | ✅ YES | `item.item.name` | Food name |
| `food_details.tax` | int | `5` | ✅ YES | `item.item.tax` | Tax % |
| `food_details.tax_type` | string | `"GST"` | ✅ YES | `item.item.tax_type` | Tax type |
| `food_details.tax_calc` | string | `"Exclusive"` | ❌ NO | - | Tax calculation mode |
| `food_details.veg` | int | `1` | ✅ YES | `item.item.veg` | Veg indicator |
| `food_details.image` | string | `"url"` | ✅ YES | `item.item.image` | Image URL |
| **Order Level (duplicated in each detail)** ||||||
| `order_amount` | int | `830` | ✅ YES | `orderDetails.orderAmount` | **TOTAL order amount** |
| `order_discount` | int | `0` | ✅ YES | `orderDetails.orderDiscount` | Order discount |
| `order_note` | string | `""` | ✅ YES | `item.orderNote` | Order notes |
| `restaurant_order_id` | string | `"001216"` | ✅ YES | `orderDetails.restaurantOrderId` | Restaurant's order ID |
| `table_no` | string | `"3"` | ✅ YES | Redundant | Table number |
| `order_type` | string | `"dinein"` | ❌ NO | - | Order type |
| **Tax Fields (per item)** ||||||
| `gst_tax_amount` | string | `"0.00"` | ❌ NO | - | GST on this item (from POS) |
| `vat_tax_amount` | string | `"0.00"` | ❌ NO | - | VAT on this item (from POS) |
| `tax_amount` | int | `0` | ❌ NO | - | Total tax on item |
| `item_gst` | string | `"0.00"` | ❌ NO | - | Item GST |
| `item_vat` | string | `"0.00"` | ❌ NO | - | Item VAT |
| `total_tax_amount` | int | `0` | ❌ NO | - | Total tax amount |
| `total_gst_tax_amount` | string | `"0.00"` | ❌ NO | - | Total GST |
| **Timestamps** ||||||
| `created_at` | string | `"2026-03-25T..."` | ❌ NO | - | Created timestamp |
| `updated_at` | string | `"2026-03-25T..."` | ❌ NO | - | Updated timestamp |
| `ready_at` | string | `null` | ❌ NO | - | Ready timestamp |
| `serve_at` | string | `null` | ❌ NO | - | Serve timestamp |
| `cancel_at` | string | `"2026-03-25..."` | ❌ NO | - | Cancel timestamp |
| **Staff Info** ||||||
| `waiter_name` | string | `"Manager"` | ❌ NO | - | Waiter name |
| `delivery_person_name` | string | `"mayur"` | ❌ NO | - | Delivery person |
| `cancel_by` | int | `1915` | ❌ NO | - | Cancelled by user ID |
| **Other** ||||||
| `station` | string | `"KDS"` | ✅ YES | `item.station` | Kitchen station |
| `item_type` | string | `"KDS"` | ❌ NO | - | Item type |
| `paid_status` | int | `0` | ❌ NO | - | Payment status |
| `complementary` | int | `0` | ❌ NO | - | Complimentary item |
| `discount_on_food` | int | `0` | ❌ NO | - | Discount on item |

### Restaurant Object (in response)

| Field | Type | Example | Used? | Notes |
|-------|------|---------|-------|-------|
| `name` | string | `"Restaurant"` | ✅ YES | Restaurant name |
| `gst_status` | boolean | `true` | ✅ YES | GST enabled |
| `gst_tax_percent` | string | `"5.00"` | ❌ NO | Restaurant GST % |
| `vat_percent` | int | `0` | ❌ NO | VAT % |
| `address` | string | `"..."` | ✅ YES | Address |
| `dinein_otp_require` | string | `"No"` | ❌ NO | OTP for dine-in |
| `room_otp_require` | string | `"Yes"` | ❌ NO | OTP for room |
| `discount_type` | string | `"Percent"` | ❌ NO | Discount type |

---

## 4. Place Order API

### Endpoint (Normal)
```
POST https://preprod.mygenie.online/api/v1/customer/order/place
```

### Endpoint (Multi-menu)
```
POST https://preprod.mygenie.online/api/v1/customer/order/autopaid-place-prepaid-order
```

### Request Payload - Key Fields

| Field | Type | Value | Description |
|-------|------|-------|-------------|
| `order_amount` | float | `totalToPay` | **Grand Total** (with tax, rounded) |
| `order_sub_total_amount` | float | `subtotal` | **Item Total** (sum of items after discount) |
| `order_sub_total_without_tax` | float | `subtotal` | **Subtotal** (before tax) - NEW |
| `tax_amount` | float | `totalTax` | Total tax amount |
| `discount_amount` | float | `pointsDiscount` | Discount from loyalty points |
| `points_redeemed` | int | `pointsToRedeem` | Number of points redeemed |
| `points_discount` | float | `pointsDiscount` | Discount value from points |
| `total_gst_tax_amount` | float | `totalGst` | Total GST (multi-menu only) |
| `total_vat_tax_amount` | float | `totalVat` | Total VAT (multi-menu only) |

### Cart Item Structure (in request)

| Field | Type | Used? | Notes |
|-------|------|-------|-------|
| `food_id` | int | ✅ YES | Food item ID |
| `quantity` | int | ✅ YES | Quantity |
| `price` | string | ✅ YES | Unit price |
| `variations` | array | ✅ YES | Selected variations |
| `add_on_ids` | array | ✅ YES | Add-on IDs |
| `add_ons` | array | ✅ YES | Add-on names |
| `add_on_qtys` | array | ✅ YES | Add-on quantities |
| `gst_tax_amount` | float | ✅ YES | GST on item |
| `vat_tax_amount` | float | ✅ YES | VAT on item |
| `tax_amount` | float | ✅ YES | Total tax on item |
| `total_variation_price` | float | ✅ YES | Total variation price |
| `total_add_on_price` | float | ✅ YES | Total add-on price |
| `food_level_notes` | string | ✅ YES | Cooking instructions |
| `station` | string | ✅ YES | Kitchen station |

---

## 4b. Update Order API

### Endpoint
```
POST https://preprod.mygenie.online/api/v1/customer/order/update-customer-order
```

### Request Payload - Key Fields

| Field | Type | Value | Description |
|-------|------|-------|-------------|
| `order_id` | int | `orderId` | Existing order ID to update |
| `order_amount` | float | `totalToPay` | **Grand Total** (with tax, rounded) |
| `order_sub_total_amount` | float | `subtotal` | **Item Total** (sum of items after discount) |
| `order_sub_total_without_tax` | float | `subtotal` | **Subtotal** (before tax) - NEW |
| `tax_amount` | float | `totalTax` | Total tax amount |
| `discount_amount` | float | `pointsDiscount` | Discount from loyalty points |
| `points_redeemed` | int | `pointsToRedeem` | Number of points redeemed |
| `points_discount` | float | `pointsDiscount` | Discount value from points |

---

## 4c. Variation Format: REQUEST vs RESPONSE (IMPORTANT)

### ⚠️ Format Asymmetry

The API accepts and returns variations in **DIFFERENT formats**:

| Direction | `values` Structure | Example |
|-----------|-------------------|---------|
| **REQUEST** (Place/Update) | `{ label: ["Bottle"] }` | Object with label array |
| **RESPONSE** (Get Details) | `[{ label: "Bottle", optionPrice: "6000" }]` | Array of objects |

### REQUEST Format (What we SEND)
```json
{
  "cart": [{
    "variations": [
      {
        "name": "Choice Of Size",
        "values": { "label": ["Bottle"] }
      }
    ]
  }]
}
```

### RESPONSE Format (What we RECEIVE)
```json
{
  "details": [{
    "variation": [
      {
        "name": "Choice Of Size",
        "type": "single",
        "min": 0,
        "max": 0,
        "required": "on",
        "values": [
          { "label": "Bottle", "optionPrice": "6000" }
        ]
      }
    ]
  }]
}
```

### Key Differences

| Aspect | REQUEST | RESPONSE |
|--------|---------|----------|
| Field name | `variations` | `variation` (no 's') |
| `values` type | Object `{ label: [] }` | Array `[{ label, optionPrice }]` |
| `label` type | Array of strings | Single string per object |
| Extra fields | None | `type`, `min`, `max`, `required`, `optionPrice` |

### Code Handling (Fixed in BUG-015, BUG-016, BUG-017)

**Reading from API (getVariationLabels):**
```javascript
// values is an ARRAY of objects
const vals = Array.isArray(v.values) ? v.values : [v.values];
return vals.map(val => val.label || '').filter(Boolean).join(', ');
```

**Writing to API (transformVariations, updateCustomerOrder):**
```javascript
// values is an OBJECT with label array
return { name: "Choice Of Size", values: { label: ["Bottle"] } };
```

---

## 5. Check Table Status API

### Endpoint
```
GET https://preprod.mygenie.online/api/v1/customer/check-table-status?table_id={tableId}&restaurant_id={restaurantId}
```

### Response Fields

| Field | Type | Example | Used? | Mapped To |
|-------|------|---------|-------|-----------|
| `is_available` | boolean | `false` | ✅ YES | `tableStatus.isAvailable` |
| `order_id` | int | `695591` | ✅ YES | `tableStatus.orderId` |

### Usage in App

| Location | When Called | Action If Table FREE |
|----------|-------------|---------------------|
| `LandingPage.jsx` (on load) | QR scan / page visit | Auto-redirect to OrderSuccess if active order |
| `LandingPage.jsx` (handleEditOrderClick) | Click EDIT ORDER | Check order status, enter edit mode |
| `OrderSuccess.jsx` (fetchOrderStatus) | Page load | Redirect to landing if table freed on POS |
| `OrderSuccess.jsx` (handleEditOrder) | Click EDIT ORDER | Redirect to landing for fresh order |
| `ReviewOrder.jsx` (handlePlaceOrder - new) | Place NEW order | Block if table occupied by ANOTHER order |
| `ReviewOrder.jsx` (handlePlaceOrder - update) | UPDATE existing order | Redirect to landing if table freed |

### 🔴 CRITICAL: Restaurant 716 Exception

> **Restaurant 716 (Hyatt Centric) SKIPS the table status check when placing NEW orders.**
> This allows multiple orders on the same table/room.

| Setting | Normal Restaurants | Restaurant 716 |
|---------|-------------------|----------------|
| Table occupied check | ✅ Blocks new order | ❌ SKIPPED |
| Multiple orders/table | ❌ Not allowed | ✅ Allowed |
| Edit Order flow | ✅ Required | ❌ Not used |

**Code:** `ReviewOrder.jsx` line ~893
```javascript
const skipTableCheckFor716 = String(restaurantId) === '716';
```

See `CODE_AUDIT.md` Section 11 for full documentation.

### Response Interpretation

| `is_available` | `order_id` | Meaning | Action |
|----------------|------------|---------|--------|
| `true` | `null` | Table is FREE | Allow new order / Redirect from edit mode |
| `false` | `123456` | Table occupied by order 123456 | Show EDIT ORDER or block new order |
| `false` | `null` | Invalid state | Treat as available |

---

## 6. Menu Master API

### Endpoint
```
POST https://preprod.mygenie.online/api/v1/web/menu-master
```

### Request
```json
{
  "restaurant_id": "675"
}
```

### Response Fields

| Field | Type | Example | Used? | Mapped To |
|-------|------|---------|-------|-----------|
| `menus` | array | `[...]` | ✅ YES | `stations` |
| `menus[].id` | int | `1234` | ✅ YES | `station.id` |
| `menus[].menu_name` | string | `"BAR"` | ✅ YES | `station.name` |
| `menus[].menu_description` | string | `"..."` | ✅ YES | `station.description` |
| `menus[].opening_time` | string | `"10:00"` | ✅ YES | `station.opening_time` |
| `menus[].closing_time` | string | `"23:00"` | ✅ YES | `station.closing_time` |
| `menus[].image` | string | `null` | ✅ YES | `station.image` (usually null) |

---

## 7. Table Config API

### Endpoint
```
POST https://preprod.mygenie.online/api/v1/web/table-config
```

### Request
```json
{
  "restaurant_id": "675"
}
```

### Response Fields

| Field | Type | Example | Used? | Mapped To |
|-------|------|---------|-------|-----------|
| `tables` | array | `[...]` | ✅ YES | `tableConfig` |
| `tables[].id` | int | `3794` | ✅ YES | `table.id` |
| `tables[].table_no` | string | `"3"` | ✅ YES | `table.tableNo` |
| `tables[].qr_code` | string | `"..."` | ✅ YES | `table.qrCode` |
| `rooms` | array | `[...]` | ✅ YES | `roomConfig` |
| `rooms[].id` | int | `1001` | ✅ YES | `room.id` |
| `rooms[].room_no` | string | `"101"` | ✅ YES | `room.roomNo` |

---

## 8. Auth Login API

### Endpoint
```
POST https://preprod.mygenie.online/api/v1/auth/login
```

### Request
```json
{
  "phone": "+919579504871",
  "password": "Qplazm@10"
}
```

### Response Fields

| Field | Type | Example | Used? | Mapped To |
|-------|------|---------|-------|-----------|
| `token` | string | `"eyJhbG..."` | ✅ YES | Stored in localStorage |
| `user` | object | `{...}` | ❌ NO | Not used |

---

## Summary: Fields Used vs Not Used

### Used Fields (Critical for Functionality)
- `gst_status` - GST enabled/disabled (restaurant-info)
- `tax`, `tax_type` - Item-level tax (product API)
- `unit_price`, `quantity`, `food_status` - Order items (order-details)
- `variation`, `add_ons` - Customizations
- `order_amount` - Total order amount (order-details)
- `f_order_status` - Order status tracking

### Not Used Fields (Potential Future Use)
- `tax_calc` - Inclusive/Exclusive tax (product API)
- `restaurent_gst` - Category vs Restaurant GST mode
- `gst_tax`, `gst_tax_percent` - Restaurant-level GST %
- `service_charge`, `service_charge_percentage` - Service charges
- `vat.status`, `vat_percent` - VAT settings
- `tip`, `tip_tax` - Tip settings
- `discount`, `discount_type` - Item-level discounts
- All timestamp fields (`created_at`, `ready_at`, etc.)
- Staff info (`waiter_name`, `delivery_person_name`)

---

## IMPORTANT: New API Fields for Bill Summary (Added March 25, 2026)

### Order Details API Response - Total Fields

The `/air-bnb/get-order-details/{orderId}` API now returns:

| Field | Type | Maps To | Description |
|-------|------|---------|-------------|
| `order_amount` | int | `grandTotal` | **Grand Total** - Final order amount |
| `order_sub_total_amount` | int | `itemTotal` | **Item Total** - Sum of all items (NEW) |
| `order_sub_total_without_tax` | int | `subtotal` | **Subtotal** - Before tax (NEW) |

### Mapping Implementation

**File:** `orderService.js` → `getOrderDetails()`

```javascript
// API fields (from first detail item)
const orderAmount = parseFloat(firstDetail.order_amount) || 0;
const apiItemTotal = parseFloat(firstDetail.order_sub_total_amount) || 0;
const apiSubtotal = parseFloat(firstDetail.order_sub_total_without_tax) || 0;

// Use API values if available, fallback to local calculation
const finalItemTotal = apiItemTotal > 0 ? apiItemTotal : calculatedItemTotal;
const finalSubtotal = apiSubtotal > 0 ? apiSubtotal : calculatedSubtotal;
const finalGrandTotal = orderAmount > 0 ? orderAmount : calculatedGrandTotal;
```

### Benefits
- ✅ Item Total now includes ALL items (not just visible batch)
- ✅ Subtotal matches POS exactly
- ✅ Grand Total matches POS exactly
- ✅ Fallback to local calculation if API returns 0 (backward compatible)

---

## Known Issues

1. **`tax_calc` not implemented** - All prices treated as exclusive
2. **`restaurent_gst` not checked** - Always uses item-level tax, never restaurant-level
3. **Service charges not implemented** - Fields exist but not calculated
4. **VAT status not checked** - `vat.status` ignored, always calculates if item has VAT
5. **Item discounts not applied** - `discount`, `discount_type` fields ignored
6. **No item_total/subtotal from API** - Must calculate locally, may cause mismatch with POS

---

## Planned Improvements

See [ROADMAP.md](./ROADMAP.md) for full details.

| Task | Issue Resolved |
|------|----------------|
| P2-3: Fix Inclusive Tax | Issue #1 above |
| P2-4: Restaurant Tax Settings | Issues #2, #3, #4 above |

---

## 9. Vendor Employee Login API (NEW - Session 5)

### Endpoint
```
POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login
```

### Purpose
Admin login to get POS token for admin operations (QR codes, table config, etc.)

### Request
```json
{
    "email": "owner@restaurant.com",
    "password": "xxxxx"
}
```

### Response
```json
{
    "token": "ru5XDqaKlr0k6uDEgrL5n...",
    "name": "Owner Name",
    "email": "owner@restaurant.com",
    "restaurant_id": 478,
    "permissions": ["order_edit", "delivery_man", "clear_payment"]
}
```

### Used In
| File | Purpose |
|------|---------|
| `server.py` (`refresh_pos_token()`) | Called during admin login to get fresh POS token |

### Notes
- This is different from `/auth/login` which is for customer orders
- Token returned to frontend and stored in `localStorage['pos_token']`
- Cleared on logout

---

## Document History

| Date | Session | Changes |
|------|---------|---------|
| Mar 26, 2026 | Session 5 | Added Token Architecture section, Vendor Employee Login API |
| Mar 25, 2026 | Session 4 | Added field usage summary tables for Variations & Add-ons |
| Mar 25, 2026 | Session 3 | Added transformer layer docs, property mappings |
| Mar 25, 2026 | Session 2 | Initial comprehensive mapping |

