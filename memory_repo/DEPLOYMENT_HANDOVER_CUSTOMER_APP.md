# Deployment Handover — Customer App

> Prepared by the Deployment Preparation Agent. This document is **informational only**.
> No code was modified. No deployment was performed. No commits were pushed.

---

## 1. Repository

- **Repo:** https://github.com/Abhi-mygenie/customer-app5th-march.git
- **Branch:** `main`
- **Latest commit:** `3d67aec Auto-generated changes`
- **Local path:** `/app`
- **Git status:** `nothing to commit, working tree clean` — branch is up to date with `origin/main`.
- **Clone mode:** Cloned fresh into `/app` directly (no nested folder, not cloned into `/tmp`).

---

## 2. Stack Detected

- **Frontend:** React 19 (Create React App + CRACO), built with `craco build`, served as static assets (`frontend/build`).
- **Backend:** Python FastAPI (`backend/server.py`), ASGI via Uvicorn. Mounts `/api/uploads` static dir.
- **Database:** MongoDB (remote, `52.66.232.149:27017`, DB `mygenie`). Async driver: `motor` 3.3.1.
- **Third-party APIs:** MyGenie POS (preprod), MyGenie CRM, Google Maps JS API.

---

## 3. Project Structure

```
/app
├── backend/
│   ├── server.py              # FastAPI entry point (app = FastAPI(...))
│   ├── requirements.txt       # Pinned Python deps
│   ├── seed_defaults.py       # Seeder (reads MONGO_URL/DB_NAME)
│   ├── seed_demo_data.py
│   ├── db_export.py / db_import.py
│   ├── db_export_new/db_export/   # JSON exports for re-seeding
│   ├── uploads/               # Runtime upload dir (auto-created)
│   └── .env                   # NOT in git; created locally from user-provided values
├── frontend/
│   ├── package.json           # packageManager: yarn@1.22.22, scripts: start/build/test
│   ├── craco.config.js        # CRA override
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── public/
│   ├── src/                   # React app (pages, components, context, hooks)
│   ├── build/                 # Produced by `yarn build` (verified in this session)
│   └── .env                   # NOT in git; created locally from user-provided values
├── memory/                    # Project docs (PRD, audits, handovers, specs)
├── tests/                     # Placeholder
├── backend_test.py            # Repo-level test helper
├── test_result.md
├── README.md
└── .gitignore
```

**Deployment-related files present in repo:** none.
- No `Dockerfile`
- No `docker-compose.yml`
- No `Procfile`
- No `.env.example` (neither root, `frontend/`, nor `backend/`)
- No `vite.config.js` (project uses CRA+CRACO, not Vite)

**Entry points:**
- Frontend entry: `frontend/src/index.js` (built via `craco build` → `frontend/build/`).
- Backend entry: `backend/server.py` exposing `app` (run with `uvicorn server:app`).

---

## 4. Environment Variables

Evidence collected from source grep:
- Backend refs: `os.environ['MONGO_URL']`, `os.environ['DB_NAME']`, `os.environ.get('CORS_ORIGINS', '*')`, `os.environ.get('JWT_SECRET')` (fails fast if missing), `os.environ.get('MYGENIE_API_URL')` (fails fast if missing).
- Frontend refs (`process.env.*`): `REACT_APP_API_BASE_URL`, `REACT_APP_BACKEND_URL`, `REACT_APP_IMAGE_BASE_URL`, `REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD`, `REACT_APP_CRM_URL`, `REACT_APP_CRM_API_VERSION`, `REACT_APP_CRM_API_KEY`, `REACT_APP_GOOGLE_MAPS_API_KEY`, `REACT_APP_RESTAURANT_ID`, `NODE_ENV`.

### Frontend Required Env (`/app/frontend/.env`)

| Variable | Required | Status | Evidence / Notes |
|---|---|---|---|
| `REACT_APP_API_BASE_URL` | Yes | **PROVIDED** | Axios baseURL in `src/services/*`. Value: `https://preprod.mygenie.online/api/v1`. Code logs CRITICAL error if missing. |
| `REACT_APP_IMAGE_BASE_URL` | Yes | **PROVIDED** | Used to resolve image URLs. Value: `https://manage.mygenie.online`. |
| `REACT_APP_LOGIN_PHONE` | Yes | **PROVIDED** | Hardcoded login used by auth service. Code logs CRITICAL if missing. |
| `REACT_APP_LOGIN_PASSWORD` | Yes | **PROVIDED** | Hardcoded login used by auth service. Code logs CRITICAL if missing. |
| `REACT_APP_CRM_URL` | Yes | **PROVIDED** | Value: `https://crm.mygenie.online/api`. Code logs CRITICAL if missing. |
| `REACT_APP_CRM_API_VERSION` | Yes | **PROVIDED** | Value: `v2`. Defaults to `v1` if missing. |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Yes | **PROVIDED** | Value: `AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4`. Maps features break without it. |
| `WDS_SOCKET_PORT` | Dev only | **PROVIDED** | Value: `443`. Affects `yarn start`/HMR only, not prod build. |
| `ENABLE_HEALTH_CHECK` | Dev only | **PROVIDED** | Value: `false`. |
| `REACT_APP_BACKEND_URL` | **Yes (production)** | **MISSING_FROM_USER** | Referenced in: `src/pages/Login.jsx`, `src/pages/LoyaltyCustomerCapture.jsx`, `src/components/LandingCustomerCapture/LandingCustomerCapture.jsx`, `src/services/ordersService.js` (uses it for `/api/customer-lookup`, `/api/loyalty-settings`, `/api/customer/order/update-customer-order`). Falls back to `''` in some places (builds OK) but runtime HTTP calls will fail. **Required for this FastAPI backend to be reachable from the frontend in production.** |
| `REACT_APP_CRM_API_KEY` | **Yes** | **MISSING_FROM_USER** | JSON object keyed by `restaurantId` → `apiKey`. Code warns `[CRM] Failed to parse REACT_APP_CRM_API_KEY as JSON` when malformed/missing. CRM-authenticated calls will fail without it. |
| `REACT_APP_RESTAURANT_ID` | Optional | Not provided | Optional override. If missing, restaurantId must come from route/login flow. |
| `NODE_ENV` | Set by build tool | n/a | Set automatically by `craco build` to `production`. |

### Backend Required Env (`/app/backend/.env`)

| Variable | Required | Status | Evidence / Notes |
|---|---|---|---|
| `MONGO_URL` | Yes | **PROVIDED** | `backend/server.py:23` — `os.environ['MONGO_URL']`. KeyError if missing. Value points to `mongodb://...@52.66.232.149:27017/mygenie`. |
| `DB_NAME` | Yes | **PROVIDED** | `backend/server.py:25` — `client[os.environ['DB_NAME']]`. Value: `mygenie`. |
| `JWT_SECRET` | Yes | **PROVIDED** | `backend/server.py:28-30` — raises `CRITICAL: JWT_SECRET environment variable must be set` if missing. |
| `MYGENIE_API_URL` | Yes | **PROVIDED** | `backend/server.py:38-40` — raises `CRITICAL: MYGENIE_API_URL environment variable must be set` if missing. Value: `https://preprod.mygenie.online/api/v1`. |
| `CORS_ORIGINS` | Optional | **PROVIDED** | Defaults to `*`. Value: `*`. **For production, recommend restricting to exact frontend origin(s) (e.g., `https://<frontend-host>`).** |
| `PORT` | Optional | Not required by code | FastAPI/Uvicorn gets port from CLI (`--port`). The deployment platform (PaaS) may inject `PORT`; if so, launch command must honor it (e.g., `uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}`). |

### MongoDB Configuration

| Key | Status | Evidence / Notes |
|---|---|---|
| Driver | **Present** | `motor==3.3.1` in `requirements.txt`; `pymongo==4.5.0`. |
| Connection string | **Provided** | `MONGO_URL=mongodb://mygenie_admin:<password>@52.66.232.149:27017/mygenie`. **Reachability from the deployment target was NOT verified** (no write/test queries run per the mandatory rules). |
| DB name | **Provided** | `DB_NAME=mygenie`. Code: `client[os.environ['DB_NAME']]`. |
| Auth | **In connection string** | User `mygenie_admin`. Password embedded. Recommend using managed secrets in production; consider moving credentials to platform secret store. |
| Network access | **Unverified** | Mongo host is a raw public IP (`52.66.232.149`). The deployment platform must have egress to that IP:port. IP allow-listing on the Mongo server (if any) may need updating for the new deployment's egress IPs. |

---

## 5. Commands Run

1. `rm -rf /app/* /app/.[!.]* /app/..?*` — wiped `/app` contents (the mountpoint `/app` itself cannot be `rm -rf`'d, so contents were cleared).
2. `cd /app && git clone https://github.com/Abhi-mygenie/customer-app5th-march.git .` — fresh clone directly into `/app` (no nested folder, not in `/tmp`).
3. `git checkout main` — already on `main`.
4. `git pull origin main` — already up to date.
5. `git status` — clean tree.
6. `git log -1 --oneline` → `3d67aec Auto-generated changes`.
7. Repo structure inspection (`ls`, `find`, `grep`).
8. Created `/app/backend/.env` from user-provided values (MONGO_URL, DB_NAME, CORS_ORIGINS, JWT_SECRET, MYGENIE_API_URL).
9. Created `/app/frontend/.env` from user-provided values (REACT_APP_* set listed above).
10. `cd /app/frontend && yarn install` — completed in 70s, lockfile saved, peer-dep warnings only.
11. `cd /app/frontend && CI=false yarn build` — **completed successfully** in 52.83s (`Compiled with warnings` — non-blocking React hook exhaustive-deps warnings).
12. `cd /app/backend && pip install -r requirements.txt` — completed, all deps installed.
13. `cd /app/backend && python -m compileall -q .` — exit 0 (no syntax errors).
14. `cd /app/backend && python -c "import server; print(server.app)"` — `IMPORT_OK: True`, 47 routes registered.
15. `cd /app/backend && uvicorn server:app --host 0.0.0.0 --port 8099` (5-second probe) — server started, `GET /api/` returned **HTTP 200**.

---

## 6. Frontend Build Result

- **Frontend path:** `/app/frontend`
- **Package manager:** `yarn` (declared via `packageManager: yarn@1.22.22+sha512...`)
- **Install command:** `yarn install`
- **Build command:** `CI=false yarn build` (runs `craco build`)
  - `CI=false` recommended: CRA treats warnings as errors when `CI=true`. Build produces only warnings (no errors), so default `yarn build` should also succeed on most PaaS, but CI-strict platforms (Netlify, Vercel under CI=true) may fail — set `CI=false` or fix warnings.
- **Status:** **PASSED** — `Compiled with warnings.` / `The build folder is ready to be deployed.`
- **Bundle sizes (gzip):**
  - `build/static/js/main.691a2b7f.js` — **470.61 kB**
  - `build/static/css/main.246b5d33.css` — **35.6 kB**
- **Build output folder:** `/app/frontend/build` (size ~48 MB before gzip, includes `asset-manifest.json`, `index.html`, `static/`, `assets/`)
- **Errors:** None.
- **Warnings:** 19 `react-hooks/exhaustive-deps` warnings across:
  - `src/components/LandingCustomerCapture/LandingCustomerCapture.jsx:29`
  - `src/context/AdminConfigContext.jsx:176`
  - `src/context/CartContext.js:121 (x3), :287`
  - `src/context/RestaurantConfigContext.jsx:174, :302`
  - `src/hooks/useNotificationPopup.js:72`
  - `src/pages/AboutUs.jsx:18`
  - `src/pages/AdminSettings.jsx:211`
  - `src/pages/ContactPage.jsx:17`
  - `src/pages/DeliveryAddress.jsx:123`
  - `src/pages/FeedbackPage.jsx:22`
  - `src/pages/OrderSuccess.jsx:357, :379`
  - `src/pages/Profile.jsx:51`
  - `src/pages/ReviewOrder.jsx:272, :321`

  All are **non-blocking** hook dependency warnings. They do NOT prevent deployment.

- **Yarn peer-dep warnings (install-time, non-blocking):** unmet peer deps for `@tiptap/core@3.22.5`, `@tiptap/pm@3.22.5`, `@floating-ui/dom`, `react-day-picker` expects `date-fns@^2||^3` but `^4.1.0` is installed, `recharts` peer `react-is`, `eslint-plugin-flowtype` babel peers, `@babel/plugin-proposal-private-property-in-object` peer. These have not caused build failures but should be monitored.

---

## 7. Backend Compile / Run Result

- **Backend path:** `/app/backend`
- **Python version:** `Python 3.11.15`
- **Dependency file:** `/app/backend/requirements.txt` (fully pinned, includes `fastapi==0.110.1`, `uvicorn==0.25.0`, `motor==3.3.1`, `pymongo==4.5.0`, `PyJWT==2.11.0`, `python-dotenv==1.2.1`, etc.)
- **Install command:** `pip install -r requirements.txt`
  - Install completed without errors in this environment. Dependency list is large and includes heavy libs (`pandas`, `google-genai`, `numpy`, `emergentintegrations`) — plan for ~200–400 MB image size; container build time ~60–120s with cache misses.
- **Compile command:** `python -m compileall -q .` — **exit 0** (no syntax errors).
- **Compile status:** **PASSED**
- **Start command identified:** `uvicorn server:app --host 0.0.0.0 --port <PORT>` (run from `/app/backend`).
  - No `main.py` / `app.py` / `manage.py` / `Procfile` / `Dockerfile` in repo. Entry module is `server` exposing `app`.
  - Default port convention for this repo (per `.emergent` config) is **8001**. Production platforms should substitute their injected `$PORT` if any.
- **Startup check status (attempted):** **PASSED**
  - Started uvicorn on port 8099 with provided `.env`.
  - Logs: `Started server process`, `Application startup complete`.
  - `GET http://localhost:8099/api/` → **HTTP 200**.
  - FastAPI registered **47 routes**.
- **Errors:** None.
- **Warnings:** None at startup. (Note: MongoDB network reachability was not exercised because no query was issued; motor connects lazily on first DB call.)
- **Missing env blockers:** None for backend startup — all required backend vars were provided by the user.

---

## 8. Deployment Readiness

- **Ready / Not Ready:** **Ready with warnings.**
  Frontend builds and backend starts successfully with the env values supplied. Two frontend env values referenced by code were not supplied by the user and should be provided before production cutover.

- **Blockers (must resolve before production):**
  1. **`REACT_APP_BACKEND_URL` is MISSING_FROM_USER.** Required so the frontend can reach this FastAPI backend (`/api/customer-lookup/*`, `/api/loyalty-settings/*`, `/api/customer/order/*`). Must be set to the **deployed backend's public base URL** (e.g., `https://<backend-host>`) **at build time** (CRA bakes env vars into the bundle).
  2. **`REACT_APP_CRM_API_KEY` is MISSING_FROM_USER.** JSON-encoded `{ "<restaurantId>": "<apiKey>" }` — required for CRM-authenticated flows.

- **Missing env:**
  - Frontend: `REACT_APP_BACKEND_URL`, `REACT_APP_CRM_API_KEY`. Optional: `REACT_APP_RESTAURANT_ID`.
  - Backend: none missing from provided values.

- **Risk areas:**
  - **Frontend env is build-time embedded.** Any env change requires a rebuild. Document your platform's build-command env handling.
  - **`CORS_ORIGINS=*`** in production is permissive. Recommend restricting to exact frontend origin(s).
  - **MongoDB credentials embedded in `MONGO_URL`.** Move to platform secret store. Verify the deployment platform's egress can reach `52.66.232.149:27017` (raw IP, not a hostname — may require IP allow-list update on the Mongo side).
  - **External dependencies the app hits:** `https://preprod.mygenie.online/api/v1`, `https://crm.mygenie.online/api`, `https://manage.mygenie.online`, Google Maps JS API. These must be reachable from the client's and/or server's network.
  - **Heavy backend deps** (`pandas`, `numpy`, `google-genai`, `emergentintegrations`, `boto3`, `stripe`, `litellm`) increase image size and cold-start time. Consider a slim runtime image or multi-stage Docker build.
  - **No Dockerfile / Procfile / compose file** in the repo. The deployment target must be configured manually (build + start commands shown below).
  - **No `.env.example`** shipped. Operational drift risk — ensure the next agent / ops owner has the canonical env list (this document).
  - **Frontend login credentials are env-embedded** (`REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD`). These get compiled into the public JS bundle and are effectively public. This is an architectural finding (NOT a code change performed here).
  - **Upload dir `backend/uploads/`** is local filesystem. On ephemeral PaaS (Heroku, Fly, container scale-out) this will be lost on restart. Consider persistent volume or S3 (boto3 already in deps).

- **Notes:**
  - Build was verified with `CI=false`. Platforms that run CRA builds with `CI=true` (treating warnings as errors) must either set `CI=false` or the warnings must be fixed.
  - 19 React hook dependency warnings exist but do not block deployment.
  - Git tree is clean; latest commit `3d67aec` deployed from `main`.

---

## 9. Recommended Deployment Steps for Next Agent

> **Do not deploy from this agent's environment.** These are prescriptive steps for the deployment agent.

### 9.1 Prerequisites / secrets to collect

- `REACT_APP_BACKEND_URL` = public URL of the deployed FastAPI backend (e.g., `https://<backend-domain>`).
- `REACT_APP_CRM_API_KEY` = JSON string, e.g., `{"478":"<apiKey>","<restaurantId2>":"<apiKey2>"}`.
- Confirm `REACT_APP_RESTAURANT_ID` is needed or if restaurant is derived from login.
- Mongo egress from the deployment platform to `52.66.232.149:27017` (or switch `MONGO_URL` to a managed Mongo cluster; update IP allow-list accordingly).
- Decide production value for `CORS_ORIGINS` (set to the frontend host).

### 9.2 Backend deploy (FastAPI)

1. **Runtime:** Python 3.11.
2. **Source:** `/backend` subdir of the repo.
3. **Install:** `pip install --no-cache-dir -r requirements.txt`
4. **Env (set on the platform):**
   - `MONGO_URL` (secret)
   - `DB_NAME=mygenie`
   - `JWT_SECRET` (secret)
   - `MYGENIE_API_URL=https://preprod.mygenie.online/api/v1` (or the correct prod URL)
   - `CORS_ORIGINS=https://<frontend-host>` (restrict for prod)
   - `PORT` if your platform requires explicit port binding.
5. **Start command:** `uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}`
6. **Working directory:** `/backend` of the repo root.
7. **Health check:** `GET /api/` (returns 200 when ready).
8. **Persistent storage:** mount a writable volume at `backend/uploads` OR migrate uploads to S3.

### 9.3 Frontend deploy (React/CRA + CRACO)

1. **Runtime:** Node 18+ with yarn 1.22.x.
2. **Source:** `/frontend` subdir.
3. **Env (set BEFORE build — CRA bakes env into bundle):**
   - `REACT_APP_API_BASE_URL=https://preprod.mygenie.online/api/v1` (or prod equivalent)
   - `REACT_APP_BACKEND_URL=https://<deployed-backend-host>`   *(collect from ops)*
   - `REACT_APP_IMAGE_BASE_URL=https://manage.mygenie.online`
   - `REACT_APP_LOGIN_PHONE=+919579504871`
   - `REACT_APP_LOGIN_PASSWORD=Qplazm@10`
   - `REACT_APP_CRM_URL=https://crm.mygenie.online/api`
   - `REACT_APP_CRM_API_VERSION=v2`
   - `REACT_APP_CRM_API_KEY=<JSON string>`                      *(collect from ops)*
   - `REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4`
   - `CI=false`  *(or pre-approve existing warnings)*
4. **Install:** `yarn install --frozen-lockfile`
5. **Build:** `yarn build`
6. **Publish/serve:** static files in `frontend/build/` — deploy behind a CDN or static host (Nginx, S3+CloudFront, Netlify, Vercel, etc.).
7. **SPA routing:** rewrite all non-asset paths to `/index.html` (React Router client-side routes).

### 9.4 Post-deploy verification

1. `curl https://<backend-host>/api/` → expect **200**.
2. Open frontend in browser, check DevTools Network: API calls should hit `REACT_APP_BACKEND_URL` and `REACT_APP_API_BASE_URL` as expected.
3. Verify Mongo connectivity by exercising a login or config-fetch endpoint.
4. Confirm uploads endpoint works and files persist across restart (if persistent storage was configured).
5. Confirm CRM and MyGenie POS calls succeed (requires real `REACT_APP_CRM_API_KEY`).

---

## 10. Final Verdict

**`deployment_ready_with_warnings`**

Rationale:
- Code compiles and runs end-to-end (frontend build ✅, backend compile ✅, backend startup probe ✅ HTTP 200).
- All backend-critical env vars are supplied.
- Two frontend env vars required by code paths (`REACT_APP_BACKEND_URL`, `REACT_APP_CRM_API_KEY`) were not supplied — they must be set before production build.
- No Dockerfile/Procfile shipped; the deployment agent must configure build/start commands as documented above.
- MongoDB reachability from the deployment platform was NOT verified (per mandatory "no destructive DB" rule).
- 19 non-blocking React Hook dependency warnings.
