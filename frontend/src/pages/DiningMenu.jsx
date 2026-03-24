import React, { useState, useEffect, useMemo } from 'react';
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
  
  // Fetch restaurant details FIRST to get numeric ID
  const { restaurant, loading: restaurantLoading, isFetching: restaurantFetching } = useRestaurantDetails(restaurantId);
  const { logoUrl: configLogoUrl, phone: configPhone, menuOrder } = useRestaurantConfig();
  
  // Use numeric ID from restaurant-info response, fallback to restaurantId
  const numericRestaurantId = restaurant?.id?.toString() || restaurantId;
  
  // Fetch stations from API (uses numeric ID)
  const { stations: rawStations, loading, error, errorMessage } = useStations(numericRestaurantId);

  // Apply station order and visibility from admin config
  const stations = useMemo(() => {
    if (!rawStations || rawStations.length === 0) return rawStations || [];
    const stationOrder = menuOrder?.stationOrder || [];
    const stationVisibility = menuOrder?.stationVisibility || {};
    if (stationOrder.length === 0) return rawStations;

    const ordered = [];
    const seen = new Set();
    for (const s of stationOrder) {
      const station = rawStations.find(st => st.id === s.id);
      if (station) {
        if (stationVisibility[station.id] !== false) {
          ordered.push(station);
        }
        seen.add(station.id);
      }
    }
    for (const station of rawStations) {
      if (!seen.has(station.id)) ordered.push(station);
    }
    return ordered;
  }, [rawStations, menuOrder]);

  // Update current time every minute for real-time availability
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Check if station is available based on IST timing
  const isStationAvailable = (station) => {
    // Use raw 24h opening/closing time from API if available
    const openTime = station.openingTime;
    const closeTime = station.closingTime;
    
    if (!openTime || !closeTime) return true; // Always available if no timing
    
    // All-day check: 00:00:00 to 23:59:59 or 23:59:00
    if (openTime === '00:00:00' && (closeTime === '23:59:59' || closeTime === '23:59:00')) return true;

    // Get current time in IST
    const istTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();

    // Parse HH:mm:ss to minutes
    const openParts = openTime.split(':');
    const closeParts = closeTime.split(':');
    const openMinutes = parseInt(openParts[0], 10) * 60 + parseInt(openParts[1] || 0, 10);
    const closeMinutes = parseInt(closeParts[0], 10) * 60 + parseInt(closeParts[1] || 0, 10);

    // Handle overnight ranges (e.g. 22:00 - 06:00)
    if (closeMinutes <= openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    }
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  };

  const handleStationClick = (stationId, station) => {
    if (isStationAvailable(station)) {
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
          phone={configPhone || restaurant?.phone}
          onBackClick={() => navigate(`/${restaurantId}`)}
        />
      )}

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
      {!loading && !error && stations.length > 0 && (
        <>
          <div className="station-page-title">
            <h2>Select a Menu</h2>
            <p>Choose from the available menus below</p>
          </div>
          <div className="stations-list">
            {stations.map((station) => {
              const isAvailable = isStationAvailable(station);
              
              return (
                <StationCard
                  key={station.id}
                  station={station}
                  isAvailable={isAvailable}
                  onClick={() => handleStationClick(station.id, station)}
                />
              );
            })}
          </div>
        </>
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
