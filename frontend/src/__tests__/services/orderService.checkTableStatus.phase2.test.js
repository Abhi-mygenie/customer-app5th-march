/**
 * CR Phase-2 — checkTableStatus must surface tableType + guest details
 * from /customer/check-table-status response, defensively reading both
 * `table_type` and `"table type"` (with space — the live key).
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
const { checkTableStatus } = require('../../api/services/orderService');

describe('checkTableStatus — Phase 2 guest data extraction', () => {
  beforeEach(() => apiClient.get.mockReset());

  test('parses live API shape: "table type" (with space) and userinfo', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        status: {
          table_status: 'Not Available',
          order_id: 825740,
          'table type': 'RM',
          userinfo: { f_name: 'bolt', l_name: '', phone: '9626975145' },
        },
      },
    });
    const r = await checkTableStatus('1', '28', 'tok');
    expect(r.tableStatus).toBe('Not Available');
    expect(r.tableType).toBe('RM');
    expect(r.guest).toEqual({ firstName: 'bolt', lastName: '', phone: '9626975145' });
    expect(r.isOccupied).toBe(true);     // order_id present
    expect(r.isAvailable).toBe(false);
  });

  test('parses underscore variant `table_type` (future-proof)', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        status: {
          table_status: 'Not Available',
          order_id: 0,
          table_type: 'RM',
          userinfo: { f_name: 'Alice', l_name: 'Sharma', phone: '+919876543210' },
        },
      },
    });
    const r = await checkTableStatus('1', '28', 'tok');
    expect(r.tableType).toBe('RM');
    expect(r.guest.firstName).toBe('Alice');
    expect(r.guest.lastName).toBe('Sharma');
    // phone normalisation — service strips non-digits, passes raw 10/12 digits to caller
    expect(r.guest.phone).toBe('919876543210');
  });

  test('Available room — guest is null-safe', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        status: { table_status: 'Available', order_id: '', 'table type': 'RM' },
      },
    });
    const r = await checkTableStatus('1', '28', 'tok');
    expect(r.isAvailable).toBe(true);
    expect(r.tableType).toBe('RM');
    expect(r.guest).toBeNull();
  });

  test('Invalid table — preserves shape with nulls', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: { status: { table_status: 'Invalid Table ID or QR code' } },
    });
    const r = await checkTableStatus('999', '28', 'tok');
    expect(r.isInvalid).toBe(true);
    expect(r.tableType).toBeNull();
    expect(r.guest).toBeNull();
  });

  test('Network / parse error — safe defaults', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('timeout'));
    const r = await checkTableStatus('1', '28', 'tok');
    expect(r.isAvailable).toBe(true);    // safe-default fallback (existing behaviour)
    expect(r.tableType).toBeNull();
    expect(r.guest).toBeNull();
    expect(r.error).toBe('timeout');
  });

  test('userinfo with whitespace + special chars in name is trimmed', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        status: {
          table_status: 'Not Available',
          order_id: 0,
          'table type': 'RM',
          userinfo: { f_name: '  Priya  ', l_name: '  K.  ', phone: ' 98765 43210 ' },
        },
      },
    });
    const r = await checkTableStatus('1', '28', 'tok');
    expect(r.guest.firstName).toBe('Priya');
    expect(r.guest.lastName).toBe('K.');
    expect(r.guest.phone).toBe('9876543210');
  });
});
