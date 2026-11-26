# SESSION HANDOVER — 2026-11-26 (Phase 2 — APS Price Redesign)

**Date:** 2026-11-26
**Agent:** E1 (Roles used: Deployment, Investigation ×3, Planning ×2, Implementation ×2, Bug Fix ×2)
**Previous handover:** `SESSION_HANDOVER_2026-11-26.md`
**Branch pushed this session:** `20261126-080554` (from earlier deployment work)
**Main push:** PENDING — owner PAT requested via secrets panel

> Process rule (owner): follow the Alpha prompt role gates. No code at Intake/Planning/Investigation gates.

---

## 1. Environment

- Repo synced: `Abhi-mygenie/customer-app5th-march` main → `/app`
- Backend health: `GET /api/healthz → {"ok":true,"mongo":"up"}`
- Frontend compiled clean (webpack 0 errors)
- Preview URL: `https://mygenie-guest-1--2wcycild.preview.emergentagent.com`
- POS API: `https://preprod.mygenie.online/api/v1`
- **Admin login (restaurant 478 — 18march):** `owner@18march.com` / `Qplazm@10`
- **Phone login DOES NOT work** — use email login only
- APS test restaurant: **69 (The Goan Kitchen)** — APS items: "melo fish" (id=248252, tax=5%), "check in" (id=248234, tax=0%)
- Public test restaurant: **716** (no login needed)

---

## 2. Work Done This Session

### A. Deployment + Infrastructure (Role 7)

- Repo pulled from GitHub to `/app` via `git reset --hard origin/main`
- Fixed: missing `slowapi` (pip), TypeScript 7.x→4.9.5 downgrade (react-scripts compat)
- Env files configured: `DB_NAME=mygenie`, `CORS_ORIGINS=preview URL`, `JWT_SECRET` auto-generated
- Google Maps keys set via secrets panel
- Branch `20261126-080554` pushed to GitHub

---

### B. BUG-2026-11-26-001 — Phase 1 (Roles 6→2→3→5×3)

**Status: QA ✅ (owner live-smoke confirmed working)**

Three iterative fixes across Phase 1:

| Fix | File | What |
|---|---|---|
| Fix A | `OrderSuccess.jsx:281` | `foodId: item.foodId` added to updatedItems mapping — food ID was being dropped |
| Fix B | `OrderSuccess.jsx:779` | `billSummary.grandTotal` row masked with `hasSuccessAPS` |
| Fix C | `OrderSuccess.jsx:670` | `||` lookup order: `foodId||food_id||id` — `item.id` (order-line ID) was always truthy, short-circuiting before `item.foodId` |

Also applied from original plan (Edits 1-A through 2-G):
- CartBar: `cartItems` added to useCart(), APS mask on price display
- ReviewOrder: 4 price rows + Place Order button masked; `apsItemFoodIds`/`apsPassCount` passed to all 4 navigate calls

**Test results:**
- `iteration_36.json` — 12/12 PASS (CartBar + ReviewOrder)
- `iteration_37.json` — Fix A+B code-verified, regressions PASS
- `iteration_38.json` — Fix C code-verified, CartBar PASS
- Owner screenshots 2026-11-26: per-item APS ✅, Grand Total ✅, top total ✅

---

### C. BUG-2026-11-26-001 — Phase 2 Investigation (Role 6)

**Key discoveries from owner screenshots + POS API probe:**

1. **POS API confirmed:** `"aps": "yes"` field exists on ALL POS items. Only "melo fish" and "check in" at restaurant 69 have `aps:"yes"`. Probe: `POST /web/restaurant-product {"restaurant_id":"69","category_id":"0"}`.

2. **`aps` field NOT extracted** by `useMenuData.js` transformer (lines 64–130). Only 35 specific fields extracted — `aps` missing.

3. **Arithmetic subtraction `total - apsCount` is wrong when GST/SC/rounding involved:**
   - `roundedTotal = Math.ceil(₹1 + 5% GST) = Math.ceil(₹1.05) = ₹2.00`
   - `real = 2.00 - 1 = ₹1.00` → showed "₹1.00 + APS" instead of "APS"
   - POS returns `order_amount` including GST on ₹1 → "₹0.99 + APS" in OrderSuccess

4. **6 surfaces still broken** after Phase 1 (see INVESTIGATION_REPORT_P2.md)

**Owner confirmed approach:** Use `aps:"yes"` tag + treat APS price as ₹0 for FE display calculations only. Keep ₹1 for POS API payloads.

---

### D. BUG-2026-11-26-001 — Phase 2 Implementation (Role 3)

**Status: IMPLEMENTED — Build PASS — QA NOT YET RUN**

**20 edits across 7 files:**

| File | Edits | What |
|---|---|---|
| `frontend/src/utils/apsUtils.js` | NEW | `isAPS(item)` helper: `aps==="yes"` primary, `price===1` fallback |
| `frontend/src/hooks/useMenuData.js` | U-1 | Added `aps: item.aps || 'no'` to transformer (line ~130) |
| `frontend/src/components/MenuItem/MenuItem.jsx` | M-1 | `isAPS = _isAPS(item)` replaces `parseFloat(item.price) === 1` |
| `frontend/src/components/CustomizeItemModal/CustomizeItemModal.jsx` | C-1,C-2,C-3 | `basePrice=0` for APS; button shows "Add To Cart (APS)" or "Add To Cart APS + ₹X" |
| `frontend/src/components/CartBar/CartBar.jsx` | CB-1,CB-2 | `isAPS` detection; edit mode ₹0.00 guard |
| `frontend/src/pages/ReviewOrder.jsx` | R-1 to R-7 | `taxBreakdownDisplay` useMemo; 20+ display-only vars; all IIFEs replaced |
| `frontend/src/pages/OrderSuccess.jsx` | O-1,O-2,O-3 | `displayTotal` + `displayBillSummary`; `effBS` pattern; D-2A GST rows hidden |

**Key ReviewOrder display chain (all display-only, POS payload unchanged):**
```
taxBreakdownDisplay  — recalculates CGST/SGST with APS at ₹0
itemTotalDisplay     = itemTotal - apsUnitTotal
serviceChargeDisplay = SC% × (subtotalAfterDiscount - apsUnitTotal)
itemCgstDisplay      = taxBreakdownDisplay.cgst × discountRatioDisp
finalSubtotalDisplay = subtotalAfterDiscountDisp + serviceChargeDisplay + delivery
roundedTotalDisplay  = Math.ceil(totalToPayDisplay) [or totalToPayDisplay]
```

**D-1A:** CGST/SGST rows hidden in ReviewOrder when `itemCgstDisplay === 0`
**D-2A:** CGST/SGST rows hidden in OrderSuccess when `effBS.cgst === 0`
**D-3A (no code):** OrderSuccess redirects on status=6 (Paid) — no transition logic needed

**Build:** `yarn build` PASS, 0 errors, 32s.

---

## 3. Registry State After This Session

| ID | Status | What |
|---|---|---|
| BUG-2026-11-14-001 | SMOKE | Search: banner + nav hide |
| BUG-2026-11-14-002 | SMOKE | Search ranking: exact match first |
| CR-2026-11-14-002 | SMOKE | APS badge on menu card |
| CR-2026-11-14-003 | SMOKE | Banner click → internal page |
| BUG-2026-11-25-001 | SMOKE | Compact search cards |
| BUG-2026-11-25-002 | SMOKE | Filter chips hide during search |
| CR-2026-11-25-001 | SMOKE | Header hides during search |
| CR-2026-11-25-003 | QA | Edit mode layout (needs live order smoke) |
| **BUG-2026-11-26-001** | **QA** | **APS price — Phase 1 ✅ live-smoke, Phase 2 🔲 QA not run** |
| BUG-2026-11-25-003 | INTAKE | Menu timeout (waiting on POS team) |
| CR-2026-11-14-001 | INTAKE | Room OTP first order (HIGH risk, needs planning) |
| CR-2026-11-26-001 | INTAKE | Banner → specific category/item (blocked on 5 owner decisions) |

---

## 4. For the Next Agent

### Priority Order

| Order | ID | Action needed |
|---|---|---|
| **1** | **BUG-2026-11-26-001 Phase 2** | **QA (Role 4) — run testing agent. See verification matrix below.** |
| 2 | CR-2026-11-25-003 | Live smoke: place order → re-scan same table QR → verify edit mode layout |
| 3 | CR-2026-11-26-001 | Blocked on 5 owner decisions (see INTAKE_DOC Q1–Q5) |
| 4 | CR-2026-11-14-001 | HIGH risk, needs Planning + owner decisions before impl |

---

### Phase 2 QA Guide (26 verification matrix items)

**What was NOT tested (Phase 2):**

**Group B — CustomizeItemModal:**
- V-05: Open "Crab" (APS, +₹0 sauce) customisation modal → button shows `Add To Cart (APS)` not `₹1.00`
- V-06: APS item + paid variation (+₹10) → `Add To Cart APS + ₹10.00`
- V-07: Normal item customisation → `Add To Cart ₹100.00` unchanged

**Group C — CartBar:**
- V-08: APS-only cart → `APS`
- V-09: Mixed ₹100 + APS → `₹100.00 + APS`
- V-10: Normal cart → `₹X.XX` unchanged
- V-11: Edit mode, 0 previous items, APS new → `APS` (not `APS + ₹0.00 = APS`)

**Group D — ReviewOrder (APS=0 display):**
- V-13: APS-only → Item Total `APS`
- V-14: Mixed → Item Total `₹100.00 + APS`
- V-15: APS-only → Subtotal `APS`
- V-16: APS-only → CGST/SGST rows **HIDDEN** (D-1A)
- V-17: Mixed (₹100 + APS) → CGST row shows tax on ₹100 only
- V-18: APS-only + rounding → Grand Total `APS` (not `₹1.00 + APS`)
- V-19: APS-only + rounding → Grand Total `APS` (not `₹2.00 - 1 = ₹1.00`)
- V-20: Mixed → Place Order `₹100.00 + APS`
- V-21: APS-only → `Place Order (APS)`
- V-22: Normal only → no APS text anywhere

**Group E — OrderSuccess:**
- V-25: Place order with APS → top total uses `displayTotal` → `APS` or `₹X + APS`
- V-26: Bill Summary Grand Total → `APS`, CGST rows **HIDDEN** (D-2A)

**What was already tested (Phase 1, iterations 36-38 — do NOT retest):**
- CartBar basic APS/mixed/normal (V-08–V-10 equiv) — PASS
- ReviewOrder basic item/subtotal/grandtotal/button — PASS iter_36
- OrderSuccess per-item APS mask (Fix C) — PASS via owner live screenshot

---

### Critical facts for QA agent

1. **Login:** `owner@18march.com` / `Qplazm@10` for restaurant 478. Phone login returns 401.
2. **APS test restaurant:** 69 (The Goan Kitchen). Items: "melo fish" (id=248252, tax=5% excl), "check in" (id=248234, tax=0%)
3. **Restaurant 892 (Miia Bella)** also has APS items (Crab, King Fish) — good for customisation modal test
4. **Phase 2 key change:** APS items now use `price=0` for all display calculations. CGST/SGST on APS items = ₹0, so those rows are hidden.
5. **POS payload is unchanged** — ₹1 still sent. Only display layer changed.
6. **New file:** `frontend/src/utils/apsUtils.js` — `isAPS()` helper

---

## 5. Files Changed This Session (all)

```
frontend/src/utils/apsUtils.js                              NEW — Phase 2
frontend/src/hooks/useMenuData.js                           Phase 2 (U-1)
frontend/src/components/MenuItem/MenuItem.jsx               Phase 2 (M-1)
frontend/src/components/CustomizeItemModal/CustomizeItemModal.jsx  Phase 2 (C-1–C-3)
frontend/src/components/CartBar/CartBar.jsx                 Phase 1 + Phase 2
frontend/src/pages/ReviewOrder.jsx                          Phase 1 + Phase 2
frontend/src/pages/OrderSuccess.jsx                         Phase 1 (Fix A/B/C) + Phase 2
memory/change_requests/index.yml                            registry updates
memory/change_requests/BUG-2026-11-26-001-.../INTAKE_DOC.md
memory/change_requests/BUG-2026-11-26-001-.../QA_HANDOVER.md
memory/SESSION_HANDOVER_2026-11-26.md                      (previous session)
memory/SESSION_HANDOVER_2026-11-26-P2.md                   (this file)
memory/PRD.md
test_reports/iteration_36.json
test_reports/iteration_37.json
test_reports/iteration_38.json
```

---

## 6. POS API Evidence (confirmed this session)

**Endpoint:** `POST https://preprod.mygenie.online/api/v1/web/restaurant-product`
**Body:** `{"restaurant_id":"69","category_id":"0"}`

**melo fish (id=248252):**
```json
{
  "id": 248252,
  "name": "melo fish",
  "price": 1,
  "aps": "yes",
  "tax": 5,
  "tax_type": "GST",
  "tax_calc": "Exclusive",
  "variations": [{"name":"macha","type":"single","required":"off","values":[{"label":"poli","optionPrice":"0"},{"label":"boli","optionPrice":"10"}]}]
}
```

**check in (id=248234):**
```json
{ "id": 248234, "name": "check in", "price": 1, "aps": "yes", "tax": 0, "tax_calc": "Exclusive" }
```

Restaurant 69 total items: 21. Items with `aps:"yes"`: 2. Non-APS items at ₹1: 0.

---

## 7. Known Issues / Gotchas

1. **Phase 2 QA not run** — must be done before moving to SMOKE or closing the item.
2. **Restaurant 892 (Miia Bella) APS test:** King Fish / Crab have `aps:"yes"` in POS data but were added before Phase 2 — cached items in browser may still use `price===1` fallback detection (which also works).
3. **OrderSuccess King Fish x2 (Screenshot 3 from owner):** That order (#000050) was placed before Phase 1 Fix C. New orders placed after the fix should show correctly.
4. **CR-2026-11-25-003 edit mode:** Still needs live smoke. Place a dine-in order, re-scan same table QR, verify "Previously Ordered" collapsed pill appears.
5. **CR-2026-11-26-001 (Banner → category/item):** Blocked on 5 owner decisions in INTAKE_DOC Q1–Q5.
6. **TypeScript 4.9.5:** Downgraded from 7.x for react-scripts compat — `yarn.lock` reflects this. Any yarn install will reinstall correctly.

---

*End of session handover — 2026-11-26 (Phase 2)*
