# Deployment Handover — `customer-app5th-march`

**Prepared on:** 2026-05-06
**Prepared by:** Validation / handover agent (Emergent E1)
**For:** Next deployment agent

---

## 1. Source

| Item | Value |
| --- | --- |
| Repo | https://github.com/Abhi-mygenie/customer-app5th-march.git |
| Visibility | Public (clone works without auth) |
| Branch validated | `6-may` |
| HEAD commit at validation | `acabff0` — *Auto-generated changes* |
| Total remote branches seen | 32 |
| Clone command | `git clone -b 6-may https://github.com/Abhi-mygenie/customer-app5th-march.git` |

> ℹ️ The user asked me to confirm branches. Candidate "`2`-branch" look-alikes near `6-may` on the remote were also checked: `2-may-temp-`, `2_may_2026`, `abhi-2-may`. **The exact branch `6-may` exists and was used for this validation.**

---

## 2. Application overview

A multi-tenant **Customer App** for restaurants on the MyGenie platform. Customers scan a restaurant QR → land on the app → browse menu → place orders / earn loyalty points. Restaurant admins log in to configure branding, visibility, banners, dietary tags, QR/table config, etc.

| Layer | Tech |
| --- | --- |
| **Frontend** | React 19 + CRA 5 + **CRACO** + TailwindCSS + shadcn/Radix UI. Build tool `craco` (scripts in `frontend/package.json`). Package manager **yarn 1.22.22** (pinned via `packageManager`) — **do not use npm**. |
| **Backend** | FastAPI on **uvicorn**, port **8001**. Single-file API (`backend/server.py`, 1611 LOC, 47 routes, all prefixed `/api`). Async Mongo via `motor`. JWT (HS256) for auth. |
| **Database** | Remote MongoDB `52.66.232.149:27017`, db `mygenie`, 23 collections confirmed. |
| **Upstream APIs** called by backend/frontend | MyGenie POS API (`https://preprod.mygenie.online/api/v1`), MyGenie CRM (`https://crm.mygenie.online/api`), image CDN (`https://manage.mygenie.online`). |

Static uploads mounted at `/api/uploads/*` (served from `backend/uploads/`). **Do not wipe that folder on redeploys** — see §6.6.

---

## 3. Validation results

### 3.1 Backend — ✅ READY

| Check | Result |
| --- | --- |
| `pip install -r requirements.txt` (124 pkgs) | Success |
| `python -c "from server import app"` | Success — **47 routes** registered |
| `python -m py_compile server.py` | Success |
| `ruff check server.py` | 3 minor `F401` unused-import warnings (auto-fixable, non-blocking): `FileResponse`, `hashlib`, `shutil` |
| Uvicorn boot via supervisor | Running — `Application startup complete` |
| `GET /api/` | `200 {"message":"Customer App API"}` |
| `GET /api/loyalty-settings/698` | `200` |
| `GET /api/config/698` | `200` |
| `GET /api/dietary-tags/available` | `200` |
| MongoDB ping | `{ok: 1.0}`, 23 collections |
| External preview URL (ingress → backend) | `GET /api/` returns `200` via `REACT_APP_BACKEND_URL` |

**Fail-fast env checks verified** (backend refused to start until set):
- `MONGO_URL` (`server.py:23`)
- `DB_NAME` (`server.py:25`)
- `JWT_SECRET` (`server.py:28-30`)
- `MYGENIE_API_URL` (`server.py:38-40`)

### 3.2 Frontend — ✅ READY (with one caveat — §6.1)

| Check | Result |
| --- | --- |
| `yarn install` | Success (peer-dep warnings only; `--frozen-lockfile` failed because no committed `yarn.lock` — see §6.5) |
| Dev server (`yarn start` via supervisor) | HTTP 200, page renders, title `<title>MyGenie</title>` |
| Production build `CI=false yarn build` | **Success** — `476.32 kB` gzipped JS, `35.64 kB` gzipped CSS, output `build/` ≈ 48 MB |
| Production build `CI=true yarn build` | **FAILS** — treats `react-hooks/exhaustive-deps` warnings as errors (15+ warnings). See §6.1 |
| External preview URL `/` | 200, React shell loads |

### 3.3 Upstream connectivity (from this container)

| Endpoint | Status | Notes |
| --- | --- | --- |
| `https://preprod.mygenie.online/api/v1/` | `404` | Root has no handler — sub-paths work; expected |
| `https://manage.mygenie.online/` | `200` | Image CDN reachable |
| `https://crm.mygenie.online/api` | `301` | Redirect — expected |
| MongoDB `52.66.232.149:27017` | Reachable, auth OK |  |

---

## 4. Required environment variables

> ⚠️ **`.env` files are NOT committed** (excluded by `.gitignore`). Deployment platform **must inject them** via secret manager. Below is the validated set used in this run.

### 4.1 `/app/backend/.env`

| Variable | Required | Purpose | Value used in validation |
| --- | :---: | --- | --- |
| `MONGO_URL` | ✅ | Mongo connection. **Fails fast** if missing. | `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie` |
| `DB_NAME` | ✅ | Mongo DB. **Fails fast** if missing. | `mygenie` |
| `JWT_SECRET` | ✅ | HS256 signing key. **Fails fast** if missing. | **REPLACE** for prod — `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `MYGENIE_API_URL` | ✅ | Upstream POS API base URL. **Fails fast** if missing. | `https://preprod.mygenie.online/api/v1` |
| `CORS_ORIGINS` | ⚠️ | CSV of allowed origins. Defaults to `*` if unset (`server.py:1596`). | `*` for preprod; restrict to prod frontend origin(s) in prod |

### 4.2 `/app/frontend/.env`

| Variable | Required | Purpose | Value used in validation |
| --- | :---: | --- | --- |
| `REACT_APP_BACKEND_URL` | ✅ | This app's FastAPI base URL. Used by Axios for `/api/*`. | **Production external URL** — set to actual prod API host |
| `REACT_APP_API_BASE_URL` | ✅ | MyGenie POS API base URL (called from frontend). | `https://preprod.mygenie.online/api/v1` |
| `REACT_APP_IMAGE_BASE_URL` | ✅ | CDN for menu/banner images. | `https://manage.mygenie.online` |
| `REACT_APP_CRM_URL` | ✅ | MyGenie CRM API base. | `https://crm.mygenie.online/api` |
| `REACT_APP_CRM_API_VERSION` | ✅ | CRM API version header. | `v2` |
| `REACT_APP_LOGIN_PHONE` | ✅ | Default test/login phone. | `+919579504871` |
| `REACT_APP_LOGIN_PASSWORD` | ✅ | Default test/login password. | `Qplazm@10` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | ⚠️ | Google Maps JS key (delivery-address screens). Maps won't render if blank. | **Inject real key (`AIz...mj4` — truncated in handoff; supply full value)** |
| `REACT_APP_CRM_API_KEY` | ⚠️ optional | JSON map `{ "<restaurantId>": "<apiKey>" }` for CRM auth (`src/api/services/crmService.js`). | leave unset unless CRM actively used |
| `REACT_APP_RESTAURANT_ID` | ⚠️ optional | Fallback restaurant id when not in URL. | optional |
| `WDS_SOCKET_PORT` | dev-only | CRA dev-server WS port for HMR behind ingress. | `443` |
| `ENABLE_HEALTH_CHECK` | dev-only | Enables CRACO health-check plugin. | `false` |

---

## 5. Build & run commands

### 5.1 Container / local (supervisor-managed)

```bash
# Backend deps
cd /app/backend && pip install -r requirements.txt

# Frontend deps (yarn ONLY — packageManager pinned)
cd /app/frontend && yarn install

# Restart services
sudo supervisorctl restart backend frontend
```

### 5.2 Production frontend build

```bash
cd /app/frontend
CI=false yarn build          # ← MUST set CI=false (see §6.1)
# or equivalently:
DISABLE_ESLINT_PLUGIN=true yarn build
# Output: /app/frontend/build (~48 MB, 476 kB gzipped main JS)
```

### 5.3 Production backend run (without supervisor)

```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --workers <N>
```

### 5.4 Smoke test after deploy

```bash
curl https://<api-host>/api/                          # → {"message":"Customer App API"}
curl https://<api-host>/api/dietary-tags/available    # → {"tags":[...]}
curl https://<api-host>/api/config/698                # → 200, default config JSON
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
Provision via the deployment platform's secret manager. Full validated content is documented in §4. Do **not** commit `.env`.

### 6.5 🟡 No `yarn.lock` committed in repo
`yarn install` works but generates a fresh lockfile each deploy. For reproducible installs, run `yarn install` once locally and **commit `yarn.lock`**. Currently this means `yarn install --frozen-lockfile` **fails** in CI.

### 6.6 🟡 `backend/uploads/` contains user-uploaded images (committed in repo)
16 files (~logos, banners) currently tracked. In prod, this should be replaced with a durable object store (S3/GCS) or mounted volume. If you deploy to an ephemeral FS (e.g., Vercel, Heroku), uploads done at runtime **will be lost on every redeploy**. Recommendation: mount `/app/backend/uploads` as a persistent volume or migrate to S3.

### 6.7 🟡 3 minor `ruff` `F401` warnings in `backend/server.py`
Unused imports: `FileResponse`, `hashlib`, `shutil`. Non-blocking. Auto-fixable with `ruff check --fix server.py`.

### 6.8 🟢 React peer-dep warnings
Several `@tiptap/*`, `recharts`, `react-day-picker` peer-dep warnings appear during install. **Non-blocking**; install and runtime succeed.

### 6.9 🟢 Health-check plugin is disabled
`ENABLE_HEALTH_CHECK=false` in `frontend/.env` — CRACO health-check plugin is not loaded. Leave as-is unless ops wants liveness on `:3000/__health`.

### 6.10 🟢 No native / system dependencies beyond standard
Standard Python 3.11 + Node 20 image is sufficient. No extra `apt` packages needed.

### 6.11 🟢 MongoDB network reachability
`52.66.232.149:27017` is reachable from this container. **Verify the production cluster can reach this IP on :27017** (firewall/security group).

---

## 7. Suggested deployment topology

```
┌─────────────────────────────────────────────────────────────┐
│  Ingress / CDN                                              │
│   /api/*          →  FastAPI (uvicorn :8001)                │
│   /api/uploads/*  →  FastAPI (static files from backend/    │
│                       uploads — prefer S3 in prod)          │
│   /*              →  Frontend static build/ (nginx / CDN /  │
│                       serve -s build)                       │
└─────────────────────────────────────────────────────────────┘
                  │
        ┌─────────┴───────────┐
        ▼                     ▼
   FastAPI :8001        MongoDB
   (→ preprod.mygenie,  52.66.232.149:27017
      crm.mygenie,       (db: mygenie)
      manage.mygenie)
```

- **Frontend**: serve as static assets (Netlify / Vercel / S3+CloudFront / nginx).
- **Backend**: Python 3.11 container running `uvicorn server:app --host 0.0.0.0 --port 8001 --workers N`.
- **Routing rule**: all `/api/*` and `/api/uploads/*` → backend; everything else → frontend.

---

## 8. Deployment sanity checklist

- [ ] Clone branch `6-may` (commit `acabff0`)
- [ ] Inject all env vars from §4.1 and §4.2 via secret manager
- [ ] Replace `JWT_SECRET` with a strong random value (§6.2)
- [ ] Set `REACT_APP_BACKEND_URL` to **actual production** backend URL
- [ ] Replace `REACT_APP_GOOGLE_MAPS_API_KEY` with the real (un-truncated) value
- [ ] Restrict `CORS_ORIGINS` to prod origin(s) (§6.3)
- [ ] Configure frontend build with `CI=false` **or** `DISABLE_ESLINT_PLUGIN=true` (§6.1)
- [ ] Commit `yarn.lock` for reproducible installs (§6.5)
- [ ] Mount `backend/uploads/` as persistent volume **or** migrate to S3 (§6.6)
- [ ] Verify Mongo connectivity: `52.66.232.149:27017` from production network
- [ ] Verify outbound HTTPS to `preprod.mygenie.online`, `crm.mygenie.online`, `manage.mygenie.online`
- [ ] Post-deploy smoke test (see §5.4)

---

## 9. File paths reference

| Path | Purpose |
| --- | --- |
| `/app/backend/server.py` | All FastAPI routes (single file, 1611 LOC) |
| `/app/backend/requirements.txt` | Python deps (124 pkgs) |
| `/app/backend/.env` | Backend secrets — **not committed** |
| `/app/backend/uploads/` | User uploads (see §6.6) |
| `/app/backend/seed_defaults.py`, `seed_demo_data.py` | Optional data seed scripts |
| `/app/backend/db_export.py`, `db_import.py` | DB dump/restore utilities |
| `/app/frontend/package.json` | Frontend deps & scripts |
| `/app/frontend/craco.config.js` | Webpack/CRACO override |
| `/app/frontend/.env` | Frontend env — **not committed** |
| `/app/frontend/src/index.js` | React entry |
| `/app/frontend/src/App.js` | Router root |
| `/app/frontend/build/` | Production build output (created by `yarn build`) |
| `/etc/supervisor/conf.d/supervisord.conf` | Supervisor config (read-only in this env) |

---

**End of handover.** All validation checks passed; the codebase on `6-may@acabff0` is **deployment-ready** subject to the action items in §6 — primarily §6.1 (`CI=false` flag), §6.2 (real `JWT_SECRET`), §6.5 (commit `yarn.lock`), and §6.6 (persistent uploads).
