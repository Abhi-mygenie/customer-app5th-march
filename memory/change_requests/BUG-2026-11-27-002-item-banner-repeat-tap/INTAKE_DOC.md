# INTAKE DOC — BUG-2026-11-27-002
## Item banner repeat tap does nothing on second press

**ID:** BUG-2026-11-27-002
**Type:** BUG
**Date registered:** 2026-11-27
**Registered by:** Intake Agent (Role 1)
**Severity:** P2
**Risk:** LOW
**Status:** INTAKE

---

## 1. Owner report (verbatim)

> "i am unable to go into item when pressing the banner when im on that page - first time works - but second time not"

Clarification confirmed: item banner (e.g. `?item=248247`) first tap from menu page works (scroll + 2s pulse). Second tap on same banner from same page → **nothing happens**.

---

## 2. Classification

**BUG** — scope gap from CR-2026-11-26-001 V2.
CR-2026-11-26-001 V2 planning doc stated "Q3 = re-fire on every URL change", but tapping the same banner twice while already on that URL is NOT a URL change — the guard was never designed to reset for same-URL repeat taps.

**NOT a duplicate** — distinct from:
- BUG-2026-11-26-001 (APS price display — different component)
- CR-2026-11-26-001 (the banner feature itself, now QA_PASS)
- BUG-2026-11-27-001 (ReviewOrder Update button — different component)

---

## 3. Evidence

### Observed behaviour
- URL: `/69/menu?item=248247` (already on this page)
- First tap on "start the fight" banner → item scrolls into view, 2s orange pulse fires ✓
- Second tap on same banner → no scroll, no pulse, nothing ✗

### Root cause (confirmed in Investigation — this session)

**Two compounding problems:**

**Problem A — Same URL, no React effect re-trigger:**
`PromoBanner.jsx` calls `navigate('/69/menu?item=248247')`. When already on that URL, `useSearchParams()` returns the same `targetItem = "248247"` → effect dependencies unchanged → effect **does not re-run**.

**Problem B — `deepLinkAppliedKey` never resets after first tap:**
```javascript
// MenuItems.jsx line 208
deepLinkAppliedKey.current = key;  // set on first tap, NEVER cleared
```
After the 2s pulse completes, `deepLinkAppliedKey.current = "|248247|"` persists. Even if the effect somehow re-ran, `if (deepLinkAppliedKey.current === key) return` would block it immediately.

---

## 4. Files affected

| File | Why |
|------|-----|
| `frontend/src/pages/MenuItems.jsx` | `deepLinkAppliedKey.current` never reset after pulse; needs reset at end of 2s timer (line 216-219) + `useLocation` for same-URL detection |
| `frontend/src/components/PromoBanner/PromoBanner.jsx` | `navigate(link)` → needs `navigate(link, { state: { tapKey: Date.now() } })` to force a new location object on each tap |

---

## 5. Severity & risk

| Field | Value | Reason |
|-------|-------|--------|
| Severity | P2 | Feature does not fully work as designed; workaround = scroll manually to item |
| Risk | LOW | Display-only logic; no payment/auth/data/cart change |
| Blast radius | SMALL | 2 files, 3 lines max; item first-tap and category deep-link unaffected |

---

## 6. What must NOT change

- First tap behaviour (scroll + pulse) — must remain exactly as-is
- Category banner navigation — `deepLinkAppliedKey` for category path should also be considered
- Cart, payment, order placement logic — untouched

---

## 7. Proposed fix (for Planning/Implementation roles)

**E-1 — `MenuItems.jsx` lines 216-219:** Reset `deepLinkAppliedKey.current = ''` when pulse ends:
```javascript
highlightTimerRef.current = setTimeout(() => {
  setHighlightedItemId(null);
  highlightTimerRef.current = null;
  deepLinkAppliedKey.current = '';  // ← allow next tap to re-fire
}, 2000);
```

**E-2 — `PromoBanner.jsx` lines 53 + 79:** Force a new location state on each tap:
```javascript
navigate(items[activeIndex].link, { state: { tapKey: Date.now() } });
// and:
navigate(promo.link, { state: { tapKey: Date.now() } });
```

**E-3 — `MenuItems.jsx`:** Add `location` from `useLocation()` and include `location.key` in the deep-link effect key so the effect re-runs on every navigation even to the same URL:
```javascript
const location = useLocation();
// in effect:
const key = `${location.key}|${effectiveStationId || ''}|${targetSection || ''}|${targetItem || ''}`;
```

**Risk after fix:** LOW. The `deepLinkAppliedKey` reset still prevents double-firing within the same render cycle.

---

## 8. Next step

Owner approval → Implementation (Role 3) directly (root cause unambiguous, low risk, 3 files, ~5 lines).
