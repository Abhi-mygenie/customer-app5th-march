# INTAKE DOC — CR-2026-10-06-001

## Item Identity

| Field | Value |
|-------|-------|
| **CR ID** | CR-2026-10-06-001 |
| **Title** | Add `allowWalkinOrders` per-restaurant flag — close URL-manipulation bypass (BP-2) for restaurants that want to block walk-in ordering |
| **Classification** | **CR** — fix CR for a documented investigation that never got one |
| **Date Registered** | 2026-10-06 |
| **Rulings locked** | 2026-10-10 |
| **Reported By** | Owner, this session. Source finding: `INV-2026-06-17-001` (report written **2026-06-17**, no fix CR raised in the 3½ months since) |
| **Intake by** | E1 (Role 1 — Intake, read-only) |
| **Severity** | **P1** — orders are accepted that restaurant policy was configured to block |
| **Risk** | **HIGH** — touches `orderAccessPolicy.js` and `ReviewOrder.jsx`, the order-placement path |
| **Status** | INTAKE CLOSED — rulings locked, ready for Planning |
| **Parent** | `INV-2026-06-17-001-tableless-order-bypass` |
| **Blast radius** | **MEDIUM** — only restaurants that explicitly set `allowWalkinOrders: false`; default is `true`, so QSR/café and all current restaurants are unaffected |

## 1. The reported symptom

Restaurant 698 received a **dine-in order with no table assigned**, while its config said that
should be impossible:

| Flag | Value | Intent |
|---|---|---|
| `allowNonQrOrders` | `false` | block orders that did not come from a QR scan |
| `skipOtpWalkIn` | `true` | — |
| `otpRequiredWalkIn` | `false` | — |

The investigation confirmed the policy **was active and correctly configured**. The order still got
through.

## 2. Root cause — three bypass paths (verbatim from the investigation)

**BP-1 — walk-in QR is an exempt scan type (most likely path).**
`orderAccessPolicy.js` treats `walkin` as a valid scan, so the non-QR block returns
`{block: false, reason: 'valid-qr'}`. The order then proceeds with `table_id: '0'`, and the
table-status check is skipped because the ID is `'0'`.

**BP-2 — direct URL manipulation.** Typing `/{restaurantId}?type=walkin` produces the same
sessionStorage state as a real scan. `useScannedTable.js` trusts URL params with no origin check.

**BP-3 — no server-side enforcement.** `allowNonQrOrders` is **client-side JavaScript only**. The POS
`/customer/order/place` endpoint accepts any order with `table_id: '0'` regardless of config, so dev
tools or a direct API call bypass every frontend guard.

---

## 2a. Owner analysis — 2026-10-10 (supersedes the original framing)

### BP-1 is not a bug — walk-in is correct for QSR/café

Owner confirmed 2026-10-10: **walk-in QR is the right behaviour for QSR and café restaurants that have no tables.** These restaurants use walk-in mode by design — the diner walks in, scans a QR at the counter or entrance, and orders. There is no table to assign. `allowNonQrOrders: false` should not block a legitimate walk-in scan.

**BP-1 is therefore not a problem to fix globally.** The concern is narrowed: restaurants that want to block walk-in specifically (not just non-QR orders in general) need a dedicated flag. That is a different, smaller scope than originally framed.

### BP-2 — real flaw, but the underlying issue is deeper than a missing origin check

Owner confirmed: URL manipulation is a real flaw that should be addressed.

However, the deeper insight from the 2026-10-10 analysis is that **a QR code is just a URL**. When a diner's phone scans a QR code, it opens a URL. When someone types that same URL manually into a browser, the app receives exactly the same thing. There is no technical signal that distinguishes a physical QR scan from a typed URL.

This means:
- **Table QR codes** have accidental indirect protection. The URL contains a real table ID (e.g. `?table=5&type=dinein`). At checkout, the app calls POS to verify that table 5 exists and is available. If someone fakes `?table=99` and table 99 does not exist in POS, the order is rejected. The table validates itself.
- **Walk-in QR codes** have no equivalent protection. The URL is `?type=walkin` with no table ID. The app deliberately skips the table-status check for `table_id='0'`. There is nothing to verify against POS. Anyone who knows the URL pattern can submit a walk-in order from anywhere.

**The only way to truly verify a walk-in URL came from a physical QR scan** is to embed a one-time signed token inside the QR code URL (e.g. `?walkin_token=abc123`) that expires after use and is validated server-side. This is significant engineering and is not in scope for this CR.

**Practical implication:** adding an origin check in `useScannedTable.js` only adds friction for users who don't inspect the URL. It does not stop anyone who looks at the URL once. It is not real enforcement — it is UX hardening.

### BP-3 — acknowledged, deferred to CR-2026-07-03-011

Server-side enforcement is the only complete fix for BP-2 and BP-3 together. It requires the backend to be a proxy for all order placement — the frontend sends orders to our server, our server validates the scan context, then our server forwards to POS. This is the scope of **CR-2026-07-03-011** (full POS-proxy refactor, already registered P1).

BP-3 is a known limitation until that CR ships. A technically motivated person with a valid POS token and knowledge of the POS API can place an order bypassing all frontend rules. In practice, normal diners cannot do this. The risk is real but narrow for the restaurant ordering context.

---

## 3. Code check — is it still live? **Yes, all three.** (verified this session)

| Path | Evidence found today |
|---|---|
| BP-1 | `frontend/src/utils/orderAccessPolicy.js:20` — `const VALID_QR_SCAN_TYPES = new Set(['table', 'room', 'walkin']);` and the membership test at `:63` |
| BP-1 | `frontend/src/pages/ReviewOrder.jsx:1168` and `:1281` — `if (finalTableId && String(finalTableId) !== '0')` guards the status check, so `'0'` skips it |
| BP-2 | `frontend/src/hooks/useScannedTable.js` — URL params still consumed without origin verification |
| BP-3 | no server-side `allowNonQrOrders` check exists in `backend/server.py`; order placement does not pass through the backend |

Nothing has been fixed since the report was written. The investigation's own diagnostic note still
holds: a walk-in bypass **produces no block event**, so this failure is invisible in the logs —
which is why 5 logged blocks at 698 all show `scanned_room_or_table: None` (those were true non-QR
attempts, correctly blocked).

## 4. Owner rulings — 2026-10-10 (supersedes original A/B/C/D options)

### BP-1: Walk-in for QSR/café — **correct behaviour, no change**
Owner confirmed: walk-in QR is the right entry point for restaurants without tables (QSR, café, counter service). `allowNonQrOrders: false` must never block a legitimate walk-in scan at these restaurants. No change to walk-in behaviour globally.

### BP-2: URL manipulation — **real flaw, scoped fix**
A separate per-restaurant config flag `allowWalkinOrders` (default `true`) allows restaurants that specifically want to block walk-in ordering to do so, without affecting QSR/café. This is UX-level hardening — it stops casual URL manipulation but not a determined technical bypass (see §2a).

**Why this is the ceiling of what frontend can achieve:** A QR code is just a URL. The app cannot distinguish a physical QR scan from a manually typed URL. Table QR codes have indirect protection — the table ID must exist in POS and the table-status check validates it. Walk-in has no equivalent because `table_id='0'` deliberately skips that check. The only way to verify a walk-in URL came from an actual physical scan would be signed one-time tokens in the QR URL, validated server-side — significant engineering, out of scope for this CR.

### BP-3: No server-side enforcement — **acknowledged, deferred to CR-2026-07-03-011**
Server-side enforcement is the only complete fix. It requires the backend to proxy all order placement (frontend → our server → POS). This is CR-2026-07-03-011 (POS-proxy refactor, P1, already registered). BP-3 is a known limitation until that ships. Practical risk is narrow — requires POS API knowledge, a valid POS token, and knowledge of the order payload format. Normal diners cannot do this.

### Revised scope for this CR
1. Add `allowWalkinOrders` config flag (default `true`, per-restaurant, admin-configurable)
2. When `allowNonQrOrders: false` AND `allowWalkinOrders: false`: block walk-in orders and emit a log event (so the block is visible, unlike today)
3. Table QR, room QR, dine-in flows: unchanged
4. QSR/café using walk-in with default config: unchanged (default `true`, no impact)

**Original options A/B/C/D are superseded by these rulings.**

## 5. Verification required before closure

| # | Check |
|---|---|
| V1 | Restaurant with `allowNonQrOrders: false` AND `allowWalkinOrders: false` — walk-in URL blocked, log event emitted |
| V2 | Restaurant with `allowNonQrOrders: false` AND `allowWalkinOrders: true` (default) — walk-in still works (QSR/café) |
| V3 | Dine-in and room flows unchanged on all restaurants |
| V4 | Table QR flows unchanged (table-status check still runs for non-zero table IDs) |
| V5 | New `allowWalkinOrders` flag visible and editable in admin Visibility panel |
| V6 | Owner smoke at 698 |

## 6. Duplicate check

| Item | Relationship | Verdict |
|---|---|---|
| `INV-2026-06-17-001` | Parent investigation. Owns *"why did this happen"*; this CR owns *"fix it"* | **DISTINCT** |
| `CR-2026-07-03-011` (full POS-proxy refactor) | Option B is a subset of its scope | **RELATED — plan together if B is chosen** |
| `CR-2026-10-06-002` (multi-menu landing skip) | Same family: a table-status check that does not run. Different trigger, different code path | RELATED |
| `CR-2026-09-15-002` (skip-OTP dead branch) | Touches the same policy area, different concern | RELATED |

**Verdict: DISTINCT.** No CR has ever carried this fix.

## 7. Note on severity

P1, not P0. It is a policy-enforcement hole on the ordering path, documented since June, and no
production incident has been attributed to it — but it accepts orders the restaurant configured as
forbidden, and BP-3 means the server has no opinion at all. If an incident is traced to it, this
becomes P0.

---

```text
Intake complete: CR-2026-10-06-001
Classification: CR (fix CR for INV-2026-06-17-001)
Severity: P1
Risk: HIGH (orderAccessPolicy.js + ReviewOrder.jsx, order-placement path)
Duplicate check: DISTINCT (parent INV-2026-06-17-001; RELATED CR-2026-07-03-011, CR-2026-10-06-002)
Evidence: orderAccessPolicy.js:20/63, ReviewOrder.jsx:1168/1281, useScannedTable.js
Blast radius: MEDIUM (scoped to restaurants with allowWalkinOrders: false — default is true, no impact on QSR/café)
Owner rulings: 2026-10-10 — BP-1 not a bug, BP-2 scoped fix (allowWalkinOrders flag), BP-3 deferred to CR-2026-07-03-011
Key insight: QR codes are URLs — physical scan vs typed URL are indistinguishable. Table QR has indirect POS validation. Walk-in has none.
Next: Planning (Role 2) — "Planning for CR-2026-10-06-001"
```
