# Defaults Inventory & Business-Rule Freeze (read-only)

> Date (UTC): 2026-05-31 · Baseline `main @ 4612953` · **Read-only; no code changed.**
> Purpose: answer "where are ALL defaults baked in the code?" and FREEZE business rules
> before any GAP-008 consolidation. Supports `PROJECT_SECURITY_CONFIG_CONTROL_LAYER_CORRECTION_PLAN.md` Phase 3.

## Hard freeze (owner instruction)
- **No change to business logic/decisions coming from POS API or CRM API.**
- **No change to any business RULE in Mongo/admin config.**
- GAP-008 consolidation is limited to **de-duplicating fallback VALUES into one source, value-for-value identical**. Anything that encodes a *decision* is FROZEN and out of scope.

---

## The 7 places defaults are baked into the code

### TYPE 1 — App-config defaults (branding + feature toggles)  ← THE consolidation target (GAP-008)
Fallback used for the Mongo `customer_app_config` layer when a restaurant has **no config doc** or config fails to load.
| Where | File:Line | Approx size | Role |
|---|---|---|---|
| Backend | `backend/server.py` `get_app_config()` ~`989–1100` | ~87 keys | what the API returns when no DB doc |
| Frontend (customer app) | `frontend/src/context/RestaurantConfigContext.jsx:9` `DEFAULT_CONFIG` | ~98 keys | customer-app fallback |
| Frontend (admin panel) | `frontend/src/context/AdminConfigContext.jsx:19` `defaultConfig` | ~87 keys | admin-editing fallback |
**Status:** pure VALUES (colours, show/hide toggles, labels). Safe to consolidate **value-preserving**. Already drifted (87/98/87).

### TYPE 2 — Loyalty-settings defaults (loyalty MATH/rules)  ← FROZEN (business rule)
| Where | File:Line | Role |
|---|---|---|
| Backend | `backend/server.py:1377–1396` | default `bronze_earn_percent 5.0`, `redemption_value 0.25`, tier mins, bonuses, returned when no `loyalty_settings` doc; plus per-field `.get(field, default)` |
**Status:** encodes loyalty earn/redeem **decisions** → **FROZEN. Not part of GAP-008.**

### TYPE 3 — Default restaurant id (which restaurant shows when URL has none)  ← FROZEN (decision)
| Where | File:Line | Role |
|---|---|---|
| Frontend | `frontend/src/utils/useRestaurantId.js:134` `defaultRestaurantId = "478"` | preview/dev fallback tenant |
| Frontend | `frontend/src/utils/constants.js` (commented `DEFAULT_RESTAURANT_ID`) | alt fallback |
**Status:** a routing **decision** → leave as-is unless separately approved.

### TYPE 4 — Tenant-specific hardcoded rules (Restaurant 716 carve-outs)  ← FROZEN (GAP-016, separate)
| Where | File:Line | Role |
|---|---|---|
| Frontend | `components/TableRoomSelector/TableRoomSelector.jsx:59–114` | 716 room-only ordering flow |
| Frontend | `utils/orderAccessPolicy.js:43–45` | 716 never order-blocked |
| Frontend | `utils/otpPolicy.js`, `components/FaviconRouteReset.jsx`, `components/DocumentTitleManager.jsx` | 716 references |
**Status:** real **business rules** for one tenant → **FROZEN**; tracked separately as GAP-016, not GAP-008.

### TYPE 5 — UI microcopy/label fallbacks (cosmetic)  ← optional, low priority
| Where | Example | Role |
|---|---|---|
| Frontend | `components/PaymentMethodSelector.jsx:23–24` `onlineLabel='Pay Online'`, `codLabel='Pay at Counter'` | payment button labels |
| Frontend | `Header.jsx:18` `'Menu'`, `Sidebar.jsx:20,26` `'Logo'/'Menu'`, `HamburgerMenu.jsx` `'User'/'Welcome'`, `AdminLayout.jsx:88` `'Restaurant'` | display fallbacks when a value is empty |
| Backend models | `payOnlineLabel`/`payAtCounterLabel` default `None` → UI fallback (`server.py:237–238`); Order-Success fields default `None` (`~169`) | admin-overridable labels |
**Status:** cosmetic VALUES. Not required for GAP-008; can be left or folded in later.

### TYPE 6 — Seed defaults (WRITE into Mongo, not runtime fallback)  ← different mechanism
| Where | File | Role |
|---|---|---|
| Backend | `backend/seed_defaults.py` | seeds About/openingHours/footer/nav into `customer_app_config` for restaurant users |
| Backend | `backend/seed_demo_data.py` | seeds demo customers/users |
**Status:** one-time data seeding, not a runtime default. Out of GAP-008 scope.

### TYPE 7 — Misc literal defaults
| Where | File:Line | Role |
|---|---|---|
| Backend | `server.py:66` `pos_id = "0001"` | default POS provider id |
**Status:** minor literal; leave unless flagged.

---

## What this means for GAP-008
- **In scope (consolidate, value-preserving):** TYPE 1 only — the 3 app-config default blocks (backend `get_app_config`, FE `DEFAULT_CONFIG`, FE `defaultConfig`).
- **Frozen / out of scope:** TYPE 2 (loyalty rules), TYPE 3 (default restaurant), TYPE 4 (716 rules). These encode business decisions.
- **Optional / later:** TYPE 5 (microcopy), TYPE 6 (seed), TYPE 7 (misc).
- POS (#1) and CRM (#3) data flows are untouched entirely.

## Recommended safe first action
Produce a **read-only 3-way diff** of the TYPE-1 blocks (backend vs FE customer vs FE admin) so every current inconsistency (87 vs 98 vs 87) is visible, then consolidate to a single source with **current customer-facing values winning** every conflict, proven by before/after config snapshots.
