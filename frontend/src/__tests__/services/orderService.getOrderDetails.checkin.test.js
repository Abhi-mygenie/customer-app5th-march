/**
 * CR Fix — Live path test.
 *
 * Validates that `getOrderDetails` (the function actually called by
 * OrderSuccess + edit-order flow) hides the POS "Check In" system item
 * from the items it returns, while keeping all backend totals unchanged.
 *
 * The previous test only exercised `transformOrderDetails`, which is NOT
 * called by the live app — that path was dead.
 */

jest.mock('../../api/config/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const apiClient = require('../../api/config/axios').default;
const { getOrderDetails } = require('../../api/services/orderService');

const checkInDetail = (id = 1, price = '1.00') => ({
  id,
  food_id: 99001,
  order_id: 999,
  quantity: 1,
  unit_price: price,
  discount_on_food: '0',
  discount_type: 'amount',
  tax_amount: '0',
  food_level_notes: null,
  foodStatus: 5,
  food_details: { id: 99001, name: 'Check In', price: parseFloat(price), tax: 0 },
  variation: [],
  add_ons: [],
  // API denormalises order totals onto every detail row
  order_amount: '100.00',
  order_sub_total_amount: '100.00',
  order_sub_total_without_tax: '100.00',
  total_tax_amount: '0',
  total_vat_tax_amount: '0',
  total_service_tax_amount: '0',
});

const realDetail = (id, name, price = '100.00') => ({
  id,
  food_id: id + 1000,
  order_id: 999,
  quantity: 1,
  unit_price: price,
  discount_on_food: '0',
  discount_type: 'amount',
  tax_amount: '0',
  food_level_notes: null,
  foodStatus: 5,
  food_details: { id: id + 1000, name, price: parseFloat(price), tax: 0 },
  variation: [],
  add_ons: [],
  // API denormalises order totals onto every detail row
  order_amount: '100.00',
  order_sub_total_amount: '100.00',
  order_sub_total_without_tax: '100.00',
  total_tax_amount: '0',
  total_vat_tax_amount: '0',
  total_service_tax_amount: '0',
});

const apiResponse = (details, totals = {}) => ({
  data: {
    id: 999,
    order_amount: '100.00',
    order_sub_total_amount: '100.00',
    order_sub_total_without_tax: '100.00',
    table_no: 'Room 102',
    order_status: 'pending',
    order_type: 'dinein',
    fOrderStatus: 1,
    details,
    ...totals,
  },
});

describe('getOrderDetails (live path) — Check In system item filter', () => {
  beforeEach(() => apiClient.get.mockReset());

  test('hides Check In, keeps real items, preserves backend totals', async () => {
    apiClient.get.mockResolvedValueOnce(apiResponse([
      checkInDetail(1, '1.00'),
      realDetail(2, 'Veg Biryani', '100.00'),
    ]));
    const r = await getOrderDetails(999);
    expect(r.previousItems).toHaveLength(1);
    expect(r.previousItems[0].name).toBe('Veg Biryani');
    // Backend totals untouched (still 100, not 101 even though Check In carried ₹1)
    expect(r.orderAmount).toBe(100);
    expect(r.subtotal).toBe(100);
    expect(r.billSummary.grandTotal).toBe(100);
    expect(r.billSummary.subtotal).toBe(100);
  });

  test('all variants of "Check In" are hidden', async () => {
    const variants = ['CheckIn', 'check-in', 'CHECK IN', '  Check  In  ', 'check_in'];
    for (const v of variants) {
      apiClient.get.mockResolvedValueOnce(apiResponse([
        { ...checkInDetail(1, '1.00'), food_details: { id: 99001, name: v, tax: 0 } },
        realDetail(2, 'Pasta', '50.00'),
      ]));
      const r = await getOrderDetails(999);
      expect(r.previousItems.map((i) => i.name)).toEqual(['Pasta']);
    }
  });

  test('order containing ONLY Check In yields zero visible items + totals preserved', async () => {
    apiClient.get.mockResolvedValueOnce(apiResponse([checkInDetail(1, '1.00')]));
    const r = await getOrderDetails(999);
    expect(r.previousItems).toHaveLength(0);
    // Backend totals preserved from the original (unfiltered) firstDetail row,
    // even though every visible item was filtered out. Caller hides "Items
    // Ordered" card via length check; no monetary regression.
    expect(r.orderAmount).toBe(100);
    expect(r.billSummary.grandTotal).toBe(100);
  });

  test('regression: order without Check In is unchanged', async () => {
    apiClient.get.mockResolvedValueOnce(apiResponse([
      realDetail(1, 'Veg Biryani', '100.00'),
      realDetail(2, 'Coke', '40.00'),
    ]));
    const r = await getOrderDetails(999);
    expect(r.previousItems.map((i) => i.name)).toEqual(['Veg Biryani', 'Coke']);
  });

  test('substring "Check Inside" is NOT filtered (exact match only)', async () => {
    apiClient.get.mockResolvedValueOnce(apiResponse([
      realDetail(1, 'Check Inside', '50.00'),
      realDetail(2, 'Soup', '40.00'),
    ]));
    const r = await getOrderDetails(999);
    expect(r.previousItems.map((i) => i.name)).toEqual(['Check Inside', 'Soup']);
  });

  test('subtotal contract — non-degenerate echo: order_sub_total_amount=Item Total, order_sub_total_without_tax=Pre-tax Subtotal', async () => {
    // Backend-confirmed contract:
    //   order_sub_total_amount      → billSummary.itemTotal  (pure food = 100)
    //   order_sub_total_without_tax → billSummary.subtotal   (pre-tax billable = 109, incl. SC)
    // Sample case: item ₹100 + service charge ₹9 → pre-tax ₹109 → tax ₹6.62 → grand ₹116.
    const detail = {
      ...realDetail(1, 'Veg Biryani', '100.00'),
      order_amount: '116.00',
      order_sub_total_amount: '100.00',
      order_sub_total_without_tax: '109.00',
      total_tax_amount: '6.62',
      total_service_tax_amount: '9.00',
      service_gst_tax_amount: '1.62',
    };
    apiClient.get.mockResolvedValueOnce({
      data: {
        id: 999,
        order_amount: '116.00',
        order_sub_total_amount: '100.00',
        order_sub_total_without_tax: '109.00',
        table_no: 'Room 102',
        order_status: 'pending',
        order_type: 'dinein',
        fOrderStatus: 1,
        details: [detail],
      },
    });
    const r = await getOrderDetails(999);
    expect(r.billSummary.itemTotal).toBe(100);
    expect(r.billSummary.subtotal).toBe(109);
    expect(r.billSummary.grandTotal).toBe(116);
    expect(r.subtotalWithoutTax).toBe(100);
    expect(r.subtotal).toBe(109);
    expect(r.orderAmount).toBe(116);
  });
});
