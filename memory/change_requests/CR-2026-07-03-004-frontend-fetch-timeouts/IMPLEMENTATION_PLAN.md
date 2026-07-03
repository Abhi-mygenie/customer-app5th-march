# Implementation Plan — CR-2026-07-03-004

**Companion doc:** `CR.md` (same folder).
**Role:** PLANNING (no code will be written yet — deferred to next sprint).
**Prerequisite:** CR-2026-07-03-003 should merge first.

---

## 1. Illustrative diffs (for review only — patch applied later)

### 1.1 New utility — `frontend/src/utils/fetchWithTimeout.js`

```js
// CR-2026-07-03-004 — fetch wrapper with a hard deadline via AbortController.
// Throws a plain Error with `.name === 'TimeoutError'` on deadline.
// Aborts propagate as DOMException 'AbortError' — treat as expected.
export const DEFAULT_READ_TIMEOUT_MS = 8000;
export const DEFAULT_WRITE_TIMEOUT_MS = 15000;

export function fetchWithTimeout(url, opts = {}, timeoutMs = DEFAULT_READ_TIMEOUT_MS) {
  const controller = new AbortController();
  const signal = opts.signal
    ? mergeSignals(opts.signal, controller.signal)
    : controller.signal;
  const timer = setTimeout(() => controller.abort(new DOMException(
    `fetch to ${url} exceeded ${timeoutMs} ms`, 'TimeoutError'
  )), timeoutMs);
  return fetch(url, { ...opts, signal }).finally(() => clearTimeout(timer));
}

function mergeSignals(a, b) {
  // Compose two AbortSignals — either firing aborts the fetch.
  const c = new AbortController();
  [a, b].forEach(s => {
    if (s.aborted) c.abort(s.reason);
    else s.addEventListener('abort', () => c.abort(s.reason), { once: true });
  });
  return c.signal;
}
```

### 1.2 `frontend/src/api/config/axios.js`

```diff
-const axiosInstance = axios.create({
-  baseURL: process.env.REACT_APP_API_BASE_URL,
-  ...
-});
+// CR-2026-07-03-004 — dual clients so reads and writes can have different caps.
+const apiReadClient = axios.create({
+  baseURL: process.env.REACT_APP_API_BASE_URL,
+  timeout: 8000,
+  ...
+});
+const apiWriteClient = axios.create({
+  baseURL: process.env.REACT_APP_API_BASE_URL,
+  timeout: 15000,
+  ...
+});
+export { apiReadClient, apiWriteClient };
+// Default export stays for backward compat (points at read client).
+export default apiReadClient;
```

### 1.3 `AuthContext.jsx` (4 raw fetches)

```diff
-  const response = await fetch(`${API}/api/auth/login`, {
+  const response = await fetchWithTimeout(`${API}/api/auth/login`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(payload)
-  });
+  }, DEFAULT_WRITE_TIMEOUT_MS);
```

Repeat for `/api/auth/send-otp`, `/api/auth/me`, `/api/auth/check-customer`.

### 1.4 `RestaurantConfigContext.jsx` (3 raw fetches, all reads)

```diff
-  const response = await fetch(`${API_URL}/api/config/${restaurantId}`);
+  const response = await fetchWithTimeout(`${API_URL}/api/config/${restaurantId}`);
```

### 1.5 `useMenuData.js` — React Query default retry

```diff
 const useMenuSections = (restaurantId) => useQuery({
   queryKey: ['menu-sections', restaurantId],
   queryFn: () => getMenuSections(restaurantId),
+  retry: 2,
+  retryDelay: (i) => Math.min(1000 * 2 ** i, 5000),
   staleTime: 10 * 60 * 1000,
 });
```

Or lift to QueryClient defaults in `App.js`:

```diff
-const queryClient = new QueryClient();
+const queryClient = new QueryClient({
+  defaultOptions: {
+    queries: {
+      retry: 2,
+      retryDelay: (i) => Math.min(1000 * 2 ** i, 5000),
+      staleTime: 10 * 60 * 1000,
+    },
+  },
+});
```

Net diff: **~+80 / −20 LOC across 7 files**.

---

## 2. Order-create safety (BLOCKS THE ORDER-CREATE part of this CR)

Before touching order-create timeout, IMPLEMENTATION role MUST:

1. `grep -rn "order.*create\|createOrder\|placeOrder" /app/frontend/src` → identify the call site.
2. Read the corresponding POS endpoint (typically `POST /web/place-order` or similar).
3. Confirm one of:
   - Server rejects duplicate `order_reference_id` (idempotency key), OR
   - Server rejects orders inside 30 s of an identical prior order (dedup window), OR
   - Client uses a unique idempotency key per attempt.

If NONE of the above hold, **DO NOT apply timeout to order-create in this CR**. File a blocker: "Order-create idempotency verification" as a separate P1 CR, and use a 30 s timeout (or NO timeout) for order-create until that lands.

---

## 3. Order of implementation (safest sequence)

1. **Ship the utility** — `fetchWithTimeout.js` as an isolated file, no consumers wired yet. Merge, verify build.
2. **Ship axios read/write split** — no timeout enforcement yet if desired (set both to Infinity). Merge, verify no regression.
3. **Ship AuthContext** — auth is the least catastrophic to timeout (worst case: user re-logs in).
4. **Ship RestaurantConfigContext** — read-only, cache-first fallback protects UX.
5. **Ship useMenuData / React Query defaults** — user-visible if wrong; verify with real users on canary.
6. **DEFER order-create** — separate mini-CR after idempotency confirmed.

Each step is a separate commit; each is independently revertable.

---

## 4. Self-test plan (playwright script — outline only, IMPLEMENTATION writes it)

```python
# Test 1: happy path
await page.goto("/698")
assert (await page.locator("[data-testid='browse-menu-btn']").is_visible())

# Test 2: force a 30 s hang on /api/config via nginx pause
await page.route("**/api/config/**", lambda route: asyncio.sleep(30))
await page.goto("/698")
# assert an error UI appears at ~8s ± 1s

# Test 3: no memory leak on rapid nav
for i in range(20):
    await page.goto(f"/698?nocache={i}")
    await page.goto("/716")
# assert JS heap stable

# Test 4: React Query retry after transient
# ... programmable mock that fails twice, succeeds third
```

---

## 5. Acceptance criteria (from CR §6)

| # | Criterion | Owner-visible |
|---|---|---|
| 1 | Happy paths unchanged (login, /698, /716, admin) | YES |
| 2 | 30 s upstream hang surfaces error UI at 8-9 s (reads) | YES |
| 3 | 30 s upstream hang for writes surfaces at 15-16 s | YES |
| 4 | Order-create either untouched (deferred) OR verified idempotent | YES |
| 5 | Component unmount aborts in-flight fetches | dev-console only |
| 6 | No new eslint errors | CI |
| 7 | Existing e2e tests pass | CI |

---

## 6. Design agent involvement

Recommended: engage design agent for **error UI treatment** on timeout:

- Toast? "We're having trouble reaching the server. Retrying..."
- Blocking overlay? Only for critical flows (auth, order-create).
- Skeleton-with-retry-button? For content pages.

Ask the design agent to sketch the 3 error states (transient, persistent, offline) before wiring components.

---

## 7. Exit gate (§8 Role 3) — items to be completed at IMPLEMENTATION

| Item | Status now |
|---|---|
| Registry updated | ✅ CR.md + this file exist |
| Code markers added | ⏳ IMPL — `CR-2026-07-03-004` in comments |
| Self-test complete | ⏳ IMPL |
| Lint clean | ⏳ IMPL |
| QA handover written | ⏳ IMPL |
| Owner sign-off | ⏳ waiting (owner deferred to next sprint) |
| Design agent input on error UI | ⏳ pending |
| Prerequisite CR-2026-07-03-003 merged | ⏳ pending |

---

## 8. Non-goals

- No new backend surface.
- No change to POS / CRM / storage / maps APIs.
- No new alerting.
- No general error-boundary refactor (out of scope; separate initiative if desired).
- No feature-flag framework rollout (owner decides feature-flag env if wanted).
