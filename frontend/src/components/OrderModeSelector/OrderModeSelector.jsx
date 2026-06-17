import React from 'react';
import { MdOutlineShoppingBag, MdOutlineDeliveryDining } from 'react-icons/md';
import './OrderModeSelector.css';

/**
 * OrderModeSelector — Takeaway/Delivery toggle on landing page.
 * Shown only when orderType is takeaway or delivery.
 * Allows switching between the two modes.
 */
const OrderModeSelector = ({ mode, onModeChange, primaryColor, textColor }) => {
  return (
    <div className="order-mode-selector" data-testid="order-mode-selector">
      <button
        className={`order-mode-btn ${mode === 'takeaway' ? 'order-mode-btn-active' : ''}`}
        onClick={() => onModeChange('takeaway')}
        style={mode === 'takeaway' ? { backgroundColor: primaryColor, color: textColor } : {}}
        data-testid="order-mode-takeaway-btn"
      >
        <MdOutlineShoppingBag className="order-mode-icon" />
        <span>Takeaway</span>
      </button>
      <button
        className={`order-mode-btn ${mode === 'delivery' ? 'order-mode-btn-active' : ''}`}
        onClick={() => onModeChange('delivery')}
        style={mode === 'delivery' ? { backgroundColor: primaryColor, color: textColor } : {}}
        data-testid="order-mode-delivery-btn"
      >
        <MdOutlineDeliveryDining className="order-mode-icon" />
        <span>Delivery</span>
      </button>
    </div>
  );
};

export default OrderModeSelector;
