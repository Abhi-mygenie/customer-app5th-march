# USER_CONFIRMED_RUNTIME_CONTEXT_ADDENDUM

This addendum records user-confirmed runtime context received after the static audit. It does not replace code-evidenced findings; it supplements them.

---

## 1. User-confirmed environment/runtime context

### 1.1 Backend/app proxy URL intent
- User-confirmed understanding:
  - `REACT_APP_BACKEND_URL` is the app/backend proxy URL.
  - Reported/remembered runtime value from previous agent: `https://room-scan-validation.preview.emergentagent.com/`
- Audit interpretation:
  - Own backend calls should be understood as routed through this app/backend proxy base.

### 1.2 CRM version
- User confirmed: `REACT_APP_CRM_API_VERSION = v2`
- Audit interpretation:
  - Current intended CRM deployment path is v2.
  - Static code audit still shows mixed v1/v2 runtime behavior in frontend adapter code:
    - v2 used for auth/profile/address flows where implemented
    - v1 still used for some flows such as orders/points/wallet and forced fallback password-reset paths

### 1.3 `/api/restaurant-info/{id}` intent
- User confirmed:
  - “ideally nothing should be stale”
  - app is a working app
  - user is not sure whether route should exist explicitly
- Audit interpretation:
  - This should no longer be treated as intentionally stale.
  - Best classification is:
    - `MISSING_BACKEND_ROUTE`
    - or `NEEDS_CONSOLIDATION_WITH_EXISTING_RUNTIME_PATH`
  - Static code still proves that this route is referenced by `frontend/src/context/AdminConfigContext.jsx` and not implemented in current backend repo.

### 1.4 Restaurant `716` hardcoding intent
- User confirmed:
  - restaurant `716` hardcoding is temporary
  - phase-2 plan is to refactor and merge
- Audit interpretation:
  - Classify as `TEMPORARY_ACTIVE_BUSINESS_LOGIC`
  - not permanent intended architecture

### 1.5 Call Waiter / Pay Bill
- User confirmed:
  - these are unfinished integrations
- Audit interpretation:
  - current code behavior remains:
    - UI-visible controls may appear depending on config
    - actual integration is incomplete/stubbed

### 1.6 `dietary_tags_mapping` omission in DB README
- User confirmed belief:
  - this likely comes from DB
- Audit interpretation:
  - best classification is `DOCUMENTATION_GAP` / export README incompleteness
  - not evidence of intentional exclusion

---

## 2. User-confirmed custom pages behavior

### 2.1 What custom pages are
From code, custom pages are admin-managed CMS pages with:
- `title`
- `slug`
- `content`
- `published`

Created/managed through:
- `frontend/src/components/AdminSettings/ContentTab.jsx`
- backend routes:
  - `POST /api/config/pages`
  - `PUT /api/config/pages/{page_id}`
  - `DELETE /api/config/pages/{page_id}`

### 2.2 User confirmation
- User confirmed that customers **do see custom pages**.
- User clarified these pages are seen only by **that restaurant’s customers when they land on the restaurant page**.
- User chose classification `A`:
  - customer-facing custom pages are definitely live in runtime,
  - but the route/rendering path is not discoverable in this repo.

### 2.3 Audit interpretation
- Static repo audit did not find a public customer route in `frontend/src/App.js` that clearly renders dynamic custom page slugs.
- With user confirmation, the best classification becomes:
  - `ACTIVE_IN_RUNTIME_BUT_NOT_DISCOVERABLE_IN_THIS_REPO_PATH_TRACE`
- This strongly suggests one of the following:
  1. rendering path exists indirectly in code not obvious from current route map,
  2. rendering is injected/config-driven through another component path,
  3. runtime behavior depends on deployment/build code not visible in inspected route trace.

### 2.4 Updated conclusion for custom pages
- Do **not** classify custom pages as stale.
- Classify them as:
  - `ACTIVE_RUNTIME_BEHAVIOR`
  - with `ROUTE_PATH_NOT_PROVEN_FROM_REPO_CODE`

---

## 3. Updated classification adjustments to prior audit

| Topic | Original audit tendency | Updated classification after user confirmation |
|---|---|---|
| `REACT_APP_CRM_API_VERSION` | `NEEDS_USER_CONFIRMATION` | `CONFIRMED_V2_INTENT` |
| `/api/restaurant-info/{id}` | `MISSING_BACKEND_ROUTE` / possible stale | `MISSING_BACKEND_ROUTE_OR_CONSOLIDATION_GAP`, not intentional stale |
| restaurant `716` hardcoding | active hardcoded logic, intent unknown | `TEMPORARY_ACTIVE_BUSINESS_LOGIC` |
| Call Waiter / Pay Bill | stubbed/incomplete | `UNFINISHED_INTEGRATIONS` |
| `dietary_tags_mapping` omission in README | unclear | `DOCUMENTATION_GAP` |
| custom pages | looked stale/unproven from route map | `ACTIVE IN RUNTIME, BUT ROUTE/RENDER TRACE NOT PROVEN IN THIS REPO` |

---

## 4. Recommended next-agent interpretation
The next agent should proceed with these assumptions unless contradicted by code/runtime evidence:

1. Backend calls should be reasoned through `REACT_APP_BACKEND_URL` app proxy.
2. CRM target intent is v2, but mixed-path adapter debt still exists in code.
3. `/api/restaurant-info/{id}` should be treated as a missing or displaced runtime dependency, not dead code.
4. restaurant `716` logic is temporary and should be targeted in phase-2 cleanup.
5. Call Waiter / Pay Bill are incomplete integrations, not intentionally mocked final behavior.
6. Custom pages are real customer-visible runtime behavior, even though the exact route/render path is not clearly traceable from this repo’s static route map.

---

## 5. Important guardrail
This addendum includes user-confirmed runtime/product knowledge.
Where user confirmation and repo code differ, both should be preserved during future implementation planning:
- **Repo-proven behavior** = source of technical evidence
- **User-confirmed runtime truth** = source of product/runtime intent
