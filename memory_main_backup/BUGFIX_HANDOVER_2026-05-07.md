# Bug Fix Handover — Customer / Scan & Order App
**Branch:** `latest-hyatt-fixes-7-may`
**HEAD at handover:** `18f6fbcdb16e71e6b973c28f5d392875f0ef0e75` (2026-05-07T05:33:09+00:00)
**Repo:** https://github.com/Abhi-mygenie/customer-app5th-march
**Prepared:** 2026-05-07
**Audience:** Implementation agent (or developer) picking up these two scoped bug fixes.

---

## 0. Scope & Ground Rules (read before touching code)

You are implementing **only the two bugs described below**. Both have already been investigated, root-caused, and proposed fixes are pre-approved. **Do not** introduce drive-by refactors, do not touch unrelated session fixes (favicon, document title, popup compulsory, scroll, etc. — those are tracked separately).

### Hard rules
1. Do not modify backend (`backend/server.py`). Customer FE consumes external preprod API at `https://preprod.mygenie.online/api/v1` — local backend is not in the call path here.
2. Do not modify the order **payload** sent to `placeOrder`.
3. Do not modify SC / GST / VAT **amount** calculations.
4. Do not weaken duplicate-order protection (Issue 2 must keep the conservative warning intact for true network losses).
5. Do not auto-retry `placeOrder` anywhere.
6. Do not round / floor / ceil intermediate percentage labels (Issue 1: configured rate must surface as-is).
7. One commit per bug. Conventional-commit style messages (suggested below).
8. No new dependencies. No file moves. No formatting-only diffs.

### What is in scope
- `frontend/src/api/services/orderService.ts` — Issue 1
- `frontend/src/pages/ReviewOrder.jsx` — Issue 2
- (Optional) `frontend/src/types/models/order.types.ts` — Issue 1, only if a type tweak is needed.

### What is **out of scope**
- Anything in `backend/`
- Any other frontend file (popup, favicon, document title, scroll, sessionStorage 716, anti-flash, admin stale cache, etc.)
- Any test file refactor — only add focused tests if explicitly asked.

---

## 1. Repo & environment quick start

```bash
# Clone & pin to the branch
git clone --branch latest-hyatt-fixes-7-may --single-branch \
  https://github.com/Abhi-mygenie/customer-app5th-march.git /app

# Verify HEAD
cd /app
git rev-parse HEAD                  # expected: 18f6fbcd... (or newer)
git rev-parse --abbrev-ref HEAD     # expected: latest-hyatt-fixes-7-may
```

### `.env` files (do not check in; copy as-is)

`/app/backend/.env`
```
MONGO_URL=mongodb://mygenie_admin:QplazmMzalpq@52.66.232.149:27017/mygenie
DB_NAME=mygenie
CORS_ORIGINS=*
JWT_SECRET=eK3j9xT7pL2qR8vW1nZ6fM4bC0yU5sH
MYGENIE_API_URL=https://preprod.mygenie.online/api/v1
```

`/app/frontend/.env`
```
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
REACT_APP_IMAGE_BASE_URL=https://manage.mygenie.online
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/api/v1
REACT_APP_LOGIN_PHONE=+919579504871
REACT_APP_LOGIN_PASSWORD=Qplazm@10
REACT_APP_CRM_URL=https://crm.mygenie.online/api
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCS9rZcttTxbair3abltZ3Fm1vEnmY0mj4
REACT_APP_CRM_API_VERSION=v2
```

### Install + run

```bash
cd /app/backend && pip install -r requirements.txt
cd /app/frontend && yarn install
sudo supervisorctl restart backend frontend
sudo supervisorctl status     # backend & frontend → RUNNING
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000   # → 200
```

### Smoke checks before editing
- Open `https://<preview-url>/716` in a browser → menu loads, BROWSE MENU visible.
- Add an item, go to Review Order. The price card should show "Service Charge", "CGST on SC 9%", "SGST on SC 9%". Note these labels — they're correct here. Issue 1 is on the **next** screen (Order Success).
- Place a test order to walk through the flow end-to-end. Capture the Order Success bill — the CGST/SGST on SC labels are where Issue 1 manifests.

---

## 2. Bug Catalog

| # | Title | Severity | Files | Lines |
|---|---|---|---|---|
| 1 | SC-GST percentage label on Order Success drifts from configured 9% to 8.99% (label-only; amounts correct) | Medium (compliance/UX) | `frontend/src/api/services/orderService.ts` | 205-208 |
| 2 | "Network error: lost the connection" toast fires even on successful orders when a post-success JS exception is thrown | High (user confusion + duplicate-order risk if user retries) | `frontend/src/pages/ReviewOrder.jsx` | 1208-1213, 239, 1101, 1123, 1351-1357 |

---

## 3. Issue 1 — SC-GST % label shows `8.99%` instead of `9%`

### 3.1 Symptoms
- On the Order Success page price breakdown, lines render as:
  - `CGST on SC 8.99%` (sometimes 8.98%, 9.01%, depending on cart)
  - `SGST on SC 8.99%`
- Restaurant Profile / `restaurant-info` API has `service_charge_tax = "18.00"` (combined CGST+SGST rate). Per-side label should therefore be **9%**.
- Review Order screen renders `CGST on SC 9%` correctly. **Only Order Success drifts.**

### 3.2 Live API evidence (already verified during investigation)
```bash
curl -s -X POST "https://preprod.mygenie.online/api/v1/web/restaurant-info" \
  -H "Content-Type: application/json" \
  -d '{"restaurant_web":"716"}' | python3 -c "import sys,json; d=json.load(sys.stdin); \
print('service_charge_tax        =', repr(d.get('service_charge_tax'))); \
print('service_charge_percentage =', repr(d.get('service_charge_percentage'))); \
print('gst_status                =', repr(d.get('gst_status')))"
```
Expected output:
```
service_charge_tax        = '18.00'
service_charge_percentage = '5.00'
gst_status                = True
```

### 3.3 Root cause

`frontend/src/api/services/orderService.ts:205-208` **back-derives** `scGstRate` from rounded amounts instead of preferring the configured rate:

```ts
// Current (buggy) code
const scGstRate = (serviceCharge > 0 && scGst > 0)
  ? parseFloat(((scGst / serviceCharge) * 100).toFixed(2))   // ← derives from amounts
  : (parseFloat(restaurantMeta.service_charge_tax) || null); // ← config used only as fallback
```

Both `serviceCharge` and `scGst` are 2-decimal-rounded amounts coming back from the backend. Their quotient is rarely exactly the configured percentage:

```
Example with cart that triggers backend rounding to 17.98:
  serviceCharge = 100.00, scGst = 17.98
  → derived scGstRate = (17.98 / 100.00) * 100 = 17.98
  → CGST on SC label = (17.98 / 2).toFixed(2) = "8.99%"   ← bug
```

The `.toFixed(2)` step in the calculation cements the rounding error into the label even when the originally-configured rate is a clean integer (`18`).

The Review Order screen does **not** suffer from this because `frontend/src/pages/ReviewOrder.jsx:633` reads `restaurant.service_charge_tax` directly:
```js
const scGstRate = parseFloat(restaurant?.service_charge_tax) || 0;
// → 18 → 18 % 2 === 0 → label "9%" ✓
```

### 3.4 Code references — DO NOT change anything except line 205-208 in this file

| File | Lines | Role | Action |
|---|---|---|---|
| `frontend/src/api/services/orderService.ts` | **205-208** | **Root cause.** Back-derived `scGstRate`. | **Edit per §3.5** |
| `frontend/src/api/services/orderService.ts` | 196-199 | Splits `scGst` *amount* → `scCgst` / `scSgst` (rupee values). | **Leave alone.** Amounts are correct. |
| `frontend/src/api/services/orderService.ts` | 230-247 | Returns `billSummary { ..., scGstRate }`. | **Leave alone.** Field name unchanged. |
| `frontend/src/pages/OrderSuccess.jsx` | 706, 712 | Renders the buggy rate. | **Leave alone.** Will display correct rate after §3.5 fix. |
| `frontend/src/pages/ReviewOrder.jsx` | 633, 1665, 1669 | Already correct; uses configured rate. | **Leave alone.** |
| `frontend/src/types/models/order.types.ts` | 150 | `scGstRate?: number` type. | **Leave alone.** Type is fine. |

### 3.5 The fix — exactly this diff

Open `frontend/src/api/services/orderService.ts`. Find lines 205-208:

```ts
    // SC-GST rate: derive from amounts if possible (scGst / serviceCharge * 100)
    const scGstRate = (serviceCharge > 0 && scGst > 0)
      ? parseFloat(((scGst / serviceCharge) * 100).toFixed(2))
      : (parseFloat(restaurantMeta.service_charge_tax) || null);
```

Replace with:

```ts
    // SC-GST rate: prefer the configured percentage from restaurant config —
    // it's the integer-clean value the user expects to see on the bill (e.g. 18%).
    // Fall back to deriving from rounded amounts only when the configured field
    // is missing/zero (legacy orders or restaurants that don't expose it).
    const configuredScGstRate = parseFloat(restaurantMeta.service_charge_tax);
    const scGstRate = Number.isFinite(configuredScGstRate) && configuredScGstRate > 0
      ? configuredScGstRate
      : ((serviceCharge > 0 && scGst > 0)
          ? parseFloat(((scGst / serviceCharge) * 100).toFixed(2))
          : null);
```

That's it. **No other lines should change in this file.** The amount fields (`scCgst`, `scSgst`, `serviceCharge`, etc.) and the returned `billSummary` shape are unchanged.

### 3.6 Why the fix is safe

- `restaurantMeta.service_charge_tax` is fetched from the same `/web/restaurant-info` API that ReviewOrder already trusts. Source-of-truth alignment between the two screens.
- For the standard Indian SC GST setup (`18.00`), label becomes `9%` on Order Success (matches Review Order).
- For non-integer configured rates (e.g. a synthetic `9.5`), label becomes `4.75%` per side — still derived from configured value, not from rounded amounts, so it stays consistent.
- For legacy orders where `restaurantMeta.service_charge_tax` is missing/zero, the fallback **preserves the current behavior** — no regression for old data.
- **Amounts are not touched.** Customers will still pay the same total; only the percentage label cleans up.

### 3.7 Commit message

```
fix(orderSuccess): use configured service_charge_tax for SC-GST label, not amount-derived

Issue: On the Order Success bill, "CGST on SC" / "SGST on SC" labels showed
values like 8.99% / 9.01% / 8.98% drifting around the configured 9%. Caused
by orderService.ts back-deriving the rate from backend-rounded amounts
(scGst / serviceCharge * 100) instead of the clean configured field.

Fix: Prefer restaurantMeta.service_charge_tax (e.g. "18.00" → 18 → "9%" per
side). Only fall back to amount-derivation when the config field is missing
on legacy orders. SC, scCgst, scSgst, and all rupee amounts are unchanged.

Files: frontend/src/api/services/orderService.ts (lines 205-208)
```

### 3.8 Validation steps for Issue 1

**Pre-fix capture (do this BEFORE editing) so you have a comparable):**
1. Place a test order on `/716` (use cart that produces a non-clean SC amount — e.g. 3-4 mixed items).
2. On Order Success, screenshot the price-breakdown card. Note the exact label and amount on the CGST on SC and SGST on SC rows.

**Post-fix validation:**
1. Place an identical order. Open Order Success.
2. Expected: `CGST on SC 9%` and `SGST on SC 9%` (whole numbers, no decimals).
3. Verify the **₹ amounts on those rows are identical** to the pre-fix screenshot — only the % text changed.
4. Open Review Order in another tab/scenario — labels still `9%` (was already correct, regression check).
5. Bonus: if you can mock `restaurantMeta.service_charge_tax = "9.5"` in dev tools, label should render `4.75%`. If you can mock it as missing, fallback runs and label matches old behavior.

**Curl-only smoke (no UI):**
```bash
# Confirm API still returns the clean rate
curl -s -X POST "$REACT_APP_API_BASE_URL/web/restaurant-info" \
  -H "Content-Type: application/json" \
  -d '{"restaurant_web":"716"}' \
  | grep -oE '"service_charge_tax":"[^"]*"'
# expected: "service_charge_tax":"18.00"
```

---

## 4. Issue 2 — "Network error" toast on successful orders

### 4.1 Symptoms
- User taps **Place Order**.
- App shows toast: `Network error: your order request was sent but we lost the connection. Please check your order history before placing again to avoid duplicates.`
- User checks order history → **the order is there.** Server processed it, customer was billed (if online), but UX claimed failure.
- If the user re-taps Place Order out of confusion → risk of duplicate order (currently mitigated by `isPlacingOrderRef`, but the perception risk remains).

### 4.2 Root cause

In `frontend/src/pages/ReviewOrder.jsx`:

```js
const orderDispatchedRef = useRef(false);                          // L239
...
orderDispatchedRef.current = true;                                  // L1101 (set BEFORE placeOrder)
response = await placeOrder({ ... });                               // L1123 (network call)
// ── post-success path: 70+ lines of work ──
logger.order('[PlaceOrder Response]', response);                    // L1159
const shouldProcessRazorpay = ...;                                  // L1162
if (shouldProcessRazorpay) { await openRazorpayCheckout(...) }      // L1164-1175
clearCart();                                                        // L1178
if (String(restaurantId) === '716') { setTableNumber(''); ... }     // L1181-1184
navigate(`/${restaurantId}/order-success`, {                        // L1187-1198
  state: { orderData: { ..., billSummary: buildBillSummary({...}) } }
});

} catch (error) {
  // L1208 — too aggressive condition
  if (!error.response && orderDispatchedRef.current) {
    toast.error('Network error: ...');
  }
  ...
}
```

The condition `!error.response && orderDispatchedRef.current` is meant to detect "request sent but no response received." It correctly catches **true** network losses (axios timeout, ECONNRESET).

But it **also** catches **post-success JavaScript exceptions** — any error thrown in lines 1159-1198 (after the HTTP response was already received) where `error.response` happens to be `undefined` because it's a plain JS error (TypeError, etc.), not an axios error.

**Concrete examples that misclassify as network loss:**
- `buildBillSummary({...})` (L1195) throws on a malformed input.
- `clearCart()` (L1178) throws if cart context is in an unexpected shape.
- `navigate()` (L1187) throws on serialization edge cases.
- A toast rendered before navigate fails synchronously.

In every one of these, the order **already succeeded server-side**. The toast then misleads the user.

### 4.3 Code references

| File | Lines | Role | Action |
|---|---|---|---|
| `frontend/src/pages/ReviewOrder.jsx` | **239** | `orderDispatchedRef = useRef(false)` declaration. | **Leave alone.** |
| `frontend/src/pages/ReviewOrder.jsx` | **1101** | `orderDispatchedRef.current = true;` set pre-call. | **Leave alone.** |
| `frontend/src/pages/ReviewOrder.jsx` | **1123** | `response = await placeOrder(...);` (response is in outer scope — readable from catch). | **Leave alone.** |
| `frontend/src/pages/ReviewOrder.jsx` | **1208-1213** | **The buggy condition + toast.** | **Edit per §4.4.** |
| `frontend/src/pages/ReviewOrder.jsx` | 1351-1357 | Generic-error branch (where post-success exceptions actually belong). | **Edit per §4.4** to add safe redirect when `response.order_id` is known. |
| `frontend/src/pages/ReviewOrder.jsx` | 1358-1362 | `finally` resets `orderDispatchedRef`. | **Leave alone.** |
| `frontend/src/pages/ReviewOrder.jsx` | 1214-1350 | 401 retry branch. | **Leave alone.** Do not touch. |

### 4.4 The fix — exactly this diff

Open `frontend/src/pages/ReviewOrder.jsx`. Find lines 1208-1213:

```js
      if (!error.response && orderDispatchedRef.current) {
        toast.error(
          'Network error: your order request was sent but we lost the connection. ' +
          'Please check your order history before placing again to avoid duplicates.',
          { duration: 8000 }
        );
      } else if (error.response?.status === 401) {
```

Replace with (note the new gate using `response` from outer scope, and `axios.isAxiosError`-style detection):

```js
      // SECURITY FIX 2 (refined): Only flag true network loss.
      // Conditions, ALL must hold:
      //   (a) we dispatched the request (`orderDispatchedRef`),
      //   (b) we never received a response object back (`!response`),
      //   (c) axios reports no HTTP response (`!error.response`),
      //   (d) the error looks like a real transport-layer failure.
      // This avoids misclassifying post-success JS exceptions (e.g.
      // buildBillSummary / clearCart / navigate throwing AFTER placeOrder
      // resolved with a real order_id) as "network loss", which previously
      // showed the duplicate-order warning even though the order succeeded.
      const isTransportError =
        error?.isAxiosError === true ||
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ERR_NETWORK' ||
        error?.code === 'ETIMEDOUT' ||
        error?.message === 'Network Error';
      const isTrueNetworkLoss =
        orderDispatchedRef.current &&
        !response &&
        !error?.response &&
        isTransportError;

      if (isTrueNetworkLoss) {
        toast.error(
          'Network error: your order request was sent but we lost the connection. ' +
          'Please check your order history before placing again to avoid duplicates.',
          { duration: 8000 }
        );
      } else if (error.response?.status === 401) {
```

Then find the existing generic-error branch at lines 1351-1357:

```js
      } else {
        // Other errors
        const errorMessage = error.response?.data?.message ||
          error.response?.data?.errors?.message ||
          (isEditMode ? 'Failed to update order. Please try again.' : 'Failed to place order. Please try again.');
        toast.error(errorMessage);
      }
```

Replace with:

```js
      } else {
        // Generic-error branch (also catches post-success JS exceptions now).
        // If `response.order_id` is already known, the server accepted the
        // order — navigate the user to Order Success rather than leaving them
        // on a stale Review Order screen with an unhelpful toast.
        const errorMessage = error.response?.data?.message ||
          error.response?.data?.errors?.message ||
          (isEditMode ? 'Failed to update order. Please try again.' : 'Failed to place order. Please try again.');

        if (response?.order_id) {
          logger.error('order', 'Post-place-order error (order_id received):', error, { orderId: response.order_id });
          // Best-effort cart cleanup — guarded so it can't re-throw and re-enter catch.
          try { clearCart(); } catch (_) { /* noop */ }
          navigate(`/${restaurantId}/order-success`, {
            state: {
              orderData: {
                orderId: response.order_id,
                totalToPay: response.total_amount || roundedTotal.toFixed(2),
                isEditedOrder: isEditMode,
                items: buildOrderItems(cartItems),
                previousItems: buildPreviousItems(previousOrderItems, isEditMode),
              }
            }
          });
        } else {
          toast.error(errorMessage);
        }
      }
```

That's the entire change. **Do not touch the 401 retry branch (L1214-1350) or the `finally` block (L1358-1362).**

### 4.5 Why the fix is safe

- **Duplicate-order protection preserved.** True transport errors still raise the conservative warning. The existing `isPlacingOrderRef` debounce stops double-clicks.
- **No auto-retry.** No code path retries `placeOrder` automatically.
- **`response` is already in outer try-block scope** (declared as `let response;` further up in the function), so reading it from catch is valid and well-defined.
- The post-success-rescue branch only fires when **the server already returned `order_id`** — so we know the order exists. Navigating the user to Order Success matches reality.
- The `clearCart()` inside the rescue branch is wrapped in a try/catch so a second cart exception cannot re-enter the outer catch.
- No backend, no payload, no calculation changes.

### 4.6 Commit message

```
fix(reviewOrder): only show network-loss toast when no response was received

Issue: After Place Order, the "Network error: lost the connection" toast
appeared even when the order had succeeded server-side. Cause: the catch
condition `!error.response && orderDispatchedRef.current` matched any JS
error thrown in the post-success code path (clearCart / navigate /
buildBillSummary), not just transport-layer failures.

Fix:
1. Tighten the condition to require all of: dispatched, no `response`
   captured, no axios `error.response`, and a transport-error signature
   (axios isAxiosError / ECONNABORTED / ERR_NETWORK / ETIMEDOUT).
2. In the generic-error branch, if `response.order_id` is already known,
   navigate to Order Success instead of leaving the user on Review Order
   with a misleading toast. Cart cleared best-effort.

Duplicate-order protection (isPlacingOrderRef + dispatch-flag conservative
warning on true network loss) is unchanged. No auto-retry. No payload or
backend changes.

Files: frontend/src/pages/ReviewOrder.jsx (lines 1208-1213, 1351-1357)
```

### 4.7 Validation steps for Issue 2

**A. Happy path (regression check)**
1. Place a normal order on `/716` with COD.
2. Expected: navigated to Order Success. **No toast.** Order visible in admin / order history exactly once.

**B. True network loss (preserve old behavior)**
1. In Chrome DevTools → Network → set throttling to "Offline" *just after* tapping Place Order, before the response arrives. (Or use `Network → Block request URL` on `/order/place-order` *after* request fires.)
2. Expected: network-loss toast fires once. User stays on Review Order. Place Order button does **not** allow re-fire (debounced by `isPlacingOrderRef`).
3. Confirm in admin: order may or may not exist depending on whether the request reached the server before disconnect — that ambiguity is exactly what the toast is warning about. Behavior here should be **identical** to pre-fix.

**C. Post-success JS exception (the bug being fixed)**
1. Temporarily monkey-patch `buildBillSummary` to throw — for example, in DevTools console **before** placing the order:
   ```js
   // monkey-patch is impractical at module scope; use the alternate plan below
   ```
   Alternative (preferred, no source edit): place a normal order with a malformed `customerPhone` value that breaks an internal stringification in `buildBillSummary`, OR run a manually-crafted `OrderSuccess` navigation by editing state in DevTools.
   
   Easier alternative: temporarily edit your local `buildBillSummary` import to throw if `gstRate === null`, place an order with a mixed-tax cart that produces `gstRate = null`. Revert the local edit after the test.
2. With fix → user sees a generic toast and is **navigated to Order Success** with the correct `order_id`.
3. Without fix → user sees the misleading network-loss toast.
4. Confirm in admin: exactly one order created in both pre- and post-fix scenarios for this test.

**D. 401 retry (regression check)**
1. With an expired auth token, place an order. Token-refresh retry path (L1214-1350) must still run unchanged.
2. Expected: order placed once on retry, navigated to Order Success.

---

## 5. Combined risk profile

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Issue 1 fix changes a rupee amount | **Very low** | Customer billed wrong | Diff only touches `scGstRate` (a label-only field). All amount fields (`scCgst`, `scSgst`, `serviceCharge`, `totalTax`, `grandTotal`) are computed independently from `scGstRate` — they are read from the `firstDetail.*_amount` fields. **Verify by diffing the rendered `₹` values pre/post fix in §3.8 step 3.** |
| Issue 1 fix breaks a restaurant whose API doesn't expose `service_charge_tax` | **Low** | SC GST label disappears | Fallback to current amount-derivation preserved. Test by mocking `restaurantMeta.service_charge_tax = undefined`. |
| Issue 2 fix lets a duplicate slip through | **Very low** | Customer charged twice | The change only **softens** misclassified post-success errors; the conservative warning still fires for genuine transport failures. `isPlacingOrderRef` and `orderDispatchedRef` debouncing unchanged. |
| Issue 2 fix navigates to OrderSuccess with bad data | **Low** | User sees blank or partial bill | Rescue branch only fires when `response.order_id` exists. `billSummary` is omitted from rescue navigation state — OrderSuccess re-fetches order details from API, which is the same path used by the share-link / direct-URL flow, so it works without the local billSummary. |
| Both fixes touch test snapshots | **N/A** | Test break | No snapshot tests rely on `scGstRate` numerical value or the specific catch toast string. (Verified: `grep -rn "scGstRate\\|lost the connection" frontend/src/__tests__/` returns no matches.) |

---

## 6. Implementation checklist (use this as a runbook)

### Pre-flight
- [ ] Branch is `latest-hyatt-fixes-7-may`
- [ ] HEAD ≥ `18f6fbcd…`
- [ ] `.env` files installed per §1
- [ ] `yarn install` clean, `pip install -r requirements.txt` clean
- [ ] Frontend & backend services RUNNING in supervisor
- [ ] `/716` loads in browser, can add to cart, can reach Review Order

### Issue 1
- [ ] Capture screenshot of Order Success bill *before* edit (pre-fix evidence)
- [ ] Edit `frontend/src/api/services/orderService.ts` lines 205-208 per §3.5
- [ ] Run a static type check (TypeScript): `cd /app/frontend && yarn tsc --noEmit` (or equivalent — file is .ts)
- [ ] Place a test order on `/716`, verify Order Success label = `9%` per §3.8
- [ ] Diff the rupee amounts pre vs post — must be identical
- [ ] Commit with the message in §3.7

### Issue 2
- [ ] Edit `frontend/src/pages/ReviewOrder.jsx` lines 1208-1213 per §4.4
- [ ] Edit `frontend/src/pages/ReviewOrder.jsx` lines 1351-1357 per §4.4
- [ ] Run validation A, B, C, D from §4.7
- [ ] Commit with the message in §4.6

### Wrap-up
- [ ] Push the two commits to `latest-hyatt-fixes-7-may` (or open PR per team workflow)
- [ ] Update `/app/memory/PRD.md` with a one-line entry under "What's been implemented"
- [ ] Notify the bug-investigation owner (you / requester) for sign-off

---

## 7. Out-of-scope but worth noting (DO NOT IMPLEMENT here)

These are real follow-ups but **belong to separate tickets** — flag them for backlog, do not touch in this handover:

1. **Server-side order verification on true network loss.** When the conservative warning toast fires, optionally call `getOrderHistory(customerPhone, since=now-60s)`; if the cart fingerprint matches the latest order, navigate to that order's success page. This is a sizable feature.
2. **OrderSuccess stale color cache** — separate audit item ("Fix 10").
3. **DocumentTitleManager wiring** — separate audit item ("Fix 8 partial").
4. **Per-line-item GST rate display** — current code shows a single uniform label (`gstRate`) per cart; mixed-rate carts show no rate. Out of scope.

---

## 8. Contact / handback

- Investigation source: this document (`/app/memory/BUGFIX_HANDOVER_2026-05-07.md`).
- After both commits land, close the loop with a short message in the chat: *"Both fixes shipped on `<commit-1>` and `<commit-2>`. Validation §3.8 / §4.7 passed."*
- If anything in §3.5 or §4.4 fails to apply (line numbers shifted, etc.), **stop and re-investigate** — do not improvise; the line ranges are tied to specific commits.

---

**End of handover.**
