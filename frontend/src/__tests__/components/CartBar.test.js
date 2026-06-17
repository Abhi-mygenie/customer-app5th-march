/**
 * Tests for CartBar component rendering
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useCart } from '../../context/CartContext';

// Mock CartContext
jest.mock('../../context/CartContext', () => ({
  useCart: jest.fn(),
}));

// react-router-dom auto-mocked via __mocks__/react-router-dom.js

import CartBar from '../../components/CartBar/CartBar';

describe('CartBar', () => {
  afterEach(() => jest.clearAllMocks());

  test('renders when cart has items', () => {
    useCart.mockReturnValue({
      getTotalItems: () => 3,
      getTotalPrice: () => 750,
      restaurantId: '478',
    });
    render(<CartBar />);
    const bar = document.querySelector('.cart-bar');
    expect(bar).toBeInTheDocument();
  });

  test('shows item count', () => {
    useCart.mockReturnValue({
      getTotalItems: () => 3,
      getTotalPrice: () => 750,
      restaurantId: '478',
    });
    render(<CartBar />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  test('shows total price', () => {
    useCart.mockReturnValue({
      getTotalItems: () => 2,
      getTotalPrice: () => 500,
      restaurantId: '478',
    });
    render(<CartBar />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  test('does not render meaningful content when cart is empty', () => {
    useCart.mockReturnValue({
      getTotalItems: () => 0,
      getTotalPrice: () => 0,
      restaurantId: '478',
    });
    render(<CartBar />);
    const bar = document.querySelector('.cart-bar');
    if (bar) {
      expect(bar.textContent).not.toMatch(/item/i);
    }
  });

  test('displays item count and price together', () => {
    useCart.mockReturnValue({
      getTotalItems: () => 2,
      getTotalPrice: () => 400,
      restaurantId: '478',
    });
    render(<CartBar />);
    const bar = document.querySelector('.cart-bar');
    expect(bar).toBeInTheDocument();
    expect(bar.textContent).toMatch(/2/);
    expect(bar.textContent).toMatch(/400/);
  });
});
