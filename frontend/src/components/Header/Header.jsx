import React from 'react';
import HamburgerMenu from '../HamburgerMenu/HamburgerMenu';
import './Header.css';

const Header = ({ brandText, logoUrl, phone, onLogoClick }) => {
  return (
    <div className="menu-items-header">
      <div className="header-left-section">
        <HamburgerMenu restaurantName={brandText} phone={phone} />
        <div className="header-brand" onClick={onLogoClick} style={{ cursor: onLogoClick ? 'pointer' : 'default' }} data-testid="header-logo-link">
          <img 
            src={logoUrl || '/assets/images/mygenie_logo.png'} 
            alt={brandText || 'Logo'} 
            className="header-logo"
            onError={(e) => {
              e.target.src = '/assets/images/mygenie_logo.png';
            }}
          />
          <span className="brand-text">{brandText}</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
