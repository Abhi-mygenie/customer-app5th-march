# INTAKE DOC — CR-2026-11-14-002 (Re-intake v2)

**ID:** CR-2026-11-14-002  
**Type:** CR  
**Title:** APS (As Per Size) label for items with price = 1 — show "APS" instead of ₹1 until POS updates final price  
**Registered:** 2026-11-14  
**Re-intake:** 2026-11-14 (v2 — owner spec fully resolved)  
**Status:** INTAKE → READY FOR PLANNING  
**Priority:** P2  
**Risk:** MEDIUM  

---

## 1. Owner Request (verbatim, original)

> "Request option for Fish items, price to be discussed with reception - variable pricing for the food item"

## Owner Spec (v1 — 2026-11-14)

> "For Variable Price Items configured as APS items, the customer-facing Scan & Order module should display APS (As Per Size) instead of the preset menu price. The guest should be able to place an order without entering or confirming the final price. The APS label should remain visible until the final price is updated. Guests should be able to order items whose prices depend on size without being shown an incorrect preset price."

## Owner Spec (v2 — 2026-11-14, this re-intake)

> "the items with price = 1 are variable price items"  
> "it will be updated from pos side, until the price is 1 it will stay as per size (aps) — will stay in normal flow, nothing changes — nothing chooses — just selects the items"  
> "yes" [mixing regular + APS items in same order is allowed]

---

## 2. Classification

**Type:** CR — Display change for variable-price items  
**Severity:** P2 — Prevents showing incorrect ₹1 price to customers for size-variable items (seafood, seasonal specials)

---

## 3. APS Item Detection (RESOLVED)

**Signal:** `item.price === 1` (or `parseFloat(item.price) === 1`)

POS marks variable-price items by setting their price to `1`. This is the agreed detection method — no new API field, no DB config needed.

**Rule:**
```js
const isAPS = parseFloat(item.price) === 1;
```

---

## 4. Required Behaviour (fully specified)

### 4a. MenuItem display (`MenuItem.jsx`)
- If `isAPS`:  show **"APS"** label/badge instead of `₹1`
- ADD button: **unchanged** — customer taps ADD normally
- No price shown; "APS" badge styled visually (e.g., orange chip)

### 4b. Cart display
- APS item in cart: show **"APS"** instead of `₹1`
- Cart item total contribution: `₹1` as-is (do NOT modify cart price — POS receives `1` and updates it)
- Cart grand total: includes `₹1` per APS item quantity (this is correct — POS will update)

### 4c. ReviewOrder display
- APS items in order summary: show **"APS"** label alongside item name
- Bill total: computed normally including `₹1` for each APS item (POS will update on their side)
- No special hold, no price-confirmation prompt, no payment flow change

### 4d. Order placement
- **Normal flow** — no change to `orderService.ts` or ReviewOrder payment logic
- Order sent to POS with `price: 1` as-is
- POS staff updates the actual price after discussion with guest
- After POS update: price reflects actual value (this happens on OrderSuccess/live POS, no extra FE work)

### 4e. Mixed cart (regular + APS items)
- **Allowed** — customer can mix freely

---

## 5. What DOES NOT CHANGE

- ADD button — identical behavior
- Cart context logic — no structural change
- Order placement — no change
- Payment flow — no change
- ReviewOrder.jsx (CRITICAL hotspot) — display only, no logic change needed
- Backend — no change

**Risk downgrade from HIGH → MEDIUM** (previous HIGH was based on assumed payment path impact; v2 spec confirms normal flow, no payment path change)

---

## 6. Files That WILL Change

| File | Change |
|---|---|
| `frontend/src/components/MenuItem/MenuItem.jsx` | Show "APS" badge when `item.price === 1`, hide `₹1` |
| `frontend/src/pages/ReviewOrder.jsx` | Show "APS" label next to APS items in order summary (display only) |

**Files that WILL NOT change:** `CartContext.js`, `orderService.ts`, `AuthContext.jsx`, backend `server.py`, `RestaurantConfigContext.jsx`

---

## 7. Duplicate Check

| ID | Title | Verdict |
|---|---|---|
| None | — | DISTINCT |

---

## 8. Risk Assessment (Updated)

| Factor | Assessment |
|---|---|
| Money path | Minimal — `₹1` sent to POS as-is; POS updates. No `order_amount` change. |
| ReviewOrder.jsx | Display change only — no logic, no payment path |
| Auth | NO |
| Regression risk | LOW — `isAPS` check is additive, not modifying existing price logic |

**Risk: MEDIUM** (ReviewOrder.jsx is a hotspot — extra care in that file)

---

## 9. Blast Radius

**Files that WILL change:** 2 files (MenuItem.jsx, ReviewOrder.jsx — display only)  
**Blast radius: SMALL**

---

## 10. Acceptance Criteria

1. Any item with `price === 1` shows "APS" badge instead of "₹1"
2. ADD button on APS items works identically to regular items
3. APS item in cart shows "APS" label (not "₹1")
4. ReviewOrder summary shows "APS" for APS items
5. Order placed normally; POS receives `price: 1` for APS items
6. Items with `price: 2`, `price: 0`, `price: 50` etc. are UNAFFECTED
7. Regular + APS items can coexist in cart

---

**Intake complete: CR-2026-11-14-002 (v2)**  
Classification: CR  
Severity: P2 | Risk: MEDIUM (downgraded from HIGH — normal flow confirmed)  
Duplicate check: DISTINCT  
Blast radius: SMALL  
Docs: change_requests/CR-2026-11-14-002-variable-price-request-item/INTAKE_DOC.md  
Next: Planning
