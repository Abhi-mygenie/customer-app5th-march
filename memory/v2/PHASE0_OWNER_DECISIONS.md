# Phase 0 — Owner Decisions Log (planning only)

> Companion to `PROJECT_SECURITY_CONFIG_CONTROL_LAYER_CORRECTION_PLAN.md`
> Date (UTC): 2026-05-30 · Status: **PLANNING ONLY — no code/secret/DB/env changes made**
> Purpose: capture owner answers to the Phase 0 approval gates + supporting facts found via read-only inspection.

## Decisions captured so far

| Gate | Question | Owner answer | Status |
|---|---|---|---|
| G0.1 | Change the leaked passwords? | **YES** | ✅ Approved |
| G0.x | DB ownership / maintenance window | **Owner controls it; it is a PRE-PROD DB; any time is fine** | ✅ De-risks Phase 1 (not live customer prod) |
| G0.4 | Production CORS origins | **"Not sure — find from code/config"** → see findings below | ⏳ Needs owner pick |
| G0.5 | Stop echoing OTP in responses? SMS working? | **YES stop it. SMS "working" but needs proper integration; a "skip SMS" option exists and must be investigated** | ⏳ Confirmed to stop echo; SMS/skip-SMS = Phase 4 investigation |
| G0.3 | Just rotate vs rotate + scrub git history | **Owner asked: "which password?"** → answered below | ⏳ Pending owner pick (a/b) |
| Scope | Switch from planning to implementing Phase 1 now? | **NO — keep planning only** | 🔒 Implementation remains BLOCKED |

---

## Finding A — WHICH passwords are leaked (answer to "which password?")

There are **two** real secrets committed in the repo:

1. **MongoDB database password** — inside the connection string
   `mongodb://mygenie_admin:****@52.66.232.149:27017/mygenie`
   Found in **6 tracked files**, including **`frontend/public/PRD.md`** ⚠️
2. **POS / order-login password** (service account used to place orders), with its phone number
   Found in **~13 tracked files** (incl. all 4 `test_reports/iteration_*.json`).

Both also exist in **git history** (~49 commits across branches). Deleting them from current files does **not** remove them from history — that needs a separate scrub.

**Severity note (NEW, worse than first thought):** the Mongo password sits in `frontend/public/PRD.md`. Anything in `frontend/public/` is **downloadable by anyone who opens the website** (e.g. `https://<app>/PRD.md`) — so this secret may be exposed to the public internet, not just to people with repo access. This raises the urgency of rotation.

**Good news:** the application **code** does not contain literal passwords — `authToken.js` only references the env-var *names* (`REACT_APP_LOGIN_PHONE/PASSWORD`), not the values. The leak is in **docs**, not code.

➡️ "Which password" = **both** (the DB password and the POS login password). The remaining decision is **rotate-only (a)** vs **rotate + scrub git history (b)**.

---

## Finding B — The app's real URLs (for the CORS decision)

From tracked code/docs, the domains fall into two groups:

**Frontend / browser domains (these are what CORS must allow):**
- `https://room-scan-validation.preview.emergentagent.com` — current Emergent preview app URL
- `*.mygenie.online` tenant subdomains — e.g. `18march.mygenie.online`, `hyatt.mygenie.online` (each restaurant gets its own subdomain)
- older previews: `deploy-docs-6.preview.emergentagent.com`, `52f26ce3-…preview.emergentagent.com`

**API targets (NOT CORS origins — the app *calls* these):**
- `https://preprod.mygenie.online/api/v1` — POS/ordering backend
- `https://crm.mygenie.online/api` — CRM (customer/loyalty)
- `https://manage.mygenie.online` — image CDN

**Key design point:** because the app is **multi-tenant with per-restaurant subdomains**, a strict CORS allow-list cannot be a single URL. The correct shape is a **pattern** (FastAPI `allow_origin_regex`) covering `*.mygenie.online` **plus** the active preview domain.

**Authoritative source:** the live value lives in the deployed frontend `.env` (`REACT_APP_BACKEND_URL`) which is **not in the repo**. To confirm exactly, owner can either share the domain shown in the browser when using the live app, or paste the deployed `REACT_APP_BACKEND_URL`.

➡️ Recommended (pending owner): for **pre-prod**, keep permissive but move off raw `*`; for **real prod**, allow `regex: ^https://([a-z0-9-]+\.)?mygenie\.online$` + the active preview URL.

---

## Finding C — OTP / SMS reality (supports G0.5)

- The FastAPI `POST /api/auth/send-otp` (`server.py:408-437`) **does not actually send an SMS** — it generates a code, stores it in memory, and **returns it in the response** (`otp_for_testing`). The code comment literally says *"In production, send OTP via SMS provider (Twilio/MSG91)"* — i.e. SMS sending was never wired into this backend.
- The **real customer OTP/SMS + "skip OTP"** behavior lives in the **external CRM** (the `skipOtp*` config flags + CRM `dev_otp`), not in this FastAPI backend.
- Therefore: removing the echoed OTP from this FastAPI endpoint is **safe** (it's the legacy/secondary path), but **before relying on OTP in production we must investigate** (Phase 4): (a) is real SMS delivery actually live via the CRM, and (b) how the "skip SMS / skip OTP" option should behave.

---

## Net effect on the plan

- Phase 1 risk is **lower** than originally assumed (pre-prod DB, owner-controlled, any-time window).
- Phase 1 urgency is **higher** for the secret leak because of `frontend/public/PRD.md` (potential public exposure).
- Phase 4 must include an **OTP/SMS + skip-SMS investigation** before any production reliance.
- **Still blocked on implementation** per owner ("keep planning only"). Outstanding owner picks: **G0.3** (rotate-only vs rotate+scrub) and **G0.4** (final CORS origins / confirm app domain).
