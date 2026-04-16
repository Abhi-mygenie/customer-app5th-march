# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git (branch 14-april-v2), ensure all memory docs are present, build and run the app as-is. Then implement features and fixes.

## Architecture
- **Frontend**: React 19 with Craco, Tailwind CSS, Radix UI, React Router v7
- **Backend**: FastAPI with Motor (async MongoDB), JWT auth
- **Database**: Remote MongoDB at 52.66.232.149 (mygenie database)
- **External APIs**: preprod.mygenie.online, crm.mygenie.online, manage.mygenie.online

## User Personas
- **Customer**: Scans QR / visits restaurant URL, browses menu, orders food. Per-restaurant scoped.
- **Restaurant Admin**: Manages menu, config, branding via /admin

## Core Requirements
- Multi-restaurant support (each URL /{restaurantId})
- Customer auth via CRM (per-restaurant scoped)
- Order modes: Dine-in, Takeaway, Delivery
- Delivery address management with Google Maps
- Loyalty points, wallet, coupons per restaurant

---

## What's Been Implemented

### Session 1 — Jan 14, 2026
- Cloned repo from GitHub (branch 14-april-v2)
- Configured all environment variables (frontend + backend)
- All 25 memory documents confirmed present
- Both services running

### Session 2 — Jan 14, 2026 (Feature Work)

#### Issue 3 FIX: crmFetch Content-Type header bug
- **File**: `/app/frontend/src/api/services/crmService.js`
- **Bug**: `...options` spread in `crmFetch` was overwriting the merged `headers` object, dropping `Content-Type: application/json` for all authenticated POST requests
- **Fix**: Destructure `headers` from options before spreading: `const { headers: optionHeaders, ...restOptions } = options`
- **Impact**: Fixed address save failures ("model_attributes_type" Pydantic error from CRM)

#### Issue 2 FIX: Google Places API deprecation warnings
- **File**: `/app/frontend/src/pages/DeliveryAddress.jsx`
- **Migration**: Legacy `AutocompleteService` + `PlacesService` → New `AutocompleteSuggestion.fetchAutocompleteSuggestions()` + `Place.fetchFields()`
- **Changes**: Promise-based API, new field names (mainText.text, longText), session token for billing
- **Impact**: Eliminates two console deprecation warnings

#### Issue 1 FIX: Contact name/phone auto-population
- **File**: `/app/frontend/src/pages/DeliveryAddress.jsx`
- **Change**: `resetForm()` pre-fills `contact_person_name` from `user.name` and `contact_person_number` from `user.phone`
- **Impact**: User doesn't have to manually enter contact details when adding address

#### Google Places Autocomplete (New Feature)
- **File**: `/app/frontend/src/pages/DeliveryAddress.jsx`, `DeliveryAddress.css`
- **Feature**: Search area/locality with Google Places API auto-suggestions
- **Auto-populates**: address, city, pincode, lat/lng. Map pin moves, distance check fires.
- **New field order**: Type → Search → Address → City/Pincode → House/Floor → Road → Contact → Instructions

#### Restaurant-Scoped Auth (Major Fix)
- **Files**: `AuthContext.jsx`, `LandingPage.jsx`, `PasswordSetup.jsx`, `DeliveryAddress.jsx`, `ReviewOrder.jsx`
- **Problem**: AuthContext was restaurant-unaware. CRM token for restaurant 509 stayed active on restaurant 675, causing wrong data, hidden fields, data corruption.
- **Fix**: Per-restaurant token storage (`crm_token_{restaurantId}`), `setRestaurantScope(restaurantId)` method, auto-restore on return
- **Verified**: Login on 509 → switch to 675 (capture appears) → back to 509 (auto-restored)

---

## Prioritized Backlog

### P0 (Critical)
- Delivery distance API returns "No" for 0km distance on restaurant 509 — admin config issue

### P1 (High)
- Cart context not restaurant-scoped (may carry items across restaurants)

### P2 (Medium)
- Profile page doesn't have restaurantId — needs consideration for restaurant-scoped display

### Future/Backlog
- See ROADMAP.md for full feature roadmap
- See BUG_TRACKER.md for known issues
- See FEAT-* docs for upcoming feature specs
