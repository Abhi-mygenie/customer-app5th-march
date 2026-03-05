import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import StationCard from '../components/StationCard/StationCard';
import { StationCardSkeleton, HeaderSkeleton } from '../components/SkeletonLoaders';
import { useStations, useRestaurantDetails } from '../hooks/useMenuData';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import './DiningMenu.css';

const DiningMenu = () => {
  const navigate = useNavigate();
  const {restaurantId }= useRestaurantId();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Fetch stations from API
  const { stations, loading, error, errorMessage } = useStations(restaurantId);
  
  // Fetch restaurant details for dynamic header
  const { restaurant, loading: restaurantLoading, isFetching: restaurantFetching } = useRestaurantDetails(restaurantId);
  const { logoUrl: configLogoUrl, phone: configPhone } = useRestaurantConfig();

  // Update current time every minute for real-time availability
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Check if station is available based on IST timing
  const isStationAvailable = (timing) => {
    if (!timing || timing === "") return true; // Always available if no timing specified

    // Get current time in IST
    const istTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();

    // Parse timing string like "(7 am - 11 am)" or "(11 am - 11 pm)"
    const timingMatch = timing.match(/\((\d+)\s*(am|pm)\s*-\s*(\d+)\s*(am|pm)\)/i);
    if (!timingMatch) return true; // If timing format is invalid, allow access

    let startHour = parseInt(timingMatch[1]);
    const startPeriod = timingMatch[2].toLowerCase();
    let endHour = parseInt(timingMatch[3]);
    const endPeriod = timingMatch[4].toLowerCase();

    // Convert to 24-hour format
    if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
    if (startPeriod === 'am' && startHour === 12) startHour = 0;
    if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
    if (endPeriod === 'am' && endHour === 12) endHour = 0;

    // Create time values for comparison (hours * 60 + minutes)
    const currentTimeValue = currentHour * 60 + currentMinute;
    const startTimeValue = startHour * 60;
    const endTimeValue = endHour * 60;

    return currentTimeValue >= startTimeValue && currentTimeValue < endTimeValue;
  };

  const handleStationClick = (stationId, timing) => {
    if (isStationAvailable(timing)) {
      // Preserve restaurant ID in navigation
      if (restaurantId) {
        navigate(`/${restaurantId}/menu/${stationId}`);
      }
    }
  };

  return (
    <div className="dining-menu-page">

      {/* Show skeleton loader when restaurant data is loading or fetching */}
      {(restaurantLoading || restaurantFetching) ? (
        <HeaderSkeleton showSearchIcon={false} />
      ) : (
        <Header
          brandText={restaurant?.name}
          logoUrl={configLogoUrl || '/assets/images/ic_login_logo.png'}
          phone={configPhone || restaurant?.phone}
          onLogoClick={() => navigate(`/${restaurantId}`)}
        />
      )}

      <div className="page-title-section">
        <h1 className="menu-title">Dining Menu</h1>
        <p className="menu-subtitle">Select your category below.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>{errorMessage || 'Failed to load stations. Please try again.'}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="stations-list">
          {[1, 2, 3, 4].map((i) => (
            <StationCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Stations List */}
      {!loading && !error && (
        <div className="stations-list">
          {stations.map((station) => {
            const isAvailable = isStationAvailable(station.timing);
            
            return (
              <StationCard
                key={station.id}
                station={station}
                isAvailable={isAvailable}
                onClick={() => handleStationClick(station.id, station.timing )}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && stations.length === 0 && (
        <div className="empty-state">
          <p>No stations available at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default DiningMenu;
