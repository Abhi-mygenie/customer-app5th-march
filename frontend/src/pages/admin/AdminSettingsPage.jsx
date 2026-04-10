import React, { useRef, useState } from 'react';
import { useAdminConfig } from '../../context/AdminConfigContext';
import { IoSettingsOutline, IoCloudUploadOutline, IoTimeOutline, IoAddCircleOutline, IoTrashOutline, IoCardOutline, IoWalletOutline } from 'react-icons/io5';
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
          <label className="admin-master-toggle-switch" data-testid="restaurant-open-toggle">
            <input
              type="checkbox"
              checked={config.restaurantOpen !== false}
              onChange={(e) => updateField('restaurantOpen', e.target.checked)}
            />
            <span className="admin-master-toggle-knob"></span>
          </label>
        </div>

        <div style={{ opacity: config.restaurantOpen !== false ? 1 : 0.5, pointerEvents: config.restaurantOpen !== false ? 'auto' : 'none' }}>
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

      {/* Payment Options Section (FEAT-001) */}
      <div className="admin-section" data-testid="payment-settings-section">
        <h2 className="admin-section-title">
          <IoCardOutline /> Payment Options
        </h2>
        <p className="admin-form-hint" style={{ marginBottom: '16px' }}>
          Configure how customers can pay for their orders
        </p>

        {/* COD Toggle */}
        <div className="admin-master-toggle-row" data-testid="cod-enabled-toggle-row">
          <div className="admin-master-toggle-info">
            <span className="admin-master-toggle-label">
              <IoWalletOutline style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Cash on Delivery (COD)
            </span>
            <span className="admin-form-hint">Allow customers to pay at counter/billing</span>
          </div>
          <label className="admin-master-toggle-switch" data-testid="cod-enabled-toggle">
            <input
              type="checkbox"
              checked={config.codEnabled === true}
              onChange={(e) => updateField('codEnabled', e.target.checked)}
            />
            <span className="admin-master-toggle-knob"></span>
          </label>
        </div>

        {/* Online Payment Section */}
        <div className="admin-subsection">
          <h3 className="admin-subsection-title">
            <IoCardOutline style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Online Payment by Order Type
          </h3>
          <p className="admin-form-hint" style={{ marginBottom: '12px' }}>
            Enable online payment (Razorpay) for specific order types
          </p>

          <div className="admin-toggle-list">
            <div className="admin-toggle-row" data-testid="online-dinein-toggle-row">
              <span className="admin-toggle-label">Dine-in Orders</span>
              <label className="admin-toggle-switch" data-testid="online-dinein-toggle">
                <input
                  type="checkbox"
                  checked={config.onlinePaymentDinein !== false}
                  onChange={(e) => updateField('onlinePaymentDinein', e.target.checked)}
                />
                <span className="admin-toggle-knob"></span>
              </label>
            </div>

            <div className="admin-toggle-row" data-testid="online-takeaway-toggle-row">
              <span className="admin-toggle-label">Takeaway Orders</span>
              <label className="admin-toggle-switch" data-testid="online-takeaway-toggle">
                <input
                  type="checkbox"
                  checked={config.onlinePaymentTakeaway !== false}
                  onChange={(e) => updateField('onlinePaymentTakeaway', e.target.checked)}
                />
                <span className="admin-toggle-knob"></span>
              </label>
            </div>

            <div className="admin-toggle-row" data-testid="online-delivery-toggle-row">
              <span className="admin-toggle-label">Delivery Orders</span>
              <label className="admin-toggle-switch" data-testid="online-delivery-toggle">
                <input
                  type="checkbox"
                  checked={config.onlinePaymentDelivery !== false}
                  onChange={(e) => updateField('onlinePaymentDelivery', e.target.checked)}
                />
                <span className="admin-toggle-knob"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Custom Labels Section */}
        <div className="admin-subsection">
          <h3 className="admin-subsection-title">Custom Labels</h3>
          <p className="admin-form-hint" style={{ marginBottom: '12px' }}>
            Customize the text shown on payment options (leave blank for defaults)
          </p>

          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label className="admin-form-label">Online Payment Label</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="Pay Online"
                value={config.payOnlineLabel || ''}
                onChange={(e) => updateField('payOnlineLabel', e.target.value)}
                maxLength={30}
                data-testid="input-payOnlineLabel"
              />
              <span className="admin-form-hint">e.g., "UPI/Card", "Pay Now"</span>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">COD Label</label>
              <input
                type="text"
                className="admin-form-input"
                placeholder="Pay at Counter"
                value={config.payAtCounterLabel || ''}
                onChange={(e) => updateField('payAtCounterLabel', e.target.value)}
                maxLength={30}
                data-testid="input-payAtCounterLabel"
              />
              <span className="admin-form-hint">e.g., "Cash", "Pay Later"</span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="admin-info-note" data-testid="payment-info-note">
          <span className="admin-info-icon">ℹ️</span>
          <span>Online payment requires Razorpay configuration. Contact support if you need to set up Razorpay for your restaurant.</span>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
