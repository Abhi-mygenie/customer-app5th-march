# IMPACT ANALYSIS + IMPLEMENTATION PLAN — CR-2026-11-14-003
# Banner click redirects to internal app page

**ID:** CR-2026-11-14-003
**Stage:** Impact Analysis + Implementation Plan
**Author role:** PLANNING
**Date:** 2026-11-25
**Code reality:** FULL — all files read, exact lines verified
**Risk:** MEDIUM

---

## PART 1 — IMPACT ANALYSIS

### 1a. PromoBanner.jsx (83 lines) — Code Reality

```
Props received: promotions = [{id, image_url, title, link}]
  → 'link' already passed from LandingPage.jsx line 959 but NEVER READ

Touch tracking already in place:
  startX.current, currentX.current (useRef)
  onTouchStart / onTouchMove / onTouchEnd on .promo-track div
  Swipe threshold: Math.abs(diff) > 40 → goTo(next/prev)

What's missing:
  × useNavigate — not imported
  × onClick on slide divs — none
  × cursor: pointer on slides with links — none
  × tap-vs-swipe guard — partial (diff exists, just unused for navigation)
```

**Key insight:** The swipe detection is already implemented. When `Math.abs(diff) ≤ 40`, it's a tap. We just need to wire navigation into that case.

**Double-fire problem:** On touch devices, `onTouchEnd` fires first, then a synthetic `click` event fires ~300ms later. Without protection, the navigation would trigger twice. Solution: `suppressNextClick = useRef(false)` — set in `onTouchEnd` when navigating, checked and cleared in `onClick`.

### 1b. LandingPage.jsx — Code Reality

```
Line 959: link: b.bannerLink   ← ALREADY PASSED, NO CHANGE NEEDED
```

No change required.

### 1c. AdminBannersPage.jsx (292 lines) — Code Reality

```
Line 222–230: Free-text <input type="url"> for bannerLink
  placeholder="https://example.com/promo"  ← external URL placeholder (wrong)
  value={newBanner.bannerLink}
  data-testid="input-bannerLink"

No restaurantId access — needs useAuth import to get user.restaurant_id
```

**?section= param:** Confirmed NOT supported in MenuItems.jsx (no `useSearchParams`, no section query handling). Excluded from picker options.

**Destination options (confirmed from App.js routes):**

| Label | Path |
|---|---|
| Full Menu | `/{restaurantId}/menu` |
| Dining Stations | `/{restaurantId}/stations` |
| About Us | `/{restaurantId}/about` |
| Contact | `/{restaurantId}/contact` |
| No link (default) | `""` |

### 1d. Conflict check

No other INTAKE or active items touch PromoBanner.jsx or AdminBannersPage.jsx. NONE.

### 1e. Files WILL change

| File | Change | Risk |
|---|---|---|
| `components/PromoBanner/PromoBanner.jsx` | Add `useNavigate`, `suppressNextClick` ref, navigate in `onTouchEnd` tap branch, `onClick` on slide with guard | LOW |
| `pages/admin/AdminBannersPage.jsx` | Add `useAuth`, replace free-text input with destination picker `<select>` | LOW |

### 1f. Files WILL NOT change

```
pages/LandingPage.jsx          — already passes link correctly
backend/server.py              — bannerLink already in model
context/CartContext.js         — untouched
pages/ReviewOrder.jsx          — untouched
pages/MenuItems.jsx            — untouched (?section= not supported, skip)
```

---

## PART 2 — IMPLEMENTATION PLAN

### Pre-flight (Implementation agent verifies before first edit)

- [ ] PromoBanner.jsx line 1: `import React, { useState, useEffect, useCallback, useRef }` — confirm
- [ ] PromoBanner.jsx line 4 props: `{ promotions, autoPlayInterval, compact }` — confirm
- [ ] AdminBannersPage.jsx line 222: free-text input for bannerLink — confirm
- [ ] `yarn build` or hot reload running cleanly before starting

---

### E-1 · PromoBanner.jsx · Add useNavigate import

**Find:**
```jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PromoBanner.css';
```

**Replace with:**
```jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PromoBanner.css';
```

---

### E-2 · PromoBanner.jsx · Add navigate + suppressNextClick inside component

**Find:**
```jsx
const PromoBanner = ({ promotions = [], autoPlayInterval = 3500, compact = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const trackRef = useRef(null);
  const timerRef = useRef(null);
```

**Replace with:**
```jsx
const PromoBanner = ({ promotions = [], autoPlayInterval = 3500, compact = false }) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  // CR-2026-11-14-003: suppress synthetic click after a touch-tap navigation
  const suppressNextClick = useRef(false);
```

---

### E-3 · PromoBanner.jsx · Wire navigate into onTouchEnd tap branch

**Find:**
```jsx
  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = startX.current - currentX.current;
    if (Math.abs(diff) > 40) {
      goTo(diff > 0 ? activeIndex + 1 : activeIndex - 1);
    }
  };
```

**Replace with:**
```jsx
  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = startX.current - currentX.current;
    if (Math.abs(diff) > 40) {
      // Swipe — change slide
      goTo(diff > 0 ? activeIndex + 1 : activeIndex - 1);
    } else if (items[activeIndex]?.link) {
      // CR-2026-11-14-003: tap on a slide with a link — navigate
      suppressNextClick.current = true;
      navigate(items[activeIndex].link);
    }
  };
```

---

### E-4 · PromoBanner.jsx · Add onClick to each slide + cursor style

**Find:**
```jsx
        {items.map((promo, i) => (
          <div className="promo-slide" key={promo.id || i}>
            <img src={promo.image_url} alt={promo.title || `Promotion ${i + 1}`} className="promo-image" />
            {promo.title && <div className="promo-overlay"><span className="promo-title">{promo.title}</span></div>}
          </div>
        ))}
```

**Replace with:**
```jsx
        {items.map((promo, i) => (
          <div
            className="promo-slide"
            key={promo.id || i}
            data-testid={`promo-slide-${i}`}
            style={promo.link ? { cursor: 'pointer' } : undefined}
            onClick={() => {
              // CR-2026-11-14-003: guard against synthetic click after touch-tap
              if (suppressNextClick.current) {
                suppressNextClick.current = false;
                return;
              }
              if (promo.link) navigate(promo.link);
            }}
          >
            <img src={promo.image_url} alt={promo.title || `Promotion ${i + 1}`} className="promo-image" />
            {promo.title && <div className="promo-overlay"><span className="promo-title">{promo.title}</span></div>}
          </div>
        ))}
```

**Self-test after E-1–E-4:** Webpack compiles. In browser: click a slide (desktop) → navigate. Swipe a slide → move to next slide, no navigation.

---

### E-5 · AdminBannersPage.jsx · Add useAuth import

**Find:**
```jsx
import React, { useState, useRef } from 'react';
import { useAdminConfig } from '../../context/AdminConfigContext';
```

**Replace with:**
```jsx
import React, { useState, useRef } from 'react';
import { useAdminConfig } from '../../context/AdminConfigContext';
import { useAuth } from '../../context/AuthContext';
```

---

### E-6 · AdminBannersPage.jsx · Add user + LINK_OPTIONS inside component

**Find:**
```jsx
  const { config, addBanner, updateBanner, deleteBanner, uploadImage, loading } = useAdminConfig();
```

**Replace with:**
```jsx
  const { config, addBanner, updateBanner, deleteBanner, uploadImage, loading } = useAdminConfig();
  const { user } = useAuth();
  // CR-2026-11-14-003: internal destination options
  const rid = user?.restaurant_id || user?.id || '';
  const LINK_OPTIONS = [
    { label: 'No link', value: '' },
    { label: 'Full Menu', value: `/${rid}/menu` },
    { label: 'Dining Stations', value: `/${rid}/stations` },
    { label: 'About Us', value: `/${rid}/about` },
    { label: 'Contact', value: `/${rid}/contact` },
  ];
```

---

### E-7 · AdminBannersPage.jsx · Replace free-text input with picker + preview

**Find:**
```jsx
            <div className="admin-form-group">
              <label className="admin-form-label">Link URL (optional)</label>
              <input
                type="url"
                className="admin-form-input"
                placeholder="https://example.com/promo"
                value={newBanner.bannerLink}
                onChange={(e) => setNewBanner(prev => ({ ...prev, bannerLink: e.target.value }))}
                data-testid="input-bannerLink"
              />
            </div>
```

**Replace with:**
```jsx
            {/* CR-2026-11-14-003: destination picker */}
            <div className="admin-form-group">
              <label className="admin-form-label">Tap Destination (optional)</label>
              <select
                className="admin-form-select"
                value={LINK_OPTIONS.some(o => o.value === newBanner.bannerLink)
                  ? newBanner.bannerLink
                  : '__custom__'}
                onChange={(e) => {
                  if (e.target.value !== '__custom__') {
                    setNewBanner(prev => ({ ...prev, bannerLink: e.target.value }));
                  }
                }}
                data-testid="select-bannerLink"
              >
                {LINK_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                {!LINK_OPTIONS.some(o => o.value === newBanner.bannerLink) && newBanner.bannerLink && (
                  <option value="__custom__">Custom: {newBanner.bannerLink}</option>
                )}
              </select>
              {newBanner.bannerLink && (
                <span className="admin-form-hint" data-testid="banner-link-preview">
                  → {newBanner.bannerLink}
                </span>
              )}
            </div>
```

**Note on backwards compatibility:** If an existing banner has a `bannerLink` that doesn't match any picker option (e.g. an old external URL), the select shows "Custom: {url}" as a read-only option — the value is preserved. The admin can clear it by selecting "No link".

---

## Verification Matrix (13 checks for QA)

| # | Test | Expected |
|---|---|---|
| V-1 | Desktop: click a slide WITH a link | Navigates to the link destination |
| V-2 | Desktop: click a slide WITHOUT a link | Nothing happens, no navigation |
| V-3 | Mobile: swipe left on banner | Next slide shows; no navigation |
| V-4 | Mobile: swipe right on banner | Previous slide shows; no navigation |
| V-5 | Mobile: tap a slide WITH a link | Navigates to destination; no double-fire |
| V-6 | Mobile: tap a slide WITHOUT a link | Nothing happens |
| V-7 | Slide with link: cursor style | `cursor: pointer` visible on hover (desktop) |
| V-8 | Slide without link: cursor style | Default cursor (not pointer) |
| V-9 | Auto-play still works | Banner cycles through slides automatically |
| V-10 | Dot buttons still work | Clicking dot navigates to that slide |
| V-11 | Admin: destination picker shows all 4 options + "No link" | Dropdown with 5 options visible |
| V-12 | Admin: select "Full Menu" | bannerLink updates to `/{restaurantId}/menu` |
| V-13 | Admin: existing banner with custom link | Shows "Custom: {url}" in dropdown; value preserved |

---

## Exit gate (7-point)

```
1. [ ] Registry updated — CR-2026-11-14-003 → IMPLEMENTED
2. [ ] index.yml YAML valid
3. [ ] Code markers CR-2026-11-14-003 present in both changed files
4. [ ] yarn build / frontend compile clean
5. [ ] Self-test V-1 (desktop click), V-3 (swipe), V-11 (admin picker)
6. [ ] File ownership updated
7. [ ] QA handover written
```

---

```
Planning complete: CR-2026-11-14-003
Stage: Impact Analysis + Implementation Plan (both)
Code reality: FULL
Risk: MEDIUM
Edits: E-1 through E-7 (2 files, ~40 lines)
Files WILL change: PromoBanner.jsx · AdminBannersPage.jsx
Files WILL NOT touch: LandingPage.jsx · server.py · CartContext.js · ReviewOrder.jsx · MenuItems.jsx
Owner decisions: ALL CAPTURED (internal links only, 4 destinations confirmed)
Conflicts: NONE
?section= param: NOT supported in MenuItems.jsx — excluded from picker
Exit gate: 7-point
QA handover: 13-point verification matrix
Next: Owner approval → Implementation (Role 3)
```
