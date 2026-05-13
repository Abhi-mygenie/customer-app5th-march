# Deployment Handover Document — Customer App (MyGenie)

| Field | Value |
|---|---|
| **Prepared by** | E1 (Emergent main agent) |
| **Prepared at (UTC)** | 2026-05-13 18:35 UTC |
| **Pulled at (UTC)** | 2026-05-13 18:25 UTC |
| **Status** | ✅ **READY FOR DEPLOYMENT** — backend running, frontend prod build succeeds, MongoDB reachable, all required env vars set, ingress smoke-test OK |

---

## 1. Source Code

| Field | Value |
|---|---|
| Repository | `https://github.com/Abhi-mygenie/customer-app5th-march.git` |
| Branch | `main` (user-confirmed; checked out as local HEAD) |
| Latest commit SHA (HEAD = origin/main) | `3d5197c8ef3cfa5937910de1a793c2afbcf5f2e9` |
| Latest commit author | `emergent-agent-e1 <github@emergent.sh>` |
| **Latest remote commit date & time (UTC)** | **2026-05-13 18:03:56 +0000** |
| Latest commit message | `Auto-generated changes` |

### Recent commits (last 5 on `main`)
```
3d5197c | 2026-05-13T18:03:56+00:00 | emergent-agent-e1 | Auto-generated changes
c11696e | 2026-05-13T18:01:19+00:00 | emergent-agent-e1 | Auto-generated changes
252cdce | 2026-05-13T17:49:26+00:00 | emergent-agent-e1 | auto-commit for ef23bada-07ce-4b79-8ec0-ac8c2a21502f
f9e152c | 2026-05-13T17:19:05+00:00 | emergent-agent-e1 | auto-commit for c605a72b-19e2-471a-a29c-5aa7faf12658
cb46013 | 2026-05-13T15:16:13+00:00 | emergent-agent-e1 | auto-commit for 5358fa42-906a-487a-baeb-4b52a29175e2
```

### Other notable remote branches (informational only)
`dev`, `14-may`, `11-may-uat`, `8-may`, `7-may`, `6-may`, `2_may_2026`, `2-may-temp-`, `latest-hyatt-fixes-7-may`, `hyatt-fixes-7-may`, several `conflict_*` branches, plus many April/March feature branches.
**Active deployment branch (approved by user): `main`.**

---

## 2. Tech Stack

| Layer | Technology / Version |
|---|---|
| Backend | FastAPI 0.110.1 on Python 3.11, Motor (async MongoDB), `uvicorn` 0.25.0 |
| Auth libs | PyJWT 2.11.0, `bcrypt` 4.1.3, `passlib` 1.7.4 |
| Frontend | React 19, Craco 7.1, react-router-dom v7, TailwindCSS 3.4, shadcn/ui (Radix), `@tanstack/react-query` 5, `axios` 1.8 |
| Maps | `@react-google-maps/api` 2.20 |
| Database | MongoDB 7.0.30 (remote — `52.66.232.149:27017`, DB `mygenie`) |
| External APIs | MyGenie POS (`https://preprod.mygenie.online/api/v1`), MyGenie CRM (`https://crm.mygenie.online/api`), Image CDN (`https://manage.mygenie.online`), Google Maps |
| Package managers | `yarn` 1.22 (frontend), `pip` (backend) |

### Project layout
```
/app/
├── backend/
│   ├── server.py            (1,613 lines — single-file FastAPI app, 14 /api routes)
│   ├── requirements.txt     (123 packages pinned)
│   ├── seed_defaults.py
│   ├── seed_demo_data.py
│   ├── db_export.py / db_import.py
│   ├── db_data/  db_export_new/
│   ├── uploads/             (file uploads dir)
│   └── .env                 (NOT committed — created from user-provided values)
├── frontend/
│   ├── package.json         (React 19 + craco)
│   ├── craco.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/           (27 page files: Login, LandingPage, MenuItems,
│   │   │                     DiningMenu, ReviewOrder, OrderSuccess, Profile,
│   │   │                     DeliveryAddress, FeedbackPage, AboutUs, ContactPage,
│   │   │                     AdminSettings, PasswordSetup, admin/…)
│   │   ├── components/      (incl. shadcn/ui)
│   │   ├── api/  context/  hooks/  layouts/  lib/  utils/  constants/  data/  types/
│   └── .env                 (NOT committed — created from user-provided values)
└── DEPLOYMENT_HANDOVER.md   (this file)
```

---

## 3. Environment Variables

### 3.1 Backend — `/app/backend/.env`
> The user-supplied value contained a duplicated key prefix (`MONGO_URL=MONGO_URL=…`); per user confirmation, the duplicate prefix has been cleaned.

| Variable | Status | Value (sanitized) |
|---|---|---|
| `MONGO_URL` | ✅ Set | `mongodb://mygenie_admin:****@52.66.232.149:27017/mygenie` |
| `DB_NAME` | ✅ Set | `mygenie` |
| `CORS_ORIGINS` | ✅ Set | `*` |
| `JWT_SECRET` | ✅ Set | 64-char hex random secret (freshly generated) |
| `MYGENIE_API_URL` | ✅ Set | `https://preprod.mygenie.online/api/v1` |

> ⚠️ **Production hardening (non-blocking):** replace `CORS_ORIGINS=*` with explicit production origin(s), and rotate `JWT_SECRET` to a value stored in your secret manager.

### 3.2 Frontend — `/app/frontend/.env`

| Variable | Status | Value (sanitized) |
|---|---|---|
| `REACT_APP_BACKEND_URL` | ✅ Set (preview ingress) | `https://build-verify-stage.preview.emergentagent.com` |
| `WDS_SOCKET_PORT` | ✅ Set | `443` |
| `ENABLE_HEALTH_CHECK` | ✅ Set | `false` |
| `REACT_APP_IMAGE_BASE_URL` | ✅ Set | `https://manage.mygenie.online` |
| `REACT_APP_API_BASE_URL` | ✅ Set | `https://preprod.mygenie.online/api/v1` |
| `REACT_APP_LOGIN_PHONE` | ✅ Set | `+919579504871` |
| `REACT_APP_LOGIN_PASSWORD` | ✅ Set | `Qplazm@10` |
| `REACT_APP_CRM_URL` | ✅ Set | `https://crm.mygenie.online/api` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | ✅ Set | `AIzaSy...0mj4` |
| `REACT_APP_CRM_API_VERSION` | ✅ Set | `v2` |

> ⚠️ **Security note (non-blocking):** `REACT_APP_LOGIN_PHONE` and `REACT_APP_LOGIN_PASSWORD` are baked into the frontend bundle (any `REACT_APP_*` is shipped to the browser). If this represents a service/integration credential, the next deployment agent should review whether it should be proxied through the backend instead.

> 🔑 **Note on `REACT_APP_BACKEND_URL`:** The preview ingress URL above is environment-specific. For production deployment, this value MUST be replaced with the production public URL that points at the FastAPI backend (e.g. `https://api.<your-prod-domain>`).

---

## 4. Build & Compile Readiness — Validation Results (run at 18:25–18:33 UTC)

| Check | Tool / Command | Result |
|---|---|---|
| Repo cloned from `main` | `git clone … && git rev-parse HEAD` | ✅ HEAD = `3d5197c…`, 2026-05-13 18:03 UTC |
| Backend Python syntax | `python -c "ast.parse(open('server.py').read())"` | ✅ OK |
| Backend module import | `python -c "import server"` | ✅ FastAPI app loads cleanly (`Customer App API`), no missing imports |
| Backend dependency install | `pip install -r backend/requirements.txt` | ✅ Successful (all 123 packages) |
| Backend startup | `supervisorctl restart backend` | ✅ `Uvicorn running on 0.0.0.0:8001` — `Application startup complete` |
| Backend health (local) | `curl http://localhost:8001/api/` | ✅ HTTP 200 → `{"message":"Customer App API"}` |
| Backend health (external ingress) | `curl https://build-verify-stage.preview.emergentagent.com/api/` | ✅ HTTP 200 → `{"message":"Customer App API"}` |
| MongoDB reachability | `pymongo.MongoClient(MONGO_URL).server_info()` | ✅ Connected to MongoDB **7.0.30** — DB `mygenie` has **23 collections** |
| Frontend dependency install | `yarn install --frozen-lockfile` | ✅ Done in 70.9 s (peer-dependency warnings only — non-blocking) |
| Frontend dev compile | `craco start` via supervisor | ✅ `webpack compiled with 1 warning` → `No issues found.` |
| **Frontend production build** | `yarn build` | ✅ **Compiled successfully** — `build/static/js/main.b408d220.js` 490.83 kB gzip, `build/static/css/main.8f97f757.css` 36.91 kB gzip |
| Frontend serve (local dev) | `curl http://localhost:3000/` | ✅ HTTP 200, 7,395 bytes |
| Frontend ingress smoke (browser) | Playwright screenshot of `/` | ✅ Page renders `MyGenie` brand, “Welcome!” screen, Phone/Name inputs, Browse Menu / Call Waiter / Login |
| External API reachability | `curl preprod / manage / crm` | ✅ All resolving — `preprod.../api/v1` returns 404 at the version-root (expected; valid paths are below `/api/v1/…`), `manage` returns 200, `crm` returns 301 (HTTPS redirect — expected) |

> ⚠️ **CI=true behaviour:** `CI=true yarn build` exits non-zero because CRA promotes ESLint `react-hooks/exhaustive-deps` warnings to errors in CI mode. The plain `yarn build` (used in the repo's `build` script via craco) succeeds. If your deployment pipeline sets `CI=true`, either (a) keep using `yarn build` directly, (b) export `ESLINT_NO_DEV_ERRORS=true` in the pipeline, (c) export `CI=false` for the build step, or (d) fix the listed hook-dependency warnings (≈10 occurrences across 8 page files — see Section 8).

---

## 5. Backend API Surface (14 routes under `/api`)

```
GET    /api/                               Health/root
GET    /api/table-config
POST   /api/status                         (StatusCheck model)
GET    /api/status                         (list)
GET    /api/loyalty-settings/{restaurant_id}
GET    /api/customer-lookup/{restaurant_id}
GET    /api/docs/bug-tracker
GET    /api/docs/api-mapping
GET    /api/docs/code-audit
GET    /api/docs/prd
GET    /api/docs/roadmap
GET    /api/docs/architecture
GET    /api/docs/changelog
GET    /api/docs/test-cases
```

The bulk of customer-facing operations (auth, menu, orders, addresses, points/wallet, feedback) are proxied **directly from the React frontend to** `REACT_APP_API_BASE_URL` (the MyGenie POS API at `preprod.mygenie.online`) and `REACT_APP_CRM_URL`. The FastAPI service primarily handles app-specific config, loyalty lookups, and documentation endpoints.

---

## 6. Runtime Topology

```
                        ┌─────────────────────────────────────────────┐
  Browser ─────────────►│  Frontend (React 19, CRA + Craco)            │
                        │  Static bundle from /app/frontend/build      │
                        │  Size: ~490 kB JS + 37 kB CSS (gzip)         │
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

| Service | Port (internal) | Process supervisor unit |
|---|---|---|
| FastAPI backend | `0.0.0.0:8001` | `backend` |
| React dev server | `0.0.0.0:3000` | `frontend` (replace with static serve / CDN in prod) |
| MongoDB | remote `:27017` | n/a (external) |

### MongoDB — collections present in `mygenie` DB (23)
`automation_rules, coupons, cron_job_logs, custom_templates, customer_app_config, customer_otps, customers, dietary_tags_mapping, feedback, loyalty_settings, order_items, orders, points_transactions, pos_event_logs, segments, status_checks, test, users, wallet_transactions, whatsapp_event_template_map, whatsapp_message_logs, whatsapp_template_variable_map, whatsapp_templates`

---

## 7. Supervisor Status (live snapshot)

```
backend                          RUNNING   pid 621
frontend                         RUNNING   pid 625
mongodb                          RUNNING   pid 202   (local-only; the app uses remote Mongo)
code-server                      RUNNING   pid 200
nginx-code-proxy                 RUNNING   pid 198
```

---

## 8. Known Non-Blocking Warnings & Recommended Follow-ups

| # | Item | Severity | Notes |
|---|---|---|---|
| 1 | ~10 `react-hooks/exhaustive-deps` warnings across 8 page files (`AboutUs`, `AdminSettings`, `ContactPage`, `DeliveryAddress`, `FeedbackPage`, `OrderSuccess`, `Profile`, `ReviewOrder`) | LOW | Production build succeeds; only breaks if pipeline runs `CI=true`. Fix by adding deps to dependency arrays or `// eslint-disable-next-line`. |
| 2 | tiptap peer-dep warnings (`@tiptap/pm`, `@tiptap/core` 3.23.2) | LOW | Yarn install warning only; runtime functions fine via transitive resolution. |
| 3 | `react-day-picker@8.10.1` peer wants `react ≤18`, repo uses React 19 | LOW | No runtime breakage observed; consider upgrading to `react-day-picker@9`. |
| 4 | `recharts@3.8.1` peer wants `react-is`; not installed | LOW | No runtime breakage observed in dev compile or prod build. |
| 5 | Webpack DevServer deprecation warnings (`onBeforeSetupMiddleware`, `onAfterSetupMiddleware`) | INFO | Dev server only — irrelevant for prod. |
| 6 | `CORS_ORIGINS=*` and dev-grade `JWT_SECRET` | MEDIUM | Tighten for production. |
| 7 | `REACT_APP_LOGIN_PHONE` / `REACT_APP_LOGIN_PASSWORD` shipped in client bundle | MEDIUM | Review whether these should be backend-only secrets. |
| 8 | MongoDB credentials in plain `MONGO_URL`, DB exposed on `52.66.232.149:27017` | MEDIUM | Confirm IP allow-list / VPC restrictions before going to production. |

None of the above block deployment of `main`.

---

## 9. Pre-Deployment Checklist for the next agent

- [x] Repo pulled from `main` at `3d5197c` (2026-05-13 18:03 UTC)
- [x] `/app/backend/.env` populated with all 5 required keys
- [x] `/app/frontend/.env` populated with all 10 required keys (incl. preserved `REACT_APP_BACKEND_URL`)
- [x] Backend deps installed (`pip install -r requirements.txt`)
- [x] Frontend deps installed (`yarn install --frozen-lockfile`)
- [x] Backend imports & boots — `200 OK` on `/api/`
- [x] MongoDB connectivity confirmed (23 collections found, MongoDB 7.0.30)
- [x] Frontend production `yarn build` succeeds
- [x] Frontend dev server compiles (`No issues found.`)
- [x] External ingress URL reachable (`200 OK` via `https://build-verify-stage.preview.emergentagent.com/api/`)
- [x] Browser smoke test of `/` shows MyGenie landing/welcome screen
- [ ] **(Required before prod cutover)** Replace `REACT_APP_BACKEND_URL` with the production backend URL
- [ ] **(Recommended)** Restrict `CORS_ORIGINS` to known origins
- [ ] **(Recommended)** Rotate `JWT_SECRET`
- [ ] **(Recommended)** Confirm MongoDB IP allow-list includes the deployment cluster's egress IP
- [ ] **(Recommended)** Decide whether the dev server should be replaced with a static reverse-proxy serving `/app/frontend/build`

---

## 10. Quick Validation Commands (for the deployment agent)

```bash
# 1) Backend health (local)
curl -s http://localhost:8001/api/        # expects {"message":"Customer App API"}

# 2) Backend external (through k8s ingress)
curl -s https://build-verify-stage.preview.emergentagent.com/api/

# 3) Frontend dev server (local)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/

# 4) MongoDB connectivity
python3 -c "from pymongo import MongoClient; \
  c=MongoClient('mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie', \
  serverSelectionTimeoutMS=5000); print(c.server_info()['version'])"

# 5) Production frontend build
cd /app/frontend && yarn build

# 6) Service health via supervisor
sudo supervisorctl status

# 7) Rebuild from scratch (if needed)
cd /app/backend  && pip install -r requirements.txt
cd /app/frontend && yarn install --frozen-lockfile && yarn build
sudo supervisorctl restart backend frontend
```

---

**End of handover.** Deployment may proceed against branch `main` @ `3d5197c…` (last remote commit at **2026-05-13 18:03:56 UTC**).
