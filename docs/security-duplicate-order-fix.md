# Security Fix: Duplicate Order Prevention

**File:** `frontend/src/pages/ReviewOrder.jsx`
**Date:** March 2026
**Severity:** High — could result in duplicate charges / duplicate kitchen orders

---

## Vulnerabilities Fixed

### Fix 1 — Double-Click Race Condition (Synchronous Guard)

**The Problem:**
`setIsPlacingOrder(true)` is a React state update. React batches state updates and applies them during the next render cycle. This means there is a brief window between the user's first click and the button actually becoming `disabled` in the DOM. A user who double-clicks very fast (within a single render cycle) could fire `handlePlaceOrder` twice before React re-renders.

**The Fix:**
Added a `useRef` flag (`isPlacingOrderRef`) that acts as a **synchronous, immediate guard**:

```jsx
const isPlacingOrderRef = useRef(false);

const handlePlaceOrder = async () => {
  // Synchronous check — blocks before any render cycle
  if (isPlacingOrderRef.current) return;
  isPlacingOrderRef.current = true;
  // ...
  setIsPlacingOrder(true); // Still needed for UI button disabled state
  // ...
  finally {
    isPlacingOrderRef.current = false; // Reset after completion
    setIsPlacingOrder(false);
  }
};
```

**Why `useRef` and not `useState`?**
- `useRef` updates are **synchronous** — the value changes immediately on the same call stack
- `useState` updates are **asynchronous** — React queues them for the next render
- For a guard that blocks concurrent invocations, only a ref works correctly

---

### Fix 2 — Network-Loss Duplicate Order Warning

**The Problem:**
When a user places an order on a flaky network:
1. `placeOrder()` is called — HTTP request is sent to the POS server
2. The server receives and **processes the order successfully**
3. The HTTP response is lost in transit (network drop, mobile signal loss, timeout)
4. The client receives a network error (`error.response === undefined`)
5. The button re-enables after `finally { setIsPlacingOrder(false) }`
6. The user sees a generic error and clicks "Place Order" again
7. **A second order is created on the server — duplicate order**

**The Fix:**
Added an `orderDispatchedRef` that is set to `true` immediately before `placeOrder()` is called. In the catch block, if there is **no server response** (`!error.response`) AND the request was dispatched, we show a **specific warning** instead of a generic retry message:

```jsx
const orderDispatchedRef = useRef(false);

// Set flag just before API call
orderDispatchedRef.current = true;
response = await placeOrder({ ... });

// In catch:
if (!error.response && orderDispatchedRef.current) {
  toast.error(
    'Network error: your order request was sent but we lost the connection. ' +
    'Please check your order history before placing again to avoid duplicates.',
    { duration: 8000 }
  );
}
```

**Why not auto-retry on network error?**
Retrying on a network error is dangerous because the original request may have already been processed server-side. Unlike a 401 (where the server explicitly rejected auth BEFORE processing), a network error gives no guarantee about server state.

---

## What Was NOT Changed (intentionally safe)

**The 401 retry path is kept as-is.** When `error.response?.status === 401`:
- The server explicitly returned 401, meaning it **rejected the request at the auth layer**
- Auth middleware runs BEFORE business logic in standard REST APIs
- The order was **never processed** — retrying with a fresh token is safe
- This is the intended auto-recovery path for expired tokens

---

## How to Test These Fixes

### Test Fix 1 (Double-Click Guard):
1. Open DevTools → Network → Set throttle to **Slow 3G**
2. Add items to cart, go to Review Order
3. Click "Place Order" **rapidly 3–4 times**
4. Check Network tab — only **1 POST request** should appear
5. Check console — no second invocation of `handlePlaceOrder`

### Test Fix 2 (Network-Loss Warning):
1. Open DevTools → Network tab
2. Add items to cart, go to Review Order
3. Click "Place Order" once
4. **Immediately** switch to Offline mode in DevTools (before response arrives)
5. Expected: Toast message specifically warns about checking order history
6. NOT expected: Generic "Failed to place order. Please try again." message

### Test 401 Retry (should still work normally):
1. Open DevTools → Application → Local Storage
2. Corrupt or delete the auth token
3. Click "Place Order"
4. Expected: Token is refreshed, order is placed successfully on retry
