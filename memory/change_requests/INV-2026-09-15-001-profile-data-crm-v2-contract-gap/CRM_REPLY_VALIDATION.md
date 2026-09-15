# CRM Reply Validation — INV-2026-09-15-001 (CRM ref INV-017)

**Role:** Investigation (Role 6) — read-only, no code
**Date:** 2026-09-15 · **Steps used:** 9/10 (cumulative for this INV)
**Inputs validated:** `INV_017_CRM_CONTRACT_REPLY_TO_CUSTOMER_APP.md`, `INV_017_CUSTOMER_APP_CONTRACT_GAPS.md`, `INV_017_CUSTOMER_SCAN_API_CONTRACT_v2.md` (2 uploads were the same reply file; `INV_017_openapi_scan_v2.json` **not received**)
**Method:** each CRM claim checked against (a) live read-only probes on `https://crm.mygenie.online/api` with no/invalid token, (b) Customer App code on `sep15`.

---

## 1. Verdict

CRM's core claim is **correct and confirmed live**: orders / points / wallet exist under `/scan/*`; `/customer/me/*` never existed. Root cause stays **FE partial v2 migration** (our INVESTIGATION_REPORT §3) — CRM classifies it the same way (their GAP matrix §1 "CONFIG/CONTRACT (FE)").

Reply is **ACCEPTED with 4 discrepancies (§3) and 10 Customer-App-side gaps (§4)** that must be carried into the Planning CR. Nothing here requires CRM code for the MVP fix; several items need **owner decisions** (§5).

---

## 2. Claims confirmed (live, 2026-09-15)

| CRM claim | Probe | Result |
|---|---|---|
| `GET /scan/loyalty` exists | bad token | 401 `Invalid customer token` ✅ |
| `GET /scan/points/history?limit=50` exists | bad token | 401 ✅ |
| `GET /scan/wallet/history?limit=50` exists | bad token | 401 ✅ |
| `GET /scan/orders?limit=50`, `/scan/orders/{id}` exist | bad token | 401 ✅ |
| `GET /scan/coupons`, `GET /scan/profile` exist | bad token | 401 ✅ |
| `GET /scan/config/{rid}` public | no token, rid 478 | **200** full config envelope ✅ (see G10) |
| `/customer/me/*`, `/scan/points`, `/scan/wallet`, all forgot/reset paths → 404 | earlier probes | ✅ matches our report §2.2 |
| OTP is dev-only, `dev_otp` echoed; no SMS provider | matches CR-2026-09-14-001 INTAKE §1 | ✅ — quarantine stays |
| `/scan/auth/me` returns `tier,total_points,wallet_balance,addresses[]` | consistent with header card working & AuthContext session restore | ✅ (field-level confirmation needs a UAT token — owner) |
| Envelope `{success,message,data}` | `/scan/config/478` response | ✅ our `crmFetch` adapter already unwraps it |

---

## 3. Discrepancies in the CRM reply (CRM to correct / deliver)

| # | CRM said | Observed | Impact |
|---|---|---|---|
| D1 | Missing `Authorization` header → **403** | **401** `{"detail":"Not authenticated"}` on all 7 authenticated routes | Doc error only. Our interceptors treat 401 as expired token → same handling. Contract §0 row "Transport errors" should read 401. |
| D2 | `INV_017_openapi_scan_v2.json` attached (21 paths, 14 schemas) | **Not in the 4 uploads** (one was a duplicate of the reply .md) | We cannot pin field types/enums machine-readably for the CR verification matrix. **Request the file.** |
| D3 | Contract §base URL: "Preprod pod: `<REACT_APP_BACKEND_URL>/api`"; "production CRM URL not documented" | Our app is pointed at `crm.mygenie.online` — CRM did not say whether that host is UAT or production | **Owner must confirm the environment** before any UAT token is minted or any CR is smoke-tested against it. |
| D4 | `/scan/orders` → `total` = full count; `/scan/points/history` & `/scan/wallet/history` → `total` = rows returned (≤50) | Semantics differ across the three ledgers | "Showing X of N" is only possible for orders. Note for Planning; ask CRM to align (falls under their P-2). |

---

## 4. Customer-App-side gaps (feed the Planning CR — **no code now**)

| # | Gap | Where (code truth) | Severity |
|---|---|---|---|
| G1 | Orders/points/wallet still call v1 `/customer/me/*` | `crmService.js:399,407,415` | **P1** (known root cause) |
| G2 | Points sign logic: anything ≠ `earn` renders as **"−"** → `bonus` (a credit) shows as a deduction | `Profile.jsx:280,288-289` | P1 (wrong money-adjacent display) |
| G3 | Points tab needs **two** calls (`/scan/loyalty` + `/scan/points/history`); `points_value` ← `points_monetary_value` | `Profile.jsx:66-82` | P1 |
| G4 | Orders: `order_type` is raw POS text (`dinein`, `take_away`, `WalkIn`, `pos`…) rendered verbatim; `skip=0` sent but unsupported (harmless); >50 orders unreachable | `Profile.jsx:247`, `crmService.js:400` | P2 |
| G5 | Wallet tab shown unconditionally. Our own config already has `showWallet` (default **false**, `RestaurantConfigContext.jsx:61,462`) but `Profile.jsx` ignores it | `Profile.jsx:298` | P2 — needs owner decision on source (see G10) |
| G6 | JWT claim: both `crmService.js:38-49` and `AuthContext.jsx:13-24` read `decoded.user_id` — v2 tokens carry **`restaurant_id`** → helper always returns `null`. Today harmless: all 4 `setCrmAuth` callers pass `rid` explicitly, and `x-api-key` derivation is moot (G8). Latent bug for legacy-token migration path (`AuthContext.jsx:70`). | as listed | P3 latent |
| G7 | `skip-otp` handling assumes **409** (→ password-setup) and **429 + Retry-After** (→ backoff). CRM: neither is ever emitted. Dead branches in `LandingPage.jsx:474-486` and `crmSkipOtpRetry.js`. **Behavioural consequence:** an existing *password* customer is silently logged in via skip-otp without a password — the "phone locked to OTP/password" design (Q1=b) does not hold. | as listed | **P1 product/security** — owner decision (CRM P-4) |
| G8 | Per-restaurant `x-api-key` map (`REACT_APP_CRM_API_KEY`, `crmService.js:19-55`) is **ignored by CRM** on all `/scan/*` routes → dead mechanism, secret shipped in the FE bundle for nothing | `crmService.js` | P2 security-hygiene (fold into CR-007 env purge) |
| G9 | Order visibility: only ~28% of POS orders carry a `customer_id` (phone supplied at POS). Customers *will* see "No orders yet" for legitimate visits. Not a bug on either side — **product expectation** the owner must accept or fix at POS ingest. | CRM GAP-10 | Owner awareness |
| G10 | **Duplicate config source of truth.** CRM `GET /scan/config/{rid}` returns the *same-shape* restaurant config (banners, codEnabled, categoryTimings, fonts…) as our backend `GET /api/config/{rid}`. App reads ours; CRM recommends reading `showWallet` from theirs. Two writable copies can drift. Ties to BUG-002 / CR-2026-09-12-010. | live probe `/scan/config/478` | **HIGH architectural** — owner decision |

Not gaps (already aligned): `Profile.jsx:253` already reads `item.item_name`; `:280` already compares `transaction_type === 'earn'`; UI does not render `expiring_soon`, `total_received/total_used`, `total_orders` → CRM's "not available" items cost nothing today.

---

## 5. Owner decisions surfaced

| # | Decision | Options |
|---|---|---|
| OD-1 | Which host is `crm.mygenie.online` — UAT or prod? Provide UAT `restaurant_id` via secure channel (D3) | — |
| OD-2 | Wallet tab gating source: our `/api/config.showWallet` (exists, default false) vs CRM `/scan/config.showWallet` (G5/G10) | A) ours B) CRM's C) hide tab until wallet module is live |
| OD-3 | `skip-otp` silently authenticating password customers (G7) | A) accept risk B) ask CRM for P-4 (`Password required` + rate-limit) and keep FE 409 branch |
| OD-4 | Remove dead `x-api-key` mechanism (G8) — fold into CR-007 or separate CR | — |
| OD-5 | Accept 28% order-linkage as product reality or raise a POS-ingest item (G9) | — |
| OD-6 | Config source of truth (G10) — scope into CR-2026-09-12-010 or new INV | — |

---

## 6. Ask back to CRM (docs only)

1. Deliver `INV_017_openapi_scan_v2.json` (D2).
2. Correct 403 → 401 for missing header in contract §0 (D1).
3. Confirm which environment `crm.mygenie.online` is (D3).
4. Align `total` semantics across the three ledgers, or document it (D4 → P-2).
5. Confirm `/scan/config/{rid}` is the *same* data our `/api/config/{rid}` serves, or a CRM-owned copy (G10) — who writes it?

---

## 7. Recommendation

Gate sequence respected — **no Planning/Implementation yet**. Next role: **PLANNING (Role 2)** on a new CR *"crmService v2 branches for orders / points / wallet + Profile field mapping"* (Risk **HIGH**, API contract), **but only after** OD-1 (environment + UAT rid) is answered, because the plan's verification matrix needs real responses. OD-2…OD-6 can be answered in parallel or split into separate items.

```text
Investigation complete: INV-2026-09-15-001 (CRM reply validation)
Root cause: CONFIRMED — FE partial v2 migration; CRM /scan/* endpoints exist and are live
Classification: FE (CONFIG/CONTRACT) + 1 architectural finding (duplicate config source, G10)
Confidence: HIGH
Steps used: 9/10
Evidence: CRM_REPLY_VALIDATION.md §2–§4 (live probes + code refs)
Recommendation: Owner decisions OD-1..OD-6 → Planning (Role 2) for new CR; CRM to deliver D1–D4
Report: memory/change_requests/INV-2026-09-15-001-profile-data-crm-v2-contract-gap/CRM_REPLY_VALIDATION.md
```
