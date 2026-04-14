# Project Roadmap

## Last Updated: March 26, 2026 (Session 7)

---

## Overview

This document outlines all pending tasks, their priorities, risks, and recommended execution order.

---

## Current Status

| Category | Status |
|----------|--------|
| Transform & Refactor v1 | ✅ Complete |
| Order Flow | ✅ Working |
| Multi-menu Support | ✅ Restored |
| Documentation | ✅ Updated |
| Backup Cleanup | ✅ Done |
| Razorpay Payment Integration | ✅ Complete (Session 7) |
| QR Code Page Filters | ✅ Complete (Session 7) |
| FEAT-003 Notification Popups | ✅ Complete (Jan 11, 2026) |

---

## Task Priority Matrix

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | 🔴 Critical | Blocking production, fix immediately |
| P1 | 🟡 Important | Should fix soon, user-facing issues |
| P2 | 🔵 Backlog | Quality improvements, can wait |
| P3 | ⚪ Future | Nice to have, long-term |

---

## P1 Tasks (Important)

### P1-1: QR Code URL Issue

| Field | Details |
|-------|---------|
| **Status** | 🟡 Parked |
| **Risk Level** | Low |
| **Effort** | 2-3 hours |
| **File** | `/app/frontend/src/pages/admin/AdminQRPage.jsx` |

**Problem:**
```javascript
const baseUrl = subdomain ? `https://${subdomain}/${restaurantId}` : '';
// If subdomain is undefined, baseUrl becomes empty
```

**Impact:**
- QR codes generated with empty URLs
- Affects Admin QR generation page only
- Customer order flow NOT affected

**Steps to Fix:**
1. Check where `subdomain` comes from
2. Add fallback URL logic
3. Test QR generation
4. Test QR scanning

**Risk Assessment:**
| Risk | Level |
|------|-------|
| Breaks orders | ❌ No |
| Breaks customer flow | ❌ No |
| Safe to defer | ✅ Yes |

---

## P2 Tasks (Backlog)

### P2-1: Extract Custom Hooks

| Field | Details |
|-------|---------|
| **Status** | 🔵 Not Started |
| **Risk Level** | 🔴 High |
| **Effort** | 6-8 hours |
| **Recommendation** | Wait 1-2 sessions for stability |

**Hooks to Create:**

| Hook | Source | Risk |
|------|--------|------|
| `useOrderStatus` | OrderSuccess.jsx | 🟡 Medium - Display only |
| `useTableStatus` | LandingPage.jsx | 🟡 Medium - Redirect only |
| `usePreviousOrder` | CartContext, OrderSuccess | 🟡 Medium - Read-only |
| `useOrderCalculations` | ReviewOrder.jsx | 🔴 High - Billing critical |

**Steps to Execute:**
```
Phase 1: Setup (30 min)
├── Create /app/frontend/src/hooks/ directory
└── Set up index.js for exports

Phase 2: Low-Risk Hooks (2 hours)
├── Step 1: Extract useOrderStatus
│   ├── Move status polling logic
│   ├── Move mapFoodOrderStatus()
│   ├── Test OrderSuccess page
│   └── Verify status updates work
│
├── Step 2: Extract useTableStatus
│   ├── Move checkTableStatus logic
│   ├── Move redirect handling
│   ├── Test LandingPage
│   └── Verify redirects work

Phase 3: Medium-Risk Hooks (2 hours)
├── Step 3: Extract usePreviousOrder
│   ├── Move fetchPreviousItems logic
│   ├── Move getPreviousOrderTotal()
│   ├── Test edit order flow
│   └── Verify previous items display

Phase 4: High-Risk Hook (2 hours)
├── Step 4: Extract useOrderCalculations
│   ├── Move calculateSubtotal()
│   ├── Move calculateTax()
│   ├── Move calculateDiscount()
│   ├── Move calculateGrandTotal()
│   ├── TEST THOROUGHLY
│   └── Verify billing is correct

Phase 5: Cleanup (1 hour)
├── Remove duplicate code from components
├── Update imports
└── Final testing
```

**Risk Mitigation:**
- One hook at a time
- Test after each extraction
- Keep original code commented (don't delete)
- Start with lowest risk hooks

**Testing Checklist:**
- [ ] Place new order - verify totals correct
- [ ] Edit order - verify previous items load
- [ ] Order success - verify status updates
- [ ] Landing page - verify redirects work
- [ ] Multi-menu order - verify special handling

---

### P2-2: Decompose ReviewOrder.jsx

| Field | Details |
|-------|---------|
| **Status** | 🔵 Not Started |
| **Risk Level** | 🟡 Medium |
| **Effort** | 4-6 hours |
| **Dependency** | P2-1 (Hooks) recommended first |

**Current State:**
- 1600+ lines in single file
- Mixed concerns (UI, logic, state)
- Hard to maintain

**Target Structure:**
```
/app/frontend/src/pages/ReviewOrder/
├── index.jsx                    # Re-export
├── ReviewOrder.jsx              # Main container (~200 lines)
├── components/
│   ├── CustomerInfoForm.jsx     # Name, phone, instructions (~150 lines)
│   ├── CartItemsList.jsx        # Cart display/edit (~200 lines)
│   ├── BillSummary.jsx          # Totals, tax, discounts (~150 lines)
│   ├── CouponSection.jsx        # Coupon apply/remove (~100 lines)
│   ├── LoyaltyPoints.jsx        # Points redemption (~80 lines)
│   ├── OrderActions.jsx         # Place order button (~100 lines)
│   └── Modals/
│       ├── PhoneVerifyModal.jsx
│       ├── CouponModal.jsx
│       └── ConfirmModal.jsx
└── hooks/
    └── useReviewOrder.js        # Shared state if not using P2-1 hooks
```

**Steps to Execute:**
```
Phase 1: Setup (30 min)
├── Create directory structure
├── Create index.jsx
└── Test existing page still works

Phase 2: Extract Components (3 hours)
├── Step 1: CustomerInfoForm
│   ├── Extract JSX
│   ├── Extract handlers
│   ├── Pass props
│   └── Test form works
│
├── Step 2: BillSummary
│   ├── Extract JSX
│   ├── Accept totals as props
│   └── Test display correct
│
├── Step 3: CartItemsList
│   ├── Extract JSX
│   ├── Extract edit handlers
│   └── Test cart editing works
│
├── Step 4: CouponSection
│   ├── Extract JSX
│   ├── Extract coupon logic
│   └── Test coupon apply/remove
│
├── Step 5: LoyaltyPoints
│   ├── Extract JSX
│   ├── Extract points logic
│   └── Test points redemption
│
├── Step 6: OrderActions
│   ├── Extract JSX
│   ├── Keep placeOrder in parent
│   └── Test order submission

Phase 3: Extract Modals (1 hour)
├── Move modal components
├── Update imports
└── Test all modals work

Phase 4: Cleanup (1 hour)
├── Remove extracted code from main file
├── Verify all imports correct
└── Final testing
```

**Testing Checklist:**
- [ ] Customer form submits correctly
- [ ] Cart items editable
- [ ] Bill summary shows correct totals
- [ ] Coupon applies/removes
- [ ] Points can be redeemed
- [ ] Order places successfully
- [ ] All modals open/close

---

### P2-3: Fix Inclusive Tax Logic

| Field | Details |
|-------|---------|
| **Status** | 🔵 Not Started |
| **Risk Level** | 🟡 Medium |
| **Effort** | 2-3 hours |
| **Priority** | Higher than other P2s (billing accuracy) |

**Problem:**
```javascript
// Current (WRONG)
API returns: { price: 100, tax: 5, tax_calc: "Inclusive" }
App calculates: 100 + (100 × 5%) = ₹105

// Should be
₹100 (tax already included in price)
```

**Files to Modify:**

| File | Change |
|------|--------|
| `helpers.js` | `calculateCartItemPrice()` - check tax_calc |
| `CartContext.js` | `getTotalPrice()` - handle inclusive |
| `ReviewOrder.jsx` | Tax display - show "(Inclusive)" label |
| `BillSummary` | Display correctly |

**Steps to Execute:**
```
Phase 1: Understand Current Flow (30 min)
├── Trace tax calculation path
├── Identify all places tax is calculated
└── Document current behavior

Phase 2: Update Transformers (1 hour)
├── Step 1: Update helpers.js
│   ├── Add taxCalc parameter to calculateCartItemPrice
│   ├── If Inclusive, don't add tax
│   └── Return breakdown {subtotal, tax, total, isInclusive}
│
├── Step 2: Update orderTransformer.ts
│   ├── Ensure taxCalc passed through
│   └── Test transformation

Phase 3: Update Components (1 hour)
├── Step 3: Update CartContext
│   ├── Use taxCalc in getTotalPrice
│   └── Test totals correct
│
├── Step 4: Update ReviewOrder / BillSummary
│   ├── Show "Tax (Inclusive)" or "Tax (Exclusive)"
│   ├── Display correct amounts
│   └── Test display

Phase 4: Testing (30 min)
├── Test with Inclusive tax item
├── Test with Exclusive tax item
├── Test mixed cart
└── Verify order placement sends correct amount
```

**Testing Checklist:**
- [ ] Inclusive item shows correct price
- [ ] Exclusive item shows tax added
- [ ] Mixed cart totals correct
- [ ] Bill summary labels correct
- [ ] Order amount sent to API correct

---

### P2-4: Restaurant-level Tax Settings

| Field | Details |
|-------|---------|
| **Status** | 🔵 Not Started |
| **Risk Level** | 🟡 Medium |
| **Effort** | 3-4 hours |
| **Dependency** | P2-3 (Inclusive Tax) should be done first |

**API Fields to Support:**

| Field | Type | Purpose |
|-------|------|---------|
| `restaurent_gst` | number | Restaurant-wide GST % |
| `vat.status` | boolean | Enable/disable VAT |
| `vat.percentage` | number | VAT % if enabled |
| `service_tax` | number | Service charge % |

**Steps to Execute:**
```
Phase 1: Config Storage (1 hour)
├── Update RestaurantConfigContext
│   ├── Add gstPercent
│   ├── Add vatEnabled, vatPercent
│   ├── Add serviceChargePercent
│   └── Fetch from restaurant API

Phase 2: Calculation Updates (1.5 hours)
├── Update useOrderCalculations (or helpers.js)
│   ├── Apply restaurant GST if item has no tax
│   ├── Apply VAT if enabled
│   ├── Apply service charge
│   └── Return detailed breakdown

Phase 3: Display Updates (1 hour)
├── Update BillSummary
│   ├── Show GST line
│   ├── Show VAT line (if applicable)
│   ├── Show Service Charge line
│   └── Show Grand Total

Phase 4: Payload Updates (30 min)
├── Update helpers.js buildPayload
│   ├── Include tax breakdown
│   └── Test API accepts
```

**Testing Checklist:**
- [ ] Restaurant GST applies when no item tax
- [ ] VAT applies when enabled
- [ ] Service charge calculates correctly
- [ ] Bill shows all tax lines
- [ ] Order API receives correct breakdown

---

### P2-5: Full TypeScript Migration

| Field | Details |
|-------|---------|
| **Status** | 🔵 Not Started |
| **Risk Level** | 🟡 Medium |
| **Effort** | 8-12 hours |
| **Dependency** | All other P2s complete |

**Current State:**
- TypeScript: 10% (types, transformers, orderService)
- JavaScript: 90% (components, hooks, context)

**Migration Phases:**

```
Phase 1: Configure Build (1 hour)
├── Update tsconfig.json for strict mode
├── Configure webpack to prefer .ts
├── Remove need for JS wrappers

Phase 2: Migrate Services (1 hour)
├── restaurantService.js → .ts
├── stationService.js → .ts
├── tableRoomService.js → .ts
├── dietaryTagsService.js → .ts

Phase 3: Migrate Hooks (2 hours)
├── All hooks in /hooks/ → .ts
├── Add proper type definitions
├── Update imports

Phase 4: Migrate Context (2 hours)
├── CartContext.js → .tsx
├── RestaurantConfigContext.js → .tsx
├── Other contexts → .tsx
├── Add proper generics

Phase 5: Migrate Components (3 hours)
├── Shared components → .tsx
├── Add prop types
├── Update imports

Phase 6: Migrate Pages (3 hours)
├── All pages → .tsx
├── Add prop types
├── Final testing

Phase 7: Cleanup (1 hour)
├── Remove all JS wrapper files
├── Update all imports
├── Enable strict mode
├── Final verification
```

---

## Recommended Execution Order

```
Session N+1 (Stabilization):
└── Monitor current changes
└── Fix any reported bugs

Session N+2 (Billing Accuracy):
├── P2-3: Fix Inclusive Tax Logic (2-3 hours)
└── Test billing thoroughly

Session N+3 (Tax Completeness):
├── P2-4: Restaurant-level Tax Settings (3-4 hours)
└── Test all tax scenarios

Session N+4 (Code Quality):
├── P2-1: Extract Custom Hooks (6-8 hours)
└── Test all flows

Session N+5 (Maintainability):
├── P2-2: Decompose ReviewOrder.jsx (4-6 hours)
└── Test all flows

Session N+6 (TypeScript):
├── P2-5: Full TypeScript Migration (8-12 hours)
└── Enable strict mode

When Needed:
└── P1-1: QR Code URL Issue (when Admin features needed)
```

---

## Risk Summary

| Task | Risk Level | Billing Impact | Order Impact |
|------|------------|----------------|--------------|
| P1-1: QR Code | 🟢 Low | None | None |
| P2-1: Hooks | 🔴 High | Yes | Yes |
| P2-2: Decompose | 🟡 Medium | Indirect | Indirect |
| P2-3: Inclusive Tax | 🟡 Medium | Yes | No |
| P2-4: Restaurant Tax | 🟡 Medium | Yes | No |
| P2-5: TypeScript | 🟡 Medium | Indirect | Indirect |

---

## Success Criteria

| Task | Success Criteria |
|------|-----------------|
| P1-1 | QR codes contain valid URLs |
| P2-1 | All hooks work, no regressions |
| P2-2 | ReviewOrder.jsx < 300 lines |
| P2-3 | Inclusive tax items show correct price |
| P2-4 | All restaurant taxes apply correctly |
| P2-5 | Zero .js files in src/, strict mode enabled |

---

## Notes

- Always test order flow after ANY change
- Keep backups before major refactors
- Document changes in CHANGELOG
- Update BUG_TRACKER for any issues found

---
*Last Revised: January 11, 2026 — FEAT-003 Notification Popups complete, FEAT-002 Delivery spec ready (blocked)*
