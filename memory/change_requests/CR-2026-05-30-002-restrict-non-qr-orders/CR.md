# CR-2026-05-30-002 — Restrict Non-QR Orders (Scan-Required Mode)

| Field | Value |
|---|---|
| CR ID | CR-2026-05-30-002 |
| Registered at (UTC) | 2026-05-30 |
| Registered by | E1 (on behalf of owner) |
| Parent context | Pulled out of CR-2026-05-30-001 Item 2 backlog + URL-tampering brainstorm |
| Status | **REGISTERED — no investigation, planning, or implementation yet** |
| Action requested in this session | Register only. Owner asked for my suggestions (collected below). |

---

## 1. Owner-stated scope (verbatim, with light editing for clarity)

> We want to register a small CR that does a very simple thing — control whether **non-QR orders** are allowed.
>
> 1. Add a flag at restaurant level: are non-QR scanners allowed or not?
> 2. **Default = allowed** for all restaurants (backward-compatible).
> 3. Restaurants can turn it OFF.
> 4. When OFF, and the customer is NOT on a table (i.e. arrived without a proper QR scan), they must be **asked to rescan** at TWO checkpoints:
>    - When adding to cart (item itself)
>    - When placing the order / collecting the bill
> 5. Restaurant 716 must NOT be disturbed under this CR (carry-forward from parent CR).

The owner asked for any additional suggestions before final design — see §5 below.

---

## 2. Why this is a good de-scoping (one-paragraph rationale)

This CR is essentially **F4 from `ITEM2_FIX_INVESTIGATION.md`** — the defence-in-depth guard — pulled out and shipped as a standalone admin policy. It does NOT attempt to fix the underlying root cause that the parent CR's Item 2 investigation identified (`ReviewOrder.jsx:982-985` ignoring `editOrder.tableId` from CartContext) — that remains parked. Instead, it adds a **policy gate** that lets a restaurant opt out of the entire ambiguous "non-QR" path so the systemic bug becomes inaccessible to customers. Small surface (~30 LOC), fully reversible via the flag, zero behaviour change Day 1 (default ON / allowed).

---

## 3. Proposed semantics

| Aspect | Proposal |
|---|---|
| Flag name (suggestion) | `allowNonQrOrders` — default `true` (allowed). True/missing/null → allowed. Only an explicit `false` enforces the restriction. (Mirrors the Item 1 `skipOtp*` semantic — opt-in restriction, default preserves current behaviour.) |
| Admin UI location | `Admin → Visibility → new section "Order Access Policy"` — single toggle row "Allow Non-QR Orders" |
| Storage | `customer_app_config.allowNonQrOrders` (new boolean field) |
| Backend | Zero change — same model as Item 1; backend already passes config dict through |
| Detection of "non-QR" | The condition is `!isScanned` (from `useScannedTable.js`). Equivalent: no `scannedTableId` AND no `scannedRoomOrTable ∈ {'table', 'room', 'walkin'}`. Walk-in QR (`type=walkin`) **counts as a valid scan** — it's still a QR. |
| Guard #1 location | Add-to-cart path — first item add per session |
| Guard #2 location | Place Order / Update Order path in `ReviewOrder.jsx` (the existing place-order entry) |
| What happens when blocked | Modal: "Your session has expired. Please rescan the QR code at your table to continue." with a single CTA. No fallback to Takeaway/Delivery — they're either fully blocked or fully allowed (owner's design). |
| Restaurant 716 | OUT of scope. The new flag's check is wrapped in `String(restaurantId) !== '716'`. 716 keeps current behaviour. |
| Authenticated user bypass? | TBD — see §5 suggestion S3 |
| Edit Order bypass? | TBD — see §5 suggestion S4 |
| Takeaway / Delivery? | NOT blocked — these are legitimate non-table modes. The flag only affects dine-in / room contexts where a QR was expected. |

---

## 4. Approximate file surface (no code yet)

| File | Lines | Change |
|---|---|---|
| `frontend/src/context/AdminConfigContext.jsx` | ~L127 | Add `allowNonQrOrders: true` to defaults |
| `frontend/src/context/RestaurantConfigContext.jsx` | defaults + serializer | Add `allowNonQrOrders: config.allowNonQrOrders !== false` |
| `frontend/src/pages/admin/AdminVisibilityPage.jsx` | ~L100-area | Add "Order Access Policy" section + 1 ToggleSwitch row |
| `frontend/src/utils/orderAccessPolicy.js` | **NEW** | `shouldBlockNonQrOrder(ctx, config)` → boolean. Single source of truth. |
| `frontend/src/pages/Menu.jsx` (or wherever add-to-cart fires) | guard #1 site | If `shouldBlockNonQrOrder(...)` → show modal, prevent add |
| `frontend/src/pages/ReviewOrder.jsx` | guard #2 site, near L820-830 | If `shouldBlockNonQrOrder(...)` → show modal, abort place-order |

**Estimated total: 2 new files + 4 small edits + 1 admin UI row. ~30-40 LOC.**

> Confirmed: zero backend changes, zero DB migration, zero overlap with the 716 carve-outs in `ReviewOrder.jsx`/`OrderSuccess.jsx`, zero overlap with Item 1's `skipOtp*` work, zero overlap with the parked Item 2 fix surface.

---

## 5. My suggestions (where I disagree slightly, or where the owner asked for input)

### S1. **Flag semantic & naming — keep it consistent with Item 1**

Use `allowNonQrOrders` (default `true`). This matches the `skipOtp*` pattern (default value preserves current behaviour; admin opts INTO the restriction). Alternative `requireQrForOrder` (default `false`) inverts the literal toggle position but is more confusing because the toggle label would be "Require QR for Orders" → ON = restriction.

> **My recommendation: `allowNonQrOrders`, default `true`.** Admin UI label: "Allow Non-QR Orders". To enforce restriction, admin turns it OFF.

### S2. **Define "non-QR" precisely in code, not in prose**

Many edge cases here. My proposed detection (encapsulated in `orderAccessPolicy.js`):

```text
isNonQrOrder = !isScanned
             = scannedTableId is absent  AND
               scannedRoomOrTable NOT IN {'table', 'room', 'walkin'}
             = customer did not arrive via any valid QR
```

**Walk-in QR (`type=walkin`) IS a valid scan** even though no table is assigned. Don't block walk-in QR customers under this flag — they used a QR.

### S3. **Authenticated returning customers — do not bypass** ⚠

The owner did not specify. My recommendation: **do NOT bypass for authenticated users.** If a returning customer logs in but didn't scan a QR at the table, the restriction still applies. Logging in alone doesn't prove they're at a table. (Edit if owner disagrees.)

### S4. **Edit Order — bypass**

If a customer is in `isEditMode === true` (CartContext), the original order was placed via a QR (the order itself has a `tableId`). Re-blocking them would be punitive. My recommendation: **bypass when `isEditMode === true`.** This prevents legitimate customers who are mid-edit-order from getting trapped by their tab being reopened.

### S5. **"Session expired, rescan" message — modal, not toast**

Toasts are easy to miss on mobile. Use a non-dismissable modal with a single "OK, take me back" CTA that routes the customer to `/<rid>` (landing). Two reasons:
- It interrupts the journey clearly
- Routing to landing also clears the in-memory cart state (or warns about it) — see S6

### S6. **What about items already in the cart?**

Edge case: customer adds 4 items, then sessionStorage clears (iOS evicts), then they try to add a 5th item — Guard #1 fires. They have 4 items in the cart. What happens to those?

Two options:
- (a) **Preserve cart**: modal asks them to rescan; on successful rescan the cart is reused. Risk: they rescan at a *different* table than the one their first 4 items were associated with.
- (b) **Clear cart on block**: safer; the modal explicitly says "Your previous items will be cleared on rescan."

> **My recommendation: option (b) — clear cart on block.** Avoids cross-table contamination. Owner can override.

### S7. **A THIRD checkpoint worth considering — landing page**

The owner specified 2 checkpoints (add-to-cart + place-order). I'd suggest a 3rd: **on the landing page when customer taps "Browse Menu" without a QR**. Cheapest and best UX — block at the door, don't let the customer waste 5 minutes browsing items they can't order.

> **My recommendation: 3 checkpoints — landing, add-to-cart, place-order.** Cost is one extra guard call (~3 lines) for big UX win. If owner wants the original 2, drop the landing one — but I think it's free.

### S8. **Telemetry hook**

When Guard #1 or Guard #2 fires, log a `restricted_non_qr_block` event with context (rid, scannedRoomOrTable, finalTableId at moment of block, isEditMode, isAuthenticated, userAgent). Same backend echo endpoint that the parked Item 2 F6 would use. Optional but high value — lets ops see how often the restriction actually fires before flipping the flag.

### S9. **The `walkin` QR type — should restaurants be able to disable it too?**

Some restaurants may want to allow ONLY table/room scans and disallow walkin QRs. Not asked for in this CR, but worth noting: that would be a SECOND independent flag (`allowWalkInQrOrders`). Out of scope for this CR; flag for the future if needed.

---

## 6. Hard constraints (carried forward)

- **Restaurant 716 untouched.** All guards wrapped in `String(restaurantId) !== '716'` exclusion.
- **No Item 2 root-cause fix in this CR.** The `editOrder.tableId` systemic bug stays parked; this CR is purely a policy gate, not a code-quality fix.
- **No backend changes.** All admin config flows through the existing `customer_app_config` document.
- **Default `true` (allowed).** Day-1 behaviour identical for every restaurant currently in production.

---

## 7. Open questions for owner (before planning)

| # | Question | My default if no answer |
|---|---|---|
| Q1 | Confirm `allowNonQrOrders` as flag name (default `true`)? | Yes |
| Q2 | Block at 3 checkpoints (landing + add-to-cart + place-order) or 2 (add-to-cart + place-order)? | 3 |
| Q3 | Bypass for `isEditMode === true`? | Yes (legitimate edit users not punished) |
| Q4 | Bypass for `isAuthenticated === true`? | No (login doesn't prove physical presence) |
| Q5 | Preserve cart on block, or clear cart? | Clear cart |
| Q6 | Modal vs toast for the block message? | Modal (non-dismissable) |
| Q7 | Restaurant 716 — confirm OUT of scope (carve-out applied like Items 2/3)? | Yes |
| Q8 | Walkin QRs — count as "valid scan" (not blocked)? | Yes |
| Q9 | Takeaway / Delivery — never blocked even when `allowNonQrOrders=false`? | Yes (those modes don't expect a QR) |
| Q10 | Telemetry — log block events to a backend endpoint (overlapping with parked F6)? | Optional yes |

---

## 8. Out of scope for this CR (explicit)

- The systemic Item 2 fix (`ReviewOrder.jsx:982-985` and `editOrder.tableId`) — stays parked in `ITEM2_PARKED.md`
- The Item 3 room → walk-in fix
- sessionStorage → localStorage migration (`useScannedTable.js` F3) — parked
- Wrong-QR overwrite fix (`useScannedTable.js` F2) — parked
- POS-side classification fixes — parked

---

## 9. Next step (not in this session)

Owner answers Q1-Q10 → I produce a planning doc with exact file:line surface + test scenarios → owner approves → implementation in a single small PR (~30-40 LOC).

> **No action taken in this session beyond registration. Awaiting owner answers on Q1-Q10.**
