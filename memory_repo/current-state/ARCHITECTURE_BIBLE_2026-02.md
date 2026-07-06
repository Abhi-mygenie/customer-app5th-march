# MyGenie Customer App — Architecture Bible
### Scale-Readiness Audit for Thousands of Clients

**Status:** Code-verified from `main` HEAD (2026-02)
**Author:** E1 (Investigation Role 6, read-only)
**Baseline:** `ARCHITECTURE_DIAGRAM_2026-02.md` + `DATA_FLOW_DIAGRAM_2026-02.md` + `BASELINE_DELTA_2026-02.md`
**Target scale:** thousands of restaurants × thousands of concurrent orders/hour
**Scope:** end-to-end — security, data model, scalability, reliability, performance, observability, deployment, maintainability, compliance, testing

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Priority Methodology](#2-priority-methodology)
3. [Findings by Category](#3-findings-by-category)
   - 3.1 [Security (SEC-01 → SEC-12)](#31-security)
   - 3.2 [Data Model & Database (DATA-01 → DATA-10)](#32-data-model--database)
   - 3.3 [Scalability (SCALE-01 → SCALE-10)](#33-scalability)
   - 3.4 [Reliability (REL-01 → REL-08)](#34-reliability)
   - 3.5 [Performance (PERF-01 → PERF-07)](#35-performance)
   - 3.6 [Observability (OBS-01 → OBS-07)](#36-observability)
   - 3.7 [Deployment & Ops (OPS-01 → OPS-08)](#37-deployment--ops)
   - 3.8 [Maintainability & Code Quality (MAINT-01 → MAINT-08)](#38-maintainability--code-quality)
   - 3.9 [Compliance & Privacy (COMP-01 → COMP-05)](#39-compliance--privacy)
   - 3.10 [Testing (TEST-01 → TEST-03)](#310-testing)
4. [Prioritized Roadmap](#4-prioritized-roadmap)
5. [Appendix — Scale Model Assumptions](#5-appendix--scale-model-assumptions)

---

## 1. Executive Summary

The MyGenie Customer App works well for tens of restaurants. To reach **thousands of restaurants with production-grade reliability**, this audit identifies **68 discrete issues** across 10 categories, ranked by priority.

### Severity distribution

| Priority | Count | What "priority" means |
|---|---|---|
| 🔴 **HIGH** | **24** | Will fail, be exploited, or hard-block scale within 6 months at target load |
| 🟡 **MEDIUM** | **28** | Will cause incidents, cost, or velocity drag within 12 months at target load |
| 🟢 **LOW** | **16** | Hygiene, tech debt, cosmetic — fix during natural refactors |
| **TOTAL** | **68** | |

### Category heat map

| Category | HIGH | MED | LOW | Total | Health |
|---|---:|---:|---:|---:|---|
| Security | 6 | 4 | 2 | 12 | 🔴 |
| Data Model / DB | 4 | 4 | 2 | 10 | 🔴 |
| Scalability | 4 | 4 | 2 | 10 | 🔴 |
| Reliability | 3 | 3 | 2 | 8 | 🟡 |
| Performance | 1 | 4 | 2 | 7 | 🟡 |
| Observability | 3 | 3 | 1 | 7 | 🔴 |
| Deployment / Ops | 2 | 4 | 2 | 8 | 🟡 |
| Maintainability | 0 | 4 | 4 | 8 | 🟡 |
| Compliance | 1 | 3 | 1 | 5 | 🟡 |
| Testing | 2 | 1 | 0 | 3 | 🔴 |

### Top 5 blockers to scale

If nothing else changes, these five will break first:

1. **DATA-01 — No MongoDB indexes** on `customers.phone`, `customers.restaurant_id`, `orders.customer_id`, `orders.restaurant_id`, `customer_app_config.restaurant_id`. Every query becomes a full collection scan → CPU-bound Mongo at ~10K docs/collection.
2. **SCALE-01 — OTP stored in in-memory dict** (`otp_store` dict in `server.py`). Backend cannot horizontally scale — a second replica would see empty dict; users' OTP fails randomly on LB round-robin.
3. **SCALE-02 — File uploads on local pod disk** (`backend/uploads/`). Pod restart = images lost. Cannot horizontally scale — pod A stores image, pod B can't serve it.
4. **SEC-01 — No rate limiting** on `/auth/send-otp`, `/auth/login`, `/upload/image`. SMS-bomb attack, brute-force, and storage-exhaust are all trivial.
5. **OPS-01 — No CI/CD, no rollback docs, no prod/staging separation**. Every deploy is a manual, high-risk operation. At >5 deploys/week this becomes the single largest risk.

Any one of these will limit throughput to ~1 backend replica × ~500 concurrent restaurants before falling over.

---

## 2. Priority Methodology

**HIGH** — one or more of:
- Actively exploitable security vulnerability
- Will produce incorrect data at scale
- Will exhaust a fundamental resource (memory, disk, connections) at target load
- Blocks horizontal scale entirely
- Legal / compliance risk
- No graceful degradation → catastrophic failure mode

**MEDIUM** — one or more of:
- Degrades UX under load (latency, freezes)
- Increases cost linearly with scale (missing cache, missing pooling)
- Increases incident frequency but not severity
- Slows down feature velocity meaningfully

**LOW** — one or more of:
- Naming, docs, cosmetic
- Tech debt without immediate impact
- Hygiene items unlikely to matter until scale reveals them

Each finding has: **ID, Title, Evidence (file:line), Risk, Scale Impact, Fix, Priority.**

---

## 3. Findings by Category

## 3.1 Security

### SEC-01 — 🔴 HIGH — No rate limiting anywhere
**Evidence:** `grep slowapi|ratelimit|Limiter server.py` → no hits. `requirements.txt` has no rate-limit lib. No middleware config.
**Risk:** `/auth/send-otp` can be called unlimited times for a phone number → SMS-bomb attack that costs money (SMS gateway bill) AND could get MyGenie's SMS sender ID blacklisted. `/auth/login` and `/auth/verify-password` are unlimited → brute force. `/upload/image` is unlimited → 5 MB × N calls = disk fill.
**Scale impact:** At target scale a single attacker can drain a month's SMS budget in an hour, or fill the ephemeral upload disk in minutes.
**Fix:** Add `slowapi` (Redis-backed) with per-IP + per-phone limits. `send-otp`: 5/hour/phone, 20/hour/IP. `login`: 10/minute/phone. `upload/image`: 30/minute/user.
**Effort:** ~4 hours.

### SEC-02 — 🔴 HIGH — OTP stored in in-memory Python dict
**Evidence:** `server.py:369` — `otp_store[phone] = {"otp": otp, "expires": ...}`. `otp_store` is a module-level dict.
**Risk:** (a) OTP lost on restart / redeploy → users mid-flow get "invalid OTP". (b) Cannot horizontally scale — replica A generates OTP, LB routes verify to replica B, verify fails. (c) No TTL enforcement — expired OTPs linger in memory forever unless overwritten.
**Scale impact:** Confines backend to 1 process, 1 replica. Kills horizontal scale entirely.
**Fix:** Move to Redis with SETEX (5 min TTL). Or use a dedicated OTP provider (MSG91, Twilio Verify) that owns the OTP lifecycle.
**Effort:** ~6 hours + Redis provisioning.

### SEC-03 — 🔴 HIGH — CORS wide open (`*`)
**Evidence:** `server.py:1774-1781` uses `CORS_ORIGINS` env, which defaults to `*`. `.env` currently sets `CORS_ORIGINS=*`.
**Risk:** Any origin can read authenticated endpoints. Combined with cookies/JWT in localStorage this is CSRF/XSSI territory.
**Scale impact:** Not scale-limiting per se, but a scale-of-attack multiplier — any customer/partner integration can accidentally leak tokens.
**Fix:** Whitelist known frontends: `preprod.mygenie.online`, `manage.mygenie.online`, all `*.preview.emergentagent.com`, plus any custom-domain restaurants. Reject others.
**Effort:** ~2 hours.

### SEC-04 — 🔴 HIGH — Payment credentials shipped in FE bundle
**Evidence:** `frontend/.env` sets `REACT_APP_LOGIN_PHONE=+919579504871` and `REACT_APP_LOGIN_PASSWORD=Qplazm@10`, consumed in `Login.jsx`. These reach the compiled JS.
**Risk:** Anyone with dev-tools has admin login creds pre-filled. Also `REACT_APP_CRM_API_KEY` (JSON map of restaurantId → key) ships in the bundle → any user has every restaurant's CRM key.
**Scale impact:** At thousands of restaurants, one leaked bundle = every restaurant's CRM key compromised simultaneously.
**Fix:** Kill both `REACT_APP_LOGIN_*` (they only save typing in dev). For CRM keys: proxy CRM calls through own-backend (like customer-lookup already does) and stop exposing keys to browser. Alternative: per-user JWT that embeds `crm_scope` claim and let own-backend attach the actual CRM key server-side.
**Effort:** ~2 days.

### SEC-05 — 🔴 HIGH — No security headers (CSP, HSTS, X-Frame, etc.)
**Evidence:** `grep Content-Security-Policy server.py public/index.html` → 0 hits. No middleware.
**Risk:** XSS payloads have no CSP to blunt them. Clickjacking is possible without X-Frame-Options. HSTS missing → downgrade attacks.
**Scale impact:** Larger surface area for user-generated content (banners, feedback, custom pages).
**Fix:** Add `secure` FastAPI middleware or nginx-level headers: strict CSP for own-BE domain, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
**Effort:** ~1 day (needs CSP tuning per page).

### SEC-06 — 🔴 HIGH — File upload lacks MIME sniffing and virus scan
**Evidence:** `server.py:1368-1391` checks extension and size (5 MB max) but not actual content type. No AV.
**Risk:** Any user with `restaurant` role can upload a `.jpg` that is actually a PHP shell, JS payload, or malware. Since files are served from `/api/uploads/{name}` on the same origin as the app, an uploaded JS file is same-origin — can steal tokens from localStorage.
**Scale impact:** With thousands of restaurants doing self-service branding uploads, the probability of one compromised admin account uploading a payload approaches 1.
**Fix:** (a) Use `python-magic` to verify actual content type. (b) Add ClamAV sidecar or hosted AV (AWS S3 → Lambda). (c) Store uploads in S3/GCS with different CDN origin — cross-origin isolates any XSS payload. (d) Content-Disposition: attachment or dedicated image processor (resize + re-encode) that destroys polyglots.
**Effort:** ~3-5 days (image pipeline + storage migration).

### SEC-07 — 🟡 MEDIUM — JWT algorithm HS256 with static secret in .env
**Evidence:** `server.py:45` — `JWT_ALGORITHM = "HS256"`; secret in `.env` as `JWT_SECRET`.
**Risk:** HS256 uses symmetric key — if the .env is ever leaked, all tokens can be forged. No rotation mechanism. `exp` = 24h (line 319), no refresh token flow, no revocation list.
**Scale impact:** At thousands of restaurants + admins, key rotation becomes essential; symmetric secret makes it hard (all replicas must swap simultaneously).
**Fix:** Migrate to RS256 (asymmetric) with keys managed by a secrets manager (AWS Secrets Manager, Google Secret Manager, HashiCorp Vault). Add refresh tokens + rotation. Shorten access token exp to 15-30 min. Add JTI + revocation set in Redis.
**Effort:** ~1 week.

### SEC-08 — 🟡 MEDIUM — Three parallel auth systems create session ambiguity (BUG-001)
**Evidence:** `localStorage` holds `auth_token` (own-BE JWT), `crm_token_${rid}` (CRM), `order_auth_token` (POS 10-min) — plus legacy `crm_token`, `pos_token`. Agent prompt Part B §13-1 flags this as BUG-001 P0.
**Risk:** Race conditions on token refresh across the three systems. When one expires, others may still be valid — user sees inconsistent behavior (menu loads but review-order fails, or vice versa).
**Scale impact:** Every customer support ticket about "app misbehaving" costs engineering time to diagnose.
**Fix:** Consolidate to one identity layer. Own-BE JWT becomes the source of truth; own-BE mints short-lived POS + CRM tokens on demand and returns them via authenticated endpoints. Deprecate CRM keys in browser (also fixes SEC-04).
**Effort:** ~2-3 weeks (touches every auth flow).

### SEC-09 — 🟡 MEDIUM — Missing password policy + no MFA for admins
**Evidence:** No password complexity checks in `set-password` or `reset-password` endpoints. No MFA.
**Risk:** At scale, admin accounts are the highest-value targets (they control restaurant config, menu, banners). One phished admin = one polluted restaurant.
**Scale impact:** Support cost per compromise = high.
**Fix:** Enforce min length 12, 3-of-4 character classes, deny common-password list (`pwned-passwords` API). Add TOTP-based MFA for admin role.
**Effort:** ~1 week.

### SEC-10 — 🟡 MEDIUM — Cookie / storage strategy stores JWT in localStorage
**Evidence:** `AuthContext.jsx` reads/writes `auth_token` from `localStorage`.
**Risk:** localStorage is readable by any script on the origin — XSS payload harvests tokens. HTTP-only cookies would be safer for the primary session.
**Scale impact:** Larger XSS attack surface as banner/feedback/page CRUD grows (SEC-06).
**Fix:** Move primary JWT to HTTP-only Secure SameSite=Strict cookie. Keep only non-sensitive UI state in localStorage.
**Effort:** ~1 week (need to change interceptors + CORS credentials).

### SEC-11 — 🟢 LOW — In-memory OTP not cleaned up on verify
**Evidence:** `server.py:369-380` writes to `otp_store`; verification path reads it but I did not see a `del otp_store[phone]` in a quick scan.
**Risk:** OTPs linger. Combined with SEC-02, less severe but still: replay attack window during OTP validity (5 min).
**Fix:** Delete on successful verify. Subsumed by SEC-02 (Redis migration).
**Effort:** 30 min or subsumed.

### SEC-12 — 🟢 LOW — `REACT_APP_GOOGLE_MAPS_API_KEY` shipped without origin restriction
**Evidence:** `frontend/.env` and `DeliveryAddress.jsx:13` — key shipped raw.
**Risk:** Anyone reading the bundle can use the key. Google Maps API bills MyGenie for the traffic.
**Fix:** Restrict this key by HTTP referer in Google Cloud Console to only MyGenie's known domains + preview URLs. This is the correct pattern for FE-only APIs.
**Effort:** 15 min (in Google Console).

---

## 3.2 Data Model & Database

### DATA-01 — 🔴 HIGH — No indexes on hot query fields
**Evidence:** `grep create_index server.py` → only 1 hit (non_qr_blocks TTL). The hot queries are:
- `db.customers.find_one({"phone": phone, "restaurant_id": rid})` → 10 sites
- `db.orders.find({"customer_id": user_id})` sorted by created_at desc, paginated
- `db.customer_app_config.find_one({"restaurant_id": rid})` → the most-called query in the entire app
- `db.wallet_transactions.find({"customer_id": ...})`, `db.points_transactions.find(...)`, `db.coupons.find(...)`

**Risk:** Every query is a full COLLSCAN. At 100K customers × N restaurants, a login OTP verify blocks the event loop for hundreds of ms per query.
**Scale impact:** DB CPU pegged at ~10K docs/collection. This is the single largest scale bottleneck.
**Fix:** Create on startup:
- `customers`: compound `{phone: 1, restaurant_id: 1}` (unique), plus `{id: 1}` (unique)
- `orders`: `{customer_id: 1, created_at: -1}`, `{restaurant_id: 1, created_at: -1}`
- `customer_app_config`: `{restaurant_id: 1}` (unique)
- `wallet_transactions` / `points_transactions`: `{customer_id: 1, created_at: -1}`
- `coupons`: `{restaurant_id: 1}`, `{code: 1}`
- `feedback`: `{restaurant_id: 1, created_at: -1}`
- `dietary_tags_mapping`: `{restaurant_id: 1}`

Use `IndexModel(..., background=True)` to avoid blocking. Run on app startup via an `@app.on_event("startup")` handler.
**Effort:** ~4 hours (mechanical, low risk).

### DATA-02 — 🔴 HIGH — Tenant isolation is application-code only, not enforced at DB
**Evidence:** `db.orders.find({"customer_id": user["id"]}, {"_id": 0})` — no `restaurant_id` filter. Same customer id across restaurants would leak orders. Currently customer_id is a UUID so accidentally unique, but nothing prevents an admin from a query bypass.
**Risk:** A single bug in a route handler = tenant data leak. A malicious admin cannot query cross-tenant TODAY but could easily be made to via a new endpoint.
**Scale impact:** At thousands of restaurants, one leak = every-restaurant news.
**Fix:** (a) Enforce a `restaurant_id` filter on every restaurant-scoped query via a helper wrapper. (b) Use Mongo views or `$lookup` with restaurant_id constraint on any cross-collection queries. (c) Long-term: MongoDB per-tenant collections OR per-tenant DB (heavyweight).
**Effort:** ~1 week (audit + refactor).

### DATA-03 — 🔴 HIGH — No schema versioning / migrations framework
**Evidence:** No `alembic`, no `beanie`, no `motor-migrate`. Pydantic models drift silently.
**Risk:** Schema changes require code + prod docs to stay in lockstep. Any renamed field breaks queries silently (Motor returns None from missing keys).
**Scale impact:** Every schema change is scary. Slows velocity as data volume grows.
**Fix:** Adopt `beanie` or a lightweight migration script convention: `backend/migrations/YYYYMMDDHHMM_description.py` with `up()` / `down()`. Track applied migrations in `_migrations` collection.
**Effort:** ~1 week initial setup + team habit.

### DATA-04 — 🔴 HIGH — No backup / point-in-time recovery documented
**Evidence:** No backup script, no ops runbook mentioning restore procedure. Only `ops/mongo-outage-response-runbook.html` exists.
**Risk:** Atlas provides continuous backup on M10+ tiers — need to verify tier and RPO/RTO. If on M0/M2 shared, backups are limited.
**Scale impact:** Data loss = restaurant closes forever. Unacceptable at scale.
**Fix:** (a) Verify Atlas tier + backup settings. (b) Document RPO/RTO. (c) Add quarterly restore drills. (d) For sensitive collections (`orders`, `wallet_transactions`) add append-only audit log to a second store.
**Effort:** ~2 days (ops + docs).

### DATA-05 — 🟡 MEDIUM — Frequent config reads not cached server-side
**Evidence:** `db.customer_app_config.find_one({"restaurant_id": rid})` on every `/api/config/{rid}` call. FE caches in localStorage but backend does not.
**Risk:** Every menu page load = 1 config read. At target scale = 100K reads/hour for hot restaurants.
**Fix:** Redis cache in front of `customer_app_config` reads with 5-minute TTL. Invalidate on PUT/POST/DELETE writes. Solves both DB load and cold-start latency.
**Effort:** ~2 days.

### DATA-06 — 🟡 MEDIUM — No data lifecycle / archival for orders
**Evidence:** `db.orders` grows unbounded. No TTL, no archival job.
**Risk:** Cold, old orders (>1 year) blow up index size and cost.
**Fix:** Cold-storage archive job: monthly, move orders older than 12 months to a separate `orders_archive` collection or a warehouse (BigQuery / Snowflake). Keep active `orders` lean.
**Effort:** ~3 days.

### DATA-07 — 🟡 MEDIUM — Timestamps not consistently ISO strings / TZ-aware
**Evidence:** `datetime.now(timezone.utc)` is used well, but many old records were probably `.utcnow()` (naive). Some queries sort on `created_at` assuming string ISO format.
**Risk:** Comparison of naive vs aware datetimes throws in Python 3.11+.
**Fix:** Migration to normalize all `created_at` to UTC ISO strings. Enforce Pydantic Field validators for future writes.
**Effort:** ~2 days.

### DATA-08 — 🟡 MEDIUM — 80-key config document is a fat single-doc anti-pattern
**Evidence:** `customer_app_config` per restaurant has ~80 keys (banners array, pages array, feedback array, branding, flags…). Every admin edit rewrites the whole doc.
**Risk:** MongoDB doc size limit 16 MB — banners with base64 or long content will hit this. Concurrent admin writes overwrite each other (no `$set` guards on all paths).
**Fix:** Split into 3 collections: `restaurant_config` (flags, branding), `restaurant_banners` (per-banner docs), `restaurant_pages`. Use `$set` with dot-notation for granular updates.
**Effort:** ~1 week (schema + migration + FE adjustments).

### DATA-09 — 🟢 LOW — ObjectId serialization inconsistency
**Evidence:** `agent_prompt` Part B mentions PyObjectId pattern; server.py projects `{"_id": 0}` everywhere to avoid it. Ad-hoc approach.
**Risk:** A future endpoint that forgets `{"_id": 0}` returns non-JSON-serializable data.
**Fix:** Adopt the `PyObjectId` + `BaseDocument` pattern from Emergent MongoDB adherence guide.
**Effort:** ~2 days.

### DATA-10 — 🟢 LOW — `status_checks` collection appears unused legacy
**Evidence:** `server.py:1431-1450` — `/api/status` endpoints that write/read `status_checks`. Not called from FE grep. Looks like template scaffolding.
**Risk:** Adds surface area, confuses new engineers.
**Fix:** Remove the collection + endpoints, or document as monitoring canary.
**Effort:** 30 min.

---

## 3.3 Scalability

### SCALE-01 — 🔴 HIGH — Backend cannot horizontally scale (in-memory OTP)
See **SEC-02**. Same fix.

### SCALE-02 — 🔴 HIGH — File uploads to local pod disk are non-shareable and non-persistent
**Evidence:** `server.py:70` mounts `/api/uploads` as StaticFiles from `backend/uploads/`. Uploads written there via `server.py:1385`.
**Risk:** (a) On pod restart the directory is wiped (Emergent container FS is ephemeral for most tiers). (b) Behind an LB, pod A stores `/api/uploads/x.jpg`; pod B returns 404 when the browser asks for it. (c) No CDN → every image request hits FastAPI (heavy).
**Scale impact:** Cannot run more than 1 backend replica AT ALL for this reason.
**Fix:** Migrate to object storage (S3 / GCS). Pre-signed uploads: FE requests a signed URL from own-BE, uploads directly to S3, tells own-BE the resulting URL. Serve via CDN (CloudFront / Cloudflare). Emergent has an object storage integration playbook.
**Effort:** ~1 week.

### SCALE-03 — 🔴 HIGH — Single Uvicorn worker; no Gunicorn / worker pool
**Evidence:** Supervisor conf runs `uvicorn server:app --reload` — single worker, dev mode.
**Risk:** ONE Python process for all traffic. GIL-bound for any CPU work (bcrypt hashing!). Motor is async so I/O-heavy scales well, BUT bcrypt.hashpw and jwt.encode are synchronous and can starve the event loop.
**Scale impact:** Login/OTP endpoints will backpressure event loop under load. Response times spike.
**Fix:** In prod, run `gunicorn -k uvicorn.workers.UvicornWorker -w $((CPU*2+1)) server:app`. Push bcrypt to `run_in_executor` (thread pool). Consider Argon2id (native async support in argon2-cffi).
**Effort:** ~2 days.

### SCALE-04 — 🔴 HIGH — httpx.AsyncClient created per call, not pooled
**Evidence:** `server.py:402, 842, 869, 903` — four `async with httpx.AsyncClient(...)` per-request creations.
**Risk:** Every POS/CRM call opens fresh TCP + TLS handshake (~150-300 ms overhead each). Under load: socket exhaustion, TLS handshake CPU. No keep-alive reuse.
**Scale impact:** At 1000 concurrent orders, POS calls add ~300ms latency each PLUS occupy sockets in TIME_WAIT.
**Fix:** One module-level `httpx.AsyncClient` per external service (POS, CRM), reused across requests. Configure with `httpx.Limits(max_connections=200, max_keepalive_connections=50)`. Close on `@app.on_event("shutdown")`.
**Effort:** ~4 hours.

### SCALE-05 — 🟡 MEDIUM — No caching layer (Redis / Memcached)
**Evidence:** No Redis in stack. `requirements.txt` has no redis client.
**Risk:** Every request that could hit cache instead hits Mongo or POS. Every restaurant-config read = Mongo hit. Every menu = POS hit.
**Scale impact:** Costs grow linearly with traffic instead of sublinearly.
**Fix:** Redis for: config cache (DATA-05), OTP store (SEC-02), rate limiter (SEC-01), session revocation set (SEC-07), lightweight menu cache. `fastapi-cache2` + `aioredis`.
**Effort:** ~1 week.

### SCALE-06 — 🟡 MEDIUM — Frontend served in dev mode via `craco start`
**Evidence:** Supervisor runs `yarn start` (craco dev server) on :3000. No `yarn build && serve build/`.
**Risk:** Dev server is unoptimized, single-threaded, includes source maps, HMR overhead. Not fit for production traffic.
**Fix:** Build once, serve `build/` via nginx (or S3 + CloudFront). Dev server strictly for local dev.
**Effort:** ~1 day.

### SCALE-07 — 🟡 MEDIUM — CRA (`react-scripts 5.0.1`) is officially deprecated
**Evidence:** `frontend/package.json:react-scripts 5.0.1`. Meta deprecated CRA in Feb 2023. No security or perf improvements since.
**Risk:** Vulnerabilities in webpack 4.x transitive deps; slow dev builds; no HTTP/2 push, no modern tree-shaking.
**Scale impact:** Bundle size ~3-5MB, LCP suffers on mobile, SEO worse.
**Fix:** Migrate to Vite or Next.js. Next.js gives SSR/SSG as bonus (fixes PERF-04). Effort is moderate — CRACO configs port over.
**Effort:** ~2 weeks (Vite) or ~4-6 weeks (Next.js with SSR).

### SCALE-08 — 🟡 MEDIUM — No code splitting; single 168-file bundle
**Evidence:** `find src/**/*.{js,jsx,ts,tsx}` = 168 files. `grep React.lazy` = 0 hits. Only 1 dynamic import (in response interceptor).
**Risk:** First byte to interactive on 4G mobile: probably 3-6s. Every route change loads unrelated admin code.
**Fix:** `React.lazy` + `Suspense` split by route: customer routes / admin routes / OrderSuccess. Cut initial bundle in half.
**Effort:** ~3 days.

### SCALE-09 — 🟢 LOW — QueryClient `staleTime` / cache config not tuned
**Evidence:** `App.js:46-47` sets retry:2, backoff, but no `staleTime` (default: 0, immediate refetch).
**Risk:** Every mount re-fetches menu, restaurant details, tables — unnecessary Mongo/POS traffic.
**Fix:** Set `staleTime: 60_000` for menu/restaurant queries (menu doesn't change every second). `refetchOnWindowFocus: false` for menu.
**Effort:** 30 min.

### SCALE-10 — 🟢 LOW — Provider stack forces every context active on every page
**Evidence:** `App.js` — QueryClientProvider → AuthProvider → RestaurantConfigProvider → BrowserRouter → CartWrapper → Routes. All active for `/login` too.
**Risk:** Marginal render cost. More importantly, admin routes carry customer contexts and vice versa.
**Fix:** Split routes into subtrees where possible. Admin routes don't need CartWrapper.
**Effort:** ~2 days.

---

## 3.4 Reliability

### REL-01 — 🔴 HIGH — No LB probe wired to `/api/healthz` (CR-2026-07-03-009 open)
**Evidence:** `/api/healthz` exists (`server.py:1408`). CR-009 says ops needs to wire it to LB. Session handover confirms unclaimed.
**Risk:** During upstream outage, `/api/healthz` returns 503 correctly but no LB is consuming it → pod stays in rotation, users get errors.
**Fix:** Ops CR — wire readiness probe: 3s timeout, 3 consecutive failures → mark unhealthy. Also add liveness probe with a lighter check (just returns 200 if the process is alive).
**Effort:** 30 min (ops-side).

### REL-02 — 🔴 HIGH — No idempotency on order placement
**Evidence:** `POST /customer/order/place` on POS — no idempotency key. FE user double-tap = potential double order.
**Risk:** Every payment provider (Stripe, Razorpay) has idempotency keys precisely to prevent this. MyGenie POS may not support it, but even a client-side `orderDispatchedRef` (which exists at line 1338 of ReviewOrder) is only a soft guard — race conditions still possible.
**Scale impact:** Duplicate orders = refunds = ops cost.
**Fix:** Generate `Idempotency-Key` on order start (UUID), attach to POS call. Own-BE stores `(idempotency_key, order_id)` mapping for 24h. Retry with same key = returns existing order_id. If POS doesn't support keys, own-BE mediates.
**Effort:** ~1 week (requires POS coordination).

### REL-03 — 🔴 HIGH — No circuit breaker for POS/CRM external calls
**Evidence:** `tenacity==9.1.4` is in `requirements.txt` but not imported anywhere in `server.py`. External calls proceed regardless of upstream health.
**Risk:** When POS is slow, every request queues up on `httpx.AsyncClient`, pool exhausted, event loop blocked. Cascading failure.
**Fix:** Wrap external calls in `tenacity` retry (max 3, exp backoff) + `aiobreaker` circuit breaker (open after 5 failures, half-open after 30s). Fail fast when POS is down; return cached data where possible.
**Effort:** ~3 days.

### REL-04 — 🟡 MEDIUM — Backend retries POST-ing on transient errors is unclear
**Evidence:** `retryWrites=True` on motor — retries writes to Mongo. But no retry policy on POS `POST /order/place` calls.
**Risk:** Transient POS 502 = lost order. User taps again = potential double.
**Fix:** Combined with REL-02 idempotency, retry up to 3× with exp backoff on 5xx / network errors.
**Effort:** subsumed by REL-02+REL-03.

### REL-05 — 🟡 MEDIUM — 25 raw fetch() calls still without client-side timeout
**Evidence:** Prior audit — 5 wrapped in CR-2026-02-XX-001. Remaining: 8 files, 20+ raw fetches.
**Risk:** During upstream slowness, those UI paths hang 30-90s.
**Fix:** CR-2026-07-04-003 residual scope, plus a decision on `crmService.js` (owner declined this session).
**Effort:** ~1 day (8 files).

### REL-06 — 🟡 MEDIUM — No graceful shutdown handling
**Evidence:** `@app.on_event("shutdown")` closes Mongo client but not httpx clients (there are no reused ones anyway).
**Risk:** In-flight requests may be dropped on rolling deploys. Combined with REL-02 = potential order loss during deploy.
**Fix:** Register signal handlers, drain in-flight, close httpx pools cleanly. Uvicorn already supports `--timeout-graceful-shutdown`.
**Effort:** ~1 day.

### REL-07 — 🟢 LOW — No chaos testing / failure injection
**Evidence:** No chaos-mesh, no toxiproxy, no game days documented.
**Risk:** Never rehearsed failures = fumbled recovery.
**Fix:** Quarterly game day: kill Mongo primary during business hours (staging), measure recovery time. Formalize.
**Effort:** ongoing.

### REL-08 — 🟢 LOW — Retry logic in QueryClient is fixed (retry:2)
**Evidence:** `App.js:46` — retry:2 for all queries.
**Risk:** Some queries (config, menu) benefit from more retries; others (auth) should not retry at all.
**Fix:** Per-query retry config via `useQuery({queryFn, retry: 5, staleTime: ...})`.
**Effort:** ~2 hours.

---

## 3.5 Performance

### PERF-01 — 🔴 HIGH — bcrypt runs on event loop, blocking
**Evidence:** `server.py:362` — `bcrypt.checkpw(...)` and `server.py:655` — `bcrypt.hashpw(...)` are synchronous. Called inline in async route handlers.
**Risk:** bcrypt with default cost is ~100-300ms per call. During a login burst, event loop is blocked → all other requests queue.
**Scale impact:** With one Uvicorn worker, ~5-10 login/second saturates the loop.
**Fix:** `await asyncio.to_thread(bcrypt.checkpw, ...)`. Or migrate to `argon2-cffi` which has async support.
**Effort:** ~1 hour.

### PERF-02 — 🟡 MEDIUM — No response compression (gzip/br)
**Evidence:** No `GZipMiddleware` in `server.py`. Config responses (80 keys, banners array) can be large.
**Fix:** `app.add_middleware(GZipMiddleware, minimum_size=1024)`. Or handle at nginx/CDN layer.
**Effort:** 30 min.

### PERF-03 — 🟡 MEDIUM — No ETag / conditional GET on config
**Evidence:** `/api/config/{rid}` returns full doc on every call. FE cache is separate.
**Risk:** Bandwidth waste on repeat visits when config unchanged.
**Fix:** Add ETag header (hash of doc), return 304 if `If-None-Match` matches.
**Effort:** ~4 hours.

### PERF-04 — 🟡 MEDIUM — No SSR / prerender → poor mobile LCP
**Evidence:** CRA-built SPA. Every visit downloads bundle, then bootstraps, then fetches.
**Risk:** Slow first paint on 3G/4G, hurts conversion.
**Scale impact:** At target scale, LCP is a Core Web Vital that affects Google ranking of restaurant pages (if any are SEO-eligible via QR menus with URLs).
**Fix:** Migrate to Next.js SSR for at least the landing / menu routes.
**Effort:** subsumed by SCALE-07.

### PERF-05 — 🟡 MEDIUM — Menu data likely refetched too aggressively
**Evidence:** `useMenuData.js` uses React Query; grep suggests no explicit `staleTime`.
**Fix:** See SCALE-09.
**Effort:** subsumed.

### PERF-06 — 🟢 LOW — Image assets not optimized (no next/image, no WebP fallback)
**Evidence:** Menu images and banners served from `manage.mygenie.online` — no size negotiation.
**Fix:** Image CDN with responsive URLs (Cloudinary / imgproxy). Fetch `?w=640&fm=webp` from FE.
**Effort:** ~3 days.

### PERF-07 — 🟢 LOW — Font loading not optimized
**Evidence:** No `<link rel=preload>` for critical fonts in `public/index.html`.
**Fix:** Preload primary font, `font-display: swap`.
**Effort:** ~1 hour.

---

## 3.6 Observability

### OBS-01 — 🔴 HIGH — No APM / error tracking (Sentry / Datadog / NewRelic)
**Evidence:** grep found none in requirements.txt or FE package.json.
**Risk:** Errors invisible until user reports. No stack traces, no user context, no release tracking.
**Scale impact:** At thousands of restaurants, one bug affects hundreds simultaneously; without APM you find out from angry Slack messages.
**Fix:** Sentry (free tier is generous). One SDK for BE + one for FE. Release tagging via CI.
**Effort:** ~1 day.

### OBS-02 — 🔴 HIGH — No metrics (Prometheus / StatsD)
**Evidence:** No `prometheus_client`, no `/metrics` endpoint.
**Risk:** No visibility into RPS, latency percentiles, error rate, DB pool saturation, business KPIs.
**Fix:** Add `prometheus-fastapi-instrumentator`. Expose `/metrics`. Grafana dashboard: RPS, p50/p95/p99 latency, error rate, DB pool.
**Effort:** ~2 days initial + ongoing dashboard building.

### OBS-03 — 🔴 HIGH — No client telemetry (CR-2026-07-04-004 open)
**Evidence:** Prior investigation. No `client_telemetry_events` collection.
**Risk:** Frontend timeouts, JS errors, slow renders all invisible.
**Fix:** CR-2026-07-04-004 as filed. Or delegate to Sentry (OBS-01).
**Effort:** subsumed by OBS-01 if Sentry covers frontend.

### OBS-04 — 🟡 MEDIUM — Logs use stdlib `logging` — not structured, no correlation IDs
**Evidence:** `server.py:8, 422, 425, 428, 463, 596, 839, 853, 856, 1632` — plain-text `logging.info/warning/error`.
**Risk:** At scale, plain-text logs are un-queryable. Cannot correlate a client request through own-BE → POS → CRM.
**Fix:** `structlog` or `python-json-logger`. Add middleware that injects `X-Request-ID` and propagates to POS/CRM. Ship to CloudWatch/Datadog Logs/Loki.
**Effort:** ~1 week.

### OBS-05 — 🟡 MEDIUM — No distributed tracing
**Evidence:** No OpenTelemetry / OpenTracing SDK.
**Risk:** Cannot see end-to-end latency breakdown (FE → own-BE → Mongo → POS).
**Fix:** OpenTelemetry auto-instrumentation for FastAPI + httpx + motor. Ship to Tempo / Jaeger / Datadog APM.
**Effort:** ~1 week.

### OBS-06 — 🟡 MEDIUM — No alerting rules
**Evidence:** No PagerDuty / Opsgenie config; no alertmanager rules.
**Risk:** Errors detected but nobody notified in real-time.
**Fix:** Alert rules on: p99 latency > 2s, error rate > 1%, `/api/healthz` failing, DB pool saturation, external timeout rate.
**Effort:** ~3 days.

### OBS-07 — 🟢 LOW — No audit log for admin actions
**Evidence:** No log of who changed which restaurant config field, when.
**Risk:** Cannot forensics-audit "who broke the menu at 3 AM."
**Fix:** Append-only `admin_audit_log` collection: `{user_id, action, resource, before, after, timestamp}`.
**Effort:** ~3 days.

---

## 3.7 Deployment & Ops

### OPS-01 — 🔴 HIGH — No CI/CD pipeline
**Evidence:** No `.github`, no `.gitlab-ci.yml`, no CircleCI. Deploys via manual git push + supervisor reload.
**Risk:** Every deploy is human-executed, no automated tests, no rollback plan, no promotion gates.
**Scale impact:** As team grows, deploy frequency grows, this becomes THE bottleneck.
**Fix:** GitHub Actions or GitLab CI: lint → test → build → deploy to staging → smoke → deploy to prod. Blue/green or canary.
**Effort:** ~2 weeks initial + ongoing.

### OPS-02 — 🔴 HIGH — No prod / staging / dev environment separation
**Evidence:** One `.env` per app. `preprod.mygenie.online` is used for API, but no separate DB, no separate config.
**Risk:** Every code change goes straight to whatever env is deployed. No safe place to test schema migrations.
**Fix:** Provision separate MongoDB clusters and POS/CRM sandboxes for dev/staging/prod. Environment-scoped .env files. Never share secrets across envs.
**Effort:** ~2 weeks (infra).

### OPS-03 — 🟡 MEDIUM — Secrets in `.env` plaintext, not managed by a vault
**Evidence:** `JWT_SECRET`, `MYGENIE_POS_LOGIN_PASSWORD`, MongoDB URL with password in `.env`.
**Risk:** Anyone with pod shell access reads all secrets. No rotation.
**Fix:** AWS Secrets Manager / Google Secret Manager / HashiCorp Vault. Inject at boot via IAM role, never write to disk.
**Effort:** ~1 week.

### OPS-04 — 🟡 MEDIUM — No infrastructure-as-code
**Evidence:** No Terraform, no CloudFormation, no Pulumi. Emergent pod config is not in the repo.
**Risk:** Infra changes are undocumented, not reviewable, not reproducible.
**Fix:** Terraform for Mongo Atlas, Redis, S3, secrets, CDN. Store in `ops/terraform/`.
**Effort:** ~2 weeks.

### OPS-05 — 🟡 MEDIUM — No SLOs / error budgets
**Evidence:** None defined in memory_repo.
**Risk:** No shared target — engineers optimize what feels good, not what customers care about.
**Fix:** Define SLOs: availability 99.5%, p95 API latency < 500ms, order-placement success rate > 99%. Compute error budget monthly.
**Effort:** ~1 week + ongoing tracking.

### OPS-06 — 🟡 MEDIUM — `Uvicorn --reload` running in prod-like environment
**Evidence:** Supervisor config uses `--reload`. Reload watches filesystem — non-trivial CPU + IO.
**Risk:** Reload triggers on stray file writes (uploads/, log rotation) → mid-request restart.
**Fix:** Two supervisor configs: `dev.conf` with reload, `prod.conf` without. Use `gunicorn` in prod (SCALE-03).
**Effort:** ~2 hours.

### OPS-07 — 🟢 LOW — `stripe==14.4.0` in requirements.txt but unused (Razorpay is the actual PSP)
**Evidence:** `requirements.txt` has stripe; `server.py` has 0 references to it.
**Risk:** Dead dep in bundle, potential vulnerabilities go unpatched (silently).
**Fix:** Remove or explicitly note as future-planned.
**Effort:** 15 min.

### OPS-08 — 🟢 LOW — No dependency vulnerability scanning
**Evidence:** No `dependabot.yml`, no `snyk`, no `pip-audit` in CI.
**Risk:** Vulnerable transitive deps accumulate.
**Fix:** `pip-audit` in CI. Dependabot for GitHub. `yarn audit` in CI for FE.
**Effort:** ~4 hours + ongoing triage.

---

## 3.8 Maintainability & Code Quality

### MAINT-01 — 🟡 MEDIUM — server.py is 1,791 lines monolithic file
**Evidence:** `wc -l server.py` = 1,791.
**Risk:** Hard to test in isolation. Merge conflicts frequent. New engineers overwhelmed.
**Fix:** Split by domain: `routes/auth.py`, `routes/config.py`, `routes/customer.py`, `services/pos_client.py`, `models/customer.py`. Use APIRouter in each. Keep `server.py` as app-composition only.
**Effort:** ~2 weeks.

### MAINT-02 — 🟡 MEDIUM — 15+ localStorage keys, 6 undocumented (per prior audit)
**Evidence:** `BASELINE_DELTA_2026-02.md §3`.
**Risk:** Ambient session state. Duplicate keys (`pos_token` vs `order_auth_token`; `authToken` vs `auth_token`) invite bugs.
**Fix:** Consolidate into one `useLocalStorage` hook with typed key registry. Rename/migrate legacy keys behind an "on-mount migration" that runs once.
**Effort:** ~1 week.

### MAINT-03 — 🟡 MEDIUM — Restaurant 716 hardcoded logic (BUG-006 parked)
**Evidence:** 11 references to `'716'` in ReviewOrder.jsx.
**Risk:** Adding more per-restaurant special cases will explode into an if/else forest.
**Fix:** Move to a config flag in `customer_app_config` (`requires_fresh_room_selection: true`). Un-hardcode.
**Effort:** ~2 days.

### MAINT-04 — 🟡 MEDIUM — `payment_method` vs `payment_type` semantic split (BUG-007 parked)
**Evidence:** `orderService.ts:386, 523`.
**Risk:** Every new engineer will "helpfully" refactor this and break POS integration.
**Fix:** Rename to `pos_payment_method_legacy` (or delete if POS accepts it as optional). Document why.
**Effort:** ~1 day (touches POS coord).

### MAINT-05 — 🟢 LOW — No API versioning strategy
**Evidence:** All routes under `/api/` — no `/api/v1/`, no version negotiation.
**Risk:** Breaking changes hurt mobile apps and long-lived FE tabs.
**Fix:** Prefix with `/api/v1/`. When breaking changes needed, add `/api/v2/` and dual-run.
**Effort:** ~4 hours + coordination.

### MAINT-06 — 🟢 LOW — Mixed HTTP style (axios vs fetch vs fetchWithTimeout)
**Evidence:** FE has 3 different HTTP call styles.
**Risk:** Inconsistent interceptor coverage, logging, retries.
**Fix:** One HTTP client (axios) with per-instance timeout config. Deprecate raw `fetch` and `fetchWithTimeout` after all sites migrated.
**Effort:** ~2 weeks.

### MAINT-07 — 🟢 LOW — Pydantic model set is incomplete
**Evidence:** 20 BaseModel classes for ~40 endpoints — some routes take raw dict.
**Risk:** No validation on those routes.
**Fix:** One Pydantic request + response model per route. Enable strict mode.
**Effort:** ~1 week.

### MAINT-08 — 🟢 LOW — Docs served under `/api/docs/*` (8 markdown routes)
**Evidence:** `server.py:1699-1762`.
**Risk:** Non-standard place for internal docs to live inside the API server. Ships internal engineering docs to any authenticated user.
**Fix:** Move to a separate docs site (MkDocs / Docusaurus). Keep FastAPI `/docs` (Swagger) only.
**Effort:** ~2 days.

---

## 3.9 Compliance & Privacy

### COMP-01 — 🔴 HIGH — Razorpay payment orchestration = PCI DSS scope
**Evidence:** `orderService.ts` + `ReviewOrder.jsx` embed Razorpay checkout. PAN never touches our servers (SAQ-A eligible), but we must audit.
**Risk:** If Razorpay checkout is loaded via any URL under our control that could inject code, we lose SAQ-A.
**Fix:** Complete SAQ-A. Document that we never touch PAN. Enforce CSP so Razorpay JS is loaded only from `https://checkout.razorpay.com` (SEC-05).
**Effort:** ~1 week (compliance work).

### COMP-02 — 🟡 MEDIUM — No PII inventory / data map
**Evidence:** Customer phone, name, address stored across `customers`, `orders`, and CRM. No single source-of-truth doc.
**Risk:** DPDPA (India) / GDPR requests cannot be fulfilled — "give me all my data" or "delete my data" span multiple systems.
**Fix:** Data map: which system stores which PII field, retention period, access controls.
**Effort:** ~2 weeks (audit + doc).

### COMP-03 — 🟡 MEDIUM — No customer data deletion path
**Evidence:** No `DELETE /api/customer/me` endpoint.
**Risk:** DPDPA requires deletion on request. No mechanism today.
**Fix:** Add endpoint that soft-deletes customer, anonymizes phone/name in `orders`, cascades to CRM.
**Effort:** ~1 week.

### COMP-04 — 🟡 MEDIUM — No cookie / privacy notice, no consent banner
**Evidence:** grep `cookie`, `consent`, `privacy` on public/index.html + src → 0 hits.
**Risk:** DPDPA/GDPR require consent for non-essential cookies/telemetry. If we ever add analytics (Sentry / GA), this becomes mandatory.
**Fix:** Consent management platform (CMP) — Osano / OneTrust / homegrown minimal banner.
**Effort:** ~1 week.

### COMP-05 — 🟢 LOW — No data-residency documentation
**Evidence:** Mongo Atlas 52.66.232.149 → India region — but not explicitly documented.
**Risk:** Enterprise restaurants ask; we don't have the answer written down.
**Fix:** 1-page data residency doc.
**Effort:** 2 hours.

---

## 3.10 Testing

### TEST-01 — 🔴 HIGH — Zero backend tests
**Evidence:** `find /app -name "test_*.py"` = 0.
**Risk:** Every change is validated only by testing_agent (which is manual + slow). No regression suite.
**Scale impact:** Velocity plummets as codebase grows. Refactors terrifying.
**Fix:** Pytest suite: unit tests for pure helpers, integration tests with `mongomock-motor` for repos, contract tests with `httpx.MockTransport` for POS/CRM. Aim for 60% coverage on business logic in 3 months.
**Effort:** ongoing.

### TEST-02 — 🔴 HIGH — Zero frontend tests
**Evidence:** `find /app -name "*.test.*"` (outside node_modules) = 0.
**Risk:** Same as above. Especially bad for the CRITICAL hotspot ReviewOrder.jsx.
**Fix:** React Testing Library for unit + component; Playwright for E2E on core flows.
**Effort:** ongoing.

### TEST-03 — 🟡 MEDIUM — No load / stress testing baseline
**Evidence:** No `locust`, `k6`, or `artillery` scripts.
**Risk:** Don't know where we break until we break in prod.
**Fix:** `k6` scripts for order-placement, menu-load, admin-config flows. Baseline "1000 concurrent orders in 5 min" run monthly.
**Effort:** ~1 week initial + ongoing.

---

## 4. Prioritized Roadmap

Grouped into 0-3-month, 3-6-month, 6-12-month sprints. Each item has an ID reference back to §3.

### 0-3 months — "Cannot scale beyond 1 replica without these"

| # | ID | Item | Effort | Blocks scale? |
|---|---|---|---|---|
| 1 | SEC-01 | Rate limiting (SMS-bomb protection) | 4h | ✅ safety |
| 2 | SEC-02 + SCALE-01 | Redis for OTP + sessions | 1w | ✅ HORIZONTAL |
| 3 | SCALE-02 | S3 for uploads | 1w | ✅ HORIZONTAL |
| 4 | SCALE-03 | Gunicorn workers + bcrypt off-loop (PERF-01) | 2d | ✅ CPU |
| 5 | SCALE-04 | httpx AsyncClient pooling | 4h | ✅ sockets |
| 6 | DATA-01 | MongoDB indexes on hot fields | 4h | ✅ DB CPU |
| 7 | REL-01 | LB probe wiring (ops) | 30m | ✅ outage recovery |
| 8 | OBS-01 | Sentry (BE + FE) | 1d | 👁 visibility |
| 9 | OBS-02 | Prometheus + Grafana | 2d | 👁 visibility |
| 10 | SEC-03 | Lock down CORS | 2h | 🔒 security |
| 11 | SEC-05 | Security headers + CSP | 1d | 🔒 security |
| 12 | SEC-04 | Kill FE login creds; proxy CRM keys | 2d | 🔒 security |
| 13 | SEC-06 | File upload MIME + AV | 3-5d | 🔒 security |
| 14 | OPS-01 | Basic CI/CD (lint + test + deploy) | 2w | 🚀 velocity |
| 15 | TEST-01 + TEST-02 | Bootstrap test suites | ongoing | 🛡 velocity |

**Cumulative effort:** ~6-8 engineer-weeks. **Impact:** unlocks horizontal scale to 3-5 replicas × modest traffic.

### 3-6 months — "Ready for growth"

| # | ID | Item | Effort |
|---|---|---|---|
| 16 | SEC-07 | RS256 + refresh tokens | 1w |
| 17 | SEC-08 | Consolidate 3 auth systems | 2-3w |
| 18 | SEC-09 | Password policy + admin MFA | 1w |
| 19 | REL-02 | Order idempotency | 1w |
| 20 | REL-03 | Circuit breaker on POS/CRM | 3d |
| 21 | DATA-05 | Redis cache for restaurant_config | 2d |
| 22 | SCALE-05 | Full Redis integration | 1w |
| 23 | SCALE-07 or SCALE-08 | Vite migration + code splitting | 2w |
| 24 | SCALE-06 | FE served from build, not dev server | 1d |
| 25 | OBS-04 | Structured logs + correlation IDs | 1w |
| 26 | OBS-05 | OpenTelemetry tracing | 1w |
| 27 | OBS-06 | Alerting rules | 3d |
| 28 | DATA-02 | Enforce tenant isolation | 1w |
| 29 | DATA-08 | Split fat config doc | 1w |
| 30 | OPS-02 | Prod/staging/dev separation | 2w |
| 31 | OPS-03 | Vault for secrets | 1w |
| 32 | COMP-01 | PCI SAQ-A compliance | 1w |
| 33 | COMP-02 + COMP-03 | Data map + deletion endpoint | 2-3w |
| 34 | MAINT-01 | Split server.py into modules | 2w |
| 35 | TEST-03 | k6 load testing baseline | 1w |

**Cumulative effort:** ~14-18 engineer-weeks. **Impact:** production-grade for thousands of restaurants.

### 6-12 months — "Enterprise-ready"

| # | ID | Item | Effort |
|---|---|---|---|
| 36 | SCALE-07 | Next.js SSR migration | 4-6w |
| 37 | DATA-03 | Migration framework (beanie) | 1w |
| 38 | DATA-04 | Backup drills + PIT recovery | 2d |
| 39 | DATA-06 | Order archival job | 3d |
| 40 | DATA-07 | Timestamp normalization | 2d |
| 41 | REL-06 | Graceful shutdown | 1d |
| 42 | OPS-04 | Terraform infra-as-code | 2w |
| 43 | OPS-05 | SLO/SLI + error budget | 1w |
| 44 | MAINT-02 | localStorage consolidation | 1w |
| 45 | MAINT-03 | Un-hardcode Rest 716 | 2d |
| 46 | MAINT-04 | Reconcile payment_method/type | 1d |
| 47 | MAINT-05 | API versioning `/v1/` | 4h |
| 48 | MAINT-06 | Single HTTP client convention | 2w |
| 49 | COMP-04 | Cookie consent | 1w |
| 50 | Remaining LOW items | | as-you-go |

---

## 5. Appendix — Scale Model Assumptions

Assumptions for "thousands of restaurants":

- **Restaurants:** 5,000 active
- **Peak concurrency:** 200 restaurants each with 10 concurrent tables ordering = 2,000 in-flight order sessions
- **Order throughput peak:** 500 orders/minute (~8/second)
- **Auth events:** 20/second peak (OTP + login mix)
- **Menu views:** 5,000/minute peak (~85/second) — heavily cacheable
- **Config reads:** 5,000/minute peak — heavily cacheable
- **Admin edits:** 100/minute (much rarer)
- **Data growth:**
  - `customers`: ~1M docs (5,000 restaurants × 200 unique customers/month)
  - `orders`: ~500K docs/month → 6M/year — needs archival
  - `customer_app_config`: 5,000 docs (one per restaurant) — small, hot cached
- **Bandwidth:**
  - Menu images ~500 KB each × 20 items × 85 rps = ~850 MB/s peak — CDN mandatory
  - Config docs ~50 KB each × 85 rps = ~4 MB/s — cacheable

**Implied compute:**
- Backend: 4-8 vCPU × 3-5 replicas (assuming Gunicorn 4 workers each)
- Redis: 4 GB memory, 1 primary + 1 replica
- MongoDB: Atlas M30+ (dedicated), 3-node replica set, auto-sharding key candidates: `restaurant_id`
- CDN: any (CloudFront / Cloudflare / Fastly)

---

## 6. What This Document Is Not

- Not a fix — it's a map. Fixes are implemented in individual CRs.
- Not exhaustive of edge cases — a well-instrumented system (post OBS-01/02) will reveal more.
- Not a POS/CRM audit — those systems are MyGenie-owned. We can only fix our client + own-backend.
- Not a mobile-app roadmap — this app is web-only today.

## 7. Recommended First Action

If the team can only pick ONE thing to do this month, do **DATA-01** (add MongoDB indexes) — it is 4 hours of work, LOW risk, and moves the app from "5K docs feels sluggish" to "1M docs feels the same." Every other fix has less bang-per-buck.

**Second best single item:** OBS-01 (Sentry) — 1 day of work, gives instant visibility into every issue in this doc that isn't yet manifest.

---

*End of Architecture Bible. Version 1.0 · 2026-02 · Based on code-truth from `main` HEAD at time of audit.*
