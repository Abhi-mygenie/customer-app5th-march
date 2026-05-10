/**
 * CR Test — "Check In" system item must be filtered out of customer-facing
 * Items Ordered + Previously Ordered + bill itemTotal.
 */

const { transformOrderDetails } = require('../../api/transformers/orderTransformer');

const makeDetail = (id, name, price = '100.00', tax = 0, foodId = id) => ({
  id,
  food_id: foodId,
  order_id: 1,
  quantity: 1,
  unit_price: price,
  discount_on_food: '0',
  discount_type: 'amount',
  tax_amount: '0',
  food_level_notes: null,
  foodStatus: 5,
  food_details: {
    id: foodId,
    name,
    description: null,
    image: null,
    price: parseFloat(price),
    category_id: 1,
    veg: 1,
    available_time_starts: null,
    available_time_ends: null,
    tax,
    tax_type: 'percentage',
  },
  variation: [],
  add_ons: [],
  item_campaign_id: null,
  price: parseFloat(price),
  total_add_on_price: 0,
});

const baseResponse = (details) => ({
  order_id: 999,
  order_amount: '100.00',
  order_sub_total_amount: '100.00',
  order_sub_total_without_tax: '100.00',
  table_no: 'Room 102',
  order_status: 'pending',
  order_type: 'dinein',
  details,
});

describe('transformOrderDetails — Check In system item filter', () => {
  test('hides "Check In" but keeps a normal item alongside it', () => {
    const r = transformOrderDetails(
      baseResponse([makeDetail(1, 'Check In', '1.00'), makeDetail(2, 'Veg Biryani', '100.00')])
    );
    expect(r.items).toHaveLength(1);
    expect(r.previousItems).toHaveLength(1);
    expect(r.items[0].name).toBe('Veg Biryani');
    expect(r.previousItems[0].name).toBe('Veg Biryani');
    // billSummary.itemTotal should now equal only the visible item (100), not 101
    expect(r.billSummary.itemTotal).toBe(100);
  });

  test('case + whitespace + hyphen variants all match', () => {
    const variants = ['CheckIn', 'check-in', 'CHECK IN', '  Check  In  ', 'check_in'];
    variants.forEach((v) => {
      const r = transformOrderDetails(
        baseResponse([makeDetail(1, v, '1.00'), makeDetail(2, 'Pasta', '50.00')])
      );
      expect(r.items.map((i) => i.name)).toEqual(['Pasta']);
    });
  });

  test('order containing ONLY Check In yields empty arrays (caller hides card)', () => {
    const r = transformOrderDetails(baseResponse([makeDetail(1, 'Check In', '1.00')]));
    expect(r.items).toEqual([]);
    expect(r.previousItems).toEqual([]);
    expect(r.billSummary.itemTotal).toBe(0);
    // Backend grandTotal still reflects whatever the API returned (preserved as-is).
    expect(r.billSummary.grandTotal).toBe(100);
  });

  test('regression: order without Check In is unchanged', () => {
    const r = transformOrderDetails(
      baseResponse([makeDetail(1, 'Veg Biryani', '100.00'), makeDetail(2, 'Coke', '40.00')])
    );
    expect(r.items.map((i) => i.name)).toEqual(['Veg Biryani', 'Coke']);
    expect(r.previousItems).toHaveLength(2);
    expect(r.billSummary.itemTotal).toBe(140);
  });

  test('does NOT hide items whose name merely contains "check in" as substring', () => {
    // e.g. a bizarre but possible menu item named "Check Inside" should NOT be filtered
    const r = transformOrderDetails(
      baseResponse([makeDetail(1, 'Check Inside', '50.00'), makeDetail(2, 'Soup', '40.00')])
    );
    expect(r.items.map((i) => i.name)).toEqual(['Check Inside', 'Soup']);
  });

  test('handles missing/empty/null food_details name gracefully', () => {
    const detail = makeDetail(1, '', '50.00');
    detail.food_details.name = null;
    const r = transformOrderDetails(baseResponse([detail, makeDetail(2, 'Soup', '40.00')]));
    expect(r.items.map((i) => i.name)).toEqual(['Item', 'Soup']); // null name falls back to 'Item' and is NOT filtered
  });
});
