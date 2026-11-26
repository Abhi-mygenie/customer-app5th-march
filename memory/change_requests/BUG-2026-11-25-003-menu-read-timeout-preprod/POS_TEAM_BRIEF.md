# POS API Optimisation Brief — `restaurant-product` Endpoint
**From:** MyGenie Customer App team  
**To:** POS Backend team  
**Date:** 2026-11-25  
**Priority:** P1  
**Related bug:** BUG-2026-11-25-003  

---

## 1. The Problem

The `/web/restaurant-product` endpoint is the primary performance bottleneck for the customer ordering app. For restaurant 541 (Palm House), this single call:

- Returns **830 KB** of JSON
- Takes **5–13 seconds** to respond (preprod; variable under load)
- Is called on **every menu page load**, blocking the entire menu from rendering

Customers on average mobile connections (4G: ~5–10 Mbps, effective ~1–3 Mbps) wait **6–15 seconds** to see any menu items. This directly impacts conversion.

The same call for restaurant 716 returns **594 KB** and takes **4–13 seconds**. Both restaurants show the same structural inefficiency.

---

## 2. What We Measured

### Payload composition for restaurant 541 (408 items, 33 categories)

| Component | Current size | Avoidable? |
|---|---|---|
| Inline `add_ons` (1,652 entries, only 32 unique) | 145 KB | **Yes — 142 KB avoidable** |
| Fields the app never reads | 154 KB | **Yes — all avoidable** |
| Inline `variations` (repeated per item) | 46 KB | **Yes — 35 KB avoidable** |
| Fields the app actually uses | 258 KB | No |
| Other (envelope, category headers) | 227 KB | Partially |
| **Total** | **830 KB** | **~331 KB removable (40%)** |

Optimised target: **~200 KB** → estimated response time **1–2 seconds**.

---

## 3. Root Cause 1 — add_ons Embedded Inline on Every Item (Highest Impact)

### Current behaviour
Every item that has add-ons carries the full add-on object embedded inside it:

```json
{
  "id": 107387,
  "name": "Organic Espresso",
  "add_ons": [
    {"id": 10816, "name": "Honey",     "price": 50,  "stock_out": "N", "food_stock": null},
    {"id": 10818, "name": "Oat Milk",  "price": 60,  "stock_out": "N", "food_stock": null},
    {"id": 10848, "name": "Extra Shot","price": 50,  "stock_out": "N", "food_stock": null},
    ...
  ]
}
```

### The problem
Restaurant 541 has **32 unique add-ons** shared across **150 items**. Because each item embeds the full objects:
- Add-on `10816` ("Honey", ₹50) appears **93 times** in the response
- Total add-on entries: **1,652** (should be 32)
- Total add-on data transmitted: **145 KB** (should be ~3 KB)
- **142 KB wasted on pure repetition**

### Requested change — Option A (Preferred): Reference-based model
Move add-on definitions to a top-level catalogue. Each item carries only IDs.

```json
{
  "addon_catalogue": {
    "10816": {"id": 10816, "name": "Honey",     "price": 50,  "stock_out": "N", "food_stock": null},
    "10818": {"id": 10818, "name": "Oat Milk",  "price": 60,  "stock_out": "N", "food_stock": null}
  },
  "products": [
    {
      "id": 107387,
      "name": "Organic Espresso",
      "add_on_ids": [10816, 10818, 10848]
    }
  ]
}
```

The app team will update the frontend to look up from `addon_catalogue` by ID. This is a **coordinated API contract change** — the app will support both old (inline) and new (catalogue) format during a transition window.

### Requested change — Option B (Simpler, no contract change needed):
If a contract change is not feasible right now, please deduplicate by ensuring the same add-on object is not repeated — i.e., each item's `add_ons` array contains only the IDs/refs, with a shared lookup at the top level. Any approach that avoids repeating the same 5-field object 93 times achieves the same goal.

**Expected saving: 142 KB (17% of payload)**

---

## 4. Root Cause 2 — Unused Fields (Second Highest Impact)

The customer app reads exactly **21 fields** per item. The endpoint currently sends **71 fields** per item. The fields below are **never read by any part of the frontend**, confirmed by full code audit of:
- `MenuItem.jsx`
- `MenuItems.jsx`
- `orderService.ts`
- `cartTransformer.ts`
- `orderTransformer.ts`

### Fields to remove (or exclude from the endpoint)

| Field | Size in payload | Reason it's unused |
|---|---|---|
| `recipe` | **39.5 KB** | Full kitchen recipe record — customer app has no recipe feature |
| `category_ids` (array) | 12.4 KB | Duplicate of `category_id` scalar — app uses only the scalar |
| `slug` | 11.6 KB | SEO URL slug — not used in the React SPA |
| `created_at` | 8.4 KB | Admin audit field |
| `updated_at` | 8.4 KB | Admin audit field |
| `restaurant_name` | 6.4 KB | Redundant — already known from `restaurant-info` call |
| `tax_calc` | 4.4 KB | Tax calculation method — app uses `tax` and `tax_type` only |
| `web_available_time_starts` | 4.0 KB | Availability window — not checked by app |
| `web_available_time_ends` | 4.0 KB | Availability window — not checked by app |
| `available_time_starts` | 4.0 KB | Duplicate of web variant above |
| `available_time_ends` | 4.0 KB | Duplicate of web variant above |
| `discount_type` | 3.6 KB | App does not apply per-item discounts at menu display time |
| `takeaway_charge` | 2.4 KB | Not used at item level |
| `delivery_charge` | 2.4 KB | Not used at item level |
| `pack_charges` | 2.4 KB | Not used at item level |
| `station_name` | 2.2 KB | `food_for` already carries station info |
| `give_discount` | 2.0 KB | Not used |
| `dinein` | 1.9 KB | Channel flag — not checked |
| `recipe_status` | 1.7 KB | Recipe system field |
| `is_inventory` | 1.7 KB | Not checked by app |
| `takeaway` | 1.6 KB | Channel flag — not checked |
| `delivery` | 1.6 KB | Channel flag — not checked |
| `packed_food` | 1.6 KB | Channel flag — not checked |
| `recipe_id` | 1.6 KB | Recipe system field |
| `attributes` | 1.6 KB | Always sent as `"[]"` (empty string) |
| `complementary` | 1.6 KB | Complementary item system — not used |
| `restaurant_opening_time` | 1.6 KB | Not used at item level |
| `restaurant_closing_time` | 1.6 KB | Not used at item level |
| `is_recipe` | 1.2 KB | Recipe system field |
| `complementary_price` | 1.2 KB | Not used |
| `restaurant_id` | 1.2 KB | Already known from request payload |
| `portion_size` | 0.8 KB | Not displayed (`kcal` is used instead) |
| `item_code` | 0.8 KB | Not used |
| `choice_options` | 0.8 KB | Always `[]` |
| `cuisines` | 0.8 KB | Always `[]` |
| `order_count` | 0.7 KB | Analytics field |
| `prepration_time_min` | 0.6 KB | Not displayed |
| `serve_time_in_min` | 0.5 KB | Not displayed |
| `discount` | 0.4 KB | Not applied at display time |
| `jain` | 0.4 KB | Dietary flag not used in filter logic |
| `status` | 0.4 KB | `live_web` and `is_disable` already used |
| `food_status` | 0.4 KB | Same |
| `recommended` | 0.4 KB | Not used |
| `avg_rating` | 0.4 KB | Not displayed |
| `rating_count` | 0.4 KB | Not displayed |
| `restaurant_status` | 0.4 KB | Not used |
| `restaurant_discount` | 0.4 KB | Not used |
| `schedule_order` | 0.4 KB | Not used |
| `free_delivery` | 0.4 KB | Not used |
| `min_delivery_time` | 0.4 KB | Not used |
| `max_delivery_time` | 0.4 KB | Not used |

### Fields to KEEP (confirmed used by app)

```
id, name, price, image, description, veg, egg, variations, add_ons,
stock_out, food_stock, kcal, allergens, food_order, category_id,
live_web, is_disable, food_for, tax, tax_type
```

**Expected saving from field removal alone: ~130 KB (16% of payload). No app-side changes needed.**

---

## 5. Root Cause 3 — variations Also Repeated Per Item

Same pattern as add-ons. Restaurant 541 has 41 unique variation groups (e.g., "Choice Of Milk", "Size", "Temperature"). These are embedded inline per item.

| Metric | Current | If deduplicated |
|---|---|---|
| Variation entries in payload | Many (per item) | 41 (once) |
| Total variation bytes | 46 KB | ~11 KB |
| **Saving** | | **~35 KB** |

This is lower priority than the add-ons fix but can be addressed with the same catalogue approach.

---

## 6. Fields the App Will Need in Future (Do Not Remove)

These fields are currently unused but map to planned features — do not remove them:

| Field | Planned use |
|---|---|
| `allergens` | Already used (keep — was incorrectly listed above) |
| `kcal` | Already used (keep) |
| `portion_size` | May be used if portion display feature is built |

---

## 7. Summary of Requested Changes

| # | Change | Expected saving | App change needed? | Priority |
|---|---|---|---|---|
| 1 | Remove 50 unused fields | ~130 KB | None | **High — do first** |
| 2 | Deduplicate `add_ons` into top-level catalogue | ~142 KB | Yes — lookup by ID | High |
| 3 | Deduplicate `variations` into top-level catalogue | ~35 KB | Yes — lookup | Medium |
| **Total** | | **~307 KB (37% of payload)** | | |

After these changes: **830 KB → ~200 KB**, estimated response time **1–2 seconds** (down from 5–13s).

---

## 8. Coordination Notes

- Changes 2 and 3 require an **API contract change**. The app team needs 1–2 days to update the frontend once the new shape is confirmed.
- Change 1 (remove unused fields) requires **zero app changes** and can be shipped independently on the POS side.
- During the transition: the old endpoint can remain available as `/web/restaurant-product/v1`, and the new one as `/web/restaurant-product/v2`, or the same endpoint can be versioned via a request header. App team is flexible — confirm preferred approach.
- **Please do not remove `food_stock` or `stock_out`** — these control the sold-out badge, which is a live display feature.

---

## 9. Contact

Raise questions on this brief in the shared channel.  
Reference: **BUG-2026-11-25-003** in the MyGenie Customer App change registry.
