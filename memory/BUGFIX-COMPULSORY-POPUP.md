# Bugfix — Compulsory / Manual Notification Popup

**Date:** 2026-05-06
**Status:** ✅ Accepted as fixed (pending only confirmation that `autoDismissSeconds = 0` is the intended compulsory signal — see §6).
**Branch:** `7-may` @ `9ab9781`
**File changed (only one):** `frontend/src/components/NotificationPopup/NotificationPopup.jsx`

---

## 1. Issue

Admin-configured **compulsory / manual-acknowledgement** popup (`type: "modal"`, `autoDismissSeconds: 0`) was dismissing on **backdrop click** and via the **corner X button**, allowing customers to bypass the required OK acknowledgement.

Reference popup in production (restaurant 716, Hyatt Centric):

> **Note:** "A discretionary service charge may be added to your bill. This is entirely optional, and if you would prefer it to be removed, please inform our staff."

Per business rule, the user must press **OK** to continue interacting with the menu.

---

## 2. Root cause

`NotificationPopup.jsx`'s modal variant unconditionally wired `onClick={dismiss}` on:
- the `np-modal-overlay` element (backdrop), AND
- the `np-close-btn` (corner X).

There was **no source-distinction** between dismissible and compulsory popups. The component was purpose-built with click-outside-to-close and a corner X — no escape hatch for mandatory mode.

The popup data model already carries `autoDismissSeconds: 0` as the admin-side signal for "manual close with OK button" (admin help text in `AdminSettingsPage.jsx:574` reads: *"0 = manual close with OK button instead of countdown"*). The renderer simply wasn't using it as the compulsory gate.

---

## 3. Fix applied

In `frontend/src/components/NotificationPopup/NotificationPopup.jsx`, the modal variant now treats `autoDismissSeconds === 0` (i.e., `!isAutoClose`) as the compulsory signal and gates both bypass paths.

```diff
@@ Modal variant @@
   if (type === 'modal') {
+    // Compulsory popup: when admin sets Auto-close = 0 ("manual close with OK button"),
+    // the OK button is the only allowed close path. Backdrop click and corner-X
+    // must not bypass the acknowledgement. (isAutoClose true → keeps current behavior.)
+    const isMandatory = !isAutoClose;
     return (
-      <div className="np-modal-overlay" onClick={dismiss} ...>
+      <div
+        className="np-modal-overlay"
+        onClick={isMandatory ? undefined : dismiss}
+        ...
+      >
         <div className="np-modal-card" onClick={e => e.stopPropagation()} ...>
-          <button className="np-close-btn" onClick={dismiss} ...>
-            <X size={18} />
-          </button>
+          {!isMandatory && (
+            <button className="np-close-btn" onClick={dismiss} ...>
+              <X size={18} />
+            </button>
+          )}
```

For mandatory modal popups (`autoDismissSeconds = 0`):
- ✅ Backdrop click is disabled (`onClick={undefined}`).
- ✅ Corner X close button is not rendered.
- ✅ OK button (`np-ack-btn`, already gated on `!isAutoClose` at L89) remains the only dismiss path.

For auto-close modal popups (`autoDismissSeconds > 0`):
- Behavior **unchanged** — backdrop click and X still dismiss. Auto-dismiss timer still runs.

Banner and Toast variants: untouched.

`git diff --stat` → `NotificationPopup.jsx | 18 ++++++++++++++----` (14 ins / 4 del).

---

## 4. Validation accepted

| Layer | Result |
| --- | --- |
| ESLint | ✅ No issues found |
| Existing Jest unit tests (5 tests) | ✅ All passing — no regressions |
| Live browser test on restaurant **716** (the actual production popup) | ✅ All four assertions passed: mode detected as MANUAL-CLOSE → X button correctly hidden → backdrop click did NOT dismiss → OK click cleanly dismissed |

Files NOT changed (confirmed via `git status`):
- Backend (`server.py`) — untouched
- Admin UI (`AdminSettingsPage.jsx`) — untouched
- Schema / Pydantic model — untouched
- Hook (`useNotificationPopup.js`) — untouched
- Banner / Toast variants — untouched
- Cart / payment / scan / order / 716 logic — untouched

Only modified file:

```
$ git status --short
 M frontend/src/components/NotificationPopup/NotificationPopup.jsx
```

---

## 5. Compulsory-signal audit (admin / API / schema)

**Question:** Is `autoDismissSeconds = 0` the intended admin-side signal for compulsory popups, or is there a separate `is_compulsory` / `is_mandatory` / acknowledgement-required flag?

**Audit method:** exhaustive grep across the entire repo (excluding `node_modules`/`.git`) plus inspection of the live API payload for restaurant 716.

### 5.1 Code-side search (no other flag found)

```
$ grep -rniE "is_compuls|isCompuls|is_mandat|isMandat|requireAck|require_ack|
              acknowledg|forceAck|must_ack|mustAck|ackRequired|ack_required"
       --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.py"
       --exclude-dir=node_modules .
```
→ **0 matches** (other than the comment `// must not bypass the acknowledgement` in the fix itself).

### 5.2 Backend Pydantic model (single source of truth for the API)

`backend/server.py:229-230`:
```py
# Notification Popups (FEAT-003)
notificationPopups: Optional[List[dict]] = None
# [{enabled, showOn, delaySeconds, content:{title,message,...}, style:{position,type}}]
```
The comment lists exactly: `enabled, showOn, delaySeconds, content, style` — **no compulsory flag**. The field is typed as a free-form `List[dict]`, so any extra field would pass through transparently if one existed — but none does.

### 5.3 Admin UI fields (in-app `AdminSettingsPage.jsx`)

All popup setters in the admin UI:

| Setter | Field |
| --- | --- |
| `updatePopup` | `showOn`, `enabled`, `delaySeconds`, `autoDismissSeconds` |
| `updateContent` | `title`, `message`, `imageUrl`, `ctaText`, `ctaLink`, `ctaAction` |
| `updateStyle`   | `type`, `position` |

That is the complete set. **No `mandatory` / `compulsory` / `acknowledge` toggle exists** in the in-app admin tool.

The "Auto-close after" input has the explicit help text **"0 = manual close with OK button instead of countdown"** (`AdminSettingsPage.jsx:574`), confirming that the admin-side tool already treats `autoDismissSeconds = 0` as the compulsory/manual mode.

### 5.4 Live API verification (restaurant 716)

```
$ curl https://<backend>/api/config/716  →  notificationPopups
```

```json
[
  {
    "id": "popup-1775935378482",
    "enabled": true,
    "showOn": "menu",
    "delaySeconds": 3,
    "autoDismissSeconds": 0,
    "content": { "title": "Note:", "message": "\"A discretionary service charge ..." },
    "style": { "position": "top", "type": "modal" }
  },
  {
    "id": "popup-1775935643048",
    "enabled": false,
    "showOn": "landing",
    "delaySeconds": 3,
    "autoDismissSeconds": 0,
    "content": { "title": "", "message": "" },
    "style": { "position": "top", "type": "modal" }
  }
]
```

This is the exact production payload for the popup in the bug report. **No compulsory-flag field is present.** The only admin-controllable bit that distinguishes "manual ack required" from "auto-close" is `autoDismissSeconds`.

### 5.5 External admin paths

No reference to popup configuration is made from any of the three external services (`preprod.mygenie.online` POS API, `crm.mygenie.online`, `manage.mygenie.online`) in the frontend or backend code — popups are stored and served entirely by this app's own backend (`/api/config/{rid}`, FastAPI → Mongo). So there is no external system that could be writing a compulsory flag without our knowledge.

### 5.6 Conclusion

**`autoDismissSeconds = 0` is the only admin-side signal that distinguishes compulsory/manual-acknowledgement popups from auto-dismissing ones.** No alternative `is_compulsory` / `is_mandatory` / `requireAck` field exists in:
- the backend Pydantic schema,
- the in-app admin UI,
- the live API response,
- any external system referenced by this codebase.

The fix uses the correct and only available signal.

---

## 6. Pending closure note

If the platform team later introduces a dedicated `mandatory` / `is_compulsory` boolean (for example to allow a popup that requires acknowledgement but also has a fallback auto-close timer for accessibility), the fix should be reverted to read that explicit flag. The change at that point would be a 1-line edit:

```js
const isMandatory = popup.mandatory === true || !isAutoClose;
```

Until then, the current implementation matches admin intent exactly.

---

## 7. Status

**Issue 1 — accepted as fixed.** Pending only the team's confirmation that `autoDismissSeconds = 0` is the intended compulsory signal (see §5 — audit found no alternative). No further code change recommended.
