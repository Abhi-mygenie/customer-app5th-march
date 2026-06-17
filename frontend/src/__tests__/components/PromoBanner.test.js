/**
 * Tests for PromoBanner component rendering
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PromoBanner from '../../components/PromoBanner/PromoBanner';

describe('PromoBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders with default promotions when none provided', () => {
    render(<PromoBanner />);
    expect(screen.getByTestId('promo-banner')).toBeInTheDocument();
  });

  test('renders provided promotions', () => {
    const promos = [
      { id: 1, image_url: '/promo1.png', title: 'Promo 1' },
      { id: 2, image_url: '/promo2.png', title: 'Promo 2' },
    ];
    render(<PromoBanner promotions={promos} />);
    const images = document.querySelectorAll('.promo-slide img');
    expect(images.length).toBe(2);
  });

  test('renders dot indicators matching number of items', () => {
    const promos = [
      { id: 1, image_url: '/p1.png', title: 'P1' },
      { id: 2, image_url: '/p2.png', title: 'P2' },
      { id: 3, image_url: '/p3.png', title: 'P3' },
      { id: 4, image_url: '/p4.png', title: 'P4' },
    ];
    render(<PromoBanner promotions={promos} />);
    const dots = document.querySelectorAll('.promo-dot');
    expect(dots.length).toBe(4);
  });

  test('first dot is active by default', () => {
    const promos = [
      { id: 1, image_url: '/p1.png', title: 'P1' },
      { id: 2, image_url: '/p2.png', title: 'P2' },
    ];
    render(<PromoBanner promotions={promos} />);
    const dots = document.querySelectorAll('.promo-dot');
    expect(dots[0]).toHaveClass('active');
  });

  test('clicking a dot changes the active slide', () => {
    const promos = [
      { id: 1, image_url: '/p1.png', title: 'P1' },
      { id: 2, image_url: '/p2.png', title: 'P2' },
      { id: 3, image_url: '/p3.png', title: 'P3' },
    ];
    render(<PromoBanner promotions={promos} />);
    const dots = document.querySelectorAll('.promo-dot');

    fireEvent.click(dots[2]);
    expect(dots[2]).toHaveClass('active');
  });

  test('applies compact class when compact prop is true', () => {
    render(<PromoBanner compact={true} />);
    const banner = document.querySelector('.promo-banner');
    expect(banner).toHaveClass('promo-banner-compact');
  });

  test('does not apply compact class by default', () => {
    render(<PromoBanner />);
    const banner = document.querySelector('.promo-banner');
    expect(banner).not.toHaveClass('promo-banner-compact');
  });

  test('auto-advances slides on timer', () => {
    const promos = [
      { id: 1, image_url: '/p1.png', title: 'P1' },
      { id: 2, image_url: '/p2.png', title: 'P2' },
      { id: 3, image_url: '/p3.png', title: 'P3' },
    ];
    render(<PromoBanner promotions={promos} autoPlayInterval={1000} />);
    const dots = document.querySelectorAll('.promo-dot');

    expect(dots[0]).toHaveClass('active');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(dots[1]).toHaveClass('active');
  });

  test('wraps around to first slide after last', () => {
    const promos = [
      { id: 1, image_url: '/p1.png', title: 'P1' },
      { id: 2, image_url: '/p2.png', title: 'P2' },
    ];
    render(<PromoBanner promotions={promos} autoPlayInterval={1000} />);
    const dots = document.querySelectorAll('.promo-dot');

    act(() => { jest.advanceTimersByTime(1000); }); // -> slide 2
    expect(dots[1]).toHaveClass('active');

    act(() => { jest.advanceTimersByTime(1000); }); // -> wraps to slide 1
    expect(dots[0]).toHaveClass('active');
  });

  test('renders image alt text from title', () => {
    const promos = [
      { id: 1, image_url: '/p1.png', title: 'Special Offer' },
    ];
    render(<PromoBanner promotions={promos} />);
    const img = document.querySelector('.promo-slide img');
    expect(img).toHaveAttribute('alt', 'Special Offer');
  });

  test('renders promo title overlay', () => {
    const promos = [
      { id: 1, image_url: '/p1.png', title: 'Flash Sale' },
    ];
    render(<PromoBanner promotions={promos} />);
    expect(screen.getByText('Flash Sale')).toBeInTheDocument();
  });
});
