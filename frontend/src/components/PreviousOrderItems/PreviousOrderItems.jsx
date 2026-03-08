import React from 'react';
import { IoLockClosedOutline, IoTimeOutline, IoCheckmarkOutline, IoCheckmarkDoneOutline } from 'react-icons/io5';
import { useRestaurantConfig } from '../../context/RestaurantConfigContext';
import './PreviousOrderItems.css';

/**
 * Item Status Badge Component
 * Status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'paid'
 */
const ItemStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: {
      label: 'Yet to be confirmed',
      icon: <IoTimeOutline />,
      className: 'status-pending'
    },
    preparing: {
      label: 'Preparing',
      icon: <IoTimeOutline />,
      className: 'status-preparing'
    },
    ready: {
      label: 'Ready',
      icon: <IoCheckmarkOutline />,
      className: 'status-ready'
    },
    served: {
      label: 'Served',
      icon: <IoCheckmarkDoneOutline />,
      className: 'status-served'
    },
    cancelled: {
      label: 'Cancelled',
      icon: <IoTimeOutline />,
      className: 'status-cancelled'
    },
    paid: {
      label: 'Paid',
      icon: <IoCheckmarkDoneOutline />,
      className: 'status-paid'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`item-status-badge ${config.className}`} data-testid={`status-${status}`}>
      {config.icon}
      <span className="item-status-label">{config.label}</span>
    </span>
  );
};

/**
 * Maps f_order_status numeric value to status string
 */
const mapFoodOrderStatus = (item) => {
  const fStatus = item?.f_order_status;
  if (fStatus !== undefined && fStatus !== null) {
    const statusMap = {
      1: 'preparing',
      2: 'ready',
      3: 'cancelled',
      5: 'served',
      6: 'paid',
      7: 'pending'
    };
    return statusMap[fStatus] || 'pending';
  }
  return item?.foodStatus || 'pending';
};

/**
 * PreviousOrderItems Component
 * Displays read-only items from a previous order during edit mode
 * These items cannot be modified or removed
 */
const PreviousOrderItems = ({ items, orderId }) => {
  const { showFoodStatus } = useRestaurantConfig();
  if (!items || items.length === 0) return null;

  // Calculate subtotal for previous items
  const subtotal = items.reduce((total, item) => {
    const price = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
    return total + (price * item.quantity);
  }, 0);

  return (
    <div className="previous-order-section" data-testid="previous-order-section">
      {/* Section Header */}
      <div className="previous-order-header">
        <div className="previous-order-title-row">
          <IoLockClosedOutline className="previous-order-lock-icon" />
          <h3 className="previous-order-title">Previously Ordered</h3>
        </div>
      </div>

      {/* Items List */}
      <div className="previous-order-items-list">
        {items.map((item, index) => (
          <div 
            key={item.id || index} 
            className="previous-order-item"
            data-testid={`previous-order-item-${item.id || index}`}
          >
            {/* Item name */}
            <span className="previous-order-item-name">{item.item?.name || 'Unknown Item'}</span>
            
            {/* Quantity, Price and Status - all inline */}
            <div className="previous-order-item-right">
              <span className="previous-order-item-quantity">x{item.quantity}</span>
              <span className="previous-order-item-price">
                ₹{((parseFloat(item.unitPrice) || parseFloat(item.price) || 0) * item.quantity).toFixed(0)}
              </span>
              {showFoodStatus && <ItemStatusBadge status={mapFoodOrderStatus(item)} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviousOrderItems;
