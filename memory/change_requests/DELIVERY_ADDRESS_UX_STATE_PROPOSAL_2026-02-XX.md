# UX State Proposal — Delivery Address Screen (4 Cases)

**Date:** 2026-02 (current session)
**Status:** Planning / UX state spec only. **No code touched.**
**Predecessor docs:**
- `/app/memory/change_requests/DELIVERY_ADDRESS_UX_CR_PLAN_2026-02-XX.md` (Part A + Part B implementation plan)
- `/app/memory/change_requests/DELIVERY_PHONE_AND_ADDRESS_FLOW_INVESTIGATION_2026-02-XX.md`

**Locked zones (untouched):** order placement payload, tax/SC/GST/delivery charge math, KOT/bill/print, sockets, Firebase, payments, backend, FastAPI proxy.

**Scope of this doc:** Define the precise UI behaviour for the 4 customer-facing states on `DeliveryAddress.jsx`, contrast each with current behaviour, and lock the implementation plan once the owner confirms.

---

## 0. Source of truth — current implementation

File: `frontend/src/pages/DeliveryAddress.jsx` (846 LOC). Key references used in this doc:

| Concern | Line | Note |
|---|---|---|
| Initial selection rule | 134-145 | Auto-pick `is_default`, else **first** saved address |
| Display address fallback text | 614 | "Drag pin or select an address below" |
| Saved-list empty state | 654-658 | Shows centered "No saved addresses" card |
| Confirm & Proceed `disabled` | 831 | `distanceLoading \|\| isNotDeliverable \|\| (!selectedId && !reverseAddress)` |
| Selected card visual | 686 | Orange `IoCheckmarkCircle` only |
| Map-pin drag deselects card | 305 | `setSelectedId(null)` |
| Use Current Location deselects card | 179 | `setSelectedId(null)` |

---

## 1. CASE 1 — First-time user / NO saved addresses

### 1.1 Current behaviour
- Map: **visible** (`mapCenter` defaults to Shoghi `31.0397,77.1245`).
- Saved-list area: shows centered "No saved addresses" empty state with location icon (line 654-658).
- Header strip (`da-selected-display` line 611-616): shows fallback text *"Drag pin or select an address below"* with a pin icon — but **no "DELIVERING TO:" prefix**.
- Pre-selection: nothing selected (`selectedId === null`, no `reverseAddress`).
- Confirm & Proceed: **disabled** because `(!selectedId && !reverseAddress)` evaluates true.
- If user GPS / drag pin / Places search → `reverseAddress` populates → button enables.
- "Add New Address" button always visible at the bottom of the saved list.
- Distance bar: empty (no result yet).

### 1.2 Proposed UX
- Map: **visible** (no change).
- Header strip becomes the new uppercase "DELIVERING TO:" header:
  - Text: `DELIVERING TO: Please add or select a delivery address`
  - Same line shows the active address text once any source is set.
- Below the header (or as part of it), a soft hint line: *"Search, use current location, or add a new address to continue"*. Hint hides as soon as any address source is set.
- Saved-list area: existing "No saved addresses" empty state unchanged — but visually de-emphasized (we already have it).
- "Add New Address" button: **stays visible** at the bottom of the saved list (no change).
- Confirm & Proceed: **disabled** until any of these populates an active address:
  - Places autocomplete pick → fills `markerPos` + `reverseAddress` (via the picked place's `formattedAddress` — see §1.4 below).
  - Use Current Location button → fills `markerPos` + `reverseAddress`.
  - Map pin drag → fills `markerPos` + `reverseAddress`.
  - User opens "Add New Address", saves → becomes selected saved card.
- Once any of the above runs, header swaps to: `DELIVERING TO: <reverse-geocoded text>` (or saved address text if Add New Address was used).

### 1.3 Confirm & Proceed (`disabled`) truth table — Case 1
| Sub-state | `selectedId` | `reverseAddress` | Distance | Button |
|---|---|---|---|---|
| Just landed | null | empty | none | **disabled** |
| GPS used | null | filled | loading/ok | enabled if `!loading && !isNotDeliverable` |
| Map pin dragged | null | filled | loading/ok | enabled if `!loading && !isNotDeliverable` |
| Places picked | null | filled | loading/ok | enabled if `!loading && !isNotDeliverable` |
| Add New Address saved | new id | empty | ok | enabled |

### 1.4 Address source resolved & used
| Input event | Used as `setDeliveryAddress(...)` source |
|---|---|
| GPS | `{ address: reverseAddress, latitude, longitude }` (existing fallback in `handleContinue` line 389-393) |
| Map pin drag | same as GPS |
| Places search pick | We will additionally `setReverseAddress(place.formattedAddress)` so header + button enable correctly without forcing the user to open "Add New Address" first. **(Bug fix — see §1.6)** |
| Add New Address saved | The newly created saved address (full `address_id`) |

### 1.5 Map behaviour
- Visible: yes.
- Center: defaults to Shoghi (`DEFAULT_CENTER`); on GPS/Places/drag → recenters to picked coords.
- Pin: at `DEFAULT_CENTER` initially; updates on every event above.
- Distance recalc trigger: any change to `markerPos` runs `checkDistance(lat, lng)` (debounced 500 ms).

### 1.6 Bug uncovered while drafting Case 1
**Today, when a user picks a Places suggestion, we set `markerPos` and `mapCenter` but do NOT set `reverseAddress`** (lines 477-524). The user must additionally drag the pin or hit GPS to enable Confirm & Proceed without saving. Proposed fix: in `handleSelectPrediction`, also `setReverseAddress(place.formattedAddress)`. **Tiny ~1-line fix; ships with Case 1 as part of this CR.**

---

## 2. CASE 2 — Saved addresses exist but NO `is_default`

### 2.1 Current behaviour
- Initial selection (line 134-145): falls back to **the first address in the list** when no `is_default`.
- That means today, **a card IS auto-selected** (orange ✓ on the first card).
- Header `da-selected-display` shows the first card's address text.
- Confirm & Proceed: **enabled** (assuming distance check passes for the first card's lat/lng).

### 2.2 Owner expectation (per your message)
> "No card should show SELECTED by default unless current code already intentionally selects one."

The current code **does** intentionally select the first card when no default exists. Two options:

| Option | Behaviour | Pros | Cons |
|---|---|---|---|
| **2.2a — Keep current** (auto-select first card) | First card auto-selected, header populated, button enabled if distance ok | Zero friction; no behaviour regression | Subtle implicit choice user may not realise |
| **2.2b — Force explicit choice** (no auto-select when no default) | No card selected, header reads "Please select an address", button disabled until user taps a card | Owner-aligned with original CR brief; safer for accidental orders | Behaviour change; one extra tap on every visit when no default exists |

**Recommendation:** **2.2a (keep current).** Reason: this CR scope is selection clarity, not a flow change. Forcing explicit selection is a separate behaviour change with potential negative impact on returning customers. If you prefer 2.2b, it's a 5-line change (drop the `|| (addrs.length > 0 ? addrs[0] : null)` fallback from line 136) — but I'll only ship it under explicit owner approval.

### 2.3 Proposed UX (under 2.2a — current behaviour kept)
- Map: visible.
- Saved-list: visible.
- Header: `DELIVERING TO: <first card's address text>` (because first card is auto-selected).
- First card carries: `[Default? — none]` `[● SELECTED]` + ✓.
- Tapping another saved card → SELECTED + ✓ move; header updates; map recenters; `checkDistance()` re-runs.
- Confirm & Proceed: enabled if `!distanceLoading && !isNotDeliverable`.

### 2.4 Proposed UX (under 2.2b — force explicit selection)
- Map: visible.
- Saved-list: visible. **No card auto-selected.**
- Header: `DELIVERING TO: Please select an address`.
- No SELECTED pill, no orange ✓.
- Confirm & Proceed: **disabled** until a card is tapped, GPS used, pin dragged, or Places used.
- Tapping a saved card → `selectedId` set, header swaps, map recenters, distance recalc, button enables.

### 2.5 Confirm & Proceed truth table — Case 2 (option 2.2a, current)
| Sub-state | `selectedId` | `reverseAddress` | Button |
|---|---|---|---|
| Just landed (first card auto-selected) | first.id | "" | enabled if distance ok |
| User taps a different card | new id | "" | enabled if distance ok |
| User uses GPS | null | filled | enabled if distance ok |
| User adds new address | new id | "" | enabled if distance ok |

### 2.6 Address source resolved & used
- Selected saved card → flatten as today (line 386-410). No payload change.

### 2.7 Map behaviour
- Visible.
- Center: first card's lat/lng on mount; recenters on every selection / drag / GPS.
- Pin: at active address.
- Distance recalc: on every `markerPos` change.

---

## 3. CASE 3 — Default address exists

### 3.1 Current behaviour
- Default address auto-selected on mount (line 135-138).
- Map centers + pin sits on default address coords.
- `da-selected-display` shows default address text.
- First card carries `[Default]` pill (line 676) and orange ✓ (line 686).
- Confirm & Proceed: enabled if distance ok.

### 3.2 Proposed UX
- Map: visible (no change).
- Default card: auto-selected (no change).
- Header: `DELIVERING TO: <default address text>`.
- Default card carries **both** pills:
  - `[Default]` (orange — existing static flag).
  - `[● SELECTED]` (green — new, indicates current choice).
- Orange ✓ stays as redundant signal.
- Tapping a non-default card → SELECTED + ✓ move to that card; `[Default]` stays on the original card; header updates; map recenters; `checkDistance()` re-runs.

### 3.3 Confirm & Proceed truth table — Case 3
| Sub-state | `selectedId` | `reverseAddress` | Button |
|---|---|---|---|
| Default auto-selected | default.id | "" | enabled if distance ok |
| User taps non-default | other.id | "" | enabled if distance ok |
| User uses GPS / drags pin | null | filled | enabled if distance ok |
| User adds new address | new id | "" | enabled if distance ok |

### 3.4 Address source resolved & used
- Selected saved card (default or otherwise) — flattened as today.

### 3.5 Map behaviour
- Visible. Centered on the default address on mount; recenters on selection change / drag / GPS.
- Distance recalc on every `markerPos` change.

---

## 4. CASE 4 — GPS / map pin selected (overrides any saved selection)

### 4.1 Current behaviour
- `requestCurrentLocation()` runs on mount (line 122) but doesn't auto-apply — only stores in `currentLocation` state.
- `handleUseCurrentLocation` (line 175-186): sets marker, **clears `selectedId` to null**, reverse-geocodes, runs `checkDistance()`.
- `handleMarkerDragEnd` (line 301-308): same — `selectedId = null`, reverse-geocode, distance recalc.
- `da-selected-display` shows the reverse-geocoded text.
- Confirm & Proceed: enabled if `reverseAddress` set + distance ok.
- `handleContinue` (line 386-410) builds: `{ address: reverseAddress, latitude: markerPos.lat, longitude: markerPos.lng }` when no saved card is selected → no `address_id` in payload.

### 4.2 Proposed UX
- Map pin / reverse address becomes the active delivery address (no change).
- Header: `DELIVERING TO: <reverse-geocoded text>` (replaces today's plain address line).
- **No** saved card shows SELECTED or orange ✓ (because `selectedId === null`).
- Saved cards remain tappable — tapping one returns to Case 2/3 behaviour (re-selects the card, deselects GPS, restores `[● SELECTED]` on the chosen card).
- Distance/charge/ETA bar updates on every drag/GPS event (debounced 500 ms).

### 4.3 Confirm & Proceed truth table — Case 4
| Sub-state | `selectedId` | `reverseAddress` | Button |
|---|---|---|---|
| GPS just used | null | filled | enabled if `!distanceLoading && !isNotDeliverable` |
| Pin dragged | null | filled | enabled if `!distanceLoading && !isNotDeliverable` |
| Places suggestion picked | null | **filled (with §1.6 fix)** | enabled if distance ok |
| User taps saved card | card.id | "" | enabled if distance ok |

### 4.4 Address source resolved & used
- GPS / map-pin: `{ address: reverseAddress, latitude, longitude }` flattened into cart (existing `handleContinue` fallback). **No `address_id`** in payload — backend tolerates this for ad-hoc GPS deliveries.

### 4.5 Map behaviour
- Visible.
- Center: snaps to GPS / dragged / picked coords.
- Pin: at active coords; draggable (existing).
- Distance recalc trigger: any `markerPos` change → debounced `checkDistance()`.

---

## 5. Cross-case behaviour matrix (one-glance reference)

| State | Map | Saved list | Header text | SELECTED pill | Default pill | Confirm & Proceed | Address source |
|---|---|---|---|---|---|---|---|
| **C1** First-time, no input yet | ✅ default Shoghi | "No saved addresses" empty | `DELIVERING TO: Please add or select a delivery address` | none | none | ❌ disabled | none |
| **C1** First-time, GPS/pin/Places used | ✅ centered on coords | "No saved addresses" empty | `DELIVERING TO: <reverse text>` | none | none | ✅ if distance ok | GPS / pin |
| **C2** Saved + no default *(2.2a current)* | ✅ first card coords | visible | `DELIVERING TO: <first card text>` | on first card | none | ✅ if distance ok | first saved card |
| **C2** Saved + no default *(2.2b explicit)* | ✅ default Shoghi | visible | `DELIVERING TO: Please select an address` | none | none | ❌ disabled | none |
| **C3** Default exists, default selected | ✅ default coords | visible | `DELIVERING TO: <default text>` | on default card | on default card | ✅ if distance ok | default saved card |
| **C3** Default exists, user picks non-default | ✅ that card's coords | visible | `DELIVERING TO: <picked text>` | on picked card | on default card | ✅ if distance ok | picked saved card |
| **C4** GPS / pin overrides | ✅ GPS coords | visible (cards tappable, none selected) | `DELIVERING TO: <reverse text>` | none | (still on default card if exists) | ✅ if distance ok | GPS / pin |

---

## 6. Implementation plan (post-confirmation)

Minimal, surgical, single PR. Files touched (same as Part A of the original CR plan):
- `frontend/src/pages/DeliveryAddress.jsx`
- `frontend/src/pages/DeliveryAddress.css`
- `frontend/src/__tests__/pages/DeliveryAddress.test.js` (extend)

### 6.1 Code changes (in order)

1. **Header markup** — replace existing `da-selected-display` block (lines 610-616) with:
   ```jsx
   <div className="da-delivering-header" data-testid="delivering-to-header">
     <span className="da-delivering-label">DELIVERING TO:</span>
     <span className="da-delivering-text" data-testid="delivering-to-text">
       {headerText}
     </span>
   </div>
   ```
   New derived value:
   ```js
   const headerText = displayAddress
     || (addresses.length === 0 ? 'Please add or select a delivery address' : 'Please select an address');
   ```
   (`displayAddress` already exists at line 546-548; we reuse it as-is.)

2. **SELECTED pill on the chosen card** — inside the existing card type-row (line 674-677), append:
   ```jsx
   {isSelected && (
     <span className="da-card-selected-pill" data-testid={`selected-pill-${addr.id}`}>
       ● SELECTED
     </span>
   )}
   ```

3. **Places autocomplete bug fix (§1.6)** — in `handleSelectPrediction` (line 477+), after we set `markerPos`/`mapCenter`, also call:
   ```js
   setReverseAddress(place.formattedAddress || pred.text?.text || '');
   ```
   This ensures Confirm & Proceed enables for first-time users who pick a Places suggestion (Case 1).

4. **CSS** — append to `DeliveryAddress.css`:
   ```css
   .da-delivering-header { display:flex; flex-direction:column; gap:4px; padding:12px 16px; background:#f8f9fa; border-bottom:1px solid #eef0f2; }
   .da-delivering-label { font-size:11px; font-weight:600; letter-spacing:0.6px; color:var(--text-light, #6b7280); text-transform:uppercase; }
   .da-delivering-text { font-size:14px; font-weight:500; color:var(--text-dark, #111827); line-height:1.35; }
   .da-card-selected-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:9999px; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:11px; font-weight:600; letter-spacing:0.4px; margin-left:6px; }
   ```

5. **Tests** — extend `DeliveryAddress.test.js`:
   - Renders `DELIVERING TO:` label.
   - Header shows "Please add or select…" when no addresses + no marker.
   - Header shows reverse text after `handleUseCurrentLocation`.
   - SELECTED pill appears on `selectedId` card; not on others.
   - Places suggestion pick enables Confirm & Proceed (regression for §1.6).

### 6.2 What is NOT changing (out of scope, locked)
- Confirm & Proceed `disabled` formula (line 831) — already correct.
- `handleContinue` logic (line 385-410) — payload unchanged.
- `crmService.js` — no edits in this PR (Part B / pencil edit is a separate phase).
- Distance API contract / debounce (line 209-241).
- `setDeliveryCharge` / cart context.
- Any backend / FastAPI / payment / KOT / print / socket code.

### 6.3 Diff size estimate
~30 LOC JSX + ~20 LOC CSS + ~40 LOC tests. Single PR.

### 6.4 Phase sequencing relative to original CR plan
- **This document = Part A only** (selection clarity + Places bug fix).
- **Part B** (saved-address pencil edit using `crmUpdateAddress`) is intentionally deferred to a follow-up PR per the original plan §13. We can ship Part A first and Part B 1-2 days later.

---

## 7. Approval gates — STOP

Owner approval required on:

| # | Question | Default if you don't override |
|---|---|---|
| **U1** | Approve Case 1 UX (header copy + Places fix) | YES |
| **U2** | Approve Case 2 UX — keep current auto-select-first behaviour (option **2.2a**)? | **2.2a (keep current)** |
| **U3** | If you prefer **2.2b (force explicit selection)**, confirm — this is a behaviour change beyond pure UX clarity | NO |
| **U4** | Approve Case 3 UX (Default + SELECTED pills coexist on default card) | YES |
| **U5** | Approve Case 4 UX (GPS/pin clears SELECTED, header swaps to reverse text) | YES |
| **U6** | Header copy: `DELIVERING TO:` (uppercase) | YES |
| **U7** | Empty-state header copy: `Please add or select a delivery address` | YES |
| **U8** | No-default header copy (only if 2.2b chosen): `Please select an address` | YES |
| **U9** | Selected pill copy: `● SELECTED` | YES |
| **U10** | Ship Part A (this proposal) and Part B (pencil edit) as a single PR or two PRs? | Single PR (recommended) |
| **U11** | Include the Places autocomplete bug fix (§1.6) in this PR? | YES |

Reply **"approve all defaults"** and I'll implement Part A (~50 LOC + 40 LOC tests) in a single PR, only touching `DeliveryAddress.jsx` + `DeliveryAddress.css` + the existing test file.

Or override any of U1–U11 with your preferences.

---

## 8. Out of scope (locked)
- Backend / FastAPI / API contract — no changes.
- Order placement / update payload structure — no changes.
- Tax / SC / GST / delivery charge formula — no changes.
- Payment / KOT / bill / print / sockets / Firebase — no changes.
- GPS-derived address auto-save to CRM — no changes (existing flow preserved; user must explicitly Add New Address).
- New filtering on saved address types — no changes.
- `/app/memory/current-state/` — no changes.
- Saved-address pencil edit (Part B) — covered in original CR plan, deferred to follow-up PR by default.
