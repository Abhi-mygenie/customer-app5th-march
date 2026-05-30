# Deployment Handover — Customer App (MyGenie)

| Field | Value |
|---|---|
| Prepared by | E1 (Emergent main agent) |
| Prepared at (UTC) | 2026-05-30 07:30 UTC |
| Preview ingress URL | https://deploy-docs-6.preview.emergentagent.com |
| Status | **READY — all services running, MongoDB connected, external ingress 200 OK** |

> User instructions for this run: (1) wipe `/app` completely, (2) clone `https://github.com/Abhi-mygenie/customer-app5th-march.git` branch `main`, (3) connect to remote MongoDB at `52.66.232.149:27017/mygenie`, (4) install deps + start services, (5) produce this handover.

---

## 1. Source

| Field | Value |
|---|---|
| Repository | `https://github.com/Abhi-mygenie/customer-app5th-march.git` |
| Branch | `main` |
| HEAD SHA | `2deb245c039c5c9958dc91c6072160bd0341a90f` |
| HEAD date / author | 2026-05-14 19:42:37 +0000 / `emergent-agent-e1` |
| HEAD message | Auto-generated changes |

Recent commits on `main`:
```
2deb245 Auto-generated changes
01c686b Auto-generated changes
e1f7888 Auto-generated changes
52015d3 auto-commit for e7934502-289b-4f5f-8e4d-31e9754c408f
dced921 auto-commit for 0cd9fb4a-79b1-43d5-b369-716768e8fd76
```

The repo has 40+ feature branches (`dev`, `11-may-uat`, `14-may-phase2`, `8-may`, `7-may`, `6-may`, `2_may_2026`, multiple `conflict_*`, etc.). **`main` is the deployment branch confirmed by the user.**

Clone reproduction:
```bash
git clone https://github.com/Abhi-mygenie/customer-app5th-march.git /app
cd /app && git checkout main
```

---

## 2. Tech Stack

| Layer | Tech / Version |
|---|---|
| Backend | FastAPI 0.110.1, Python 3.11.15, motor 3.3.1, uvicorn 0.25.0 |
| Auth | PyJWT 2.11.0, bcrypt 4.1.3, passlib 1.7.4 |
| Frontend | React 19, CRA 5.0.1 (via craco 7.1), Tailwind 3.4, shadcn/ui (Radix), react-router-dom 7, axios 1.8, @tanstack/react-query 5 |
| Maps | @react-google-maps/api 2.20 |
| Database | **Remote MongoDB 7.0** at `52.66.232.149:27017`, DB `mygenie` |
| External APIs | MyGenie POS (`preprod.mygenie.online/api/v1`), MyGenie CRM (`crm.mygenie.online/api`), Image CDN (`manage.mygenie.online`), Google Maps |
| Tooling | yarn 1.22.22, pip 24, mongosh 2.8.3, node 20.20.2 |

### Layout
```
/app/
├── backend/
│   ├── server.py            (~60 KB, single-file FastAPI app, ~1,613 lines)
│   ├── requirements.txt
│   ├── seed_defaults.py / seed_demo_data.py
│   ├── db_export.py / db_import.py / db_data/ / db_export_new/
│   ├── uploads/             (served at /api/uploads)
│   ├── tests/
│   └── .env                 (NOT in git — recreated this run)
├── frontend/
│   ├── package.json / craco.config.js / tailwind.config.js
│   ├── public/
│   ├── src/                 (pages/, components/, api/, context/, hooks/, …)
│   └── .env                 (NOT in git — recreated this run)
├── memory_repo/             (PRD, ROADMAP, ARCHITECTURE, CHANGELOG)
├── DEPLOYMENT_HANDOVER.md   (prior handover from 2026-05-14)
├── HANDOVER.md              (this file)
└── README.md
```

---

## 3. Environment Variables

Both `.env` files are gitignored. **Recreate these on every fresh deployment.**

### 3.1 `/app/backend/.env` — 5 keys (all required, server fails fast if missing)

| Variable | Value | Notes |
|---|---|---|
| `MONGO_URL` | `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie` | Remote production DB (user-supplied this run) |
| `DB_NAME` | `mygenie` | |
| `JWT_SECRET` | 64-char hex (`efc349b2…32c55` — generated this run) | **Rotate per environment.** Server raises `ValueError` if missing |
| `MYGENIE_API_URL` | `https://preprod.mygenie.online/api/v1` | Server raises if missing |
| `CORS_ORIGINS` | `*` | Default. Tighten in prod to explicit origin(s) |

Where used in `server.py`:
- L23 `MONGO_URL`, L25 `DB_NAME`, L28 `JWT_SECRET`, L38 `MYGENIE_API_URL`, L1599 `CORS_ORIGINS`.

### 3.2 `/app/frontend/.env` — 11 keys

| Variable | Value (this deploy) | Required | Notes |
|---|---|---|---|
| `REACT_APP_BACKEND_URL` | `https://deploy-docs-6.preview.emergentagent.com` | **yes** | k8s ingress; all `/api/*` calls routed here |
| `WDS_SOCKET_PORT` | `443` | dev-only | webpack-dev-server HMR over HTTPS |
| `ENABLE_HEALTH_CHECK` | `false` | optional | local plugin flag |
| `REACT_APP_IMAGE_BASE_URL` | `https://manage.mygenie.online` | yes | menu/image CDN |
| `REACT_APP_API_BASE_URL` | `https://preprod.mygenie.online/api/v1` | yes | POS direct calls from FE |
| `REACT_APP_LOGIN_PHONE` | `+919579504871` | yes | default login id |
| `REACT_APP_LOGIN_PASSWORD` | `Qplazm@10` | yes | default login pwd |
| `REACT_APP_CRM_URL` | `https://crm.mygenie.online/api` | yes | CRM base |
| `REACT_APP_CRM_API_VERSION` | `v2` | yes | CRM header |
| `REACT_APP_CRM_API_KEY` | `{}` (empty JSON map) | optional | per-restaurant map `{ "<restaurantId>": "<key>" }` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | **empty — NEEDS REAL KEY** | yes (for maps) | Maps/geocoding won't render until set |
| `REACT_APP_RESTAURANT_ID` | (not set) | optional | falls back to URL slug |

> **Action items for the next deployment / human:**
> 1. Provide real `REACT_APP_GOOGLE_MAPS_API_KEY` — maps/address features broken until set.
> 2. Provide `REACT_APP_CRM_API_KEY` JSON map if CRM-per-restaurant calls are needed.
> 3. Move `REACT_APP_LOGIN_PASSWORD` server-side for production (it ships in the JS bundle).
> 4. Rotate `JWT_SECRET` and replace `CORS_ORIGINS=*` with explicit origins for production.

---

## 4. Deployment Steps (reproducible)

```bash
# 1. Wipe + clone
sudo supervisorctl stop all
rm -rf /app/* /app/.[!.]* /app/..?*
git clone https://github.com/Abhi-mygenie/customer-app5th-march.git /tmp/repo
cp -a /tmp/repo/. /app/
cd /app && git checkout main

# 2. Write env files (see §3 above for full content)
cat > /app/backend/.env <<EOF
MONGO_URL=mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie
DB_NAME=mygenie
JWT_SECRET=$(python3 -c "import secrets;print(secrets.token_hex(32))")
MYGENIE_API_URL=https://preprod.mygenie.online/api/v1
CORS_ORIGINS=*
EOF
# /app/frontend/.env — see §3.2 (do NOT delete REACT_APP_BACKEND_URL or WDS_SOCKET_PORT)

# 3. Install deps
cd /app/backend && pip install -r requirements.txt
cd /app/frontend && yarn install

# 4. Start services (supervisor)
sudo supervisorctl start backend frontend mongodb code-server nginx-code-proxy
sudo supervisorctl status

# 5. Verify
curl http://localhost:8001/api/                                                  # {"message":"Customer App API"}
curl https://<your-preview>.preview.emergentagent.com/api/                       # same
curl -s http://localhost:8001/api/loyalty-settings/698                           # JSON loyalty defaults
mongosh "$MONGO_URL" --quiet --eval 'db.customers.countDocuments()'              # expect > 3,800
```

---

## 5. Build & Compile Validation (this run)

| Check | Command | Result |
|---|---|---|
| Repo clone, branch=main | `git clone … && git checkout main` | OK — HEAD `2deb245` |
| Backend pip install | `pip install -r backend/requirements.txt` | OK — 123 pkgs |
| Backend startup | `supervisorctl start backend` | OK — `Application startup complete` |
| Backend health local | `curl localhost:8001/api/` | **200** `{"message":"Customer App API"}` |
| Backend health external | `curl https://deploy-docs-6.preview.emergentagent.com/api/` | **200** OK |
| Backend POS-fed endpoint | `curl …/api/loyalty-settings/698` | **200** — JSON defaults |
| MongoDB reachability | `mongosh "$MONGO_URL" db.getCollectionNames()` | OK — **20 collections** (see §6) |
| Frontend yarn install | `yarn install` | OK — 66.68 s (peer warnings only) |
| Frontend dev compile | `supervisorctl start frontend` (`craco start`) | OK — webpack compiled |
| Frontend local | `curl localhost:3000/` | **200** |
| Frontend external | `curl https://deploy-docs-6…/` | **200** — "MyGenie" page renders (verified via headless screenshot) |
| Supervisor status | `supervisorctl status` | backend / frontend / mongodb / nginx-code-proxy = RUNNING |

> Build note for production pipeline: `CI=true yarn build` can fail because CRA promotes ESLint `react-hooks/exhaustive-deps` warnings to errors. Use plain `yarn build` (the script `build` already invokes `craco build`), or set `DISABLE_ESLINT_PLUGIN=true` / `ESLINT_NO_DEV_ERRORS=true` in CI.

---

## 6. Database — `mongodb://…@52.66.232.149:27017/mygenie`

**Live, populated production-style DB. Treat with care — no truncate / drop without owner approval.**

Reachable from this pod ✅. Server version: MongoDB 7.0.x.

Collection counts (snapshot at handover time):

| Collection | Docs |
|---|---|
| `orders` | 32,573 |
| `order_items` | 81,638 |
| `customers` | 3,861 |
| `points_transactions` | 8,196 |
| `pos_request_logs` | 5,526 |
| `coupons` | 60 |
| `coupon_usage` | 116 |
| `coupon_transactions` | 0 |
| `wallet_transactions` | 12 |
| `loyalty_settings` | 14 |
| `loyalty_mismatch_logs` | 0 |
| `users` | 14 |
| `segments` | 0 |
| `customer_app_config` | 2 |
| `whatsapp_callback_logs` | 43 |
| `whatsapp_message_logs` | 11 |
| `whatsapp_event_template_map` | 4 |
| `whatsapp_template_variable_map` | 4 |
| `cron_job_logs` | 5 |
| `migration_sync_logs` | 123 |

Quick connect:
```bash
mongosh "mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie"
```

> Compared to the 2026-05-14 handover the DB now has slightly different collections (e.g. `whatsapp_callback_logs`, `pos_request_logs`, `coupon_transactions`, `coupon_usage`, `loyalty_mismatch_logs`, `migration_sync_logs` are present; `customer_otps`, `pos_event_logs`, `status_checks`, `test`, `dietary_tags_mapping`, `automation_rules`, `custom_templates`, `whatsapp_templates` from the older list are not present in current DB). Drift is expected — DB is shared and live.

---

## 7. Backend API Surface (under `/api`)

Health / config / static
```
GET    /api/                                        Health root
POST   /api/status
GET    /api/status
GET    /api/table-config                            (auth: restaurant) — proxies POS v2
GET    /api/loyalty-settings/{restaurant_id}
GET    /api/customer-lookup/{restaurant_id}?phone=
GET    /api/uploads/{filename}                      (static)
```

Auth — `/api/auth/*`
```
POST   /api/auth/send-otp
POST   /api/auth/check-customer
POST   /api/auth/login
GET    /api/auth/me                                 (auth)
POST   /api/auth/set-password
POST   /api/auth/verify-password
POST   /api/auth/reset-password
```

Customer (auth) — `/api/customer/*`
```
GET    /api/customer/profile
PUT    /api/customer/profile
GET    /api/customer/orders
GET    /api/customer/points
```
Plus `/api/config/*`, `/api/upload/*`, `/api/dietary-tags/*`.

Full list: `grep -nE '@(api|auth|customer|config|upload|dietary)_router\.(get|post|put|delete)' /app/backend/server.py`.

---

## 8. Service Management

```bash
sudo supervisorctl status                       # all services
sudo supervisorctl restart backend              # after backend/.env change
sudo supervisorctl restart frontend             # after frontend/.env change or package.json
tail -n 100 /var/log/supervisor/backend.err.log
tail -n 100 /var/log/supervisor/frontend.err.log
```

Hot reload is enabled — code edits do **not** require a manual restart; only `.env` or dependency changes do.

Internal ports (do not change — managed by Kubernetes ingress):
- backend → `0.0.0.0:8001` (all `/api/*` routes go here)
- frontend → `0.0.0.0:3000` (everything else)
- mongodb → local mongod is RUNNING but **unused** (app uses remote DB via `MONGO_URL`)

---

## 9. Known Issues / Action Items for Next Agent

1. **Google Maps key is blank** — `REACT_APP_GOOGLE_MAPS_API_KEY` is empty. Maps / address / delivery flows will fail visually until a real key is provided.
2. **`REACT_APP_CRM_API_KEY={}`** — empty map. CRM calls requiring `X-CRM-API-Key` will go without the header. Populate as `{"<restaurantId>":"<apiKey>", …}` if needed.
3. **`CORS_ORIGINS=*` and `JWT_SECRET` newly generated** — fine for preview, **rotate + restrict for prod**.
4. **Credentials in `frontend/.env`** — `REACT_APP_LOGIN_PHONE` and `REACT_APP_LOGIN_PASSWORD` are public (compiled into JS bundle). Acceptable for a demo / preview, **not** acceptable in production.
5. **CI build** — if your pipeline runs `CI=true yarn build`, it will fail on react-hooks warnings. Use `yarn build` directly or set `DISABLE_ESLINT_PLUGIN=true`.
6. **Local mongod** — running but unused; safe to ignore or stop in production deployments that don't need it.
7. **Many feature branches on remote** — only `main` is deployment-blessed. Don't deploy `conflict_*` or arbitrary feature branches without explicit user direction.

---

## 10. Verification Checklist for Next Agent

- [ ] `git rev-parse HEAD` matches §1 (or a newer `main` commit)
- [ ] `curl $REACT_APP_BACKEND_URL/api/` returns `{"message":"Customer App API"}`
- [ ] `curl $REACT_APP_BACKEND_URL/` returns 200 and HTML contains `MyGenie`
- [ ] `supervisorctl status` shows backend/frontend RUNNING
- [ ] `mongosh "$MONGO_URL" --eval 'db.customers.countDocuments()'` returns > 0
- [ ] `tail /var/log/supervisor/backend.err.log` ends with `Application startup complete.`
- [ ] No ValueError in backend logs (would indicate missing env var)

---

## 11. Files Worth Reading Before Touching Anything

- `/app/backend/server.py` — single-file FastAPI app, contains all routes, auth, POS proxy.
- `/app/DEPLOYMENT_HANDOVER.md` — previous (2026-05-14) handover. Mostly aligned with this one; useful for prior context.
- `/app/memory_repo/` — long-form PRD, roadmap, architecture, changelog.
- `/app/frontend/src/api/services/` — axios services hitting both our backend and external POS/CRM APIs.
- `/app/frontend/src/pages/` — 27 page-level components covering Login, Landing, Menu, Cart, Profile, Admin, etc.

---

_End of handover._
