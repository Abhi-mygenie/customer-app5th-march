import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();
const mockSetRestaurantScope = jest.fn();
const mockSetDeliveryAddress = jest.fn();
const mockSetDeliveryCharge = jest.fn();
const mockCrmGetAddresses = jest.fn();

var mockToast = Object.assign(jest.fn(), {
  error: jest.fn(),
  success: jest.fn(),
});

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ restaurantId: '716' }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    crmToken: 'crm-token-716',
    isCustomer: true,
    user: { name: 'Maps Test User', phone: '+919999998888' },
    setRestaurantScope: mockSetRestaurantScope,
  }),
}));

jest.mock('../../context/CartContext', () => ({
  useCart: () => ({
    setDeliveryAddress: mockSetDeliveryAddress,
    setDeliveryCharge: mockSetDeliveryCharge,
  }),
}));

jest.mock('../../context/RestaurantConfigContext', () => ({
  useRestaurantConfig: () => ({
    primaryColor: '#1d4ed8',
    buttonTextColor: '#ffffff',
  }),
}));

jest.mock('../../api/services/crmService', () => ({
  crmGetAddresses: (...args) => mockCrmGetAddresses(...args),
  crmAddAddress: jest.fn(),
  crmDeleteAddress: jest.fn(),
  crmSetDefaultAddress: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: mockToast,
}));

jest.mock('@react-google-maps/api', () => ({
  useJsApiLoader: () => ({ isLoaded: true }),
  GoogleMap: ({ children }) => <div data-testid="mock-google-map">{children}</div>,
  Marker: () => <div data-testid="mock-google-marker" />,
}));

import DeliveryAddress from '../../pages/DeliveryAddress';

describe('DeliveryAddress map guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({
      addresses: [
        {
          id: 'addr-empty',
          address_type: 'Home',
          address: '',
          house: '',
          road: '',
          city: '',
          state: '',
          pincode: '',
          latitude: '',
          longitude: '',
          contact_person_name: 'Maps Test User',
          contact_person_number: '9999998888',
          is_default: true,
        },
      ],
    });

    global.fetch = jest.fn();
    delete window.google;
  });

  test('does not call geocode API when a saved address has no queryable fields', async () => {
    render(<DeliveryAddress />);

    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    const addressCard = screen.getByTestId('address-card-addr-empty');
    fireEvent.click(addressCard);

    expect(mockSetRestaurantScope).toHaveBeenCalledWith('716');
    expect(mockCrmGetAddresses).toHaveBeenCalledWith('crm-token-716');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ============================================================
// Part A — DELIVERING TO header + SELECTED pill UX (Cases 1-3)
// ============================================================
describe('DeliveryAddress — Case 1: no saved addresses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({ addresses: [] });
    global.fetch = jest.fn();
    delete window.google;
  });

  test('renders DELIVERING TO label with "Please add or select" message', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    const header = screen.getByTestId('delivering-to-header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent('DELIVERING TO:');

    const text = screen.getByTestId('delivering-to-text');
    expect(text).toHaveTextContent('Please add or select a delivery address');
  });

  test('Confirm & Proceed is disabled when no address source set', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();
  });

  test('no SELECTED pill is rendered when no address is selected', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId(/^selected-pill-/)).not.toBeInTheDocument();
  });
});

describe('DeliveryAddress — Case 2: saved addresses, no default (auto-select first)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({
      addresses: [
        {
          id: 'addr-1',
          address_type: 'Home',
          address: '12 First Saved Lane',
          house: 'A1',
          city: 'Shimla',
          latitude: '31.04',
          longitude: '77.12',
          contact_person_name: 'Alice',
          is_default: false,
        },
        {
          id: 'addr-2',
          address_type: 'Work',
          address: '99 Other Road',
          house: 'B2',
          city: 'Shimla',
          latitude: '31.05',
          longitude: '77.13',
          contact_person_name: 'Bob',
          is_default: false,
        },
      ],
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ shipping_status: 'Yes', shipping_charge: 0, shipping_time: '20 min', distance: '2 km' }),
      })
    );
    delete window.google;
  });

  test('first saved address is auto-selected; SELECTED pill renders on it', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('selected-pill-addr-1')).toBeInTheDocument();
    expect(screen.queryByTestId('selected-pill-addr-2')).not.toBeInTheDocument();
  });

  test('header shows the first card address text', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('12 First Saved Lane');
  });

  test('tapping a different card moves the SELECTED pill', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('address-card-addr-2'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-pill-addr-2')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('selected-pill-addr-1')).not.toBeInTheDocument();
  });
});

describe('DeliveryAddress — Case 3: default address exists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({
      addresses: [
        {
          id: 'addr-non-default',
          address_type: 'Work',
          address: '7 Mall Road',
          house: 'B2',
          city: 'Shimla',
          latitude: '31.05',
          longitude: '77.13',
          contact_person_name: 'Bob',
          is_default: false,
        },
        {
          id: 'addr-default',
          address_type: 'Home',
          address: '5 Cart Road',
          house: 'A1',
          city: 'Shimla',
          latitude: '31.04',
          longitude: '77.12',
          contact_person_name: 'Alice',
          is_default: true,
        },
      ],
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ shipping_status: 'Yes', shipping_charge: 0, shipping_time: '20 min', distance: '2 km' }),
      })
    );
    delete window.google;
  });

  test('default address is auto-selected; both Default + SELECTED pills show on it', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    const defaultCard = screen.getByTestId('address-card-addr-default');
    expect(defaultCard).toHaveTextContent('Default');
    expect(screen.getByTestId('selected-pill-addr-default')).toBeInTheDocument();
    expect(screen.queryByTestId('selected-pill-addr-non-default')).not.toBeInTheDocument();
  });

  test('header shows default address text', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('5 Cart Road');
  });

  test('selecting non-default moves SELECTED; Default pill stays on default card', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('address-card-addr-non-default'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-pill-addr-non-default')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('selected-pill-addr-default')).not.toBeInTheDocument();
    expect(screen.getByTestId('address-card-addr-default')).toHaveTextContent('Default');
  });
});
