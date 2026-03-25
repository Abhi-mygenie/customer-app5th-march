# API Mapping Document

## Last Updated: March 25, 2026

---

## Table of Contents
1. [Restaurant Info API](#1-restaurant-info-api)
2. [Restaurant Product API](#2-restaurant-product-api)
3. [Order Details API](#3-order-details-api)
4. [Place Order API](#4-place-order-api)
5. [Check Table Status API](#5-check-table-status-api)

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

### Add-ons Structure

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
| `variation` | array | `[...]` | ✅ YES | `item.variations` | Selected variations |
| `add_ons` | array | `[...]` | ✅ YES | `item.add_ons` | Selected add-ons |
| `food_level_notes` | string | `""` | ✅ YES | `item.foodLevelNotes` | Cooking instructions |
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

### Endpoint (Multi-menu)
```
POST https://preprod.mygenie.online/api/v1/customer/order/autopaid-place-prepaid-order
```

### Request Payload

| Field | Type | Used? | Notes |
|-------|------|-------|-------|
| `restaurant_id` | int | ✅ YES | Restaurant ID |
| `table_id` | string | ✅ YES | Table ID |
| `order_type` | string | ✅ YES | `"dinein"`, `"takeaway"`, `"delivery"` |
| `payment_type` | string | ✅ YES | `"postpaid"`, `"prepaid"` |
| `cart` | array | ✅ YES | Cart items with variations, add-ons, tax |
| `order_amount` | int | ✅ YES | Total amount (rounded) |
| `coupon_discount_amount` | int | ✅ YES | Coupon discount |
| `points_redeemed` | int | ✅ YES | Points redeemed |
| `points_discount` | float | ✅ YES | Points discount value |
| `total_gst` | float | ✅ YES | Total GST |
| `total_vat` | float | ✅ YES | Total VAT |
| `guest_name` | string | ✅ YES | Customer name |
| `guest_number` | string | ✅ YES | Customer phone |
| `order_note` | string | ✅ YES | Special instructions |

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

## 5. Check Table Status API

### Endpoint
```
POST https://preprod.mygenie.online/api/v1/air-bnb/check-table-status
```

### Request
```json
{
  "table_id": "3794",
  "restaurant_id": "675"
}
```

### Response Fields

| Field | Type | Example | Used? | Mapped To |
|-------|------|---------|-------|-----------|
| `is_available` | boolean | `false` | ✅ YES | `tableStatus.isAvailable` |
| `order_id` | int | `695591` | ✅ YES | `tableStatus.orderId` |

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

## Known Issues

1. **`tax_calc` not implemented** - All prices treated as exclusive
2. **`restaurent_gst` not checked** - Always uses item-level tax, never restaurant-level
3. **Service charges not implemented** - Fields exist but not calculated
4. **VAT status not checked** - `vat.status` ignored, always calculates if item has VAT
5. **Item discounts not applied** - `discount`, `discount_type` fields ignored
