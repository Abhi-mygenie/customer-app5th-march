import React, { useState, useRef, useEffect } from 'react';
import './SearchAndFilterBar.css';

const SearchAndFilterBar = ({ 
  searchQuery, 
  onSearchChange, 
  activeFilter, 
  onFilterChange,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilter = activeFilter !== 'all';

  return (
    <div className="search-filter-bar-container" data-testid="search-filter-bar">
      {/* Search + Filter Row */}
      <div className="search-filter-row">
        <div className="search-bar-section">
          <div className="search-bar">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search item"
              value={searchQuery}
              onChange={onSearchChange}
              data-testid="menu-search-input"
            />
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="filter-dropdown-wrapper" ref={filterRef}>
          <button
            className={`filter-dropdown-btn ${isFilterOpen ? 'open' : ''} ${hasActiveFilter ? 'has-filter' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            data-testid="menu-filter-btn"
          >
            <span className="filter-dropdown-label">Filters</span>
            <svg className={`filter-chevron ${isFilterOpen ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {isFilterOpen && (
            <div className="filter-dropdown-menu" data-testid="filter-dropdown-menu">
              <button
                className={`filter-dropdown-item ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => { onFilterChange('all'); }}
              >
                <span className="filter-item-label">All</span>
                <span className={`filter-check ${activeFilter === 'all' ? 'visible' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                </span>
              </button>
              <button
                className={`filter-dropdown-item ${activeFilter === 'veg' ? 'active' : ''}`}
                onClick={() => { onFilterChange('veg'); }}
              >
                <span className="filter-item-label">Veg</span>
                <span className={`filter-check ${activeFilter === 'veg' ? 'visible' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                </span>
              </button>
              <button
                className={`filter-dropdown-item ${activeFilter === 'non-veg' ? 'active' : ''}`}
                onClick={() => { onFilterChange('non-veg'); }}
              >
                <span className="filter-item-label">Non-Veg</span>
                <span className={`filter-check ${activeFilter === 'non-veg' ? 'visible' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                </span>
              </button>
              <button
                className={`filter-dropdown-item ${activeFilter === 'egg' ? 'active' : ''}`}
                onClick={() => { onFilterChange('egg'); }}
              >
                <span className="filter-item-label">Egg</span>
                <span className={`filter-check ${activeFilter === 'egg' ? 'visible' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilterBar;
