import React, { useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
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

  const handlePhoneChange = (value) => {
    setPhone(value || '');
    setPhoneError('');
  };

  return (
    <div className="landing-customer-capture" data-testid="landing-customer-capture">
      <div className="capture-form">
        <div className="capture-input-group">
          <PhoneInput
            international
            defaultCountry="IN"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="Phone Number"
            className={`capture-phone-input ${phoneError ? 'capture-phone-error' : ''}`}
            data-testid="capture-phone-input"
          />
          {phoneError && (
            <span className="capture-error-text">{phoneError}</span>
          )}
          {mandatoryPhone && <span className="capture-mandatory-hint">* Required</span>}
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
  if (!isValidPhoneNumber(value)) return false;
  const digits = value.replace(/\D/g, '');
  if (value.startsWith('+91')) return digits.length === 12;
  if (value.startsWith('+98')) return digits.length === 12;
  return digits.length >= 10;
};

export default LandingCustomerCapture;
