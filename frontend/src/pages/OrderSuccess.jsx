import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantDetails, useStations } from '../hooks/useMenuData';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import { useScannedTable } from '../hooks/useScannedTable';
import { useCart } from '../context/CartContext';
import { isMultipleMenu } from '../api/utils/restaurantIdConfig';
import { getOrderDetails, checkTableStatus } from '../api/services/orderService';
import { getStoredToken } from '../utils/authToken';
// Import centralized transformers - SINGLE SOURCE OF TRUTH for label formatting
import { getVariationLabels, getAddonLabels } from '../api/transformers/helpers';
import Header from '../components/Header/Header';
import { IoCheckmarkCircle, IoCallOutline, IoChevronDownOutline, IoChevronUpOutline, IoTimeOutline, IoCheckmarkOutline, IoCheckmarkDoneOutline, IoCloseOutline } from 'react-icons/io5';
import { RiBillLine } from 'react-icons/ri';
import { MdOutlineEdit, MdOutlineRestaurantMenu, MdOutlineTableRestaurant } from 'react-icons/md';
import { FaDoorOpen } from 'react-icons/fa';
import './OrderSuccess.css';

/**
 * Maps food_status numeric value to status string
 * 1 → Preparing, 2 → Ready, 3 → Cancelled, 5 → Served, 6 → Paid, 7 → Yet to be confirmed
 * Uses item.status (from transformer) or item.foodStatus (legacy)
 */
const mapFoodOrderStatus = (item) => {
  // Use status from transformer, fallback to foodStatus for legacy
  const fStatus = item?.status ?? item?.foodStatus;
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
 * Item Status Badge Component
 * Status: 'preparing' | 'ready' | 'served' | 'cancelled' | 'paid' | 'pending'
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
      icon: <IoCloseOutline />,
      className: 'status-cancelled'
    },
    paid: {
      label: 'Paid',
      icon: <IoCheckmarkDoneOutline />,
      className: 'status-paid'
    }
  };

  const config = statusConfig[status] || statusConfig.preparing;

  return (
    <span className={`item-status-badge ${config.className}`} data-testid={`status-${status}`}>
      {config.icon}
      <span className="item-status-label">{config.label}</span>
    </span>
  );
};

// Helper: check if a success_config flag is enabled (defaults to Y)
const isConfigEnabled = (restaurant, key) => {
  const config = restaurant?.success_config;
  if (!config) return true;
  const val = config[key];
  if (val === undefined || val === null) return true;
  return val === 'Y' || val === 'y' || val === true || val === '1';
};

// NOTE: getVariationLabels and getAddonLabels are now imported from '../api/transformers'
// This ensures consistent label formatting across the app

// Order status steps mapped to f_order_status values
// 7 → Order Placed, 1 → Confirmed, 2 → Preparing, 5 → Served
const ORDER_STATUSES = [
  { key: 7, label: 'Order Placed' },
  { key: 1, label: 'Confirmed' },
  { key: 2, label: 'Preparing' },
  { key: 5, label: 'Served' },
];

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurantId } = useRestaurantId();
  const { restaurant } = useRestaurantDetails(restaurantId);
  const numericRestaurantId = restaurant?.id?.toString() || restaurantId;
  const { stations } = useStations(numericRestaurantId);
  const { logoUrl: configLogoUrl, phone: configPhone, fetchConfig, showFoodStatus, showOrderStatusTracker, showCallWaiter: configShowCallWaiter, showPayBill: configShowPayBill } = useRestaurantConfig();
  const { tableNo: scannedTableNo, tableId: scannedTableId, roomOrTable: scannedRoomOrTable, isScanned, clearScannedTable } = useScannedTable();
  const { startEditOrder, clearCart, clearEditMode } = useCart();
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showItems, setShowItems] = useState(true);
  const [showBillSummary, setShowBillSummary] = useState(true);
  const [liveOrderItems, setLiveOrderItems] = useState([]);
  const [billSummary, setBillSummary] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [fOrderStatus, setFOrderStatus] = useState(null);
  const [restaurantOrderId, setRestaurantOrderId] = useState(null);
  const [liveOrderAmount, setLiveOrderAmount] = useState(null);

  const orderData = location.state?.orderData || null;
  const orderId = orderData?.orderId;
  
  // Use billSummary from location.state (passed from ReviewOrder) as primary source
  const passedBillSummary = orderData?.billSummary || null;
  
  // Use ONLY items from API (single source of truth)
  const allItems = liveOrderItems;
  const totalItemsCount = allItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Initialize billSummary from passed data
  useEffect(() => {
    if (passedBillSummary && !billSummary) {
      setBillSummary(passedBillSummary);
    }
  }, [passedBillSummary, billSummary]);

  // Fetch order details and update item statuses
  const fetchOrderStatus = async (isInitial = false) => {
    if (!orderId) return;
    
    try {
      if (isInitial) setIsLoadingStatus(true);
      const orderDetails = await getOrderDetails(orderId);
      
      // Check if table has been merged/transferred (table now free = order moved away)
      // Read scanned table from sessionStorage (always current, avoids stale closure)
      const storageKey = `scanned_table_${restaurantId}`;
      const storedTable = sessionStorage.getItem(storageKey);
      const scannedData = storedTable ? JSON.parse(storedTable) : null;
      const tableIdForCheck = scannedData?.table_id;

      if (tableIdForCheck && String(tableIdForCheck) !== '0') {
        try {
          const tableCheckResult = await checkTableStatus(
            tableIdForCheck,
            numericRestaurantId,
            getStoredToken()
          );
          if (tableCheckResult.isAvailable || tableCheckResult.isInvalid) {
            clearCart();
            clearEditMode();
            navigate(`/${restaurantId}`, { replace: true });
            return;
          }
        } catch (tableCheckErr) {
          console.error('Table status check failed:', tableCheckErr);
        }
      }

      if (orderDetails?.previousItems && orderDetails.previousItems.length > 0) {
        // DEBUG: Log raw data from orderService
        console.log('=== ORDER SUCCESS DEBUG ===');
        console.log('Raw orderDetails.previousItems:', orderDetails.previousItems);
        
        // Use transformer properties directly - no manual re-mapping needed
        const updatedItems = orderDetails.previousItems.map((item, idx) => {
          // DEBUG: Log each item's price fields
          console.log(`Item ${idx} (${item.name}):`, {
            'item.price (basePrice from transformer)': item.price,
            'item.fullPrice (base + variations + addons)': item.fullPrice,
            'item.unitPrice (legacy alias)': item.unitPrice,
            'item.quantity': item.quantity,
            'item.variations': item.variations,
            'item.variationsTotal': item.variationsTotal,
            'item.addons': item.addons,
            'item.addonsTotal': item.addonsTotal,
            'CALCULATED: fullPrice * qty': (item.fullPrice ?? item.price ?? 0) * (item.quantity || 1),
          });
          
          return {
            id: item.id,
            name: item.name || item.item?.name || 'Item',
            // Use fullPrice from transformer (already includes variations + addons)
            price: item.fullPrice ?? item.price ?? 0,
            quantity: item.quantity || 1,
            veg: item.veg ?? (item.item?.veg === true || item.item?.veg === 1),
            // Use status from transformer, fallback to foodStatus
            status: item.status,
            foodStatus: item.status ?? item.foodStatus,
            // Use transformed variations/addons
            variations: item.variations || [],
            addons: item.addons || [],
            notes: item.notes || '',
            orderNote: item.orderNote || '',
          };
        });
        
        console.log('Mapped updatedItems:', updatedItems);
        console.log('=== END DEBUG ===');
        
        setLiveOrderItems(updatedItems);
        
        // Update order-level status from API
        if (orderDetails.fOrderStatus !== undefined && orderDetails.fOrderStatus !== null) {
          setFOrderStatus(orderDetails.fOrderStatus);
          
          // Store restaurant_order_id from API
          if (orderDetails.restaurantOrderId) {
            setRestaurantOrderId(orderDetails.restaurantOrderId);
          }
          
          // Store live order_amount from API (reflects cancellations)
          if (orderDetails.orderAmount) {
            setLiveOrderAmount(orderDetails.orderAmount);
          }
          
          // Status 3 (Cancelled) or 6 (Paid) → clear state and redirect to landing page
          if (orderDetails.fOrderStatus === 3 || orderDetails.fOrderStatus === 6) {
            clearCart();
            clearEditMode();
            clearScannedTable();
            if (orderDetails.fOrderStatus === 3) {
              toast('Your order has been cancelled.', { icon: '❌', duration: 4000 });
            } else {
              toast.success('Payment received. Thank you!', { duration: 4000 });
            }
            navigate(`/${restaurantId}`, { replace: true });
            return;
          }
        }

        // Recalculate billSummary with API data + persisted loyalty discount
        if (orderDetails.billSummary) {
          const apiBillSummary = orderDetails.billSummary;
          // Read directly from passedBillSummary (sync) to avoid race condition with async state
          const persistedPointsDiscount = passedBillSummary?.pointsDiscount || 0;
          const persistedPointsRedeemed = passedBillSummary?.pointsRedeemed || 0;
          
          // Recalculate subtotal with loyalty discount applied
          const itemTotal = apiBillSummary.itemTotal || 0;
          const subtotalAfterDiscount = Math.max(0, itemTotal - persistedPointsDiscount);
          
          // Recalculate tax on discounted subtotal (same logic as ReviewOrder)
          // Tax should be calculated on subtotal after discount
          const taxRatio = itemTotal > 0 ? subtotalAfterDiscount / itemTotal : 1;
          const adjustedCgst = parseFloat((apiBillSummary.cgst * taxRatio).toFixed(2));
          const adjustedSgst = parseFloat((apiBillSummary.sgst * taxRatio).toFixed(2));
          const adjustedVat = parseFloat((apiBillSummary.vat * taxRatio).toFixed(2));
          const adjustedTotalTax = parseFloat((adjustedCgst + adjustedSgst + adjustedVat).toFixed(2));
          
          // Local grand total = subtotal after discount + adjusted tax (no rounding)
          const localGrandTotal = parseFloat((subtotalAfterDiscount + adjustedTotalTax).toFixed(2));
          
          // Use order_amount from API as grand total (includes rounding applied at order placement)
          const apiOrderAmount = orderDetails.orderAmount || localGrandTotal;
          const hasRoundingDiff = apiOrderAmount !== localGrandTotal;
          
          setBillSummary({
            ...apiBillSummary,
            pointsDiscount: persistedPointsDiscount,
            pointsRedeemed: persistedPointsRedeemed,
            subtotal: subtotalAfterDiscount,
            cgst: adjustedCgst,
            sgst: adjustedSgst,
            vat: adjustedVat,
            totalTax: adjustedTotalTax,
            grandTotal: apiOrderAmount,
            originalTotal: hasRoundingDiff ? localGrandTotal : null
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch order status:', error);
      
      // If order not found (deleted), clear state and redirect
      if (error?.response?.status === 404 || error?.response?.data?.errors) {
        clearCart();
        clearEditMode();
        clearScannedTable();
        toast('Order not found. It may have been deleted.', { icon: '❌', duration: 4000 });
        navigate(`/${restaurantId}`, { replace: true });
        return;
      }
    } finally {
      if (isInitial) setIsLoadingStatus(false);
    }
  };

  // Fetch order status on mount and poll every 1 minute
  useEffect(() => {
    if (!orderId) return;

    // Initial fetch (shows loading state)
    fetchOrderStatus(true);

    // Poll every 60 seconds (silent update, no loading flash)
    const pollInterval = setInterval(() => {
      fetchOrderStatus(false);
    }, 60000);

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  }, [orderId]);

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
        if (isMultipleMenu(restaurant)) {
          navigate(`/${restaurantId}/stations`, { replace: true });
        } else {
          navigate(`/${restaurantId}/menu`, { replace: true });
        }
      } else {
        navigate('/menu', { replace: true });
      }
    }
  }, [orderData, navigate, restaurantId, stations]);

  if (!orderData) return null;

  // Current order status from f_order_status (default to 7 = Order Placed)
  const currentStepIndex = ORDER_STATUSES.findIndex(s => s.key === (fOrderStatus ?? 7));

  const handleGoToMenu = () => {
    if (isMultipleMenu(restaurant)) {
      navigate(`/${restaurantId}/stations`, { replace: true });
    } else {
      navigate(`/${restaurantId}/menu`, { replace: true });
    }
  };

  const handleEditOrder = async () => {
    if (!orderData?.orderId) {
      console.error('No order ID available for editing');
      return;
    }

    setIsLoadingEdit(true);
    try {
      // FIRST: Check if table is still occupied with an active order
      if (scannedTableId) {
        const token = await getStoredToken();
        const tableStatus = await checkTableStatus(scannedTableId, restaurantId, token);
        
        // If table is FREE (no active order), redirect to landing page for fresh order
        if (!tableStatus.isOccupied || !tableStatus.orderId) {
          clearEditMode();
          clearCart();
          toast('Table is now free. Starting fresh order.', { icon: 'ℹ️' });
          navigate(`/${restaurantId}`, { replace: true });
          return;
        }
      }

      // Fetch order details from API
      const orderDetails = await getOrderDetails(orderData.orderId);
      
      // Check if order is cancelled or paid
      if (orderDetails.fOrderStatus === 3 || orderDetails.fOrderStatus === 6) {
        clearEditMode();
        clearCart();
        toast(orderDetails.fOrderStatus === 3 ? 'This order was cancelled.' : 'This order has been paid.', { icon: 'ℹ️' });
        navigate(`/${restaurantId}`, { replace: true });
        return;
      }
      
      // Start edit mode with previous items (including cancelled for visibility)
      startEditOrder(
        orderData.orderId,
        orderDetails.previousItems,
        {
          tableId: orderDetails.tableId,
          tableNo: orderDetails.tableNo,
          restaurant: orderDetails.restaurant,
        }
      );

      // Navigate to menu to add more items
      if (isMultipleMenu(restaurant)) {
        navigate(`/${restaurantId}/stations`, { replace: true });
      } else {
        navigate(`/${restaurantId}/menu`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to fetch order details for editing:', error);
      // Still allow navigation even if API fails
      navigate(`/${restaurantId}/review-order`, { replace: true });
    } finally {
      setIsLoadingEdit(false);
    }
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
  const showOrderStatus = showOrderStatusTracker;
  const showCallWaiter = configShowCallWaiter;
  const showPayBill = configShowPayBill;
  const showTableNumber = isConfigEnabled(restaurant, 'show_table_number') && isScanned && scannedTableNo;
  
  // Edit Order vs Browse Menu - based on table presence and order status
  // If fOrderStatus === 7 (Yet to be confirmed) → Show "Yet to be confirmed" message, no edit
  // If fOrderStatus === 1, 2, or 5 (Confirmed/Preparing/Served) → Show Edit Order button
  // If no table → Show Browse Menu (no table to edit, start fresh)
  const hasTable = isScanned && scannedTableNo;
  const showYetToBeConfirmed = hasTable && fOrderStatus === 7;
  const showEditOrder = hasTable && fOrderStatus !== 7 && fOrderStatus !== null;
  const showBrowseMenu = !hasTable;

  return (
    <div className="order-success-page" data-testid="order-success-page">
      <Header
        brandText={restaurant?.name}
        phone={configPhone || restaurant?.phone}
        onBackClick={() => navigate(`/${restaurantId}`)}
      />
      <div className="order-success-container">

        {/* Compact Hero: Icon + Title inline */}
        <div className="order-success-hero-compact">
          <div className="order-success-icon-small" data-testid="order-success-icon">
            <IoCheckmarkCircle />
          </div>
          <div className="order-success-hero-text">
            <h1 className="order-success-title-compact">Order Placed!</h1>
            <p className="order-success-message-compact">
              Your order is being processed
            </p>
          </div>
        </div>

        {/* Order Details Card - Compact */}
        <div className="order-success-card-compact" data-testid="order-success-card">
          {/* Order ID + Total in one row */}
          <div className="order-success-main-row">
            <div className="order-success-order-info">
              <span className="order-success-order-label">Order</span>
              <span className="order-success-order-id">
                #{restaurantOrderId || orderData.orderId || 'N/A'}
                {restaurantOrderId && <span> ({orderData.orderId})</span>}
              </span>
            </div>
            <span className="order-success-total">₹{liveOrderAmount || orderData.totalToPay || '0.00'}</span>
          </div>

          {/* Table Number - inline */}
          {showTableNumber && (
            <div className="order-success-table-row">
              <span className="order-success-table-icon">
                {scannedRoomOrTable === 'room' ? <FaDoorOpen /> : <MdOutlineTableRestaurant />}
              </span>
              <span className="order-success-table-label">
                {scannedRoomOrTable === 'room' ? 'Room' : 'Table'}
              </span>
              <span className="order-success-table-value">{scannedTableNo}</span>
            </div>
          )}
        </div>

        {/* Items Ordered - Collapsible */}
        {(isLoadingStatus || allItems.length > 0) && (
          <div className="order-success-items-card">
            <div 
              className="order-success-items-header"
              onClick={() => setShowItems(!showItems)}
              data-testid="toggle-items-btn"
            >
              <span className="order-success-items-title">
                {isLoadingStatus ? 'Loading Items...' : `Items Ordered (${totalItemsCount})`}
              </span>
              <span className="order-success-items-toggle">
                {showItems ? <IoChevronUpOutline /> : <IoChevronDownOutline />}
              </span>
            </div>
            {showItems && (
              <div className="order-success-items-list">
                {/* Loading State */}
                {isLoadingStatus && (
                  <div className="order-success-items-loading">
                    <span>Fetching order details...</span>
                  </div>
                )}
                
                {/* All Items - Single flat list from API */}
                {!isLoadingStatus && allItems.map((item, index) => (
                  <div key={`item-${index}`} className="order-success-item-row">
                    <div className="order-success-item-info">
                      <span className={`order-success-item-veg ${item.veg ? 'veg' : 'non-veg'}`}>
                        <span className="veg-dot"></span>
                      </span>
                      <div className="order-success-item-details">
                        <span className="order-success-item-name">{item.name || 'Item'}</span>
                        {/* Use transformed variations from transformer */}
                        {item.variations && item.variations.length > 0 && getVariationLabels(item.variations) && (
                          <span className="order-success-item-customization" data-testid={`item-variants-${index}`}>
                            Variants: {getVariationLabels(item.variations)}
                          </span>
                        )}
                        {/* Use addons from transformer (not add_ons) */}
                        {item.addons && item.addons.length > 0 && (
                          <span className="order-success-item-customization" data-testid={`item-addons-${index}`}>
                            Addons: {getAddonLabels(item.addons)}
                          </span>
                        )}
                        {(item.notes || item.foodLevelNotes) && (
                          <span className="order-success-item-customization" data-testid={`item-cooking-${index}`}>
                            🍳 {item.notes || item.foodLevelNotes}
                          </span>
                        )}
                      </div>
                      <span className="order-success-item-qty">x{item.quantity || 1}</span>
                    </div>
                    <div className="order-success-item-right">
                      <span className="order-success-item-price">
                        ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </span>
                      {showFoodStatus && fOrderStatus !== 7 && <ItemStatusBadge status={mapFoodOrderStatus(item)} />}
                    </div>
                  </div>
                ))}
                {/* Order-level special instructions */}
                {allItems.length > 0 && allItems[0]?.orderNote && (
                  <div className="order-success-special-instructions" data-testid="order-special-instructions">
                    <span className="order-success-item-customization">
                      📝 Special Instructions: {allItems[0].orderNote}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bill Summary - Collapsible */}
        {billSummary && (
          <div className="order-success-bill-card">
            <div 
              className="order-success-bill-header"
              onClick={() => setShowBillSummary(!showBillSummary)}
              data-testid="toggle-bill-btn"
            >
              <span className="order-success-bill-title">
                <RiBillLine /> Bill Summary
              </span>
              <span className="order-success-bill-toggle">
                {showBillSummary ? <IoChevronUpOutline /> : <IoChevronDownOutline />}
              </span>
            </div>
            {showBillSummary && (
              <div className="order-success-bill-content">
                <div className="bill-row">
                  <span className="bill-label">Item Total</span>
                  <span className="bill-value">₹{billSummary.itemTotal.toFixed(2)}</span>
                </div>
                {(billSummary.pointsDiscount > 0 || billSummary.discount > 0) && (
                  <div className="bill-row bill-row-discount">
                    <span className="bill-label">
                      {billSummary.pointsDiscount > 0 
                        ? `Loyalty Points (${billSummary.pointsRedeemed || 0} pts)` 
                        : 'Discount'}
                    </span>
                    <span className="bill-value bill-discount">
                      -₹{(billSummary.pointsDiscount || billSummary.discount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="bill-row bill-row-subtotal">
                  <span className="bill-label">Subtotal</span>
                  <span className="bill-value">₹{billSummary.subtotal.toFixed(2)}</span>
                </div>
                {billSummary.cgst > 0 && (
                  <div className="bill-row bill-row-tax">
                    <span className="bill-label-sub">CGST</span>
                    <span className="bill-value-sub">₹{billSummary.cgst.toFixed(2)}</span>
                  </div>
                )}
                {billSummary.sgst > 0 && (
                  <div className="bill-row bill-row-tax">
                    <span className="bill-label-sub">SGST</span>
                    <span className="bill-value-sub">₹{billSummary.sgst.toFixed(2)}</span>
                  </div>
                )}
                {billSummary.vat > 0 && (
                  <div className="bill-row bill-row-tax">
                    <span className="bill-label-sub">VAT</span>
                    <span className="bill-value-sub">₹{billSummary.vat.toFixed(2)}</span>
                  </div>
                )}
                <div className="bill-row bill-row-total">
                  <span className="bill-label-total">Grand Total</span>
                  <span className="bill-value-total">
                    ₹{billSummary.grandTotal.toFixed(2)}
                    {billSummary.originalTotal != null && (
                      <span style={{ fontSize: '0.8em', opacity: 0.7, marginLeft: '4px' }}>(₹{billSummary.originalTotal.toFixed(2)})</span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Status Tracker - Compact */}
        {showOrderStatus && (
          <div className="order-status-tracker-compact" data-testid="order-status-tracker">
            <div className="order-status-steps-compact">
              {ORDER_STATUSES.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.key} className={`order-status-step-compact ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="order-status-dot-compact">
                      {isCompleted && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {idx < ORDER_STATUSES.length - 1 && (
                      <div className={`order-status-line-compact ${isCompleted && idx < currentStepIndex ? 'filled' : ''}`}></div>
                    )}
                    <span className="order-status-label-compact">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons - Landing Page Style */}
        <div className="order-success-actions-compact" data-testid="order-success-actions">
          {/* Yet to be confirmed message - when fOrderStatus === 7 */}
          {showYetToBeConfirmed && (
            <div className="order-success-pending-msg" data-testid="order-pending-confirmation">
              <IoTimeOutline />
              <span>Yet to be confirmed</span>
            </div>
          )}

          {/* Edit Order - when order is confirmed (fOrderStatus !== 7) */}
          {showEditOrder && (
            <button
              className="order-success-btn order-success-btn-primary"
              onClick={handleEditOrder}
              disabled={isLoadingEdit}
              data-testid="order-success-edit-btn"
            >
              <MdOutlineEdit />
              {isLoadingEdit ? 'Loading...' : 'EDIT ORDER'}
            </button>
          )}

          {/* Browse Menu - when no table */}
          {showBrowseMenu && (
            <button
              className="order-success-btn order-success-btn-primary"
              onClick={handleGoToMenu}
              data-testid="order-success-browse-menu-btn"
            >
              <MdOutlineRestaurantMenu />
              BROWSE MENU
            </button>
          )}

          {/* Bottom row: Call Waiter + Pay Bill */}
          <div className="order-success-btn-row">
            {showCallWaiter && (
              <button
                className="order-success-btn order-success-btn-outline"
                onClick={handleCallWaiter}
                data-testid="order-success-call-waiter-btn"
              >
                <IoCallOutline />
                <span>CALL WAITER</span>
              </button>
            )}
            {showPayBill && (
              <button
                className="order-success-btn order-success-btn-outline"
                onClick={handlePayBill}
                data-testid="order-success-pay-bill-btn"
              >
                <RiBillLine />
                <span>PAY BILL</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderSuccess;
