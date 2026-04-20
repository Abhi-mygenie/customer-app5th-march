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