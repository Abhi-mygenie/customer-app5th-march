import React from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';
import './SearchAndFilterBar.css';

const SearchAndFilterBar = ({ 
  searchQuery, 
  onSearchChange, 
  activeFilter, 
  onFilterChange,
  // New props for dietary tags
  activeDietaryTags = [],
  onDietaryTagChange,
  availableDietaryTags = [],
  hideFilters = false,  // BUG-2026-11-25-002: hide chips during active search
  onSearchBack,  // CR-2026-11-25-001: back arrow during search, clears query
}) => {
  // Handle veg toggle click (single select for veg/non-veg/egg)
  const handleVegToggle = (filter) => {
    if (activeFilter === filter) {
      onFilterChange('all'); // Deselect if clicking active filter
    } else {
      onFilterChange(filter);
    }
  };

  // Handle dietary tag click (multi-select)
  const handleDietaryTagClick = (tagId) => {
    if (tagId === 'all') {
      // Clear all dietary tags
      onDietaryTagChange([]);
    } else {
      // Toggle the tag
      if (activeDietaryTags.includes(tagId)) {
        onDietaryTagChange(activeDietaryTags.filter(t => t !== tagId));
      } else {
        onDietaryTagChange([...activeDietaryTags, tagId]);
      }
    }
  };

  const isAllDietarySelected = activeDietaryTags.length === 0;

  return (
    <div className="search-filter-bar-container" data-testid="search-filter-bar">
      {/* Row 1: Search + Veg Toggle */}
      <div className="search-filter-row">
        {/* CR-2026-11-25-001: back arrow replaces app header during search */}
        {hideFilters && onSearchBack && (
          <button
            type="button"
            className="search-back-btn"
            onClick={onSearchBack}
            aria-label="Clear search and go back to menu"
            data-testid="search-back-btn"
          >
            <IoArrowBackOutline />
          </button>
        )}
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

        {/* Veg/Non-Veg/Egg Toggle — BUG-2026-11-25-002: hidden during active search */}
        {!hideFilters && (
        <div className="veg-toggle-group" data-testid="veg-toggle-group">
          <button
            className={`veg-toggle-btn veg ${activeFilter === 'veg' ? 'active' : ''}`}
            onClick={() => handleVegToggle('veg')}
            data-testid="veg-toggle-veg"
          >
            <span className="veg-dot veg-dot-green"></span>
            Veg
          </button>
          <button
            className={`veg-toggle-btn non-veg ${activeFilter === 'non-veg' ? 'active' : ''}`}
            onClick={() => handleVegToggle('non-veg')}
            data-testid="veg-toggle-nonveg"
          >
            <span className="veg-dot veg-dot-red"></span>
            Non-Veg
          </button>
          <button
            className={`veg-toggle-btn egg ${activeFilter === 'egg' ? 'active' : ''}`}
            onClick={() => handleVegToggle('egg')}
            data-testid="veg-toggle-egg"
          >
            <span className="veg-dot veg-dot-yellow"></span>
            Egg
          </button>
        </div>
        )}
      </div>

      {/* Row 2: Dietary Tags Chips (only show if there are available tags) */}
      {/* BUG-2026-11-25-002: also hide dietary tag chips during search */}
      {!hideFilters && availableDietaryTags.length > 0 && (
        <div className="dietary-tags-row" data-testid="dietary-tags-row">
          <div className="dietary-tags-scroll">
            {/* All chip */}
            <button
              className={`dietary-tag-chip ${isAllDietarySelected ? 'active' : ''}`}
              onClick={() => handleDietaryTagClick('all')}
              data-testid="dietary-tag-all"
            >
              All
            </button>
            
            {/* Dietary tag chips */}
            {availableDietaryTags.map((tag) => (
              <button
                key={tag.id}
                className={`dietary-tag-chip ${activeDietaryTags.includes(tag.id) ? 'active' : ''}`}
                onClick={() => handleDietaryTagClick(tag.id)}
                data-testid={`dietary-tag-${tag.id}`}
              >
                <span className="dietary-tag-icon">{tag.icon}</span>
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilterBar;
