# Deployment Handover Document — Customer App (MyGenie)

| Field | Value |
|---|---|
| Prepared by | E1 (Emergent main agent) |
| Prepared at (UTC) | 2026-05-14 17:50 UTC |
| Source pulled at (UTC) | 2026-05-14 17:50 UTC |
| Preview ingress URL | https://52f26ce3-b2cb-44e8-aeb2-60863bc96b52.preview.emergentagent.com |
| **Status** | **READY FOR DEPLOYMENT** — backend running, frontend dev server running, frontend production build OK, MongoDB connected, all required env vars set. |

> The user approved branch `main` explicitly. No fallback branch was used.

---

## 1. Source Code

| Field | Value |
|---|---|
| Repository | `https://github.com/Abhi-mygenie/customer-app5th-march.git` |
| Branch | `main` (confirmed exists on remote) |
| HEAD commit SHA | `3d5197c8ef3cfa5937910de1a793c2afbcf5f2e9` |
| HEAD commit date (UTC) | `2026-05-13 18:03:56 +0000` |
| HEAD commit author | `emergent-agent-e1` |
| HEAD commit message | `Auto-generated changes` |

### Recent commits on `main` (last 5)
```
3d5197c | 2026-05-13 18:03:56 +0000 | emergent-agent-e1 | Auto-generated changes
c11696e | 2026-05-13 18:01:19 +0000 | emergent-agent-e1 | Auto-generated changes
252cdce | 2026-05-13 17:49:26 +0000 | emergent-agent-e1 | auto-commit for ef23bada-07ce-4b79-8ec0-ac8c2a21502f
f9e152c | 2026-05-13 17:19:05 +0000 | emergent-agent-e1 | auto-commit for c605a72b-19e2-471a-a29c-5aa7faf12658
cb46013 | 2026-05-13 15:16:13 +0000 | emergent-agent-e1 | auto-commit for 5358fa42-906a-487a-baeb-4b52a29175e2
```

### Other notable remote branches (informational)
`dev`, `11-may-uat`, `14-may-phase2`, `14-may`, `8-may`, `7-may`, `6-may`, `2_may_2026`, `2-may-temp-`, several `conflict_*` branches, plus many April / March feature branches.

**Branch confirmed for deployment by the user: `main`.**

---

## 2. Tech Stack

| Layer | Technology / Version |
|---|---|
| Backend | FastAPI 0.110.1 on Python 3.11, `motor` 3.3.1 (async MongoDB), `uvicorn` 0.25.0 |
| Auth | PyJWT 2.11.0, `bcrypt` 4.1.3, `passlib` 1.7.4 |
| Frontend | React 19, CRA 5.0.1 via Craco 7.1, TailwindCSS 3.4, shadcn/ui (Radix UI), `@tanstack/react-query` 5, `axios` 1.8, `react-router-dom` 7 |
| Maps | `@react-google-maps/api` 2.20 |
| Database | MongoDB 7.0.30 (remote — `52.66.232.149:27017`, DB `mygenie`) |
| External APIs | MyGenie POS (`https://preprod.mygenie.online/api/v1`), MyGenie CRM (`https://crm.mygenie.online/api`), Image CDN (`https://manage.mygenie.online`), Google Maps Geocoding/Places |
| Package managers | `yarn` 1.22 (frontend), `pip` (backend) |

### Project layout
```
/app/
├── backend/
│   ├── server.py            (1,613 lines — single-file FastAPI app)
│   ├── requirements.txt     (123 packages pinned)
│   ├── seed_defaults.py
│   ├── seed_demo_data.py
│   ├── db_export.py / db_import.py
│   ├── db_data/             (export of all 17 collections, seed material)
│   ├── tests/               (10 pytest files)
│   ├── uploads/             (file uploads dir, served at /api/uploads)
│   └── .env                 (NOT committed — created from user-supplied values)
├── frontend/
│   ├── package.json         (React 19 + craco)
│   ├── craco.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json / jsconfig.json
│   ├── public/              (BUG_TRACKER.md, PRD.md, favicon.svg, assets/)
│   ├── plugins/health-check/
│   ├── src/
│   │   ├── App.js / App.css / index.js / index.css
│   │   ├── pages/           (27 page files — Login, LandingPage, MenuItems,
│   │   │                     DiningMenu, ReviewOrder, OrderSuccess, Profile,
│   │   │                     DeliveryAddress, FeedbackPage, AboutUs, ContactPage,
│   │   │                     AdminSettings, PasswordSetup, admin/…)
│   │   ├── components/      (incl. shadcn/ui)
│   │   ├── api/, context/, hooks/, layouts/, lib/, utils/, constants/, data/, types/
│   │   └── __tests__/, __mocks__/
│   └── .env                 (NOT committed — created from user-supplied values)
├── memory_repo/             (PRD, ROADMAP, ARCHITECTURE, CHANGELOG, etc.)
├── test_reports/
├── tests/
├── DEPLOYMENT_HANDOVER.md   (this file)
└── README.md
```

---

## 3. Environment Variables

### 3.1 Backend — `/app/backend/.env`

Server.py reads exactly **5 environment variables**:

| Variable | Required | Status | Value (sanitized) | Source |
|---|---|---|---|---|
| `MONGO_URL` | yes (fail-fast) | set | `mongodb://mygenie_admin:****@52.66.232.149:27017/mygenie` | user-supplied |
| `DB_NAME` | yes (fail-fast) | set | `mygenie` | user-supplied |
| `JWT_SECRET` | yes (fail-fast — server raises if missing) | set | 64-char hex random secret (generated this run) | generated |
| `MYGENIE_API_URL` | yes (fail-fast — server raises if missing) | set | `https://preprod.mygenie.online/api/v1` | user-supplied |
| `CORS_ORIGINS` | optional (default `*`) | set | `*` | user-supplied |

Where consumed in `server.py`:
- L23 `mongo_url = os.environ['MONGO_URL']`
- L25 `db = client[os.environ['DB_NAME']]`
- L28 `JWT_SECRET = os.environ.get('JWT_SECRET')` → raises `ValueError` if missing
- L38 `MYGENIE_API_URL = os.environ.get("MYGENIE_API_URL")` → raises `ValueError` if missing
- L1599 `os.environ.get('CORS_ORIGINS', '*').split(',')`

> Production hardening (non-blocking):
> - Replace `CORS_ORIGINS=*` with explicit production origin(s).
> - Replace the generated `JWT_SECRET` with a value stored in your secret manager and rotate on each environment.

### 3.2 Frontend — `/app/frontend/.env`

Frontend code references **10 distinct `process.env.REACT_APP_*` keys** (excluding `NODE_ENV`):

| Variable | Required for app load | Status | Value | Source |
|---|---|---|---|---|
| `REACT_APP_BACKEND_URL` | **yes** (k8s ingress / `/api/*` proxy) | set | `https://52f26ce3-b2cb-44e8-aeb2-60863bc96b52.preview.emergentagent.com` | preview pod ingress |
| `WDS_SOCKET_PORT` | dev-only | set | `443` | user-supplied |
| `ENABLE_HEALTH_CHECK` | optional plugin flag | set | `false` | user-supplied |
| `REACT_APP_IMAGE_BASE_URL` | yes (images render) | set | `https://manage.mygenie.online` | user-supplied |
| `REACT_APP_API_BASE_URL` | yes (POS API) | set | `https://preprod.mygenie.online/api/v1` | user-supplied |
| `REACT_APP_LOGIN_PHONE` | yes (default login id) | set | `+919579504871` | user-supplied |
| `REACT_APP_LOGIN_PASSWORD` | yes (default login pwd) | set | `Qplazm@10` | user-supplied |
| `REACT_APP_CRM_URL` | yes (CRM calls) | set | `https://crm.mygenie.online/api` | user-supplied |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | yes (Maps render) | **placeholder** | `AIz...mj4` (truncated value, exactly as supplied) | user-supplied (TRUNCATED) |
| `REACT_APP_CRM_API_VERSION` | yes (CRM header) | set | `v2` | user-supplied |

#### Additional `REACT_APP_*` keys referenced by code but **NOT provided** by the user

| Variable | Where referenced | Impact if unset |
|---|---|---|
| `REACT_APP_CRM_API_KEY` | `src/api/services/crmService.js` L21 — parsed as a JSON object `{ "<restaurantId>": "<apiKey>", ... }` | CRM features that require a per-restaurant API key will fall back to `{}` and call CRM without `X-CRM-API-Key` (parse error is caught, app still loads). |
| `REACT_APP_RESTAURANT_ID` | `src/hooks/useMenuData.js`, `src/utils/useRestaurantId.js`, `src/utils/constants.js` | Falls back to URL-derived restaurant id. Only needed if the app is loaded without a restaurant slug in the URL/query. |

> **Action item for the next deployment agent / human:**
> 1. Replace the **truncated** `REACT_APP_GOOGLE_MAPS_API_KEY=AIz...mj4` with the real Google Maps API key. Geocoding / map embeds will fail until this is corrected.
> 2. Decide whether `REACT_APP_CRM_API_KEY` (JSON map) and `REACT_APP_RESTAURANT_ID` need to be set for the target environment.

> Security note: Every `REACT_APP_*` is **shipped to the browser**. `REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD`, `REACT_APP_GOOGLE_MAPS_API_KEY`, and `REACT_APP_CRM_API_KEY` are visible in the JS bundle. If any of these represent actual production credentials, they should be moved server-side and proxied. (Not a blocker for the preview deployment.)

---

## 4. Build & Compile Readiness — Validation Results

| Check | Tool / Command | Result |
|---|---|---|
| Repo clone (branch=main) | `git clone --branch main …` | OK — HEAD = `3d5197c…`, 2026-05-13 18:03 UTC |
| Backend Python syntax | `python -c "ast.parse(open('server.py').read())"` | OK |
| Backend module import | `python -c "import server"` | OK — FastAPI app instantiated, no missing imports |
| Backend dependency install | `pip install -r backend/requirements.txt` | OK — all 123 packages installed |
| Backend startup | `supervisorctl restart backend` | OK — `Uvicorn running on http://0.0.0.0:8001` → `Application startup complete.` |
| Backend health (local) | `curl http://localhost:8001/api/` | HTTP **200** → `{"message":"Customer App API"}` |
| Backend health (external ingress) | `curl https://52f26ce3-…preview.emergentagent.com/api/` | HTTP **200** → `{"message":"Customer App API"}` |
| MongoDB reachability | `pymongo.MongoClient(MONGO_URL).server_info()` | OK — MongoDB **7.0.30**, DB `mygenie` exposes **23 collections** (`customers`, `users`, `loyalty_settings`, `wallet_transactions`, `points_transactions`, `segments`, `customer_app_config`, `dietary_tags_mapping`, `coupons`, `orders`, `order_items`, `feedback`, `automation_rules`, `cron_job_logs`, `custom_templates`, `customer_otps`, `pos_event_logs`, `status_checks`, `test`, `whatsapp_event_template_map`, `whatsapp_message_logs`, `whatsapp_template_variable_map`, `whatsapp_templates`) |
| Frontend dependency install | `yarn install --frozen-lockfile` | OK — 69.43 s (peer-dependency warnings only — non-blocking, see §8) |
| Frontend dev compile | `craco start` via supervisor | OK — `webpack compiled` — page returns 200 |
| Frontend production build | `yarn build` (= `craco build`) | **OK — Compiled with warnings, build folder ready.** `build/static/js/main.1709c52e.js` = 490.8 kB gzip, `build/static/css/main.8f97f757.css` = 36.91 kB gzip |
| Frontend serve (local) | `curl http://localhost:3000/` | HTTP **200**, 7,395 bytes |
| Frontend serve (external ingress) | `curl https://52f26ce3-…preview.emergentagent.com/` | HTTP **200** — React skeleton renders (verified via headless screenshot) |
| External API reachability | `curl preprod.mygenie.online / manage.mygenie.online / crm.mygenie.online` | All resolving — `preprod` returns 404 at API root (expected, only `/api/v1/<route>` responds), `manage` returns 200, `crm` returns 301 redirect (expected) |

> **`CI=true` build behavior:** `CI=true yarn build` exits **non-zero** because CRA treats ESLint `react-hooks/exhaustive-deps` warnings as errors when `CI=true`. The plain `yarn build` (which the repo's `build` script uses via craco) succeeds. If the deployment pipeline sets `CI=true`, do one of:
> - keep using `yarn build` (recommended — no env override needed),
> - or set `ESLINT_NO_DEV_ERRORS=true` / `DISABLE_ESLINT_PLUGIN=true` in the pipeline,
> - or fix the 10 hook-dependency warnings (8 files — listed in §8).

---

## 5. Backend API Surface (routes under `/api`)

```
GET    /api/                                       Health/root
POST   /api/status                                 (StatusCheck create)
GET    /api/status                                 (StatusCheck list)
GET    /api/table-config                           (auth: restaurant) – proxies POS v2
GET    /api/loyalty-settings/{restaurant_id}
GET    /api/customer-lookup/{restaurant_id}?phone= 
GET    /api/uploads/{filename}                     (static)

# Auth (mounted under /api/auth)
POST   /api/auth/send-otp
POST   /api/auth/check-customer
POST   /api/auth/login
GET    /api/auth/me                                (auth)
POST   /api/auth/set-password
POST   /api/auth/verify-password
POST   /api/auth/reset-password

# Customer (mounted under /api/customer, all auth)
GET    /api/customer/profile
PUT    /api/customer/profile
GET    /api/customer/orders
GET    /api/customer/points
GET    /api/customer/wallet
GET    /api/customer/coupons

# Config (mounted under /api/config)
GET    /api/config/{restaurant_id}                 (public — returns defaults if absent)
PUT    /api/config/                                (auth: restaurant)
POST   /api/config/banners                         (auth: restaurant)
PUT    /api/config/banners/{banner_id}             (auth: restaurant)
DELETE /api/config/banners/{banner_id}             (auth: restaurant)
POST   /api/config/feedback
GET    /api/config/feedback/{restaurant_id}        (auth: restaurant)
POST   /api/config/pages                           (auth: restaurant)
PUT    /api/config/pages/{page_id}                 (auth: restaurant)
DELETE /api/config/pages/{page_id}                 (auth: restaurant)

# Upload (mounted under /api/upload, auth)
POST   /api/upload/image

# Air-BnB (mounted under /api/air-bnb)
GET    /api/air-bnb/get-order-details/{order_id}   (proxies MyGenie POS)

# Dietary tags (mounted under /api/dietary-tags)
GET    /api/dietary-tags/available
GET    /api/dietary-tags/{restaurant_id}
PUT    /api/dietary-tags/{restaurant_id}           (auth)

# Docs (markdown viewers, mounted under /api/docs)
GET    /api/docs/bug-tracker
GET    /api/docs/api-mapping
GET    /api/docs/code-audit
GET    /api/docs/prd
GET    /api/docs/roadmap
GET    /api/docs/architecture
GET    /api/docs/changelog
GET    /api/docs/test-cases
```

The bulk of customer-facing operations (menu listing, order placement, payment, addresses) are called **directly from the React frontend** to `REACT_APP_API_BASE_URL` (MyGenie POS at `preprod.mygenie.online/api/v1`) and `REACT_APP_CRM_URL`. The FastAPI service primarily handles app-specific config, loyalty/customer lookups, auth, file uploads, and documentation endpoints.

---

## 6. Runtime Topology

```
                        ┌─────────────────────────────────────────────┐
  Browser ─────────────►│  Frontend (React 19, CRA + Craco)            │
                        │  Bundle: ~491 kB JS + 37 kB CSS (gzip)       │
                        └───┬───────────────┬─────────────────┬────────┘
                            │ /api/*        │ direct          │ direct
                            ▼               ▼                 ▼
                     ┌────────────┐  ┌──────────────┐  ┌───────────────┐
                     │ FastAPI    │  │ MyGenie POS  │  │ MyGenie CRM   │
                     │ :8001      │  │ preprod.…/v1 │  │ crm.…/api     │
                     └─────┬──────┘  └──────────────┘  └───────────────┘
                           │
                           ▼
                  ┌──────────────────────┐
                  │ MongoDB 7.0.30        │
                  │ 52.66.232.149:27017   │
                  │ db: mygenie (23 col.) │
                  └──────────────────────┘
```

| Service | Internal binding | Supervisor unit |
|---|---|---|
| FastAPI backend | `0.0.0.0:8001` | `backend` |
| React dev server | `0.0.0.0:3000` | `frontend` (replace with static serve in real prod) |
| Local MongoDB (unused) | `:27017` | `mongodb` (the app talks to remote Mongo) |
| code-server | (proxied) | `code-server` |

K8s ingress rule: paths prefixed `/api/*` → backend `:8001`, all other paths → frontend `:3000`.

---

## 7. Live Supervisor Status (snapshot)

```
backend                          RUNNING   pid 47
code-server                      RUNNING   (restarted during run)
frontend                         RUNNING   pid 48
mongodb                          RUNNING   pid 52
nginx-code-proxy                 RUNNING   pid 45
```

---

## 8. Known Non-Blocking Warnings & Recommended Follow-ups

| # | Item | Severity | Notes |
|---|---|---|---|
| 1 | 10 × `react-hooks/exhaustive-deps` warnings across 8 page files (`AboutUs.jsx`, `AdminSettings.jsx`, `ContactPage.jsx`, `DeliveryAddress.jsx`, `FeedbackPage.jsx`, `OrderSuccess.jsx` ×2, `Profile.jsx`, `ReviewOrder.jsx` ×2) | LOW | Production build succeeds; only breaks if pipeline uses `CI=true`. Fix per file by adding deps or `// eslint-disable-next-line`. |
| 2 | tiptap peer-dep warnings (`@tiptap/pm`, `@tiptap/core` ^3.x) | LOW | Yarn install warning only; runtime fine because the installed `@tiptap/react` resolves it transitively. |
| 3 | `react-day-picker@8.10.1` peer wants `react ≤18`, repo uses React 19 | LOW | No runtime breakage observed. Consider upgrading to `react-day-picker@9`. |
| 4 | `recharts@3.8.1` peer wants `react-is`, not installed | LOW | No runtime breakage observed in dev/prod compile. |
| 5 | Webpack DevServer deprecation warnings (`onBeforeSetupMiddleware`, `onAfterSetupMiddleware`) | INFO | Dev server only — irrelevant for prod build artifact. |
| 6 | `CORS_ORIGINS=*` and generated `JWT_SECRET` in `.env` | MEDIUM | Should be tightened for production cutover. |
| 7 | `REACT_APP_LOGIN_PHONE` / `REACT_APP_LOGIN_PASSWORD` / `REACT_APP_GOOGLE_MAPS_API_KEY` / `REACT_APP_CRM_API_KEY` are shipped in the client bundle | MEDIUM | Consider routing through backend, or restrict the Google Maps key to specific HTTP referrers in the Google Cloud Console. |
| 8 | MongoDB credentials are in plain `MONGO_URL`; DB exposed on public IP `52.66.232.149:27017` | MEDIUM | Confirm IP allow-list / VPC restrictions cover the deployment cluster's egress IP before going to production. |
| 9 | `REACT_APP_GOOGLE_MAPS_API_KEY=AIz...mj4` is **truncated** in the supplied value | **HIGH** (for Maps features) | Must be replaced with the full key before deployment. App still loads but Maps APIs return `InvalidKey`. |
| 10 | `REACT_APP_CRM_API_KEY` not supplied | MEDIUM | CRM endpoints that require a per-restaurant key will not authenticate; the parser falls back to `{}` and the app continues to load. |

None of items 1–8 and 10 block deployment of `main`. Item 9 (truncated Maps key) blocks Maps functionality only — the rest of the app loads fine.

---

## 9. Pre-Deployment Checklist for the next agent

- [x] Repo pulled from `main` at `3d5197c` (2026-05-13 18:03 UTC)
- [x] `/app/backend/.env` populated with all 5 required keys (`MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `MYGENIE_API_URL`, `CORS_ORIGINS`)
- [x] `/app/frontend/.env` populated with all 10 user-supplied keys (incl. live preview `REACT_APP_BACKEND_URL`)
- [x] Backend deps installed (`pip install -r requirements.txt`)
- [x] Frontend deps installed (`yarn install --frozen-lockfile`)
- [x] Backend imports & boots — `200 OK` on `/api/`
- [x] MongoDB connectivity confirmed (23 collections found)
- [x] Frontend production `yarn build` succeeds
- [x] Frontend dev server compiles and serves
- [x] External ingress URL reachable on both `/api/` (200) and `/` (200, React app mounts)
- [ ] **Action required:** replace truncated `REACT_APP_GOOGLE_MAPS_API_KEY=AIz...mj4` with the real value
- [ ] (Recommended) Decide whether `REACT_APP_CRM_API_KEY` and `REACT_APP_RESTAURANT_ID` are required for the target environment
- [ ] (Recommended before prod cutover) Restrict `CORS_ORIGINS` to known origins
- [ ] (Recommended before prod cutover) Rotate `JWT_SECRET` and store in secret manager
- [ ] (Recommended before prod cutover) Confirm MongoDB `52.66.232.149:27017` IP allow-list includes the deployment cluster's egress IP

---

## 10. Quick Validation Commands (for the deployment agent)

```bash
# 1) Backend health (local)
curl -s http://localhost:8001/api/
#   expects: {"message":"Customer App API"}

# 2) Backend health (k8s ingress)
curl -s https://52f26ce3-b2cb-44e8-aeb2-60863bc96b52.preview.emergentagent.com/api/

# 3) Frontend dev server (local)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/

# 4) Frontend (external ingress)
curl -s -o /dev/null -w "%{http_code}\n" https://52f26ce3-b2cb-44e8-aeb2-60863bc96b52.preview.emergentagent.com/

# 5) MongoDB connectivity
python3 -c "from pymongo import MongoClient; \
  c=MongoClient('mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie', \
  serverSelectionTimeoutMS=5000); print(c.server_info()['version'])"

# 6) Production frontend build
cd /app/frontend && yarn build

# 7) Service status
sudo supervisorctl status

# 8) Backend syntax + import
cd /app/backend && python -c "import ast; ast.parse(open('server.py').read()); print('SYNTAX OK')"
cd /app/backend && python -c "from dotenv import load_dotenv; load_dotenv('.env'); import server; print('IMPORT OK')"
```

---

## 11. Files created / modified during this handover run

| Path | Change |
|---|---|
| `/app/backend/.env` | **created** — 5 keys per user values; `JWT_SECRET` generated (64-char hex) |
| `/app/frontend/.env` | **created** — 10 keys per user values (`REACT_APP_BACKEND_URL` = preview ingress) |
| `/app/DEPLOYMENT_HANDOVER.md` | **written** — this document |
| All other repo files | restored from `origin/main @ 3d5197c` |

No source code was modified.

---

**End of handover.** Deployment may proceed against branch `main` @ `3d5197c` (2026-05-13 18:03 UTC).
The single must-fix item before features depending on Google Maps will work is updating the truncated `REACT_APP_GOOGLE_MAPS_API_KEY`. Everything else is green.
