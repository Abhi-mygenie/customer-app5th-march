import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IoSettingsOutline } from 'react-icons/io5';
import HamburgerMenu from '../HamburgerMenu/HamburgerMenu';
import './Header.css';

const Header = ({ brandText, logoUrl, phone, onLogoClick }) => {
  const navigate = useNavigate();
  const { isRestaurant } = useAuth();
  
  // Use fallback if logoUrl is empty, null, undefined, or whitespace
  const DEFAULT_LOGO = '/assets/images/ic_login_logo.png';
  const effectiveLogoUrl = logoUrl && logoUrl.trim() ? logoUrl : DEFAULT_LOGO;

  return (
    <div className="menu-items-header">
      <div className="header-left-section">
        <HamburgerMenu restaurantName={brandText} phone={phone} />
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
      
      {/* Admin Settings Button - Only visible for restaurant admins */}
      {isRestaurant && (
        <div className="header-right">
          <button 
            className="admin-settings-btn"
            onClick={() => navigate('/admin/settings')}
            data-testid="header-admin-settings-btn"
            title="Admin Settings"
          >
            <IoSettingsOutline />
            <span className="admin-btn-text">Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;
