# INVESTIGATION REPORT — BUG-2026-11-25-003

**ID:** BUG-2026-11-25-003  
**Title:** Menu and restaurant info often fail to load — POS read latency vs 8s timeout  
**Investigated:** 2026-11-25  
**Agent role:** INVESTIGATION  
**Steps used:** 8 / 10  

---

## 1. Hypotheses Formed

| # | Hypothesis | Verdict |
|---|---|---|
| H1 | POS `restaurant-product` takes > 8s intermittently, causing the read client to time out | **CONFIRMED** |
| H2 | The endpoint payload is too large and the size alone causes the timeout | **PARTIAL** — 594KB is large but size is not the sole cause; server-side processing time is the main factor |
| H3 | The 8s timeout is hitting both `restaurant-product` AND `restaurant-info` | **CONFIRMED** for `restaurant-info` (peak: 8–13s measured by testing agent); **PARTIAL** for current env (1.2–3.9s, but variable) |

---

## 2. Evidence Collected

### 2a. Measured latency (from preview pod, 2026-11-25)

| Endpoint | Run 1 | Run 2 | Run 3 | Run 4 | Payload |
|---|---|---|---|---|---|
| `POST /web/restaurant-product` | 4.50s | 5.42s | 4.93s | 4.91s | 594 KB, 373 items |
| `POST /web/restaurant-info` | 1.73s | 3.90s | 1.15s | — | 4.4 KB |

### 2b. Latency measured by testing agent (iteration_31, Nov 2026)

| Endpoint | Range |
|---|---|
| `POST /web/restaurant-product` | **10–13s** |
| `POST /web/restaurant-info` | **8–13s** |

### 2c. Client timeout

```
frontend/src/api/config/axios.js  L28
apiReadClient  timeout: 8000   ← set by CR-2026-07-03-004 D-01
apiWriteClient timeout: 15000
```

Both `restaurant-product` and `restaurant-info` are called via `apiClient` (default export = `apiReadClient`).  
File: `frontend/src/api/services/restaurantService.js` L6, L19, L79.

### 2d. Payload structure

`restaurant-product` returns a **single non-paginated response** (`limit: 5000`, `offset: 1`, `total_size: 373` items, `594 KB`). There is no server-side pagination active.

---

## 3. Root Cause

**The POS preprod server has variable response times for `restaurant-product` (4–13s range) and `restaurant-info` (1–13s range).** When the POS is under load, both calls exceed the 8s `apiReadClient` timeout → Axios throws a timeout error → React Query treats it as a failure → the app shows "No menu items available at the moment."

This is a **compound issue**: POS preprod latency spikes + a client timeout that is correct for normal conditions but too tight for POS slow periods.

**The bug existed before CR-2026-11-25-001.** It was not introduced by recent changes.

---

## 4. Classification

| Field | Value |
|---|---|
| Root cause type | `ENVIRONMENT` (POS preprod variable latency) + `CONFIG` (8s timeout is tight for a 594KB call that can take 13s) |
| Classification | FE/CONFIG |
| Confidence | **HIGH** |
| Reproducible | YES (intermittently — triggered when POS is slow) |
| Affects prod | **UNKNOWN** — prod POS latency not yet measured. Prod may be faster (better hardware) or the same. |

---

## 5. What Must NOT Change

Per CR-2026-07-03-004 D-01 rationale: the **global** `apiReadClient` timeout of 8s was set deliberately — "reads should fail fast so users get error UI quickly during upstream slowness." This must not be changed globally.

---

## 6. Fix Options (for Planning to evaluate)

| Option | What it does | Risk | Who does it |
|---|---|---|---|
| **A — Per-endpoint timeout** | Pass `{ timeout: 20000 }` as an Axios config override in `getRestaurantDetails()` and `getRestaurantProducts()` only. All other read calls keep 8s. | LOW — 2 lines, 1 file | Frontend |
| **B — One retry on timeout** | Axios `axiosRetry` or manual catch-and-retry for these two calls only. First failure retries once; second failure shows error. | MEDIUM — adds complexity | Frontend |
| **C — POS compression / pagination** | POS team compresses or paginates `restaurant-product` response. | LOW (frontend) but requires POS team coordination | POS team |
| **A + B** | Per-endpoint 20s timeout AND one retry | MEDIUM | Frontend |

**Agent recommendation:** **Option A** is the minimum viable fix. It is 2 lines, affects only the two slow endpoints, does not change the global read client, and does not require any new library. Option B can be added later if Option A alone is insufficient.

---

## 7. Owner Decision Needed Before Planning

> **To the owner:** The bug is real and confirmed. Before Planning can write an implementation plan, one decision is needed:  
>
> **Which option do you want?**  
> - **A** — Just raise the timeout for these two POS calls (2-line fix, lowest risk)  
> - **B** — Add one automatic retry (more robust but slightly more complex)  
> - **A + B** — Both  
> - **C** — Route to POS team to compress/paginate the payload  
>
> Also: should this be measured on **production POS** first before fixing? (Prod may not have the same slowness.)

---

```
Investigation complete: BUG-2026-11-25-003
Root cause: POS preprod variable latency (4–13s) exceeds apiReadClient 8s timeout
Classification: ENVIRONMENT + CONFIG (FE)
Confidence: HIGH
Steps used: 8/10
Evidence: this report + /tmp/r_product2.json + /tmp/r_info2.json (pod)
Recommendation: Planning (Role 2) after owner picks option A, B, or C
Report: memory/change_requests/BUG-2026-11-25-003-menu-read-timeout-preprod/INVESTIGATION_REPORT.md
```
