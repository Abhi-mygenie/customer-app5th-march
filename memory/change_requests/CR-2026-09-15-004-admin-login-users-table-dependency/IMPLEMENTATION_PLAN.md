# IMPLEMENTATION PLAN — CR-2026-09-15-004
## Admin login → POS direct (two-step) · remove last db.users reads

**Written by:** Role 2 — Planning Agent
**Date:** 2026-10-09
**Integration expert called:** confirmed PyJWT + httpx already installed; no new packages
**Risk:** CRITICAL
**Files changing:** `backend/server.py` (T1–T6) · `frontend/src/context/AuthContext.jsx` (T7)
**Files NOT touched:** `Login.jsx` · `CartContext.js` · `ReviewOrder.jsx` · `.env`

---

## Decisions locked

| D | Decision |
|---|---|
| D1 | `mygenie_token` from `restaurants[0].crm_token` → stored in JWT claims → T6 fallback preserved |
| D2 | Two-step POS flow (login + profile). POS improvement filed to add restaurant_id to login later. |
| D3 | `len(restaurants) > 1` → log warning, take `[0]`. One-liner. |
| D4 | Old-format JWTs → 401 "Session expired. Please log in again." Forced re-login. **Accepted.** |

---

## Pre-flight checks (Role 3 must run before first edit)

```bash
# 1. Confirm db.users reads
grep -n "db\.users" /app/backend/server.py
# Expected: lines 299 and 376

# 2. Confirm anchors
grep -n "create_token\|USERS_AUTH_PROJECTION\|verify_password\|unified_login" /app/backend/server.py | head -8
# Expected: 260, 282, 313, 370

# 3. Confirm AuthContext.login anchor
grep -n "const login = async" /app/frontend/src/context/AuthContext.jsx
# Expected: line 132

# 4. POS probe still works
curl -s -X POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@kunafamahal.com","password":"Qplazm@10"}' | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if d.get('token') else 'FAIL')"
# Expected: ok
```

---

## Edits — 7 exact edits, apply bottom-up within server.py then AuthContext.jsx

---

### T1 · `server.py:260–266` — expand `create_token` to accept extra claims

**Before:**
```python
def create_token(user_id: str, user_type: str) -> str:
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + (24 * 60 * 60)  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
```

**After:**
```python
def create_token(user_id: str, user_type: str, **extra_claims) -> str:
    # CR-2026-09-15-004: extra_claims carries restaurant_id, restaurant_name, email,
    # pos_id, mygenie_token so get_current_user needs no db.users read.
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + (24 * 60 * 60),  # 24 hours
        **extra_claims
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
```

---

### T3 · `server.py:277–286` — delete `USERS_AUTH_PROJECTION` and `USERS_LOGIN_PROJECTION`

**Before:**
```python
# CR-2026-10-03-002: `users` is CRM-owned and its documents carry CRM's own integration
# secrets (`api_key`, `authkey_api_key`). Project to the fields we actually consume so
# they never enter our process memory or the /api/auth/me response.
# `mygenie_token` IS consumed (see get_table_config legacy fallback) so it stays —
# removing it is a behaviour change, tracked separately.
USERS_AUTH_PROJECTION = {
    "_id": 0, "id": 1, "email": 1, "phone": 1, "restaurant_id": 1,
    "pos_id": 1, "restaurant_name": 1, "pos_name": 1, "mygenie_token": 1,
}
USERS_LOGIN_PROJECTION = {**USERS_AUTH_PROJECTION, "password_hash": 1}
```

**After:**
```python
# CR-2026-09-15-004: USERS_AUTH_PROJECTION and USERS_LOGIN_PROJECTION deleted —
# db.users is no longer read. User data comes from POS profile → JWT claims.
```

---

### T2 · `server.py:289–305` — replace `get_current_user` with JWT-only path

**Before:**
```python
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    user_id = payload.get("user_id")
    user_type = payload.get("user_type")
    
    user = await db.users.find_one({"id": user_id}, USERS_AUTH_PROJECTION)  # CR-2026-10-03-002
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    user["user_type"] = user_type
    return user
```

**After:**
```python
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    # CR-2026-09-15-004: all user data from JWT claims — no db.users read.
    # Old-format JWTs (pre-deploy, lacking restaurant_id) return 401 → forced re-login (D4).
    user_type = payload.get("user_type")
    restaurant_id = payload.get("restaurant_id")
    if not restaurant_id:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return {
        "id": payload.get("user_id"),
        "user_type": user_type,
        "restaurant_id": restaurant_id,
        "restaurant_name": payload.get("restaurant_name", ""),
        "email": payload.get("email", ""),
        "pos_id": payload.get("pos_id", "0001"),
        "mygenie_token": payload.get("mygenie_token"),
    }
```

---

### T4 · `server.py:313–316` — delete `verify_password`

**Before:**
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Simple password verification"""
    import bcrypt
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
```

**After:**
```python
# CR-2026-09-15-004: verify_password deleted — POS verifies credentials directly.
```

---

### T5 · `server.py:370–420` — replace `unified_login` admin branch

**Before:**
```python
@auth_router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # CR-2026-09-12-004: rate-limit
async def unified_login(request: Request, body: LoginRequest):
    """Restaurant admin login (password)."""
    identifier = body.phone_or_email.strip().lower()
    # Step 1: Check users collection (restaurant admins)
    user = await db.users.find_one({
        "$or": [
            {"email": identifier},
            {"phone": identifier}
        ]
    }, USERS_LOGIN_PROJECTION)  # CR-2026-10-03-002
    
    if user:
        # Restaurant user found - verify password
        if not body.password:
            raise HTTPException(status_code=400, detail="Password required for restaurant login")
        
        password_hash = user.get("password_hash")
        if not password_hash:
            raise HTTPException(status_code=401, detail="Password not set for this account")
        
        if not verify_password(body.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        # Refresh POS token on every login
        # This ensures pos_token is always fresh for POS API calls (QR, etc.)
        user_email = user.get("email", identifier)
        pos_token = await refresh_pos_token(user_email, body.password)
        if not pos_token:
            logging.warning(f"[Auth] Could not get POS token for {user_email}")
        
        token = create_token(user["id"], "restaurant")
        return LoginResponse(
            success=True,
            user_type="restaurant",
            token=token,
            pos_token=pos_token,  # Return POS token to frontend for localStorage
            user={
                "id": user["id"],
                "restaurant_id": user.get("restaurant_id", ""),
                "email": user.get("email", ""),
                "restaurant_name": user.get("restaurant_name", ""),
                "phone": user.get("phone", ""),
                "pos_id": user.get("pos_id", ""),
                "pos_name": user.get("pos_name", "")
            }
        )
    
    # Step 2: Not found
    raise HTTPException(status_code=404, detail="Account not found. Please contact restaurant.")
```

**After:**
```python
@auth_router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # CR-2026-09-12-004: rate-limit
async def unified_login(request: Request, body: LoginRequest):
    """Restaurant admin login — CR-2026-09-15-004: POS direct (two-step). No db.users read."""
    identifier = body.phone_or_email.strip()
    if not body.password:
        raise HTTPException(status_code=400, detail="Password required")

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            # Step 1: POS vendoremployee login
            login_resp = await http_client.post(
                f"{MYGENIE_API_URL}/auth/vendoremployee/login",
                json={"email": identifier, "password": body.password},
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        if login_resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not login_resp.is_success:
            logging.warning(f"[Auth] POS vendoremployee/login returned {login_resp.status_code}")
            raise HTTPException(status_code=502, detail="Authentication service unavailable. Please try again.")

        login_data = login_resp.json()
        pos_token = login_data.get("token")
        crm_token_from_login = login_data.get("crm_token")
        if not pos_token:
            raise HTTPException(status_code=502, detail="Authentication service error. Please try again.")

        async with httpx.AsyncClient(timeout=15.0) as http_client:
            # Step 2: POS profile — get restaurant_id and other JWT claims
            # (POS improvement pending: add restaurant_id to login response to skip this call)
            profile_resp = await http_client.get(
                f"{MYGENIE_API_URL}/vendoremployee/profile",
                headers={"Authorization": f"Bearer {pos_token}", "Accept": "application/json"},
            )
        if not profile_resp.is_success:
            logging.warning(f"[Auth] POS vendoremployee/profile returned {profile_resp.status_code}")
            raise HTTPException(status_code=502, detail="Authentication service error. Please try again.")

        profile = profile_resp.json()
        restaurants = profile.get("restaurants", [])
        if not restaurants:
            raise HTTPException(status_code=403, detail="No restaurant associated with this account.")
        if len(restaurants) > 1:
            # CR-2026-10-03-006: franchise multi-outlet — not supported yet
            logging.warning(f"[Auth] {identifier} has {len(restaurants)} restaurants — using restaurants[0], see CR-2026-10-03-006")

        restaurant = restaurants[0]
        restaurant_id = str(restaurant.get("id", ""))
        restaurant_name = restaurant.get("name", "")
        mygenie_token = restaurant.get("crm_token") or crm_token_from_login  # D1: preserves T6 fallback
        emp_id = str(profile.get("emp_id", ""))
        emp_email = profile.get("emp_email", identifier)

        token = create_token(
            emp_id, "restaurant",
            restaurant_id=restaurant_id,
            restaurant_name=restaurant_name,
            email=emp_email,
            pos_id="0001",  # CR-2026-10-03-006: constant until multi-outlet ships
            mygenie_token=mygenie_token,
        )
        return LoginResponse(
            success=True,
            user_type="restaurant",
            token=token,
            pos_token=pos_token,
            user={
                "id": emp_id,
                "restaurant_id": restaurant_id,
                "email": emp_email,
                "restaurant_name": restaurant_name,
                "phone": profile.get("phone", ""),
                "pos_id": "0001",
                "pos_name": "",
            }
        )
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=502, detail="Authentication service timed out. Please try again.")
    except Exception as e:
        logging.error(f"[Auth] POS login error: {e}")
        raise HTTPException(status_code=502, detail="Authentication service unavailable. Please try again.")
```

---

### T6 · `server.py:498` — update `get_table_config` fallback comment

**Before:**
```python
    # Use token from header (preferred) or fallback to db.users (legacy)
    mygenie_token = x_pos_token or user.get("mygenie_token")
```

**After:**
```python
    # CR-2026-09-15-004: use token from header (preferred) or fallback to JWT claim (from POS profile)
    mygenie_token = x_pos_token or user.get("mygenie_token")
```

---

### T7 · `AuthContext.jsx:131–175` — delete dead `login()` function

**Before:**
```javascript
  // Admin login (used by Login.jsx — our backend, admin only)
  const login = async (phoneOrEmail, otpOrPassword, isOTP = true, restaurantContext = null) => {
    const body = { phone_or_email: phoneOrEmail };

    if (isOTP) {
      body.otp = otpOrPassword;
    } else {
      body.password = otpOrPassword;
    }
    
    if (restaurantContext) {
      body.restaurant_id = restaurantContext.restaurant_id;
      body.pos_id = restaurantContext.pos_id || "0001";
    }

    const response = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, DEFAULT_WRITE_TIMEOUT_MS); // CR-2026-07-03-004 — 15 s write timeout

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      logger.error('auth', 'Non-JSON response:', text);
      throw new Error('Server is temporarily unavailable. Please try again.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    setUser(data.user);
    setUserType(data.user_type);
    setToken(data.token);
    localStorage.setItem('auth_token', data.token);
    
    if (data.restaurant_context) {
      localStorage.setItem('restaurant_context', JSON.stringify(data.restaurant_context));
    }
    
    return data;
  };
```

**After:**
```javascript
  // CR-2026-09-15-004: login() deleted — dead code (0 callers).
  // Admin login is handled by Login.jsx calling POST /api/auth/login directly.
  // Per CR-2026-10-03-001 D3 ruling.
```

---

## Edit summary

| ID | File | What | Risk |
|---|---|---|---|
| T1 | `server.py:260–266` | `create_token` accepts `**extra_claims` | LOW |
| T3 | `server.py:277–286` | Delete `USERS_AUTH_PROJECTION` + `USERS_LOGIN_PROJECTION` | LOW |
| T2 | `server.py:289–305` | `get_current_user` reads JWT claims only — **no db.users** | **CRITICAL** |
| T4 | `server.py:313–316` | Delete `verify_password` | LOW |
| T5 | `server.py:370–420` | Replace `unified_login` admin branch — two POS calls | **CRITICAL** |
| T6 | `server.py:498` | Update comment only | LOW |
| T7 | `AuthContext.jsx:131–175` | Delete dead `login()` function | LOW |

**Net: ~70 lines removed, ~60 lines added. 2 files.**

---

## Apply order (bottom-up within server.py)

1. `server.py` — T6 (~498) → T5 (~370) → T4 (~313) → T2 (~289) → T3 (~277) → T1 (~260)
2. `AuthContext.jsx` — T7

---

## Self-test checklist (Role 3 must complete before QA handover)

| ST | Test | How | Expected |
|---|---|---|---|
| ST1 | `db.users` reads gone | `grep -n "db\.users" backend/server.py` | **0 results** |
| ST2 | Backend starts | `sudo supervisorctl status backend` | RUNNING, no ValueError |
| ST3 | Admin login with correct creds | `curl POST /api/auth/login {email, password}` | 200, token + pos_token returned, user has restaurant_id |
| ST4 | Admin login with wrong password | Same with wrong password | 401 "Invalid email or password" |
| ST5 | Admin login with unknown email | Unknown email | 401 (POS returns 401, we map to 401) |
| ST6 | Admin dashboard loads | Browser → login → config page | Works, saves config for r689 |
| ST7 | Old JWT → 401 | Manually create old-format token (user_id only) | 401 "Session expired. Please log in again." |
| ST8 | `get_table_config` with header | Admin with pos_token in X-POS-Token header | Table config loads |
| ST9 | `yarn build` | `cd /app/frontend && yarn build` | Clean |
| ST10 | Backend smoke + contract | `pytest -m "smoke or contract" -n 0 backend/tests/ -q` | 60 passed 1 skipped |

---

## QA test cases

| T | Scenario | Expected |
|---|---|---|
| T1 | Admin login (owner@kunafamahal.com / Qplazm@10) | 200, `token` + `pos_token` returned, `user.restaurant_id = "689"` |
| T2 | Wrong password | 401 "Invalid email or password" |
| T3 | Unknown email | 401 |
| T4 | POS down (unreachable) | 502 "Authentication service unavailable" |
| T5 | `grep "db.users" server.py` | 0 results |
| T6 | Config save for r689 after new login | Saves correctly (restaurant_id from JWT claims) |
| T7 | `AuthContext.login()` gone | `grep "const login = async" AuthContext.jsx` → 0 results |
| T8 | Backend smoke 60/60 | All pass |

---

## Code markers

```python
# CR-2026-09-15-004: <brief reason>
```
```javascript
// CR-2026-09-15-004: <brief reason>
```

---

```
Planning complete: CR-2026-09-15-004
Stage: Impact Analysis (complete) + Implementation Plan (complete)
Code reality: FULL — 7 exact edits with before/after anchored to current file state
Risk: CRITICAL
Files WILL change: server.py (T1–T6) · AuthContext.jsx (T7)
Files WILL NOT touch: Login.jsx · CartContext.js · ReviewOrder.jsx · .env
Decisions: D1/D2/D3/D4 — all locked
POS improvement: restaurant_id should be in /auth/vendoremployee/login response
Status: AT GATE — awaiting "Gate 3 accepted for CR-2026-09-15-004"
```
