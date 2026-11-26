# Scan & Order → POS — Image upload contract request (BUG-2026-09-10-001)
**Date:** 2026-10-10
**From:** Scan & Order (Customer App) team
**To:** POS / MyGenie platform team
**Re:** Restaurant logo and image upload — we need to use your S3 infrastructure

---

## Context

Our app currently has its own image upload endpoint (`POST /api/upload/image`) that saves files to local disk on our server pod. Those files are lost every time our pod restarts, breaking the restaurant logo and any uploaded promotional banners.

We have confirmed that POS already uses S3-backed storage for images (served from `manage.mygenie.online`). We want to stop maintaining our own upload path and use yours instead.

---

## Questions — we need answers to all four before we can plan this fix

**Q1 — Upload endpoint**

Do you have an API endpoint we can call to upload an image file and receive back a permanent S3/CDN URL?

If yes, please share:
- HTTP method and path
- Authentication requirement (vendoremployee token, or a different key?)
- Request format (multipart/form-data? JSON with base64?)
- Response format — what does the URL look like?
- Size/type limits

**Q2 — Restaurant logo path**

In `GET /api/v1/vendoremployee/profile`, the restaurant object contains both `logo` and `bill_logo_path`. Restaurant 689 returned `logo: null` but `bill_logo_path: "2025-12-20-6946a5a9cba38.png"`.

- Which field is the customer-facing restaurant logo (the one shown to diners in the app)?
- Is the full URL `https://manage.mygenie.online/<bill_logo_path>`? Or a different base?
- Is `logo` populated for restaurants that have a logo set, or is `bill_logo_path` the correct field to use?

**Q3 — Logo sync**

If the restaurant admin uploads or changes their logo through the POS admin panel, will the updated path appear in the next call to `GET /api/v1/vendoremployee/profile`? We want to read the logo from your API rather than store a separate copy.

**Q4 — Banner / promo images**

For promotional banners (images used in our in-app banner carousel), should these also go through your upload endpoint? Or is there a separate path?

---

Once you answer these, we will:
1. Remove our local disk upload endpoint
2. Update our admin panel to call your upload endpoint and store the returned S3 URL
3. Read the restaurant logo directly from the POS profile response (no separate copy in our database)

Thank you.
