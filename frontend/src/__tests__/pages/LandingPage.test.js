/**
 * Tests for LandingPage component rendering
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// react-router-dom auto-mocked via __mocks__
const { __mockNavigate: mockNavigate } = require('react-router-dom');

jest.mock('../../utils/useRestaurantId', () => ({
  useRestaurantId: () => ({ restaurantId: '478' }),
}));
jest.mock('../../hooks/useScannedTable', () => ({
  useScannedTable: () => ({ tableNo: null, roomOrTable: null, isScanned: false }),
}));
jest.mock('../../api/utils/restaurantIdConfig', () => ({
  isMultipleMenu: jest.fn(() => false),
}));
jest.mock('../../components/PromoBanner/PromoBanner', () => {
  return function MockPromoBanner() {
    return <div data-testid="promo-banner">Promo Banner</div>;
  };
});
jest.mock('../../components/SkeletonLoaders', () => ({
  LandingPageSkeleton: () => <div data-testid="landing-skeleton">Loading...</div>,
}));

// Define default mock data inside factory so it's always available
jest.mock('../../hooks/useMenuData', () => ({
  useRestaurantDetails: jest.fn().mockReturnValue({
    restaurant: {
      id: '478',
      name: 'Test Restaurant',
      logo: '/test-logo.png',
      phone: '+919876543210',
      description: 'A great restaurant',
      landing_config: {
        show_logo: 'Y',
        show_welcome_text: 'Y',
        show_description: 'Y',
        show_browse_menu: 'Y',
        show_call_waiter: 'Y',
        show_pay_bill: 'Y',
        show_promotions: 'Y',
        show_social_icons: 'Y',
        show_powered_by: 'Y',
      },
    },
    loading: false,
    error: null,
  }),
}));

// Import the mocked function for per-test overrides
import { useRestaurantDetails } from '../../hooks/useMenuData';
import LandingPage from '../../pages/LandingPage';

const defaultReturn = {
  restaurant: {
    id: '478',
    name: 'Test Restaurant',
    logo: '/test-logo.png',
    phone: '+919876543210',
    description: 'A great restaurant',
    landing_config: {
      show_logo: 'Y',
      show_welcome_text: 'Y',
      show_description: 'Y',
      show_browse_menu: 'Y',
      show_call_waiter: 'Y',
      show_pay_bill: 'Y',
      show_promotions: 'Y',
      show_social_icons: 'Y',
      show_powered_by: 'Y',
    },
  },
  loading: false,
  error: null,
};

describe('LandingPage - Rendering', () => {
  beforeEach(() => useRestaurantDetails.mockReturnValue(defaultReturn));
  afterEach(() => jest.clearAllMocks());

  test('shows skeleton loader while loading', () => {
    useRestaurantDetails.mockReturnValue({ restaurant: null, loading: true, error: null });
    render(<LandingPage />);
    expect(screen.getByTestId('landing-skeleton')).toBeInTheDocument();
  });

  test('renders welcome text with restaurant name', () => {
    render(<LandingPage />);
    const welcome = screen.getByTestId('landing-welcome');
    expect(welcome).toBeInTheDocument();
    expect(welcome).toHaveTextContent(/Welcome to Test Restaurant/);
  });

  test('renders landing-page container', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  test('renders restaurant logo section', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-logo')).toBeInTheDocument();
  });

  test('renders Browse Menu button', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-browse-menu-btn')).toBeInTheDocument();
    expect(screen.getByText('Browse Menu')).toBeInTheDocument();
  });

  test('renders promo banner', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('promo-banner')).toBeInTheDocument();
  });

  test('navigates to menu on Browse Menu click', () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByTestId('landing-browse-menu-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/478/menu');
  });

  test('renders Call Waiter button', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-call-waiter-btn')).toBeInTheDocument();
  });

  test('renders Pay Bill button', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-pay-bill-btn')).toBeInTheDocument();
  });

  test('renders footer', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-footer')).toBeInTheDocument();
  });

  test('renders description', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-description')).toBeInTheDocument();
  });

  test('renders social icons', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('landing-social-icons')).toBeInTheDocument();
  });
});

describe('LandingPage - Config flags disabled', () => {
  beforeEach(() => useRestaurantDetails.mockReturnValue(defaultReturn));
  afterEach(() => jest.clearAllMocks());

  const withConfig = (overrides) => ({
    ...defaultReturn,
    restaurant: {
      ...defaultReturn.restaurant,
      landing_config: {
        ...defaultReturn.restaurant.landing_config,
        ...overrides,
      },
    },
  });

  test('hides promo banner when show_promotions is N', () => {
    useRestaurantDetails.mockReturnValue(withConfig({ show_promotions: 'N' }));
    render(<LandingPage />);
    expect(screen.queryByTestId('promo-banner')).not.toBeInTheDocument();
  });

  test('hides Browse Menu when show_browse_menu is N', () => {
    useRestaurantDetails.mockReturnValue(withConfig({ show_browse_menu: 'N' }));
    render(<LandingPage />);
    expect(screen.queryByTestId('landing-browse-menu-btn')).not.toBeInTheDocument();
  });

  test('hides Call Waiter when show_call_waiter is N', () => {
    useRestaurantDetails.mockReturnValue(withConfig({ show_call_waiter: 'N' }));
    render(<LandingPage />);
    expect(screen.queryByTestId('landing-call-waiter-btn')).not.toBeInTheDocument();
  });

  test('hides welcome text when show_welcome_text is N', () => {
    useRestaurantDetails.mockReturnValue(withConfig({ show_welcome_text: 'N' }));
    render(<LandingPage />);
    expect(screen.queryByTestId('landing-welcome')).not.toBeInTheDocument();
  });

  test('hides logo when show_logo is N', () => {
    useRestaurantDetails.mockReturnValue(withConfig({ show_logo: 'N' }));
    render(<LandingPage />);
    expect(screen.queryByTestId('landing-logo')).not.toBeInTheDocument();
  });

  test('hides footer when show_powered_by is N', () => {
    useRestaurantDetails.mockReturnValue(withConfig({ show_powered_by: 'N' }));
    render(<LandingPage />);
    expect(screen.queryByTestId('landing-footer')).not.toBeInTheDocument();
  });
});
