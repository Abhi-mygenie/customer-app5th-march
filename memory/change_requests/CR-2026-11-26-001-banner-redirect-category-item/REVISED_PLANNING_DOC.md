# REVISED PLANNING DOC — CR-2026-11-26-001 (Picker Redesign)

**ID:** CR-2026-11-26-001-REDESIGN
**Date:** 2026-11-27
**Role:** Planning (Role 2)
**Source:** design_guidelines.json (CR-2026-11-26-001-REDESIGN)
**Replaces:** E-1a and E-1c from PLANNING_DOC.md (shadcn Popover+Command approach — broken)
**Stage:** Impact Analysis + Implementation Plan

---

## 1. What Was Wrong With The Previous Implementation

| Edit | Problem |
|---|---|
| E-1a | Imported shadcn `Popover`, `PopoverContent`, `PopoverTrigger`, `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` — these bring cmdk defaults that override all admin form styles |
| E-1c | Used `<Popover>` + `<Command>` — renders in document flow, pushes "Add Banner" button off-screen; green active state; group headers indistinct; trigger button has no chevron; overall palette completely mismatches admin |

**E-1b, E-2a, E-2b, E-2c, E-2d** — these are all correct. No change needed.

---

## 2. Code Reality Verified

### AdminBannersPage.jsx — current broken state

| Lines | Content | Action |
|---|---|---|
| 8–9 | `import { Popover ... }` + `import { Command ... }` | REMOVE entirely |
| 4 | `import { IoImagesOutline, ... IoCloudUploadOutline }` | EXTEND — add 4 new icons |
| 1 | `import React, { useState, useRef }` | EXTEND — add `useEffect` |
| 23–43 | `useMenuSections` fetch + `pickerOpen` + `ALL_LINK_OPTIONS` | KEEP — still correct |
| 26 | `const [pickerOpen, setPickerOpen] = useState(false);` | KEEP |
| 44+ | `bannerInputRef`, other state | KEEP |
| 257–309 | Popover+Command JSX | REPLACE with custom dropdown JSX |

### AdminPages.css — current state
No picker CSS exists. All `.admin-picker-*` rules must be appended.

### MenuItems.jsx — E-2a/b/c/d
Confirmed correct. **No changes in this re-plan.**

---

## 3. Impact Analysis

| File | Scope | Risk |
|---|---|---|
| `AdminBannersPage.jsx` | Remove 2 shadcn import lines; extend React+io5 imports; add 3 state vars + 1 useEffect + GROUP_CONFIG; replace picker JSX | LOW — isolated to one form field |
| `AdminPages.css` | Append ~260 lines of new `.admin-picker-*` CSS | LOW — purely additive; no existing rules touched |

**Files WILL NOT change:** MenuItems.jsx, PromoBanner.jsx, useMenuData.js, server.py, all other files.

---

## 4. Implementation Plan — 4 Edits, 2 Files

---

### FILE 1: `AdminBannersPage.jsx`

---

#### Edit R-E-1a — Fix imports (remove shadcn, add icons + useEffect)

**Step 1 — Change line 1:** add `useEffect`
```jsx
// Before:
import React, { useState, useRef } from 'react';
// After:
import React, { useState, useRef, useEffect } from 'react';
```

**Step 2 — Change line 4:** add 4 picker icons to existing io5 import
```jsx
// Before:
import { IoImagesOutline, IoAddOutline, IoCreateOutline, IoTrashOutline, IoCloseOutline, IoCloudUploadOutline } from 'react-icons/io5';
// After:
import { IoImagesOutline, IoAddOutline, IoCreateOutline, IoTrashOutline, IoCloseOutline, IoCloudUploadOutline, IoSearchOutline, IoChevronDownOutline, IoCheckmarkOutline, IoCloseCircleOutline } from 'react-icons/io5';
```

**Step 3 — Remove lines 8–9 entirely** (Popover + Command imports — no replacement):
```jsx
// REMOVE these two lines completely:
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../../components/ui/command';
```

---

#### Edit R-E-1b — Add missing picker state, GROUP_CONFIG, filteredOptions, outside-click handler

**Add after `const ALL_LINK_OPTIONS = [...];` (line ~43):**

```jsx
// CR-2026-11-26-001 R-E-1b: custom picker state + handlers
const [pickerSearch, setPickerSearch] = useState('');
const pickerContainerRef = useRef(null);

const GROUP_CONFIG = [
  { name: 'Static Pages', slug: 'static-pages' },
  { name: 'Categories',   slug: 'categories'   },
  { name: 'Items',        slug: 'items'         },
];

const filteredOptions = pickerSearch.trim()
  ? ALL_LINK_OPTIONS.filter(o =>
      o.label.toLowerCase().includes(pickerSearch.trim().toLowerCase())
    )
  : ALL_LINK_OPTIONS;

// Close on outside click or Escape
useEffect(() => {
  if (!pickerOpen) return;
  const onMouse = (e) => {
    if (pickerContainerRef.current && !pickerContainerRef.current.contains(e.target)) {
      setPickerOpen(false);
      setPickerSearch('');
    }
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { setPickerOpen(false); setPickerSearch(''); }
  };
  document.addEventListener('mousedown', onMouse);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('mousedown', onMouse);
    document.removeEventListener('keydown', onKey);
  };
}, [pickerOpen]);
```

---

#### Edit R-E-1c — Replace Popover+Command JSX with custom dropdown

**Replace the entire block (lines 257–309) — from `{/* CR-2026-11-26-001 E-1c */}` through the closing `</div>`:**

```jsx
{/* CR-2026-11-26-001 R-E-1c: custom grouped searchable picker (design_guidelines.json) */}
<div className="admin-form-group">
  <label className="admin-form-label">Tap Destination (optional)</label>
  <div className="admin-picker-relative-wrap" ref={pickerContainerRef}>

    {/* Trigger button — matches admin-form-select visually */}
    <button
      type="button"
      className={`admin-form-select admin-picker-trigger${pickerOpen ? ' open' : ''}`}
      onClick={() => setPickerOpen(o => !o)}
      aria-expanded={pickerOpen}
      aria-haspopup="listbox"
      data-testid="select-bannerLink"
    >
      <span className="admin-picker-selected-label">
        {ALL_LINK_OPTIONS.find(o => o.value === newBanner.bannerLink)?.label
          || (newBanner.bannerLink ? `Custom: ${newBanner.bannerLink}` : 'No link')}
      </span>
      <IoChevronDownOutline className={`admin-picker-chevron${pickerOpen ? ' rotate' : ''}`} />
    </button>

    {/* Floating dropdown panel — position:absolute, z-60, never reflows form */}
    {pickerOpen && (
      <div className="admin-picker-dropdown" data-testid="admin-picker-dropdown-panel">

        {/* Search bar */}
        <div className="admin-picker-search-bar">
          <IoSearchOutline className="admin-picker-search-icon" />
          <input
            type="text"
            className="admin-picker-search-input"
            placeholder={pickerLoading ? 'Loading…' : 'Search pages, categories, items…'}
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            autoFocus
            data-testid="input-picker-search"
          />
          {pickerSearch && (
            <button
              type="button"
              className="admin-picker-search-clear"
              onClick={() => setPickerSearch('')}
              data-testid="btn-clear-search"
            >
              <IoCloseCircleOutline />
            </button>
          )}
        </div>

        {/* Options list */}
        <div className="admin-picker-list" role="listbox" data-testid="admin-picker-list">
          {pickerLoading ? (
            <div className="admin-picker-loading" data-testid="picker-loading-state">
              <div className="admin-picker-spinner" />
              <span>Loading categories &amp; items…</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="admin-picker-empty" data-testid="picker-empty-state">
              <IoSearchOutline className="admin-picker-empty-icon" />
              <span>No destinations match &quot;{pickerSearch}&quot;</span>
            </div>
          ) : (
            GROUP_CONFIG.map(group => {
              const groupItems = filteredOptions.filter(o => o.group === group.name);
              if (groupItems.length === 0) return null;
              return (
                <div key={group.name} className="admin-picker-group">
                  <div
                    className="admin-picker-group-header"
                    data-testid={`picker-group-header-${group.slug}`}
                  >
                    <span>{group.name}</span>
                    <span className="admin-picker-group-badge">{groupItems.length}</span>
                  </div>
                  {groupItems.map(opt => {
                    const isSelected = newBanner.bannerLink === opt.value;
                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        className={`admin-picker-item${isSelected ? ' selected' : ''}`}
                        onClick={() => {
                          setNewBanner(prev => ({ ...prev, bannerLink: opt.value }));
                          setPickerOpen(false);
                          setPickerSearch('');
                        }}
                        data-testid={`picker-option-${group.slug}`}
                      >
                        <div className="admin-picker-item-content">
                          <span className={`admin-picker-group-dot ${group.slug}`} />
                          <span className="admin-picker-item-label" title={opt.label}>
                            {opt.label}
                          </span>
                        </div>
                        {isSelected && (
                          <IoCheckmarkOutline className="admin-picker-check-icon" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    )}
  </div>

  {/* Path preview hint */}
  {newBanner.bannerLink && (
    <span className="admin-form-hint admin-picker-path-preview" data-testid="banner-link-preview">
      <span>→</span>
      <span className="admin-path-text">{newBanner.bannerLink}</span>
    </span>
  )}
</div>
```

---

### FILE 2: `AdminPages.css`

---

#### Edit CSS-1 — Append picker CSS (from design_guidelines.json css_rules_to_append)

**Append to end of AdminPages.css:**

```css
/* ── Admin Grouped Searchable Destination Picker (CR-2026-11-26-001) ── */
.admin-picker-relative-wrap {
  position: relative;
  width: 100%;
}

.admin-picker-trigger {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  width: 100% !important;
  height: 42px;
  padding: 10px 14px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.admin-picker-trigger:hover { background: #e2e8f0; border-color: #cbd5e1; }

.admin-picker-trigger:focus,
.admin-picker-trigger.open {
  outline: none;
  background: #f8fafc;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.admin-picker-selected-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 8px;
  flex: 1;
}

.admin-picker-chevron {
  font-size: 16px;
  color: #64748b;
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.admin-picker-chevron.rotate {
  transform: rotate(180deg);
  color: #3b82f6;
}

.admin-picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  width: 100%;
  min-width: 240px;
  z-index: 60;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.14), 0 8px 10px -6px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-picker-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.admin-picker-search-icon { font-size: 16px; color: #94a3b8; flex-shrink: 0; }

.admin-picker-search-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #1e293b;
  outline: none;
  font-family: inherit;
}

.admin-picker-search-input::placeholder { color: #94a3b8; }

.admin-picker-search-clear {
  background: none;
  border: none;
  padding: 0;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 16px;
  transition: color 0.15s ease;
}

.admin-picker-search-clear:hover { color: #64748b; }

.admin-picker-list {
  max-height: 220px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 0;
}

.admin-picker-group-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8fafc;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.admin-picker-group-badge {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  background: #e2e8f0;
  padding: 1px 6px;
  border-radius: 9999px;
}

.admin-picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  min-height: 38px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  transition: background 0.15s ease, color 0.15s ease;
}

.admin-picker-item:hover { background: #f1f5f9; color: #0f172a; }

.admin-picker-item.selected {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.admin-picker-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.admin-picker-group-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.admin-picker-group-dot.static-pages { background: #94a3b8; }
.admin-picker-group-dot.categories   { background: #3b82f6; }
.admin-picker-group-dot.items        { background: #f59e0b; }

.admin-picker-item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-picker-check-icon {
  font-size: 16px;
  color: #3b82f6;
  flex-shrink: 0;
  margin-left: 8px;
}

.admin-picker-loading,
.admin-picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.admin-picker-empty { color: #94a3b8; }

.admin-picker-empty-icon { font-size: 24px; opacity: 0.5; }

.admin-picker-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: adminPickerSpin 0.7s linear infinite;
}

@keyframes adminPickerSpin { to { transform: rotate(360deg); } }

.admin-picker-path-preview {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #64748b;
}

.admin-path-text { color: #3b82f6; word-break: break-all; }
```

---

## 5. Verification Matrix

| ID | Check | Expected |
|---|---|---|
| V-01 | Open "Tap Destination" picker | Trigger button matches height/style of "Display On" select. Chevron points down. |
| V-02 | Picker opens | **Floating panel appears above "Add Banner" button — does NOT push it off-screen** |
| V-03 | Type in search | Options filter in real-time. Clear button appears. |
| V-04 | Select a category | Blue `#eff6ff` background + blue checkmark. No green anywhere. |
| V-05 | Select "No link" | Same blue selected state. Path preview hidden. |
| V-06 | Click outside panel | Picker closes. Search cleared. |
| V-07 | Press Escape | Picker closes. |
| V-08 | POS loading | Spinner shown in list area. Only "Static Pages" group usable. |
| V-09 | No search matches | "No destinations match..." empty state. |
| V-10 | Group headers visible | STATIC PAGES / CATEGORIES / ITEMS in uppercase grey with item count badge |
| V-11 | Group colour dots | Grey (Static) / Blue (Categories) / Amber (Items) |
| V-12 | Long item name | Truncated with ellipsis — does not expand row height |
| V-13 | Mobile 390px | Dropdown full-width, 38px tap targets, no horizontal scroll |
| V-14 | Build | `yarn build` 0 errors |

---

## 6. Files WILL change / WILL NOT change

**WILL change (this re-plan):**
- `frontend/src/pages/admin/AdminBannersPage.jsx` — R-E-1a, R-E-1b, R-E-1c
- `frontend/src/pages/admin/AdminPages.css` — CSS-1 (append only)

**WILL NOT change:**
- `frontend/src/pages/MenuItems.jsx` (E-2a–d already correct)
- `frontend/src/components/PromoBanner/PromoBanner.jsx`
- `frontend/src/hooks/useMenuData.js`
- `backend/server.py`

---

```
Planning complete: CR-2026-11-26-001-REDESIGN
Stage: Impact Analysis + Implementation Plan
Code reality: FULL — exact lines to remove/add confirmed
Risk: LOW (isolated to one form field + additive CSS)
Files WILL change: AdminBannersPage.jsx (R-E-1a/b/c), AdminPages.css (CSS-1)
Files WILL NOT touch: MenuItems.jsx, PromoBanner.jsx, server.py
Owner decisions: N/A — design agent provided exact spec
Docs: REVISED_PLANNING_DOC.md
Next: Owner approval → Implementation (Role 3)
```
