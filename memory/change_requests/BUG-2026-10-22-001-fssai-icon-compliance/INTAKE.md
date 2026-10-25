# INTAKE — BUG-2026-10-22-001

**ID:** BUG-2026-10-22-001  
**Type:** BUG  
**Title:** Veg / Non-Veg / Egg icons do not comply with FSSAI standard  
**Registered:** 2026-10-22  
**Registered by:** Investigation Agent (Role 6) → Intake Agent (Role 1)  
**Status:** INTAKE  

---

## Owner Report

Screenshot review confirmed that the food-type indicator icons rendered in the menu and
admin dietary-tags panel do not match the mandatory FSSAI symbol specification.

Owner ruling (2026-10-22):
- Egg items must use the **same icon as Non-Vegetarian** (no separate egg category icon).
- Veg: Green filled circle inside green-outlined square. Color `#00A651`.
- Non-Veg (including egg): Brown filled **triangle** inside brown-outlined square. Color `#944A28`.

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 — compliance defect; app functions but violates mandatory FSSAI labelling requirement |
| Risk | LOW — CSS-only fix, 3 files, no logic / API / database / auth change |
| Duplicate check | DISTINCT — no prior FSSAI icon item found in index.yml |
| Blast radius | SMALL — visual change to icon rendering in MenuItem and DietaryTagsAdmin components |
| Money path | NO |

---

## Evidence (from Investigation INV-FSSAI-ICONS)

| # | File | Current behaviour | Required behaviour |
|---|---|---|---|
| 1 | `src/index.css` lines 18–20, 76–78 | `--color-veg:#008000`, `--color-non-veg:#be3838`, `--color-egg:#FFA500`; same for border vars | `--color-veg:#00A651`, `--color-non-veg:#944A28`, `--color-egg:#944A28` (egg = non-veg) |
| 2 | `src/components/MenuItem/MenuItem.css` lines 56–61 | `.veg-dot` uses `border-radius: var(--radius-full)` → all types render as **circles** | Non-veg and egg dot must render as a **triangle** |
| 3 | `src/components/AdminSettings/DietaryTagsAdmin.css` lines 433–461 | Hardcoded colours `#329937` / `#dc2626` / `#d97706`; all dots are circles (`border-radius:50%`) | Same FSSAI colours; non-veg and egg dot must be triangle |

### FSSAI Standard (confirmed by owner)

| Symbol | Shape | Colour |
|---|---|---|
| Vegetarian | Filled circle inside square | `#00A651` (green) |
| Non-Vegetarian (incl. egg) | Filled **triangle** inside square | `#944A28` (brown) |

---

## Affected Files

**WILL change:**
- `frontend/src/index.css`
- `frontend/src/components/MenuItem/MenuItem.css`
- `frontend/src/components/AdminSettings/DietaryTagsAdmin.css`

**WILL NOT change:**
- Any `.jsx` / `.tsx` / `.js` component logic
- `server.py` or any backend file
- Any API contract, localStorage key, or database schema
- `useMenuData.js` — `isEgg` flag can stay; CSS will map egg → non-veg icon

---

## Blast Radius

- **MenuItem component** — icon displayed next to every menu item name
- **DietaryTagsAdmin panel** — icon shown in admin dietary-tag mapping UI
- No order flow, no payment path, no auth, no cart affected

---

## Next Step

→ **PLANNING** — impact analysis and implementation plan for 3-file CSS fix.

```
Intake complete: BUG-2026-10-22-001
Classification: BUG
Severity: P2
Risk: LOW
Duplicate check: DISTINCT
Evidence: captured (Investigation INV-FSSAI-ICONS + owner ruling 2026-10-22)
Blast radius: SMALL
Docs updated: change_requests/BUG-2026-10-22-001-fssai-icon-compliance/INTAKE.md
Next: Planning
```
