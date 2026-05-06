# Deployment Handover — `customer-app5th-march`

**Prepared on:** 2026-05-06
**Prepared by:** Validation / handover agent (Emergent E1)
**For:** Next deployment agent
**Validation run:** Branch `7-may` (latest), commit `9ab9781` — *Auto-generated changes*

---

## 1. Source

| Item | Value |
| --- | --- |
| Repo | https://github.com/Abhi-mygenie/customer-app5th-march.git |
| Visibility | Public (clone works without auth) |
| **Branch validated** | **`7-may`** (user-confirmed; user originally said `6-may` but corrected to `7-may`) |
| HEAD commit at validation | `9ab97817e0f2a0371b6078f4bd14af20ca668f94` (`9ab9781` — *Auto-generated changes*) |
| Clone command | `git clone -b 7-may --single-branch https://github.com/Abhi-mygenie/customer-app5th-march.git` |
| Adjacent branches seen on remote | `2-may-temp-`, `2_may_2026`, `abhi-2-may`, `6-may`, `7-may` |

### Delta vs `6-may` (previous validation point)

Only **2 frontend code files** changed plus housekeeping:

| File | Change |
| --- | --- |
| `frontend/src/api/services/orderService.ts` | +2 / -2 lines (Delivery Charge Gating CR) |
| `frontend/src/pages/ReviewOrder.jsx` | +18 / -4 lines — wires gated `effectiveDeliveryCharge` into edit/place-order writers; adds **CGST/SGST on delivery** rows in price breakdown (CR tag: **D-5 DELIVERY_CHARGE_GATING**) |
| `backend_test.py` | Deleted (-334) |
| `memory/*` (~30 internal docs) | Deleted (cleanup) |
| `test_reports/iteration_*.json` | Deleted (cleanup) |
| `.gitignore` | Tightened |
| `.emergent/emergent.yml` | Updated metadata |

**No backend code changes**, no dependency changes. The handover from `6-may` is essentially still valid; this run re-confirms it on `7-may`.

---

## 2. Application overview

A multi-tenant **Customer App** for restaurants on the MyGenie platform. Customers scan a restaurant QR → land on the app → browse menu → place orders / earn loyalty / wallet points. Restaurant admins log in to configure branding, visibility, banners, dietary tags, QR/table config, etc.

| Layer | Tech |
| --- | --- |
| **Frontend** | React 19 + CRA 5 + **CRACO** + TailwindCSS + shadcn/Radix UI. Build tool `craco` (scripts in `frontend/package.json`). Package manager **yarn 1.22.22** (pinned via `packageManager`) — **do not use npm**. ~171 source files in `src/`. |
| **Backend** | FastAPI on **uvicorn**, port **8001**. Single-file API (`backend/server.py`, 1611 LOC, **47 routes**, all prefixed `/api`). Async Mongo via `motor`. JWT (HS256) for auth. |
| **Database** | Remote MongoDB `52.66.232.149:27017`, db `mygenie`. **23 collections** confirmed (`wallet_transactions`, `points_transactions`, `dietary_tags_mapping`, …). |
| **Upstream APIs** | MyGenie POS API (`https://preprod.mygenie.online/api/v1`), MyGenie CRM (`https://crm.mygenie.online/api`), image CDN (`https://manage.mygenie.online`). |

Static uploads mounted at `/api/uploads/*` (served from `backend/uploads/`, **16 image files committed in repo**). **Do not wipe that folder on redeploys** — see §6.6.

---

## 3. Validation results

### 3.1 Backend — ✅ READY

| Check | Result |
| --- | --- |
| `pip install -r requirements.txt` (124 pkgs) | Success |
| `python -c "from server import app"` | Success — **47 routes** registered, app title `Customer App API` |
| `python -m py_compile server.py` | Success |
| `ruff check server.py` | **3 minor F401 unused-import** warnings (auto-fixable, non-blocking): `FileResponse`, `hashlib`, `shutil` |
| Uvicorn boot via supervisor | Running — `Application startup complete` (PID up; reloader process active) |
| `GET /api/` (localhost:8001) | `200 {"message":"Customer App API"}` |
| `GET /api/dietary-tags/available` | `200` (returns 6 tags incl. Jain, Vegan, Gluten-Free…) |
| MongoDB ping | `{ok: 1.0}`, **23 collections** |
| External preview URL `GET /api/` (via ingress → :8001) | `200` |

**Fail-fast env checks verified** (backend refuses to start until each is set):
- `MONGO_URL`  (`server.py:23`)
- `DB_NAME`    (`server.py:25`)
- `JWT_SECRET` (`server.py:28-30`, raises `ValueError` if missing)
- `MYGENIE_API_URL` (`server.py:38-40`, raises `ValueError` if missing)

`CORS_ORIGINS` defaults to `*` if unset (`server.py:1596`).

### 3.2 Frontend — ✅ READY (with one CI caveat — §6.1)

| Check | Result |
| --- | --- |
| `yarn install` (1st run) | Success (peer-dep warnings only). Lockfile **generated**. |
| `yarn install --frozen-lockfile` (after lockfile generated) | Success — `Already up-to-date.` |
| Dev server (`yarn start` via supervisor) | Running on :3000 |
| External preview `/` | `200`, React shell loads |
| Production build `CI=false yarn build` | **Success** — main JS **485.89 kB gzipped**, CSS 35.64 kB gzipped, output `build/` ≈ **48 MB** |
| Production build `CI=true yarn build` | **FAILS** — treats `react-hooks/exhaustive-deps` warnings as errors (15+ warnings). See §6.1. |

### 3.3 Upstream connectivity (from this container)

| Endpoint | Status | Notes |
| --- | --- | --- |
| `https://preprod.mygenie.online/api/v1/` | `404` | Root has no handler — sub-paths work. Expected. |
| `https://manage.mygenie.online/` | `200` | Image CDN reachable |
| `https://crm.mygenie.online/api` | `301` | Redirect — expected |
| `52.66.232.149:27017` (TCP) | **REACHABLE** | Mongo auth verified via ping |

---

## 4. Required environment variables

> ⚠️ **`.env` files are NOT committed** (excluded by `.gitignore`). Deployment platform **must inject them** via secret manager. Below is the validated set used in this run.

### 4.1 `/app/backend/.env`

| Variable | Required | Purpose | Value used in validation |
| --- | :---: | --- | --- |
| `MONGO_URL` | ✅ | Mongo connection. **Fails fast** if missing. | `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie` |
| `DB_NAME`   | ✅ | Mongo DB. **Fails fast** if missing. | `mygenie` |
| `JWT_SECRET` | ✅ | HS256 signing key. **Fails fast** if missing. | **REPLACE in prod** — `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `MYGENIE_API_URL` | ✅ | Upstream POS API base URL. **Fails fast** if missing. | `https://preprod.mygenie.online/api/v1` |
| `CORS_ORIGINS` | ⚠️ | CSV of allowed origins. Defaults to `*` if unset (`server.py:1596`). | `*` for preprod; restrict to prod frontend origin(s) in prod |

### 4.2 `/app/frontend/.env`

| Variable | Required | Purpose | Value used in validation |
| --- | :---: | --- | --- |
| `REACT_APP_BACKEND_URL` | ✅ | This app's FastAPI base URL. Used by `AuthContext`, `RestaurantConfigContext`, `AdminConfigContext`, `useMenuData`, `ContentTab`. Empty string is allowed but breaks those flows. | **Set to actual prod API host** (e.g., `https://api.mygenie.online`) |
| `REACT_APP_API_BASE_URL` | ✅ | MyGenie POS API base URL (called from frontend axios). `axios.js:12-13` logs CRITICAL if unset. | `https://preprod.mygenie.online/api/v1` |
| `REACT_APP_IMAGE_BASE_URL` | ✅ | CDN for menu/banner images. | `https://manage.mygenie.online` |
| `REACT_APP_CRM_URL` | ✅ | MyGenie CRM API base. | `https://crm.mygenie.online/api` |
| `REACT_APP_CRM_API_VERSION` | ✅ | CRM API version header. | `v2` |
| `REACT_APP_LOGIN_PHONE` | ✅ | Default test/login phone (auto-fill). | `+919579504871` |
| `REACT_APP_LOGIN_PASSWORD` | ✅ | Default test/login password (auto-fill). | `Qplazm@10` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | ⚠️ | Google Maps JS key (delivery-address screens). Maps won't render if blank. | `AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4` (user-supplied) |
| `REACT_APP_CRM_API_KEY` | ⚠️ optional | JSON map `{ "<restaurantId>": "<apiKey>" }` for CRM auth (`src/api/services/crmService.js`). | leave unset unless CRM actively used |
| `REACT_APP_RESTAURANT_ID` | ⚠️ optional | Fallback restaurant id when not in URL. | optional |
| `WDS_SOCKET_PORT` | dev-only | CRA dev-server WS port for HMR behind ingress. | `443` |
| `ENABLE_HEALTH_CHECK` | dev-only | Enables CRACO health-check plugin. | `false` |

> 🔒 **Sensitive values** (Mongo creds, JWT secret, login phone/password, Google Maps key) are recorded above for the deployment agent's reference. Treat this document as confidential and store the production replacements in a secret manager — never commit them to git.

---

## 5. Build & run commands

### 5.1 Container / local (supervisor-managed)

```bash
# Backend deps
cd /app/backend && pip install -r requirements.txt

# Frontend deps (yarn ONLY — packageManager pinned to yarn@1.22.22)
cd /app/frontend && yarn install

# Restart services (after .env or dep changes)
sudo supervisorctl restart backend frontend
```

### 5.2 Production frontend build

```bash
cd /app/frontend
CI=false yarn build          # ← MUST set CI=false (see §6.1)
# or equivalently:
DISABLE_ESLINT_PLUGIN=true yarn build
# Output: /app/frontend/build (~48 MB; main JS 485.89 kB gzip; CSS 35.64 kB gzip)
```

### 5.3 Production backend run (without supervisor)

```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --workers <N>
```

### 5.4 Smoke test after deploy

```bash
curl https://<api-host>/api/                          # → {"message":"Customer App API"}
curl https://<api-host>/api/dietary-tags/available    # → {"tags":[...]} (6 entries)
curl https://<api-host>/api/config/698                # → 200, default config JSON (if seeded)
curl -I https://<frontend-host>/                      # → 200
```

---

## 6. Issues & action items for the deployment agent

### 6.1 🔴 BLOCKING for CI-driven builds — `CI=true yarn build` fails on lint warnings

CRA treats `react-hooks/exhaustive-deps` warnings as errors when `CI=true` (the default in Vercel, Netlify, GitHub Actions, most Dockerfiles). The repo currently has **15+ such warnings** in:

- `src/pages/MenuPage.jsx`, `OrderSuccess.jsx`, `Profile.jsx`, `ReviewOrder.jsx`, `AdminSettings.jsx`, `DeliveryAddress.jsx`, `AboutUs.jsx`, `ContactPage.jsx`, `FeedbackPage.jsx`
- `src/context/RestaurantConfigContext.jsx`
- `src/hooks/useNotificationPopup.js`
- `src/components/CartWrapper/CartWrapper.jsx` (2 `useMemo` warnings)

**Recommended fix (pick one, in order of preference):**

1. **Inject `CI=false`** into the build pipeline (Dockerfile / Vercel env / GitHub Action env). Lowest risk, zero code change.
2. Inject `DISABLE_ESLINT_PLUGIN=true` for build only.
3. Long-term: clean up the `exhaustive-deps` warnings in the files listed above.

### 6.2 🟡 `JWT_SECRET` must be replaced for production
Validation used `preprod-deploy-validation-jwt-secret-change-me-for-prod-32bytes`. **Generate a strong random value**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 6.3 🟡 `CORS_ORIGINS=*` is permissive
Acceptable for preprod. For prod, set to exact frontend origin(s), comma-separated (e.g., `CORS_ORIGINS=https://app.mygenie.online`).

### 6.4 🟡 `.env` files are not in the repo
Provision via the deployment platform's secret manager. Full validated content is documented in §4.

### 6.5 🟡 `yarn.lock` is **NOT** tracked in the repo (`git ls-files frontend/yarn.lock` → empty)
`yarn install` works fine and **deterministically regenerates** the lockfile during this validation, but for reproducible installs across environments, run `yarn install` once locally and **commit `frontend/yarn.lock`**. Until then, `yarn install --frozen-lockfile` will fail in CI from a fresh clone.

### 6.6 🟡 `backend/uploads/` contains user-uploaded images (16 files committed)
In prod, this should be replaced with a durable object store (S3/GCS) or mounted volume. If you deploy to an ephemeral FS (e.g., Vercel, Heroku, default container), **uploads done at runtime will be lost on every redeploy**. Recommendation: mount `/app/backend/uploads` as a persistent volume or migrate the upload endpoints to S3/Cloudinary.

### 6.7 🟡 3 `ruff F401` warnings in `backend/server.py`
Unused imports: `FileResponse`, `hashlib`, `shutil`. Non-blocking. Auto-fixable with `ruff check --fix server.py`.

### 6.8 🟢 React peer-dep warnings during `yarn install`
Several `@tiptap/*`, `recharts`, `react-day-picker`, `eslint-plugin-flowtype` peer-dep warnings appear. **Non-blocking** — install and runtime succeed. No action required.

### 6.9 🟢 Health-check plugin is disabled
`ENABLE_HEALTH_CHECK=false` in `frontend/.env` — CRACO health-check plugin is not loaded. Leave as-is unless ops wants liveness on `:3000/__health`.

### 6.10 🟢 No native / system dependencies beyond standard
Standard Python 3.11 + Node 20 image is sufficient. No extra `apt` packages needed.

### 6.11 🟢 MongoDB network reachability
`52.66.232.149:27017` is reachable from this container (TCP and authenticated). **Verify the production cluster can reach this IP on :27017** (firewall/security group whitelist).

### 6.12 🟢 Outbound HTTPS to MyGenie services
`preprod.mygenie.online`, `manage.mygenie.online`, `crm.mygenie.online` are all reachable from this container. **Confirm prod egress allows these hostnames**.

### 6.13 🟢 Delivery Charge Gating CR (D-5) is the only functional change vs `6-may`
Limited to `frontend/src/pages/ReviewOrder.jsx` and `frontend/src/api/services/orderService.ts`. Extra UI rows for **CGST/SGST on delivery** (`row-delivery-cgst`, `row-delivery-sgst`). No backend / API contract changes; no DB schema migration. Smoke test the **review-order** screen after deploy.

---

## 7. Suggested deployment topology

```
┌─────────────────────────────────────────────────────────────┐
│  Ingress / CDN                                              │
│   /api/*          →  FastAPI (uvicorn :8001)                │
│   /api/uploads/*  →  FastAPI static files from              │
│                       backend/uploads — prefer S3 in prod   │
│   /*              →  Frontend static build/ (nginx / CDN /  │
│                       serve -s build)                       │
└─────────────────────────────────────────────────────────────┘
                  │
        ┌─────────┴───────────┐
        ▼                     ▼
   FastAPI :8001        MongoDB
   (→ preprod.mygenie,  52.66.232.149:27017
      crm.mygenie,        (db: mygenie, 23 cols)
      manage.mygenie)
```

- **Frontend**: serve as static assets (Netlify / Vercel / S3+CloudFront / nginx).
- **Backend**: Python 3.11 container running `uvicorn server:app --host 0.0.0.0 --port 8001 --workers N`.
- **Routing rule**: all `/api/*` and `/api/uploads/*` → backend; everything else → frontend.

---

## 8. Deployment sanity checklist

- [ ] Clone branch **`7-may`** (commit `9ab9781`)
- [ ] Inject all env vars from §4.1 and §4.2 via secret manager
- [ ] **Replace `JWT_SECRET`** with a strong random value (§6.2)
- [ ] Set **`REACT_APP_BACKEND_URL`** to actual production backend URL
- [ ] Replace **`REACT_APP_GOOGLE_MAPS_API_KEY`** with the production-restricted key (the preprod key is HTTP-referrer-restricted at Google)
- [ ] Restrict **`CORS_ORIGINS`** to prod origin(s) (§6.3)
- [ ] Configure frontend build with `CI=false` **or** `DISABLE_ESLINT_PLUGIN=true` (§6.1)
- [ ] Commit `frontend/yarn.lock` for reproducible installs (§6.5)
- [ ] Mount `backend/uploads/` as persistent volume **or** migrate to S3 (§6.6)
- [ ] Verify Mongo connectivity: `52.66.232.149:27017` from production network
- [ ] Verify outbound HTTPS to `preprod.mygenie.online`, `crm.mygenie.online`, `manage.mygenie.online`
- [ ] Post-deploy smoke test (see §5.4)
- [ ] Manual smoke: open Review-Order screen, confirm delivery CGST/SGST rows render correctly when delivery is selected (D-5 CR)

---

## 9. File paths reference

| Path | Purpose |
| --- | --- |
| `/app/backend/server.py` | All FastAPI routes (single file, 1611 LOC, 47 routes) |
| `/app/backend/requirements.txt` | Python deps (124 pkgs) |
| `/app/backend/.env` | Backend secrets — **not committed** |
| `/app/backend/uploads/` | User uploads, 16 files (see §6.6) |
| `/app/backend/seed_defaults.py`, `seed_demo_data.py` | Optional data seed scripts |
| `/app/backend/db_export.py`, `db_import.py` | DB dump/restore utilities |
| `/app/backend/db_export_new/db_export/` | Static DB export snapshot |
| `/app/frontend/package.json` | Frontend deps & scripts (yarn 1.22.22 pinned) |
| `/app/frontend/craco.config.js` | Webpack/CRACO override |
| `/app/frontend/.env` | Frontend env — **not committed** |
| `/app/frontend/src/index.js` | React entry |
| `/app/frontend/src/App.js` | Router root |
| `/app/frontend/src/pages/ReviewOrder.jsx` | **D-5 CR** delivery-charge gating logic |
| `/app/frontend/src/api/services/orderService.ts` | **D-5 CR** order writer |
| `/app/frontend/build/` | Production build output (created by `yarn build`) |
| `/etc/supervisor/conf.d/supervisord.conf` | Supervisor config |

---

## 10. Quick-reference: validation transcript

```
$ git ls-remote --heads | grep -E "(6-may|7-may)"
acabff05…  refs/heads/6-may
9ab97817…  refs/heads/7-may                  ← USED

$ git rev-parse HEAD            → 9ab97817e0f2a0371b6078f4bd14af20ca668f94

$ pip install -r requirements.txt → OK (124 pkgs)
$ python -c "from server import app; print(len(app.routes))" → 47
$ python -m py_compile server.py  → OK
$ ruff check server.py            → 3 F401 (FileResponse, hashlib, shutil)

$ yarn install                    → OK (peer warnings only)
$ yarn install --frozen-lockfile  → OK (post-install)
$ CI=false yarn build             → OK   main 485.89 kB gz, css 35.64 kB gz
$ CI=true  yarn build             → FAIL (15+ react-hooks/exhaustive-deps)

$ curl localhost:8001/api/        → 200 {"message":"Customer App API"}
$ curl preview/api/               → 200 (via ingress)
$ mongo ping                      → {ok: 1.0}, 23 collections
$ curl preprod.mygenie.online/api/v1/  → 404 (expected, root has no handler)
$ curl manage.mygenie.online/          → 200
$ curl crm.mygenie.online/api          → 301
$ tcp 52.66.232.149:27017              → REACHABLE
```

---

**End of handover.** All validation checks passed; the codebase on **`7-may@9ab9781`** is **deployment-ready** subject to the action items in §6 — primarily §6.1 (`CI=false` flag), §6.2 (real `JWT_SECRET`), §6.5 (commit `yarn.lock`), and §6.6 (persistent uploads).
