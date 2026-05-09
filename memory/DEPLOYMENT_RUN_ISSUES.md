# Deployment & Run Issues – Handoff Notes

> Purpose: Help the next agent avoid the pitfalls we hit while cloning, running and deploying this repo (`Abhi-mygenie/customer-app5th-march`, branch `main`) on the Emergent platform.

---

## 1. Source repository

- **Repo:** https://github.com/Abhi-mygenie/customer-app5th-march.git
- **Branch:** `main` (use strictly)
- Root contains: `backend/`, `frontend/`, `memory/`, `test_reports/`, `tests/`, `backend_test.py`, `test_result.md`, `README.md`
- The repo does **not** ship with any `.env` files. You MUST create them manually before the services can start.

---

## 2. Critical environment variables (not in repo)

### 2.1 Backend (`/app/backend/.env`) — backend will REFUSE to start if any of these are missing

`server.py` performs hard validation on startup:

```python
mongo_url = os.environ['MONGO_URL']          # KeyError if missing
db = client[os.environ['DB_NAME']]            # KeyError if missing
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET: raise ValueError(...)
MYGENIE_API_URL = os.environ.get("MYGENIE_API_URL")
if not MYGENIE_API_URL: raise ValueError(...)
```

Working values used in this run:

```env
MONGO_URL=mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie
DB_NAME=mygenie
CORS_ORIGINS=*
JWT_SECRET=<any long random string>
MYGENIE_API_URL=https://preprod.mygenie.online/api/v1
```

Notes:
- `MONGO_URL` uses an **external** MongoDB instance on `52.66.232.149:27017` (NOT the pod-local mongo). Make sure the IP is reachable from the container (it is, from Emergent preview infra).
- `DB_NAME` must remain `mygenie`, NOT the platform default `test_database`.
- Do **NOT** quote values in the `.env` file (we saw dotenv parse quoted strings literally with quotes included on some stacks — keep it raw).
- `JWT_SECRET` has no published value — generate your own. Existing tokens signed with a previous secret will not validate.

### 2.2 Frontend (`/app/frontend/.env`)

All of these are read via `process.env.REACT_APP_*` and most have hard `console.error` / fail-fast checks:

```env
REACT_APP_BACKEND_URL=https://iphone-zoom-patch.preview.emergentagent.com   # MUST match the preview URL so CORS/ingress work
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
REACT_APP_IMAGE_BASE_URL=https://manage.mygenie.online
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/api/v1
REACT_APP_LOGIN_PHONE=+919579504871
REACT_APP_LOGIN_PASSWORD=Qplazm@10
REACT_APP_CRM_URL=https://crm.mygenie.online/api
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
REACT_APP_CRM_API_VERSION=v2
```

Variables referenced in code that were **NOT** provided by the user — features depending on them will be non-functional, but the app still renders:

- `REACT_APP_CRM_API_KEY` (JSON map `{ "<restaurantId>": "<apiKey>" }`) — CRM service logs a critical error when absent.
- `REACT_APP_RESTAURANT_ID` — some hooks (`useMenuData`) default the restaurant id from this; menus for the default restaurant may not load.

If the next agent is asked to wire real data end-to-end, collect these two values too.

### 2.3 Protected variables

`REACT_APP_BACKEND_URL`, `MONGO_URL`, `DB_NAME` are flagged as PROTECTED on this platform — never delete them from the env files.

---

## 3. File-system / environment quirks encountered

1. **`/tmp` is volatile.** Our first clone went to `/tmp/repo`; by the time we ran `cp -r`, `/tmp/repo` had been garbage-collected. Clone straight into `/app` (after removing the placeholder dirs) or re-clone right before copying.

2. **Initial `/app` template must be removed before copying the repo.** The pod ships with an empty `backend/`, `frontend/`, `memory/`, `tests/`, `test_reports/`. Delete them first:
   ```bash
   rm -rf /app/backend /app/frontend /app/memory /app/test_reports /app/tests
   cp -r /tmp/repo/{backend,frontend,memory,test_reports,tests,backend_test.py} /app/
   ```

3. **Uvicorn reload can crash with `FileNotFoundError: [Errno 2] os.getcwd()`** when the directory a previous worker was started from has just been deleted. This happened right after the `rm -rf` + `cp -r` swap. Fix: just run `sudo supervisorctl restart backend`; the fresh process comes up in `/app/backend` and recovers. If it keeps crashing, ensure `cd` is not pointing at a deleted path in any open shell.

4. **Yarn peer-dep warnings are noise.** The repo pins `react@19`, but several deps (`react-day-picker@8.10.1`, `recharts@3.8.1`, tiptap extensions, `@babel/plugin-proposal-private-property-in-object`) warn about peer deps. They DO NOT block the build — ignore them.

5. **`VisualEditsPlugin` startup error** in frontend logs:
   ```
   [VisualEditsPlugin] Failed to read overlay: ENOENT ... visual-edit-overlay.js
   ```
   This is an Emergent platform plugin that expects an artifact that is not shipped with this repo's `node_modules`. It is harmless — the app still serves.

6. **Supervisor does not auto-start `code-server`** in this pod; only `backend`, `frontend`, `mongodb`, `nginx-code-proxy` run. Don't waste time trying to revive `code-server`.

7. **`tail -n <N>`** is the safe form. `tail -N` (e.g. `tail -100`) sometimes failed in this shell with "option used in invalid context". Use `tail -n 100` and split multi-file tails into separate commands if needed.

---

## 4. Dependency install notes

- Backend deps are large (Google AI SDK, emergentintegrations, boto3, etc.). `pip install -q -r requirements.txt` takes ~30-60s but normally succeeds on first run.
- Frontend deps: `yarn install` (NOT npm) — `package.json` is pinned to yarn 1.22.22 via `packageManager`. Full install ≈ 70s on a cold cache.

---

## 5. Architecture gotchas the next agent should know

1. **The frontend talks to THREE different backends:**
   - `REACT_APP_BACKEND_URL` — our Emergent backend (FastAPI in this repo, via `/api/*`).
   - `REACT_APP_API_BASE_URL` — external MyGenie POS API (`preprod.mygenie.online`).
   - `REACT_APP_CRM_URL` — external CRM (`crm.mygenie.online`).
   Changing one `.env` only fixes one integration. When the login/menu flow breaks, check which of the three is being called.

2. **Backend exposes a proxy** `/api/air-bnb/get-order-details/{order_id}` → `MYGENIE_API_URL`. If the POS URL changes you must update both `MYGENIE_API_URL` (backend) and `REACT_APP_API_BASE_URL` (frontend) in sync.

3. **OTP is stored in-memory** (see `OTP Storage (in-memory for demo, use Redis in production)` in `server.py`). A backend restart invalidates any pending OTP flows — don't be surprised.

4. **MongoDB is remote** (52.66.232.149). If you see auth / connection errors, verify egress from the preview pod and that the credentials in `MONGO_URL` are still valid. Data seen here is *real* shared data, not a local seed.

5. **Startup order matters.** After editing `.env`, always `sudo supervisorctl restart backend frontend`. Hot-reload does NOT pick up env-var changes.

---

## 6. Verification checklist (run after any redeploy)

```bash
sudo supervisorctl status                                  # backend + frontend RUNNING
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/api/    # expect 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/        # expect 200
curl -s -o /dev/null -w "%{http_code}\n" "$REACT_APP_BACKEND_URL/"     # expect 200
```

Then open the preview URL — you should land on the **MyGenie** customer landing page showing `18march` (restaurant name) and a `BROWSE MENU` CTA. If you see a blank page, 99% of the time it's a missing `REACT_APP_*` variable — check browser console for `CRITICAL: REACT_APP_... is not set`.

---

## 7. What was intentionally NOT done in this run

- No code changes to frontend or backend — "run as-is" per instructions.
- No testing agents invoked — user explicitly forbade this.
- No CRM key / restaurant id wired — user did not provide them.
- No PRD update — task was ops-only, not a feature/bug fix.

Good luck to the next agent.
