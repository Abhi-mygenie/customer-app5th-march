# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git (branch: 11th-apri-refactor), set up environment, and run as-is. Then work through code audit fixes from DEFAULTS_FALLBACKS_AUDIT.md and CODE_AUDIT.md.

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + TipTap editor
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: External MongoDB at 52.66.232.149 (mygenie database)
- **External APIs**: MyGenie POS API (preprod.mygenie.online)

## What's Been Implemented

### 2026-04-11 — Setup & CA-003 + CA-004 + CA-008 Phase 1 Fixes
- Cloned repo, configured env, resolved tsconfig/jsconfig conflict
- **CA-003 Fixed**: Centralized price calculation (base + variations + addons)
  - Replaced 4 inline duplications with `calculateCartItemPrice()` from `helpers.js`
  - Files changed: `OrderItemCard.jsx`, `CartContext.js`, `ReviewOrder.jsx`
- **CA-004 Fixed**: Centralized tax calculation (GST/VAT breakdown)
  - Created `/utils/taxCalculation.js` with `calculateItemTax()` and `calculateTaxBreakdown()`
  - Replaced inline tax calc in `ReviewOrder.jsx` (~80 lines) and `orderService.ts` (~20 lines)
- **CA-008 Phase 1 Fixed**: ReviewOrder.jsx component extraction (1722 → 1479 lines, -243 lines)
  - Extracted `TableRoomSelector` — scanned table display + manual room/table dropdown with sort
  - Extracted `LoyaltyRewardsSection` — consolidated 3 inline loyalty JSX blocks into 1 component
  - Moved helper functions (isNumeric, sortTableNumbers) to TableRoomSelector
  - Removed unused imports (Select, IoGiftOutline, FaDoorOpen, MdOutlineTableRestaurant)
  - Testing: 100% frontend pass, zero regressions

### Previously Completed (Apr 10)
- DFA-001 to DFA-004, DFA-006, DFA-007, DFA-010 (defaults/fallbacks audit fixes)
- CA-001 (hardcoded credentials), CA-002 (JWT secret fallback)

## Prioritized Backlog

### P0 (Next — Fix Bugs Before Phase 2)
- BUG-041: Fix 401 retry payment type (use `paymentMethod` not `razorpay_key`) ✅ Confirmed
- BUG-040: Fix 401 retry Razorpay skip (add `shouldProcessRazorpay` check in retry)
- BUG-039: Fix edit order missing `orderDispatchedRef` (set ref before updateCustomerOrder)
- BUG-038: Pass billSummary in Razorpay success navigation (points data)
- BUG-P2-007: Reset `orderDispatchedRef` in Razorpay `ondismiss`

### P1 (After Bug Fixes)
- CA-008 Phase 2: Dedup handlePlaceOrder (submitOrder helper, navigateToSuccess, executeOrderFlow)
- CA-008 Phase 3: Extract useOrderSubmit + useCustomerPrefill hooks
- BUG-042: 401 retry table check — discuss with POS team

### P2
- DFA-011: Restaurant 716 hardcoded table check → config flag
- BUG-037: Dynamic OG meta tags per restaurant

### P2
- CA-006: 72+ console.logs → logger utility
- CA-010: 5 unused API endpoints → remove
- CA-007: CSS class conflicts → BEM naming
- DFA-005: onError handlers → show placeholder
- CA-009: Unused hook useApi.js → delete

## Active URLs
- Frontend: https://mygenie-11th-apri.preview.emergentagent.com
- Backend API: https://mygenie-11th-apri.preview.emergentagent.com/api/
