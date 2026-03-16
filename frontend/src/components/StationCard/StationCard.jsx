import React from 'react';
import { IoTimeOutline, IoRestaurantOutline } from 'react-icons/io5';
import './StationCard.css';

const StationCard = ({ station, isAvailable, onClick }) => {
  const hasImage = station.image && station.image !== '';
  const hasDescription = station.description && station.description !== '';
  const hasTiming = station.timing && station.timing !== '';

  return (
    <div
      className={`station-card ${!isAvailable ? 'disabled' : ''}`}
      onClick={onClick}
      data-testid={`station-card-${station.id}`}
    >
      {/* Image / Placeholder */}
      <div className="station-card-thumb">
        {hasImage ? (
          <img src={station.image} alt={station.name} className="station-card-img" />
        ) : (
          <div className="station-card-placeholder">
            <IoRestaurantOutline className="station-card-placeholder-icon" />
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="station-card-body">
        <h3 className="station-card-name">{station.name}</h3>
        {hasDescription && (
          <p className="station-card-desc">{station.description}</p>
        )}
        {hasTiming && (
          <span className={`station-card-timing ${isAvailable ? 'open' : 'closed'}`}>
            <IoTimeOutline />
            {isAvailable ? station.timing : `Opens ${station.timing}`}
          </span>
        )}
      </div>

      {/* Arrow */}
      <div className="station-card-arrow">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Unavailable overlay */}
      {!isAvailable && (
        <div className="station-card-unavailable" />
      )}
    </div>
  );
};

export default StationCard;
