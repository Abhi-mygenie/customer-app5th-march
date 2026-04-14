# Test Cases Document - MyGenie Customer App

## Last Updated: March 25, 2026 (Session 4)

---

## Table of Contents

1. [Critical Flow Test Cases](#1-critical-flow-test-cases)
2. [Restaurant-Specific Test Cases](#2-restaurant-specific-test-cases)
3. [Order Flow Test Cases](#3-order-flow-test-cases)
4. [Edit Order Test Cases](#4-edit-order-test-cases)
5. [Table Status Test Cases](#5-table-status-test-cases)
6. [Price Calculation Test Cases](#6-price-calculation-test-cases)
7. [Variations & Add-ons Test Cases](#7-variations--add-ons-test-cases)
8. [Tax Calculation Test Cases](#8-tax-calculation-test-cases)
9. [Multi-Menu Restaurant Test Cases](#9-multi-menu-restaurant-test-cases)
10. [UI/UX Test Cases](#10-uiux-test-cases)
11. [Regression Test Cases (From Bug Fixes)](#11-regression-test-cases-from-bug-fixes)
12. [API Transformation Test Cases](#12-api-transformation-test-cases)
13. [Edge Cases](#13-edge-cases)
14. [Pre-Release Checklist](#14-pre-release-checklist)

---

## 1. Critical Flow Test Cases

### TC-001: New Order - Happy Path
| Field | Details |
|-------|---------|
| **ID** | TC-001 |
| **Priority** | P0 - Critical |
| **Preconditions** | Table is FREE, Cart has items |
| **Steps** | 1. Scan QR code for table<br>2. Add items to cart<br>3. Go to Review Order<br>4. Click Place Order |
| **Expected** | Order placed successfully, redirected to OrderSuccess |
| **Related Bugs** | BUG-002, BUG-009 |

### TC-002: Edit Existing Order - Happy Path
| Field | Details |
|-------|---------|
| **ID** | TC-002 |
| **Priority** | P0 - Critical |
| **Preconditions** | Table has active order |
| **Steps** | 1. Scan QR code<br>2. See "Edit Order" button<br>3. Click Edit Order<br>4. Add/modify items<br>5. Click Place Order |
| **Expected** | Order updated successfully, shows updated items |
| **Related Bugs** | BUG-006, BUG-008, BUG-010, BUG-011 |

### TC-003: View Bill - Happy Path
| Field | Details |
|-------|---------|
| **ID** | TC-003 |
| **Priority** | P0 - Critical |
| **Preconditions** | Order placed successfully |
| **Steps** | 1. Place order<br>2. View OrderSuccess page<br>3. Verify bill breakdown |
| **Expected** | Correct item prices, tax, and grand total displayed |
| **Related Bugs** | BUG-012, BUG-014, BUG-020, BUG-023 |

---

## 2. Restaurant-Specific Test Cases

### TC-010: Restaurant 716 - Multiple Orders Per Table
| Field | Details |
|-------|---------|
| **ID** | TC-010 |
| **Priority** | P0 - Critical |
| **Restaurant** | 716 (Hyatt Centric) |
| **Preconditions** | Table already has an active order |
| **Steps** | 1. Scan QR for table with active order<br>2. Browse Menu<br>3. Add items<br>4. Place Order |
| **Expected** | NEW order placed successfully (not blocked) |
| **Notes** | Restaurant 716 allows multiple orders per table |
| **Related Bugs** | BUG-030 |

### TC-011: Restaurant 716 - No Edit Order Button
| Field | Details |
|-------|---------|
| **ID** | TC-011 |
| **Priority** | P1 |
| **Restaurant** | 716 (Hyatt Centric) |
| **Preconditions** | Table has active order |
| **Steps** | 1. Scan QR code<br>2. View LandingPage |
| **Expected** | Only "Browse Menu" shown (NOT "Edit Order") |
| **Notes** | Multi-menu restaurants skip table status check on LandingPage |

### TC-012: Normal Restaurant - Block Duplicate Order
| Field | Details |
|-------|---------|
| **ID** | TC-012 |
| **Priority** | P0 - Critical |
| **Restaurant** | Any except 716 |
| **Preconditions** | Table has active order |
| **Steps** | 1. Try to place NEW order on occupied table |
| **Expected** | Error: "This table already has an active order. Please edit the existing order instead." |
| **Related Bugs** | BUG-009 |

### TC-013: Multi-Menu Restaurant - Station Navigation
| Field | Details |
|-------|---------|
| **ID** | TC-013 |
| **Priority** | P1 |
| **Restaurant** | Any with `multiple_menu: 'Yes'` |
| **Steps** | 1. Click Browse Menu<br>2. Verify stations list shown<br>3. Select a station<br>4. Verify categories/items load |
| **Expected** | Correct station-based navigation |

---

## 3. Order Flow Test Cases

### TC-020: Place Order - With Customer Details
| Field | Details |
|-------|---------|
| **ID** | TC-020 |
| **Priority** | P1 |
| **Steps** | 1. Add items<br>2. Enter customer name<br>3. Enter valid phone (10 digits)<br>4. Place order |
| **Expected** | Order placed with customer details captured |

### TC-021: Place Order - Without Phone (Optional)
| Field | Details |
|-------|---------|
| **ID** | TC-021 |
| **Priority** | P1 |
| **Steps** | 1. Add items<br>2. Leave phone empty<br>3. Place order |
| **Expected** | Order placed successfully (phone is optional) |

### TC-022: Place Order - Invalid Phone Validation
| Field | Details |
|-------|---------|
| **ID** | TC-022 |
| **Priority** | P2 |
| **Steps** | 1. Enter phone with less than 10 digits<br>2. Try to place order |
| **Expected** | Error: "Please enter a valid 10-digit phone number" |

### TC-023: Place Order - Double Click Prevention
| Field | Details |
|-------|---------|
| **ID** | TC-023 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Add items<br>2. Rapidly click "Place Order" multiple times |
| **Expected** | Only ONE order created (double-click guard) |
| **Related Bugs** | BUG-002, BUG-009 |

### TC-024: Place Order - Token Refresh
| Field | Details |
|-------|---------|
| **ID** | TC-024 |
| **Priority** | P1 |
| **Preconditions** | Auth token expired |
| **Steps** | 1. Wait for token to expire<br>2. Try to place order |
| **Expected** | Token auto-refreshes, order placed successfully |

---

## 4. Edit Order Test Cases

### TC-030: Edit Order - Add New Items
| Field | Details |
|-------|---------|
| **ID** | TC-030 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Click Edit Order<br>2. Add new items<br>3. Place Order |
| **Expected** | New items added to existing order |
| **Related Bugs** | BUG-006 |

### TC-031: Edit Order - Previous Items Display
| Field | Details |
|-------|---------|
| **ID** | TC-031 |
| **Priority** | P1 |
| **Steps** | 1. Click Edit Order<br>2. View previous items section |
| **Expected** | All previous items shown with correct status badges |
| **Related Bugs** | BUG-026 |

### TC-032: Edit Order - After Order Paid on POS
| Field | Details |
|-------|---------|
| **ID** | TC-032 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Place order<br>2. Mark as PAID on POS<br>3. Try to edit order in app |
| **Expected** | Redirect to LandingPage with fresh cart |
| **Related Bugs** | BUG-011, BUG-022, BUG-027 |

### TC-033: Edit Order - After Order Cancelled on POS
| Field | Details |
|-------|---------|
| **ID** | TC-033 |
| **Priority** | P1 |
| **Steps** | 1. Place order<br>2. Cancel on POS<br>3. Try to edit in app |
| **Expected** | Redirect to LandingPage, option to place new order |
| **Related Bugs** | BUG-011 |

### TC-034: Edit Order - View Bill Button
| Field | Details |
|-------|---------|
| **ID** | TC-034 |
| **Priority** | P1 |
| **Steps** | 1. Enter edit mode<br>2. Click "View Bill" in banner |
| **Expected** | Navigate to OrderSuccess with correct orderId |
| **Related Bugs** | BUG-019, BUG-021 |

---

## 5. Table Status Test Cases

### TC-040: Table FREE - Allow New Order
| Field | Details |
|-------|---------|
| **ID** | TC-040 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Scan QR for FREE table<br>2. Add items<br>3. Place order |
| **Expected** | Order placed successfully |

### TC-041: Table OCCUPIED - Show Edit Order
| Field | Details |
|-------|---------|
| **ID** | TC-041 |
| **Priority** | P0 - Critical |
| **Restaurant** | Non-multi-menu |
| **Steps** | 1. Scan QR for occupied table |
| **Expected** | "Edit Order" button shown (not "Browse Menu") |
| **Related Bugs** | BUG-010 |

### TC-042: Table Status - Auto Redirect to OrderSuccess
| Field | Details |
|-------|---------|
| **ID** | TC-042 |
| **Priority** | P1 |
| **Restaurant** | Non-multi-menu |
| **Steps** | 1. Place order<br>2. Scan QR again for same table |
| **Expected** | Auto-redirect to OrderSuccess page |
| **Related Bugs** | BUG-018 |

### TC-043: Table Status - Stale Cache Prevention
| Field | Details |
|-------|---------|
| **ID** | TC-043 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Place order<br>2. Pay on POS<br>3. Scan QR again |
| **Expected** | Fresh table check (NOT cached), show "Browse Menu" |
| **Related Bugs** | BUG-027 |

### TC-044: Invalid Table ID
| Field | Details |
|-------|---------|
| **ID** | TC-044 |
| **Priority** | P2 |
| **Steps** | 1. Scan invalid QR code |
| **Expected** | Error: "Invalid table. Please scan a valid QR code." |

---

## 6. Price Calculation Test Cases

### TC-050: Item Price - Base Price Only
| Field | Details |
|-------|---------|
| **ID** | TC-050 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Add item without variations/addons<br>2. View cart |
| **Expected** | Price matches item base price |

### TC-051: Item Price - With Variations
| Field | Details |
|-------|---------|
| **ID** | TC-051 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Add item with variation (e.g., 60ml +₹40)<br>2. View cart |
| **Expected** | Price = Base + Variation price |
| **Related Bugs** | BUG-012 |

### TC-052: Item Price - With Add-ons
| Field | Details |
|-------|---------|
| **ID** | TC-052 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Add item with addon (e.g., Prawns ₹100)<br>2. View cart |
| **Expected** | Price = Base + Addon price |
| **Related Bugs** | BUG-012 |

### TC-053: Item Price - With Variations AND Add-ons
| Field | Details |
|-------|---------|
| **ID** | TC-053 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Add item with both variation and addon<br>2. View cart |
| **Expected** | Price = Base + Variation + Addon |
| **Related Bugs** | BUG-012, BUG-023 |

### TC-054: Item Price - Decimal Display
| Field | Details |
|-------|---------|
| **ID** | TC-054 |
| **Priority** | P1 |
| **Steps** | 1. Add item with price ₹88.50<br>2. View cart and bill |
| **Expected** | Price shows ₹88.50 (NOT ₹89 or ₹88) |
| **Related Bugs** | BUG-020 |

### TC-055: Cart Total Calculation
| Field | Details |
|-------|---------|
| **ID** | TC-055 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Add multiple items<br>2. View cart total |
| **Expected** | Total = Sum of all item prices * quantities |

---

## 7. Variations & Add-ons Test Cases

### TC-060: Variation Label Display - OrderSuccess
| Field | Details |
|-------|---------|
| **ID** | TC-060 |
| **Priority** | P1 |
| **Steps** | 1. Order item with variation "60ml"<br>2. View OrderSuccess |
| **Expected** | Shows "60ml" under item name |
| **Related Bugs** | BUG-015 |

### TC-061: Variation Label Display - PreviousOrderItems
| Field | Details |
|-------|---------|
| **ID** | TC-061 |
| **Priority** | P1 |
| **Steps** | 1. Edit order with variations<br>2. View previous items section |
| **Expected** | Variation labels shown correctly |
| **Related Bugs** | BUG-016 |

### TC-062: Add-on Label Display
| Field | Details |
|-------|---------|
| **ID** | TC-062 |
| **Priority** | P1 |
| **Steps** | 1. Order item with addon "Prawns"<br>2. View OrderSuccess |
| **Expected** | Shows "Prawns" under item name |

### TC-063: Variation in Update Order Payload
| Field | Details |
|-------|---------|
| **ID** | TC-063 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Add item with variation<br>2. Edit order<br>3. Check API payload |
| **Expected** | Variation name sent correctly (not "CHOICE OF") |
| **Related Bugs** | BUG-017 |

### TC-064: Multiple Variations Per Item
| Field | Details |
|-------|---------|
| **ID** | TC-064 |
| **Priority** | P1 |
| **Steps** | 1. Add item with multiple variation groups<br>2. Select options from each<br>3. Place order |
| **Expected** | All variations captured and priced correctly |

---

## 8. Tax Calculation Test Cases

### TC-070: GST Calculation - Enabled
| Field | Details |
|-------|---------|
| **ID** | TC-070 |
| **Priority** | P0 - Critical |
| **Preconditions** | Restaurant has `gst_status: true` |
| **Steps** | 1. Add item with 5% GST<br>2. View bill |
| **Expected** | GST calculated: Item Price * 5% |

### TC-071: GST Calculation - Disabled
| Field | Details |
|-------|---------|
| **ID** | TC-071 |
| **Priority** | P0 - Critical |
| **Preconditions** | Restaurant has `gst_status: false` |
| **Steps** | 1. Add item with GST defined<br>2. View bill |
| **Expected** | NO GST calculated (₹0) |
| **Related Bugs** | BUG-013 |

### TC-072: VAT Calculation
| Field | Details |
|-------|---------|
| **ID** | TC-072 |
| **Priority** | P1 |
| **Steps** | 1. Add item with VAT tax type<br>2. View bill |
| **Expected** | VAT calculated correctly |

### TC-073: Mixed GST and VAT Items
| Field | Details |
|-------|---------|
| **ID** | TC-073 |
| **Priority** | P1 |
| **Steps** | 1. Add GST item<br>2. Add VAT item<br>3. View bill |
| **Expected** | GST and VAT shown separately |

### TC-074: Grand Total with Tax
| Field | Details |
|-------|---------|
| **ID** | TC-074 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Add items<br>2. View grand total |
| **Expected** | Grand Total = Subtotal + GST + VAT (rounded) |
| **Related Bugs** | BUG-014, BUG-007 |

### TC-075: Bill Summary After Polling
| Field | Details |
|-------|---------|
| **ID** | TC-075 |
| **Priority** | P1 |
| **Steps** | 1. Place order<br>2. Wait for OrderSuccess to poll API<br>3. Check grand total |
| **Expected** | Grand total remains consistent (not reverted) |
| **Related Bugs** | BUG-007 |

---

## 9. Multi-Menu Restaurant Test Cases

### TC-080: Multi-Menu - Different API Endpoint
| Field | Details |
|-------|---------|
| **ID** | TC-080 |
| **Priority** | P0 - Critical |
| **Restaurant** | Restaurant 716 (Hyatt Centric) ONLY |
| **Steps** | 1. Place order on restaurant 716<br>2. Check network request |
| **Expected** | Uses `/customer/order/autopaid-place-prepaid-order` endpoint. All other restaurants (including multi-menu) use `/customer/order/place` |
| **Updated** | Apr 11, 2026 — BUG-043 fix: autopaid endpoint restricted to 716 only |

### TC-081: Multi-Menu - Payload Structure
| Field | Details |
|-------|---------|
| **ID** | TC-081 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Place multi-menu order<br>2. Check payload |
| **Expected** | Payload includes `total_gst_tax_amount`, `total_vat_tax_amount` at root level |
| **Related Bugs** | BUG-028 |

### TC-082: Multi-Menu - Station Selection
| Field | Details |
|-------|---------|
| **ID** | TC-082 |
| **Priority** | P1 |
| **Steps** | 1. Select station<br>2. Add items<br>3. Verify station name in order |
| **Expected** | Items associated with correct station |

### TC-083: Multi-Menu - Room/Table Input
| Field | Details |
|-------|---------|
| **ID** | TC-083 |
| **Priority** | P1 |
| **Steps** | 1. Select Room or Table<br>2. Enter number<br>3. Place order |
| **Expected** | Room/Table number captured in order |

---

## 10. UI/UX Test Cases

### TC-090: LandingPage - Logo Display
| Field | Details |
|-------|---------|
| **ID** | TC-090 |
| **Priority** | P2 |
| **Steps** | 1. Load LandingPage |
| **Expected** | Restaurant logo displayed correctly |

### TC-091: LandingPage - Table Number Display
| Field | Details |
|-------|---------|
| **ID** | TC-091 |
| **Priority** | P1 |
| **Steps** | 1. Scan QR with table ID<br>2. View LandingPage |
| **Expected** | Table number shown |

### TC-092: Item Status Badges - Correct Colors
| Field | Details |
|-------|---------|
| **ID** | TC-092 |
| **Priority** | P1 |
| **Steps** | 1. View OrderSuccess with items in different statuses |
| **Expected** | Confirmed=green, Preparing=orange, Served=blue, Cancelled=red |
| **Related Bugs** | BUG-026 |

### TC-093: Item Status - Not "Yet to be confirmed"
| Field | Details |
|-------|---------|
| **ID** | TC-093 |
| **Priority** | P1 |
| **Steps** | 1. Place order<br>2. POS confirms items<br>3. View OrderSuccess |
| **Expected** | Status shows actual status (NOT "Yet to be confirmed") |
| **Related Bugs** | BUG-026 |

### TC-094: Veg/Non-Veg Indicator
| Field | Details |
|-------|---------|
| **ID** | TC-094 |
| **Priority** | P2 |
| **Steps** | 1. View menu items |
| **Expected** | Green dot for veg, Red dot for non-veg |
| **Related Bugs** | BUG-004 |

### TC-095: Loading States
| Field | Details |
|-------|---------|
| **ID** | TC-095 |
| **Priority** | P2 |
| **Steps** | 1. Perform actions that require loading |
| **Expected** | Loading spinners shown during async operations |

---

## 11. Regression Test Cases (From Bug Fixes)

### Session 1 Regressions

| TC ID | Bug ID | Test Case | Priority |
|-------|--------|-----------|----------|
| TC-R001 | BUG-001 | After table merge on POS, app should redirect correctly | P1 |
| TC-R002 | BUG-002 | Place Order button should not get permanently locked | P0 |
| TC-R003 | BUG-003 | `foodFor` URL parameter should work | P1 |
| TC-R004 | BUG-004 | Egg filter button should have correct color | P2 |
| TC-R005 | BUG-005 | "Earn rewards" prompt should not be hidden | P2 |
| TC-R006 | BUG-006 | Update order should NOT send hardcoded zero values | P0 |
| TC-R007 | BUG-007 | Grand total should not revert after polling | P1 |
| TC-R008 | BUG-008 | Edit Order should not show for "yet to be confirmed" items | P1 |
| TC-R009 | BUG-009 | Only ONE order per table (except 716) | P0 |
| TC-R010 | BUG-010 | Edit Order button logic on LandingPage | P1 |
| TC-R011 | BUG-011 | Edit mode should clear after order paid/cancelled | P0 |
| TC-R012 | BUG-012 | Variations/Add-ons display and pricing | P0 |
| TC-R013 | BUG-013 | GST disabled should mean ₹0 tax | P1 |
| TC-R014 | BUG-014 | Bill Summary totals must be accurate | P0 |

### Session 2 Regressions

| TC ID | Bug ID | Test Case | Priority |
|-------|--------|-----------|----------|
| TC-R015 | BUG-015 | Variation labels on OrderSuccess | P1 |
| TC-R016 | BUG-016 | Variation labels in PreviousOrderItems | P1 |
| TC-R017 | BUG-017 | Correct variation names in Update Order | P0 |
| TC-R018 | BUG-018 | QR scan auto-redirect to active order | P1 |
| TC-R019 | BUG-019 | "View Bill" button in edit mode | P2 |
| TC-R020 | BUG-020 | Decimal prices (not rounded to ceiling) | P0 |
| TC-R021 | BUG-021 | View Bill passes correct orderId | P1 |
| TC-R022 | BUG-022 | Stale previousOrderItems cleared on paid order | P0 |

### Session 3 Regressions

| TC ID | Bug ID | Test Case | Priority |
|-------|--------|-----------|----------|
| TC-R023 | BUG-023 | Correct item price on OrderSuccess (not ₹136 vs ₹88) | P0 |
| TC-R024 | BUG-024 | table_id not 'undefined' in payload | P0 |
| TC-R025 | BUG-025 | air_bnb_id field present in payload | P0 |
| TC-R026 | BUG-026 | Item status from API (food_status) mapped correctly | P1 |
| TC-R027 | BUG-027 | LandingPage cache invalidated for paid orders | P0 |
| TC-R028 | BUG-028 | Multi-menu orders work after refactor | P0 |

### Session 4 Regressions

| TC ID | Bug ID | Test Case | Priority |
|-------|--------|-----------|----------|
| TC-R030 | BUG-030 | Restaurant 716 can place multiple orders per table | P0 |

---

## 12. API Transformation Test Cases

### TC-100: API Response - snake_case to camelCase
| Field | Details |
|-------|---------|
| **ID** | TC-100 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Fetch order details<br>2. Check internal data model |
| **Expected** | `food_status` → `foodStatus`, `unit_price` → `unitPrice` |

### TC-101: API Request - Correct Payload Structure
| Field | Details |
|-------|---------|
| **ID** | TC-101 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Place order<br>2. Check request payload |
| **Expected** | All required fields present with correct casing |
| **Related Bugs** | BUG-024, BUG-025 |

### TC-102: Variation Format - Request vs Response
| Field | Details |
|-------|---------|
| **ID** | TC-102 |
| **Priority** | P1 |
| **Notes** | Request: `values: { label: ["60ml"] }`, Response: `values: [{ label: "60ml", optionPrice: "40" }]` |
| **Expected** | App handles both formats correctly |

---

## 13. Edge Cases

### TC-110: Empty Cart - Place Order
| Field | Details |
|-------|---------|
| **ID** | TC-110 |
| **Priority** | P1 |
| **Steps** | 1. Go to Review Order with empty cart |
| **Expected** | Place Order button disabled or shows warning |

### TC-111: Network Error - During Place Order
| Field | Details |
|-------|---------|
| **ID** | TC-111 |
| **Priority** | P1 |
| **Steps** | 1. Disconnect network<br>2. Try to place order |
| **Expected** | Error message shown, can retry |

### TC-112: Very Long Item Names
| Field | Details |
|-------|---------|
| **ID** | TC-112 |
| **Priority** | P2 |
| **Steps** | 1. Add item with very long name<br>2. View cart/bill |
| **Expected** | Text truncated or wrapped properly |

### TC-113: Special Characters in Notes
| Field | Details |
|-------|---------|
| **ID** | TC-113 |
| **Priority** | P2 |
| **Steps** | 1. Add special instructions with emojis/special chars<br>2. Place order |
| **Expected** | Notes saved and displayed correctly |

### TC-114: Rapid Navigation
| Field | Details |
|-------|---------|
| **ID** | TC-114 |
| **Priority** | P2 |
| **Steps** | 1. Rapidly navigate between pages |
| **Expected** | No crashes, data consistency maintained |

### TC-115: Session Expiry During Order
| Field | Details |
|-------|---------|
| **ID** | TC-115 |
| **Priority** | P1 |
| **Steps** | 1. Start order<br>2. Wait for session to expire<br>3. Try to place order |
| **Expected** | Auto-refresh token or prompt to re-authenticate |

---

## 14. Pre-Release Checklist

### P0 - Must Pass Before Release

- [ ] TC-001: New Order - Happy Path
- [ ] TC-002: Edit Existing Order - Happy Path
- [ ] TC-003: View Bill - Happy Path
- [ ] TC-010: Restaurant 716 - Multiple Orders Per Table
- [ ] TC-012: Normal Restaurant - Block Duplicate Order
- [ ] TC-023: Place Order - Double Click Prevention
- [ ] TC-032: Edit Order - After Order Paid on POS
- [ ] TC-043: Table Status - Stale Cache Prevention
- [ ] TC-050-053: Price Calculations (all)
- [ ] TC-070: GST Calculation - Enabled
- [ ] TC-071: GST Calculation - Disabled
- [ ] TC-080: Multi-Menu - Different API Endpoint
- [ ] TC-081: Multi-Menu - Payload Structure
- [ ] TC-100: API Response Transformation
- [ ] TC-101: API Request Payload

### P1 - Should Pass Before Release

- [ ] TC-020-024: Customer Details scenarios
- [ ] TC-030-034: Edit Order scenarios
- [ ] TC-040-044: Table Status scenarios
- [ ] TC-060-064: Variations & Add-ons display
- [ ] TC-074-075: Grand Total consistency
- [ ] TC-090-095: UI/UX checks

### P2 - Nice to Have

- [ ] TC-004, TC-005: Minor UI fixes
- [ ] TC-110-115: Edge cases

---

## Test Environment

| Environment | URL | Purpose |
|-------------|-----|---------|
| Preview | https://loyalty-app-april-v1.preview.emergentagent.com | Development testing |
| Production | TBD | Live environment |

### Test Restaurants

| ID | Name | Type | Special Notes |
|----|------|------|---------------|
| 478 | 18march | Normal | Used for POS token refresh testing |
| 675 | Test Restaurant | Normal | Standard flow |
| 716 | Hyatt Centric | Multi-menu | Multiple orders per table allowed |

---

## 15. Admin Login & POS Token Test Cases

### TC-120: Admin Login - POS Token Refresh
| Field | Details |
|-------|---------|
| **ID** | TC-120 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Admin logs in with email + password<br>2. Check db.users for updated mygenie_token |
| **Expected** | `mygenie_token` and `mygenie_token_updated_at` updated in database |
| **Related Bugs** | BUG-031 |

### TC-121: QR Page - After Fresh Login
| Field | Details |
|-------|---------|
| **ID** | TC-121 |
| **Priority** | P0 - Critical |
| **Preconditions** | Admin just logged in (fresh token) |
| **Steps** | 1. Login as admin<br>2. Navigate to QR Codes page |
| **Expected** | QR codes load successfully |
| **Related Bugs** | BUG-031 |

### TC-122: QR Page - Session Expired Error Display
| Field | Details |
|-------|---------|
| **ID** | TC-122 |
| **Priority** | P1 |
| **Preconditions** | POS token manually expired in DB |
| **Steps** | 1. Navigate to QR Codes page with expired token |
| **Expected** | Shows "Your POS session has expired" with "Go to Dashboard" button |
| **Related Bugs** | BUG-031 |

### TC-123: Login Failure - POS Token Refresh Fails
| Field | Details |
|-------|---------|
| **ID** | TC-123 |
| **Priority** | P2 |
| **Preconditions** | POS API is down or unreachable |
| **Steps** | 1. Admin logs in |
| **Expected** | Login succeeds (using old token), warning logged |
| **Notes** | App should not block login if POS refresh fails |

---

## Document History

| Date | Session | Changes |
|------|---------|---------|
| Mar 26, 2026 | Session 5 | Updated POS token flow test cases for localStorage architecture |
| Mar 26, 2026 | Session 5 | Added Admin Login & POS Token test cases (TC-120 to TC-123) |
| Mar 25, 2026 | Session 4 | Initial test cases document created |

---

## 16. Razorpay Payment Test Cases (NEW - Session 7)

### TC-130: Payment Button - Restaurant With Razorpay
| Field | Details |
|-------|---------|
| **ID** | TC-130 |
| **Priority** | P0 - Critical |
| **Restaurant** | 510 (Mygenie Dev) - has Razorpay configured |
| **Steps** | 1. Add items to cart<br>2. Go to Review Order |
| **Expected** | Button shows "Pay & Proceed ₹XXX" |

### TC-131: Payment Button - Restaurant Without Razorpay
| Field | Details |
|-------|---------|
| **ID** | TC-131 |
| **Priority** | P0 - Critical |
| **Restaurant** | 709 (Young Monk) - no Razorpay |
| **Steps** | 1. Add items to cart<br>2. Go to Review Order |
| **Expected** | Button shows "Place Order ₹XXX" (COD flow) |

### TC-132: Razorpay SDK Opens
| Field | Details |
|-------|---------|
| **ID** | TC-132 |
| **Priority** | P0 - Critical |
| **Restaurant** | 510 |
| **Steps** | 1. Click "Pay & Proceed" |
| **Expected** | Razorpay checkout modal opens |

### TC-133: Payment Success - Redirect to OrderSuccess
| Field | Details |
|-------|---------|
| **ID** | TC-133 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Complete payment in Razorpay |
| **Expected** | Redirects to Order Success page with payment details |

### TC-134: Payment Cancel - Stay on Page
| Field | Details |
|-------|---------|
| **ID** | TC-134 |
| **Priority** | P1 |
| **Steps** | 1. Click "Pay & Proceed"<br>2. Close Razorpay modal |
| **Expected** | Stays on Review Order page, shows "Payment cancelled" toast |

### TC-135: Payment Verification - Success
| Field | Details |
|-------|---------|
| **ID** | TC-135 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Complete payment<br>2. View Order Success page |
| **Expected** | Shows "Payment Successful" badge (green) |

### TC-136: Payment Verification - Pending
| Field | Details |
|-------|---------|
| **ID** | TC-136 |
| **Priority** | P1 |
| **Steps** | 1. Complete payment<br>2. Verification fails |
| **Expected** | Shows "Payment Pending" badge (red) |

---

## 17. QR Code Filter Test Cases (NEW - Session 7)

### TC-140: Type Filter - All
| Field | Details |
|-------|---------|
| **ID** | TC-140 |
| **Priority** | P1 |
| **Steps** | 1. Go to Admin QR page<br>2. Click "All" filter |
| **Expected** | Shows all tables AND rooms |

### TC-141: Type Filter - Tables Only
| Field | Details |
|-------|---------|
| **ID** | TC-141 |
| **Priority** | P1 |
| **Steps** | 1. Click "Tables" filter |
| **Expected** | Shows only tables (rtype: TB) |

### TC-142: Type Filter - Rooms Only
| Field | Details |
|-------|---------|
| **ID** | TC-142 |
| **Priority** | P1 |
| **Steps** | 1. Click "Rooms" filter |
| **Expected** | Shows only rooms (rtype: RM) |

### TC-143: Menu Master Dropdown
| Field | Details |
|-------|---------|
| **ID** | TC-143 |
| **Priority** | P1 |
| **Steps** | 1. Check Menu dropdown |
| **Expected** | Shows all available menu masters (Normal, Party, Premium, etc.) |

### TC-144: QR Code Uses Correct URL
| Field | Details |
|-------|---------|
| **ID** | TC-144 |
| **Priority** | P0 - Critical |
| **Steps** | 1. Select "Party" menu<br>2. Download QR code<br>3. Scan QR |
| **Expected** | URL contains `foodFor=Party` |

### TC-145: Bulk Download - Filtered
| Field | Details |
|-------|---------|
| **ID** | TC-145 |
| **Priority** | P1 |
| **Steps** | 1. Filter by Tables<br>2. Select "Premium" menu<br>3. Download All as ZIP |
| **Expected** | ZIP contains only tables, filenames include "Premium" |

---

## Document History

| Date | Session | Changes |
|------|---------|---------|
| Mar 26, 2026 | Session 7 | Added Razorpay Payment Test Cases (TC-130 to TC-136), QR Filter Test Cases (TC-140 to TC-145) |
| Mar 26, 2026 | Session 5 | Updated POS token flow test cases for localStorage architecture |
| Mar 26, 2026 | Session 5 | Added Admin Login & POS Token test cases (TC-120 to TC-123) |
| Mar 25, 2026 | Session 4 | Initial test cases document created |

---
*Last Revised: April 11, 2026 — 21:30 IST | Updated: Session 12 — FEAT-002 Phase 1-2, BUG-043/044, payment fixes*
