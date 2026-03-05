import React, { useState, useEffect } from 'react';
// import { IoPersonSharp } from "react-icons/io5";
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './CustomerDetails.css';

const CustomerDetails = ({
  name = '',
  phone = '',
  onNameChange,
  onPhoneChange,
  showTitle = true,
  className = '',
  showPhoneError = false,
  showName = true,
  showPhone = true,
}) => {
  const [phoneError, setPhoneError] = useState('');
  const [phoneValue, setPhoneValue] = useState(phone || '');

  // Sync phone value with prop
  useEffect(() => {
    setPhoneValue(phone || '');
  }, [phone]);

  // Validate phone number (10 digits for India)
  const validatePhone = (value) => {
    if (!value) {
      return { isValid: false, error: '' };
    }

    // Check if it's a valid international phone number
    if (!isValidPhoneNumber(value)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }

    // For India (+91), check if it's exactly 10 digits
    if (value.startsWith('+91')) {
      const digits = value.replace(/\D/g, '');
      const phoneDigits = digits.slice(2); // Remove country code (91)
      
      if (phoneDigits.length !== 10) {
        return { isValid: false, error: 'Phone number must be 10 digits' };
      }
    }

    return { isValid: true, error: '' };
  };

  // Handle phone change
  const handlePhoneChange = (value) => {
    setPhoneValue(value || '');
    
    // Validate
    const validation = validatePhone(value);
    setPhoneError(validation.error);
    
    // Notify parent
    onPhoneChange?.(value || '');
  };

  // Show error if prop is true
  useEffect(() => {
    if (showPhoneError) {
      const validation = validatePhone(phoneValue);
      if (!validation.isValid) {
        setPhoneError(validation.error || 'Please Enter 10 Digit Phone Number');
      }
    }
  }, [showPhoneError, phoneValue]);

  return (
    <div className={`customer-details ${className}`}>
      {showTitle && (
        <h2 className="customer-details-title">Customer Details</h2>
      )}
      <div className="customer-details-form">
        {showName && (
        <div className="customer-details-input-group">
          {/* <label className="customer-details-label">Name</label> */}
          <input
            type="text"
            className="customer-details-input"
            value={name}
            onChange={(e) => onNameChange?.(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        )}
        {showPhone && (
        <div className="customer-details-input-group">
          {/* <label className="customer-details-label">Phone Number</label> */}
          <PhoneInput
            international
            defaultCountry="IN"
            value={phoneValue}
            onChange={handlePhoneChange}
            placeholder="Enter phone number"
            className={`customer-details-phone-input ${phoneError ? 'customer-details-phone-input-error' : ''}`}
          />
          {phoneError && (
            <div className="customer-details-error">{phoneError}</div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetails;
