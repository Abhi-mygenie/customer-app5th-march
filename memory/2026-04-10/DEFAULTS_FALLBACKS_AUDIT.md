# Defaults & Fallbacks Audit Report

## Last Updated: April 10, 2026
## Auditor: AI Code Assistant
## Scope: All hardcoded defaults, fallback values, images, CSS, and environment variable fallbacks

---

## Dashboard

| ID | Category | Severity | Title | Files Affected | Status |
|---|---|---|---|---|---|
| DFA-001 | API URLs | HIGH | Hardcoded preprod API URL fallbacks in frontend | 4 files | ✅ Fixed (Apr 10) |
| DFA-002 | API URLs | HIGH | Hardcoded preprod API URL fallbacks in backend | 2 files | ✅ Fixed (Apr 10) |
| DFA-003 | Images | MEDIUM | Logo fallback to MyGenie generic logo | 5 files, 7 occurrences | ✅ Fixed (Apr 10) |
| DFA-004 | Images | MEDIUM | Hardcoded "Powered by MyGenie" logo | 1 file | ✅ Fixed (Apr 10) |
| DFA-005 | Images | LOW | onError handlers hide broken images silently | 6 files, 9 occurrences | Pending |
| DFA-006 | CSS Colors | MEDIUM | Primary color mismatch across fallbacks | 3 different colors | Pending |
| DFA-007 | CSS Fonts | MEDIUM | 55 hardcoded Montserrat font-family (not via CSS var) | MenuItems.css + others | Pending |
| DFA-008 | CSS Vars | LOW | 219 CSS var() with hardcoded fallback values | Multiple CSS files | Informational |
| DFA-009 | Backend | LOW | 80+ hardcoded default config values in get_app_config | server.py | Informational |
| DFA-010 | Backend | MEDIUM | Backend primary color default (#E8531E) mismatches frontend (#61B4E5) | server.py vs index.css | Pending |
| DFA-011 | Hardcoding | HIGH | Restaurant 716 skip table check hardcoded | ReviewOrder.jsx | Documented |

### Stats

| Severity | Count | Pending | Informational |
|---|---|---|---|
| HIGH | 3 | 1 | 0 |
| MEDIUM | 5 | 3 | 0 |
| LOW | 2 | 0 | 2 |
| **Total** | **11** | **4** | **2** |

---

## DFA-001: Hardcoded Preprod API URL Fallbacks (Frontend)

| Field | Details |
|---|---|
| **Severity** | HIGH |
| **Risk** | If env vars are missing, app silently calls preprod. Orders, payments, customer data go to wrong environment. No error, no warning — just silent misdirection. |
| **Files** | 4 files, 4 occurrences |

### Locations

| # | File | Line | Current Code |
|---|---|---|---|
| 1 | `src/hooks/useMenuData.js` | 77 | `process.env.REACT_APP_IMAGE_BASE_URL \|\| 'https://manage.mygenie.online'` |
| 2 | `src/api/services/orderService.ts` | 443 | `process.env.REACT_APP_API_BASE_URL \|\| 'https://preprod.mygenie.online/api/v1'` |
| 3 | `src/api/config/axios.js` | 12 | `process.env.REACT_APP_API_BASE_URL \|\| 'https://preprod.mygenie.online/api/v1'` |
| 4 | `src/api/config/endpoints.js` | 6 | `process.env.REACT_APP_API_BASE_URL \|\| 'https://preprod.mygenie.online/api/v1'` |

### Recommended Fix

Remove fallbacks. Fail fast if env var missing:

```javascript
// Before (dangerous)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://preprod.mygenie.online/api/v1';

// After (safe)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
if (!API_BASE_URL) {
  console.error('[Config] CRITICAL: REACT_APP_API_BASE_URL not set in .env');
}
```

### Impact
- **If fixed:** Missing env vars cause visible errors instead of silent misdirection
- **If not fixed:** Production could silently route to preprod (data leakage, wrong orders)

---

## DFA-002: Hardcoded Preprod API URL Fallbacks (Backend)

| Field | Details |
|---|---|
| **Severity** | HIGH |
| **Risk** | Backend POS API calls silently fall back to preprod URL if MYGENIE_API_URL env var is missing. |
| **Files** | 1 file, 2 occurrences |

### Locations

| # | File | Line | Current Code |
|---|---|---|---|
| 1 | `backend/server.py` | 348 | `os.environ.get("MYGENIE_API_URL", "https://preprod.mygenie.online/api/v1")` |
| 2 | `backend/server.py` | 779 | `os.environ.get("MYGENIE_API_URL", "https://preprod.mygenie.online/api/v1")` |

### Recommended Fix

```python
# Before
MYGENIE_API_URL = os.environ.get("MYGENIE_API_URL", "https://preprod.mygenie.online/api/v1")

# After
MYGENIE_API_URL = os.environ.get("MYGENIE_API_URL")
if not MYGENIE_API_URL:
    raise ValueError("CRITICAL: MYGENIE_API_URL environment variable must be set")
```

### Impact
- Same as DFA-001. POS token refresh, table config, order details could hit wrong environment.

---

## DFA-003: Logo Fallback to MyGenie Generic Logo

| Field | Details |
|---|---|
| **Severity** | MEDIUM |
| **Risk** | Every restaurant without a custom logo shows MyGenie branding. Brand confusion for white-label customers. |
| **Files** | 5 files, 7 occurrences |
| **Audit Ref** | AUDIT_V1 MEDIUM-007 |

### Locations

| # | File | Line | Fallback Image | Context |
|---|---|---|---|---|
| 1 | `pages/LandingPage.jsx` | 355 | `/assets/images/ic_login_logo.png` | Logo on landing page |
| 2 | `pages/LandingPage.jsx` | 431 | `/assets/images/ic_login_logo.png` | onError fallback for logo |
| 3 | `pages/Login.jsx` | 32 | `/assets/images/ic_login_logo.png` | Logo on login page |
| 4 | `pages/Login.jsx` | 332 | `/assets/images/ic_login_logo.png` | onError fallback for logo |
| 5 | `pages/AboutUs.jsx` | 23 | `/assets/images/ic_login_logo.png` | Logo on about page |
| 6 | `pages/AboutUs.jsx` | 47 | `/assets/images/ic_login_logo.png` | onError fallback for logo |
| 7 | `components/Sidebar/Sidebar.jsx` | 18 | `/assets/images/mygenie_logo.png` | Logo in sidebar |

### Recommended Fix

Option A: Use restaurant name as text fallback (no logo shown)
```jsx
// Before
const logoUrl = configLogoUrl || '/assets/images/ic_login_logo.png';

// After
const logoUrl = configLogoUrl; // null = show text name instead
// In JSX:
{logoUrl ? <img src={logoUrl} ... /> : <h2>{restaurant?.name || 'Restaurant'}</h2>}
```

Option B: Use a neutral placeholder (generic fork/knife icon, no branding)

---

## DFA-004: Hardcoded "Powered by MyGenie" Logo

| Field | Details |
|---|---|
| **Severity** | MEDIUM |
| **Risk** | All restaurants show "Powered by MyGenie" footer with MyGenie logo. Not configurable. |
| **Files** | 1 file, 1 occurrence |

### Location

| File | Line | Code |
|---|---|---|
| `pages/LandingPage.jsx` | 652 | `<p>Powered by <img src="/assets/images/mygenie_logo.svg" alt="MyGenie" className="footer-logo" /></p>` |

### Notes
- This is controlled by `showPoweredBy` config toggle (default: true)
- The logo image itself is hardcoded — not configurable even if visible
- May be intentional (branding requirement) — verify with business team before changing

---

## DFA-005: onError Handlers Hide Broken Images Silently

| Field | Details |
|---|---|
| **Severity** | LOW |
| **Risk** | Broken images disappear without user feedback. Admin uploads that fail just vanish. |
| **Files** | 6 files, 9 occurrences |

### Locations

| # | File | Behavior |
|---|---|---|
| 1 | `pages/AdminSettings.jsx:609` | `onError → e.target.style.display = 'none'` |
| 2 | `pages/AdminSettings.jsx:664` | `onError → e.target.style.display = 'none'` |
| 3 | `pages/AdminSettings.jsx:1077` | `onError → e.target.style.display = 'none'` |
| 4 | `pages/AdminSettings.jsx:1225` | `onError → e.target.style.display = 'none'` |
| 5 | `pages/admin/AdminSettingsPage.jsx:79` | `onError → e.target.style.display = 'none'` |
| 6 | `pages/AboutUs.jsx:41` | `onError → e.target.style.display = 'none'` |
| 7 | `components/AdminSettings/ContentTab.jsx:274` | `onError → e.target.style.display = 'none'` |
| 8 | `components/MenuItem/MenuItem.jsx:148` | `onError → handleImageError` (custom handler) |
| 9 | `components/CategoryBox/CategoryBox.jsx:25` | `onError → handleImageError` (custom handler) |

### Recommended Fix

Show a placeholder instead of hiding:
```jsx
onError={(e) => {
  e.target.src = '/assets/images/image-placeholder.svg'; // neutral broken image icon
}}
```

---

## DFA-006: Primary Color Mismatch Across Fallbacks

| Field | Details |
|---|---|
| **Severity** | MEDIUM |
| **Risk** | Three different "primary" colors used as fallbacks across the codebase. Inconsistent UI when CSS variables fail to load. |

### The Three Colors

| Color | Where Used | Count |
|---|---|---|
| `#61B4E5` (blue) | `index.css`, `theme.js`, `AdminPages.css`, `OrderSuccess.css`, `PasswordSetup.css`, `StationCard.css`, `LandingCustomerCapture.css` | 16 occurrences |
| `#E8531E` (orange) | `PaymentMethodSelector.css`, Backend `server.py` default config | 8 occurrences |
| `#ff6b35` (orange-red) | `MenuItems.css` | 2 occurrences |

### Analysis

- `#61B4E5` (blue) appears to be the current intended primary (set in `index.css:7` and `theme.js`)
- `#E8531E` (orange) is the backend default for new restaurants (`server.py:1010`)
- `#ff6b35` (orange-red) appears only in `MenuItems.css` — likely a stale value

**Key issue:** Backend sends `#E8531E` as default primary, but frontend CSS defaults to `#61B4E5`. New restaurants see mismatched colors depending on whether CSS vars loaded before or after API response.

### Recommended Fix

1. Decide on ONE default primary color
2. Update `server.py` default config to match
3. Update all CSS fallbacks to use the same value
4. Or better: ensure CSS var always loads from API config (no CSS fallback needed)

---

## DFA-007: Hardcoded Font-Family (Not Using CSS Variables)

| Field | Details |
|---|---|
| **Severity** | MEDIUM |
| **Risk** | 55 CSS rules hardcode `Montserrat` font directly instead of using `var(--font-body)`. Restaurant branding font overrides have no effect on these elements. |
| **Files** | Primarily `MenuItems.css` (majority), plus scattered in other CSS files |

### Count by Font

| Font | Count | File(s) |
|---|---|---|
| `'Montserrat', sans-serif` | ~50 | `MenuItems.css`, various component CSS |
| `'Big Shoulders', sans-serif` | 2 | `MenuItems.css:304, 604` |
| `'Capriola', sans-serif` | via CSS var only | (correctly uses `var(--font-heading)`) |

### Example

```css
/* BAD - hardcoded, ignores restaurant branding */
.menu-item-name {
  font-family: 'Montserrat', sans-serif;
}

/* GOOD - respects restaurant config */
.menu-item-name {
  font-family: var(--font-body, 'Montserrat', sans-serif);
}
```

### Recommended Fix

Replace all 55 hardcoded `font-family: 'Montserrat'` with `font-family: var(--font-body, 'Montserrat', sans-serif)`.

**Special case:** `'Big Shoulders'` on lines 304 and 604 of MenuItems.css appears to be a decorative/accent font — verify if this should also be configurable or is intentional.

---

## DFA-008: CSS var() Fallback Values (Informational)

| Field | Details |
|---|---|
| **Severity** | LOW (Informational) |
| **Count** | 219 CSS `var()` declarations with fallback values |

### Notes

This is **standard CSS practice** — `var(--color-primary, #61B4E5)` means "use the CSS variable, but if not defined, use `#61B4E5`". These are not bugs.

**However**, the fallback values should be consistent (see DFA-006 for the mismatch issue).

### Distribution

| CSS File | Count (approx) |
|---|---|
| `MenuItems.css` | 30+ |
| `OrderSuccess.css` | 25+ |
| `PaymentMethodSelector.css` | 15+ |
| `AdminPages.css` | 15+ |
| `PasswordSetup.css` | 10+ |
| Others | 124+ |

---

## DFA-009: Backend Default Config Values (Informational)

| Field | Details |
|---|---|
| **Severity** | LOW (Informational) |
| **Location** | `server.py` lines 968-1076 |
| **Count** | 80+ default values returned when restaurant has no config |

### Notes

This is **expected behavior** — new restaurants need sensible defaults. These defaults define the initial state of the customer app before an admin configures it.

### Key defaults to be aware of

| Setting | Default | Notes |
|---|---|---|
| `primaryColor` | `#E8531E` (orange) | **Mismatches** frontend default `#61B4E5` (blue) — see DFA-006 |
| `secondaryColor` | `#2E7D32` (green) | |
| `fontHeading` | `Montserrat` | |
| `fontBody` | `Montserrat` | |
| `welcomeMessage` | `"Welcome!"` | Generic — restaurant name would be better |
| `restaurantShifts` | `06:00 - 03:00` | Very broad default shift |
| `showPoweredBy` | `true` | MyGenie branding shown by default |
| `showLoginButton` | `false` | Login hidden by default |
| `feedbackEnabled` | `false` | Feedback off by default |
| `codEnabled` | `false` | Cash on delivery off by default |

### No action needed unless:
- White-label requirements change
- Default behavior needs to change for new restaurants

---

## DFA-010: Backend vs Frontend Primary Color Mismatch

| Field | Details |
|---|---|
| **Severity** | MEDIUM |
| **Risk** | New restaurant sees blue UI flash, then orange after API config loads (or vice versa) |

### The Mismatch

| Source | Primary Color | When Used |
|---|---|---|
| Frontend `index.css:7` | `#61B4E5` (blue) | CSS variable set on page load |
| Frontend `theme.js:9` | `#61B4E5` (blue) | JS fallback before config loads |
| Backend `server.py:1010` | `#E8531E` (orange) | API response for unconfigured restaurants |

### What happens for a new restaurant (no config in DB):
1. Page loads → CSS sets `--color-primary: #61B4E5` (blue)
2. API call to `/api/config/{id}` → returns `primaryColor: "#E8531E"` (orange)
3. Frontend applies API config → overrides CSS to orange
4. **User sees a blue→orange flash** on first load

### Recommended Fix

Align all three sources to the same default color. Either:
- Update `server.py` to use `#61B4E5` (match frontend)
- Or update `index.css` and `theme.js` to use `#E8531E` (match backend)

---

## DFA-011: Restaurant 716 Hardcoded Table Check Skip

| Field | Details |
|---|---|
| **Severity** | HIGH |
| **Risk** | Restaurant-specific business logic hardcoded by ID. Not scalable, not configurable. |
| **Location** | `pages/ReviewOrder.jsx` lines 922-929 |
| **Audit Ref** | CODE_AUDIT.md Section 11.1 |

### Current Code

```javascript
const skipTableCheckFor716 = String(restaurantId) === '716';

if (!skipTableCheckFor716 && finalTableId && String(finalTableId) !== '0') {
  // Table status check - SKIPPED for 716
}
```

### Context
- Restaurant 716 (Hyatt Centric Candolim Goa) allows multiple orders per table
- Other restaurants: 1 active order per table
- This is a hardcoded exception, not a configurable setting

### Recommended Fix

Add a config flag `allowMultipleOrdersPerTable` to `customer_app_config`:
```python
# In server.py default config
"allowMultipleOrdersPerTable": False,  # Default: single order per table
```

Then in ReviewOrder.jsx:
```javascript
// Before
const skipTableCheckFor716 = String(restaurantId) === '716';

// After
const skipTableCheck = config?.allowMultipleOrdersPerTable === true;
```

---

## Action Plan

### Phase 1: High Priority (Security/Data Integrity)
| ID | Task | Effort | Dependency |
|---|---|---|---|
| DFA-001 | Remove frontend API URL fallbacks | 30 min | Need to verify .env is set in all environments |
| DFA-002 | Remove backend API URL fallbacks | 15 min | Need to verify .env is set in all environments |
| DFA-011 | Convert restaurant 716 hardcoding to config flag | 1 hr | DB migration for existing config |

### Phase 2: Medium Priority (Branding/White-Label)
| ID | Task | Effort | Dependency |
|---|---|---|---|
| DFA-006 | Align primary color defaults (pick ONE color) | 1 hr | Business decision on default brand color |
| DFA-010 | Sync backend + frontend default primary | 30 min | Depends on DFA-006 decision |
| DFA-003 | Replace MyGenie logo fallback with neutral placeholder | 2 hrs | Design team for placeholder asset |
| DFA-007 | Convert 55 hardcoded font-family to CSS vars | 2 hrs | None |
| DFA-004 | Make "Powered by" logo configurable or remove | 30 min | Business decision |

### Phase 3: Low Priority (Polish)
| ID | Task | Effort | Dependency |
|---|---|---|---|
| DFA-005 | Replace hidden broken images with placeholders | 1 hr | Design team for placeholder asset |
| DFA-008 | Audit CSS var fallback consistency | 2 hrs | After DFA-006 is decided |
| DFA-009 | Review backend defaults for white-label readiness | 1 hr | Business review |

---

## Document History

| Date | Changes |
|---|---|
| April 10, 2026 | DFA-003 & DFA-004 fixed — removed logo fallbacks, made powered-by configurable. 25-point regression test passed. |
| April 10, 2026 | DFA-001 & DFA-002 fixed — removed all preprod URL fallbacks. 7 tests passed. |
| April 10, 2026 | Initial audit created — 11 findings documented |
