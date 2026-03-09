import React from 'react';
import './SkeletonLoaders.css';

/**
 * Skeleton Loader for Header Component
 * @param {boolean} showSearchIcon - Whether to show search icon skeleton (default: false)
 */
const HeaderSkeleton = ({ showSearchIcon = false }) => {
  return (
    <div className="menu-items-header skeleton-header">
      <div className="header-left">
        {/* Logo Skeleton */}
        <div className="skeleton-header-logo"></div>
        
        {/* Brand Text Skeleton */}
        <div className="skeleton-brand-text"></div>
      </div>

      <div className="header-right">
        {/* Search Icon Skeleton - Only show if showSearchIcon is true */}
        {showSearchIcon && (
          <div className="skeleton-header-icon"></div>
        )}

        {/* Hamburger Button Skeleton - Always show */}
        <div className="skeleton-header-icon"></div>
      </div>
    </div>
  );
};

export default HeaderSkeleton;
