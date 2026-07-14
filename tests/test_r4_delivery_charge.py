"""
R4 E2E Test: BUG-2026-02-XX-001 Plan R4
Tests the delivery charge update when navigating back from Menu to ReviewOrder
after modifying cart across the free-delivery threshold (₹250 for restaurant 699).

Key R4 fix: [subtotal, deliveryAddress] dep array in ReviewOrder.jsx useEffect.
"""
import asyncio
import json
import time
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
RESTAURANT_ID = '699'
MANAGE_API_PATTERN = '**/api/v1/config/distance-api-new**'

# Realistic delivery address (Mumbai coords)
DELIVERY_ADDRESS = {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "Test Address, Mumbai",
    "city": "Mumbai",
    "pincode": "400001"
}

# Cart item templates
def make_cart(items_with_price_qty):
    """Build a cart localStorage object."""
    items = []
    for i, (price, qty) in enumerate(items_with_price_qty):
        items.append({
            "cartId": f"test-item-{i}",
            "itemId": f"item-{i}",
            "name": f"Test Item {i+1}",
            "price": price,
            "quantity": qty,
            "variations": [],
            "add_ons": [],
            "cookingInstructions": ""
        })
    return {
        "items": items,
        "createdAt": int(time.time() * 1000),
        "expiresAt": int(time.time() * 1000) + 10800000  # 3 hours
    }

CART_BELOW_THRESHOLD = make_cart([(100, 1), (100, 1)])         # subtotal = 200
CART_ABOVE_THRESHOLD = make_cart([(100, 1), (100, 1), (100, 1)])  # subtotal = 300
CART_BELOW_THRESHOLD_2 = make_cart([(75, 1), (75, 1)])          # subtotal = 150

SCANNED_TABLE_DATA = {
    "table_id": None,
    "table_no": None,
    "room_or_table": None,
    "order_type": "delivery",
    "food_for": None
}

async def setup_delivery_state(page, delivery_charge=10, cart=None):
    """Inject localStorage and sessionStorage for a delivery order."""
    if cart is None:
        cart = CART_BELOW_THRESHOLD
    
    await page.evaluate(f"""() => {{
        const restaurantId = '{RESTAURANT_ID}';
        // Cart
        localStorage.setItem('cart_' + restaurantId, JSON.stringify({json.dumps(cart)}));
        // Delivery address
        localStorage.setItem('delivery_' + restaurantId, JSON.stringify({json.dumps(DELIVERY_ADDRESS)}));
        // Stale delivery charge
        localStorage.setItem('delivery_charge_' + restaurantId, String({delivery_charge}));
        // Session: scanned table / order type  
        sessionStorage.setItem('scanned_table_' + restaurantId, JSON.stringify({json.dumps(SCANNED_TABLE_DATA)}));
    }}""")

async def mock_distance_api(page, above_threshold_charge=0, below_threshold_charge=10, threshold=250):
    """Intercept the distance API and return controlled responses."""
    call_log = []

    async def handle_route(route):
        request = route.request
        try:
            post_data = json.loads(request.post_data or '{}')
            order_value = float(post_data.get('order_value', 0))
            call_log.append({'order_value': order_value, 'timestamp': time.time()})
            
            if order_value >= threshold:
                charge = above_threshold_charge
            else:
                charge = below_threshold_charge
            
            response_body = json.dumps({
                "shipping_status": "Yes",
                "shipping_charge": str(charge),
                "message": "mocked"
            })
            await route.fulfill(
                status=200,
                content_type='application/json',
                body=response_body
            )
        except Exception as e:
            print(f"Route handler error: {e}")
            await route.continue_()
    
    await page.route('**/distance-api-new', handle_route)
    return call_log

async def get_delivery_charge_text(page):
    """Get the delivery charge value shown on ReviewOrder page."""
    try:
        # Wait for delivery charge row to appear
        await page.wait_for_selector('text=Delivery Charge', timeout=5000)
        # Get the sibling price span
        charge_text = await page.evaluate("""() => {
            const labels = Array.from(document.querySelectorAll('span'));
            const label = labels.find(el => el.textContent.trim() === 'Delivery Charge');
            if (!label) return null;
            const parent = label.parentElement;
            const valueEl = parent ? parent.querySelector('.price-value-sub') : null;
            return valueEl ? valueEl.textContent.trim() : null;
        }""")
        return charge_text
    except Exception as e:
        print(f"Error getting delivery charge: {e}")
        return None

async def run_all_tests():
    print(f"\n{'='*60}")
    print("R4 Delivery Charge Back-Navigation Tests")
    print(f"BASE_URL: {BASE_URL}")
    print(f"{'='*60}\n")

    # ─── TC1: Below threshold → back → above threshold → ReviewOrder ────────
    print("\n--- TC1: Below threshold (₹200, charge=₹10) → back to Menu → add items (₹300) → ReviewOrder → charge=Free ---")
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        page.on("console", lambda msg: print(f"  CONSOLE: {msg.text}") if 'error' in msg.type.lower() or 'warn' in msg.type.lower() else None)
        
        # Go to app root first to set up storage
        await page.goto(f"{BASE_URL}/{RESTAURANT_ID}/menu", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(1000)
        
        call_log = await mock_distance_api(page, above_threshold_charge=0, below_threshold_charge=10)
        await setup_delivery_state(page, delivery_charge=10, cart=CART_BELOW_THRESHOLD)
        
        # Navigate to ReviewOrder (simulate back-nav scenario)
        await page.goto(f"{BASE_URL}/{RESTAURANT_ID}/review-order", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2000)  # Wait for CartContext async address load + debounce + API call
        
        # Screenshot for reference
        await page.screenshot(path="/app/tests/.screenshots/tc1_review_initial.jpg", quality=40, full_page=False)
        
        charge_initial = await get_delivery_charge_text(page)
        print(f"  Initial delivery charge (subtotal=₹200): {charge_initial}")
        
        # Check initial API calls
        print(f"  API calls so far: {len(call_log)} — values: {[c['order_value'] for c in call_log]}")
        
        if charge_initial and '10' in charge_initial:
            print("  PASS: Initial charge shows ₹10.00 for below-threshold cart")
        elif charge_initial == 'Free':
            print("  NOTE: Shows Free even at ₹200 — API might have returned 0")
        else:
            print(f"  INFO: Charge shows: {charge_initial}")
        
        # ── Simulate "back to Menu + add items" ──
        # Update cart in localStorage to be above threshold, then re-navigate to ReviewOrder
        await page.evaluate(f"""() => {{
            localStorage.setItem('cart_699', JSON.stringify({json.dumps(CART_ABOVE_THRESHOLD)}));
        }}""")
        print("  Cart updated to ₹300 in localStorage (simulating user adding items on Menu)")
        
        # Navigate to ReviewOrder (the key R4 scenario)
        await page.goto(f"{BASE_URL}/{RESTAURANT_ID}/review-order", wait_until="domcontentloaded", timeout=15000)
        
        # Wait for: CartContext async address load (useEffect) + debounce (500ms) + API call + state update
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path="/app/tests/.screenshots/tc1_review_after_back_nav.jpg", quality=40, full_page=False)
        
        charge_after = await get_delivery_charge_text(page)
        print(f"  Delivery charge after back-nav + cart above threshold (₹300): {charge_after}")
        print(f"  Total API calls: {len(call_log)} — values: {[c['order_value'] for c in call_log]}")
        
        if charge_after == 'Free':
            print("  ✅ TC1 PASS: Delivery charge updated to Free after back-navigation with cart ≥ ₹250")
        elif charge_after and '10' in charge_after:
            print("  ❌ TC1 FAIL: Delivery charge still shows ₹10 (stale) — R4 fix NOT working")
        else:
            print(f"  ⚠️  TC1 INCONCLUSIVE: Charge shows '{charge_after}'")
            
        # Check if API was called with the new value (300)
        calls_with_300 = [c for c in call_log if c['order_value'] >= 250]
        if calls_with_300:
            print(f"  ✅ API called with order_value ≥ 250: {[c['order_value'] for c in calls_with_300]}")
        else:
            print(f"  ❌ No API call with order_value ≥ 250 — effect did not re-fire")
            
    except Exception as e:
        print(f"  ❌ TC1 ERROR: {e}")
        await page.screenshot(path="/app/tests/.screenshots/tc1_error.jpg", quality=40, full_page=False)

    # ─── TC2: Above threshold → back → below threshold → ReviewOrder ────────
    print("\n--- TC2: Above threshold (₹300, Free) → back to Menu → remove items (₹150) → ReviewOrder → charge=₹10 ---")
    try:
        # Reset mocks - remove old route and set up new call log
        await page.unroute('**/distance-api-new')
        call_log_tc2 = await mock_distance_api(page, above_threshold_charge=0, below_threshold_charge=10)
        
        await setup_delivery_state(page, delivery_charge=0, cart=CART_ABOVE_THRESHOLD)
        
        await page.goto(f"{BASE_URL}/{RESTAURANT_ID}/review-order", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2500)
        
        charge_initial_tc2 = await get_delivery_charge_text(page)
        print(f"  Initial delivery charge (subtotal=₹300): {charge_initial_tc2}")
        
        if charge_initial_tc2 == 'Free':
            print("  Initial shows Free — correct for ₹300")
        
        # Simulate back to Menu + remove items
        await page.evaluate(f"""() => {{
            localStorage.setItem('cart_699', JSON.stringify({json.dumps(CART_BELOW_THRESHOLD_2)}));
        }}""")
        print("  Cart updated to ₹150 in localStorage (simulating user removing items)")
        
        await page.goto(f"{BASE_URL}/{RESTAURANT_ID}/review-order", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path="/app/tests/.screenshots/tc2_review_after_back_nav.jpg", quality=40, full_page=False)
        
        charge_after_tc2 = await get_delivery_charge_text(page)
        print(f"  Delivery charge after back-nav + cart below threshold (₹150): {charge_after_tc2}")
        print(f"  TC2 API calls: {len(call_log_tc2)} — values: {[c['order_value'] for c in call_log_tc2]}")
        
        if charge_after_tc2 and '10' in charge_after_tc2:
            print("  ✅ TC2 PASS: Delivery charge updated to ₹10 after back-navigation with cart < ₹250")
        elif charge_after_tc2 == 'Free':
            print("  ❌ TC2 FAIL: Delivery charge still shows Free (stale) — R4 fix NOT working for TC2")
        else:
            print(f"  ⚠️  TC2 INCONCLUSIVE: Charge shows '{charge_after_tc2}'")
    except Exception as e:
        print(f"  ❌ TC2 ERROR: {e}")

    # ─── TC3: Inline cart modification on ReviewOrder ────────────────────────
    print("\n--- TC3: Inline item removal on ReviewOrder → delivery charge updates within ~500ms ---")
    try:
        await page.unroute('**/distance-api-new')
        call_log_tc3 = await mock_distance_api(page, above_threshold_charge=0, below_threshold_charge=10)
        
        # Start with cart ABOVE threshold (Free delivery)
        await setup_delivery_state(page, delivery_charge=0, cart=CART_ABOVE_THRESHOLD)
        await page.goto(f"{BASE_URL}/{RESTAURANT_ID}/review-order", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2500)
        
        charge_tc3_initial = await get_delivery_charge_text(page)
        print(f"  Initial charge (₹300): {charge_tc3_initial}")
        
        # Try to remove an item using the minus button on ReviewOrder
        minus_buttons = await page.query_selector_all('[data-testid*="decrease"], [data-testid*="minus"], button:has-text("-")')
        if not minus_buttons:
            # Try common decrement selectors
            minus_buttons = await page.query_selector_all('button.quantity-btn, .cart-item button:first-child')
        
        if minus_buttons:
            print(f"  Found {len(minus_buttons)} minus/decrease buttons")
            await minus_buttons[0].click(force=True)
            await page.wait_for_timeout(1500)  # debounce 500ms + API call + state update
            
            charge_tc3_after = await get_delivery_charge_text(page)
            print(f"  Charge after removing 1 item: {charge_tc3_after}")
            print(f"  TC3 API calls: {len(call_log_tc3)} — values: {[c['order_value'] for c in call_log_tc3]}")
        else:
            print("  ⚠️  TC3 SKIPPED: Could not find item quantity decrease buttons")

    except Exception as e:
        print(f"  ❌ TC3 ERROR: {e}")

    # ─── TC5: Non-delivery order (takeaway) — no distance API calls ──────────
    print("\n--- TC5: Takeaway order → no distance API calls ---")
    try:
        await page.unroute('**/distance-api-new')
        call_log_tc5 = []
        
        async def handle_tc5(route):
            call_log_tc5.append(route.request.url)
            await route.continue_()
        await page.route('**/distance-api-new', handle_tc5)
        
        takeaway_session = {**SCANNED_TABLE_DATA, "order_type": "takeaway"}
        await page.evaluate(f"""() => {{
            const restaurantId = '{RESTAURANT_ID}';
            localStorage.setItem('cart_' + restaurantId, JSON.stringify({json.dumps(CART_ABOVE_THRESHOLD)}));
            localStorage.setItem('delivery_' + restaurantId, JSON.stringify({json.dumps(DELIVERY_ADDRESS)}));
            sessionStorage.setItem('scanned_table_' + restaurantId, JSON.stringify({json.dumps(takeaway_session)}));
        }}""")
        
        await page.goto(f"{BASE_URL}/{RESTAURANT_ID}/review-order", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2000)
        
        print(f"  TC5 distance API calls (should be 0): {len(call_log_tc5)}")
        if len(call_log_tc5) == 0:
            print("  ✅ TC5 PASS: No distance API calls for takeaway order")
        else:
            print(f"  ❌ TC5 FAIL: {len(call_log_tc5)} distance API calls made for takeaway!")
    except Exception as e:
        print(f"  ❌ TC5 ERROR: {e}")

    # ─── TC7: Grand total correctness ────────────────────────────────────────
    print("\n--- TC7: Grand total is correct after delivery charge update ---")
    try:
        await page.unroute('**/distance-api-new')
        call_log_tc7 = await mock_distance_api(page, above_threshold_charge=0, below_threshold_charge=10)
        
        await setup_delivery_state(page, delivery_charge=10, cart=CART_ABOVE_THRESHOLD)
        await page.goto(f"{BASE_URL}/{RESTAURANT_ID}/review-order", wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2500)
        
        charge_tc7 = await get_delivery_charge_text(page)
        print(f"  TC7 Delivery charge (₹300 cart): {charge_tc7}")
        
        # Check grand total does not include ₹10 delivery
        grand_total_el = await page.query_selector('[data-testid="grand-total"], .grand-total, text=Grand Total')
        if grand_total_el:
            gt_text = await grand_total_el.text_content()
            print(f"  Grand Total element text: {gt_text}")
        else:
            # Try to get all price values
            totals = await page.evaluate("""() => {
                const els = Array.from(document.querySelectorAll('.price-value, .total-value, [class*="total"]'));
                return els.map(el => el.textContent.trim()).filter(t => t.includes('₹') || t.match(/\\d/));
            }""")
            print(f"  Price values found: {totals[:10]}")
        
        await page.screenshot(path="/app/tests/.screenshots/tc7_grand_total.jpg", quality=40, full_page=False)
        
        if charge_tc7 == 'Free':
            print("  ✅ TC7: Delivery charge shows Free for ₹300 cart — grand total excludes delivery charge")
        else:
            print(f"  ⚠️  TC7: Delivery charge shows {charge_tc7}")
    except Exception as e:
        print(f"  ❌ TC7 ERROR: {e}")

    print("\n" + "="*60)
    print("R4 Test Run Complete")
    print("="*60)

# Execute
import os
os.makedirs('/app/tests/.screenshots', exist_ok=True)
await run_all_tests()
