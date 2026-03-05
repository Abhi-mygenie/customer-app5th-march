import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { IoArrowForward } from 'react-icons/io5';
import './LandingCustomerCapture.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const LandingCustomerCapture = ({
  restaurantId,
  onContinue,
  onCustomerFound,
  primaryColor = '#E8531E',
  buttonTextColor = '#FFFFFF',
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Load saved guest data on mount
  useEffect(() => {
    const savedGuest = localStorage.getItem('guestCustomer');
    if (savedGuest) {
      try {
        const { name: savedName, phone: savedPhone } = JSON.parse(savedGuest);
        if (savedName) setName(savedName);
        if (savedPhone) setPhone(savedPhone);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Validate phone number
  const isPhoneValid = (value) => {
    if (!value) return false;
    if (!isValidPhoneNumber(value)) return false;
    
    // For India, check 10 digits
    if (value.startsWith('+91')) {
      const digits = value.replace(/\D/g, '');
      return digits.length === 12; // +91 + 10 digits
    }
    return true;
  };

  const handlePhoneChange = (value) => {
    setPhone(value || '');
    setPhoneError('');
  };

  const handleContinue = async () => {
    // Validate phone
    if (!phone || !isPhoneValid(phone)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    setIsChecking(true);
    try {
      // Check if customer exists
      const response = await fetch(`${API_URL}/api/auth/check-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          restaurant_id: restaurantId,
          pos_id: '0001'
        })
      });

      const data = await response.json();

      if (data.exists) {
        // Customer found - trigger OTP login flow
        onCustomerFound({ phone, name: data.customer?.name || name });
      } else {
        // New guest - save to localStorage and continue
        const guestData = { name, phone, restaurantId };
        localStorage.setItem('guestCustomer', JSON.stringify(guestData));
        onContinue(guestData);
      }
    } catch (error) {
      console.error('Error checking customer:', error);
      // On error, continue as guest
      const guestData = { name, phone, restaurantId };
      localStorage.setItem('guestCustomer', JSON.stringify(guestData));
      onContinue(guestData);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="landing-customer-capture" data-testid="landing-customer-capture">
      <div className="capture-form">
        <div className="capture-input-group">
          <input
            type="text"
            className="capture-input"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="capture-name-input"
          />
        </div>
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
        </div>
        <button
          className="capture-continue-btn"
          onClick={handleContinue}
          disabled={isChecking}
          style={{ backgroundColor: primaryColor, color: buttonTextColor }}
          data-testid="capture-continue-btn"
        >
          {isChecking ? 'Checking...' : (
            <>
              Continue
              <IoArrowForward className="capture-btn-icon" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LandingCustomerCapture;
