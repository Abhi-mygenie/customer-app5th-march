# Status Log — Room Scanner Intermittent WC Fix (Option G1)

**Last updated:** 2026-05-09
**Owner-approved:** Yes (`Approved for implementation. Use Option G1.`)
**Owner-deferred:** G2 (localStorage migration), G3 (block-with-toast guard)
**State:** Implemented · Simulation-validated · **Pending real-scanner field validation**

---

## What is implemented

| Item | Status |
|---|---|
| `clearScannedTable()` at `OrderSuccess.jsx:311-322` (status 3/6) gated behind `if (String(restaurantId) === '716')` | ✅ done |
| `clearScannedTable()` at `OrderSuccess.jsx:354-362` (404 / order-not-found) gated behind same check | ✅ done |
| `clearCart()`, `clearEditMode()`, `toast(...)`, `navigate(...)` left untouched (still fire for all restaurants) | ✅ unchanged |
| `useScannedTable.js` storage backend left as `sessionStorage` (G2 deferred) | ✅ unchanged |
| `ReviewOrder.jsx:949-951` silent `table_id='0'` fallback left untouched (G3 deferred) | ✅ unchanged |
| Lint, webpack compile, hot-reload | ✅ green |

---

## Simulation validation (already done)

| Path | Restaurant 478 (non-716) | Restaurant 716 |
|---|---|---|
| Status 6 (Paid) | sessionStorage **preserved** ✅ | wiped ✅ (intended) |
| Status 3 (Cancelled) | preserved ✅ | wiped ✅ |
| 404 / not-found | preserved ✅ | wiped ✅ |
| Pre-fix control (unconditional wipe) | wiped (the bug) — proves change is meaningful ✅ | — |

Simulation script archived in agent run log: `/root/.emergent/automation_output/20260509_133058/`.

---

## Pending — real scanner / manual field validation (owner-driven)

The following must be validated on a real device against a real POS dashboard before this CR is closed:

### Primary scenarios
- [ ] **Non-716 room scanner** (e.g. restaurant 478, or any room-equipped hotel that is NOT Hyatt Centric)
   1. Customer scans room QR
   2. Places order #1 → confirms order on dashboard appears as **Room X**
   3. POS marks order #1 as **Paid** (or auto-pay completes)
   4. Customer places order #2 from the same scanner / same browser session — without rescanning
   5. **Expected:** order #2 also appears on POS dashboard as **Room X**, NOT as WC / walk-in
- [ ] Same scenarios with **Cancellation (status 3)** instead of Paid for order #1
- [ ] Same scenarios where the status poll receives a transient 404 between orders (harder to force in field — confirm via POS logs if observed)
- [ ] **Table scanner** (non-room, non-716): confirm table dine-in still appears as Table X (regression guard)
- [ ] **Walk-in scanner**: confirm genuine walk-ins still appear as WC (regression guard)
- [ ] **Restaurant 716 (Hyatt Centric)**: confirm behaviour identical to today — wipe still happens, customer is asked to re-pick room

### What we explicitly do NOT need to validate (per owner's deferral)
- Tab close / reopen scenarios (Path 4) — sessionStorage per-tab; deferred to G2
- Multi-tab without QR (Path 5) — same; deferred to G2
- Silent `table_id='0'` blocking — deferred to G3

---

## Followup work (optional — keep on the radar)

| Tag | Description | Trigger to revisit |
|---|---|---|
| **G3** (kept warm) | Defensive toast at `ReviewOrder.jsx:949` if `roomOrTable='room'` but `finalTableId='0'` — converts silent walk-in misclassification into visible "Please rescan room QR" | If any new "WC" report comes in after G1 ships |
| **G2** (deferred — owner concern) | Move scan storage to `localStorage` for tab-close / multi-tab survival | Only if owner accepts stale-context risk after weighing UX of long-lived room context |

---

## Code-state snapshot

- Diff scope: 1 file (`frontend/src/pages/OrderSuccess.jsx`), +14 −2 lines
- All edits are inside CSS-of-business-logic comment-and-conditional layers; no payload, math, or contract change
- ESLint: clean
- Webpack: compiled with only pre-existing `react-hooks/exhaustive-deps` warnings (untouched by this CR)
- Frontend supervisor: RUNNING; `:3000` returns 200

---

## Closure criteria (when the field validation above passes)

1. Update this status log with the real-order_id(s) that proved the fix on the dashboard
2. Move this CR file to `/app/memory/change_requests/closed/` (or annotate "CLOSED" at the top) — owner discretion
3. Optionally: leave G2 and G3 in `/app/memory/change_requests/` as "deferred" markers for future reference
