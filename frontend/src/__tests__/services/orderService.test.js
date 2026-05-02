/**
 * Tests for order service transformation functions
 * Tests the internal transform logic by calling placeOrder with mocked axios
 * 
 * Since the transform functions (transformVariations, transformAddOns, etc.)
 * are not exported, we test them indirectly through placeOrder.
 * We mock axios to capture the payload sent and validate transformations.
 */

import { placeOrder } from '../../api/services/orderService';

// Mock axios module
jest.mock('../../api/config/axios', () => {
  const mockPost = jest.fn(() => Promise.resolve({ data: { order_id: 'ORD123', total_amount: 100 } }));
  return {
    __esModule: true,
    default: {
      post: mockPost,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    },
  };
});

// Get reference to the mock
const apiClient = require('../../api/config/axios').default;

beforeEach(() => {
  apiClient.post.mockClear();
  apiClient.post.mockResolvedValue({ data: { order_id: 'ORD123', total_amount: 100 } });
});

// ─── Helper: build cart items ────────────────────────────────────

const makeCartItem = (overrides = {}) => ({
  cartId: 'test_cart_1',
  itemId: '501',
  quantity: 1,
  item: {
    id: '501',
    name: 'Test Item',
    price: 200,
    description: 'Test',
    station: 'MAIN',
    tax: 0,
    tax_type: 'GST',
    variations: [],
    add_ons: [],
    ...overrides.item,
  },
  variations: overrides.variations || [],
  add_ons: overrides.add_ons || [],
  cookingInstructions: overrides.cookingInstructions || '',
  addedAt: Date.now(),
});

const makeOrderData = (overrides = {}) => ({
  cartItems: [makeCartItem()],
  customerName: 'Test User',
  customerPhone: '+919876543210',
  tableNumber: '5',
  specialInstructions: 'No spice',
  couponCode: '0',
  restaurantId: '478',
  subtotal: 200,
  totalToPay: 200,
  totalTax: 0,
  orderType: 'dinein',
  isMultipleMenuType: false,
  token: 'test-jwt-token',
  ...overrides,
});

// ─── Normal restaurant order ─────────────────────────────────────

describe('placeOrder - Normal restaurant', () => {
  test('calls correct endpoint for normal restaurant', async () => {
    await placeOrder(makeOrderData());

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [endpoint] = apiClient.post.mock.calls[0];
    expect(endpoint).toContain('/customer/order/place');
    expect(endpoint).not.toContain('autopaid');
  });

  test('sends correct payload structure', async () => {
    await placeOrder(makeOrderData());

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload).toHaveProperty('data');
    expect(payload.data).toHaveProperty('cart');
    expect(payload.data).toHaveProperty('order_amount');
    expect(payload.data).toHaveProperty('order_type');
  });

  test('transforms cart item correctly', async () => {
    await placeOrder(makeOrderData());

    const [, payload] = apiClient.post.mock.calls[0];
    const cart = payload.data.cart;

    expect(cart.length).toBe(1);
    expect(cart[0].food_id).toBe(501);
    expect(cart[0].price).toBe('200.00');
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].station).toBe('MAIN');
    expect(cart[0].variations).toEqual([]);
    expect(cart[0].add_on_ids).toEqual([]);
  });

  test('includes customer name and phone', async () => {
    await placeOrder(makeOrderData());

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.data.cust_name).toBe('Test User');
    expect(payload.data.cust_phone).toBe('9876543210'); // without +91
    expect(payload.data.dial_code).toBe('+91');
  });

  test('extracts phone correctly for +91 numbers', async () => {
    await placeOrder(makeOrderData({ customerPhone: '+919876543210' }));

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.data.cust_phone).toBe('9876543210');
    expect(payload.data.dial_code).toBe('+91');
  });

  test('handles empty phone', async () => {
    await placeOrder(makeOrderData({ customerPhone: '' }));

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.data.cust_phone).toBe('');
    expect(payload.data.dial_code).toBe('+91');
  });

  test('includes special instructions', async () => {
    await placeOrder(makeOrderData({ specialInstructions: 'Extra napkins' }));

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.data.order_note).toBe('Extra napkins');
  });

  test('sets order_type based on orderType param', async () => {
    await placeOrder(makeOrderData({ orderType: 'takeaway' }));
    const [, payload1] = apiClient.post.mock.calls[0];
    expect(payload1.data.order_type).toBe('take_away');

    apiClient.post.mockClear();
    apiClient.post.mockResolvedValue({ data: { order_id: 'ORD124' } });

    await placeOrder(makeOrderData({ orderType: 'delivery' }));
    const [, payload2] = apiClient.post.mock.calls[0];
    expect(payload2.data.order_type).toBe('delivery');
  });

  test('includes table_id', async () => {
    await placeOrder(makeOrderData({ tableNumber: '42' }));

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.data.table_id).toBe('42');
  });

  test('sends Authorization header', async () => {
    await placeOrder(makeOrderData());

    const [, , config] = apiClient.post.mock.calls[0];
    expect(config.headers.Authorization).toBe('Bearer test-jwt-token');
  });
});

// ─── 716 restaurant order (autopaid) ────────────────────────────

describe('placeOrder - Restaurant 716 (autopaid)', () => {
  test('calls autopaid endpoint', async () => {
    await placeOrder(makeOrderData({ isMultipleMenuType: true }));

    const [endpoint] = apiClient.post.mock.calls[0];
    expect(endpoint).toContain('autopaid');
  });

  test('cart items include tax fields', async () => {
    const cartItem = makeCartItem({
      item: { tax: 5, tax_type: 'GST' },
    });
    
    await placeOrder(makeOrderData({
      cartItems: [cartItem],
      isMultipleMenuType: true,
    }));

    const [, payload] = apiClient.post.mock.calls[0];
    const item = payload.data.cart[0];

    expect(item).toHaveProperty('gst_tax_amount');
    expect(item).toHaveProperty('vat_tax_amount');
    expect(item).toHaveProperty('tax_amount');
    expect(item).toHaveProperty('total_variation_price');
    expect(item).toHaveProperty('total_add_on_price');
    expect(item).toHaveProperty('discount_on_food');
  });

  test('calculates GST tax correctly', async () => {
    const cartItem = makeCartItem({
      item: { price: 200, tax: 10, tax_type: 'GST' },
    });

    await placeOrder(makeOrderData({
      cartItems: [cartItem],
      isMultipleMenuType: true,
    }));

    const [, payload] = apiClient.post.mock.calls[0];
    const item = payload.data.cart[0];

    // 10% of 200 = 20
    expect(item.gst_tax_amount).toBe(20);
    expect(item.vat_tax_amount).toBe(0);
    expect(item.tax_amount).toBe(20);
  });

  test('calculates VAT tax correctly', async () => {
    const cartItem = makeCartItem({
      item: { price: 200, tax: 5, tax_type: 'VAT' },
    });

    await placeOrder(makeOrderData({
      cartItems: [cartItem],
      isMultipleMenuType: true,
    }));

    const [, payload] = apiClient.post.mock.calls[0];
    const item = payload.data.cart[0];

    // 5% of 200 = 10
    expect(item.gst_tax_amount).toBe(0);
    expect(item.vat_tax_amount).toBe(10);
  });

  test('includes 716-specific root fields', async () => {
    await placeOrder(makeOrderData({ isMultipleMenuType: true }));

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.data).toHaveProperty('total_gst_tax_amount');
    expect(payload.data).toHaveProperty('total_vat_tax_amount');
    expect(payload.data).toHaveProperty('total_service_tax_amount', 0);
    expect(payload.data).toHaveProperty('service_gst_tax_amount', 0);
    expect(payload.data).toHaveProperty('round_up', 0);
    expect(payload.data).toHaveProperty('tip_tax_amount', 0);
  });

  test('sets payment_type to prepaid for 716', async () => {
    await placeOrder(makeOrderData({ isMultipleMenuType: true }));

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.data.payment_type).toBe('prepaid');
  });

  test('sets payment_type to postpaid for normal', async () => {
    await placeOrder(makeOrderData({ isMultipleMenuType: false }));

    const [, payload] = apiClient.post.mock.calls[0];
    expect(payload.data.payment_type).toBe('postpaid');
  });
});

// ─── Variations transformation ───────────────────────────────────

describe('placeOrder - Variations transformation', () => {
  test('transforms variations correctly', async () => {
    const cartItem = makeCartItem({
      item: {
        variations: [
          {
            name: 'SIZE',
            values: [
              { label: 'Small', optionPrice: 0 },
              { label: 'Large', optionPrice: 50 },
            ],
          },
        ],
      },
      variations: [{ label: 'Large', optionPrice: 50 }],
    });

    await placeOrder(makeOrderData({ cartItems: [cartItem] }));

    const [, payload] = apiClient.post.mock.calls[0];
    const variations = payload.data.cart[0].variations;

    expect(variations.length).toBe(1);
    expect(variations[0].name).toBe('SIZE');
    expect(variations[0].values.label).toEqual(['Large']);
  });

  test('includes variation price in item price', async () => {
    const cartItem = makeCartItem({
      item: {
        price: 200,
        variations: [
          {
            name: 'SIZE',
            values: [{ label: 'Large', optionPrice: 50 }],
          },
        ],
      },
      variations: [{ label: 'Large', optionPrice: 50 }],
    });

    await placeOrder(makeOrderData({ cartItems: [cartItem] }));

    const [, payload] = apiClient.post.mock.calls[0];
    // 200 + 50 = 250
    expect(payload.data.cart[0].price).toBe('250.00');
  });
});

// ─── Add-ons transformation ──────────────────────────────────────

describe('placeOrder - Add-ons transformation', () => {
  test('transforms add-ons correctly', async () => {
    const cartItem = makeCartItem({
      add_ons: [
        { id: 10, name: 'Cheese', price: 30, quantity: 2 },
        { id: 11, name: 'Sauce', price: 15, quantity: 1 },
      ],
    });

    await placeOrder(makeOrderData({ cartItems: [cartItem] }));

    const [, payload] = apiClient.post.mock.calls[0];
    const cart = payload.data.cart[0];

    expect(cart.add_on_ids).toEqual([10, 11]);
    expect(cart.add_on_qtys).toEqual([2, 1]);
    expect(cart.add_ons.length).toBe(2);
    expect(cart.add_ons[0].name).toBe('Cheese');
  });

  test('skips add-ons with quantity 0', async () => {
    const cartItem = makeCartItem({
      add_ons: [
        { id: 10, name: 'Cheese', price: 30, quantity: 0 },
        { id: 11, name: 'Sauce', price: 15, quantity: 1 },
      ],
    });

    await placeOrder(makeOrderData({ cartItems: [cartItem] }));

    const [, payload] = apiClient.post.mock.calls[0];
    const cart = payload.data.cart[0];

    expect(cart.add_on_ids).toEqual([11]);
    expect(cart.add_on_qtys).toEqual([1]);
  });

  test('includes add-on price in item price', async () => {
    const cartItem = makeCartItem({
      item: { price: 200 },
      add_ons: [{ id: 10, name: 'Cheese', price: 30, quantity: 2 }],
    });

    await placeOrder(makeOrderData({ cartItems: [cartItem] }));

    const [, payload] = apiClient.post.mock.calls[0];
    // 200 + (30 * 2) = 260
    expect(payload.data.cart[0].price).toBe('260.00');
  });
});

// ─── Error handling ──────────────────────────────────────────────

describe('placeOrder - Error handling', () => {
  test('throws on API failure', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Network error'));

    await expect(placeOrder(makeOrderData())).rejects.toThrow('Network error');
  });
});

// ─── SERVICE_CHARGE_MAPPING CR ───────────────────────────────────
//
// Note: placeOrder() wraps the payload in a FormData. Existing tests in this file
// read `payload.data` directly (which is undefined because the 2nd post arg is a
// FormData instance, not a plain object). That's a pre-existing test-infra issue
// — out of scope for SERVICE_CHARGE_MAPPING. The tests below correctly deserialize
// the FormData so they actually validate the SC fields in the JSON payload.

const extractPayload = (formDataArg) => {
  // jsdom FormData supports .get(); the source code does formData.append('data', JSON.stringify(payloadData))
  const json = formDataArg && typeof formDataArg.get === 'function' ? formDataArg.get('data') : null;
  return json ? JSON.parse(json) : null;
};

describe('placeOrder - Service Charge Mapping (multi-menu)', () => {
  test('zero-baseline: no SC fields populated when serviceCharge omitted (auto_service_charge != Yes)', async () => {
    await placeOrder(makeOrderData({
      isMultipleMenuType: true,
    }));
    const [, formArg] = apiClient.post.mock.calls[0];
    const payload = extractPayload(formArg);
    expect(payload).not.toBeNull();
    expect(payload.total_service_tax_amount).toBe(0);
    expect(payload.service_gst_tax_amount).toBe(0);
  });

  test('positive: SC populates total_service_tax_amount, inflates total_gst_tax_amount, maps subtotal & itemTotal correctly', async () => {
    // Worked example (handover §3): cart 1 item GST 18%, SC=60 (5%), gstOnSc=10.80 (18%), totalTax=246.80
    const cartItem = makeCartItem({
      item: { price: 200, tax: 18, tax_type: 'GST' },
      quantity: 1,
    });
    await placeOrder(makeOrderData({
      cartItems: [cartItem],
      isMultipleMenuType: true,
      subtotal: 200,
      totalToPay: 1507,
      totalTax: 246.80,
      serviceCharge: 60,
      gstOnServiceCharge: 10.80,
      itemTotal: 1200,
      finalSubtotal: 1260,
    }));
    const [, formArg] = apiClient.post.mock.calls[0];
    const payload = extractPayload(formArg);
    expect(payload).not.toBeNull();
    expect(payload.total_service_tax_amount).toBeCloseTo(60, 2);
    expect(payload.service_gst_tax_amount).toBe(0);
    expect(payload.order_sub_total_without_tax).toBeCloseTo(1200, 2);
    expect(payload.order_sub_total_amount).toBeCloseTo(1260, 2);
    // total_gst_tax_amount = item GST (200*18%=36) + SC-GST (10.80) = 46.80
    expect(payload.total_gst_tax_amount).toBeCloseTo(46.80, 2);
  });

  test('per-item service_charge allocated proportionally; sum equals total SC', async () => {
    // 3 items, total 1000; SC 50 (5%); allocation: 200/1000*50=10, 300/1000*50=15, last gets remainder 25
    const cartItem1 = makeCartItem({ cartId: 'c1', itemId: '1', item: { id: '1', name: 'A', price: 200, tax: 0, tax_type: 'GST' }, quantity: 1 });
    const cartItem2 = makeCartItem({ cartId: 'c2', itemId: '2', item: { id: '2', name: 'B', price: 300, tax: 0, tax_type: 'GST' }, quantity: 1 });
    const cartItem3 = makeCartItem({ cartId: 'c3', itemId: '3', item: { id: '3', name: 'C', price: 500, tax: 0, tax_type: 'GST' }, quantity: 1 });
    await placeOrder(makeOrderData({
      cartItems: [cartItem1, cartItem2, cartItem3],
      isMultipleMenuType: true,
      subtotal: 1000,
      totalToPay: 1050,
      totalTax: 0,
      serviceCharge: 50,
      gstOnServiceCharge: 0,
      itemTotal: 1000,
      finalSubtotal: 1050,
    }));
    const [, formArg] = apiClient.post.mock.calls[0];
    const payload = extractPayload(formArg);
    expect(payload).not.toBeNull();
    const cart = payload.cart;
    expect(cart).toHaveLength(3);
    expect(cart[0].service_charge).toBeCloseTo(10, 2);
    expect(cart[1].service_charge).toBeCloseTo(15, 2);
    // Last item gets the remainder (handles rounding drift)
    expect(cart[2].service_charge).toBeCloseTo(25, 2);
    const sum = cart.reduce((s, it) => s + it.service_charge, 0);
    expect(sum).toBeCloseTo(50, 2);
  });

  test('zero SC: per-item service_charge = 0 on every line (zero regression)', async () => {
    await placeOrder(makeOrderData({
      isMultipleMenuType: true,
    }));
    const [, formArg] = apiClient.post.mock.calls[0];
    const payload = extractPayload(formArg);
    expect(payload).not.toBeNull();
    payload.cart.forEach((item) => {
      expect(item.service_charge).toBe(0);
    });
  });
});

describe('placeOrder - Service Charge Mapping (normal path)', () => {
  test('SC fields appear on normal placeOrder payload', async () => {
    await placeOrder(makeOrderData({
      isMultipleMenuType: false,
      subtotal: 1000,
      totalToPay: 1115,
      totalTax: 65,
      serviceCharge: 50,
      gstOnServiceCharge: 9,
      itemTotal: 1000,
      finalSubtotal: 1050,
    }));
    const [, formArg] = apiClient.post.mock.calls[0];
    const payload = extractPayload(formArg);
    expect(payload).not.toBeNull();
    expect(payload.total_service_tax_amount).toBeCloseTo(50, 2);
    expect(payload.service_gst_tax_amount).toBe(0);
    expect(payload.order_sub_total_amount).toBeCloseTo(1050, 2);
    expect(payload.order_sub_total_without_tax).toBeCloseTo(1000, 2);
    expect(payload.tax_amount).toBeCloseTo(65, 2);
  });

  test('zero-baseline: normal placeOrder without SC keeps existing field shape', async () => {
    await placeOrder(makeOrderData({
      isMultipleMenuType: false,
    }));
    const [, formArg] = apiClient.post.mock.calls[0];
    const payload = extractPayload(formArg);
    expect(payload).not.toBeNull();
    expect(payload.total_service_tax_amount).toBe(0);
    expect(payload.service_gst_tax_amount).toBe(0);
  });
});

