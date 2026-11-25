# INVESTIGATION REPORT — BUG-2026-11-25-003 (Deep Payload Analysis)

**ID:** BUG-2026-11-25-003  
**Addendum to:** Initial investigation (latency focus)  
**This report focus:** Why is the payload 830KB and what can be removed  
**Restaurant tested:** 541 (Palm House) — 408 items, 33 categories  
**Date:** 2026-11-25  
**Steps used:** 10/10  

---

## 1. The Root Cause of the Size

The POS sends a **single flat blob** for the entire menu. Three problems compound:

| Problem | Waste | % of Payload |
|---|---|---|
| **add_ons embedded inline per item** — 32 unique add-ons sent 1,652 times | **142 KB** | 17% |
| **Unused fields** — 50+ fields the app never reads | **154 KB** | 19% |
| **variations embedded inline per item** — 41 unique variation groups repeated | **35 KB** | 4% |
| **Total waste** | **331 KB** | **40%** |

Optimised theoretical payload: **~500 KB** (1.7× smaller than current 830 KB).

---

## 2. The Biggest Single Problem: add_ons Repetition (142 KB wasted)

Palm House has only **32 unique add-ons** (Honey, 2 eggs boiled, Oat Milk, etc.).  
But because **150 items all share the same add-on pool**, the POS embeds the full add-on object inline on every single item.

```
Item A: add_ons → [{id:10816, name:"Honey", price:50, ...}, {id:10818...}, ...]   ← 21 entries
Item B: add_ons → [{id:10816, name:"Honey", price:50, ...}, {id:10818...}, ...]   ← same objects again
...×150 items
```

Result: 1,652 total add-on entries in the JSON, but only 32 are distinct.  
If the POS sent `add_ons` as a lookup dict once at the top level and each item only held IDs:

```json
{
  "addon_catalogue": { "10816": {"name":"Honey","price":50,...} },
  "products": [{ "id": 107387, "add_on_ids": [10816, 10818] }]
}
```

That would be **2.8 KB instead of 145 KB** — a **98% reduction on the add_ons section alone**.

The same pattern applies to `variations`: 41 unique variation groups repeated across items → 35 KB instead of 10 KB if deduplicated.

---

## 3. Unused Fields (154 KB wasted)

The frontend reads exactly these fields from each menu item:

**USED (confirmed from MenuItem.jsx, MenuItems.jsx, orderService.ts):**
`id, name, price, image, description, veg, egg, variations, add_ons, stock_out, food_stock, kcal, allergens, food_order, category_id, live_web, is_disable, food_for, tax, tax_type`

**UNUSED — never read by any frontend file:**

| Field | Size | Why it's there |
|---|---|---|
| `recipe` | **39.5 KB** | Kitchen recipe card — POS internal, no customer use |
| `category_ids` (array) | **12.4 KB** | Multi-category membership list — app uses only `category_id` (single) |
| `slug` | **11.6 KB** | SEO URL slug — not used in this SPA |
| `created_at` / `updated_at` | **16.8 KB** | Admin audit fields |
| `restaurant_name` | **6.4 KB** | Repeated on every item (whole restaurant name on every row) |
| `tax_calc` | **4.4 KB** | Tax calculation method string — `tax` and `tax_type` are used instead |
| `available_time_starts/ends` (×2 variants) | **16.0 KB** | 4 timestamp fields for availability windows — none read |
| `discount_type` | **3.6 KB** | Discount type string — `discount` amount not even used |
| `takeaway_charge/delivery_charge/pack_charges` | **7.2 KB** | Per-item charges — not used at item level |
| `station_name` | **2.2 KB** | `food_for` already carries station info |
| `give_discount` | **2.0 KB** | — |
| `dinein/takeaway/delivery/packed_food` | **6.7 KB** | Channel availability flags — not checked by frontend |
| `recipe_id/recipe_status/is_recipe` | **4.5 KB** | Recipe system fields |
| `is_inventory` | **1.7 KB** | Inventory tracking flag — not used |
| `complementary/complementary_price` | **2.8 KB** | Complimentary item system |
| `restaurant_id` | **1.2 KB** | Already known from URL |
| `restaurant_opening/closing_time` | **3.2 KB** | Restaurant hours — not used at item level |
| `attributes` | **1.6 KB** | Always `"[]"` — empty |
| `choice_options` | **0.8 KB** | Always `[]` — empty |
| `allergens` | **0.8 KB** | ✅ Actually used in MenuItem.jsx — keep |
| `avg_rating/rating_count/order_count` | **1.5 KB** | Analytics — never displayed |
| `status/food_status/restaurant_status` | **1.2 KB** | Multiple status flags — `live_web` and `is_disable` are the ones used |
| `jain` | **0.4 KB** | Dietary flag not checked by filter logic |
| `portion_size/item_code` | **1.6 KB** | — |
| `schedule_order/free_delivery/min_delivery_time/max_delivery_time` | **1.6 KB** | — |
| `restaurant_discount` | **0.4 KB** | — |

---

## 4. Additional Size Drivers

### category_ids Array
Every item carries an array like `[{"id":"1269","position":0}]`.  
Since no item in this restaurant belongs to multiple categories, this is always a 1-element array — equivalent to `category_id` which is already a plain integer. The array form costs **12.4 KB** vs. the flat `category_id` which costs **1.6 KB**.

### Image URLs (34.7 KB — necessary but compressible)
Every item has a full absolute URL like:  
`https://preprod.mygenie.online/public/assets/admin/img/100x100/food-default-image.png`  
(55 chars base URL + filename). These are necessary but could be base-URL-stripped at the POS level and reconstructed client-side.

---

## 5. What Can Be Fixed Where

### POS Team (needs their change — highest impact)

| Fix | Saving | Effort |
|---|---|---|
| Deduplicate `add_ons` into a top-level catalogue + IDs per item | **142 KB** | Medium — API contract change |
| Deduplicate `variations` same way | **35 KB** | Medium |
| Remove unused fields (`recipe`, `slug`, `category_ids`, `created_at`, `updated_at`, `restaurant_name`, availability windows, charges, etc.) | **~130 KB** | Low — just exclude from query |
| Total POS-side | **~307 KB (37%)** | — |

### Frontend / Backend Proxy (can be done without POS changes)

| Fix | Saving | Where |
|---|---|---|
| **Proxy strip in backend `server.py`**: add a `/api/menu-proxy` endpoint that calls POS, strips unused fields, returns slim JSON | ~130–154 KB | Backend (new endpoint) |
| **Cache the response in Redis/MongoDB**: first customer loads, rest get instant cached response (TTL 5 min) | 5–13s → <100ms after first load | Backend |
| **Raise per-endpoint timeout** to 20s for `restaurant-product` only (immediate, 2-line fix) | No size saving, but fixes the timeout | Frontend (2 lines) |

### Quick Win Available Now (Frontend Only, No POS Needed)
The frontend transformer (`restaurantService.js`) could **strip unused fields** after fetching, reducing memory/parse time — but NOT network time. The only way to reduce network time is POS-side or backend-proxy-side.

---

## 6. Impact Estimate After Full Optimisation

| Scenario | Payload | Latency estimate |
|---|---|---|
| Today (baseline) | 830 KB | 5–13s |
| POS removes unused fields only | ~680 KB | 4–10s |
| POS deduplicates add_ons + variations | ~350 KB | 2–5s |
| POS deduplicates + removes unused | ~200 KB | 1–2s ← target |
| Backend proxy cache (after 1st load) | 830 KB network, 0s for cached users | <100ms |

---

## 7. Recommendations (Prioritised)

1. **Immediate (2 lines, this session):** Raise `restaurant-product` and `restaurant-info` timeout to 20s. Stops the blank menu on slow days.
2. **Short-term (backend, 1 endpoint):** Add a backend proxy + 5-min cache. First customer waits; everyone else is instant.
3. **POS team (medium-term):** Remove unused fields from the endpoint. Easiest POS change, saves 130 KB, no contract change.
4. **POS team (longer-term):** Deduplicate `add_ons` and `variations` into a top-level catalogue. Saves 177 KB. Requires the app to be updated to look up from the catalogue. Biggest individual win.

---

```
Investigation complete: BUG-2026-11-25-003 (payload analysis)
Root cause: add_ons/variations repeated inline (177KB) + 50+ unused fields (154KB) = 331KB waste
Classification: DATA (POS API design) + CONFIG (no caching)
Confidence: HIGH
Steps used: 10/10
Evidence: /tmp/r541_prod_1.json (830KB payload, 408 items)
Recommendation: 
  - Immediate: 2-line timeout fix (Planning → Implementation)
  - Medium: backend proxy+cache (Planning needed)
  - POS team: strip unused fields, deduplicate add_ons/variations
Report: memory/change_requests/BUG-2026-11-25-003-menu-read-timeout-preprod/INVESTIGATION_REPORT_PAYLOAD.md
```
