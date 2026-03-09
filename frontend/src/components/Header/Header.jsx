import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IoSettingsOutline } from 'react-icons/io5';
import HamburgerMenu from '../HamburgerMenu/HamburgerMenu';
import './Header.css';

const Header = ({ brandText, logoUrl, phone, onLogoClick }) => {
  const navigate = useNavigate();
  const { isRestaurant } = useAuth();

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
