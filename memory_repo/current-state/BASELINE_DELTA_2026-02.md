# MyGenie Customer App — Baseline vs Current-Code Delta (2026-02)

**Purpose:** Show every claim in the older baseline docs that is now stale, missing, or contradicted by `main` HEAD.
**Method:** Compared `ARCHITECTURE_v2.md`, `current-state/CURRENT_ARCHITECTURE.md`, agent prompt Part B (`memory/control/…_ALPHA_v0_1.md`) against a fresh static parse of the current code.
**Companion docs:** `ARCHITECTURE_DIAGRAM_2026-02.md`, `DATA_FLOW_DIAGRAM_2026-02.md`

---

## Summary

| Baseline doc | Line-count refs | Status | Notes |
|---|---|---|---|
| `ARCHITECTURE_v2.md` | 422 | **PARTIALLY STALE** | 4-layer model still correct; specific endpoint/context claims drifted |
| `current-state/CURRENT_ARCHITECTURE.md` | 278 | **STALE line refs** | Cites `server.py:1-1610` but file is 1,791 lines. Provider stack is still correct. |
| Agent prompt Part B (§5-§13) | 1,585 in full | **MOSTLY VALID** | localStorage key list is incomplete; auth token TTL claim is missing/wrong |
| `API_MAPPING_v2.md` | n/a | **UNKNOWN drift** | Not compared endpoint-by-endpoint in this pass — recommend audit |

---

## 1. Route inventory drift (backend)

Agent prompt §7 lists ~13 endpoints. Actual code has **41 routes**.

### New / undocumented routes (present in code, missing from baseline)

| Route | Line | Introduced by |
|---|---|---|
| `POST /api/pos/auth-token` | server.py:828 | CR-2026-07-03-000 — POS token proxy so creds never bundled into FE |
| `GET /api/air-bnb/get-order-details/{order_id}` | server.py:863 | `air_bnb_router` — proxies POS order lookup |
| `GET /api/healthz` | server.py:1408 | **Dedicated health endpoint exists** (contradicts prior deployment handover which said none) |
| `GET /api/customer-lookup/{restaurant_id}` | server.py:1487 | Server-side CRM v2 call for customer summary |
| `GET /api/loyalty-settings/{restaurant_id}` | server.py:1452 | Consumed by `ReviewOrder.jsx:139` |
| `POST /api/diagnostics/non-qr-block` | server.py:1635 | CR-2026-05-30-002 — telemetry for non-QR block |
| `GET /api/customer/wallet` | server.py:978 | |
| `GET /api/customer/coupons` | server.py:998 | |
| `PUT /api/customer/profile` | server.py:1016 | |
| `POST /api/config/feedback` + `GET /api/config/feedback/{rid}` | server.py:1270, 1284 | |
| `POST/PUT/DELETE /api/config/banners[/{id}]` | server.py:1192, 1217, 1241 | |
| `POST/PUT/DELETE /api/config/pages[/{id}]` | server.py:1308, 1329, 1347 | |
| `GET /api/dietary-tags/available` + `/api/dietary-tags/{rid}` + `PUT /api/dietary-tags/{rid}` | server.py:1543, 1548, 1569 | |
| `POST /api/auth/set-password`, `/verify-password`, `/reset-password` | server.py:626, 697, 742 | |
| `POST /api/status` + `GET /api/status` | server.py:1431, 1440 | `status_checks` writer/reader |
| `GET /api/docs/{bug-tracker,api-mapping,code-audit,prd,roadmap,architecture,changelog,test-cases}` | server.py:1699-1762 | 8 documentation-serving routes |

### Routers not in baseline

- `air_bnb_router` — server.py:861
- `diagnostics_router` — server.py:79 (documented in agent prompt §7 as one endpoint, but router itself wasn't cited)

### External calls from backend

Baseline mentions POS + CRM. Confirmed. But breakdown was missing:

| # | To | Purpose |
|---|---|---|
| 1 | POS `/auth/login` from `send-otp` flow | server.py:402 |
| 2 | POS `/auth/login` from `/pos/auth-token` proxy | server.py:842 (NEW, CR-2026-07-03-000) |
| 3 | POS `/air-bnb/get-order-details/{oid}` | server.py:869 (NEW route) |
| 4 | CRM v2 customer-lookup | server.py:903 — builds base by `MYGENIE_API_URL.replace("/api/v1", "")` (⚠ fragile string manipulation) |

---

## 2. Environment variable drift

Agent prompt §4.5 lists 5 required BE vars: `MONGO_URL, DB_NAME, JWT_SECRET, MYGENIE_API_URL, CORS_ORIGINS`.

**Actual code (fails fast) requires 6:**

| Var | Was documented? | Reality |
|---|---|---|
| `MONGO_URL` | ✅ | required |
| `DB_NAME` | ✅ | required |
| `JWT_SECRET` | ✅ | required |
| `MYGENIE_API_URL` | ✅ | required |
| **`MYGENIE_POS_LOGIN_PHONE`** | ❌ **MISSING from §4.5** | required (server.py:58-60) |
| **`MYGENIE_POS_LOGIN_PASSWORD`** | ❌ **MISSING from §4.5** | required (server.py:62-64) |
| `CORS_ORIGINS` | ✅ | optional |

FE env: agent prompt §4.5 lists 9 vars. Actual code references **10**:

| Var | Missing from baseline? |
|---|---|
| `REACT_APP_BACKEND_URL` | ⚠ Baseline lists `REACT_APP_API_BASE_URL` but omits `REACT_APP_BACKEND_URL` — the own-backend URL, referenced in 17 files |
| `REACT_APP_CRM_API_KEY` | ⚠ NOT in baseline. JSON `{rid: apiKey}` map used by `crmService.js:18-26` |
| `REACT_APP_CRM_API_VERSION` | Baseline mentions but doesn't explain v1/v2 endpoint split |

---

## 3. localStorage keys drift

Agent prompt Part B §8 lists **9 keys**. Actual grep found **15+** including 6 undocumented:

| Key | In baseline? | Notes |
|---|---|---|
| `auth_token` | ✅ | |
| `crm_token_${rid}` | ✅ | |
| `crm_token` (legacy) | ✅ | |
| `restaurant_context` | ✅ | |
| `cart_${rid}` | ✅ | |
| `editOrder_${rid}` | ✅ | |
| `delivery_${rid}` | ✅ | |
| `prevRestaurantId` | ✅ | |
| `restaurant_config_${rid}` | ✅ | |
| **`order_auth_token`** | ❌ NEW | `utils/authToken.js:6` — POS token, 10-min TTL |
| **`order_token_expiry`** | ❌ NEW | `utils/authToken.js:7` |
| **`pos_token`** | ❌ NEW | grep-visible read/write — coexists with `order_auth_token` (⚠ dual-key ambiguity) |
| **`guestCustomer`** | ❌ NEW | Landing-page pre-OTP capture |
| **`restaurant_name_${rid}`** | ❌ NEW | Landing cache |
| **`refreshToken`** | ❌ NEW | `orderService.ts:68` — `/auth/refresh` call |
| **`authToken`** (camelCase) | ❌ Possibly typo | grep found both `authToken` and `auth_token` writes — needs audit |
| `debug:*`, `debug:order`, `debug:razorpay` | ❌ dev-only | logger module |

---

## 4. Provider stack — still correct

Agent prompt Part B §8:
> QueryClientProvider → AuthProvider → RestaurantConfigProvider → BrowserRouter → CartWrapper → Routes

✅ Verified in `App.js:56-143`.

⚠ One nuance the baseline omits: `AdminConfigProvider` mounts **inside** `AdminLayout` (only for `/admin/*` routes), not in the top-level tree. `layouts/AdminLayout.jsx:161-167`.

---

## 5. Backend size drift

- `ARCHITECTURE_v2.md` describes server.py as `~1000+ lines`.
- `CURRENT_ARCHITECTURE.md` line 37 cites `server.py:1-1610`.
- **Actual: 1,791 lines** (`wc -l`).

Growth is mostly:
- Air-bnb router + `/pos/auth-token` proxy + `/customer-lookup` (CR-2026-07-03-000 and predecessors)
- 8 documentation-serving routes (`/api/docs/*`)
- Additional customer endpoints (wallet, coupons, PUT /profile)
- `/healthz` endpoint

---

## 6. Auth-token TTL — inconsistent

`utils/authToken.js`:
- Comment (line 10): "Token expiration: 30 minutes"
- Constant (line 11): `TOKEN_EXPIRY_TIME = 10 * 60 * 1000; // 30 minutes in milliseconds`
- Console log (line 79): `"expiresIn: '10 minutes'"`

**Actual behaviour: 10 minutes.** Either the constant is a typo (should be 30) or the comment/docstring is stale. Neither the agent prompt nor `AUTH_TOKEN_FLOW_AUDIT.md` catches this.

Backend own-backend JWT has no explicit `exp` claim visible in `server.py` — agent prompt §7 said "no explicit expiry in visible code" ✅ **still true**.

---

## 7. `payment_method` vs `payment_type` — still a landmine

Agent prompt §7 & §12.3 flag this. Confirmed unchanged in `orderService.ts:386, 523`:

```
payment_method: 'cash_on_delivery'   // ⚠ hardcoded, do not "fix"
payment_type: orderData.paymentType || 'postpaid'
```

BUG-007 remains open + parked.

---

## 8. Restaurant 716 hardcoded branch — needs verification

Agent prompt §6.1 says `ReviewOrder.jsx` has hardcoded Restaurant 716 logic. Did not grep this pass. **Action:** verify still present, verify not accidentally removed.

Recommend: `grep -n "716" /app/frontend/src/pages/ReviewOrder.jsx`

---

## 9. New CR/feature evidence in code

| CR / Feature | Evidence in code | Status |
|---|---|---|
| CR-2026-05-30-001 config-driven OTP skip | `crmService.js:371` `/scan/auth/skip-otp`; `RestaurantConfigContext` skipOtp flags | ✅ Implemented |
| CR-2026-05-30-002 restrict non-QR orders | `diagnostics_router` + `/api/diagnostics/non-qr-block` at server.py:1635; `allowNonQrOrders` in config | ✅ Implemented |
| CR-2026-07-03-000 POS creds server-side | `/api/pos/auth-token` at server.py:828-859; `authToken.js:11-14` comments | ✅ Implemented |
| CR-2026-07-03-001 cache-bust escape hatch | `RestaurantConfigContext.jsx:10-27` `?bustCache=1` / `?nocache=1` | ✅ Implemented |
| CR-2026-07-03-003 Mongo explicit timeouts | `server.py:29-38` (5s serverSelection, 10s socket, 5s waitQueue) | ✅ Implemented |
| CR-2026-07-03-004 fetchWithTimeout 8s reads | `AuthContext.jsx:4`, `RestaurantConfigContext.jsx:5`, `useMenuData.js:417-435` | ✅ Implemented |

---

## 10. Remaining unknowns from Agent Prompt §13 — still unknown

None of the 17 open questions have been resolved by code inspection:

- Which system is canonical for customer identity (JWT vs CRM token)? Still ambiguous. Three parallel auth systems visible.
- POS vs CRM vs own-backend routing policy? No policy documented; call sites are ad-hoc.
- Production URLs / tag format / rollback / CI-CD / monitoring / rate-limiting / MongoDB backup — all UNKNOWN.
- Razorpay vs Stripe: `endpoints.js:49-50` **wires Razorpay** in the frontend; `requirements.txt` includes `stripe==14.4.0` but no Stripe route in `server.py`. **Razorpay is active, Stripe is dead-code dependency.**
- `AdminConfigContext.jsx` purpose: mounted inside `AdminLayout` — controls admin's view of the config being edited (vs `RestaurantConfigContext` which is the customer-app's live view). Two contexts serving overlapping data.

---

## 11. Recommended follow-up work (LOW risk — docs only)

1. **Update Agent Prompt Part B §4.5** to add `MYGENIE_POS_LOGIN_PHONE/_PASSWORD` and `REACT_APP_BACKEND_URL` / `REACT_APP_CRM_API_KEY`.
2. **Update Part B §8 localStorage table** with the 6 undocumented keys.
3. **Fix `authToken.js` docstring** — either raise TTL to 30 min or fix the comment/log to say 10.
4. **Retire `pos_token` legacy key** (or document it explicitly if it's still active).
5. **Retire `stripe` package** from `requirements.txt` if it's really unused (or add an ADR explaining why it's kept).
6. **Rewrite `CURRENT_ARCHITECTURE.md` line refs** to current line numbers (or drop line numbers — they'll always drift).
7. **Add `/api/customer-lookup` + `/api/loyalty-settings` to `API_MAPPING_v2.md`.**
8. **Audit `ReviewOrder.jsx` for Restaurant 716 branch** to confirm it's still present.

None of the above are code changes — all are doc updates.

---

## 12. Confidence in this delta

| Area | Confidence | Notes |
|---|---|---|
| Backend route inventory | HIGH | Full grep of all `@*_router` decorators; every route listed with line number |
| Backend external calls | HIGH | grep of `httpx.` in server.py — 4 destinations |
| Frontend provider stack | HIGH | Verified `App.js:56-143` |
| Frontend API layer | HIGH | Verified `api/config/*`, `api/services/*`, `api/interceptors/*` |
| localStorage inventory | HIGH | grep across all frontend source (`.js`, `.jsx`, `.ts`, `.tsx`) excluding node_modules |
| CRM v1 vs v2 endpoint split | HIGH | Verified in `crmService.js:210-512` |
| Env var fail-fast | HIGH | Verified server.py:24-64 |
| Restaurant 716 branch | LOW | Not re-verified this pass — recommend follow-up grep |
| `pos_token` vs `order_auth_token` semantics | LOW | Both keys are read/written; need behavioural trace to confirm which is active |
| Baseline drift in `API_MAPPING_v2.md` | LOW | Not compared endpoint-by-endpoint this pass |

---

*End of Baseline Delta 2026-02.*
