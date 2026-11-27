# IMPLEMENTATION REPORT — BUG-2026-11-27-002
## Item banner repeat tap — fix delivered in commit 0463499

**ID:** BUG-2026-11-27-002  
**Type:** BUG  
**Commit:** `0463499a92d20c264624da1d84984a9b86cba802`  
**Date:** 2026-11-27  
**Status:** IMPLEMENTED (registry was incorrectly showing INTAKE — corrected this session)  
**Risk:** LOW / P2  
**QA result:** iteration_42.json — 7/7 PASS  

---

## 1. Problem (verbatim from intake)

> "First tap on item banner works, second tap from same page does nothing"

---

## 2. Root causes (confirmed by investigation)

**Problem A:** `navigate()` to same URL does not re-trigger `useSearchParams` → effect deps unchanged → effect does not re-run.

**Problem B:** `deepLinkAppliedKey.current` is set on first tap, never reset after the 2-second pulse timer → guard blocks all subsequent same-URL taps.

---

## 3. Fix — 3 edits, 2 files

### E-1: `MenuItems.jsx` — reset deepLinkAppliedKey after pulse + use location.key

```js
// Added useLocation import
import { useLocation } from 'react-router-dom';
const location = useLocation();

// Deep-link effect key now includes location.key (unique per navigate call)
// deepLinkAppliedKey.current reset to '' at end of 2s pulse timer
```

### E-2: `PromoBanner.jsx` — navigate with tapKey in state

```js
navigate(url, { state: { tapKey: Date.now() } });
// Each tap gets a unique location.key → guard passes on repeat taps
```

---

## 4. Test result

**iteration_42.json — 7/7 PASS (100% backend + frontend)**

Confirmed: repeat tap on same banner now correctly navigates to the target item/category each time.

---

## 5. Registry note

This item was registered as INTAKE in `index.yml` but was fully implemented and QA-verified in commit `0463499`. Registry corrected to IMPLEMENTED during session handover on 2026-11-27 (second session).
