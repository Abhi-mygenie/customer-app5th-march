/**
 * Tests for Header component rendering
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../../components/Header/Header';

describe('Header', () => {
  const defaultProps = {
    showSearch: false,
    toggleSearch: jest.fn(),
    toggleSidebar: jest.fn(),
    brandText: 'Test Restaurant',
    logoUrl: '/test-logo.png',
    onLogoClick: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  test('renders brand text', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
  });

  test('renders logo image with correct src', () => {
    render(<Header {...defaultProps} />);
    const img = screen.getByAltText('Test Restaurant');
    expect(img).toHaveAttribute('src', '/test-logo.png');
  });

  test('renders fallback logo when logoUrl is not provided', () => {
    render(<Header {...defaultProps} logoUrl={undefined} />);
    // When no logoUrl, falls back to default path
    const img = document.querySelector('.header-logo');
    expect(img).toHaveAttribute('src', '/assets/images/mygenie_logo.png');
  });

  test('calls onLogoClick when logo area is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByTestId('header-logo-link'));
    expect(defaultProps.onLogoClick).toHaveBeenCalledTimes(1);
  });

  test('calls toggleSidebar when hamburger button is clicked', () => {
    render(<Header {...defaultProps} />);
    const btn = document.querySelector('.hamburger-btn');
    fireEvent.click(btn);
    expect(defaultProps.toggleSidebar).toHaveBeenCalledTimes(1);
  });

  test('has cursor pointer when onLogoClick is provided', () => {
    render(<Header {...defaultProps} />);
    const logoLink = screen.getByTestId('header-logo-link');
    expect(logoLink).toHaveStyle({ cursor: 'pointer' });
  });

  test('has default cursor when onLogoClick is not provided', () => {
    render(<Header {...defaultProps} onLogoClick={undefined} />);
    const logoLink = screen.getByTestId('header-logo-link');
    expect(logoLink).toHaveStyle({ cursor: 'default' });
  });

  test('uses brandText as alt text for logo', () => {
    render(<Header {...defaultProps} brandText="My Brand" />);
    const img = screen.getByAltText('My Brand');
    expect(img).toBeInTheDocument();
  });

  test('uses "Logo" as alt text when brandText is not provided', () => {
    render(<Header {...defaultProps} brandText={undefined} />);
    const img = screen.getByAltText('Logo');
    expect(img).toBeInTheDocument();
  });
});
