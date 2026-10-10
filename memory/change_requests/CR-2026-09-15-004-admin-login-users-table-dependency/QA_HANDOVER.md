# QA HANDOVER — CR-2026-09-15-004

**Written by:** Role 3 — Implementation Agent
**Date:** 2026-10-10
**Status:** QA PASS — iteration_17.json (9/9 tests, 60/60 backend)

## What changed

| Edit | File | Change |
|---|---|---|
| T1 | `server.py:260` | `create_token(**extra_claims)` — carries restaurant_id, name, email, phone, pos_id, mygenie_token |
| T3 | `server.py:277` | Deleted `USERS_AUTH_PROJECTION` + `USERS_LOGIN_PROJECTION` |
| T2 | `server.py:289` | `get_current_user` reads JWT claims only — **no db.users read** |
| T4 | `server.py:313` | Deleted `verify_password` — POS verifies |
| T5 | `server.py:368` | `unified_login` replaced with two POS calls (login + profile) |
| T6 | `server.py:498` | Comment update only |
| T7 | `AuthContext.jsx` | Deleted dead `login()` function + stale reference removed from value object (fixed by testing agent) |

## Verified

- `grep "db.users" server.py` → 4 comment lines only, **0 active reads** ✅
- Admin login `owner@kunafamahal.com` → 200, `restaurant_id: 689`, `restaurant_name: Kunafa Mahal` ✅
- Wrong password → 401 ✅ · Unknown email → 401 ✅
- Old JWT (no `restaurant_id` claim) → 401 "Session expired" (D4) ✅
- Admin dashboard loads ✅ · 60/60 smoke+contract ✅

## Bug found + fixed during testing

`AuthContext.jsx` had `login` in the value object after the function was deleted → would cause `ReferenceError` at React render. Fixed by removing the stale reference.

## Smoke test cases

| T | Scenario | Expected |
|---|---|---|
| T1 | Login owner@kunafamahal.com | 200, restaurant_id=689, dashboard loads |
| T2 | Wrong password | 401 |
| T3 | Config save | Saves for restaurant 689 |
| T4 | `grep "db.users" server.py` | 0 active code lines |
