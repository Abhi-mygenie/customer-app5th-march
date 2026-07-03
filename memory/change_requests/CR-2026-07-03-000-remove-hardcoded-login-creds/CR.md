# CR-001 — Remove Hardcoded Login Credentials from Frontend Bundle

**Status:** OPEN
**Priority:** HIGH (Security)
**Raised:** 2026-01
**Raised by:** E1 (Emergent) during env setup on branch `3-july`
**Owner:** TBD

---

## 1. Background

The customer-app frontend (`/app/frontend/.env`) currently reads two variables that are **injected into the client JS bundle at build time**:

```
REACT_APP_LOGIN_PHONE=+919579504871
REACT_APP_LOGIN_PASSWORD=Qplazm@10
```

Any variable prefixed with `REACT_APP_` in a Create-React-App / CRACO project is **substituted into the shipped `main.js` at build time**. Anyone who loads the site can open DevTools → Sources (or run `curl` on the static bundle) and read both values in plaintext.

Documented in `/app/DEPLOYMENT_HANDOVER.md` §5.2 (line 142):
> `REACT_APP_LOGIN_PHONE` / `REACT_APP_LOGIN_PASSWORD` are **hardcoded test credentials in the frontend bundle** — will be visible in shipped JS. Confirm with product/security whether this is intentional for pre-prod only. Remove for production.

## 2. Risk

| # | Risk | Severity |
|---|---|---|
| R1 | Anyone browsing the site can extract a valid login phone + password, then authenticate as that user against `preprod.mygenie.online` (and any env that shares the credential). | HIGH |
| R2 | Credential is committed in `.env` conventions across branches → risk of leaking to public forks/mirrors. | MEDIUM |
| R3 | Even if the phone number is only a "demo" account, it may still have read/write access to real UAT/prod data (orders, points, addresses). | MEDIUM |
| R4 | Bundle-embedded creds cannot be rotated without a full frontend rebuild + redeploy. | LOW-MED |

## 3. Proposed Change

### 3.1 Short term (must land before any public/prod deployment)
- [ ] Remove `REACT_APP_LOGIN_PHONE` and `REACT_APP_LOGIN_PASSWORD` from `frontend/.env` (already replaced with `<PLACEHOLDER>` in this branch).
- [ ] Grep the frontend source (`grep -r REACT_APP_LOGIN_ /app/frontend/src`) and refactor every call site to obtain credentials via one of:
  - (a) **User input** — normal login form (preferred).
  - (b) **Backend proxy** — if truly a system-to-system call, move the credential to `/app/backend/.env` and expose only a backend endpoint that uses it.
  - (c) **OTP/JWT flow** — the app already has `/api/auth/send-otp` + `/api/auth/login`; use it.
- [ ] Delete any hardcoded auto-login logic that was using these envs.
- [ ] Rotate `+919579504871` / `Qplazm@10` in the MyGenie CRM (assume it is already leaked).

### 3.2 Longer term
- [ ] Add a lint rule / CI check that fails the build if `REACT_APP_LOGIN_` or `REACT_APP_*_PASSWORD` / `REACT_APP_*_SECRET` / `REACT_APP_*_TOKEN` is present in `.env`.
- [ ] Update `DEPLOYMENT_HANDOVER.md` §5.2 to remove the leaked values from the doc as well.
- [ ] Audit git history for any commits that contained the credential and consider a `git filter-repo` scrub if the repo is (or ever will be) public.

## 4. Impact / Test Plan

- **Files likely affected** (to be confirmed via grep): any component that calls the login endpoint using `process.env.REACT_APP_LOGIN_PHONE` / `process.env.REACT_APP_LOGIN_PASSWORD`. Candidates from the app: `src/App.js`, `src/pages/Login*.jsx`, `src/lib/api*.js`.
- **Regression tests:**
  - [ ] Normal customer login (OTP → verify → JWT) still works.
  - [ ] Customer profile / orders / points endpoints still resolve.
  - [ ] `preprod.mygenie.online` integration still works without the bundled credential.

## 5. Acceptance Criteria

1. `grep -r "REACT_APP_LOGIN_" /app/frontend/src` returns **zero** matches.
2. `frontend/.env` has no `REACT_APP_*_PASSWORD` or `REACT_APP_*_PHONE` keys used for auth.
3. Loading the built bundle and searching for the old phone number (`9579504871`) returns nothing.
4. All existing customer flows pass QA regression.
5. Leaked credential rotated in the upstream identity system.

## 6. References

- `DEPLOYMENT_HANDOVER.md` §5.2 line 142 (in-repo)
- `/app/frontend/.env` (this branch — placeholder version)
- CRA env-var docs: https://create-react-app.dev/docs/adding-custom-environment-variables/
