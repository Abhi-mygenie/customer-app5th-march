# Deployment Handover Document
**Project:** Customer App (MyGenie)
**Prepared by:** E1 (Emergent) — Pre-Deployment Validation Agent
**Date:** 2026-01
**Target audience:** Next deployment agent / DevOps engineer

---

## 1. Source of Truth

| Item | Value |
|---|---|
| GitHub repo | https://github.com/Abhi-mygenie/customer-app5th-march.git |
| Branch used | `main` (confirmed — user approved) |
| Latest commit SHA | `4f8b3f8ce0b28fbf9c0b7588bf396d4151ded695` |
| Short SHA | `4f8b3f8` |
| Commit author | emergent-agent-e1 |
| Commit date | Thu Jun 18 18:36:18 2026 +0000 |
| Commit message | `Auto-generated changes` |
| Code location on server | `/app/` (repo contents overlaid onto `/app`) |

> The repo has **many branches** (200+). Only `main` was used per user confirmation.

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Python + FastAPI | fastapi 0.110.1 |
| Backend server | Uvicorn (via supervisor) | 0.25.0 |
| Backend DB driver | Motor (async MongoDB) + PyMongo | motor 3.3.1 / pymongo 4.5.0 |
| Database | MongoDB (remote — 52.66.232.149:27017, DB=`mygenie`) | — |
| Frontend | React 19 + CRA + CRACO | react 19, react-scripts 5.0.1, @craco/craco 7.1.0 |
| Package manager (FE) | **yarn** (NOT npm) | yarn 1.22.22 |
| Node version tested | 20.20.2 | — |
| Python version tested | 3.11 | — |

---

## 3. Repository Layout

```
/app
├── backend/
│   ├── server.py            (~64k — single-file FastAPI app, all routes)
│   ├── requirements.txt     (123 pinned deps)
│   ├── seed_defaults.py
│   ├── seed_demo_data.py
│   ├── db_import.py / db_export.py
│   ├── uploads/             (runtime uploaded files — needs persistent volume in prod)
│   └── .env                 (NOT committed — created during setup, see §5)
├── frontend/
│   ├── package.json
│   ├── craco.config.js
│   ├── tailwind.config.js
│   ├── src/
│   ├── public/
│   ├── plugins/             (visual-edits + health-check — DISABLED by default)
│   └── .env                 (NOT committed — created during setup, see §5)
├── tests/
├── test_reports/
└── memory_repo/
```

Notes:
- **No `Dockerfile`, `docker-compose.yml`, or `Procfile`** exists in the repo.
- **No `.env.example`** committed. Env vars must be provisioned externally.

---

## 4. Build & Compile Validation Results

### 4.1 Backend
| Check | Command | Result |
|---|---|---|
| Dependency install | `pip install -r /app/backend/requirements.txt` | ✅ PASS |
| Import compile | `python -c "import server"` | ✅ PASS |
| Uvicorn boot (supervisor) | `sudo supervisorctl restart backend` | ✅ RUNNING (pid stable, no crash) |
| API smoke test | `GET /api/` → `{"message":"Customer App API"}` | ✅ 200 OK |
| OpenAPI route count | `/openapi.json` | ✅ 38 routes exposed |
| MongoDB connectivity | `ping` against `52.66.232.149:27017` DB `mygenie` | ✅ `{'ok': 1.0}` (10+ collections present) |

### 4.2 Frontend
| Check | Command | Result |
|---|---|---|
| Dependency install | `yarn install` | ✅ PASS (only peer-dep warnings, no errors) |
| Dev server (supervisor) | `craco start` on port 3000 | ✅ RUNNING (HTTP 200) |
| **Production build** | `CI=false yarn build` | ✅ **PASS** — build folder ready |
| Bundle size (gzip) | `main.js` 512.04 kB / `main.css` 37.58 kB | ⚠️ JS bundle is on the large side — consider code-splitting in future |
| ESLint | Multiple `react-hooks/exhaustive-deps` warnings | ⚠️ Warnings only, no errors. Must build with `CI=false` (default CRA treats warnings as errors under CI=true). |

### 4.3 Known Blockers/Notes for CI Deployment
- **`CI=false` required for production build** — many pre-existing `react-hooks/exhaustive-deps` warnings will fail the build under CRA's default `CI=true` behavior on most cloud build platforms (Vercel, Netlify, GitHub Actions default). Either:
  - Set `CI=false` in build environment (recommended for immediate deploy), OR
  - Fix the ESLint warnings in code (long-term fix). List of affected files below.
- **Files with ESLint warnings** (informational, not blocking with `CI=false`):
  - `src/pages/AboutUs.jsx`, `AdminSettings.jsx`, `ContactPage.jsx`, `DeliveryAddress.jsx`, `FeedbackPage.jsx`, `OrderSuccess.jsx`, `Profile.jsx`, `ReviewOrder.jsx`
  - One popup component: missing `popup` dep in useEffect
- **`node_modules/.cache` sometimes corrupt on first supervisor boot** — clear with `rm -rf /app/frontend/node_modules/.cache` if `craco start` fails with `ENOENT ... 0.pack`.

---

## 5. Required Environment Variables

### 5.1 Backend — `/app/backend/.env`
```env
MONGO_URL=mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie
DB_NAME=mygenie
CORS_ORIGINS=*
JWT_SECRET=<GENERATE-STRONG-RANDOM-SECRET>
MYGENIE_API_URL=https://preprod.mygenie.online/api/v1
```

**Backend fail-fast checks (verified in `server.py`):**
- `MONGO_URL` — required, no fallback
- `DB_NAME` — required, no fallback
- `JWT_SECRET` — required, raises `ValueError` if missing
- `MYGENIE_API_URL` — required, raises `ValueError` if missing

> ⚠️ **User-provided `.env` had a typo:** `MONGO_URL=MONGO_URL=mongodb://...` (duplicated key prefix). **This has been corrected** to a single `MONGO_URL=` in `/app/backend/.env`.
>
> ⚠️ **`JWT_SECRET` was provided as literal placeholder `any random key`.** For production, generate a strong random 32+ byte secret, e.g. `openssl rand -hex 32`. Current value in `.env` is a placeholder and MUST be rotated before production deploy.
>
> ⚠️ MongoDB credentials are embedded in the URI. Prefer secret-manager injection over checked-in `.env` for production.

### 5.2 Frontend — `/app/frontend/.env`
```env
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
REACT_APP_IMAGE_BASE_URL=https://manage.mygenie.online
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/api/v1
REACT_APP_LOGIN_PHONE=+919579504871
REACT_APP_LOGIN_PASSWORD=Qplazm@10
REACT_APP_CRM_URL=https://crm.mygenie.online/api
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
REACT_APP_CRM_API_VERSION=v2
REACT_APP_BACKEND_URL=http://localhost:8001
```

- `REACT_APP_BACKEND_URL` was added by E1 (not in user's supplied env). Value must be **the public URL where FastAPI is reachable** in prod (e.g. `https://api.mygenie.online`). Currently set to `http://localhost:8001` — **CHANGE FOR PROD**.
- `REACT_APP_LOGIN_PHONE` / `REACT_APP_LOGIN_PASSWORD` are **hardcoded test credentials in the frontend bundle** — will be visible in shipped JS. Confirm with product/security whether this is intentional for pre-prod only. Remove for production.
- `REACT_APP_GOOGLE_MAPS_API_KEY` should be domain-restricted in Google Cloud Console before production.

---

## 6. Runtime / Supervisor Configuration

Both services are managed by supervisor (already configured in the container):

| Service | Command | Port | Autostart |
|---|---|---|---|
| `backend` | `uvicorn server:app --host 0.0.0.0 --port 8001 --reload` | 8001 | yes |
| `frontend` | `yarn start` (→ `craco start`) | 3000 | yes |
| `mongodb` | local mongod (unused; app connects to remote) | 27017 | yes |

**Verified working commands:**
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl status         # all should be RUNNING
tail -n 100 /var/log/supervisor/backend.err.log
tail -n 100 /var/log/supervisor/frontend.err.log
```

---

## 7. Backend Endpoints (spot-checked)

Total: **38 API routes** exposed under `/api`. Highlights:

- **Auth:** `/api/auth/send-otp`, `/api/auth/check-customer`, `/api/auth/login`, `/api/auth/me`, `/api/auth/set-password`, `/api/auth/verify-password`, `/api/auth/reset-password`
- **Customer:** `/api/customer/profile`, `/api/customer/orders`, `/api/customer/points`
- **Config:** `/api/config`, `/api/table-config`, `/api/loyalty-settings/{restaurant_id}`, `/api/customer-lookup/{restaurant_id}`
- **Static uploads:** `/api/uploads/*` (served from `backend/uploads/`)

Health check available via `GET /api/` (returns `{"message":"Customer App API"}`).
There is **no dedicated `/api/health` endpoint** (`/api/diagnostics/health` returns 404). Consider adding one before deploy so load balancers/K8s probes have a proper target.

---

## 8. Pre-Deployment Checklist for Next Agent

Before deploying to production, next agent MUST:

- [ ] **Rotate `JWT_SECRET`** — current value is a placeholder (`any random key`-style). Generate with `openssl rand -hex 32`.
- [ ] **Set `REACT_APP_BACKEND_URL`** to the real production API URL (currently `http://localhost:8001`).
- [ ] **Restrict `CORS_ORIGINS`** — currently `*`. Set to exact frontend origin(s) for prod.
- [ ] **Confirm intent** of `REACT_APP_LOGIN_PHONE` + `REACT_APP_LOGIN_PASSWORD` shipping in the frontend bundle. Remove for prod if unintended.
- [ ] **Provision persistent volume for `/app/backend/uploads/`** — otherwise uploaded customer files are lost on redeploy.
- [ ] **Move MongoDB credentials out of `.env`** into a secrets manager (Vault / AWS SM / K8s secrets). The URI currently contains a plaintext password.
- [ ] **Firewall / restrict MongoDB** at `52.66.232.149:27017` — verify it is not open to public internet.
- [ ] **Domain-restrict Google Maps API key** in GCP console.
- [ ] Set `CI=false` in the frontend build step OR fix ESLint warnings in the files listed in §4.3.
- [ ] Add a proper `/api/health` endpoint or use `/api/` as the probe target.
- [ ] Decide on deployment target (Docker? K8s? PM2? bare uvicorn? nginx static?) — repo has **no Dockerfile / no Procfile**. Recommend creating one during deploy.

---

## 9. Quick Reproduction (Local / Fresh Container)

```bash
# 1. Clone
git clone -b main https://github.com/Abhi-mygenie/customer-app5th-march.git /app

# 2. Backend
cd /app/backend
pip install -r requirements.txt
# create .env per §5.1
python -c "import server"           # compile check
uvicorn server:app --host 0.0.0.0 --port 8001

# 3. Frontend
cd /app/frontend
yarn install
# create .env per §5.2
yarn start                           # dev on :3000
CI=false yarn build                  # prod bundle in build/
```

---

## 10. Status Summary

| Component | Status |
|---|---|
| Latest code pulled (main) | ✅ Done — SHA `4f8b3f8` |
| Backend install | ✅ Success |
| Backend compile | ✅ Success |
| Backend runtime | ✅ Running on :8001 |
| MongoDB connectivity | ✅ Reachable, 10+ collections found |
| Frontend install | ✅ Success (peer-dep warnings only) |
| Frontend dev boot | ✅ Running on :3000 |
| Frontend production build | ✅ Success (with `CI=false`) |
| Env vars documented | ✅ Documented (see §5) |
| Env `.env` typo fixed | ✅ `MONGO_URL=MONGO_URL=...` → `MONGO_URL=...` |
| Deployment blockers identified | ✅ See §8 checklist |

**Overall verdict:** ✅ **App is build-ready and compile-ready.** Deployment is safe to proceed **after** the §8 checklist is executed (particularly JWT_SECRET rotation, REACT_APP_BACKEND_URL, CORS lockdown, and MongoDB secret handling).
