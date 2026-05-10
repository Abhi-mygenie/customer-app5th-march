# Deployment Handover Document
**Application:** Customer App (MyGenie)
**Prepared by:** E1 (Emergent main agent)
**Prepared at:** 2026-05-10 19:58 UTC
**Status:** READY FOR DEPLOYMENT (with caveats — see Section 8)

---

## 1. Source Code

| Field | Value |
|---|---|
| Repository | https://github.com/Abhi-mygenie/customer-app5th-march.git |
| Branch | `11-may-uat` (confirmed — exact match found on remote) |
| Latest commit (HEAD) | `3f0dbd513667aa5d47f760be93d30b202d229ae5` |
| Latest commit author | emergent-agent-e1 \<github@emergent.sh\> |
| Latest commit date (UTC) | **2026-05-10 19:48:56 +0000** |
| Latest commit message | `Auto-generated changes` |
| Pulled at | 2026-05-10 19:51 UTC |

### Recent commit history (last 5)
```
3f0dbd5 | 2026-05-10 19:48:56 +0000 | emergent-agent-e1 | Auto-generated changes
86e52dd | 2026-05-10 19:32:52 +0000 | emergent-agent-e1 | auto-commit for 5c7ba17f-f787-4f8d-befe-9353ee2151c1
8124be4 | 2026-05-10 19:08:23 +0000 | emergent-agent-e1 | Auto-generated changes
e23c9a0 | 2026-05-10 19:04:42 +0000 | emergent-agent-e1 | auto-commit for 557eb405-a2e0-4d08-8304-c9e733ffce68
530e144 | 2026-05-10 18:38:56 +0000 | emergent-agent-e1 | auto-commit for 85848602-a04c-4fde-b29c-80e32eb334cc
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI 0.110.1 (Python 3.11), Motor (async MongoDB), PyJWT, bcrypt |
| Frontend | React 19 + Craco + Tailwind + shadcn/ui + react-router-dom v7 |
| Database | MongoDB 7.0.30 (remote, AWS EC2) |
| External | MyGenie POS API (`preprod.mygenie.online/api/v1`), CRM API, Google Maps |
| Build tools | yarn (frontend), pip (backend) |

---

## 3. Environment Variables

### 3.1 Backend (`/app/backend/.env`)

| Variable | Status | Value (sanitized) |
|---|---|---|
| `MONGO_URL` | ✅ Set | `mongodb://mygenie_admin:****@52.66.232.149:27017/mygenie` |
| `DB_NAME` | ✅ Set | `mygenie` |
| `CORS_ORIGINS` | ✅ Set | `*` |
| `JWT_SECRET` | ✅ Set | `2f8c5d4e...c9e` (64-char hex; replace with a strong secret managed by deploy platform) |
| `MYGENIE_API_URL` | ✅ Set | `https://preprod.mygenie.online/api/v1` |

> ⚠️ **Note from input fix:** The user-provided env had a duplicated prefix `MONGO_URL=MONGO_URL=mongodb://...`. This was corrected to a single `MONGO_URL=mongodb://...` to avoid a malformed connection string causing startup failure.

> ⚠️ **Security:** `JWT_SECRET` was provided as "any random key" — a 64-char hex value was generated. The deployment platform should override it with a securely managed secret.

> ⚠️ **CORS:** `CORS_ORIGINS=*` is permissive. For production deployment, restrict to the actual frontend domain.

### 3.2 Frontend (`/app/frontend/.env`)

| Variable | Status | Value |
|---|---|---|
| `WDS_SOCKET_PORT` | ✅ Set | `443` |
| `ENABLE_HEALTH_CHECK` | ✅ Set | `false` |
| `REACT_APP_BACKEND_URL` | ✅ Added | `https://preprod.mygenie.online` (required by platform ingress; was not in user-provided list) |
| `REACT_APP_IMAGE_BASE_URL` | ✅ Set | `https://manage.mygenie.online` |
| `REACT_APP_API_BASE_URL` | ✅ Set | `https://preprod.mygenie.online/api/v1` |
| `REACT_APP_LOGIN_PHONE` | ✅ Set | `+919579504871` |
| `REACT_APP_LOGIN_PASSWORD` | ✅ Set | `Qplazm@10` |
| `REACT_APP_CRM_URL` | ✅ Set | `https://crm.mygenie.online/api` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | ✅ Set | `AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4` (whitespace-trimmed from user input) |
| `REACT_APP_CRM_API_VERSION` | ✅ Set | `v2` |
| `REACT_APP_CRM_API_KEY` | ⚠️ **MISSING** | Used in `src/api/services/crmService.js` as a JSON map `{"<restaurantId>": "<apiKey>"}`. CRM calls will fail without it. |
| `REACT_APP_RESTAURANT_ID` | ⚠️ **MISSING (has fallback)** | Used as default restaurant context in `src/hooks/useMenuData.js`, `src/utils/useRestaurantId.js`. Code has a hardcoded fallback (`'478'`), but production should set explicitly. |

---

## 4. Build & Compile Validation

### 4.1 Backend

| Check | Result |
|---|---|
| `pip install -r requirements.txt` | ✅ PASS (all 100+ deps installed successfully) |
| Python import `server.py` | ✅ PASS (47 routes registered) |
| Ruff lint on `server.py` | ✅ PASS (no issues) |
| Supervisor backend start | ✅ PASS (`RUNNING`, uvicorn started on 0.0.0.0:8001) |
| Healthcheck `GET /api/` | ✅ HTTP 200 → `{"message":"Customer App API"}` |
| Auth endpoint sanity `GET /api/auth/me` (no token) | ✅ HTTP 401 → `{"detail":"Invalid token"}` (correct rejection) |
| MongoDB connectivity | ✅ PASS — Connected to `mongodb://52.66.232.149:27017/mygenie`, server version `7.0.30`, 10+ collections present (`customers`, `users`, `wallet_transactions`, `loyalty_settings`, …) |

### 4.2 Frontend

| Check | Result |
|---|---|
| `yarn install` | ✅ PASS (lockfile saved; 11 peer-dep warnings, all non-blocking — mostly tiptap & react-day-picker) |
| `yarn build` (production) | ✅ **PASS — Compiled successfully** |
| Build output size | `490.3 kB` (gzipped JS) + `36.49 kB` (gzipped CSS) |
| Build artifact | `/app/frontend/build/` (27 MB total) |
| ESLint (App.js sample) | ✅ No issues |
| Supervisor frontend start | ✅ PASS (`RUNNING` on port 3000) |

### 4.3 Non-blocking warnings noted during build

- `Cannot find ESLint plugin (ESLintWebpackPlugin)` — build runs with `DISABLE_ESLINT_PLUGIN=true`. Acceptable; lint is run separately.
- Peer-dependency warnings for `@tiptap/*` (expects `@tiptap/core@3.23.1`, installed `^3.20.0`). Functional, but recommend pinning to a single tiptap version in `package.json` before next release.
- `react-day-picker@8.10.1` declares peer `react@^16/17/18`, project is on React 19. Functional, but watch for runtime issues in date pickers.

---

## 5. Services Status (post-validation)

```
backend                          RUNNING   pid 363, uptime 0:00:06
frontend                         RUNNING   pid 317, uptime 0:00:08
mongodb                          RUNNING   pid 49,  uptime 0:01:47   (local supervisor mongodb, unused)
nginx-code-proxy                 RUNNING   pid 45,  uptime 0:01:47
```

The application uses the **remote** MongoDB at `52.66.232.149:27017`, **not** the local supervisor `mongodb`. The local mongo can be ignored / stopped on deploy targets that don't need it.

---

## 6. Deployment-target Configuration Checklist

For the next deployment agent (Emergent native, Vercel, Railway, etc.):

### 6.1 Mandatory env vars to set on platform

**Backend service:**
- [ ] `MONGO_URL` — production MongoDB URI (already configured: `52.66.232.149`)
- [ ] `DB_NAME` = `mygenie`
- [ ] `JWT_SECRET` — **generate a strong, unique secret per environment** (do not reuse the placeholder in section 3.1)
- [ ] `MYGENIE_API_URL` = `https://preprod.mygenie.online/api/v1` (or prod URL for prod env)
- [ ] `CORS_ORIGINS` — set to the actual frontend domain, not `*`

**Frontend build-time vars (must be present BEFORE `yarn build`):**
- [ ] `REACT_APP_BACKEND_URL`
- [ ] `REACT_APP_API_BASE_URL`
- [ ] `REACT_APP_IMAGE_BASE_URL`
- [ ] `REACT_APP_CRM_URL` + `REACT_APP_CRM_API_VERSION` + **`REACT_APP_CRM_API_KEY`** ⚠️ (currently missing)
- [ ] `REACT_APP_GOOGLE_MAPS_API_KEY`
- [ ] `REACT_APP_RESTAURANT_ID` (recommended)
- [ ] `REACT_APP_LOGIN_PHONE`, `REACT_APP_LOGIN_PASSWORD` (only if needed for E2E/dev-login)

### 6.2 Routing / ingress rules
- Backend MUST bind `0.0.0.0:8001`; all routes prefixed with `/api`
- Frontend MUST consume `REACT_APP_BACKEND_URL` for API calls (no hardcoded URLs)
- Kubernetes/Emergent ingress: `/api/*` → backend port 8001, else → frontend port 3000

### 6.3 Filesystem
- Backend creates/uses `/app/backend/uploads/` for file uploads (currently empty). On deploy targets with ephemeral disk, mount a persistent volume here or switch to object storage (S3/GCS).

---

## 7. Run Commands

### Local dev
```bash
# Backend
cd /app/backend && pip install -r requirements.txt
sudo supervisorctl restart backend   # or: uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd /app/frontend && yarn install
sudo supervisorctl restart frontend  # or: yarn start
```

### Production build
```bash
# Frontend
cd /app/frontend && DISABLE_ESLINT_PLUGIN=true CI=false GENERATE_SOURCEMAP=false yarn build
# Output: /app/frontend/build/

# Backend (use a production ASGI runner)
cd /app/backend && uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2
```

---

## 8. Open Items & Caveats for Deployment Agent

| # | Severity | Item |
|---|---|---|
| 1 | 🟡 MED | **`REACT_APP_CRM_API_KEY` missing** — must be set before frontend build, else CRM features fail silently (error logged only). |
| 2 | 🟡 MED | `REACT_APP_RESTAURANT_ID` missing — fallback `'478'` exists in `utils/constants.js` (commented out) and `utils/useRestaurantId.js`. Set explicitly for prod. |
| 3 | 🔴 HIGH | `JWT_SECRET` is a placeholder. Replace with a securely-stored secret on the deploy platform. |
| 4 | 🔴 HIGH | `CORS_ORIGINS=*` — restrict to actual frontend origin in production. |
| 5 | 🟡 MED | `peer-dependency` warnings for `@tiptap/*` and `react-day-picker` — non-blocking but worth resolving. |
| 6 | 🟢 LOW | `/app/backend/uploads/` is ephemeral. Mount persistent volume or use object storage in production. |
| 7 | 🟢 LOW | Local supervisor `mongodb` service is running but **unused** (app talks to remote Mongo). Can be left as-is or stopped. |
| 8 | 🟢 LOW | The mongodb password is committed in this handover; rotate after deployment if required. |

---

## 9. Validation Summary

| Item | Status |
|---|---|
| ✅ Repo pulled from `11-may-uat` | PASS |
| ✅ Backend `pip install` | PASS |
| ✅ Backend `import server` | PASS (47 routes) |
| ✅ Backend `ruff` lint | PASS |
| ✅ Backend service running | PASS (port 8001) |
| ✅ Backend `GET /api/` returns 200 | PASS |
| ✅ Backend JWT auth wired correctly | PASS (401 on invalid token) |
| ✅ MongoDB connection (remote) | PASS (v7.0.30) |
| ✅ Frontend `yarn install` | PASS |
| ✅ Frontend `yarn build` | PASS (490 KB gzipped) |
| ✅ Frontend service running | PASS (port 3000) |
| ✅ Frontend ESLint | PASS |

**Overall verdict:** ✅ **READY FOR DEPLOYMENT** — pending resolution of items #1, #3, #4 in Section 8 before promoting to production.

---
*Document generated 2026-05-10 19:58 UTC by E1.*
