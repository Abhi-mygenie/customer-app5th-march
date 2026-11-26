# INTAKE DOC — BUG-2026-10-14-001

## Item Identity

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-2026-10-14-001 |
| **Title** | Negative-stock mode ignored — when POS `inventory_negative='Yes'` the app still hides / blocks `stock_out='Y'` items; all inventory gates must be bypassed (items shown, fully orderable) |
| **Classification** | BUG — customer-visible (menu wrongly truncated; lost orders) |
| **Date Registered** | 2026-10-14 |
| **Reported By** | Owner, during INV-2026-10-14-002 ("if inventory_negative=Yes then we should not use inventory logic, all foods should be shown and user should be able to order") |
| **Severity** | **P1 (proposed — owner to confirm at Planning)** — live 541 (The Palm House) shows 2 of 32 coffees and 0 of 9 cold brews to customers today; 689 hides 69 of 126 items; 478 hides 10 |
| **Risk** | **HIGH** — `ReviewOrder.jsx` CRITICAL and `CartContext.js` HIGH hotspots per Alpha v0.1 Part C; `MenuItems.jsx`, `MenuItem.jsx`, `CustomizeItemModal.jsx` MEDIUM. **No Fast Lane.** |
| **Status** | INTAKE — **holding at the Planning gate** (owner: "stay at gate") |
| **Source investigation** | `INV-2026-10-14-002-menu-item-visibility-inventory-logic/INVESTIGATION_REPORT.md` S3, S4b (F-8, OD-INV2-1...7) |
| **Related** | CR-2026-09-07-001 (introduced the three-layer stock gates; never considered negative mode) · CR-2026-06-17-003 (time availability, unaffected) · INV-2026-10-14-002 · draft POS ask `inbox/OUTBOUND_TO_POS_INVENTORY_NEGATIVE_STOCK_OUT_2026_10_14.md` |

---

## 1. Problem

POS exposes a restaurant setting `inventory_negative` (`web/restaurant-info`, root, `'Yes'/'No'`). `'Yes'` means the restaurant sells into negative stock — POS accepts the order (owner-confirmed, OD-INV2-1). POS nevertheless still computes `stock_out='Y'` on tracked (`is_inventory='Yes'`) items. The customer app reads only `stock_out`/`food_stock` and never `inventory_negative`, so in negative mode it hides items the restaurant is happy to sell, shows Sold-Out badges, blocks add-to-cart and blocks at pre-submit.

**Live impact 2026-10-14 (preprod):**

| rid | `inventory_negative` | items | wrongly hidden (`stock_out='Y'`) | notable |
|---|---|---|---|---|
| 541 The Palm House | Yes | 406 | **62** | 30/32 coffees, 9/9 cold brews, Coke/Sprite/Soda, 3/4 beers, 4 wines; COLD BREW category empty |
| 689 Kunafa Mahal (UAT) | Yes | 126 | **69** | 6 categories empty |
| 478 | Yes | 149 | 10 | + 39 addons disabled |
| 716 | No (`inventory=No`) | 373 | 0 | control — unaffected |

## 2. Expected behaviour (owner decisions, recorded in INV-2026-10-14-002 S4b)

| Rule | Decision |
|---|---|
| `inventory_negative === 'No'` (explicit) | **Unchanged** — current three-layer enforcement (hide or Sold-Out per `show_out_of_stock_items`, `addToCart` block, pre-submit check, 422 backstop) |
| `inventory_negative === 'Yes'` **or absent/unknown** (OD-INV2-5 "default is always yes") | **No inventory logic at all**: every item rendered and orderable; no Sold-Out state; no "Only N left" badge; no `addToCart` stock block; no pre-submit stock/quantity check; addons with `stock_out='Y'` fully selectable (OD-INV2-3); `show_out_of_stock_items` ignored (OD-INV2-4) |
| POS 422 `out_of_stock_items` handler | stays as a harmless backstop (expected never to fire in negative mode) |

## 3. Scope

**IN (FE only, OD-INV2-6):**
- Single derived flag, e.g. `inventoryEnforced = restaurant?.inventory_negative === 'No'` (explicit `'No'` is the only enforcing value), sourced from the already-fetched `web/restaurant-info` (`useRestaurantDetails` / `restaurant` object).
- Apply at the five read points: `MenuItems.jsx:399-404` Layer-1 filter · `MenuItem.jsx:56-57, 161-170, 231-240` Sold-Out + low-stock render · `CartContext.js:228-232` Layer-2 guard (flag must reach `addToCart` — via `restaurant` in context or caller param, decide at Planning) · `ReviewOrder.jsx:1189-1240` pre-submit cache check · `CustomizeItemModal.jsx:264-275` addon disable.
- Code markers `// BUG-2026-10-14-001`.

**OUT:** time/channel/`live_web` gates (CR-2026-06-17-003 / A-1) · `is_disable`/`status` enforcement (INV-002 F-2, separate) · empty-category boxes (F-3, separate) · POS-side change (parallel ask, owner sends) · any behaviour for `inventory_negative='No'` restaurants.

## 4. Duplicate check

| Item | Relationship |
|---|---|
| CR-2026-09-07-001 inventory stock-out control (CLOSED) | PARENT behaviour — this bug is a missing mode in that design; do not reopen, register separately |
| INV-2026-10-14-002 | SOURCE — F-8 |
| CR-2026-09-08-001 no-image card guard (INTAKE) | ADJACENT in `MenuItem.jsx` render branch — coordinate file touches if both run |
| BUG-2026-09-08-001 response-not-defined 422 crash (CLOSED) | RELATED — same 422 handler, unchanged here |
**Verdict: DISTINCT.**

## 5. Blast radius

**MEDIUM files / HIGH criticality:** 5 FE files, two of them hotspots. For `inventory_negative='No'` restaurants the change must be a no-op — prove with snapshot + Playwright on a control restaurant. For `'Yes'` restaurants the visible menu grows (541: +62, 689: +69).

## 6. Evidence

- `grep -rn "inventory_negative" frontend/src` -> 0 hits (2026-10-14). `types/api/order.types.ts:245` `is_inventory` "FYI — FE reads stock_out only".
- CR-2026-09-07-001 INTAKE_DOC / IMPACT_ANALYSIS / IMPLEMENTATION_PLAN / `BE_ASK_STOCKOUT_INV-2026-09-07-001.md`: zero mentions of negative stock.
- Live POS `web/restaurant-info` 541/689/478: `inventory='Yes'`, `inventory_negative='Yes'`, `show_out_of_stock_items='No'`; `web/restaurant-product` crosstab `(is_inventory, stock_out)`: 541 `('Yes','Y')=62`, 689 `=69`, 478 `=10`; 716 `inventory='No'`, 0 flagged.
- Code paths: INV-2026-10-14-002 S2.2-2.6.

## 7. Verification (for Planning)

- Playwright: 541 and 689 (`Yes`) — coffees/cold brews visible, ADD works, addon with `stock_out='Y'` selectable, no Sold-Out/low-stock badge, pre-submit passes; control 716 (`No`/untracked) and a restaurant with explicit `'No'` (find one, or mock) — behaviour byte-identical to today.
- **One real preprod order** on 541 or 689 containing a `stock_out='Y'` item -> POS must accept (proves OD-INV2-1); if POS 422s, STOP and escalate — the fix moves to POS.
- Contract snapshots unaffected (no backend change).

## 8. Owner decisions needed at Planning

- Confirm P1.
- Approve touching `ReviewOrder.jsx` (CRITICAL) and `CartContext.js` (HIGH).
- How the flag reaches `CartContext.addToCart` (context vs param).
- Approve the one preprod test order for verification.

```text
Intake complete: BUG-2026-10-14-001
Classification: BUG (customer-visible, missing mode)
Severity: P1 (proposed)
Risk: HIGH
Duplicate check: DISTINCT
Evidence: captured (INV-2026-10-14-002 S3, S4b)
Blast radius: MEDIUM files / HIGH criticality
Docs updated: this file · INV-2026-10-14-002 report · index.yml · README.md · inbox draft ask · PRD.md
Next: Planning — HOLDING AT GATE until owner says go
```
