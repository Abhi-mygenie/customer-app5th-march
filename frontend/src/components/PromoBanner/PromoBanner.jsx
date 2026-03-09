import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PromoBanner.css';

const DEFAULT_PROMOTIONS = [
  { id: 1, image_url: 'https://static.prod-images.emergentagent.com/jobs/39847d56-823a-4cbe-862b-47603bbd21e5/images/f8d8e6d9e63d0774e49333ece4041ce1043c3e054541133b510c663fd06030ef.png', title: 'Happy Hour - 20% Off Beverages' },
  { id: 2, image_url: 'https://static.prod-images.emergentagent.com/jobs/39847d56-823a-4cbe-862b-47603bbd21e5/images/3a63213a51966c6a19c254a706e723045ac604f74fc659d1d4ee5b624dfc8002.png', title: 'Gourmet Burgers - Order Now' },
  { id: 3, image_url: 'https://static.prod-images.emergentagent.com/jobs/39847d56-823a-4cbe-862b-47603bbd21e5/images/18f718fd233a88101b9329ef8ee2b3d31a028706922ab6fba64329dd73250053.png', title: 'Fresh Breakfast Specials' },
];

const PromoBanner = ({ promotions = [], autoPlayInterval = 3500, compact = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  const items = promotions.length > 0 ? promotions : DEFAULT_PROMOTIONS;

  const goTo = useCallback((idx) => {
    setActiveIndex(((idx % items.length) + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    timerRef.current = setInterval(() => goTo(activeIndex + 1), autoPlayInterval);
    return () => clearInterval(timerRef.current);
  }, [activeIndex, autoPlayInterval, goTo]);

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
      goTo(diff > 0 ? activeIndex + 1 : activeIndex - 1);
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
          <div className="promo-slide" key={promo.id || i}>
            <img src={promo.image_url} alt={promo.title || `Promotion ${i + 1}`} className="promo-image" />
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
