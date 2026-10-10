# POS Platform — Image Upload & Asset Serving Contract Request
## Scan & Order (Customer App) Team → MyGenie POS Platform Team
**Date:** 2026-10-10
**Reference:** BUG-2026-09-10-001 · INV-2026-09-10-001
**Document type:** Contract request — image upload API + restaurant asset paths

---

## Background

The MyGenie Customer App (Scan & Order) currently maintains its own image upload endpoint that writes files to local server storage. This causes two problems:

1. Uploaded files are lost when the server restarts, breaking restaurant logos and promotional banners that diners see.
2. We are maintaining upload infrastructure that duplicates what POS already has — POS already stores and serves images through a CDN (`manage.mygenie.online`), backed by S3 or equivalent object storage.

**Decision:** We will remove our local upload endpoint and use POS infrastructure for all image storage. Restaurant logos and promotional banners uploaded by restaurant admins will go through POS's upload path and be served from your CDN.

---

## What we need from POS

### 1. Image Upload Endpoint

We need to call a POS API endpoint to upload an image file and receive back a permanent CDN URL.

Please confirm or provide:

| Item | Question |
|---|---|
| **Endpoint path** | What is the full path? e.g. `POST /api/v1/upload/image` |
| **Authentication** | Which token does the request require? Vendoremployee token (`Authorization: Bearer <pos_token>`)? Or a different key? |
| **Request format** | Multipart/form-data with a file field? If so, what is the field name? |
| **Response format** | What does the response look like? Does it return a full URL or just a filename/path? |
| **File limits** | Maximum file size and accepted formats (JPEG, PNG, etc.) |
| **Rate limits** | Any rate limits to be aware of? |

**Example of what we expect (for confirmation or correction):**
```
POST /api/v1/upload/image
Authorization: Bearer <vendoremployee_pos_token>
Content-Type: multipart/form-data
Body: file=<image_binary>

Response:
{
  "url": "https://manage.mygenie.online/2026-10-10-abc123.png"
}
```

---

### 2. Restaurant Logo Field

When we call `GET /api/v1/vendoremployee/profile`, the restaurant object contains at least two image fields:

```json
"restaurants": [
  {
    "id": 689,
    "name": "Kunafa Mahal",
    "logo": null,
    "bill_logo_path": "2025-12-20-6946a5a9cba38.png",
    ...
  }
]
```

We need to understand:

| Item | Question |
|---|---|
| **Customer-facing logo** | Which field (`logo` or `bill_logo_path`) is the restaurant's customer-facing logo — the one shown to diners in the app? |
| **Full URL construction** | Is the full URL `https://manage.mygenie.online/<field_value>`? Or is there a different base URL or path prefix? |
| **Why `logo` is null** | For restaurant 689, `logo` is null but `bill_logo_path` is set. Is `bill_logo_path` the correct field to use for the customer app logo, or is `logo` expected to be populated separately? |
| **Null handling** | If both fields are null, does the restaurant have no logo set, or does it fall back to a default? |

---

### 3. Logo Synchronisation

We want to read the restaurant logo directly from the POS profile API rather than storing a separate copy in our database. This means:

- When an admin sets or changes their restaurant logo via the POS admin panel, the updated value should be visible in the next call to `GET /api/v1/vendoremployee/profile`.

**Please confirm:** Is this the case? If the logo is updated in POS, does `GET /vendoremployee/profile` return the new value immediately (or within a short cache window)?

---

### 4. Promotional Banner Images

Our app supports promotional banners — full-width images shown to diners while browsing the menu. Admins upload these from our admin panel.

**Questions:**
- Should banner images also go through the same upload endpoint as logos?
- Or is there a separate POS path/mechanism for promotional banner images?
- Do you store any banner data per-restaurant that we should be reading from instead?

---

## What we will do once you answer

| Step | Action |
|---|---|
| 1 | Remove our local disk upload endpoint (`POST /api/upload/image`) |
| 2 | Update our admin panel to call your upload endpoint; store the returned CDN URL |
| 3 | Update `GET /api/config/{rid}` to populate `logoUrl` from the POS profile field rather than our own database |
| 4 | No change to menu item images — those already come from `manage.mygenie.online` correctly |

---

## Proposed reply format

Please reply with:

```
Q1 — Upload endpoint:
  Path: <path>
  Auth: <token type>
  Request: <format>
  Response: <sample>
  Limits: <size, types>

Q2 — Logo field:
  Customer-facing field: <logo / bill_logo_path / other>
  Full URL: https://manage.mygenie.online/<field_value>  — confirm or correct
  logo null for r689: <explanation>

Q3 — Logo sync:
  Profile reflects updates: <yes / within N minutes / no>

Q4 — Banners:
  Same upload endpoint: <yes / no, use <other>>
  POS stores banner data: <yes, read from <field> / no>
```

---

*Filed by: Scan & Order engineering team*
*Tracked as: BUG-2026-09-10-001 · inbox/OUTBOUND_TO_POS_IMAGE_UPLOAD_CONTRACT_REQUEST_2026_10_10.md*
