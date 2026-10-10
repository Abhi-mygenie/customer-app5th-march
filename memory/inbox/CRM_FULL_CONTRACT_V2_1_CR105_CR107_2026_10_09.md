# CRM Full Contract v2.1 + CR-105 + CR-107 (2026-10-09)

## New endpoints
- POST /scan/coupons/validate (CR-105) — LIVE
- POST /scan/max-redeemable (CR-107) — LIVE

## 19 /scan/* routes total. Removed 6 (CR-095, CR-098).
See full document in artifacts.

## Validation probes 2026-10-09
- CR-107 max-redeemable bill:500 → ok:true, max_points:36, max_discount:108, ratio:3.0, projected_earned:150
- CR-105 validate FLAT TODAY → INVALID_CODE (§4 DB whitespace bug — code stored as "FLAT TODAY " in DB)
- CR-105 validate BADCODE999 → INVALID_CODE ✅
- CR-105 validate SEED_V1_FLAT100 order:10 → MIN_ORDER_NOT_MET ✅

## §4 bug confirmed: GET /scan/coupons returns 'FLAT TODAY ' (11 chars, trailing space). DB exact-match fails on stripped input. CRM to fix in CR-085-B.

## Open on our side: validate reply to CRM + register new CRs
