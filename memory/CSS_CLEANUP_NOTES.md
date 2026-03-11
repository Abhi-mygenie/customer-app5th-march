# CSS Cleanup Notes

## Date: March 11, 2026

---

## `--text-tertiary` Usage Audit

**Issue:** `--text-tertiary` is NOT configurable from admin settings. It's hardcoded to `#666666` in `index.css`.

**Recommendation:** Replace with `--color-primary` or `--text-secondary` based on context.

---

### FIXED (Search & Filter)

| File | Line | Element | Changed From | Changed To |
|------|------|---------|--------------|------------|
| SearchAndFilterBar.css | 79 | `.search-icon` | `--text-tertiary` | `--color-primary` |
| SearchAndFilterBar.css | 100 | `.search-input::placeholder` | `--text-tertiary` | `--color-primary` |

---

### PENDING - To Review Later

#### MenuItems.css (3 occurrences)
- Line 70: `color: var(--text-tertiary);`
- Line 513: `color: var(--text-tertiary);`
- Line 546: `color: var(--text-tertiary);`

#### DiningMenu.css (2 occurrences)
- Line 31: `color: var(--text-tertiary);`
- Line 283: `color: var(--text-tertiary);`

#### Login.css (2 occurrences)
- Line 74: `color: var(--text-tertiary);`
- Line 93: `color: var(--text-tertiary);`

#### Profile.css (9 occurrences)
- Line 96: `color: var(--text-tertiary);`
- Line 147: `color: var(--text-tertiary);`
- Line 169: `color: var(--text-tertiary);`
- Line 213: `color: var(--text-tertiary);`
- Line 247: `color: var(--text-tertiary);`
- Line 267: `color: var(--text-tertiary);`
- Line 353: `color: var(--text-tertiary);`
- Line 421: `color: var(--text-tertiary);`

#### OrderSuccess.css (10 occurrences)
- Line 71: `color: var(--text-tertiary);`
- Line 99: `color: var(--text-tertiary);`
- Line 127: `color: var(--text-tertiary);`
- Line 134: `color: var(--text-tertiary);`
- Line 176: `color: var(--text-tertiary);`
- Line 192: `color: var(--text-tertiary);`
- Line 330: `color: var(--text-tertiary, #777);`
- Line 384: `color: var(--text-tertiary);`
- Line 471: `color: var(--text-tertiary);`
- Line 762: `color: var(--text-tertiary, #999);`
- Line 768: `color: var(--text-tertiary, #999);`

#### LandingPage.css (4 occurrences)
- Line 206: `color: var(--text-tertiary);`
- Line 215: `color: var(--text-tertiary);`
- Line 253: `color: var(--text-tertiary);`
- Line 404: `color: var(--text-tertiary);`

#### ReviewOrder.css (10 occurrences)
- Line 318: `color: var(--text-tertiary) !important;`
- Line 357: `color: var(--text-tertiary) !important;`
- Line 361: `color: var(--text-tertiary) !important;`
- Line 798: `color: var(--text-tertiary);`
- Line 906: `color: var(--text-tertiary, #888);`
- Line 910: `color: var(--text-tertiary, #888);`
- Line 958: `color: var(--text-tertiary);`
- Line 998: `color: var(--text-tertiary);`
- Line 1004: `color: var(--text-tertiary);`

#### AdminSettings.css (1 occurrence)
- Line 113: `color: var(--text-tertiary);`

---

## Summary

| Status | Count |
|--------|-------|
| Fixed | 2 |
| Pending | 56 |
| **Total** | **58** |

---

## Other CSS Cleanup Done (Same Session)

### Hamburger Button
- Primary source: `HamburgerMenu.css`
- Removed duplicates from: `MenuItems.css`, `DiningMenu.css`, `Header.css`
- Fixed colors to use `--color-primary` (background) and `--button-text-color` (icon)
- Fixed hover to use `opacity: 0.9` + `transform: translateY(-2px)`
- Added `:active` state

### Login Button
- Fixed from outline style to solid fill
- Background: `--color-primary`
- Text: `--button-text-color`
- Hover: `opacity: 0.9` + `transform: translateY(-2px)` + `box-shadow`
- Added `:active` state

### Static Defaults Added
- Added `--button-text-color: #ffffff;` to `index.css` (was missing)
