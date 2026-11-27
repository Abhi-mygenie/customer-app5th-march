# Planning & Implementation Doc — BUG-2026-11-27-002
## Item Banner Repeat Tap — Impact Analysis + Fix

**Date:** 2026-11-27
**Risk:** LOW
**Status:** QA_PASS (iteration_42.json — 7/7 tests PASS)

---

## 1. Code reality

```
MenuItems.jsx line 2:  import { useParams, useNavigate, useSearchParams } — useLocation missing
line 63: deepLinkAppliedKey = useRef('')  — set on first tap, never cleared
line 186: key = `${effectiveStation}|${targetSection}|${targetItem}` — no location.key
line 259: }, [menuSections, targetSection, targetItem, effectiveStation, stationsData])  — no location
```

**Two compounding problems:**
1. `navigate('/same/url')` from same URL → `useSearchParams` returns same `targetItem` → effect deps unchanged → effect **does not re-run**
2. `deepLinkAppliedKey.current` set on first tap, never reset → guard `if (key === current) return` **blocks every subsequent same-URL tap**

**Why location.key solves both:**
React Router 7: every `navigate()` call (even same URL) creates a new history entry with a **new unique `location.key`**. Including `location.key` in the effect key makes every navigation unique → guard never matches → effect re-runs.

---

## 2. Files changed — 1 only

| File | Edits | Lines |
|------|-------|-------|
| `frontend/src/pages/MenuItems.jsx` | 5 | L2, L60-65, L191, L219-224, L270 |

**Files NOT touched:** PromoBanner.jsx, server.py, orderService.ts, ReviewOrder.jsx, cart/auth

---

## 3. Exact edits applied

**E-1 — L2: import useLocation**
```javascript
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
```

**E-2 — after L60: add location hook**
```javascript
// BUG-2026-11-27-002: location.key changes on every navigate() call,
// including repeat taps to the same URL.
const location = useLocation();
```

**E-3 — L191: include location.key in key string**
```javascript
const key = `${location.key}|${effectiveStationId || ''}|${targetSection || ''}|${targetItem || ''}`;
```

**E-4 — L219-224: reset deepLinkAppliedKey after pulse**
```javascript
highlightTimerRef.current = setTimeout(() => {
  setHighlightedItemId(null);
  highlightTimerRef.current = null;
  deepLinkAppliedKey.current = ''; // BUG-2026-11-27-002: allow re-tap after pulse
}, 2000);
```

**E-5 — L270: add location to effect deps**
```javascript
}, [menuSections, targetSection, targetItem, effectiveStationId, stationsData, location]);
```

---

## 4. Verification matrix — all PASS (iteration_42.json)

| # | Test | Result |
|---|------|--------|
| 1 | Item banner repeat tap (1st + 2nd) | PASS |
| 2 | Category banner from landing (warm cache) | PASS — no regression |
| 3 | Category banner from menu page | PASS — no regression |
| 4 | Normal menu All tab default | PASS — no regression |
