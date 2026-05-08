# Deployment Handover — `customer-app5th-march`

**Prepared on:** 2026-05-06 (UTC)
**Prepared by:** Validation / handover agent (Emergent E1)
**For:** Next deployment agent
**Branch validated:** `latest-hyatt-fixes-7-may`
**Supersedes:** previous handover for branch `7-may@9ab9781`

---

## 0. TL;DR for the next agent

| | |
| --- | --- |
| **Branch to deploy** | `latest-hyatt-fixes-7-may` (confirmed exists on remote — see §1) |
| **HEAD commit** | `250af5bae9d02ab43d9ca848a43fb05bb5794526` (short: `250af5b`) |
| **HEAD message** | `Auto-generated changes` |
| **HEAD author** | `emergent-agent-e1 <github@emergent.sh>` |
| **Last remote commit (UTC)** | **`2026-05-06 17:42:29 +0000`** |
| **Last remote commit (IST)** | `2026-05-06 23:12:29 +0530` |
| **Code delta vs `7-may`** | **8 source files changed** in `frontend/`, **1 backend change** (additive only), **0 new env vars**, **0 new deps**. See §1.1 |
| **Build readiness** | ✅ Backend ready · ✅ Frontend ready (use `CI=false` for prod build — 19 ESLint warnings, all non-blocking, see §6.1) |
| **Critical action items before deploy** | §6.1 (`CI=false`), §6.2 (real `JWT_SECRET`), §6.3 (commit yarn.lock), §6.4 (CORS), §6.5 (persistent uploads), §6.6 (DB credential rotation) |

> ⏱ User asked for the **last remote date and time** before deploying — it is **`2026-05-06 17:42:29 UTC` (`23:12:29 IST`)** on `origin/latest-hyatt-fixes-7-may`.

---

## 1. Source

| Item | Value |
| --- | --- |
| Repo | `https://github.com/Abhi-mygenie/customer-app5th-march.git` |
| Visibility | Public (clone works without auth) |
| Branch validated | **`latest-hyatt-fixes-7-may`** ✅ (exact match — exists on remote) |
| HEAD commit | `250af5b` — *Auto-generated changes* |
| HEAD timestamp | **`2026-05-06 17:42:29 UTC`** / `23:12:29 IST` |
| Total remote branches seen | 35 |
| Default branch (origin/HEAD) | `main` |
| Clone command | `git clone -b latest-hyatt-fixes-7-may https://github.com/Abhi-mygenie/customer-app5th-march.git` |

**Recent commit log on `latest-hyatt-fixes-7-may` (most recent first):**

```
250af5b  2026-05-06 17:42:29 UTC  Auto-generated changes      ← HEAD (last remote)
57f3e95  2026-05-06 17:42:06 UTC  Auto-generated changes
0cf2af9  2026-05-06 17:41:40 UTC  Auto-generated changes
41e844d  2026-05-06 17:41:35 UTC  Auto-generated changes
4a6998e  2026-05-06 17:38:57 UTC  Auto-generated changes
cada3c2  2026-05-06 17:30:13 UTC  auto-commit for 428161c2-...
0512030  2026-05-06 17:21:12 UTC  auto-commit for 7d019f0f-...
ce4defb  2026-05-06 17:14:09 UTC  auto-commit for 02532201-...
8366f76  2026-05-06 16:55:34 UTC  auto-commit for fd1b60bc-...
7450332  2026-05-06 16:20:54 UTC  auto-commit for 15fb0e84-...
70074aa  2026-05-06 16:01:27 UTC  auto-commit for e0b8cbce-...
26896ea  2026-04-30 09:45:26 UTC  Initial commit
```

> The user asked to confirm the branch name before deployment. **Branch `latest-hyatt-fixes-7-may` exists verbatim on the remote.** Adjacent branches present: `7-may`, `hyatt-fixes-7-may`. Use the `latest-` prefixed one as instructed.

### 1.1 Code delta `origin/7-may` → `origin/latest-hyatt-fixes-7-may`

Source-code changes (excluding test reports, screenshots, `memory/*` notes, `DEPLOYMENT_HANDOVER.md`, `test_result.md`):

| File | Change | Risk |
| --- | --- | --- |
| `backend/server.py` | **+3 / -0** — Adds two optional fields `successTitle`, `successMessage` to `AppConfigUpdate` Pydantic model. UI falls back to defaults when blank. | **Low** — purely additive, no migration needed. |
| `frontend/src/pages/admin/AdminSettingsPage.jsx` | **+33 / -0** — New "Order Success Page Text" admin section (inputs for `successTitle` / `successMessage`). New `data-testid`s: `input-successTitle`, `input-successMessage`. | Low — additive UI. |
| `frontend/src/pages/OrderSuccess.jsx` | **+9 / -1** — Reads `successTitle` / `successMessage` from config with default fallbacks. | Low. |
| `frontend/src/pages/OrderSuccess.css` | -2 lines (cleanup). | None. |
| `frontend/src/context/RestaurantConfigContext.jsx` | **+30 / -2** — Persists/exposes `successTitle` & `successMessage` plus minor caching tweak. | Low. |
| `frontend/src/context/AdminConfigContext.jsx` | +3 / -0 — Mirror of above. | Low. |
| `frontend/src/components/NotificationPopup/NotificationPopup.jsx` | +14 / -4 — Hyatt-specific notification popup tweaks. | Low. |
| `frontend/src/pages/LandingPage.jsx` | +6 / -2 — Layout / config tweak. | Low. |
| `frontend/src/pages/ReviewOrder.jsx` | +6 / -1 — Minor config plumbing. | Low. |
| `frontend/public/index.html` | **+112 / -2** — Injects extra `<meta>`, OG tags, preload/prefetch hints, and likely Hyatt branding/icon links. | **Medium** — verify any third-party script URLs/CDNs are reachable from the deployment network (no new outbound endpoints introduced beyond MyGenie/CRM/CDN). |
| `.gitignore` | +30 / -3 — Tightens env/credential exclusions. | None. |
| `.emergent/emergent.yml` | Updated `job_id` and `created_at`. | None. |
| `repo` | -1 line (file removed). | None. |

**No changes** to: `backend/requirements.txt`, `backend/seed_*.py`, `frontend/package.json`, `frontend/craco.config.js`, `frontend/tailwind.config.js`, any `.env` keys read at runtime (see §4).

➡ **Build/install/runtime validations from `7-may` carry over unchanged. No new dependencies, no new env vars.**

---

## 2. Application overview

A multi-tenant **Customer App** for restaurants on the MyGenie platform. Customers scan a restaurant QR → land on the app → browse menu → place / edit orders → earn loyalty points. Restaurant admins log in to configure branding, visibility, banners, dietary tags, QR/table config, etc.

| Layer | Tech |
| --- | --- |
| **Frontend** | React 19 + CRA 5 + **CRACO** + TailwindCSS + shadcn / Radix UI. Build tool `craco` (scripts in `frontend/package.json`). Package manager **yarn 1.22.22** (pinned via `packageManager`) — **do not use npm**. |
| **Backend** | FastAPI on **uvicorn**, port **8001**. Single-file API (`backend/server.py`, ~1610 LOC, **47 routes** total / **43 prefixed `/api`**). Async Mongo via `motor`. JWT (HS256) for auth. |
| **Database** | Remote MongoDB `52.66.232.149:27017`, db `mygenie`, **23+ collections** confirmed. |
| **Upstream APIs** called by backend/frontend | MyGenie POS API (`https://preprod.mygenie.online/api/v1`), MyGenie CRM (`https://crm.mygenie.online/api`), image CDN (`https://manage.mygenie.online`). |

Static uploads mounted at `/api/uploads/*` (served from `backend/uploads/`). **Do not wipe that folder on redeploys** — see §6.5.

---

## 3. Validation results — performed on `latest-hyatt-fixes-7-may@250af5b`

### 3.1 Backend — ✅ READY

| Check | Result |
| --- | --- |
| `pip install -r requirements.txt` (123 pkgs) | ✅ Success |
| `python -m py_compile backend/server.py` | ✅ Success |
| `python -c "from server import app"` | ✅ Success — **47 routes** registered (43 `/api/*` + 4 mounts/root) |
| `ruff check server.py` | ⚠ 3 minor `F401` unused-import warnings (non-blocking, auto-fixable): `FileResponse`, `hashlib`, `shutil` |
| MongoDB connectivity (`pymongo` ping to `52.66.232.149:27017`) | ✅ `{ok: 1.0}` — collections include `customers`, `coupons`, `customer_app_config`, `loyalty_settings`, `customer_otps`, `feedback`, `automation_rules`, `cron_job_logs`, `custom_templates`, `dietary_tags_mapping`, … |
| Uvicorn boot (`uvicorn server:app --port 8765`) | ✅ Process started, listening |
| `GET /api/` | ✅ `200 {"message":"Customer App API"}` |
| `GET /api/config/698` | ✅ `200` — restaurant 698 config returned |
| `GET /api/dietary-tags/available` | ✅ `200` — tag list returned |

> Backend reads exactly four env vars: `MONGO_URL` (required), `DB_NAME` (required), `JWT_SECRET` (required — `raise ValueError` if missing), `MYGENIE_API_URL` (used by upstream calls), `CORS_ORIGINS` (defaults to `*`).

### 3.2 Frontend — ✅ READY (with `CI=false`)

| Check | Result |
| --- | --- |
| `yarn install` (no frozen lockfile — see §6.3) | ✅ Success in 59s. Some non-blocking peer-dep warnings from `@tiptap/*`, `react-day-picker`, `recharts` (existing, unchanged). |
| `CI=false yarn build` | ✅ Success in 55s |
| Output bundle | `build/static/js/main.7cb5cb11.js` = **488.07 kB gzip**, `build/static/css/main.709fc057.css` = **35.64 kB gzip** |
| `index.html` generated | ✅ |
| ESLint warnings during build | ⚠ **19** `react-hooks/exhaustive-deps` warnings (all warnings, no errors). With default `CI=true` (CRA behavior) they would be promoted to errors and **break the build** — hence the `CI=false` requirement. List spans: `OrderSuccess.jsx`, `RestaurantConfigContext.jsx`, `Profile.jsx`, `ReviewOrder.jsx`, `DeliveryAddress.jsx`, `Cart`, `AdminSettings`, `AboutUs`, `ContactPage`, `FeedbackPage`, `useNotificationPopup.js`, `NotificationPopup.jsx`. |

> **Build command for prod:** `cd frontend && CI=false yarn build` → serve `frontend/build/`.

### 3.3 Toolchain detected on validation host

| Tool | Version |
| --- | --- |
| Node.js | v20.20.2 |
| yarn | 1.22.22 (matches `packageManager` field) |
| Python | 3.11.15 |
| pip | 26.1 |

---

## 4. Required environment variables

> **Source:** Greps in `backend/server.py` and `frontend/src/**/*.{js,jsx,ts,tsx}`. Values shown are exactly those provided by the user; sensitive items are flagged for rotation.

### 4.1 Backend — `backend/.env`

| Key | Value (as provided) | Required? | Notes / Sensitivity |
| --- | --- | --- | --- |
| `MONGO_URL` | `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie` | ✅ Required | 🔴 **SENSITIVE** — DB user/password embedded. **Rotate before prod** (see §6.6). The user-supplied value contained an accidental double-prefix `MONGO_URL=MONGO_URL=…` — strip the duplicate. |
| `DB_NAME` | `mygenie` | ✅ Required | Server raises if missing. |
| `JWT_SECRET` | `any random key` *(placeholder in user input)* | ✅ Required | 🔴 **SENSITIVE** — Server **raises `ValueError`** if missing. **Generate with `openssl rand -hex 64` for prod (see §6.2).** Use a long random string, not the literal text "any random key". |
| `CORS_ORIGINS` | `*` | Optional (default `*`) | 🟡 **Tighten for prod** to specific domains (see §6.4). |
| `MYGENIE_API_URL` | `https://preprod.mygenie.online/api/v1` | ✅ Required for POS/loyalty integration | 🟡 If deploying to prod, point to the prod MyGenie endpoint, not preprod. |

#### Corrected `backend/.env` (ready to paste — secrets still need rotation)

```env
MONGO_URL=mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie
DB_NAME=mygenie
CORS_ORIGINS=*
JWT_SECRET=<REPLACE_WITH_openssl_rand_hex_64>
MYGENIE_API_URL=https://preprod.mygenie.online/api/v1
```

### 4.2 Frontend — `frontend/.env`

> Frontend env is read at **build time**, not runtime. Rebuild after any change.

| Key | Value (as provided) | Required? | Notes / Sensitivity |
| --- | --- | --- | --- |
| `WDS_SOCKET_PORT` | `443` | Dev-only | Only used by webpack-dev-server; harmless in prod build. |
| `ENABLE_HEALTH_CHECK` | `false` | Optional | Disables `plugins/health-check` in CRACO. |
| `REACT_APP_IMAGE_BASE_URL` | `https://manage.mygenie.online` | ✅ Required | CDN base for menu/banner images. |
| `REACT_APP_API_BASE_URL` | `https://preprod.mygenie.online/api/v1` | ✅ Required | MyGenie POS API base. **Switch to prod for prod deploys.** |
| `REACT_APP_LOGIN_PHONE` | `+919579504871` | ✅ Required by code paths | 🔴 **SENSITIVE** — hard-coded service-account phone. Should be moved server-side; at minimum, rotate if leaked. |
| `REACT_APP_LOGIN_PASSWORD` | `Qplazm@10` | ✅ Required by code paths | 🔴 **HIGHLY SENSITIVE** — service-account password baked into the SPA bundle. **Will be visible in browser source.** Strongly recommend moving the upstream login to the backend (proxy via `MYGENIE_API_URL` server-side) before any public deploy. |
| `REACT_APP_CRM_URL` | `https://crm.mygenie.online/api` | ✅ Required | CRM endpoint base. |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | `AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4` | ✅ Required | 🔴 **SENSITIVE** — Maps key is bundled client-side; **must be HTTP-referer restricted** in Google Cloud Console to the production domain(s). |
| `REACT_APP_CRM_API_VERSION` | `v2` | ✅ Required | CRM API version pin. |

Other env vars *referenced* in code but **not provided** by the user (defaults / runtime-derived):

| Key | Where used | Default behavior |
| --- | --- | --- |
| `REACT_APP_BACKEND_URL` | `frontend/src/...` | Falls back to relative paths / Emergent runtime injection. **Set explicitly to the public backend URL when deploying outside Emergent.** |
| `REACT_APP_CRM_API_KEY` | CRM calls | If empty, CRM calls likely 401. Confirm with the CRM team and add. |
| `REACT_APP_RESTAURANT_ID` | A few pages | Optional override; otherwise resolved from URL/QR. |
| `NODE_ENV` | CRACO, CRA | Auto-set to `production` during `yarn build`. |

#### Corrected `frontend/.env` (ready to paste — fix the leading space in Maps key)

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
# Add for non-Emergent deploys:
# REACT_APP_BACKEND_URL=https://<your-backend-domain>
# REACT_APP_CRM_API_KEY=<from CRM team>
```

> ⚠ The user-provided value `REACT_APP_GOOGLE_MAPS_API_KEY= AIzaSy…` had a leading space after `=`. CRA env loader keeps the space — it must be removed (as in the corrected snippet above) or Maps will 400.

---

## 5. Deploy steps (recommended sequence)

```bash
# 0. Pre-flight
git clone -b latest-hyatt-fixes-7-may https://github.com/Abhi-mygenie/customer-app5th-march.git
cd customer-app5th-march

# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../path/to/backend.env .env   # see §4.1 — rotate JWT_SECRET first
python -m py_compile server.py   # quick smoke
uvicorn server:app --host 0.0.0.0 --port 8001
# → expect: GET /api/ returns 200 {"message":"Customer App API"}

# 2. Frontend
cd ../frontend
cp ../path/to/frontend.env .env  # see §4.2
yarn install
CI=false yarn build              # MUST be CI=false (see §6.1)
# → output: build/  (deploy this folder behind nginx / CDN)

# 3. Reverse proxy (nginx example)
#    - serve frontend/build/ at /
#    - proxy /api/*  →  http://backend:8001
#    - proxy /api/uploads/*  →  http://backend:8001 (StaticFiles)
```

---

## 6. Critical action items before / during deploy

### 6.1 ⚠ Use `CI=false` for the production build
CRA promotes ESLint warnings to errors when `CI=true` (set automatically by most CI providers — GitHub Actions, GitLab, etc.). This branch has **19 unresolved `react-hooks/exhaustive-deps` warnings** that will break a default CI build. Either:
- Set `CI=false` (or `CI=` empty) in the build job env, **or**
- Fix the 19 warnings (low-effort but a separate code change).

### 6.2 🔴 Generate a real `JWT_SECRET`
The user wrote `JWT_SECRET=any random key` literally. Replace with a strong random value:
```bash
openssl rand -hex 64
```
Server will refuse to start without it (`raise ValueError` at line 30 of `server.py`).

### 6.3 ⚠ `frontend/yarn.lock` is **not committed**
`git ls-files frontend/yarn.lock` returns nothing. Each `yarn install` re-resolves transitive deps → non-reproducible builds, possible drift between envs. **Run `yarn install` once locally, commit the resulting `yarn.lock`, and use `yarn install --frozen-lockfile` in CI.**

### 6.4 🟡 Tighten `CORS_ORIGINS`
Currently `*`. For prod, set to a comma-separated list of allowed origins:
```env
CORS_ORIGINS=https://app.<your-domain>.com,https://www.<your-domain>.com
```

### 6.5 ⚠ Persist `backend/uploads/`
`server.py` mounts `/api/uploads → backend/uploads/` and writes new uploads there (line 1316). Currently 16 files exist in the repo. **Mount this directory on a persistent volume**, otherwise customer/menu uploads disappear on every redeploy. Recommend an S3-backed mount or a stateful volume (the repo already pulls `boto3` — a future migration to S3 is straightforward).

### 6.6 🔴 Rotate exposed credentials
The following secrets were shared in plain text in the deployment request and should be rotated before, or shortly after, going to production:
- MongoDB password (`mygenie_admin / QplazmMzalpq`) on `52.66.232.149:27017` — rotate and restrict by source-IP firewall.
- MyGenie service-account login (`+919579504871 / Qplazm@10`) — additionally consider moving this exchange to the backend so it never ships in the SPA bundle.
- Google Maps API key (`AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4`) — add HTTP-referrer restrictions in GCP Console.
- `JWT_SECRET` — generate new (see §6.2).

### 6.7 🟡 Verify outbound reachability from deployment network
Backend / SPA must reach:
- `https://preprod.mygenie.online` (or prod equivalent)
- `https://crm.mygenie.online`
- `https://manage.mygenie.online`
- `mongodb://52.66.232.149:27017`
- `https://maps.googleapis.com/*` (browser-side)

### 6.8 ℹ️ Optional clean-ups (non-blocking)
- Remove 3 unused imports (`FileResponse`, `hashlib`, `shutil`) in `backend/server.py` — `ruff check --fix server.py`.
- Address the 19 `react-hooks/exhaustive-deps` warnings to be able to drop `CI=false`.
- The committed `.gitignore` has duplicated `.env` blocks (cosmetic only).

---

## 7. What the validation agent did NOT do

- ❌ Did **not** rotate any credentials — left as user-provided values.
- ❌ Did **not** run end-to-end browser tests (no SPA loaded in a browser; build-only validation).
- ❌ Did **not** verify upstream MyGenie POS / CRM responses (only confirmed the backend boots and serves `/api/*`).
- ❌ Did **not** push any changes to the remote — this is a read-only validation.
- ❌ Did **not** assume a specific deployment target (Emergent native, Docker, EC2, k8s — all viable). Pick one and follow §5.

---

## 8. Useful one-liners for the next agent

```bash
# Confirm branch & latest remote commit
git ls-remote --heads https://github.com/Abhi-mygenie/customer-app5th-march.git latest-hyatt-fixes-7-may

# Diff vs the previous handover branch (7-may)
git fetch origin 7-may latest-hyatt-fixes-7-may
git diff --stat origin/7-may origin/latest-hyatt-fixes-7-may

# Backend smoke
curl -s http://<backend-host>:8001/api/
curl -s http://<backend-host>:8001/api/config/698 | head -c 300
curl -s http://<backend-host>:8001/api/dietary-tags/available | head -c 200

# Frontend rebuild
cd frontend && CI=false yarn build
```

---

**End of handover.** All checks above were executed against `origin/latest-hyatt-fixes-7-may@250af5b` on 2026-05-06.
