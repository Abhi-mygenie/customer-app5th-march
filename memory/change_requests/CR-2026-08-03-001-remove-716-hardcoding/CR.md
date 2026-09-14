# CR-2026-08-03-001 — Remove 716 Hardcoding

## Quick Reference

| Field | Value |
|-------|-------|
| **CR ID** | CR-2026-08-03-001 |
| **Title** | Remove all Restaurant 716 hardcodings — make config-driven |
| **Status** | IMPLEMENTATION PLAN COMPLETE — OWNER APPROVAL REQUIRED |
| **Severity** | P1 |
| **Risk** | HIGH → CRITICAL |
| **Created** | 2026-08-03 |
| **Evidence** | INV-2026-08-03-001 (v2) |
| **HTML Reports** | `/investigation-716.html`, `/investigation-716-v2.html` |

## Gate Progress

- [x] Investigation (INV-2026-08-03-001)
- [x] Intake
- [x] Planning / Impact Analysis — **GATE CLOSED 2026-08-05** — 13 decisions (D1–D13), 18 verification cases, all OQs resolved, delivery path confirmed (POS Profile API), implementation approach confirmed (start now)
- [x] Implementation Plan — **COMPLETE v2 2026-08-06** — 2 gaps closed (OQ-NEW-1 type mismatch, OQ-NEW-2 DC-5 store): RO-1 corrected to `Boolean(ordersAutoPaid)`, DC-5 confirmed as local backend config already set; all 5 DC items confirmed via live POS API validation. 20 edits across 5 files.
- [ ] **Owner Approval — NEXT**
- [ ] Implementation Plan
- [ ] Implementation
- [ ] Self-Test
- [ ] QA
- [ ] Owner Smoke / Acceptance

## 7 Scope Items

| # | Item | Config Flag | Risk | Planning Status |
|---|------|------------|------|-----------------|
| 1 | Room-only mode (force room, hide table radio) | `locationSelection: 'runtime'` | CRITICAL | COMPLETE |
| 2 | Fresh location per order (clear after each order) | `locationSelection: 'runtime'` | CRITICAL | COMPLETE |
| 3 | Multiple orders per location | `ordersAutoPaid: true` | HIGH | COMPLETE |
| 4 | Skip session persistence for manual picks | `locationSelection: 'runtime'` | MEDIUM | COMPLETE |
| 5 | QR-context-lost guard exclusion | `locationSelection: 'runtime'` (derived) | MEDIUM | COMPLETE |
| 6 | Non-QR carve-out removal | Use existing `allowNonQrOrders: true` in 716 config | MEDIUM | COMPLETE |
| 7 | Orders treated as paid (autopaid endpoint) | `ordersAutoPaid: true` | CRITICAL | COMPLETE |

## Key Decisions Summary

| Decision | Answer |
|----------|--------|
| Flag count | 2 flags only |
| Flag names | `locationSelection: 'scanner'\|'runtime'`, `ordersAutoPaid: boolean` |
| Config source | POS Profile API endpoint (keys added by POS backend team) |
| server.py change? | NO — WILL NOT change |
| RestaurantConfigContext change? | NO — WILL NOT change |
| Implementation approach | Start now — assume backend will send; coordinate 716 flag backfill with deploy |
| Order status flow change? | NO — backend-controlled, no frontend change |

## Open Questions

All resolved. No blockers.

| # | Question | Resolution |
|---|----------|------------|
| OQ-1 | POS autopaid endpoint accepts non-716 IDs? | RESOLVED — yes, config-driven |
| OQ-2 | `ordersAutoPaid` for non-multi-menu? | RESOLVED — yes, any restaurant type |
| OQ-3 | Autopaid affects order status flow? | RESOLVED — no, backend-controlled |
| D12 | Flag delivery path? | RESOLVED — POS Profile API, 2 keys added |
