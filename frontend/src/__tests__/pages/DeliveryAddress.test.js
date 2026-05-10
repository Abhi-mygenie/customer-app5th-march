import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

// ============================================================
// Geolocation helpers
// ============================================================
const installGeolocation = (impl) => {
  // jsdom does not provide navigator.geolocation by default.
  Object.defineProperty(global.navigator, 'geolocation', {
    value: { getCurrentPosition: impl },
    configurable: true,
  });
};

const removeGeolocation = () => {
  Object.defineProperty(global.navigator, 'geolocation', {
    value: undefined,
    configurable: true,
  });
};

const gpsSuccess = (lat, lng) => (successCb) => {
  successCb({ coords: { latitude: lat, longitude: lng } });
};

const gpsDenied = () => (_successCb, errorCb) => {
  errorCb({ code: 1, message: 'User denied' });
};

const gpsNeverResolves = () => () => {
  // never invokes callbacks → simulates pending state
};

describe('DeliveryAddress — map guards (legacy regression)', () => {
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
    removeGeolocation();
    delete window.google;
  });

  test('does not call geocode API when a saved address has no queryable fields', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('address-card-addr-empty'));

    expect(mockSetRestaurantScope).toHaveBeenCalledWith('716');
    expect(mockCrmGetAddresses).toHaveBeenCalledWith('crm-token-716');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ============================================================
// Case 1 — first-time / no saved addresses, GPS denied
// ============================================================
describe('DeliveryAddress — Case 1: no saved addresses + GPS denied', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({ addresses: [] });
    global.fetch = jest.fn();
    installGeolocation(gpsDenied());
    delete window.google;
  });

  test('renders DELIVERING TO with "No delivery address selected" + hint after GPS denial', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    // Wait until GPS denial settles (geoLoading clears synchronously here)
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('No delivery address selected');
    });
    expect(screen.getByTestId('delivering-to-hint')).toHaveTextContent(
      'Search, use current location, or add a new address to continue.'
    );
  });

  test('Confirm & Proceed remains disabled after GPS denial', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('No delivery address selected');
    });
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();
  });

  test('no SELECTED pill rendered', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId(/^selected-pill-/)).not.toBeInTheDocument();
  });
});

// ============================================================
// Case 1b — first-time / no saved addresses, GPS pending
// ============================================================
describe('DeliveryAddress — Case 1b: GPS still detecting (pending)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({ addresses: [] });
    global.fetch = jest.fn();
    installGeolocation(gpsNeverResolves());
    delete window.google;
  });

  test('header shows "Detecting your current location..." while GPS is pending', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('Detecting your current location...');
    });
    // No hint while detecting
    expect(screen.queryByTestId('delivering-to-hint')).not.toBeInTheDocument();
    // Button still disabled while detecting
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();
  });
});

// ============================================================
// Case 1c — first-time / no saved addresses, GPS success
// ============================================================
describe('DeliveryAddress — Case 1c: GPS success applies as initial address', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({ addresses: [] });
    // Reverse geocode (Google Maps) + distance API both go through global.fetch
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('maps.googleapis.com/maps/api/geocode')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            results: [{ formatted_address: '101 Taj Road, Agra, UP 282001' }],
          }),
        });
      }
      // distance-api-new
      return Promise.resolve({
        json: () => Promise.resolve({
          shipping_status: 'Yes', shipping_charge: 0, shipping_time: '25 min', distance: '3 km',
        }),
      });
    });
    installGeolocation(gpsSuccess(27.1751, 78.0421)); // Agra
    // Required because reverseGeocode short-circuits when API key missing
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-key';
    delete window.google;
  });

  test('GPS success populates header with reverse-geocoded address', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent(/Agra/);
    });
    // No hint when address is set
    expect(screen.queryByTestId('delivering-to-hint')).not.toBeInTheDocument();
    // No saved card SELECTED
    expect(screen.queryByTestId(/^selected-pill-/)).not.toBeInTheDocument();
  });
});

// ============================================================
// Case 2 — saved addresses exist but no default
// (NEW behaviour: do NOT auto-select first card; let GPS try)
// ============================================================
describe('DeliveryAddress — Case 2: saved addresses + no default + GPS denied', () => {
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
        json: () => Promise.resolve({
          shipping_status: 'Yes', shipping_charge: 0, shipping_time: '20 min', distance: '2 km',
        }),
      })
    );
    installGeolocation(gpsDenied());
    delete window.google;
  });

  test('no card is auto-selected when no default exists (GPS denied)', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('No delivery address selected');
    });
    expect(screen.queryByTestId(/^selected-pill-/)).not.toBeInTheDocument();
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();
  });

  test('tapping a saved card selects it and shows SELECTED pill', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('No delivery address selected');
    });

    fireEvent.click(screen.getByTestId('address-card-addr-2'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-pill-addr-2')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('selected-pill-addr-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('99 Other Road');
  });
});

// ============================================================
// Case 3 — default address exists (unchanged behaviour)
// ============================================================
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
        json: () => Promise.resolve({
          shipping_status: 'Yes', shipping_charge: 0, shipping_time: '20 min', distance: '2 km',
        }),
      })
    );
    // GPS should NOT be invoked when default exists. If it were, denial would
    // produce the wrong header. We install denial as a safety check.
    installGeolocation(gpsDenied());
    delete window.google;
  });

  test('default auto-selected; both Default + SELECTED pills appear on it', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    const defaultCard = screen.getByTestId('address-card-addr-default');
    expect(defaultCard).toHaveTextContent('Default');
    expect(screen.getByTestId('selected-pill-addr-default')).toBeInTheDocument();
    expect(screen.queryByTestId('selected-pill-addr-non-default')).not.toBeInTheDocument();
  });

  test('header shows default address text (not "No delivery address selected")', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('5 Cart Road');
    });
    expect(screen.queryByTestId('delivering-to-hint')).not.toBeInTheDocument();
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
