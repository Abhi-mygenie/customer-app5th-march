import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { __mockNavigate: mockNavigate } = require('react-router-dom');

const mockDismiss = jest.fn();
const mockUseNotificationPopup = jest.fn();

jest.mock('../../hooks/useNotificationPopup', () => ({
  __esModule: true,
  default: (...args) => mockUseNotificationPopup(...args),
}));

jest.mock('../../context/RestaurantConfigContext', () => ({
  useRestaurantConfig: () => ({
    notificationPopups: [],
    primaryColor: '#1d4ed8',
    borderRadius: 'rounded',
  }),
}));

import NotificationPopup from '../../components/NotificationPopup/NotificationPopup';

const buildPopup = (overrides = {}) => ({
  id: 'popup-1',
  autoDismissSeconds: 0,
  content: {
    title: 'Note',
    message: 'Manual popup message',
    ...overrides.content,
  },
  style: {
    type: 'modal',
    position: 'center',
    ...overrides.style,
  },
  ...overrides,
});

describe('NotificationPopup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationPopup.mockReturnValue({
      popup: buildPopup(),
      isVisible: true,
      dismiss: mockDismiss,
      secondsRemaining: null,
    });
  });

  test('shows OK button instead of countdown for manual modal popup', () => {
    render(<NotificationPopup page="menu" />);

    expect(screen.getByTestId('notification-popup-modal')).toBeInTheDocument();
    expect(screen.getByTestId('notification-popup-ok')).toBeInTheDocument();
    expect(screen.queryByTestId('notification-popup-countdown')).not.toBeInTheDocument();
  });

  test('clicking OK dismisses the manual modal popup', () => {
    render(<NotificationPopup page="menu" />);

    fireEvent.click(screen.getByTestId('notification-popup-ok'));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  test('keeps countdown and hides OK button for auto-close modal popup', () => {
    mockUseNotificationPopup.mockReturnValue({
      popup: buildPopup({ autoDismissSeconds: 2 }),
      isVisible: true,
      dismiss: mockDismiss,
      secondsRemaining: 2,
    });

    render(<NotificationPopup page="menu" />);

    expect(screen.getByTestId('notification-popup-countdown')).toHaveTextContent('Closing in 2s');
    expect(screen.queryByTestId('notification-popup-ok')).not.toBeInTheDocument();
  });

  test('shows both CTA and OK in manual modal popup', () => {
    mockUseNotificationPopup.mockReturnValue({
      popup: buildPopup({
        content: {
          ctaText: 'Order Now',
          ctaAction: 'navigate',
          ctaLink: '/menu',
        },
      }),
      isVisible: true,
      dismiss: mockDismiss,
      secondsRemaining: null,
    });

    render(<NotificationPopup page="menu" />);

    expect(screen.getByTestId('notification-popup-cta')).toHaveTextContent('Order Now');
    expect(screen.getByTestId('notification-popup-ok')).toHaveTextContent('OK');
  });

  test('CTA action remains unchanged when both CTA and OK are shown', () => {
    mockUseNotificationPopup.mockReturnValue({
      popup: buildPopup({
        content: {
          ctaText: 'Order Now',
          ctaAction: 'navigate',
          ctaLink: '/menu',
        },
      }),
      isVisible: true,
      dismiss: mockDismiss,
      secondsRemaining: null,
    });

    render(<NotificationPopup page="menu" />);

    fireEvent.click(screen.getByTestId('notification-popup-cta'));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/menu');
  });
});