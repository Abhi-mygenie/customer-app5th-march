# PRD.md — MyGenie Customer App

## Project
MyGenie Customer App — QR-based restaurant ordering (scan, browse, cart, pay).

## Architecture
- **Frontend:** React 19 + CRA + CRACO + Tailwind + Radix/shadcn
- **Backend:** FastAPI (single server.py) + Motor (MongoDB async)
- **External APIs:** POS preprod (mygenie.online), CRM (crm.mygenie.online)
- **Deployment:** Emergent platform, supervisord, nginx reverse proxy

## What's been implemented

### 2026-10-25 — Deployment + BUG-2026-10-14-001
- **Full repo deployment** from `Abhi-mygenie/customer-app5th-march` (main branch) into `/app`
  - 572 memory files synced across 6 subdirectories
  - Backend (FastAPI port 8001) + Frontend (CRA port 3000) running via supervisord
  - Remote MongoDB at 52.66.232.149, POS preprod API connected
- **BUG-2026-10-14-001: Negative-stock inventory bypass** — IMPLEMENTED
  - When POS `inventory_negative='Yes'` (or absent), all inventory gates are bypassed
  - 6 FE files changed: MenuItems.jsx, MenuItem.jsx, CartContext.js, ReviewOrder.jsx, CustomizeItemModal.jsx, OrderItemCard.jsx
  - Testing: restaurant 689 now shows all 126 items (69 previously hidden); 716 control unchanged
  - Status: IMPLEMENTED, awaiting QA + owner smoke

## Prioritized backlog (P0/P1/P2)
- **P1** BUG-2026-10-14-001 → QA + smoke (just implemented)
- **P1** CR-2026-10-06-001 walkin order enforcement → INTAKE, waiting Planning
- **P1** CR-2026-10-03-004 pre-login reads → CRM API → SMOKE pending
- **P1** CR-2026-09-15-001 profile CRM v2 adapter → SMOKE pending
- **P2** F-2 (INV-002): `is_disable` never enforced → needs POS confirmation (Q-3)
- **P3** F-3 (INV-002): empty category boxes still tappable → small CR

## Next tasks
1. QA for BUG-2026-10-14-001 (Role 4)
2. Owner smoke for BUG-2026-10-14-001
3. One preprod test order on 689 with stock_out='Y' item to prove POS acceptance (V-9)
