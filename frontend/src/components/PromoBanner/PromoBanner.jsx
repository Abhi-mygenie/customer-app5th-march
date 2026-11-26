import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PromoBanner.css';

const PromoBanner = ({ promotions = [], autoPlayInterval = 3500, compact = false }) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  // CR-2026-11-14-003: suppress synthetic click after a touch-tap navigation
  const suppressNextClick = useRef(false);
  const items = promotions;

  const goTo = useCallback((idx) => {
    if (items.length === 0) return;
    setActiveIndex(((idx % items.length) + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length === 0) return;
    timerRef.current = setInterval(() => goTo(activeIndex + 1), autoPlayInterval);
    return () => clearInterval(timerRef.current);
  }, [activeIndex, autoPlayInterval, goTo, items.length]);

  // Don't render if no promotions
  if (items.length === 0) return null;

  const pauseAuto = () => clearInterval(timerRef.current);

  const onTouchStart = (e) => {
    pauseAuto();
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
  };
  const onTouchMove = (e) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = startX.current - currentX.current;
    if (Math.abs(diff) > 40) {
      // Swipe — change slide
      goTo(diff > 0 ? activeIndex + 1 : activeIndex - 1);
    } else if (items[activeIndex]?.link) {
      // CR-2026-11-14-003: tap on a slide with a link — navigate
      suppressNextClick.current = true;
      navigate(items[activeIndex].link);
    }
  };

  return (
    <div className={`promo-banner ${compact ? 'promo-banner-compact' : ''}`} data-testid="promo-banner">
      <div
        className="promo-track"
        ref={trackRef}
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {items.map((promo, i) => (
          <div
            className="promo-slide"
            key={promo.id || i}
            data-testid={`promo-slide-${i}`}
            style={promo.link ? { cursor: 'pointer' } : undefined}
            onClick={() => {
              // CR-2026-11-14-003: guard against synthetic click after touch-tap
              if (suppressNextClick.current) {
                suppressNextClick.current = false;
                return;
              }
              if (promo.link) navigate(promo.link);
            }}
          >
            <img src={promo.image_url} alt={promo.title || `Promotion ${i + 1}`} className="promo-image" />
            {promo.link && (
              <div className="promo-tap-pill" data-testid={`promo-tap-badge-${i}`} aria-hidden="true">
                View ↗
              </div>
            )}
            {promo.title && <div className="promo-overlay"><span className="promo-title">{promo.title}</span></div>}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="promo-dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`promo-dot${i === activeIndex ? ' active' : ''}`}
              onClick={() => { pauseAuto(); goTo(i); }}
              aria-label={`Slide ${i + 1}`}
              data-testid={`promo-dot-${i}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PromoBanner;
