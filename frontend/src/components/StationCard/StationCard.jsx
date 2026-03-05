import React from 'react';
import './StationCard.css';

const StationCard = ({ station, isAvailable, onClick }) => {
  return (
    <div
      className={`station-card ${!isAvailable ? 'disabled' : ''}`}
      onClick={onClick}
      style={{ backgroundImage: `url(${station.image})` }}
    >
      <div className="station-overlay">
        <h2 className="station-name">{station.name}</h2>
        <p className="station-timing">{station.timing}</p>
      </div>
      
      {!isAvailable && (
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
