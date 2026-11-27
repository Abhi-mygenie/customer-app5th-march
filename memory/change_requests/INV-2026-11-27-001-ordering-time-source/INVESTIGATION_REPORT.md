# INVESTIGATION REPORT — INV-2026-11-27-001
## "Ordering unavailable right now — Opens at 6:00 AM" — Time Source

**ID:** INV-2026-11-27-001  
**Type:** INVESTIGATION  
**Date:** 2026-11-27  
**Role:** INVESTIGATION (Role 6)  
**Status:** CLOSED  
**Classification:** FE / CONFIG  
**Confidence:** HIGH  
**Steps used:** 7/10  

---

## 1. Owner question (verbatim)

> "check from where its taking the time?"

Screenshot provided: Menu page `/69/menu` showing banner:
> "Ordering unavailable right now — Opens at 6:00 AM. You can still browse the menu."

Context: Restaurant 69, edit-order mode (Adding items to Order #1579194), dine-in/room channel.

---

## 2. Root cause — full 4-layer chain

```
Browser device clock (new Date())
  → itemAvailability.js isChannelOpen() / getChannelNextOpenTime()
      → restaurantShifts [{ start:'06:00', end:'03:00' }]  ← FROM MongoDB (restaurant 69)
          → banner: "Opens at 6:00 AM"
```

---

## 3. Evidence chain

### Layer 1 — Display source (MenuItems.jsx lines 802–815)

```jsx
// CR-2026-08-06-001
const channelOpensAt = getChannelNextOpenTime(scannedOrderType || 'dinein', _channelConfig);
...
<span>Opens at {channelOpensAt}. You can still browse the menu.</span>
```

`channelOpensAt` is the return value of `getChannelNextOpenTime()`.

### Layer 2 — Clock source (itemAvailability.js lines 169–170, 227–228)

```js
export const isRestaurantOpen = (shifts) => {
  const now = new Date();                          // ← BROWSER DEVICE CLOCK (IST)
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
  ...
};

export const getChannelNextOpenTime = (channel, config) => {
  const now = new Date();                          // ← BROWSER DEVICE CLOCK (IST)
  const currentMins = now.getHours() * 60 + now.getMinutes();
  // Find next shift.start after currentMins → format → return "6:00 AM"
};
```

**The time source is `new Date()` — the customer's device (browser) local clock.** Not the server, not POS, not any external time API.

### Layer 3 — Shift window (live API probe `/api/config/69`)

```
restaurantShifts: [{ start: "06:00", end: "03:00" }]
restaurantOpen:   true
dineInShifts:     null   ← no per-channel override → falls back to restaurantShifts
roomShifts:       null   ← no per-channel override → falls back to restaurantShifts
```

Overnight shift: **open 06:00 AM → 03:00 AM (next day)**

| Time window | Status |
|---|---|
| 06:00 AM → 03:00 AM | ✅ Open |
| **03:00 AM → 06:00 AM** | ❌ Closed — banner fires |

### Layer 4 — Source of `06:00` value

```
RestaurantConfigContext.jsx line 534:
  restaurantShifts: config.restaurantShifts || [{ start: '06:00', end: '03:00' }]
```

The DB **does** return `restaurantShifts: [{ start:'06:00', end:'03:00' }]` for restaurant 69 — this was set by admin (not the hardcoded fallback).

---

## 4. Why it appeared in the screenshot

The screenshot was captured when the customer's **device time was between 03:00 AM and 06:00 AM IST** — the only 3-hour closed window in the restaurant's shift. `getChannelNextOpenTime()` finds no shift starting later that night, so returns the **first shift of the next cycle**: `6:00 AM`.

---

## 5. Conclusion

**No code bug.** This is correct behaviour per CR-2026-08-06-001 (per-channel time control). The restaurant configured a shift of `06:00–03:00`; between 3 AM and 6 AM the banner correctly shows the next opening time.

**To change the behaviour:** Admin updates `restaurantShifts` via Admin Settings → Operating Hours. Per-channel overrides can be set via `dineInShifts` / `roomShifts`.

---

```
Investigation complete: INV-2026-11-27-001
Root cause: new Date() (browser device clock) checked against restaurantShifts
            [{ start:'06:00', end:'03:00' }] stored in MongoDB for restaurant 69.
            Banner fires between 3:00 AM–6:00 AM device local time only.
Classification: FE / CONFIG — no code bug.
Confidence: HIGH
Steps used: 7/10
Recommendation: No action needed. Owner can update operating hours via Admin Settings if the window is wrong.
```
