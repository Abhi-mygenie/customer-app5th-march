import React from 'react';
import './StationCard.css';

const StationCard = ({ station, isAvailable, onClick }) => {
  const hasImage = station.image && station.image !== '';
  return (
    <div
      className={`station-card ${!isAvailable ? 'disabled' : ''} ${!hasImage ? 'no-image' : ''}`}
      onClick={onClick}
      style={hasImage ? { backgroundImage: `url(${station.image})` } : {}}
    >
      <div className="station-overlay">
        <h2 className="station-name">{station.name}</h2>
        {station.timing && <p className="station-timing">{station.timing}</p>}
      </div>
      
      {!isAvailable && station.timing && (
        <div className="unavailable-overlay">
          <div className="unavailable-message">
            <svg 
              className="clock-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Available {station.timing}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationCard;
