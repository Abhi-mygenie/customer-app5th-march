/**
 * Tests for Sidebar component rendering
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../../components/Sidebar/Sidebar';

describe('Sidebar', () => {
  const defaultProps = {
    isOpen: false,
    onClose: jest.fn(),
    logoUrl: '/test-logo.png',
    title: 'Test Restaurant',
    description: 'A fine dining experience',
    phone: '+919876543210',
    onHomeClick: jest.fn(),
    onAboutClick: jest.fn(),
    onServicesClick: jest.fn(),
    onContactClick: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  test('has "open" class when isOpen is true', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toHaveClass('open');
  });

  test('does not have "open" class when isOpen is false', () => {
    render(<Sidebar {...defaultProps} isOpen={false} />);
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).not.toHaveClass('open');
  });

  test('renders overlay when isOpen is true', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    const overlay = document.querySelector('.sidebar-overlay');
    expect(overlay).toBeInTheDocument();
  });

  test('does not render overlay when isOpen is false', () => {
    render(<Sidebar {...defaultProps} isOpen={false} />);
    const overlay = document.querySelector('.sidebar-overlay');
    expect(overlay).not.toBeInTheDocument();
  });

  test('calls onClose when overlay is clicked', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    const overlay = document.querySelector('.sidebar-overlay');
    fireEvent.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is clicked', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    const closeBtn = document.querySelector('.sidebar-close-btn');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('renders restaurant title', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
  });

  test('renders fallback title "Menu" when title is not provided', () => {
    render(<Sidebar {...defaultProps} isOpen={true} title="" />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  test('renders logo image', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    const img = document.querySelector('.sidebar-logo');
    expect(img).toHaveAttribute('src', '/test-logo.png');
  });

  test('renders fallback logo when logoUrl is empty', () => {
    render(<Sidebar {...defaultProps} isOpen={true} logoUrl="" />);
    const img = document.querySelector('.sidebar-logo');
    expect(img).toHaveAttribute('src', '/assets/images/mygenie_logo.png');
  });

  test('renders Home menu item', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  test('calls onHomeClick when Home menu item is clicked', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    fireEvent.click(screen.getByText('Home'));
    expect(defaultProps.onHomeClick).toHaveBeenCalledTimes(1);
  });

  test('renders "Need Help?" section', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    expect(screen.getByText('Need Help?')).toBeInTheDocument();
  });

  test('renders "Call us" link with phone number', () => {
    render(<Sidebar {...defaultProps} isOpen={true} />);
    expect(screen.getByText('Call us')).toBeInTheDocument();
    const callLink = document.querySelector('.sidebar-call-us-btn');
    expect(callLink).toHaveAttribute('href', 'tel:+919876543210');
  });

  test('does not render "Call us" when phone is not provided', () => {
    render(<Sidebar {...defaultProps} isOpen={true} phone="" />);
    expect(screen.queryByText('Call us')).not.toBeInTheDocument();
  });
});
