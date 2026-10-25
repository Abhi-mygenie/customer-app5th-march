# INTAKE — CR-2026-10-12-001
## Remove Emergent Branding — Page Title, Meta Description, Favicon

**ID:** CR-2026-10-12-001
**Date registered:** 2026-10-12
**Registered by:** Role 1 — Intake Agent
**Source:** Investigation scan (Role 6) + owner request
**Status:** INTAKE COMPLETE

---

## Classification

| Field | Value |
|---|---|
| Type | CR (Housekeeping / Branding) |
| Severity | P1 — brand-facing: wrong product name shown in browser tab, Google search results, and link previews |
| Risk | LOW — static HTML only, no JS logic |
| Blast radius | SMALL — one file (`public/index.html`), plus optional favicon asset |
| Duplicate check | DISTINCT — no prior CR covers meta/title/favicon |

---

## What this CR does — plain English

The app's HTML shell (`public/index.html`) currently identifies itself as an Emergent product in three places a real user or search engine can see:

1. **Browser tab title:** `Emergent | Fullstack App` — visible on first load before the dynamic title manager kicks in, and on any non-restaurant route
2. **Meta description:** `A product of emergent.sh` — shown in Google search snippets, WhatsApp/Telegram/iMessage link previews, and any OG share card
3. **No favicon** — there is no `<link rel="icon">` in the HTML at all; browsers show a blank/default icon instead of the MyGenie logo

This CR replaces items 1 and 2 with MyGenie-appropriate values, and adds a favicon link (asset to be provided by owner or sourced from the existing MyGenie icon).

---

## Evidence

From investigation scan (Role 6, 2026-10-12):

```html
<!-- public/index.html line 7 -->
<meta name="description" content="A product of emergent.sh" />

<!-- public/index.html line 25 -->
<title>Emergent | Fullstack App</title>

<!-- No favicon link tag exists anywhere in the file -->
```

---

## Scope — files expected to change

| File | Change | Risk |
|---|---|---|
| `public/index.html` | Replace `<title>` and `<meta name="description">`. Add `<link rel="icon">`. | LOW |
| `public/favicon.ico` or `public/favicon.png` | Add favicon asset (MyGenie logo). To be provided by owner or sourced from `ic_login_logo.png` already in assets. | LOW |

**Files NOT in scope:**
- All JS/JSX source files
- `DocumentTitleManager.jsx` — already sets `<title>` correctly dynamically on restaurant routes, no change needed
- Emergent platform scripts (`emergent-main.js`, PostHog) — platform infrastructure, must NOT be removed

---

## What must NOT be changed

- `<script src="https://assets.emergent.sh/scripts/emergent-main.js">` — Emergent platform overlay. Leave untouched.
- PostHog `api_host: "https://ap.emergent.sh"` — analytics. Leave untouched.
- All other tags in `public/index.html` (Razorpay, fonts, etc.)

---

## Owner decisions needed

| Decision | Options |
|---|---|
| Replacement `<title>` value | e.g. `MyGenie` or `MyGenie — Order & Pay` |
| Replacement `<meta description>` value | e.g. `MyGenie — Scan, Order and Pay at your favourite restaurants` |
| Favicon source | Use `public/assets/images/ic_login_logo.png` already in repo, or provide a new file |

---

## Status

```
INTAKE:          COMPLETE
PLANNING:        NOT STARTED
OWNER DECISIONS: Required (see above) before implementation
```
