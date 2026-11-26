# IMPACT ANALYSIS — CR-2026-09-15-004
## Remove admin login dependency on CRM `db.users` — switch to POS direct (Option D)

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-09 (POS contract confirmed 2026-10-09 via curl)
**Based on:** INTAKE_DOC · server.py (lines 260–420, 490–515) · Login.jsx · AuthContext.jsx · existing `refresh_pos_token` function · POS curl probes (owner@kunafamahal.com / r689)
**Predecessor:** CR-2026-10-03-002 (projection on `db.users` reads — **SMOKE**) must be closed before this ships, or shipped together.

---

## ⚠️ MANDATORY BEFORE IMPLEMENTATION

Per control prompt §3: **ANY auth change requires `integration_playbook_expert_v2` before Role 3 writes any code.**
Call it with:
```
INTEGRATION: POS admin login — vendoremployee/login + vendoremployee/profile endpoints, httpx usage
```
Do not proceed to Gate 3 until the integration expert has confirmed and any package requirements are satisfied.

---

## POS contract — CONFIRMED 2026-10-09

### Step 1 · `POST /api/v1/auth/vendoremployee/login`

**Request:** `{ "email": "owner@kunafamahal.com", "password": "Qplazm@10" }`

**Response (key fields):**
```json
{
  "token": "f92oBkEW7uq...",          ← POS auth token (opaque string, not JWT — cannot decode)
  "crm_token": "dp_live_vRqifi..."    ← restaurant's CRM API key (= mygenie_token)
}
```

`restaurant_id` is **NOT** in the login response. This is why the profile call is required.

**Note filed for POS team:** POS should include `restaurant_id` in the `/auth/vendoremployee/login` response in a future release. This would eliminate the second call. Until then, we call the profile endpoint.

### Step 2 · `GET /api/v1/vendoremployee/profile`

**Auth:** `Authorization: Bearer <token from step 1>`

**Response (fields we use):**
```json
{
  "emp_id": 3582,
  "emp_email": "owner@kunafamahal.com",
  "emp_f_name": "Owner",
  "restaurants": [
    {
      "id": 689,
      "name": "Kunafa Mahal",
      "crm_token": "dp_live_vRqifi..."   ← same as login crm_token — this is mygenie_token
    }
  ]
}
```

### Why the profile call is needed

The login response gives us `token` and `crm_token` but no `restaurant_id`. Our backend needs `restaurant_id` for every admin operation (config save, route guards, etc.). The only way to get it is the profile endpoint. The call happens once at login — not on every request. All subsequent requests read everything from our JWT claims.

---

## 1. What this CR does

Replaces the two `db.users` reads in the admin auth path with calls to the POS API directly:

| Function | Today | After |
|---|---|---|
| `unified_login` | `db.users.find_one` → bcrypt verify → `refresh_pos_token` | `refresh_pos_token`-style call to POS → extract profile from POS response → no DB read |
| `get_current_user` | Decode JWT → `db.users.find_one(user_id)` | Decode JWT → **extract user from JWT claims** (no DB read) |

After this CR: `grep "db.users" server.py` returns **0** (currently returns 2 — line 299 and line 376).

Also deletes the dead `AuthContext.login()` function (0 callers, scope-added 2026-10-09 per CR-2026-10-03-001 D3 ruling).

---

## 2. Current auth flow — confirmed from code

### Login (`server.py:370–420`)
```
POST /api/auth/login {phone_or_email, password}
  → db.users.find_one (email OR phone)       ← CRM table read #1 (to be replaced)
  → bcrypt.checkpw(password, password_hash)  ← local verify (to be deleted)
  → refresh_pos_token(email, password)        → POS /auth/vendoremployee/login
  → create_token(user["id"], "restaurant")
  → return {user_type, token, pos_token, user: {id, restaurant_id, email, ...}}
```

### Every admin request (`server.py:289–305`)
```
Authorization: Bearer <token>
  → verify_token(token) → {user_id, user_type}
  → db.users.find_one({"id": user_id})       ← CRM table read #2 (to be replaced)
  → return user dict (restaurant_id, pos_id, etc.)
```

### Frontend stores
`localStorage.auth_token` = our JWT · `localStorage.pos_token` = POS token (from `data.pos_token`)

---

## 3. Target flow (Option D — POS direct, two-step) — CONFIRMED 2026-10-09

### Login (after change)
```
POST /api/auth/login {phone_or_email, password}
  → Step 1: POST POS /auth/vendoremployee/login {email, password}
            ← {token: pos_token, crm_token: mygenie_token}
  → Step 2: GET  POS /vendoremployee/profile (Bearer pos_token)
            ← {emp_id, emp_email, restaurants[0].id, restaurants[0].name,
               restaurants[0].crm_token (= mygenie_token)}
  → log WARNING if len(restaurants) > 1  (franchise guard, CR-2026-10-03-006)
  → create_token_with_claims(
        user_id=str(emp_id),       user_type="restaurant",
        restaurant_id=str(restaurants[0].id),
        restaurant_name=restaurants[0].name,
        email=emp_email,
        mygenie_token=restaurants[0].crm_token  ← preserves T6 fallback
    )
  → return {user_type, token: our_jwt, pos_token, user: {id, restaurant_id, restaurant_name, email, pos_id}}
```

### Every admin request (after change)
```
Authorization: Bearer <our_jwt>
  → verify_token → {user_id, user_type, restaurant_id, restaurant_name, email, mygenie_token}
  → return user dict from JWT claims — NO db.users read
```

---

## 4. Touch points — exact

| # | File | Lines | Current | Change |
|---|---|---|---|---|
| T1 | `server.py:260–266` | `create_token` | Only `user_id` + `user_type` in JWT | Add claims: `restaurant_id`, `pos_id`, `restaurant_name`, `email` |
| T2 | `server.py:289–305` | `get_current_user` | `db.users.find_one` | Reconstruct user from JWT claims — no DB read |
| T3 | `server.py:277–286` | `USERS_AUTH_PROJECTION` + `USERS_LOGIN_PROJECTION` | Projections for CRM `users` reads | Delete both — no longer needed |
| T4 | `server.py:313–316` | `verify_password` | bcrypt check | Delete — POS verifies; we never see the password hash |
| T5 | `server.py:370–420` | `unified_login` | `db.users.find_one` + bcrypt | Replace with POS `/auth/vendoremployee/login` call; extract profile from response |
| T6 | `server.py:498–499` | `get_table_config` legacy fallback | `user.get("mygenie_token")` (from db.users) | See §5 below |
| T7 | `frontend/src/context/AuthContext.jsx` | `login()` function (dead, 0 callers) | Dead code | Delete function (per CR-2026-10-03-001 D3 ruling) |

---

## 5. `mygenie_token` dependency — get_table_config (T6)

`get_table_config` uses `X-POS-Token` header (preferred) or falls back to `user.get("mygenie_token")` from `db.users`.

After this CR, `user` is built from JWT claims — `mygenie_token` is NOT in the claims and would be `None`. The fallback path (`user.get("mygenie_token")`) silently breaks.

**The fallback only fires when no `X-POS-Token` header is sent.** After this CR, all new logins return `pos_token` from the POS direct call — it is stored in `localStorage.pos_token` and sent as `X-POS-Token` on every table-config call. So the preferred path continues to work.

**Recommended action:** In this CR, remove the fallback line (`user.get("mygenie_token")`) and make `X-POS-Token` header mandatory. Any admin with a session started before this CR ships will see "No POS token provided — please logout and login again." They login once and get the new token. This is acceptable for a planned deployment.

**Alternative:** Defer T6 to CR-2026-10-04-001. The fallback silently returns `None` (no crash, the 400 error message is clear). Either approach is safe.

---

## 6. What POS returns from `/auth/vendoremployee/login` — P5 blocker

The existing `refresh_pos_token` (line 322-364) calls `POST /api/v1/auth/vendoremployee/login` with `{email, password}` and extracts only `data.get("token")`.

**For the new flow, we need from POS:**
- `token` (the POS JWT) ← already extracted
- `restaurant_id` (short form, e.g. `"689"`) ← UNKNOWN from this endpoint
- admin employee identifier / `user_id` ← UNKNOWN
- `restaurant_name` ← UNKNOWN
- `pos_id` (usually `"0001"`) ← constant, safe to hardcode

If POS does NOT return profile data in the vendoremployee login response, a second call to a POS profile endpoint (P5) is needed.

**This is the one thing that must be confirmed before the Implementation Plan.** Call `integration_playbook_expert_v2` to get the POS vendoremployee login contract. Role 3 cannot write T5 without it.

---

## 7. Owner decisions — **ALL RESOLVED 2026-10-09**

### D1 — `get_table_config` mygenie_token fallback (T6) → **keep it, no code change**

`mygenie_token` is now sourced from `restaurants[0].crm_token` in the POS profile response and stored in our JWT claims. The fallback `user.get("mygenie_token")` in `get_table_config` continues to work because we populate that field in the JWT. No code change to `get_table_config` needed. CR-2026-10-04-001 deferred.

### D2 — POS contract (P5 blocker) → **RESOLVED via curl**

Two-step flow confirmed:
1. `POST /auth/vendoremployee/login` → `pos_token` + `crm_token`
2. `GET /vendoremployee/profile` → `emp_id`, `restaurant_id` (`restaurants[0].id`), `restaurant_name`, `mygenie_token` (`restaurants[0].crm_token`)

**Decision: use the profile call for now.** Owner instruction 2026-10-09: "use profile API but note that POS should provide restaurant_id in the login response." Filed as POS improvement request (see above).

### D3 — franchise guard → **one-liner warning, confirmed**

`restaurants.length > 1` → log warning `"[Auth] restaurants[1..N] ignored — franchise not supported, see CR-2026-10-03-006"`. Single restaurant path is `restaurants[0]`. Probe confirmed restaurant 689 has `restaurants` with 1 entry.

### D4 — old JWT backward compatibility → **forced re-login accepted**

Old-format JWTs (pre-deploy, contain only `user_id` + `user_type`) will fail `get_current_user` with 401 because the new code reads `restaurant_id` from JWT claims — which old tokens don't have. Admins need to log out and log back in once after deploy. **Owner confirmed 2026-10-09: this is acceptable.** No backward-compatibility shim. Clean cutover.

---

## 8. Files WILL change

| File | Changes |
|---|---|
| `backend/server.py` | T1 (create_token), T2 (get_current_user), T3 (delete projections), T4 (delete verify_password), T5 (unified_login — main change), T6 (get_table_config fallback, D1) |
| `frontend/src/context/AuthContext.jsx` | T7 — delete dead `login()` function |

## 9. Files WILL NOT touch

`Login.jsx` (sends same payload, receives same response shape — backward compatible) · `CartContext.js` · `ReviewOrder.jsx` · `server.py` routes other than auth · `.env`

---

## 10. Risk

| Area | Rating | Reason |
|---|---|---|
| Overall | **CRITICAL** | Auth + security + production data. Every admin request runs `get_current_user`. |
| `unified_login` replacement (T5) | **CRITICAL** | Admin cannot login if broken; production blocking |
| `get_current_user` (T2) | **CRITICAL** | Every admin API call depends on this |
| JWT claims expansion (T1) | HIGH | Existing admin sessions (old JWTs) will fail `get_current_user` — forced re-login at deploy |
| `AuthContext.login()` deletion (T7) | LOW | 0 callers confirmed by grep |

---

## 11. Verification matrix

| T | Scenario | Expected |
|---|---|---|
| T1 | `grep "db.users" server.py` | 0 results |
| T2 | Admin login (email + password) | JWT returned, `pos_token` returned, admin dashboard loads |
| T3 | Admin accesses any `/api/*` endpoint with old JWT | 401 (old JWT lacks new claims — forced re-login) |
| T4 | Admin logs in fresh → table-config | X-POS-Token in header → table-config works |
| T5 | `restaurants[]` has > 1 entry | Warning logged: "restaurants[1..N] ignored — franchise not supported, see CR-2026-10-03-006" |
| T6 | `yarn build` | Clean |
| T7 | Backend smoke + contract (60+) | All pass |

---

```
Planning complete: CR-2026-09-15-004
Stage: Impact Analysis — updated 2026-10-09 with confirmed POS contract + all decisions
Code reality: FULL — 7 touch points confirmed; POS contract confirmed via curl
Risk: CRITICAL
Files WILL change: server.py (T1–T6) · AuthContext.jsx (T7)
Files WILL NOT touch: Login.jsx · CartContext.js · ReviewOrder.jsx
Owner decisions:
  D1=keep T6 fallback (mygenie_token in JWT from restaurants[0].crm_token)
  D2=profile API now, POS to add rid to login later
  D3=franchise warning one-liner
  D4=forced re-login on deploy ACCEPTED (old JWTs lack new claims → 401 → re-login once)
  — ALL RESOLVED 2026-10-09
MANDATORY: integration_playbook_expert_v2 before Gate 3 / Role 3
POS improvement filed: POS should return restaurant_id in /auth/vendoremployee/login response
Status: AT GATE — call integration_playbook_expert_v2 → then Implementation Plan → Gate 3
```
