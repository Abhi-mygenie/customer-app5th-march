import React from 'react';
import { useRestaurantConfig } from '../../context/RestaurantConfigContext';
import HamburgerMenu from '../HamburgerMenu/HamburgerMenu';
import './Header.css';

const Header = ({ brandText, logoUrl, phone, onLogoClick }) => {
  const { showHamburgerMenu } = useRestaurantConfig();
  
  // Use fallback if logoUrl is empty, null, undefined, or whitespace
  const DEFAULT_LOGO = '/assets/images/ic_login_logo.png';
  const effectiveLogoUrl = logoUrl && logoUrl.trim() ? logoUrl : DEFAULT_LOGO;

  return (
    <div className="menu-items-header">
      <div className="header-left-section">
        <div className="header-brand" onClick={onLogoClick} style={{ cursor: onLogoClick ? 'pointer' : 'default' }} data-testid="header-logo-link">
          <img 
            src={effectiveLogoUrl} 
            alt={brandText || 'Logo'} 
            className="header-logo"
            onError={(e) => {
              if (e.target.src !== DEFAULT_LOGO) {
                e.target.src = DEFAULT_LOGO;
              }
            }}
          />
        </div>
      </div>
      
      <div className="header-right">
        {showHamburgerMenu && <HamburgerMenu restaurantName={brandText} phone={phone} />}
      </div>
    </div>
  );
};

export default Header;
