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
 * Maps food_status numeric value to status string
 */
const mapFoodOrderStatus = (item) => {
  const fStatus = item?.foodStatus;
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
  return 'pending';
};

/**
 * Calculate full item price including variations and add-ons
 */
const calculateFullItemPrice = (item) => {
  const basePrice = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
  
  // Calculate variations total
  let variationsTotal = 0;
  if (item.variations && item.variations.length > 0) {
    item.variations.forEach(v => {
      if (v.values) {
        const vals = Array.isArray(v.values) ? v.values : [v.values];
        vals.forEach(val => {
          variationsTotal += parseFloat(val.optionPrice) || 0;
        });
      }
      // Fallback: direct optionPrice on variation
      if (v.optionPrice) {
        variationsTotal += parseFloat(v.optionPrice) || 0;
      }
    });
  }
  
  // Calculate add-ons total
  let addonsTotal = 0;
  if (item.add_ons && item.add_ons.length > 0) {
    item.add_ons.forEach(a => {
      addonsTotal += (parseFloat(a.price) || 0) * (a.quantity || 1);
    });
  }
  
  return basePrice + variationsTotal + addonsTotal;
};

/**
 * Get variation display labels
 */
const getVariationLabels = (variations) => {
  if (!variations || variations.length === 0) return null;
  
  // API returns: variation: [{ name: "CHOICE OF SIZE", values: [{ label: "30ML", optionPrice: "0" }] }]
  // We need to extract labels from values[] array
  const labels = variations.map(v => {
    if (v.values) {
      // values is an ARRAY of objects with label property
      const vals = Array.isArray(v.values) ? v.values : [v.values];
      return vals.map(val => val.label || '').filter(Boolean).join(', ');
    }
    // Fallback for other formats
    return v.label || v.name || v.option_name || '';
  }).filter(Boolean);
  
  return labels.length > 0 ? labels.join(', ') : null;
};

/**
 * Get add-ons display labels
 */
const getAddonLabels = (addons) => {
  if (!addons || addons.length === 0) return null;
  return addons.map(a => `${a.name} x${a.quantity || 1}`).join(', ');
};

/**
 * PreviousOrderItems Component
 * Displays read-only items from a previous order during edit mode
 * These items cannot be modified or removed
 */
const PreviousOrderItems = ({ items, orderId }) => {
  const { showFoodStatus } = useRestaurantConfig();
  if (!items || items.length === 0) return null;

  // Calculate subtotal for previous items (including variations and add-ons)
  const subtotal = items.reduce((total, item) => {
    if (item.foodStatus === 3) return total; // Skip cancelled items
    const fullPrice = calculateFullItemPrice(item);
    return total + (fullPrice * (item.quantity || 1));
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
        {items.map((item, index) => {
          const fullPrice = calculateFullItemPrice(item);
          const variationLabels = getVariationLabels(item.variations);
          const addonLabels = getAddonLabels(item.add_ons);
          
          return (
            <div 
              key={item.id || index} 
              className="previous-order-item"
              data-testid={`previous-order-item-${item.id || index}`}
            >
              <div className="previous-order-item-info">
                {/* Item name */}
                <span className="previous-order-item-name">{item.item?.name || 'Unknown Item'}</span>
                
                {/* Variations */}
                {variationLabels && (
                  <span className="previous-order-item-customization" data-testid={`prev-item-variants-${index}`}>
                    Variants: {variationLabels}
                  </span>
                )}
                
                {/* Add-ons */}
                {addonLabels && (
                  <span className="previous-order-item-customization" data-testid={`prev-item-addons-${index}`}>
                    Addons: {addonLabels}
                  </span>
                )}
              </div>
              
              {/* Quantity, Price and Status - all inline */}
              <div className="previous-order-item-right">
                <span className="previous-order-item-quantity">x{item.quantity || 1}</span>
                <span className="previous-order-item-price">
                  ₹{(fullPrice * (item.quantity || 1)).toFixed(2)}
                </span>
                {showFoodStatus && <ItemStatusBadge status={mapFoodOrderStatus(item)} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PreviousOrderItems;
