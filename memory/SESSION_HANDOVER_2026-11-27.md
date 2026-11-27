# SESSION HANDOVER — 2026-11-27 (Full Session)

**Date:** 2026-11-27
**Agent:** E1 (Roles used: Deployment × 1, Investigation × 5, Planning × 3, Implementation × 3, Bug Fix × 2)
**Previous handover:** `SESSION_HANDOVER_2026-11-26-P2.md`
**Branches pushed this session:** `20261126-131821`, `20261126-134920`, `20261126-144232`, `20261127-main`

> Process rule (owner): follow the Alpha prompt role gates. No code at Intake/Planning/Investigation gates.

---

## 1. Environment

- Repo: `Abhi-mygenie/customer-app5th-march` (branch `main`)
- Backend health: `GET /api/ → {"message":"Customer App API"}`
- Frontend compiled clean (webpack 0 errors, 1 pre-existing hook warning)
- Preview URL: `https://mygenie-customer-2--36818awr.preview.emergentagent.com`
- POS API: `https://preprod.mygenie.online/api/v1`
- **Admin login (restaurant 478 — 18march):** `owner@18march.com` / `Qplazm@10`
- **Phone login DOES NOT work** — use email login only
- **APS test restaurant:** 69 (The Goan Kitchen) — APS items: "melo fish" (id=248252, tax=5%), "check in" (id=248234, tax=0%)

---

## 2. Work Done This Session

---

### A. Deployment (Role 7)

- Repo `main` rsync'd to `/app` fresh pod
- `CORS_ORIGINS` fixed (wildcard blocked by backend when allow_credentials=True)
- `JWT_SECRET`, `GOOGLE_MAPS_API_KEY`, `REACT_APP_GOOGLE_MAPS_API_KEY` set via secrets panel
- Both services healthy. Branch `20261126-131821` pushed.

---

### B. BUG-2026-11-26-001 — Phase 3: Gap Fixes (CustomizeItemModal + OrderSuccess threshold)

**Status: QA PASS (iteration_40, 12/12)**

**Two gaps confirmed from owner screenshots:**

| Gap | File | Root Cause | Fix |
|---|---|---|---|
| GAP-1 | `CustomizeItemModal.jsx:204` | Modal header always rendered `₹{item.price}` — Phase 2 C-fixes missed it | `isAPS(item) ? 'APS' : '₹X.XX'` |
| GAP-2 | `OrderSuccess.jsx:679` | Guard `price <= 1` failed when variation (+₹10 Boli) pushed fullPrice to ₹11; Option A: pass `apsItemUnitPrices = {foodId: max(base+var+addon)}` from ReviewOrder | Threshold widened to `(apsItemUnitPrices[fid]||1)+0.5` |

**8 edits across 3 files:**
- `CustomizeItemModal.jsx`: Edit H — header price
- `ReviewOrder.jsx`: Edit A (compute apsItemUnitPrices), Edits B/C/D/E (4 navigate calls)
- `OrderSuccess.jsx`: Edit F (extract from state), Edit G (threshold comparison)

**QA:** iteration_40 — 12/12 PASS. Branch `20261126-144232` pushed.

---

### C. BUG-2026-11-26-001 — Phase 4: RC-1 + RC-2 (revised) + RC-3

**Status: IMPLEMENTED — Build PASS — QA NOT YET RUN**

**3 root causes confirmed via live POS API probe (order 1578881, 56 line items):**

---

#### RC-1 — LandingPage navigate calls missing APS data

**Investigation:**
- LandingPage.jsx has 2 paths to OrderSuccess (lines 330 and 694)
- Both pass only `{orderId, totalToPay, billSummary}` — zero APS fields
- On QR scan / page refresh: `orderData = null` → `apsSuccessFoodIds = new Set([])` → NO masking

**Fix (2 edits in LandingPage.jsx):**
```js
// Derive from orderDetails.previousItems (unitPrice <= 1 = unconfirmed APS)
const apsItemFoodIdsA = (orderDetails.previousItems || [])
  .filter(item => parseFloat(item.unitPrice ?? item.price) <= 1)
  .map(item => String(item.foodId)).filter(Boolean);
const apsCountA = ...reduce(qty)...
// Add to navigate state: apsItemFoodIds, apsCount
```

---

#### RC-2 — `fullPrice` used in APS mask instead of `unit_price`

**Investigation (live API probe confirmed):**

POS API key fact (order 1578881 probe, file: `/app/memory/order_1578881_probe.json`):
- `unit_price = "1.00"` for ALL unconfirmed APS items (ALWAYS, regardless of variation/addon quantity)
- `unit_price = "89.00"` ONLY after waiter manually adjusts
- `food_details.aps` field NOT present in order-details response

**Transformer flow:**
```
api.unit_price = "1.00"
→ transformOrderItem: basePrice=1, fullPrice=1+variation+addon (e.g. 61 for mappu×6)
→ OrderSuccess line 291: price: item.fullPrice ?? item.price → stores 61 (discards 1)
→ APS mask: parseFloat(61) <= 1.5 → FALSE → shows ₹61
```

**Fix (3 edits):**
- `orderTransformer.ts`: Add `unitPrice: basePrice` to `transformOrderItem` (was only in `transformPreviousOrderItem`)
- `order.types.ts`: Add `unitPrice?: number` to `OrderItem` interface (TypeScript fix)
- `OrderSuccess.jsx line 291`: Add `unitPrice: item.unitPrice ?? item.price ?? 0`
- `OrderSuccess.jsx line 681`: Change mask to `parseFloat(item.unitPrice ?? item.price) <= 1 + 0.5`

**Proof:**
| unit_price from POS | Mask result | Display |
|---|---|---|
| 1 (any variation/addon) | `1 <= 1.5` → APS ✓ | — |
| 89 (waiter adjusted) | `89 > 1.5` → real price ✓ | ₹198.00 |

---

#### RC-3 — PreviousOrderItems.jsx has no APS masking

**Investigation:**
- Used in ReviewOrder edit mode "Previously Ordered" section
- Line 162: `₹{(fullPrice × qty).toFixed(2)}` — always numeric, no APS check
- `item.unitPrice` already available from `transformPreviousOrderItem` (line 158)
- Collapsed header subtotal (line 103) includes APS `fullPrice` amounts

**Fix (2 edits in PreviousOrderItems.jsx):**
```jsx
// Per-item price (line 162):
{parseFloat(item.unitPrice ?? item.price) <= 1 ? 'APS' : `₹${fullPrice × qty}`}
// Subtotal (line 103):
if (parseFloat(item.unitPrice ?? item.price) <= 1) return total; // skip APS
```

---

#### Phase 4 — All 7 edits summary

| Edit | File | RC | Type |
|---|---|---|---|
| 1 | `LandingPage.jsx` path A | RC-1 | ADD block + 2 nav fields |
| 2 | `LandingPage.jsx` path B | RC-1 | ADD block + 2 nav fields |
| 3 | `orderTransformer.ts` | RC-2 | ADD `unitPrice: basePrice` to `transformOrderItem` |
| 4 | `OrderSuccess.jsx` | RC-2 | ADD `unitPrice` to liveOrderItems mapping |
| 5 | `OrderSuccess.jsx` | RC-2 | CHANGE mask from `price` to `unitPrice ?? price` |
| 6 | `PreviousOrderItems.jsx` | RC-3 | ADD APS check on per-item price |
| 7 | `PreviousOrderItems.jsx` | RC-3 | ADD APS guard in subtotal reduce |

**TypeScript fix:** `order.types.ts` — added `unitPrice?: number` to `OrderItem` interface (required for Edit 3).

**Build:** webpack 0 errors, TypeScript 0 issues. **QA NOT YET RUN.**

---

### D. BUG-2026-11-27-001 — Update Order button shows price

**Status: IMPLEMENTED — Build PASS — QA NOT YET RUN**

**Investigation:**
- `ReviewOrder.jsx` line 2507: `` `Update Order ₹${roundedTotal.toFixed(2)}` ``
- In edit mode, `roundedTotal` = new additions + previous order total → customer sees combined price on button
- APS makes it confusing (price includes ₹1 placeholder)
- "Place Order" button (lines 2509–2524) correctly handles APS/non-APS/Razorpay — untouched

**Fix (1 line, ReviewOrder.jsx):**
```js
// BEFORE:
? `Update Order ₹${roundedTotal.toFixed(2)}`
// AFTER:
? 'Update Order'
```

**Build:** PASS. **QA NOT YET RUN.**

---

## 3. Registry State After This Session

| ID | Status | Phase/Notes |
|---|---|---|
| **BUG-2026-11-26-001** | **QA** | **Phase 1 ✅ Phase 2 ✅ Phase 3 QA PASS Phase 4 IMPLEMENTED QA PENDING** |
| **BUG-2026-11-27-001** | **IMPLEMENTED** | **Update Order button price — IMPLEMENTED QA PENDING** |
| BUG-2026-11-14-001 | SMOKE | Search: banner + nav hide |
| BUG-2026-11-14-002 | SMOKE | Search ranking |
| CR-2026-11-14-002 | SMOKE | APS badge on menu card |
| CR-2026-11-14-003 | SMOKE | Banner click → internal page |
| BUG-2026-11-25-001 | SMOKE | Compact search cards |
| BUG-2026-11-25-002 | SMOKE | Filter chips hide during search |
| CR-2026-11-25-001 | SMOKE | Header hides during search |
| CR-2026-11-25-003 | QA | Edit mode layout (needs live order smoke) |
| BUG-2026-11-25-003 | INTAKE | Menu timeout (waiting on POS team) |
| CR-2026-11-14-001 | INTAKE | Room OTP first order (HIGH risk) |
| CR-2026-11-26-001 | INTAKE | Banner → category/item (5 owner decisions needed) |

---

## 4. Files Changed This Session (All)

```
# Phase 3 (BUG-2026-11-26-001 Gap Fixes)
frontend/src/components/CustomizeItemModal/CustomizeItemModal.jsx  — Edit H
frontend/src/pages/ReviewOrder.jsx                                 — Edit A, B, C, D, E
frontend/src/pages/OrderSuccess.jsx                                — Edit F, G

# Phase 4 (BUG-2026-11-26-001 RC-1/2/3)
frontend/src/pages/LandingPage.jsx                                 — Edit 1, 2 (RC-1)
frontend/src/api/transformers/orderTransformer.ts                  — Edit 3 (RC-2)
frontend/src/types/models/order.types.ts                           — unitPrice? field (TS fix)
frontend/src/pages/OrderSuccess.jsx                                — Edit 4, 5 (RC-2)
frontend/src/components/PreviousOrderItems/PreviousOrderItems.jsx  — Edit 6, 7 (RC-3)

# BUG-2026-11-27-001
frontend/src/pages/ReviewOrder.jsx                                 — line 2507 (button label)

# Memory
memory/SESSION_HANDOVER_2026-11-27.md                              — this file
memory/change_requests/index.yml                                   — registry updates
memory/change_requests/BUG-2026-11-26-001-.../INVESTIGATION_REPORT_P3.md
memory/change_requests/BUG-2026-11-26-001-.../INVESTIGATION_REPORT_P4.md
memory/change_requests/BUG-2026-11-27-001-.../INTAKE_DOC.md
memory/order_1578881_probe.json                                    — live POS API probe data
```

---

## 5. POS API Evidence (order 1578881 probe)

**File:** `/app/memory/order_1578881_probe.json` (56 line items, persisted)

Key findings:
1. `unit_price = "1.00"` for ALL unconfirmed APS items — regardless of variation/addon count
2. `unit_price = "89.00"` for waiter-adjusted melo fish + boli × 2 (item id=3970440)
3. `food_details.aps` field NOT in order-details response (only in menu endpoint)
4. `item_unit_price = 1` on ALL items (even after waiter adjustment) — not useful for detection
5. `total_variation_price` and `total_add_on_price` present per line item

---

## 6. For the Next Agent

### Priority Order

| Order | ID | Action |
|---|---|---|
| **1** | **BUG-2026-11-26-001 Phase 4** | **QA (Role 4) — run testing agent. See verification matrix below.** |
| **2** | **BUG-2026-11-27-001** | **QA (Role 4) — verify Update Order button shows no price** |
| 3 | CR-2026-11-25-003 | Live smoke: place order → re-scan same table QR → edit mode layout |
| 4 | CR-2026-11-26-001 | Blocked on 5 owner decisions |

---

### Phase 4 Verification Matrix (QA agent)

| # | Scenario | Expected |
|---|---|---|
| V-1 | QR scan → OrderSuccess, melo fish (no addon) | APS ✓ |
| V-2 | QR scan → OrderSuccess, melo fish + mappu×6 | APS ✓ |
| V-3 | QR scan → OrderSuccess, melo fish + boli (waiter → ₹89) | ₹198.00 ✓ |
| V-4 | Polling update → melo fish + mappu×6 pending | APS ✓ |
| V-5 | Non-APS item (₹100) anywhere | ₹100.00 unchanged ✓ |
| V-6 | ReviewOrder edit mode — Previously Ordered — melo fish + mappu×6 | APS ✓ |
| V-7 | ReviewOrder edit mode — collapsed header subtotal | Shows only non-APS ₹ amounts ✓ |
| V-8 | ReviewOrder edit mode — Previously Ordered — non-APS ₹100 | ₹100.00 unchanged ✓ |
| V-9 | Bill Summary, CartBar, ReviewOrder totals | Unchanged ✓ |

### BUG-2026-11-27-001 Verification

| # | Scenario | Expected |
|---|---|---|
| V-1 | Edit mode Review Order button | "Update Order" (no price) |
| V-2 | New order Place Order button | "Place Order ₹X.XX + APS" or "Place Order ₹X.XX" (unchanged) |
| V-3 | New order Razorpay button | "Pay & Proceed ₹X.XX" (unchanged) |

---

## 7. Critical Facts for Next Agent

1. **Login:** `owner@18march.com` / `Qplazm@10` for restaurant 478. Phone login returns 401.
2. **APS test restaurant:** 69 (The Goan Kitchen). Items: "melo fish" (id=248252), "check in" (id=248234)
3. **Phase 4 key change:** APS mask now uses `item.unitPrice` (= `api.unit_price` from POS = always 1 until waiter adjusts). No navigate state dependency for per-item mask.
4. **`apsItemUnitPrices`** in navigate state from Phase 3 is PRESERVED but no longer used for per-item mask (now uses `unitPrice`). Can be cleaned up in a future session.
5. **`order_1578881_probe.json`:** Persisted in `/app/memory/` — 56 items, confirmed RC-2 root cause.
6. **TypeScript:** `OrderItem` interface in `order.types.ts` now has `unitPrice?: number`.
7. **POS payload:** Unchanged throughout all phases. Only display layer changed.

---

*End of session handover — 2026-11-27*
