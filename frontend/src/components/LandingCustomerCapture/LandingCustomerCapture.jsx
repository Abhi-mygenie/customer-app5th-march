import React, { useEffect } from 'react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import './LandingCustomerCapture.css';

const LandingCustomerCapture = ({
  phone,
  setPhone,
  name,
  setName,
  phoneError,
  setPhoneError,
  mandatoryName = false,
  mandatoryPhone = false,
}) => {
  // Load saved guest data on mount
  useEffect(() => {
    const savedGuest = localStorage.getItem('guestCustomer');
    if (savedGuest) {
      try {
        const { name: savedName, phone: savedPhone } = JSON.parse(savedGuest);
        if (savedName && !name) setName(savedName);
        if (savedPhone && !phone) setPhone(savedPhone);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Extract bare 10-digit number for display (strip +91)
  const getDisplayPhone = (val) => {
    if (!val) return '';
    if (val.startsWith('+91')) return val.slice(3);
    return val.replace(/^\+?\d{0,2}/, '');
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10); // Only digits, max 10
    setPhone(raw ? `+91${raw}` : '');
    setPhoneError('');
  };

  return (
    <div className="landing-customer-capture" data-testid="landing-customer-capture">
      <div className="capture-form">
        <div className="capture-input-group">
          <input
            type="tel"
            className={`capture-input ${phoneError ? 'capture-phone-error-border' : ''}`}
            placeholder="Phone Number"
            value={getDisplayPhone(phone)}
            onChange={handlePhoneChange}
            maxLength={10}
            inputMode="numeric"
            data-testid="capture-phone-input"
          />
          {phoneError && (
            <span className="capture-error-text">{phoneError}</span>
          )}
          {mandatoryPhone && !phoneError && <span className="capture-mandatory-hint">* Required</span>}
        </div>
        <div className="capture-input-group">
          <input
            type="text"
            className="capture-input"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="capture-name-input"
          />
          {mandatoryName && <span className="capture-mandatory-hint">* Required</span>}
        </div>
      </div>
    </div>
  );
};

// Validation helper - exported for use by LandingPage
export const isPhoneValid = (value) => {
  if (!value) return false;
  // Try the library validation first
  try {
    if (isValidPhoneNumber(value)) {
      const digits = value.replace(/\D/g, '');
      if (value.startsWith('+91')) return digits.length === 12;
      return digits.length >= 10;
    }
  } catch (e) {
    // Fallback: manual check
  }
  // Fallback: check bare digits
  const digits = value.replace(/\D/g, '');
  if (value.startsWith('+91')) return digits.length === 12;
  return digits.length === 10;
};

export default LandingCustomerCapture;
