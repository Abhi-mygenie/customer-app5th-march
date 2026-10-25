# IMPLEMENTATION PLAN — BUG-2026-10-22-001

**ID:** BUG-2026-10-22-001  
**Title:** Veg / Non-Veg / Egg icons — FSSAI compliance  
**Date:** 2026-10-22  
**Risk:** LOW  
**Prerequisite:** Owner approves D1 (SearchAndFilterBar treatment) before Step 6  

---

## Exact Edit Sequence

### Step 1 — `frontend/src/index.css` — CSS variables (6 values)

| Line | Current | Replace with |
|---|---|---|
| 18 | `--color-veg: #008000;` | `--color-veg: #00A651;` |
| 19 | `--color-non-veg: #be3838;` | `--color-non-veg: #944A28;` |
| 20 | `--color-egg: #FFA500;` | `--color-egg: #944A28;` |
| 76 | `--border-veg: #008000;` | `--border-veg: #00A651;` |
| 77 | `--border-non-veg: #be3838;` | `--border-non-veg: #944A28;` |
| 78 | `--border-egg: #FFA500;` | `--border-egg: #944A28;` |

> After this step, all surfaces that read CSS variables (`MenuItem.css`, `FilterPanel.css`) will
> auto-receive correct colours. Shape overrides still needed separately.

---

### Step 2 — `frontend/src/components/MenuItem/MenuItem.css` — triangle shape override

After line 73 (end of `.veg-label.egg .veg-dot` block), insert:

```css
/* BUG-2026-10-22-001: FSSAI non-veg/egg → brown triangle */
.veg-label.non-veg .veg-dot,
.veg-label.egg .veg-dot {
  border-radius: 0;
  background-color: var(--color-non-veg);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
```

> `color: currentColor` on the parent `.veg-label.non-veg .veg-dot` sets background, but 
> we override directly with `background-color` + `clip-path` to guarantee shape.
> `border-radius: 0` cancels the inherited `var(--radius-full)`.

---

### Step 3 — `frontend/src/components/AdminSettings/DietaryTagsAdmin.css`

**3a — Hardcoded colour values (6 replacements):**

| Line | Current | Replace with |
|---|---|---|
| 434 | `border-color: #329937;` | `border-color: #00A651;` |
| 438 | `border-color: #dc2626;` | `border-color: #944A28;` |
| 442 | `border-color: #d97706;` | `border-color: #944A28;` |
| 452 | `background: #329937;` | `background: #00A651;` |
| 456 | `background: #dc2626;` | `background: #944A28;` |
| 460 | `background: #d97706;` | `background: #944A28;` |

**3b — Triangle shape override** — after line 461, insert:

```css
/* BUG-2026-10-22-001: FSSAI non-veg/egg → brown triangle */
.veg-indicator.non-veg .veg-dot,
.veg-indicator.egg .veg-dot {
  border-radius: 0;
  background: #944A28;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
```

---

### Step 4 — `frontend/src/components/FilterPanel/FilterPanel.css` — triangle shape override

After line 108 (end of `.egg .veg-dot` block), insert:

```css
/* BUG-2026-10-22-001: FSSAI non-veg/egg → brown triangle */
.non-veg .veg-dot,
.egg .veg-dot {
  border-radius: 0;
  background-color: var(--color-non-veg);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
```

> Colours auto-corrected by Step 1 variable change. Only shape override needed here.

---

### Step 5 — `frontend/src/pages/OrderSuccess.css` — hardcoded colours + triangle

**5a — Hardcoded colour values (4 replacements):**

| Line | Current | Replace with |
|---|---|---|
| 352 | `border-color: #0f8a0f;` | `border-color: #00A651;` |
| 356 | `border-color: #b91c1c;` | `border-color: #944A28;` |
| 366 | `background: #0f8a0f;` | `background: #00A651;` |
| 370 | `background: #b91c1c;` | `background: #944A28;` |

**5b — Triangle shape override** — replace `.order-success-item-veg .veg-dot` block (lines 359–363):

Current (lines 359–363):
```css
.order-success-item-veg .veg-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
```

Replace with:
```css
.order-success-item-veg .veg-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
/* BUG-2026-10-22-001: FSSAI non-veg triangle override */
.order-success-item-veg.non-veg .veg-dot {
  border-radius: 0;
  background: #944A28;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
```

---

### Step 6 — `frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.css`

**D1 resolved: Option A — full FSSAI fix (owner approved 2026-10-22)**

**6a — Hardcoded colour values (6 replacements):**

| Selector | Current colour | Replace with |
|---|---|---|
| `.veg-dot-green` border-color | `#329937` | `#00A651` |
| `.veg-dot-green::after` background | `#329937` | `#00A651` |
| `.veg-dot-red` border-color | `#dc2626` | `#944A28` |
| `.veg-dot-red::after` background | `#dc2626` | `#944A28` |
| `.veg-dot-yellow` border-color | `#d97706` | `#944A28` |
| `.veg-dot-yellow::after` background | `#d97706` | `#944A28` |

**6b — Triangle shape override** — replace the `::after` circle approach for non-veg/egg:

```css
/* BUG-2026-10-22-001: FSSAI non-veg/egg → brown triangle */
.veg-dot-red::after,
.veg-dot-yellow::after {
  border-radius: 0;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  background: #944A28;
}
```

> `.veg-dot-green::after` keeps `border-radius: 50%` (circle) — veg stays as circle.  
> `.veg-dot-red` and `.veg-dot-yellow` wrappers: update border-color only; the triangle  
> is drawn entirely by the `::after` pseudo-element via clip-path.

---

## Code Marker

All inserted/changed lines must be marked:
```css
/* BUG-2026-10-22-001: FSSAI veg/non-veg icon compliance */
```

---

## Self-Test Checklist (Implementation Agent)

After all edits:

- [ ] Screenshot menu page — veg = green circle, non-veg = brown triangle, egg = brown triangle
- [ ] Screenshot admin dietary-tags panel — same icons
- [ ] Screenshot filter panel — non-veg/egg filter buttons show brown triangle
- [ ] Screenshot order success — icon in order summary shows correct shape/colour
- [ ] No other colour regressions visible on page

---

## Verification Matrix (from Impact Analysis)

V1 through V9 — see `IMPACT_ANALYSIS.md §9`

---

## Files WILL Change

1. `frontend/src/index.css`
2. `frontend/src/components/MenuItem/MenuItem.css`
3. `frontend/src/components/AdminSettings/DietaryTagsAdmin.css`
4. `frontend/src/components/FilterPanel/FilterPanel.css`
5. `frontend/src/pages/OrderSuccess.css`
6. `frontend/src/components/SearchAndFilterBar/SearchAndFilterBar.css` — **pending D1**

## Files WILL NOT Change

- Any `.jsx` / `.tsx` / `.js` / `.ts` file
- `backend/server.py`
- Any `.env` file
- All hotspot files (ReviewOrder, AuthContext, CartContext, RestaurantConfigContext, App.js)
