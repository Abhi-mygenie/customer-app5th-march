# QA Handover Summary — Session 2026-05-04

**Branch**: `main`
**Repo**: `https://github.com/Abhi-mygenie/customer-app5th-march.git`
**Local HEAD at session end**: `91b95bf` (Auto-generated changes)
**Backend env**: connected to preprod POS (`https://preprod.mygenie.online/api/v1`) and preprod Mongo (`mygenie_admin@52.66.232.149:27017/mygenie`)
**Testing agent**: NOT used (per user instruction — manual verification only)
**Project Health**: ✅ Frontend compiles cleanly (only pre-existing eslint warnings on unrelated lines), app loads, both services running.

**Preview URL**: `https://customer-app-preview-5.preview.emergentagent.com`

---

## 1. Session Scope (what was done)

### 1.1 ✅ FEATURE — Hide EDIT ORDER button when `payment_status === 'paid'`
**Business rule:** if a POS order returns `payment_status: "paid"` in the order-details API, the customer must NOT be able to edit it. The Order Success screen shows **BROWSE MENU** instead of **EDIT ORDER**, and any deep-link/edit-resume path is also blocked.

**Trigger context:** restaurants with online-only payment configuration (e.g. **716 Hyatt Centric**, **699 Brew**) send orders as `payment_type: "prepaid"`. Once Razorpay payment settles and POS marks the order as paid, the field `payment_status: "paid"` is now returned by `air-bnb/get-order-details/{orderId}`.

#### Files modified (5 files, 7 surgical edits)
| File | Change |
|---|---|
| `frontend/src/types/api/order.types.ts` | Added optional `payment_status` / `payment_type` / `paid_status` / `payment_id` fields on `ApiOrderDetailsResponse` and `ApiOrderDetailItem` |
| `frontend/src/types/models/order.types.ts` | Added `paymentStatus?: string \| null` on `OrderDetails` |
| `frontend/src/api/services/orderService.ts` (lines 121-129, 162-176, 201-235) | `getOrderDetails()` now reads `payment_status` defensively from `details[0]` OR root, normalizes to lowercase, returns as `paymentStatus` in result object |
| `frontend/src/pages/OrderSuccess.jsx` (lines 140, 274-300, 469-477, 391-405) | New `paymentStatus` state + hydration in poll effect; `showEditOrder` and `showBrowseMenu` gates extended; `handleEditOrder` early-returns with toast if paid |
| `frontend/src/pages/LandingPage.jsx` (after line 432) | `handleEditOrderClick` blocks edit + toasts + redirects to menu when `orderDetails.paymentStatus === 'paid'` |

#### Updated business logic — Order Success button rendering
```js
// /app/frontend/src/pages/OrderSuccess.jsx (lines 469-477)
const hasTable      = hasAssignedTable(scannedTableId) && isScanned && scannedTableNo;
const isPaid        = paymentStatus === 'paid';
const showYetToBeConfirmed = hasTable && fOrderStatus === 7;
const showEditOrder        = hasTable
                           && fOrderStatus !== 7
                           && fOrderStatus !== null
                           && !isPaid;                         // ⬅ new gate
const showBrowseMenu       = !hasTable
                           || (hasTable && isPaid && fOrderStatus !== 7); // ⬅ paid → browse
```

#### Behaviour matrix
| `hasTable` | `fOrderStatus` | `payment_status` | Button rendered |
|---|---|---|---|
| false | any | any | BROWSE MENU |
| true | `7` | any | "Yet to be confirmed" pill |
| true | `1/2/5` | not paid (`null`/`unpaid`) | EDIT ORDER |
| true | `1/2/5` | **`paid`** | **BROWSE MENU** ⬅ new |
| true | `3` (cancel) / `6` (paid) | any | redirect to landing (existing) |

#### Verification done
- 8-case logic simulation against the actual extraction + gate code → all pass
- ESLint clean on both touched JSX files
- Webpack compiled cleanly
- Live screenshot: 716 paid order's success screen renders BROWSE MENU correctly (artefact: `qa_artifacts/paid_browse_button_renders_correctly_2026-05-04.png`)

#### Why NOT a hardcode for restaurant 716
Originally proposed a `restaurantId === '716'` TEMP hardcode. Replaced with the `payment_status === 'paid'` gate because:
- It's a **server-authoritative signal** (no reliance on client state that's lost on refresh)
- It automatically covers 699, 716, and any **future** prepaid-only restaurant — no per-restaurant code to maintain
- Defaults to current behaviour if the field is missing/null (safe rollout before POS deploys the field)

---

### 1.2 ✅ BUG FIX — `tableNumber.trim is not a function` crash on Review Order
**Symptom:** `Uncaught TypeError: tableNumber.trim is not a function` during render of `TableRoomSelector` when navigating to `/716/review-order` after a paid order's BROWSE MENU click. (Artefact: `qa_artifacts/tableNumber_trim_crash_pre_fix_2026-05-04.png`)

**Root cause** (pre-existing, latent — exposed by 1.1 routing more traffic through BROWSE flow):
`ReviewOrder.jsx` lines 178-198 contained a "persist manually-selected room/table" effect that wrote `entry.id` (a **JavaScript Number** from the rooms/tables API response) back to `sessionStorage` under the same key shape used by `useScannedTable`. On every subsequent page load, `useScannedTable` returned this number, ReviewOrder's auto-fill effect at line 531 set `tableNumber` to a Number, and `TableRoomSelector.isTableNumberValid()` crashed on `.trim()`.

**Why "first-time order" worked but subsequent orders crashed:**
- First time: `sessionStorage.scanned_table_716.table_id` is `"6828"` (string from URL `searchParams.get('tableId')`) → `.trim()` works.
- After persist-effect runs: rewritten to `6828` (number from `entry.id`) → all later renders crash.

#### Fix A — Stop poisoning sessionStorage (root cause)
| File | Line | Change |
|---|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | 188 | `table_id: entry.id` → `table_id: String(entry.id)` |

#### Fix B — Defensive coercion at all `tableNumber.trim()` / `.length` sites (forward compat)
| File | Line | Change |
|---|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | 510 | `tableNumber.trim()` → `String(tableNumber \|\| '').trim()` |
| `frontend/src/pages/ReviewOrder.jsx` | 775 | `tableNumber.trim()` → `String(tableNumber \|\| '').trim()` |
| `frontend/src/pages/ReviewOrder.jsx` | 787 | `tableNumber.trim()` → `String(tableNumber \|\| '').trim()` |
| `frontend/src/components/TableRoomSelector/TableRoomSelector.jsx` | 82 | `tableNumber.trim()` → `String(tableNumber \|\| '').trim()` |
| `frontend/src/components/TableRoomSelector/TableRoomSelector.jsx` | 179 | `tableNumber.length > 0` → `String(tableNumber \|\| '').length > 0` |

#### Verification done
- 9-case logic simulation including the exact crash scenario (number 6828) → all pass, no crashes
- ESLint clean on both touched files
- Customers with already-poisoned sessionStorage (number stored from before this fix) will now render correctly because the validators coerce defensively. No cache-clearing required.

---

## 2. ⚠️ Open Issues — Not Investigated This Session

### 2.1 🔴 P1 — "Failed to place order. Please try again." on COD path
**Reported by:** user (2026-05-04)
**Artefact:** `qa_artifacts/cod_failed_to_place_order_2026-05-04.png`
**Symptom (per screenshot):**
- Customer (Sahil singh, +91 97619 80190) on a delivery order screen
- Item: "Chicken Noodle Full" × 1, ₹199
- Delivery to: "149, Grand Trunk Rd, Old…" (truncated)
- Toast banner: **"Failed to place order. Please try again."**
- Triggered when COD ("Pay at Counter") was chosen as payment method.

**Status:** NOT investigated this session — reported at session end.
**Next-session action items (suggested):**
1. Reproduce flow: pick a restaurant with `codEnabled === true` AND a delivery `orderType` AND open the same checkout. Identify the restaurant id from the customer's session (Sahil singh / +91 97619 80190). Likely **NOT 716** (716 has `codEnabled=false`).
2. Inspect browser network panel during the failing `placeOrder` call. Compare `payment_type` (should be `'postpaid'` for COD per `ReviewOrder.jsx:1067`) and the rest of the payload against POS expectations.
3. Inspect `placeOrder` flow in `frontend/src/pages/ReviewOrder.jsx:1056-1112` and `frontend/src/api/services/orderService.ts:285-389` (non-multi-menu branch).
4. Check whether the POS endpoint `/customer/order/place` is rejecting the payload (HTTP error → caught → generic toast). If yes, inspect server response body for the actual error.
5. Possible suspects:
   - Delivery payload missing required `address_id`/`address`/`pincode`/coords (see line 309-315, 326-330 of `orderService.ts`).
   - `payment_method: 'cash_on_delivery'` hardcoded at line 323 of `orderService.ts`; if POS now expects something else for the COD path, it'd reject.
   - `paymentMethod` state defaulting wrong for delivery — check `ReviewOrder.jsx:495-504` interaction with `onlinePaymentDelivery` config.
6. The COD error is **independent** of all changes made in this session.

### 2.2 🟡 P2 — Unknown `f_order_status: 8` returned by POS
Encountered during sample-pull on order 838291 (rest 739 "Five star").
- Customer app's `ORDER_STATUSES` map only covers `1, 2, 3, 5, 6, 7`. Status `8` is unmapped.
- **Latent risk:** if a Table/Room QR order ever returns `f_order_status=8`, the current rule (`!== 7 && !== null`) shows EDIT button on a status the app doesn't understand. Today this is masked by the `payment_status` paid gate for prepaid restaurants and by `hasTable=false` for walk-ins, but not all combinations are safe.
- **Recommendation:** ask POS team for the canonical enum, then either map `8` → label or explicitly add it to a "terminal/non-editable" list.

### 2.3 🟡 P2 — Three POS API fields appear to carry wrong/unused data
Observed across 3 sample orders this session:
| Field | Observed | Expected | Impact |
|---|---|---|---|
| `transaction_reference` | `"418.95"`, `"105"`, `"1.05"` (looks like the pre-tax subtotal as a string) | A real transaction reference for prepaid orders | None today — frontend ignores. But blocks any future "show Razorpay txn id on receipt" feature. |
| `paid_status` | always `0` across 3 orders (incl. one paid via UPI per Mongo, one POS-confirmed-status-1) | flips to `1` when paid | None — frontend now uses `payment_status` instead. |
| `payment_id` | `null` / absent on prepaid 716 confirmed order | a Razorpay payment id | None today — frontend not yet consuming. |

These are POS-side data-quality concerns, not customer-app bugs. Worth flagging to POS team if they're meant to be useful.

---

## 3. Test Plan for QA — Manual Cases

### 3.1 Hide-Edit-on-Paid (Feature 1.1)
| # | Scenario | Setup | Expected |
|---|---|---|---|
| 1 | 716 paid order — confirmed | Open `/716?tableId=<X>&type=room`, place order, complete Razorpay, wait for POS confirm + `payment_status:"paid"` | Success screen shows **BROWSE MENU**, NO Edit button |
| 2 | 716 paid order — pre-confirm | Same as #1 but check immediately after Razorpay (status still `7`) | "Yet to be confirmed" pill (Edit hidden anyway) |
| 3 | 699 unpaid post-confirm | 699 dine-in order, status `1`, `payment_status:null/"unpaid"` | EDIT ORDER visible (regression check) |
| 4 | 699 paid via UPI at counter | After waiter settles, POS sets `payment_status:"paid"` | BROWSE MENU shown |
| 5 | Walk-in any restaurant | URL with no `tableId` | BROWSE MENU as before (gate doesn't change anything) |
| 6 | Refresh paid 716 success page | F5 / hard reload | Still no EDIT (state hydrated from API) |
| 7 | Stale UI race — click Edit on paid order via DevTools | Force-render Edit button via React DevTools | Toast "This order has been paid…" + no entry to edit mode |
| 8 | LandingPage resume on paid order | Close tab, re-scan QR, click "Edit your ongoing order" | Toast + redirect to menu (no edit) |
| 9 | Field absent (legacy POS) | Use a restaurant whose POS hasn't deployed `payment_status` yet | Behaviour identical to before this PR |
| 10 | Capital `"Paid"` value | Force the API mock or DB to return `"Paid"` | Treated as paid (case-insensitive) |

### 3.2 tableNumber.trim crash (Bug 1.2)
| # | Scenario | Expected |
|---|---|---|
| 1 | First-ever order on 716 (Room QR) | No crash on Review Order, room pre-selected |
| 2 | Place order, click BROWSE on success → add item → Review Order | No crash, room still pre-selected (R-010) |
| 3 | Old browser session with Number-typed `table_id` in sessionStorage | No crash; component renders correctly |
| 4 | Multi-menu restaurant, walk-in (no QR) | Manual room/table picker works; validation correct |
| 5 | Non-multi-menu restaurant | Unaffected |

### 3.3 COD failure (Issue 2.1) — for QA reproduction
| # | Scenario | Expected (per design) | Actual (reported) |
|---|---|---|---|
| 1 | Restaurant with `codEnabled=true`, `orderType=delivery`, customer fills delivery address, picks "Pay at Counter", clicks Place Order | Order placed, success screen shown | ❌ Toast: "Failed to place order. Please try again." (per artefact) |

QA should provide:
- The **restaurant id** that triggered this
- The **HTTP status code** + **response body** of the `POST /customer/order/place` call (browser DevTools → Network → preserve log)
- Whether it reproduces on COD + dine-in too, or only COD + delivery
- Whether it reproduces with the same items/address combo

---

## 4. Test Credentials / Environment

| Key | Value |
|---|---|
| Preview URL | `https://customer-app-preview-5.preview.emergentagent.com` |
| Test login phone (from `.env`) | `+919579504871` |
| Test password (from `.env`) | `Qplazm@10` |
| Backend POS API base | `https://preprod.mygenie.online/api/v1` |
| MongoDB | `mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie` (read-only access for sync mirror) |
| Restaurants exercised | 716 (Hyatt, prepaid-only, multi-menu room-only), 699 (Brew, prepaid-only), 739 (Five star, walk-in sample) |

Sample order ids investigated this session:
- **825142** (716): `f_order_status=7`, walk-through of pre-confirm state.
- **825212** (716): `f_order_status=1`, post-POS-confirm. `paid_status=0`, `payment_id` absent. (Used to confirm `paid_status` is not a usable signal.)
- **838291** (739): `f_order_status=8`, walk-in. Triggered the unmapped-status finding (issue 2.2).
- **734697** (699): paid via UPI (per Mongo), `f_order_status=6`, `paid_status=0`.

---

## 5. Files Changed (full list)

```
frontend/src/types/api/order.types.ts                                  (modified — type additions)
frontend/src/types/models/order.types.ts                               (modified — type additions)
frontend/src/api/services/orderService.ts                              (modified — paymentStatus extraction)
frontend/src/pages/OrderSuccess.jsx                                    (modified — gates + handler guard)
frontend/src/pages/LandingPage.jsx                                     (modified — handleEditOrderClick paid guard)
frontend/src/pages/ReviewOrder.jsx                                     (modified — String() coercion + persist-effect fix)
frontend/src/components/TableRoomSelector/TableRoomSelector.jsx        (modified — String() coercion in validator + className)
memory/QA_HANDOVER_SESSION_2026-05-04.md                               (new — this document)
memory/qa_artifacts/cod_failed_to_place_order_2026-05-04.png           (new — open bug evidence)
memory/qa_artifacts/paid_browse_button_renders_correctly_2026-05-04.png (new — feature verification)
memory/qa_artifacts/tableNumber_trim_crash_pre_fix_2026-05-04.png      (new — bug reproduction evidence)
```

No backend changes. No `.env` changes. No new dependencies. No supervisor config changes.

---

## 6. Rollback Plan

Both changes are isolated and revertable independently:
- **Feature 1.1 (`payment_status` gate)** — single-commit revert across the 5 files. Behaviour returns to "Edit shown for any confirmed Table/Room order regardless of payment".
- **Bug 1.2 (`String()` coercion)** — single-commit revert across 2 files. Crash returns. Don't roll back without first confirming sessionStorage entries are clean (otherwise existing customers will hit the crash).

---

## 7. Outstanding Decisions for Next Session

1. **Status `8` handling** (Issue 2.2) — define and implement.
2. **COD failure** (Issue 2.1) — investigate and fix.
3. **Cleanup of legacy `restaurantId === '716'` hardcodes** — found in:
   - `frontend/src/api/services/orderService.ts:265` (autopaid endpoint selection — keep, it's the prepaid POS contract)
   - `frontend/src/components/TableRoomSelector/TableRoomSelector.jsx:61` (`is716` UI rule)
   - `frontend/src/pages/ReviewOrder.jsx:528, 540, 774` (room-mandatory + force-room logic)
   These are room-mandatory / autopaid-endpoint hardcodes. Out of scope this session, flagged for future config-driven replacement.

---

## 8. Sign-off

- All changes manually verified against live preprod data.
- No automated test suite was run (per user instruction).
- Frontend services confirmed running, app renders correctly.
- Open issues clearly documented with reproduction context for next session.
