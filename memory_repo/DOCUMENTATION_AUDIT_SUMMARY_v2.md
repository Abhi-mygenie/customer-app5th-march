# Document Audit Status
- Source File: DOCUMENTATION_AUDIT_SUMMARY.md
- Reviewed By: Senior Architecture Agent
- Review Type: Code-verified documentation refresh
- Status: Completed
- Confidence: High
- Last Reviewed Areas: repository root, memory/*.md, frontend/src/App.js, frontend/src/context/*, frontend/src/api/services/*, frontend/src/pages/*, frontend/src/components/*, backend/server.py, build and supervisor logs, /app/repo/v2/*.md
- Notes: Finalized the `/v2` documentation baseline after multi-pass review. Old docs were intentionally kept in `memory/` per user confirmation and are recommended for later archival rather than immediate removal.

# Documentation Audit Summary

## Final Outcome
A refreshed, code-verified documentation baseline has been created in:
- `/app/repo/v2`

This `/v2` set should now be treated as the **working documentation baseline** for engineering review, onboarding, and future AI-agent use.

## Old Documentation Handling Decision
Per user confirmation:
- old `memory/*.md` documents were **kept as-is**
- no archival or deletion was performed

### Recommendation
Do **not** delete old docs immediately.
Recommended next step is:
1. use `/v2` as the active baseline
2. review internally
3. archive old `memory/` docs later once stakeholders agree

---

## Audit Scope
### Source set actually found
- `/app/repo/memory/*.md`

### Expected but not found
- `docs/source/`
- `/app/memory/*.md` outside the cloned repo

This mismatch remains one of the key documentation/process inconsistencies discovered during the audit.

---

## Build / Run Verification
### Repo clone
- Repository: `https://github.com/Abhi-mygenie/customer-app5th-march.git`
- Branch: `main`
- Clone location: `/app/repo`

### Frontend build
- `yarn install --ignore-engines` completed
- `CI=false yarn build` completed successfully
- build produced warnings but no blocking failures

### Backend dependency install
- `python3 -m pip install -r requirements.txt` completed successfully

### Runtime verification
Supervisor-managed services were restarted and verified running:
- backend
- frontend
- mongodb
- nginx-code-proxy
- code-server

### Important constraint
This was an **audit-only** effort.
- no production code fixes were applied
- no deep test agent was used

---

## Documents Reviewed in `/v2`
| Document | Final Status |
|---|---|
| API_MAPPING.md | Partially Verified |
| ARCHITECTURE.md | Partially Verified |
| AUDIT_V1.md | Partially Verified |
| BUG040_TEST_CASES.md | Outdated Rewritten |
| BUG_TRACKER.md | Partially Verified |
| CODE_AUDIT.md | Partially Verified |
| CUSTOMER_ENDPOINTS.md | Partially Verified |
| DEFAULTS_FALLBACKS_AUDIT.md | Partially Verified |
| FEAT-001-ADMIN-payment-settings.md | Partially Verified |
| FEAT-001-dual-payment-options.md | Partially Verified |
| FEAT-002-DELIVERY-SPEC.md | Outdated Rewritten |
| FEAT-002-PREP-hardcoding-removal.md | Partially Verified |
| FEAT-002-takeaway-delivery.md | Partially Verified |
| FEAT-003-NOTIFICATION-POPUP.md | Partially Verified |
| FEATURE_SPEC_TEMPLATE.md | Verified |
| MANUAL_TEST_CASES.md | Outdated Rewritten |
| PLAN-CRM-AUTH-MIGRATION-v2.md | Partially Verified |
| PLAN-CRM-AUTH-MIGRATION.md | Outdated Rewritten |
| PRD.md | Outdated Rewritten |
| ROADMAP.md | Outdated Rewritten |
| SCAN_AND_ORDER_API.md | Outdated Rewritten |
| SUMMARY.md | Outdated Rewritten |
| TEST_CASES.md | Outdated Rewritten |

---

## Documents Fully Verified
- `FEATURE_SPEC_TEMPLATE.md`

## Documents Partially Verified
- `API_MAPPING.md`
- `ARCHITECTURE.md`
- `AUDIT_V1.md`
- `BUG_TRACKER.md`
- `CODE_AUDIT.md`
- `CUSTOMER_ENDPOINTS.md`
- `DEFAULTS_FALLBACKS_AUDIT.md`
- `FEAT-001-ADMIN-payment-settings.md`
- `FEAT-001-dual-payment-options.md`
- `FEAT-002-PREP-hardcoding-removal.md`
- `FEAT-002-takeaway-delivery.md`
- `FEAT-003-NOTIFICATION-POPUP.md`
- `PLAN-CRM-AUTH-MIGRATION-v2.md`

## Documents Rewritten Because Prior Versions Were Outdated / Unsafe as Current Guidance
- `PRD.md`
- `ROADMAP.md`
- `SUMMARY.md`
- `SCAN_AND_ORDER_API.md`
- `MANUAL_TEST_CASES.md`
- `TEST_CASES.md`
- `PLAN-CRM-AUTH-MIGRATION.md`
- `FEAT-002-DELIVERY-SPEC.md`
- `BUG040_TEST_CASES.md`

## Documents Needing Backend / Product Clarification
- `API_MAPPING.md`
- `ARCHITECTURE.md`
- `CUSTOMER_ENDPOINTS.md`
- `FEAT-002-DELIVERY-SPEC.md`
- `PLAN-CRM-AUTH-MIGRATION.md`
- `PLAN-CRM-AUTH-MIGRATION-v2.md`
- `SCAN_AND_ORDER_API.md`
- `FEAT-001-dual-payment-options.md`
- `DEFAULTS_FALLBACKS_AUDIT.md`

---

## Cross-Document Inconsistencies Found
1. **Source folder mismatch**
   - task referenced `docs/source`
   - repo uses `memory/`

2. **Customer auth ownership mismatch**
   - older docs centered our backend
   - current code is hybrid across backend + CRM + POS

3. **Order-details routing ambiguity**
   - some docs implied backend proxy only
   - current code suggests env-dependent direct/proxy possibilities

4. **Table-status contract mismatch**
   - older docs described `is_available`
   - current client code expects nested `status.table_status` and `status.order_id`

5. **Delivery maturity mismatch**
   - older docs often treated delivery as planning-only
   - current code includes a real delivery-address flow and order integration

6. **Autopaid routing mismatch**
   - older docs generalized multi-menu behavior
   - current code special-cases restaurant `716`

7. **Environment documentation mismatch**
   - prompt/env docs omitted `DB_NAME`
   - backend code requires `DB_NAME`

8. **Historical-vs-current confusion in memory docs**
   - many memory docs mixed completed work, plans, historical bug logs, and current guidance without clear separation

---

## Top Architectural Risks for CTO Review
1. **Hybrid auth model complexity**
   - backend JWT + CRM token + POS ordering token coexist

2. **Overlapping domain ownership**
   - customer-related capabilities span backend, CRM, and POS

3. **Large orchestration-heavy pages**
   - `LandingPage.jsx`
   - `ReviewOrder.jsx`
   - `OrderSuccess.jsx`

4. **External contract dependence**
   - key user flows depend on POS, CRM, Google Maps, and distance API behavior

5. **Runtime routing ambiguity**
   - some endpoints appear reachable directly and via backend proxy depending on environment configuration

6. **Documentation drift risk**
   - without governance, `memory/` and `/v2` can diverge again quickly

---

## Recommended Next 10 Actions
1. Declare `/app/repo/v2` the active documentation baseline.
2. Add a short `README` or `DOCS_INDEX.md` pointing engineers to `/v2/SUMMARY.md` and `/v2/DOCUMENTATION_AUDIT_SUMMARY.md`.
3. Standardize one official documentation source folder going forward.
4. Create a dedicated current-state auth architecture document.
5. Confirm runtime ownership and usage of `REACT_APP_BACKEND_URL`, `REACT_APP_API_BASE_URL`, `REACT_APP_CRM_URL`, and backend `DB_NAME`.
6. Capture live POS/CRM contract samples for table status, order details, address, and delivery charge flows.
7. Decide whether backend customer endpoints are strategic, transitional, or legacy.
8. Replace restaurant-id hardcoded behavior like `716` with config/capability flags.
9. Refactor the highest-risk orchestration pages beginning with `ReviewOrder.jsx`.
10. After stakeholder review, archive old `memory/` docs instead of deleting them immediately.

---

## Recommended Reading Order for New Engineers
1. `SUMMARY.md`
2. `DOCUMENTATION_AUDIT_SUMMARY.md`
3. `PRD.md`
4. `ARCHITECTURE.md`
5. `API_MAPPING.md`
6. `SCAN_AND_ORDER_API.md`
7. `CUSTOMER_ENDPOINTS.md`
8. `CODE_AUDIT.md`
9. `BUG_TRACKER.md`
10. relevant `FEAT-*` docs by domain

---

## Final Recommendation on Old Docs
### Do I suggest removing old docs now?
**No.**

### Current recommendation
- keep old docs for traceability
- use `/v2` as the active baseline
- archive old docs only after internal review and sign-off

This is the safest path because the old docs still contain historical context, but should no longer be treated as current engineering guidance.

---

## Files Present in `/v2`
- `/app/repo/v2/API_MAPPING.md`
- `/app/repo/v2/ARCHITECTURE.md`
- `/app/repo/v2/AUDIT_V1.md`
- `/app/repo/v2/BUG040_TEST_CASES.md`
- `/app/repo/v2/BUG_TRACKER.md`
- `/app/repo/v2/CODE_AUDIT.md`
- `/app/repo/v2/CUSTOMER_ENDPOINTS.md`
- `/app/repo/v2/DEFAULTS_FALLBACKS_AUDIT.md`
- `/app/repo/v2/DOCUMENTATION_AUDIT_SUMMARY.md`
- `/app/repo/v2/FEAT-001-ADMIN-payment-settings.md`
- `/app/repo/v2/FEAT-001-dual-payment-options.md`
- `/app/repo/v2/FEAT-002-DELIVERY-SPEC.md`
- `/app/repo/v2/FEAT-002-PREP-hardcoding-removal.md`
- `/app/repo/v2/FEAT-002-takeaway-delivery.md`
- `/app/repo/v2/FEAT-003-NOTIFICATION-POPUP.md`
- `/app/repo/v2/FEATURE_SPEC_TEMPLATE.md`
- `/app/repo/v2/MANUAL_TEST_CASES.md`
- `/app/repo/v2/PLAN-CRM-AUTH-MIGRATION-v2.md`
- `/app/repo/v2/PLAN-CRM-AUTH-MIGRATION.md`
- `/app/repo/v2/PRD.md`
- `/app/repo/v2/ROADMAP.md`
- `/app/repo/v2/SCAN_AND_ORDER_API.md`
- `/app/repo/v2/SUMMARY.md`
- `/app/repo/v2/TEST_CASES.md`
