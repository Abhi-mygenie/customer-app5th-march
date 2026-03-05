import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantDetails } from '../hooks/useMenuData';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import { useScannedTable } from '../hooks/useScannedTable';
import { isMultipleMenu } from '../api/utils/restaurantIdConfig';
import Header from '../components/Header/Header';
import { IoCheckmarkCircle, IoCallOutline } from 'react-icons/io5';
import { RiBillLine } from 'react-icons/ri';
import { MdOutlineEdit, MdOutlineRestaurantMenu, MdOutlineTableRestaurant } from 'react-icons/md';
import { FaDoorOpen } from 'react-icons/fa';
import { IoTimeOutline } from 'react-icons/io5';
import { RiHashtag } from 'react-icons/ri';
import './OrderSuccess.css';

// Helper: check if a success_config flag is enabled (defaults to Y)
const isConfigEnabled = (restaurant, key) => {
  const config = restaurant?.success_config;
  if (!config) return true;
  const val = config[key];
  if (val === undefined || val === null) return true;
  return val === 'Y' || val === 'y' || val === true || val === '1';
};

// Order status steps
const ORDER_STATUSES = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'served', label: 'Served' },
];

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurantId } = useRestaurantId();
  const { restaurant } = useRestaurantDetails(restaurantId);
  const { logoUrl: configLogoUrl, phone: configPhone, fetchConfig } = useRestaurantConfig();
  const { tableNo: scannedTableNo, roomOrTable: scannedRoomOrTable, isScanned } = useScannedTable();

  const orderData = location.state?.orderData || null;

  // Fetch admin config for this restaurant
  useEffect(() => {
    if (restaurantId) {
      fetchConfig(restaurantId);
    }
  }, [restaurantId, fetchConfig]);

  // Redirect if no order data
  useEffect(() => {
    if (!orderData) {
      if (restaurantId) {
        if (isMultipleMenu(restaurant, restaurantId)) {
          navigate(`/${restaurantId}/stations`, { replace: true });
        } else {
          navigate(`/${restaurantId}/menu`, { replace: true });
        }
      } else {
        navigate('/stations', { replace: true });
      }
    }
  }, [orderData, navigate, restaurantId, restaurant]);

  if (!orderData) return null;

  // Current order status (from API or default to 'placed')
  const currentStatus = orderData.status || 'placed';
  const currentStepIndex = ORDER_STATUSES.findIndex(s => s.key === currentStatus);

  const handleGoToMenu = () => {
    if (isMultipleMenu(restaurant, restaurantId)) {
      navigate(`/${restaurantId}/stations`, { replace: true });
    } else {
      navigate(`/${restaurantId}/menu`, { replace: true });
    }
  };

  const handleEditOrder = () => {
    navigate(`/${restaurantId}/review-order`, { replace: true });
  };

  const handleCallWaiter = () => {
    // TODO: Integrate with call waiter API
    console.log('Call waiter triggered for order', orderData.orderId);
  };

  const handlePayBill = () => {
    // TODO: Integrate with pay bill flow
    console.log('Pay bill triggered for order', orderData.orderId);
  };

  // Config flags
  const showOrderStatus = isConfigEnabled(restaurant, 'show_order_status');
  const showCallWaiter = isConfigEnabled(restaurant, 'show_call_waiter');
  const showPayBill = isConfigEnabled(restaurant, 'show_pay_bill');
  const showEditOrder = isConfigEnabled(restaurant, 'show_edit_order');
  const showGoToMenu = isConfigEnabled(restaurant, 'show_go_to_menu');
  const showTableNumber = isConfigEnabled(restaurant, 'show_table_number') && isScanned && scannedTableNo;
  const showPrepTime = isConfigEnabled(restaurant, 'show_prep_time');
  const showTokenNumber = isConfigEnabled(restaurant, 'show_token_number');

  return (
    <div className="order-success-page" data-testid="order-success-page">
      <Header
        brandText={restaurant?.name}
        logoUrl={configLogoUrl || '/assets/images/ic_login_logo.png'}
        phone={configPhone || restaurant?.phone}
        onLogoClick={() => navigate(`/${restaurantId}`)}
      />
      <div className="order-success-container">

        {/* Success Icon + Title */}
        <div className="order-success-hero">
          <div className="order-success-icon" data-testid="order-success-icon">
            <IoCheckmarkCircle />
          </div>
          <h1 className="order-success-title">Order Placed!</h1>
          <p className="order-success-message">
            Your order has been received and is being processed.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="order-success-card" data-testid="order-success-card">
          <div className="order-success-card-row">
            <span className="order-success-card-label">Order ID</span>
            <span className="order-success-card-value">#{orderData.orderId || 'N/A'}</span>
          </div>
          <div className="order-success-card-divider"></div>
          <div className="order-success-card-row">
            <span className="order-success-card-label">Total</span>
            <span className="order-success-card-value order-success-card-total">₹{orderData.totalToPay || '0.00'}</span>
          </div>

          {/* Table Number */}
          {showTableNumber && (
            <>
              <div className="order-success-card-divider"></div>
              <div className="order-success-card-row" data-testid="order-success-table">
                <span className="order-success-card-label">
                  <span className="order-success-card-label-icon">
                    {scannedRoomOrTable === 'room' ? <FaDoorOpen /> : <MdOutlineTableRestaurant />}
                  </span>
                  {scannedRoomOrTable === 'room' ? 'Room' : 'Table'}
                </span>
                <span className="order-success-card-value">{scannedTableNo}</span>
              </div>
            </>
          )}

          {/* Token Number */}
          {showTokenNumber && orderData.tokenNumber && (
            <>
              <div className="order-success-card-divider"></div>
              <div className="order-success-card-row" data-testid="order-success-token">
                <span className="order-success-card-label">
                  <span className="order-success-card-label-icon"><RiHashtag /></span>
                  Token
                </span>
                <span className="order-success-card-value order-success-card-token">{orderData.tokenNumber}</span>
              </div>
            </>
          )}

          {/* Preparation Time */}
          {showPrepTime && orderData.prepTime && (
            <>
              <div className="order-success-card-divider"></div>
              <div className="order-success-card-row" data-testid="order-success-prep-time">
                <span className="order-success-card-label">
                  <span className="order-success-card-label-icon"><IoTimeOutline /></span>
                  Prep Time
                </span>
                <span className="order-success-card-value order-success-card-prep">{orderData.prepTime}</span>
              </div>
            </>
          )}
        </div>

        {/* Order Status Tracker */}
        {showOrderStatus && (
          <div className="order-status-tracker" data-testid="order-status-tracker">
            <h3 className="order-status-heading">Order Status</h3>
            <div className="order-status-steps">
              {ORDER_STATUSES.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.key} className={`order-status-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="order-status-dot">
                      {isCompleted && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {idx < ORDER_STATUSES.length - 1 && (
                      <div className={`order-status-line ${isCompleted && idx < currentStepIndex ? 'filled' : ''}`}></div>
                    )}
                    <span className="order-status-label">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="order-success-actions" data-testid="order-success-actions">

          {/* Edit Order */}
          {showEditOrder && (
            <button
              className="order-success-action-btn order-success-action-edit"
              onClick={handleEditOrder}
              data-testid="order-success-edit-btn"
            >
              <MdOutlineEdit className="order-success-action-icon" />
              Edit Order
            </button>
          )}

          {/* Call Waiter + Pay Bill Row */}
          {(showCallWaiter || showPayBill) && (
            <div className="order-success-action-row">
              {showCallWaiter && (
                <button
                  className="order-success-action-btn order-success-action-secondary"
                  onClick={handleCallWaiter}
                  data-testid="order-success-call-waiter-btn"
                >
                  <IoCallOutline className="order-success-action-icon" />
                  Call Waiter
                </button>
              )}
              {showPayBill && (
                <button
                  className="order-success-action-btn order-success-action-secondary"
                  onClick={handlePayBill}
                  data-testid="order-success-pay-bill-btn"
                >
                  <RiBillLine className="order-success-action-icon" />
                  Pay Bill
                </button>
              )}
            </div>
          )}

          {/* Go to Menu */}
          {showGoToMenu && (
            <button
              className="order-success-action-btn order-success-action-primary"
              onClick={handleGoToMenu}
              data-testid="order-success-menu-btn"
            >
              <MdOutlineRestaurantMenu className="order-success-action-icon" />
              Browse Menu
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderSuccess;
