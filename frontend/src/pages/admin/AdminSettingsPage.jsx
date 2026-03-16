import React, { useRef, useState } from 'react';
import { useAdminConfig } from '../../context/AdminConfigContext';
import { IoSettingsOutline, IoCloudUploadOutline, IoTimeOutline, IoAddCircleOutline, IoTrashOutline } from 'react-icons/io5';
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

      {/* Operating Shifts Section */}
      <div className="admin-section">
        <h2 className="admin-section-title">
          <IoTimeOutline /> Restaurant Operating Shifts
        </h2>
        <p className="admin-form-hint" style={{ marginBottom: '16px' }}>
          Define up to 4 shifts. The "Add to cart" button is only visible when restaurant is open and within active shifts.
        </p>

        <div className="admin-master-toggle-row" data-testid="restaurant-open-toggle-row">
          <div className="admin-master-toggle-info">
            <span className="admin-master-toggle-label">Restaurant Open</span>
            <span className="admin-form-hint">Master switch — when OFF, the "Add" button is hidden for all customers</span>
          </div>
          <label className="admin-toggle-switch" data-testid="restaurant-open-toggle">
            <input
              type="checkbox"
              checked={config.restaurantOpen === true}
              onChange={(e) => updateField('restaurantOpen', e.target.checked)}
            />
            <span className="admin-toggle-slider"></span>
          </label>
        </div>

        <div style={{ opacity: config.restaurantOpen ? 1 : 0.5, pointerEvents: config.restaurantOpen ? 'auto' : 'none' }}>
        {(config.restaurantShifts || [{ start: '06:00', end: '03:00' }]).map((shift, index) => (
          <div key={index} className="admin-shift-row" data-testid={`shift-row-${index}`}>
            <span className="admin-shift-label">Shift {index + 1}</span>
            <div className="admin-form-group">
              <label className="admin-form-label">Start</label>
              <input
                type="time"
                className="admin-form-input"
                value={shift.start || ''}
                onChange={(e) => {
                  const shifts = [...(config.restaurantShifts || [{ start: '06:00', end: '03:00' }])];
                  shifts[index] = { ...shifts[index], start: e.target.value };
                  updateField('restaurantShifts', shifts);
                }}
                data-testid={`shift-${index}-start`}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">End</label>
              <input
                type="time"
                className="admin-form-input"
                value={shift.end || ''}
                onChange={(e) => {
                  const shifts = [...(config.restaurantShifts || [{ start: '06:00', end: '03:00' }])];
                  shifts[index] = { ...shifts[index], end: e.target.value };
                  updateField('restaurantShifts', shifts);
                }}
                data-testid={`shift-${index}-end`}
              />
            </div>
            {(config.restaurantShifts || []).length > 1 && (
              <button
                type="button"
                className="admin-shift-remove-btn"
                onClick={() => {
                  const shifts = [...(config.restaurantShifts || [])];
                  shifts.splice(index, 1);
                  updateField('restaurantShifts', shifts);
                }}
                data-testid={`shift-${index}-remove`}
              >
                <IoTrashOutline />
              </button>
            )}
          </div>
        ))}

        {(config.restaurantShifts || [{ start: '06:00', end: '03:00' }]).length < 4 && (
          <button
            type="button"
            className="admin-add-shift-btn"
            onClick={() => {
              const shifts = [...(config.restaurantShifts || [{ start: '06:00', end: '03:00' }])];
              shifts.push({ start: '', end: '' });
              updateField('restaurantShifts', shifts);
            }}
            data-testid="add-shift-btn"
          >
            <IoAddCircleOutline /> Add Shift
          </button>
        )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
