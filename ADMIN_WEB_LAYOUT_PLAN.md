# Admin Web Layout Plan (Simplified)

## Scope
- **Admin Panel**: Redesign for Web/Desktop (sidebar navigation, wide layouts)
- **Customer Pages**: NO CHANGES (stays mobile as-is)

---

## Current vs Target

### AdminSettings.jsx (ONLY file being redesigned)

**CURRENT (Mobile):**
```
+---------------------------+
|  Header (App Settings)    |
+---------------------------+
|  Restaurant Card          |
+---------------------------+
|  Tabs (horizontal scroll) |
|  [Settings][Branding]...  |
+---------------------------+
|                           |
|  Tab Content              |
|  (single column forms)    |
|                           |
+---------------------------+
|  [Save Button]            |
+---------------------------+
```

**TARGET (Web):**
```
+------------+----------------------------------+
|            |  Header: Restaurant Name | Logout|
|  Sidebar   +----------------------------------+
|            |                                  |
| • Settings |  Page Title                      |
| • Branding |  --------------------------------|
| • Visibility|                                 |
| • Banners  |  Content Area                    |
| • Content  |  (wide forms, grids, tables)     |
| • Menu     |                                  |
| • Dietary  |                                  |
|            |  --------------------------------|
|            |  [Save Button]                   |
+------------+----------------------------------+
```

---

## Files to Create (3 files)

### 1. `/app/frontend/src/layouts/AdminLayout.jsx`
Web layout with:
- Fixed sidebar (250px) with navigation links
- Top header bar (restaurant name + logout)
- Main content area (renders child routes)

### 2. `/app/frontend/src/layouts/AdminLayout.css`
Styles for:
- Sidebar navigation
- Active state highlighting
- Header bar
- Content area spacing

### 3. `/app/frontend/src/context/AdminConfigContext.jsx`
Shared state for:
- Config data (fetched once, used across pages)
- Save function
- Loading/saving states

---

## Files to Modify (2 files)

### 1. `/app/frontend/src/App.js`
**Change:**
```jsx
// BEFORE
<Route path="/admin/settings" element={<AdminSettings />} />

// AFTER
<Route path="/admin/*" element={<AdminLayout />}>
  <Route index element={<Navigate to="settings" />} />
  <Route path="settings" element={<AdminSettingsContent />} />
  <Route path="branding" element={<AdminBrandingContent />} />
  <Route path="visibility" element={<AdminVisibilityContent />} />
  <Route path="banners" element={<AdminBannersContent />} />
  <Route path="content" element={<AdminContentContent />} />
  <Route path="menu" element={<AdminMenuContent />} />
  <Route path="dietary" element={<AdminDietaryContent />} />
</Route>
```

### 2. `/app/frontend/src/pages/AdminSettings.jsx`
**Change:**
- Remove mobile header, tabs, and mobile-specific layout
- Split into 7 content components (one per tab)
- Each component uses wide web-friendly layout

---

## Admin Pages Breakdown (from existing tabs)

| Tab Name | New Route | Content |
|----------|-----------|---------|
| Settings | `/admin/settings` | Logo, Welcome Message, Tagline, Button Text, Hours |
| Branding | `/admin/branding` | Colors, Fonts, Border Radius, Background Images, Social Links |
| Visibility | `/admin/visibility` | All toggle switches (Landing, Menu, Order, Status) |
| Banners | `/admin/banners` | Banner list table, Add/Edit form |
| Content | `/admin/content` | About Us, Footer, Custom Pages |
| Menu | `/admin/menu` | Station/Category/Item ordering, Visibility |
| Dietary | `/admin/dietary` | Dietary tags management |

---

## Web Layout Improvements per Page

### Settings Page
- Two-column form layout
- Logo preview on right side
- Larger input fields

### Branding Page
- Color pickers in 3-column grid
- Font dropdowns side-by-side
- Background image previews larger
- Social links in 2-column grid

### Visibility Page
- Toggle switches in 3-4 column grid
- Grouped by section (Landing, Menu, Order, Status)
- Section cards with headers

### Banners Page
- Data table view (columns: Preview, Title, Status, Display On, Actions)
- Add/Edit in modal or side panel
- Drag-drop reordering

### Content Page
- Wider text areas
- Side-by-side preview for About Us
- Custom pages in expandable cards

### Menu Page
- Three-panel layout: Stations | Categories | Items
- Drag-drop within panels
- Inline visibility toggles

### Dietary Page
- Data table for tags
- Inline editing
- Icon/color pickers

---

## Implementation Steps

### Step 1: Create AdminLayout
- Sidebar with navigation
- Header with restaurant info
- Outlet for child routes

### Step 2: Create AdminConfigContext
- Fetch config once
- Share across all admin pages
- Handle save

### Step 3: Update App.js
- Add nested admin routes
- Wrap with AdminLayout

### Step 4: Split AdminSettings into Components
- Extract each tab's content into separate component
- Apply web-friendly layouts

### Step 5: Update CSS
- Wide form layouts
- Grid layouts for toggles
- Table layouts for lists

---

## Files NOT Being Changed

| File | Reason |
|------|--------|
| `LandingPage.jsx` | Customer page - stays mobile |
| `DiningMenu.jsx` | Customer page - stays mobile |
| `MenuItems.jsx` | Customer page - stays mobile |
| `ReviewOrder.jsx` | Customer page - stays mobile |
| `OrderSuccess.jsx` | Customer page - stays mobile |
| `Profile.jsx` | Customer page - stays mobile |
| `Login.jsx` | Shared page - already responsive |
| `PasswordSetup.jsx` | Customer page - stays mobile |
| `AboutUs.jsx` | Customer page - stays mobile |
| `ContactPage.jsx` | Customer page - stays mobile |
| `FeedbackPage.jsx` | Customer page - stays mobile |
| All customer components | No changes needed |

---

## Summary

| Action | Count |
|--------|-------|
| New files to create | 3 |
| Files to modify | 2 |
| Customer files changed | 0 |

This keeps the scope minimal and focused only on making Admin web-friendly.
