# QA Handover Summary — Session 2026-05-03

**Branch**: `abhi-2-may`  
**Repo**: `https://github.com/Abhi-mygenie/customer-app5th-march.git`  
**Local HEAD at session end**: `c013e8e3b47eff68dea50b3c8387a3cbf98fcb48` (untracked: 11 new docs + yarn.lock)  
**Remote HEAD**: `ef9ec70a4247354ea3440fa1a93546021d2b1110`  
**Testing agent**: NOT used (per user instruction)  
**Project Health**: ✅ Frontend compiles cleanly, app loads.

---

## 1. Session Scope (what was done)

### 1.1 ✅ P0 Bug Fix — Frontend Compilation Error (TS2353)
The previous session left the frontend broken with a TypeScript compilation error after the room/table-number fallback fix.

- **Root cause**: `getOrderDetails` return-type intersection in `/app/frontend/src/api/services/orderService.ts` did not declare `tableType`, but the return object included `tableType: firstDetail.table_type || null`.
- **Fix applied** (single-line addition):
  ```ts
  // /app/frontend/src/api/services/orderService.ts (line ~126)
  export const getOrderDetails = async (orderId: number | string): Promise<OrderDetails & {
    fOrderStatus: number;
    restaurantOrderId?: string;
    tableId?: string;
    tableNo?: string;
    tableType?: string | null;   // ← ADDED
    restaurant?: any;
    deliveryCharge?: number;
  }> => { ... }
  ```
- **Verification**:
  - Supervisor restart → `webpack compiled successfully` / `No issues found.`
  - Smoke screenshot of `http://localhost:3000` rendered the home page (`18march`, BROWSE MENU button) correctly.
- **Pre-existing warnings (not blocking)**:
  - `react-hooks/exhaustive-deps` warnings in `OrderSuccess.jsx` (lines 347, 369) and `ReviewOrder.jsx` (lines 272, 321). Carry over from prior work; left untouched.

### 1.2 ✅ Selective Doc Pull from Remote
User requested pulling ONLY the 11 new architecture docs from `origin/abhi-2-may` while explicitly preserving local SERVICE_CHARGE_MAPPING CR work (which the remote had reverted).

- **Pulled into `/app/memory/current-state/`**:
  1. `API_DEPENDENCY_TRACE.md`
  2. `API_USAGE_MAP.md`
  3. `AUTH_TOKEN_FLOW_AUDIT.md`
  4. `CRM_ENV_SWITCH_RUNTIME_TRACE_AND_PHASE2_PLAN.md`
  5. `CURRENT_ARCHITECTURE.md`
  6. `MODULE_MAP.md`
  7. `NEXT_IMPLEMENTATION_RISK_REGISTER.md`
  8. `PROJECT_INVENTORY.md`
  9. `RUNTIME_API_FLOW_AUDIT.md`
  10. `STALE_OR_MISSING_ROUTE_REPORT.md`
  11. `USER_CONFIRMED_RUNTIME_CONTEXT_ADDENDUM.md`
- **Method**: `git checkout origin/abhi-2-may -- <files>` (no merge, no commit).
- **Status**: Files staged (`A` in `git status`), **not committed**. CR frontend files confirmed untouched (`git diff --stat HEAD -- <CR files>` returned empty).

---

## 2. ⚠️ Critical Branch Divergence Notice (READ BEFORE NEXT WORK)

`origin/abhi-2-may` is **8 commits ahead** of local AND has **rolled back the entire SERVICE_CHARGE_MAPPING CR**. **DO NOT** `git pull` or `git merge` — it will erase the CR work.

### Code-level reverts on remote (vs. local):
| File | Remote change | Impact if pulled |
|---|---|---|
| `frontend/src/types/models/order.types.ts` | Removed all SC fields from `BillSummary` (`serviceCharge`, `scCgst`, `scSgst`, `gstRate`, `vatRate`, `scGstRate`) | UI tax breakdown breaks |
| `frontend/src/__tests__/services/orderService.test.js` | Deleted all 6 SC unit tests (-131 lines) | Loss of regression coverage |
| `frontend/src/api/services/orderService.ts` | Removed `tableType`, removed pure API mapping, restored client-side `calculateTaxBreakdown()`, dropped `allocateServiceChargePerItem` import | OrderSuccess SC mapping breaks |
| `frontend/src/api/transformers/helpers.js` | Stripped ~60 lines (likely SC payload helpers) | `placeOrder`/`updateCustomerOrder` SC fields disappear |
| `frontend/src/pages/OrderSuccess.jsx` | Reverted (-56/+47) — likely removed `apiTableNo` state and SC bill-summary rendering | Room/table no. + SC SGST/CGST display breaks |
| `frontend/src/pages/ReviewOrder.jsx` | Reverted (-143 lines) — strips SC math, sessionStorage hooks, inline tax breakdown UI | Buckets A–D undone |

Also on remote: `.emergent/emergent.yml`, `.gitignore`, `test_result.md` modified; `memory/change_requests/SERVICE_CHARGE_MAPPING_IMPLEMENTATION_SUMMARY.md` deleted.

**Recommendation**: When user is ready, either (a) cherry-pick local CR commits onto a branch off `origin/abhi-2-may`, or (b) push local first to overwrite remote — escalate to user before any sync.

---

## 3. CR Status — SERVICE_CHARGE_MAPPING (carried from prior session)

| Bucket | Description | Status |
|---|---|---|
| A | Math foundations in `ReviewOrder.jsx` | ✅ Done |
| B & E | Payload writers (`buildMultiMenuPayload`, `placeOrder`, `updateCustomerOrder`) include SC fields | ✅ Done |
| C & D | Wire `orderData` + inline price breakdown UI in `ReviewOrder.jsx` | ✅ Done |
| F & H | `OrderSuccess.jsx` pure API mapping (drops client-side recompute) | ✅ Done |
| G | Unit tests in `orderService.test.js` (6 tests) | ✅ Done — all passing |
| UI Polish | Hidden internal order ID, hidden pre-round bracket on OrderSuccess, split CGST/SGST UI rows with % suffixes | ✅ Done |
| Adjacent fix | Room/table number display on OrderSuccess (716 manual + others scan-URL); sessionStorage persist | ✅ Code complete (compilation now green) |

---

## 4. QA Validation Tasks (open)

### 🟡 Task 4.1 — Restaurant 716 Validation (resume here)
Verify the room/table-number display fix works end-to-end on the OrderSuccess page now that compilation is green.
- **Login**: `+919579504871` / `Qplazm@10` (from `frontend/.env`)
- **Steps**:
  1. Open the 716 menu, select a room/table manually (saves to `sessionStorage`).
  2. Place an order through the multi-menu flow.
  3. On OrderSuccess: confirm room/table number displays (prefer `apiTableNo` from API; sessionStorage as fallback).
  4. Confirm Bill Summary shows: Item Total, Service Charge, CGST/SGST split (with %), SC-CGST/SC-SGST split (with %), VAT (with %), Grand Total.
  5. Confirm internal order ID hidden, pre-round bracket on Collect Bill hidden.

### 🟡 Task 4.2 — Restaurant 478 Validation (CR closure gate)
Validate SC math holds under discount edge cases.
- **Scenarios**:
  - Loyalty points redemption + SC
  - Coupon discount + SC
  - Wallet payment + SC
  - Edit order (post-place) + SC
- **Acceptance**: SC totals, GST-on-SC, and grand total reconcile in both ReviewOrder (pre-place) and OrderSuccess (post-place) views; no regression in non-716 flows.

### 🟢 Task 4.3 — Backend echo quirk (low priority)
Backend does not always echo root-level `service_gst_tax_amount` / `total_service_tax_amount` cleanly. Frontend currently sums per-item `service_charge` as fallback (in `orderService.ts` lines ~170–182). Confirm with backend team if root-level fields can be guaranteed; if so, FE fallback can be simplified.

---

## 5. Files Changed in THIS Session

| File | Change |
|---|---|
| `/app/frontend/src/api/services/orderService.ts` | Added `tableType?: string \| null` to `getOrderDetails` return type (1-line fix) |
| `/app/memory/current-state/*.md` (×11) | Pulled from remote — staged, not committed |
| `/app/memory/QA_HANDOVER_SESSION_2026-05-03.md` | This file (new) |

No backend changes. No env changes. No supervisor config changes.

---

## 6. Test Credentials & URLs

- **App URL (local dev)**: `http://localhost:3000`
- **API base**: `https://preprod.mygenie.online/api/v1`
- **Login phone**: `+919579504871`
- **Login password**: `Qplazm@10`
- **Test restaurants**: `716` (Hyatt Centric — autopaid + manual room select), `478` (loyalty + coupon + wallet flows)

See also `/app/memory/test_credentials.md` if present.

---

## 7. Reference Files (read first if resuming)

- `/app/frontend/src/pages/ReviewOrder.jsx` — SC math, UI tax breakdown, sessionStorage hooks
- `/app/frontend/src/pages/OrderSuccess.jsx` — API-driven Bill Summary, table number rendering
- `/app/frontend/src/api/services/orderService.ts` — `getOrderDetails` pure API mapping (post-fix)
- `/app/frontend/src/api/transformers/helpers.js` — `buildMultiMenuPayload`, `allocateServiceChargePerItem`
- `/app/frontend/src/types/models/order.types.ts` — `BillSummary` interface with SC fields
- `/app/frontend/src/__tests__/services/orderService.test.js` — 6 SC regression tests
- `/app/memory/current-state/*.md` — fresh architecture/audit docs (pulled this session)

---

## 8. Constraints & Don'ts

- ❌ **DO NOT run the testing agent** — explicitly forbidden by user.
- ❌ **DO NOT `git pull`** — remote has reverted the CR; pulling will destroy work.
- ✅ Verify via Webpack logs, `yarn test`, screenshots, and manual user QA only.
- ✅ Wait for user approval bucket-by-bucket; do not pre-emptively chain new logic.
