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
    const btn = screen.getByTestId('continue-to-menu-btn');
    expect(btn).toBeDisabled();
    // Visual disabled state: inline style must be grey, NOT primary orange.
    expect(btn.style.backgroundColor).toBe('rgb(204, 204, 204)'); // #ccc
    expect(btn.style.color).toBe('rgb(102, 102, 102)'); // #666
    expect(btn.style.cursor).toBe('not-allowed');
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

// ============================================================
// Marker visibility — hide on fallback/default map center
// ============================================================
describe('DeliveryAddress — marker hidden when no active address', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({ addresses: [] });
    global.fetch = jest.fn();
    installGeolocation(gpsDenied());
    delete window.google;
  });

  test('no Marker rendered when GPS denied and no address source', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('No delivery address selected');
    });
    expect(screen.queryByTestId('mock-google-marker')).not.toBeInTheDocument();
  });
});

describe('DeliveryAddress — marker shown when default address is selected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({
      addresses: [
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
    installGeolocation(gpsDenied());
    delete window.google;
  });

  test('Marker is rendered when a default saved address is auto-selected', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('selected-pill-addr-default')).toBeInTheDocument();
    });
    expect(screen.getByTestId('mock-google-marker')).toBeInTheDocument();
  });
});

// ============================================================
// Not-deliverable helper text
// ============================================================
describe('DeliveryAddress — not-deliverable helper text', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({
      addresses: [
        {
          id: 'addr-far',
          address_type: 'Home',
          address: 'Far Away Lane',
          house: 'A1',
          city: 'Agra',
          latitude: '27.17',
          longitude: '78.04',
          contact_person_name: 'Alice',
          is_default: true,
        },
      ],
    });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          shipping_status: 'No', shipping_charge: 0, shipping_time: '', distance: '429.17 km',
        }),
      })
    );
    installGeolocation(gpsDenied());
    delete window.google;
  });

  test('renders helper text under "Delivery not available" message', async () => {
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('distance-not-available')).toBeInTheDocument();
    });

    expect(screen.getByTestId('distance-not-available')).toHaveTextContent(
      /Delivery not available to this location \(429\.17 km\)/
    );
    expect(screen.getByTestId('distance-not-available-hint')).toHaveTextContent(
      'Please choose another address closer to the restaurant.'
    );
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();
  });
});


// ============================================================
// New Address form — "Use Current Location" button
// ============================================================
describe('DeliveryAddress — in-form Use Current Location button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({ addresses: [] });
    delete window.google;
  });

  test('button renders inside the New Address form and is disabled while detecting', async () => {
    installGeolocation(gpsNeverResolves());
    global.fetch = jest.fn();
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-address-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('add-address-form')).toBeInTheDocument();
    });

    const btn = screen.getByTestId('form-use-current-location-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent(/Detecting your current location\.\.\.|Use Current Location/);
    // initial GPS auto-detect for no-default users is in-flight (pending),
    // so geoLoading=true → button disabled
    expect(btn).toBeDisabled();
  });

  test('tapping the button when GPS denied keeps page in safe no-location state', async () => {
    installGeolocation(gpsDenied());
    global.fetch = jest.fn();
    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-address-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('add-address-form')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('form-use-current-location-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('No delivery address selected');
    });
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();
  });

  test('tapping the button when GPS succeeds populates form fields from rich geocode', async () => {
    installGeolocation(gpsSuccess(27.1751, 78.0421)); // Agra
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-key';
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('maps.googleapis.com/maps/api/geocode')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            results: [{
              formatted_address: '101 Taj Road, Agra, UP 282001',
              address_components: [
                { types: ['locality'], long_name: 'Agra' },
                { types: ['administrative_area_level_1'], long_name: 'Uttar Pradesh' },
                { types: ['postal_code'], long_name: '282001' },
              ],
            }],
          }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({
          shipping_status: 'Yes', shipping_charge: 0, shipping_time: '20 min', distance: '2 km',
        }),
      });
    });

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-address-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('add-address-form')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('form-use-current-location-btn'));

    // Header updates with reverse address
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent(/Agra/);
    });
    // Form fields are auto-filled
    await waitFor(() => {
      expect(screen.getByTestId('input-address')).toHaveValue('101 Taj Road, Agra, UP 282001');
    });
    expect(screen.getByTestId('input-city')).toHaveValue('Agra');
    expect(screen.getByTestId('input-pincode')).toHaveValue('282001');
  });
});

// ============================================================
// Main empty-state "Use Current Location" button
// (Follow-up fix: visible on the empty state without opening
//  the New Address form. Reuses applyCurrentLocation with
//  populateForm=false, so no payload/saved-address mutation.)
// ============================================================
describe('DeliveryAddress — empty-state Use Current Location button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({ addresses: [] });
    delete window.google;
  });

  test('renders on no-saved-address / no-active-address empty state (GPS denied)', async () => {
    global.fetch = jest.fn();
    installGeolocation(gpsDenied());

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('delivery-address-page')).toBeInTheDocument();
    });

    // Initial auto-GPS resolves (denied) → button visible without opening form.
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-use-current-location-btn')).toBeInTheDocument();
    });

    // Add New Address button still present.
    expect(screen.getByTestId('add-address-btn')).toBeInTheDocument();

    // Form is NOT open.
    expect(screen.queryByTestId('add-address-form')).not.toBeInTheDocument();

    // Confirm button still disabled (no active address).
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();

    // Header still shows the no-address state.
    expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('No delivery address selected');
  });

  test('clicking it with GPS allowed updates header + runs distance check', async () => {
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-key';
    const distanceCall = jest.fn();
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('maps.googleapis.com/maps/api/geocode')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            results: [{ formatted_address: '500 Park Street, Kolkata, WB 700016' }],
          }),
        });
      }
      // distance-api-new
      distanceCall(url);
      return Promise.resolve({
        json: () => Promise.resolve({
          shipping_status: 'Yes', shipping_charge: 0, shipping_time: '20 min', distance: '2 km',
        }),
      });
    });

    // First geolocation call (auto on mount) is denied so we land on empty
    // state with the button visible; subsequent click invokes success.
    let firstCall = true;
    installGeolocation((successCb, errorCb) => {
      if (firstCall) {
        firstCall = false;
        errorCb({ code: 1, message: 'User denied' });
      } else {
        successCb({ coords: { latitude: 22.5726, longitude: 88.3639 } }); // Kolkata
      }
    });

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-use-current-location-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('empty-state-use-current-location-btn'));

    // Header updates with reverse-geocoded address.
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent(/Kolkata/);
    });

    // Distance check ran (non-geocode fetch happened).
    await waitFor(() => {
      expect(distanceCall).toHaveBeenCalled();
    });

    // Form is NOT open (button should not have opened the form).
    expect(screen.queryByTestId('add-address-form')).not.toBeInTheDocument();
  });

  test('clicking it with GPS denied keeps page in safe no-location state', async () => {
    global.fetch = jest.fn();
    installGeolocation(gpsDenied());

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-use-current-location-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('empty-state-use-current-location-btn'));

    // Header still says no address selected.
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent('No delivery address selected');
    });
    // No marker rendered (no active address source).
    expect(screen.queryByTestId('mock-google-marker')).not.toBeInTheDocument();
    // Confirm button remains disabled.
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();
    // Form did NOT open.
    expect(screen.queryByTestId('add-address-form')).not.toBeInTheDocument();
  });

  test('does NOT render when saved addresses exist', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          shipping_status: 'Yes', shipping_charge: 0, shipping_time: '20 min', distance: '2 km',
        }),
      })
    );
    installGeolocation(gpsDenied());
    mockCrmGetAddresses.mockResolvedValue({
      addresses: [
        {
          id: 'addr-x',
          address_type: 'Home',
          address: '1 Existing Road',
          house: 'A',
          city: 'Shimla',
          latitude: '31.04',
          longitude: '77.12',
          contact_person_name: 'X',
          is_default: false,
        },
      ],
    });

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('address-card-addr-x')).toBeInTheDocument();
    });
    // Saved address present → empty-state action must NOT render.
    expect(screen.queryByTestId('empty-state-use-current-location-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('no-addresses')).not.toBeInTheDocument();
  });

  test('Add New Address still opens form; in-form button still present and works', async () => {
    global.fetch = jest.fn();
    installGeolocation(gpsDenied());

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-use-current-location-btn')).toBeInTheDocument();
    });

    // Opening the form still works.
    fireEvent.click(screen.getByTestId('add-address-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('add-address-form')).toBeInTheDocument();
    });

    // In-form Use Current Location button still rendered.
    expect(screen.getByTestId('form-use-current-location-btn')).toBeInTheDocument();
  });

  test('shows loading label while geoLoading is true', async () => {
    global.fetch = jest.fn();
    // First call denied (settles initial geoLoading), second never resolves
    // so the manual click leaves geoLoading=true and shows the loading label.
    let firstCall = true;
    installGeolocation((successCb, errorCb) => {
      if (firstCall) {
        firstCall = false;
        errorCb({ code: 1, message: 'User denied' });
      }
      // second call: never resolves → pending
    });

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-use-current-location-btn')).toHaveTextContent(
        'Use Current Location'
      );
    });

    fireEvent.click(screen.getByTestId('empty-state-use-current-location-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('empty-state-use-current-location-btn')).toHaveTextContent(
        'Detecting your current location...'
      );
    });
    expect(screen.getByTestId('empty-state-use-current-location-btn')).toBeDisabled();
  });
});

// ============================================================
// Empty-hero state (no map): replaces the fallback Shoghi map with
// a centred CTA when there are no saved addresses and no active
// address. When an address becomes active, the map appears again.
// ============================================================
describe('DeliveryAddress — empty-hero (no map) state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrmGetAddresses.mockResolvedValue({ addresses: [] });
    delete window.google;
  });

  test('renders hero and HIDES the map container in empty state (GPS denied)', async () => {
    global.fetch = jest.fn();
    installGeolocation(gpsDenied());

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-hero')).toBeInTheDocument();
    });

    // Map container must NOT be in the DOM.
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-google-map')).not.toBeInTheDocument();

    // "No saved addresses" placeholder & redundant section are suppressed.
    expect(screen.queryByTestId('no-addresses')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delivery-addresses-list')).not.toBeInTheDocument();

    // Hero exposes both primary and secondary actions.
    expect(screen.getByTestId('empty-state-use-current-location-btn')).toBeInTheDocument();
    expect(screen.getByTestId('add-address-btn')).toBeInTheDocument();

    // Confirm stays disabled.
    expect(screen.getByTestId('continue-to-menu-btn')).toBeDisabled();
  });

  test('GPS success: hero disappears, map appears with marker', async () => {
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-key';
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('maps.googleapis.com/maps/api/geocode')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            results: [{ formatted_address: '88 MG Road, Bengaluru, KA 560001' }],
          }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({
          shipping_status: 'Yes', shipping_charge: 0, shipping_time: '20 min', distance: '2 km',
        }),
      });
    });
    installGeolocation(gpsSuccess(12.9716, 77.5946)); // Bengaluru

    render(<DeliveryAddress />);

    // Header eventually shows the reverse-geocoded address → hasActiveAddress=true.
    await waitFor(() => {
      expect(screen.getByTestId('delivering-to-text')).toHaveTextContent(/Bengaluru/);
    });

    // Hero is gone; map is back with a marker.
    expect(screen.queryByTestId('empty-state-hero')).not.toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('mock-google-marker')).toBeInTheDocument();
  });

  test('saved address path is unaffected: map renders normally with default address', async () => {
    mockCrmGetAddresses.mockResolvedValue({
      addresses: [
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
    installGeolocation(gpsDenied());

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('selected-pill-addr-default')).toBeInTheDocument();
    });
    // Map visible; hero not rendered.
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state-hero')).not.toBeInTheDocument();
    // Saved addresses section still visible.
    expect(screen.getByTestId('delivery-addresses-list')).toBeInTheDocument();
  });

  test('clicking hero "Add New Address" opens the form (hero hides while form is open)', async () => {
    global.fetch = jest.fn();
    installGeolocation(gpsDenied());

    render(<DeliveryAddress />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state-hero')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-address-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('add-address-form')).toBeInTheDocument();
    });
    // Hero is replaced by the form view; map container is also not rendered
    // because the empty-hero gate uses !showForm to suppress the map only
    // in the empty state. With showForm=true the saved-addresses section
    // (and form) renders.
    expect(screen.queryByTestId('empty-state-hero')).not.toBeInTheDocument();
    // In-form Use Current Location button is present.
    expect(screen.getByTestId('form-use-current-location-btn')).toBeInTheDocument();
  });
});

