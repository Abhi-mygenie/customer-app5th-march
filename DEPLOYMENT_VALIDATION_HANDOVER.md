# Deployment Validation Handover

**Generated:** 2026-05-08 (handover for next deployment agent)
**Performed by:** E1 Agent — pull / install / compile / smoke-test only (no production deploy executed)
**Repo:** https://github.com/Abhi-mygenie/customer-app5th-march.git
**Branch:** `main` (strict — confirmed by user; no fallback to `master`)
**Workspace:** `/app` (scaffold replaced with repo contents; `.git`, `.emergent` preserved)

---

## 1. Latest Remote Commit (BEFORE any deploy action)

| Field | Value |
|---|---|
| Commit SHA | `b89587dc933776542e659b8fdb4d6a9d18106a63` |
| Branch | `main` |
| Author | emergent-agent-e1 \<github@emergent.sh\> |
| Author date (UTC) | **2026-05-07 10:16:21 +0000** |
| Commit date (UTC) | **2026-05-07 10:16:21 +0000** |
| Subject | `Auto-generated changes` |

> Verification command:
> `git ls-remote https://github.com/Abhi-mygenie/customer-app5th-march.git refs/heads/main`
> → returns `b89587dc933776542e659b8fdb4d6a9d18106a63	refs/heads/main`

---

## 2. Repository Layout (after pull)

```
/app/
├── backend/              # FastAPI service
│   ├── server.py         # 1614 lines, 47 routes, prefix = /api
│   ├── requirements.txt  # 124 pinned deps
│   ├── seed_defaults.py
│   ├── seed_demo_data.py
│   ├── db_export.py / db_import.py
│   ├── db_data/          # JSON seed snapshots (customers, orders, coupons, …)
│   ├── tests/            # 10 pytest files
│   └── uploads/          # Static asset dir (mounted at /api/uploads)
├── frontend/             # React 19 + CRACO + Tailwind
│   ├── package.json      # craco start | build | test
│   ├── craco.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── src/              # api/, components/, context/, hooks/, layouts/, pages/, utils/
│   └── public/
├── DEPLOYMENT_HANDOVER.md            # Pre-existing (from earlier run)
├── DEPLOYMENT_VALIDATION_HANDOVER.md # ← THIS DOCUMENT
└── memory/, test_reports/, tests/, README.md
```

---

## 3. Build / Compile Validation Results

### 3.1 Backend (FastAPI / Python 3.11)
| Check | Result |
|---|---|
| `pip install -r requirements.txt` | ✅ Success (124 pkgs reconciled, 0 conflicts) |
| Module import (`from server import app`) | ✅ Success — 47 routes registered |
| `supervisorctl status backend` | ✅ `RUNNING` |
| `GET http://localhost:8001/api/` | ✅ HTTP **200** → `{"message":"Customer App API"}` |
| MongoDB connectivity (remote) | ✅ Connected — server v7.0.30, 23 collections present |
| Backend error log | Clean (one transient `FileNotFoundError` from uvicorn watcher during rsync — self-recovered, current process healthy) |

### 3.2 Frontend (React 19 / CRACO 7 / Webpack 5)
| Check | Result |
|---|---|
| `yarn install` | ✅ Success in 55s (peer-dep warnings only — non-blocking) |
| Webpack compile | ✅ `webpack compiled with 1 warning` → `No issues found` |
| `supervisorctl status frontend` | ✅ `RUNNING` |
| `GET http://localhost:3000/` | ✅ HTTP **200** (7,395 bytes; SPA shell renders skeleton loader) |
| Production build (`yarn build`) | ⚠ Not executed in this run. Dev compile succeeded; recommend running before prod deploy. |
| ESLint warnings | Multiple `react-hooks/exhaustive-deps` warnings across pages (non-blocking, pre-existing) |

### 3.3 Lint warnings worth flagging (non-blocking)
- `src/pages/OrderSuccess.jsx:373,395` — missing deps `fetchOrderStatus`, `restaurant`
- `src/pages/Profile.jsx:51` — missing 6 deps
- `src/pages/ReviewOrder.jsx:277,326` — missing `customerName`, `customerPhone`
- TipTap peer-dep mismatch: extensions on `3.20.0`, runtime on `3.22.5` — currently working but worth a `yarn upgrade` of `@tiptap/*` for consistency

---

## 4. Environment Variables — Audit

### 4.1 Backend (`/app/backend/.env`) — ✅ Complete

| Key | Value (sanitised) | Required? | Source |
|---|---|---|---|
| `MONGO_URL` | `mongodb://mygenie_admin:****@52.66.232.149:27017/mygenie` | ✅ Required (server.py L23 — crashes if missing) | User-provided (de-duplicated `MONGO_URL=MONGO_URL=` prefix per user confirmation) |
| `DB_NAME` | `mygenie` | ✅ Required (L25) | User |
| `JWT_SECRET` | `dev-jwt-secret-replace-in-prod-9f3b2a8e1c4d` | ✅ Required (L28-30 — explicit `raise ValueError` if absent) | **PLACEHOLDER set by E1** — user said "any random key" |
| `MYGENIE_API_URL` | `https://preprod.mygenie.online/api/v1` | ✅ Required (L38-40 — fail-fast) | User |
| `CORS_ORIGINS` | `*` | Optional (defaults to `*` at L1599) | User |

> ⚠ **Action for prod deploy**: replace `JWT_SECRET` with a strong, randomly-generated 64-char value (e.g. `python -c "import secrets;print(secrets.token_urlsafe(64))"`).

### 4.2 Frontend (`/app/frontend/.env`) — ⚠ Incomplete

Frontend code references **11 env keys** in `src/`. Comparison vs. supplied .env:

| Key | Supplied? | Files referencing it | Severity if missing |
|---|---|---|---|
| `REACT_APP_API_BASE_URL` | ✅ `https://preprod.mygenie.online/api/v1` | `api/config/axios.js`, `api/config/endpoints.js`, `api/services/orderService.ts` | Critical — axios will log "CRITICAL: REACT_APP_API_BASE_URL is not set" |
| `REACT_APP_IMAGE_BASE_URL` | ✅ `https://manage.mygenie.online` | image rendering | Medium |
| `REACT_APP_CRM_URL` | ✅ `https://crm.mygenie.online/api` | `crmService.js` | High (if CRM features used) |
| `REACT_APP_CRM_API_VERSION` | ✅ `v2` | `crmService.js` | Has `v1` fallback |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | ✅ supplied | maps integration | High (maps fail) |
| `REACT_APP_LOGIN_PHONE` | ✅ `+919579504871` | dev login autofill | Low (dev convenience) |
| `REACT_APP_LOGIN_PASSWORD` | ✅ `Qplazm@10` | dev login autofill | Low (dev convenience) |
| `WDS_SOCKET_PORT` | ✅ `443` | webpack-dev-server | Dev only |
| `ENABLE_HEALTH_CHECK` | ✅ `false` | plugins/health-check | Dev only |
| **`REACT_APP_BACKEND_URL`** | ❌ **MISSING** | **14 files** — `AuthContext.jsx`, `Login.jsx`, `AdminSettings.jsx`, `LandingPage.jsx`, `ReviewOrder.jsx`, `FeedbackPage.jsx`, `useMenuData.js`, `AdminConfigContext.jsx`, `RestaurantConfigContext.jsx`, `AdminQRPage.jsx`, `dietaryTagsService.js`, `ContentTab.jsx`, … | 🔴 **BLOCKER for prod** — login, loyalty-settings lookup, customer-lookup, admin QR/settings, dietary-tags, restaurant-config all silently fail (most fall back to `''` → calls hit relative paths that don't exist on the React static host) |
| **`REACT_APP_CRM_API_KEY`** | ❌ **MISSING** | `api/services/crmService.js` | 🔴 **BLOCKER if CRM features used** — no fallback, expected JSON of form `{"<restaurantId>": "<apiKey>", ...}` |
| **`REACT_APP_RESTAURANT_ID`** | ❌ Missing (has fallback) | `useMenuData.js`, `useRestaurantId.js`, `utils/constants.js` (commented default `478`) | Medium — only matters if app is launched without an explicit restaurant context in URL |

> 🔴 **Action for the next deployment agent — MUST resolve before deploying:**
> 1. Decide what `REACT_APP_BACKEND_URL` should point to in prod. Two options:
>    - **(A)** The deployed FastAPI service in this repo (e.g. `https://customer-app-backend.mygenie.online`) — preferred, since `/app/backend/server.py` IS the auxiliary backend (loyalty, customer-lookup, dietary tags, QR admin, content tab, etc.).
>    - **(B)** Point at preprod main API — only if this repo's backend is not being deployed.
> 2. Obtain the CRM API key JSON from the MyGenie team and set `REACT_APP_CRM_API_KEY`.
> 3. Confirm with product whether a default `REACT_APP_RESTAURANT_ID` is needed for the prod build.

### 4.3 Note on architecture
This repo runs **two backends in tandem**:
- `REACT_APP_API_BASE_URL` → external MyGenie POS API (`preprod.mygenie.online/api/v1`)
- `REACT_APP_BACKEND_URL` → the FastAPI in `/app/backend/server.py` (loyalty, dietary tags, customer app config, uploads, admin settings, CRM bridge, OTP). This is what needs to be deployed alongside the frontend.

---

## 5. Service Status (current preview pod)

```
backend                          RUNNING   pid 587
frontend                         RUNNING   pid 608+
mongodb                          RUNNING   pid 222
code-server                      RUNNING
nginx-code-proxy                 RUNNING
```

Smoke-test endpoints reachable:
- ✅ `GET http://localhost:8001/api/` → `{"message":"Customer App API"}`
- ✅ `GET http://localhost:3000/` → SPA shell HTML (200, 7.4 KB)

---

## 6. What was NOT done (intentionally — out of scope)

- ❌ Production `yarn build` — only dev compile validated. **Recommended next step**.
- ❌ End-to-end functional tests via testing agent (user scope was "deploy run and compile" only).
- ❌ Load / smoke against external preprod APIs — not exercised, only verified the URLs are configured.
- ❌ Actual deployment to Kubernetes / Vercel / production target — handed over to next agent.
- ❌ DB migration / seed run (`seed_defaults.py`, `seed_demo_data.py`) — DB already populated (23 collections found on remote MongoDB).

---

## 7. Checklist for the Next Deployment Agent

- [ ] Set `REACT_APP_BACKEND_URL` to the production URL of the FastAPI service in `/app/backend`
- [ ] Set `REACT_APP_CRM_API_KEY` (JSON map of restaurantId → apiKey)
- [ ] Optionally set `REACT_APP_RESTAURANT_ID` for default-restaurant builds
- [ ] Replace dev `JWT_SECRET` with a 64-char random secret in prod backend env
- [ ] Verify CORS — backend currently allows `*`; tighten to the deployed frontend origin for prod
- [ ] Run `cd frontend && yarn build` and confirm zero errors
- [ ] Confirm MongoDB at `52.66.232.149:27017` is reachable from the prod cluster (or swap to a managed Atlas URL)
- [ ] Confirm outbound network from prod cluster can reach `preprod.mygenie.online`, `crm.mygenie.online`, `manage.mygenie.online`
- [ ] Decide on platform target (Emergent native deploy / Vercel + separate Python host / Docker on EC2 / etc.)
- [ ] Backend listens on `0.0.0.0:8001`; frontend dev on `:3000`. For prod, build static assets and serve via CDN/Nginx; expose backend on its own ingress.
- [ ] Persist `/app/backend/uploads/` — currently 16 files, served at `/api/uploads/*`. Mount a volume or move to S3 (requirements include `boto3`).

---

## 8. TL;DR for human reviewer

✅ Code pulled (`main` @ `b89587d`, dated **2026-05-07 10:16:21 UTC**).
✅ Backend installed, imports cleanly, MongoDB reachable, `/api/` responds 200.
✅ Frontend installs, compiles, dev server returns 200.
🔴 **Three frontend env keys are missing in the supplied list — `REACT_APP_BACKEND_URL` (14 call-sites), `REACT_APP_CRM_API_KEY`, `REACT_APP_RESTAURANT_ID`.** Resolve before going live.
⚠ `JWT_SECRET` in backend was set to a placeholder — rotate before prod.
⚠ Production `yarn build` not yet executed — run as the first step of the actual deploy.
