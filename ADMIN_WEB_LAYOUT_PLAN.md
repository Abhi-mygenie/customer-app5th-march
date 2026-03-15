# Admin (Web) vs Customer (Mobile) Layout Separation Plan

## Overview
Separate the app into two distinct layout experiences:
- **Admin Layout**: Desktop/Web-optimized (sidebar navigation, wide tables, dashboard views)
- **Customer Layout**: Mobile-first (current layout - bottom nav, card-based UI, touch-friendly)

---

## Current Architecture Analysis

### Page Classification

| Page | Type | Current Layout | Target Layout |
|------|------|----------------|---------------|
| `AdminSettings.jsx` | ADMIN | Mobile tabs | Web sidebar + wide panels |
| `Login.jsx` | SHARED | Mobile-first | Responsive (both) |
| `Profile.jsx` | CUSTOMER | Mobile tabs | Keep mobile |
| `LandingPage.jsx` | CUSTOMER | Mobile-first | Keep mobile |
| `DiningMenu.jsx` | CUSTOMER | Mobile cards | Keep mobile |
| `MenuItems.jsx` | CUSTOMER | Mobile list | Keep mobile |
| `ReviewOrder.jsx` | CUSTOMER | Mobile form | Keep mobile |
| `OrderSuccess.jsx` | CUSTOMER | Mobile card | Keep mobile |
| `PasswordSetup.jsx` | CUSTOMER | Mobile form | Keep mobile |
| `AboutUs.jsx` | CUSTOMER | Mobile content | Keep mobile |
| `ContactPage.jsx` | CUSTOMER | Mobile form | Keep mobile |
| `FeedbackPage.jsx` | CUSTOMER | Mobile form | Keep mobile |

### Admin Components (Need Web Redesign)

| Component | Location | Changes Needed |
|-----------|----------|----------------|
| `ContentTab.jsx` | `/components/AdminSettings/` | Wide form layout |
| `VisibilityTab.jsx` | `/components/AdminSettings/` | Grid toggle layout |
| `MenuOrderTab.jsx` | `/components/AdminSettings/` | Drag-drop table view |
| `DietaryTagsAdmin.jsx` | `/components/AdminSettings/` | Data table layout |

---

## Implementation Plan

### PHASE 1: Layout Infrastructure (New Files)

#### Task 1.1: Create AdminLayout Component
**File**: `/app/frontend/src/layouts/AdminLayout.jsx`

**Features**:
- Fixed sidebar navigation (left side, 250px width)
- Top header bar with restaurant name + logout
- Main content area (fluid width)
- Collapsible sidebar for tablets

**Sections in Sidebar**:
1. Settings (logo, welcome, hours)
2. Branding (colors, fonts, style)
3. Visibility (toggles)
4. Banners (CRUD)
5. Content (about, footer, pages)
6. Menu Order (drag-drop)
7. Dietary Tags (table)

---

#### Task 1.2: Create AdminLayout CSS
**File**: `/app/frontend/src/layouts/AdminLayout.css`

**Layout Structure**:
```
+------------------+--------------------------------+
|                  |        Top Header Bar          |
|    Sidebar       +--------------------------------+
|    (250px)       |                                |
|                  |        Main Content            |
|    - Settings    |        (forms, tables)         |
|    - Branding    |                                |
|    - Visibility  |                                |
|    - Banners     |                                |
|    - Content     |                                |
|    - Menu        |                                |
|    - Dietary     |                                |
|                  |                                |
+------------------+--------------------------------+
```

---

#### Task 1.3: Create MobileLayout Component (Wrapper for existing)
**File**: `/app/frontend/src/layouts/MobileLayout.jsx`

**Purpose**: Wrap customer pages to ensure mobile-first styles
- Max-width container (480px)
- Safe area padding
- Bottom navigation space

---

### PHASE 2: Routing Updates

#### Task 2.1: Update App.js Routes
**File**: `/app/frontend/src/App.js`

**Changes**:
```jsx
// BEFORE
<Route path="/admin/settings" element={<AdminSettings />} />

// AFTER
<Route path="/admin/*" element={<AdminLayout />}>
  <Route path="settings" element={<AdminSettingsPage />} />
  <Route path="branding" element={<AdminBrandingPage />} />
  <Route path="visibility" element={<AdminVisibilityPage />} />
  <Route path="banners" element={<AdminBannersPage />} />
  <Route path="content" element={<AdminContentPage />} />
  <Route path="menu" element={<AdminMenuOrderPage />} />
  <Route path="dietary" element={<AdminDietaryPage />} />
</Route>
```

**Customer routes remain unchanged** (already mobile-first)

---

### PHASE 3: Admin Page Refactoring (Page by Page)

#### Task 3.1: AdminSettings.jsx → Split into Separate Pages

**Current State**: Single page with tabs (Settings, Branding, Visibility, Banners, Content, Menu, Dietary)

**Target State**: Each tab becomes a separate route/page

| Current Tab | New Route | New File |
|-------------|-----------|----------|
| Settings | `/admin/settings` | `AdminSettingsPage.jsx` |
| Branding | `/admin/branding` | `AdminBrandingPage.jsx` |
| Visibility | `/admin/visibility` | `AdminVisibilityPage.jsx` |
| Banners | `/admin/banners` | `AdminBannersPage.jsx` |
| Content | `/admin/content` | `AdminContentPage.jsx` |
| Menu | `/admin/menu` | `AdminMenuOrderPage.jsx` |
| Dietary | `/admin/dietary` | `AdminDietaryPage.jsx` |

---

#### Task 3.2: AdminSettingsPage.jsx (Settings Tab)
**File**: `/app/frontend/src/pages/admin/AdminSettingsPage.jsx`

**Current Content** (lines 1176-1305 in AdminSettings.jsx):
- Logo upload
- Welcome Message input
- Tagline input
- Browse Menu Button Text
- Restaurant Operating Hours

**Web Layout Changes**:
- Two-column form layout
- Image preview on right side
- Larger input fields
- Save button fixed at bottom

---

#### Task 3.3: AdminBrandingPage.jsx (Branding Tab)
**File**: `/app/frontend/src/pages/admin/AdminBrandingPage.jsx`

**Current Content** (lines 560-965 in AdminSettings.jsx):
- Background Image upload
- Mobile Background Image upload
- Colors (Primary, Secondary, Button Text, Background, Text, Secondary Text)
- Typography (Heading Font, Body Font)
- Style (Border Radius)
- Contact & Social (Phone, Instagram, Facebook, Twitter, YouTube, WhatsApp)

**Web Layout Changes**:
- Color pickers in a grid (3 columns)
- Live preview panel on right side
- Typography dropdowns side-by-side
- Border radius visual selector (horizontal)
- Social links in 2-column grid

---

#### Task 3.4: AdminVisibilityPage.jsx (Visibility Tab)
**File**: `/app/frontend/src/pages/admin/AdminVisibilityPage.jsx`

**Current Content**: `VisibilityTab.jsx` component

**Sections**:
1. Landing Page Visibility (12 toggles)
2. Menu Page Visibility (3 toggles)
3. Review Order Visibility (10 toggles)
4. Order Status Visibility (2 toggles)

**Web Layout Changes**:
- Grid layout (3-4 toggles per row)
- Section cards with headers
- Toggle switches aligned right
- Descriptions below labels

---

#### Task 3.5: AdminBannersPage.jsx (Banners Tab)
**File**: `/app/frontend/src/pages/admin/AdminBannersPage.jsx`

**Current Content** (lines 968-1152 in AdminSettings.jsx):
- Banner list (image, title, status, actions)
- Add/Edit banner form

**Web Layout Changes**:
- Data table view for banners list
- Columns: Preview | Title | Status | Display On | Order | Actions
- Modal or slide-out panel for add/edit
- Drag-drop reordering
- Bulk actions (delete, enable/disable)

---

#### Task 3.6: AdminContentPage.jsx (Content Tab)
**File**: `/app/frontend/src/pages/admin/AdminContentPage.jsx`

**Current Content**: `ContentTab.jsx` component

**Sections**:
- About Us (rich text editor + image)
- Footer Settings
- Custom Pages

**Web Layout Changes**:
- Rich text editor with toolbar
- Side-by-side preview
- Custom pages in expandable cards
- Drag-drop page ordering

---

#### Task 3.7: AdminMenuOrderPage.jsx (Menu Tab)
**File**: `/app/frontend/src/pages/admin/AdminMenuOrderPage.jsx`

**Current Content**: `MenuOrderTab.jsx` component

**Features**:
- Station ordering (for multi-menu restaurants)
- Category ordering per station
- Item ordering per category
- Visibility toggles

**Web Layout Changes**:
- Three-panel layout: Stations | Categories | Items
- Drag-drop within each panel
- Visibility checkboxes inline
- Search/filter for large menus
- Collapse/expand all

---

#### Task 3.8: AdminDietaryPage.jsx (Dietary Tags Tab)
**File**: `/app/frontend/src/pages/admin/AdminDietaryPage.jsx`

**Current Content**: `DietaryTagsAdmin.jsx` component

**Features**:
- Create/edit dietary tags
- Assign tags to menu items
- Icon/color picker

**Web Layout Changes**:
- Data table for tags list
- Bulk item assignment modal
- Icon grid selector
- Color palette picker

---

### PHASE 4: Shared State Management

#### Task 4.1: Create Admin Config Context
**File**: `/app/frontend/src/context/AdminConfigContext.jsx`

**Purpose**: Share config state across admin pages (avoid re-fetching on each page)

**State**:
```jsx
{
  config: {...},           // All settings
  loading: boolean,
  saving: boolean,
  isDirty: boolean,        // Unsaved changes
  saveConfig: () => void,
  updateField: (field, value) => void,
}
```

---

#### Task 4.2: Create useAdminConfig Hook
**File**: `/app/frontend/src/hooks/useAdminConfig.js`

**Features**:
- Auto-fetch on mount
- Debounced auto-save (optional)
- Dirty state tracking
- Unsaved changes warning

---

### PHASE 5: CSS Updates (Page by Page)

#### Task 5.1: AdminLayout.css
**New styles for**:
- `.admin-layout` - flex container
- `.admin-sidebar` - fixed left sidebar
- `.admin-sidebar-nav` - navigation items
- `.admin-sidebar-item` - nav item styling
- `.admin-sidebar-item.active` - active state
- `.admin-main` - main content area
- `.admin-header` - top header bar
- `.admin-content` - scrollable content

---

#### Task 5.2: AdminSettingsPage.css
**New styles for**:
- `.admin-form-grid` - two-column form layout
- `.admin-form-section` - grouped fields
- `.admin-image-upload` - large upload area
- `.admin-preview-panel` - right-side preview

---

#### Task 5.3: AdminBrandingPage.css
**New styles for**:
- `.color-grid` - 3-column color pickers
- `.typography-row` - side-by-side dropdowns
- `.radius-selector` - horizontal button group
- `.social-grid` - 2-column social inputs

---

#### Task 5.4: AdminVisibilityPage.css
**New styles for**:
- `.visibility-grid` - toggle grid layout
- `.visibility-card` - section card
- `.visibility-toggle-row` - label + switch row

---

#### Task 5.5: AdminBannersPage.css
**New styles for**:
- `.banners-table` - data table
- `.banner-preview-cell` - thumbnail in table
- `.banner-actions` - action buttons
- `.banner-modal` - add/edit modal

---

#### Task 5.6: AdminContentPage.css
**New styles for**:
- `.content-editor` - rich text editor container
- `.content-preview` - live preview panel
- `.custom-page-card` - expandable page card

---

#### Task 5.7: AdminMenuOrderPage.css
**New styles for**:
- `.menu-order-panels` - three-panel layout
- `.menu-order-panel` - individual panel
- `.menu-order-item` - draggable item
- `.menu-order-item.dragging` - drag state

---

#### Task 5.8: AdminDietaryPage.css
**New styles for**:
- `.dietary-table` - data table
- `.dietary-icon-grid` - icon picker grid
- `.dietary-color-palette` - color options

---

### PHASE 6: Component Updates

#### Task 6.1: Update Login.jsx
**Changes**:
- After restaurant login → redirect to `/admin/settings`
- Keep responsive design (works on both)

---

#### Task 6.2: Update Profile.jsx (No changes needed)
- Remains customer-only
- Keeps mobile layout

---

#### Task 6.3: Update HamburgerMenu.jsx
**Changes**:
- Add "Admin Panel" link for restaurant users
- Detect `isRestaurant` from auth context

---

### PHASE 7: Responsive Breakpoints

#### Breakpoints Definition
```css
/* Mobile (Customer) */
@media (max-width: 767px) { }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop (Admin) */
@media (min-width: 1024px) { }
```

#### Admin Layout Responsive Behavior
- **Desktop (≥1024px)**: Full sidebar + content
- **Tablet (768-1023px)**: Collapsible sidebar
- **Mobile (<768px)**: Bottom tabs (current mobile admin)

---

## File Changes Summary

### New Files to Create (14 files)
```
/app/frontend/src/
├── layouts/
│   ├── AdminLayout.jsx
│   ├── AdminLayout.css
│   ├── MobileLayout.jsx
│   └── MobileLayout.css
├── pages/admin/
│   ├── AdminSettingsPage.jsx
│   ├── AdminSettingsPage.css
│   ├── AdminBrandingPage.jsx
│   ├── AdminBrandingPage.css
│   ├── AdminVisibilityPage.jsx
│   ├── AdminVisibilityPage.css
│   ├── AdminBannersPage.jsx
│   ├── AdminBannersPage.css
│   ├── AdminContentPage.jsx
│   ├── AdminContentPage.css
│   ├── AdminMenuOrderPage.jsx
│   ├── AdminMenuOrderPage.css
│   ├── AdminDietaryPage.jsx
│   └── AdminDietaryPage.css
├── context/
│   └── AdminConfigContext.jsx
└── hooks/
    └── useAdminConfig.js
```

### Files to Modify (4 files)
```
/app/frontend/src/
├── App.js                    # Add admin routes
├── pages/Login.jsx           # Update redirect
├── components/HamburgerMenu/ # Add admin link
└── context/AuthContext.jsx   # Ensure isRestaurant check
```

### Files to Keep (No Changes)
```
Customer pages (all remain mobile-first):
- LandingPage.jsx
- DiningMenu.jsx
- MenuItems.jsx
- ReviewOrder.jsx
- OrderSuccess.jsx
- Profile.jsx
- PasswordSetup.jsx
- AboutUs.jsx
- ContactPage.jsx
- FeedbackPage.jsx
```

---

## Implementation Order

### Week 1: Infrastructure
1. ✅ Create AdminLayout.jsx + CSS
2. ✅ Create AdminConfigContext.jsx
3. ✅ Create useAdminConfig.js hook
4. ✅ Update App.js with admin routes

### Week 2: Core Admin Pages
5. ✅ AdminSettingsPage (logo, welcome, hours)
6. ✅ AdminBrandingPage (colors, fonts, images)
7. ✅ AdminVisibilityPage (toggles grid)

### Week 3: Complex Admin Pages
8. ✅ AdminBannersPage (data table + modal)
9. ✅ AdminContentPage (rich text + preview)

### Week 4: Advanced Features
10. ✅ AdminMenuOrderPage (drag-drop panels)
11. ✅ AdminDietaryPage (table + bulk assign)

### Week 5: Polish
12. ✅ Responsive breakpoints
13. ✅ Animations & transitions
14. ✅ Testing & bug fixes

---

## Testing Checklist

### Admin Layout
- [ ] Sidebar navigation works
- [ ] Active state shows correctly
- [ ] Logout button works
- [ ] Restaurant name displays
- [ ] Responsive collapse on tablet

### Each Admin Page
- [ ] Data loads correctly
- [ ] Forms save successfully
- [ ] Validation messages show
- [ ] Loading states work
- [ ] Error handling works

### Customer Pages (Regression)
- [ ] LandingPage still mobile
- [ ] Menu browsing works
- [ ] Cart/ordering works
- [ ] Order success shows
- [ ] Profile page works

---

## Risk Mitigation

1. **Shared State**: Use AdminConfigContext to avoid duplicate API calls
2. **Unsaved Changes**: Warn before navigation if dirty state
3. **Mobile Fallback**: Admin pages still work on mobile (responsive)
4. **Performance**: Lazy load admin pages (React.lazy)
5. **Auth Guard**: Redirect non-restaurant users from /admin/*

---

## Questions to Confirm Before Implementation

1. Should admin pages also work on mobile (responsive) or block mobile access?
2. Do you want auto-save or manual save button?
3. Should we add dark mode support for admin?
4. Do you need any new admin features not currently in tabs?
