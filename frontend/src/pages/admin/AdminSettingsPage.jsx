import React, { useRef, useState } from 'react';
import { useAdminConfig } from '../../context/AdminConfigContext';
import { IoSettingsOutline, IoCloudUploadOutline, IoTimeOutline } from 'react-icons/io5';
import './AdminPages.css';

const AdminSettingsPage = () => {
  const { config, updateField, uploadImage, loading } = useAdminConfig();
  const logoInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadImage(file);
    if (url) updateField('logoUrl', url);
    setUploadingLogo(false);
    e.target.value = '';
  };

  if (loading) {
    return <div className="admin-loading">Loading settings...</div>;
  }

  return (
    <div className="admin-page" data-testid="admin-settings-page">
      <h1 className="admin-page-title">
        <IoSettingsOutline /> Settings
      </h1>
      <p className="admin-page-description">
        Configure your restaurant's basic settings and appearance
      </p>

      {/* Logo Section */}
      <div className="admin-section">
        <h2 className="admin-section-title">Restaurant Logo</h2>
        
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label className="admin-form-label">Logo URL</label>
            <div className="admin-input-with-btn">
              <input
                type="url"
                className="admin-form-input"
                placeholder="https://example.com/logo.png"
                value={config.logoUrl || ''}
                onChange={(e) => updateField('logoUrl', e.target.value)}
                data-testid="input-logoUrl"
              />
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              <button
                type="button"
                className="admin-upload-btn"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                data-testid="upload-logo-btn"
              >
                <IoCloudUploadOutline />
                {uploadingLogo ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            <span className="admin-form-hint">Paste a URL or upload an image (max 5MB)</span>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Preview</label>
            {config.logoUrl ? (
              <div className="admin-image-preview-box">
                <img
                  src={config.logoUrl}
                  alt="Logo preview"
                  className="admin-image-preview"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            ) : (
              <div className="admin-image-placeholder">No logo uploaded</div>
            )}
          </div>
        </div>
      </div>

      {/* Welcome Message Section */}
      <div className="admin-section">
        <h2 className="admin-section-title">Landing Page Text</h2>
        
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label className="admin-form-label">Welcome Message</label>
            <input
              type="text"
              className="admin-form-input"
              placeholder="Welcome to our restaurant!"
              value={config.welcomeMessage || ''}
              onChange={(e) => updateField('welcomeMessage', e.target.value)}
              data-testid="input-welcomeMessage"
            />
            <span className="admin-form-hint">Main heading shown on landing page</span>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Tagline</label>
            <input
              type="text"
              className="admin-form-input"
              placeholder="Your tagline here"
              value={config.tagline || ''}
              onChange={(e) => updateField('tagline', e.target.value)}
              data-testid="input-tagline"
            />
            <span className="admin-form-hint">Secondary text shown below welcome message</span>
          </div>

          <div className="admin-form-group full-width">
            <label className="admin-form-label">Browse Menu Button Text</label>
            <input
              type="text"
              className="admin-form-input"
              placeholder="Browse Menu"
              value={config.browseMenuButtonText || ''}
              onChange={(e) => updateField('browseMenuButtonText', e.target.value)}
              data-testid="input-browseMenuButtonText"
            />
            <span className="admin-form-hint">Label for the main button on the landing page</span>
          </div>
        </div>
      </div>

      {/* Operating Hours Section */}
      <div className="admin-section">
        <h2 className="admin-section-title">
          <IoTimeOutline /> Restaurant Operating Hours
        </h2>
        
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label className="admin-form-label">Opening Time</label>
            <input
              type="time"
              className="admin-form-input"
              value={config.restaurantOpeningTime || '06:00'}
              onChange={(e) => updateField('restaurantOpeningTime', e.target.value)}
              data-testid="input-restaurantOpeningTime"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Closing Time</label>
            <input
              type="time"
              className="admin-form-input"
              value={config.restaurantClosingTime || '03:00'}
              onChange={(e) => updateField('restaurantClosingTime', e.target.value)}
              data-testid="input-restaurantClosingTime"
            />
          </div>
        </div>
        <p className="admin-form-hint" style={{ marginTop: '12px' }}>
          The "Add" button will be hidden when restaurant is closed. Default: 6:00 AM - 3:00 AM
        </p>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
