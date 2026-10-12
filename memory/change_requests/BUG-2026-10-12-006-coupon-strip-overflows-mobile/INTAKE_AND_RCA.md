# BUG-2026-10-12-006 — Coupon strip overflows the screen on mobile (bleed + empty "gap")

**Registered:** 2026-10-12 · **Found by:** Investigation (Role, read-only) from owner mobile screenshots (2nd report)
**Severity:** MEDIUM (visual/layout; no data or payment impact) · **Status:** QA_PASS (iteration_24) 2026-10-12 — fixed & verified on mobile
**Area:** `frontend/src/components/CouponDiscoveryList/CouponDiscoveryList.css` + the coupon wrapper in `frontend/src/pages/ReviewOrder.jsx` (L2079)

## FIX APPLIED (2026-10-12)
`CouponDiscoveryList.css`: `.cdl-wrap { width:100% }` and `.cdl-strip { min-width:0; max-width:100% }` (kept `overflow-x:auto`).
Verified on 390px mobile (testing iteration_24): html scrollWidth==clientWidth==390 (no page overflow); strip left=31 / width=324 ≤ 390 (contained, no edge bleed); strip scrolls internally (scrollWidth 1113, clientWidth 324) while page scrollLeft stays 0; tap-apply / remove / strip-return regression all PASS. Build clean.

## Symptoms (from screenshots)
1. The coupon discovery cards **bleed past both left and right screen edges**; the left and right cards are clipped mid-word (e.g. "-Night 10%", "Buy 3 Golden Caramel Get 1 R…"), and the "Best offer" card's content is cut off.
2. When the strip is panned, the cards float in a **large empty white band** (big vertical/horizontal gap) with nothing else around them — the whole page becomes horizontally scrollable.

## Root cause (confirmed by code inspection)
The coupon strip is rendered inside:
`<div className="price-row price-row-input" style={{ flexDirection:'column', gap:4 }}>` (ReviewOrder.jsx L2079)

- Base rule `.price-row { display:flex; justify-content:space-between; align-items:center; }` (ReviewOrder.css L908).
- The inline style only overrides `flex-direction` and `gap`. It does **not** reset `align-items`, so the column keeps **`align-items: center`**.
- Consequence: the child `.cdl-wrap` (and its `overflow-x:auto` `.cdl-strip`) is **not stretched to the container width** — under `align-items:center` a flex item takes its **shrink-to-fit (content) width**. The strip's content is ~8 cards × 148px, far wider than the phone, so the wrapper grows wider than the Price Breakdown card and the viewport and is centred → cards spill past **both** edges.
- Because the wrapper is wider than the viewport and there is **no `overflow-x:hidden`** on any page container, the **entire page becomes horizontally pannable**; panning exposes the empty band seen in screenshots 2–3.
- The intended internal horizontal-scroll carousel (`.cdl-strip { overflow-x:auto }`) never engages because its wrapper has no bounded width.

Contributing: `CouponDiscoveryList.css` `.cdl-wrap` has **no `width:100%`** and `.cdl-strip` has **no `max-width:100%`/`min-width:0`**, so they rely on the parent to constrain width — which `align-items:center` prevents.

Pre-existing: the wrapper/align-items pattern dates to CR-2026-10-11-009; the CR-2026-10-12-002 rebuild did not add a width constraint either. This is why it is the **2nd** report.

## Proposed fix (NOT applied — awaiting gate)
Smallest robust change, pick either (or both for belt-and-braces):
- **A — component CSS (preferred, 2 lines):** in `CouponDiscoveryList.css`
  - `.cdl-wrap { width: 100%; }`
  - `.cdl-strip { min-width: 0; max-width: 100%; }`  (keeps existing `overflow-x:auto`)
- **B — wrapper inline (ReviewOrder.jsx L2079):** change `style={{ flexDirection:'column', gap:4 }}` →
  `style={{ flexDirection:'column', gap:4, alignItems:'stretch', width:'100%' }}`

Either makes the wrapper span exactly the card width, so the strip clips internally and scrolls horizontally as a bounded carousel — no page-level overflow, no edge bleed, no empty gap.

## Verify after fix
- Mobile (390px): coupon strip stays within the Price Breakdown card; first card flush with card's left padding; swiping scrolls the strip only (page does not pan sideways); no large empty band above/below.
- Desktop regression: strip still scrolls; applied-coupon row and input/Apply row unaffected.
