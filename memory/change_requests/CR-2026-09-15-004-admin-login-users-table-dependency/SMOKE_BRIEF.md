# Smoke Test Brief — CR-2026-09-15-004

<div class="meta">MyGenie Customer App · Change: "Admin login now goes through POS directly — CRM database no longer read" · QA status: PASS (iteration_17.json) · Tester: ____________ · Date: ____________</div>

## What this is about

When a restaurant admin logs into the app, the app previously looked up their account in CRM's database to verify their password and fetch their restaurant details. This was a boundary violation — your app was reading a database table it does not own. This CR removes that dependency entirely.

## What was wrong

Admin login read directly from CRM's `users` table — twice. Once to verify the password at login, and again on every admin API request to get the restaurant ID. Any change CRM made to that table could silently break admin login with no warning.

## What the change does

Admin login now calls POS directly (the same system CRM itself uses). POS verifies the credentials, returns a session token, and your app fetches the admin's profile from POS to get the restaurant ID and other details. All of this is packed into the login token — subsequent requests read from the token only. CRM's database is never touched.

**Deploy note:** Any admin logged in before this change is deployed will see a "session expired" message on their first page load. They log in once and everything works normally.

> **What must NOT have changed:** admin login form, admin dashboard, config save, table configuration fetch — all work identically.

## Before you start

| You need | Notes |
|---|---|
| Admin email | `owner@kunafamahal.com` |
| Admin password | `Qplazm@10` |
| Restaurant | 689 (Kunafa Mahal) |
| Browser | Fresh tab |

---

## The test — 3 steps (~5 minutes)

### Step 1 — Admin login works

1. Open the app and navigate to the admin login page (e.g. `/689` then tap Login, or go to `/admin/login` directly).
2. Enter `owner@kunafamahal.com` and `Qplazm@10`.
3. Tap **Sign in**.
4. **Expected:** You land on the admin dashboard. Restaurant name "Kunafa Mahal" is visible. No errors.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 2 — Admin can save settings

1. While logged in, go to any settings section (e.g. Branding or Visibility).
2. Make a small change (e.g. toggle a visibility flag on and off).
3. Tap **Save**.
4. **Expected:** Save succeeds. No error message. Setting reflects the change.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

### Step 3 — Wrong password is rejected

1. Log out and try to log in again with the wrong password (e.g. `wrongpassword`).
2. **Expected:** Login fails with an error message. You are not taken to the dashboard.

Result: ☐ PASS ☐ FAIL — notes: ______________________________

---

## Reporting

- All steps match → reply **"Smoke PASS CR-2026-09-15-004"**.
- Anything different → reply **"Smoke FAIL CR-2026-09-15-004 — step N"** with what you saw and a screenshot.

<div class="box"><b>Overall:</b> ☐ PASS &nbsp; ☐ FAIL &nbsp;&nbsp; Signed: ______________________ &nbsp; Date: ____________</div>
