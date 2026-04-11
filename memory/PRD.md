# MyGenie Customer App - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/customer-app5th-march.git (branch: 11th-apri-refactor), set up environment, and run as-is. Then work through code audit fixes from DEFAULTS_FALLBACKS_AUDIT.md and CODE_AUDIT.md.

## Architecture
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + TipTap editor
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: External MongoDB at 52.66.232.149 (mygenie database)
- **External APIs**: MyGenie POS API (preprod.mygenie.online)

## What's Been Implemented

### 2026-04-11 — Setup & CA-003 + CA-004 Fixes
- Cloned repo, configured env, resolved tsconfig/jsconfig conflict
- **CA-003 Fixed**: Centralized price calculation (base + variations + addons)
  - Replaced 4 inline duplications with `calculateCartItemPrice()` from `helpers.js`
  - Files changed: `OrderItemCard.jsx`, `CartContext.js`, `ReviewOrder.jsx`
- **CA-004 Fixed**: Centralized tax calculation (GST/VAT breakdown)
  - Created `/utils/taxCalculation.js` with `calculateItemTax()` and `calculateTaxBreakdown()`
  - Replaced inline tax calc in `ReviewOrder.jsx` (~80 lines) and `orderService.ts` (~20 lines)
  - Tested on restaurant 478: CGST ₹1.13, SGST ₹1.13, Grand Total ₹48.00 — correct

### Previously Completed (Apr 10)
- DFA-001 to DFA-004, DFA-006, DFA-007, DFA-010 (defaults/fallbacks audit fixes)
- CA-001 (hardcoded credentials), CA-002 (JWT secret fallback)

## Prioritized Backlog

### P0 (Next)
- DFA-011: Restaurant 716 hardcoded table check → config flag
- CA-008: ReviewOrder.jsx 1600+ lines → split into components

### P2
- CA-006: 72+ console.logs → logger utility
- CA-010: 5 unused API endpoints → remove
- CA-007: CSS class conflicts → BEM naming
- DFA-005: onError handlers → show placeholder
- CA-009: Unused hook useApi.js → delete

## Active URLs
- Frontend: https://mygenie-11th-apri.preview.emergentagent.com
- Backend API: https://mygenie-11th-apri.preview.emergentagent.com/api/
