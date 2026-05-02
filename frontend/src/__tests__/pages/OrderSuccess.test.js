/**
 * Tests for OrderSuccess page rendering
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Inline react-router-dom mock with order state
const orderState = {
  orderId: 'ORD-123',
  tokenNumber: 'T42',
  prepTime: '15-20 mins',
  tableNumber: '7',
  status: 'placed',
  totalToPay: 850,
};

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/478/success',
    search: '',
    hash: '',
    state: {
      orderData: {
        orderId: 'ORD-123',
        tokenNumber: 'T42',
        prepTime: '15-20 mins',
        tableNumber: '7',
        status: 'placed',
        totalToPay: 850,
      },
    },
  }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

jest.mock('../../utils/useRestaurantId', () => ({
  useRestaurantId: () => ({ restaurantId: '478' }),
}));
jest.mock('../../hooks/useScannedTable', () => ({
  useScannedTable: () => ({ tableNo: '7', roomOrTable: 'table', isScanned: true }),
}));
jest.mock('../../api/utils/restaurantIdConfig', () => ({
  isMultipleMenu: jest.fn(() => false),
}));

jest.mock('../../hooks/useMenuData', () => ({
  useRestaurantDetails: jest.fn().mockReturnValue({
    restaurant: {
      id: '478',
      name: 'Test Restaurant',
      logo: '/test-logo.png',
      phone: '+919876543210',
      success_config: {
        show_status_tracker: 'Y',
        show_call_waiter: 'Y',
        show_pay_bill: 'Y',
        show_edit_order: 'Y',
        show_table_number: 'Y',
        show_token_number: 'Y',
        show_prep_time: 'Y',
        show_order_more: 'Y',
      },
    },
    loading: false,
    error: null,
  }),
}));

import { useRestaurantDetails } from '../../hooks/useMenuData';
import OrderSuccess from '../../pages/OrderSuccess';

const defaultReturn = {
  restaurant: {
    id: '478',
    name: 'Test Restaurant',
    logo: '/test-logo.png',
    phone: '+919876543210',
    success_config: {
      show_status_tracker: 'Y',
      show_call_waiter: 'Y',
      show_pay_bill: 'Y',
      show_edit_order: 'Y',
      show_table_number: 'Y',
      show_token_number: 'Y',
      show_prep_time: 'Y',
      show_order_more: 'Y',
    },
  },
  loading: false,
  error: null,
};

describe('OrderSuccess', () => {
  beforeEach(() => useRestaurantDetails.mockReturnValue(defaultReturn));
  afterEach(() => jest.clearAllMocks());

  test('renders success icon', () => {
    render(<OrderSuccess />);
    expect(screen.getByTestId('order-success-icon')).toBeInTheDocument();
  });

  test('renders "Order Placed!" title', () => {
    render(<OrderSuccess />);
    expect(screen.getByText('Order Placed!')).toBeInTheDocument();
  });

  test('shows order ID in the card', () => {
    render(<OrderSuccess />);
    const card = screen.getByTestId('order-success-card');
    expect(card).toHaveTextContent('Order ID');
    expect(card).toHaveTextContent('ORD-123');
  });

  test('shows table number row', () => {
    render(<OrderSuccess />);
    expect(screen.getByTestId('order-success-table')).toBeInTheDocument();
  });

  test('shows token number row', () => {
    render(<OrderSuccess />);
    expect(screen.getByTestId('order-success-token')).toBeInTheDocument();
  });

  test('shows preparation time', () => {
    render(<OrderSuccess />);
    expect(screen.getByTestId('order-success-prep-time')).toBeInTheDocument();
    expect(screen.getByText('15-20 mins')).toBeInTheDocument();
  });

  test('renders status tracker', () => {
    render(<OrderSuccess />);
    expect(screen.getByTestId('order-status-tracker')).toBeInTheDocument();
  });

  test('renders status step labels', () => {
    render(<OrderSuccess />);
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  test('renders action buttons section', () => {
    render(<OrderSuccess />);
    expect(screen.getByTestId('order-success-actions')).toBeInTheDocument();
  });

  test('renders Call Waiter', () => {
    render(<OrderSuccess />);
    expect(screen.getByText('Call Waiter')).toBeInTheDocument();
  });

  test('renders Pay Bill', () => {
    render(<OrderSuccess />);
    expect(screen.getByText('Pay Bill')).toBeInTheDocument();
  });

  test('renders Edit Order', () => {
    render(<OrderSuccess />);
    expect(screen.getByText('Edit Order')).toBeInTheDocument();
  });

  test('renders Browse Menu button', () => {
    render(<OrderSuccess />);
    expect(screen.getByText('Browse Menu')).toBeInTheDocument();
    expect(screen.getByTestId('order-success-menu-btn')).toBeInTheDocument();
  });

  test('renders order card', () => {
    render(<OrderSuccess />);
    expect(screen.getByTestId('order-success-card')).toBeInTheDocument();
  });

  test('renders page container', () => {
    render(<OrderSuccess />);
    expect(screen.getByTestId('order-success-page')).toBeInTheDocument();
  });
});
