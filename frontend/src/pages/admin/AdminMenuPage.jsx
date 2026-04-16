import React from 'react';
import { useAdminConfig } from '../../context/AdminConfigContext';
import { IoRestaurantOutline } from 'react-icons/io5';
import MenuOrderTab from '../../components/AdminSettings/MenuOrderTab';
import './AdminPages.css';
import '../../components/AdminSettings/MenuOrderTab.css';

const AdminMenuPage = () => {
  const { config, updateField, loading } = useAdminConfig();

  if (loading) {
    return <div className="admin-loading">Loading menu settings...</div>;
  }

  // Wrapper to make MenuOrderTab work with AdminConfigContext
  const setConfig = (updater) => {
    if (typeof updater === 'function') {
      const newConfig = updater(config);
      // Only update menuOrder field
      if (newConfig.menuOrder !== config.menuOrder) {
        updateField('menuOrder', newConfig.menuOrder);
      }
    }
  };

  return (
    <div className="admin-page" data-testid="admin-menu-page">
      <h1 className="admin-page-title">
        <IoRestaurantOutline /> Menu Order
      </h1>
      <p className="admin-page-description">
        Organize your menu stations, categories, and items
      </p>

      <div className="admin-section admin-menu-section">
        <MenuOrderTab config={config} setConfig={setConfig} />
      </div>
    </div>
  );
};

export default AdminMenuPage;
