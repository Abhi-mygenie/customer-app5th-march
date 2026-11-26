# SESSION HANDOVER — 2026-10-10 · FULL SESSION

**Authoritative. Supersedes SESSION_HANDOVER_2026-10-09_POST_CLOSURE.md**

---

## NEXT AGENT — READ THIS FIRST

On your first turn do exactly this, then stop:

1. Say: "Here is what was done in the last session, what is left, and which smoke tests are waiting for your results."
2. Present §1 (done this session), §2 (left for next session), §3 (smoke tests pending your feedback) — in that order, in plain prose.
3. Say: "Please share your smoke test results for each item in §3 and I will process them."
4. Wait. Do not boot any role, do not start any planning or implementation until the owner responds.
5. When the owner shares smoke feedback: process pass/fail per item, update registry, write any follow-up CRs for failures, then ask what to start next.

---

## §1 — What was done in this session

### Deployment
The repo `Abhi-mygenie/customer-app5th-march` branch `9oct` was deployed into `/app`. Both FastAPI backend and React frontend came up clean. REACT_APP_CRM_URL was set to `crm-preprod-7.preview.emergentagent.com/api` (the active pod). Memory directory synced from remote.

### Contract + cross-team work
- **CONTRACT v1.0 FROZEN** — Owner countersigned Part 1 §1–§6. CRM acknowledged. Both teams bound.
- **§4d ownership map signed** by owner.
- **CR-095 Phase 2 closed** — all four CRM routes confirmed 404, contract tests 14/14, doc counts clean.
- **CR-094 + CR-096 validated** on new CRM URL and confirmed to CRM.
- **Two POS briefs sent** — image upload contract (BUG-2026-09-10-001) and Call Waiter/Pay Bill P6+P7 (CR-2026-10-03-005).

### Bugs fixed (shipped, tested)
| Bug | What was wrong | What was fixed |
|---|---|---|
| Name auto-fill not working | `REACT_APP_CRM_URL` pointed to old pod (`crm.mygenie.online`) that lacks v2 endpoints | Restarted frontend so it picked up the correct URL from `.env` |
| Loyalty points showing 0 | `setCrmAuth` stored only `{id, phone, name}` from skip-otp response — no `total_points` or `tier`. `get_current_user` never refreshed the profile. | Added `crmGetProfile` call inside `setCrmAuth` to enrich profile asynchronously after login |

### CRs shipped (code + QA + smoke brief)
| CR | What it does | Test result |
|---|---|---|
| **CR-2026-10-03-004 B+C** | Loyalty-rules now fetched from CRM API (not db.loyalty_settings). Customer-lookup retired (F2=a). Per-tier redemption values fixed (G1). CRM caps enforced (G3). Two backend routes deleted. db boundary grep → 0. | 46 smoke + 14 contract PASS. Smoke brief updated (A+B+C, 7 steps). |
| **CR-2026-10-09-003** | `handleUsePoints` client-side cap calculation replaced with CRM `POST /scan/max-redeemable`. Earn preview now uses CRM `projected_points_earned`. | 100% PASS (iteration_12/13). Smoke brief written. |
| **CR-2026-10-09-002** | Coupon Apply button wired to CRM `POST /scan/coupons/validate`. Discount shown in price breakdown before order. `coupon_discount_amount` now set in POS payload. Tax recalculates on discounted base. | 11/11 PASS (iteration_14/15). Smoke brief written. |
| **CR-2026-10-07-001** | Sign-in card removed from FeedbackPage. All diners can now rate without logging in. Optional phone field links feedback to profile. | 5/5 frontend + 60/60 backend PASS (iteration_16). Smoke brief written. |
| **CR-2026-09-15-004** | Admin login → POS direct (two-step: vendoremployee/login + profile). Zero `db.users` reads remain. Dead `AuthContext.login()` deleted. Old-format JWTs get 401 (forced re-login once). | 9/9 PASS (iteration_17). Smoke brief written. |

### New CRs registered
| CR | Status | What |
|---|---|---|
| CR-2026-10-09-002 | SMOKE | Coupon Apply — registered, implemented, shipped this session |
| CR-2026-10-09-003 | SMOKE | Max-redeemable — registered, implemented, shipped this session |
| INV-2026-10-09-002 → CR-2026-10-09-002 | Converted | Coupon investigation to full CR |

### Intake updates
- **CR-2026-10-06-001** — intake fully updated with owner rulings (2026-10-10): BP-1 not a bug (walk-in correct for QSR/café), BP-2 scoped to `allowWalkinOrders` flag, BP-3 deferred to CR-2026-07-03-011. Gate closed. Ready for planning.
- **CR-2026-10-04-001** — effectively resolved as side effect of CR-2026-09-15-004 (`mygenie_token` now in JWT from POS profile).

---

## §2 — What is left for the next session

### Ready for agent — no blockers

| Item | What | Start phrase |
|---|---|---|
| **CR-2026-10-06-001** | Add `allowWalkinOrders` per-restaurant flag to close URL-manipulation bypass for restaurants that want to block walk-in. Intake locked. | `Planning for CR-2026-10-06-001` |
| **CR-2026-10-03-005** | Call Waiter / Pay Bill buttons (silent no-ops). **BLOCKED on POS reply to P6+P7 brief.** | Wait for POS reply first |
| **BUG-2026-09-10-001** | Image upload to local disk. **BLOCKED on POS reply** to image/logo contract brief. | Wait for POS reply first |
| **CR-2026-10-04-006** | Google Sheet registry mirror. IP written and approved. | Say `Role 3 approved for CR-2026-10-04-006` |
| **CR-2026-10-06-002** | Multi-menu table status check skip (same family as 006-001). | `Planning for CR-2026-10-06-002` |

### Blocked on POS

| Brief sent | Blocking |
|---|---|
| `BUG-2026-09-10-001/POS_CONTRACT_REQUEST_2026_10_10.md` | Upload endpoint, logo field, sync, banners |
| `CR-2026-10-03-005/POS_CONTRACT_REQUEST_P6_P7_2026_10_10.md` | Call Waiter/Pay Bill direction + Pay Bill semantics |

### Blocked on owner

| Item | What is needed |
|---|---|
| CR-2026-09-12-003 | Confirm OTP is permanently off and will never return |
| CR-2026-09-12-015 | Git access + 6 repo secrets for CI pipeline |

### Important items to review soon
- **INV-2026-10-03-001** — Real customer PII found in the shared UAT database. Worth understanding the severity.
- **CR-2026-10-04-005** — Takeaway surcharge was shipped estate-wide from POS data rather than the 699-only scope that was approved. Affects live restaurants.

---

## §3 — Smoke tests waiting for your results

**PDF:** `memory/SMOKE_BRIEFS_ALL_2026-10-10.pdf` — **27 pages, 11 items**

Reply per item: `Smoke PASS <ID>` or `Smoke FAIL <ID> — step N` (+ what you saw + screenshot if failing)

| # | ID | One-line description | Priority |
|---|---|---|---|
| 1 | **BUG-2026-10-06-001** | Non-QR telemetry records correctly without blocking bypasses | P1 — **CRM closure gate** |
| 2 | **CR-2026-10-03-003** | Feedback now written to CRM's official endpoint, not the wrong collection | P1 — **CRM closure gate** |
| 3 | **CR-2026-10-08-001** | Single identity path (skip-otp only); password-setup page removed | — — **CRM closure gate** |
| 4 | **CR-2026-09-15-001** | Profile page Orders / Points / Wallet tabs wired to CRM v2 | P1 — **CRM closure gate** |
| 5 | **CR-2026-10-03-004** | CRM boundary closes (Parts A+B+C) — name autofill, loyalty-rules from CRM, customer-lookup retired | P1 |
| 6 | **CR-2026-10-07-002** | OTP code permanently deleted (31 markers, 8 files) | — |
| 7 | **CR-2026-10-03-001** | 14 dead server.py routes deleted | P3 |
| 8 | **CR-2026-10-09-003** | Loyalty cap shown to diner now comes from CRM server-side (not client-side guess) | P2 — **new this session** |
| 9 | **CR-2026-10-09-002** | Coupon Apply button wired — shows discount before order, flows to POS | P2 — **new this session** |
| 10 | **CR-2026-10-07-001** | Feedback form open to all diners, no sign-in required | P2 — **new this session** |
| 11 | **CR-2026-09-15-004** | Admin login now goes through POS directly — no CRM database read | — — **new this session** ⚠️ first login after deploy triggers forced re-login |

> Items 1–4 are holding up CRM's formal closure of CR-098, CR-093, and CR-089. These four should be smoked first.
> Item 11 (admin login): the first time you open the admin panel after the change is deployed, you will see "Session expired" and need to log in once. This is expected — not a failure.

---

## §4 — Rulings and decisions carried forward

| Ref | Ruling |
|---|---|
| CONTRACT v1.0 | FROZEN — both sides signed. Part 1 §1–§6 immutable. |
| §4d ownership map | SIGNED by owner 2026-10-10 |
| CR-2026-10-03-004 D1 | POS flag only for loyalty gating |
| CR-2026-10-03-004 F2 | (a) — no token → no points/tier block |
| CR-2026-09-15-004 D4 | Forced re-login on deploy: accepted |
| CR-2026-10-06-001 | BP-1 not a bug. BP-2: `allowWalkinOrders` flag. BP-3: deferred. |
| Ownership | `customer_app_config` / `dietary_tags_mapping` are ours |
| CRM URL | `REACT_APP_CRM_URL = crm-preprod-7.preview.emergentagent.com/api` (correct pod) |

---

## §5 — Technical state

```
server.py:           ~1,265 lines
db.users reads:      0 active (CR-2026-09-15-004)
db.loyalty_settings: 0 active (CR-2026-10-03-004 B)
db.customers:        0 active (CR-2026-10-03-004 C)
pytest smoke:        60 pass 1 skip
pytest contract:     14 pass
yarn build:          clean
REACT_APP_CRM_URL:   crm-preprod-7.preview.emergentagent.com/api
```

---

## §6 — Key files

| File | Purpose |
|---|---|
| `memory/SMOKE_BRIEFS_ALL_2026-10-10.pdf` | 27-page smoke handout (11 items) |
| `memory/control/MYGENIE_CUSTOMER_APP_AGENT_SYSTEM_PROMPT_ALPHA_v0_1.md` | Role playbooks |
| `memory/change_requests/index.yml` | Registry (93 items) |
| `memory/test_credentials.md` | POS login: +919579504871 / Qplazm@10 · Admin: owner@kunafamahal.com / Qplazm@10 |
| `memory/control/CONTRACT_CUSTOMER_APP_CRM_v1.0.md` | FROZEN — do not reopen Part 1 |
| `memory/inbox/OUTBOUND_TO_POS_IMAGE_UPLOAD_CONTRACT_REQUEST_2026_10_10.md` | POS brief — image upload |
| `memory/change_requests/CR-2026-10-03-005-call-waiter-pay-bill-no-op-buttons/POS_CONTRACT_REQUEST_P6_P7_2026_10_10.md` | POS brief — Call Waiter/Pay Bill |
