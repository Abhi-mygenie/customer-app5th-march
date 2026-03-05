import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { isValidPhoneNumber } from 'react-phone-number-input';
import Select from 'react-select';
import { useCart } from '../context/CartContext';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantDetails, useTableConfig } from '../hooks/useMenuData';
import { useScannedTable } from '../hooks/useScannedTable';
import { useAuth } from '../context/AuthContext';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import { getAuthToken, isTokenExpired } from '../utils/authToken';
import { placeOrder } from '../api/services/orderService';
import OrderItemCard from '../components/OrderItemCard/OrderItemCard';
import { IoArrowBackOutline, IoGiftOutline, IoPersonOutline } from "react-icons/io5";
import { isMultipleMenu } from '../api/utils/restaurantIdConfig';
import { MdOutlineShoppingBag, MdOutlineTableRestaurant  } from "react-icons/md";
import { FaDoorOpen } from "react-icons/fa";
// import { GiShoppingCart } from "react-icons/gi";
import ReviewOrderPriceBreakdown from '../components/ReviewOrderPriceBreakdown/ReviewOrderPriceBreakdown';
import { RiFileList3Line } from "react-icons/ri";
import CustomerDetails from '../components/CustomerDetails/CustomerDetails';
import './ReviewOrder.css';

// Helper function to check if a string is purely numeric
const isNumeric = (str) => {
  return /^\d+$/.test(str);
};

// Helper function to extract numeric value for sorting
const getNumericValue = (str) => {
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
};

// Sort function: numeric-first, then alphanumeric
const sortTableNumbers = (a, b) => {
  const aNum = isNumeric(a.table_no);
  const bNum = isNumeric(b.table_no);

  // Both numeric - sort numerically
  if (aNum && bNum) {
    return parseInt(a.table_no, 10) - parseInt(b.table_no, 10);
  }

  // Only a is numeric - a comes first
  if (aNum && !bNum) {
    return -1;
  }

  // Only b is numeric - b comes first
  if (!aNum && bNum) {
    return 1;
  }

  // Both alphanumeric - sort by numeric part first, then alphabetically
  const aNumValue = getNumericValue(a.table_no);
  const bNumValue = getNumericValue(b.table_no);

  if (aNumValue !== bNumValue) {
    return aNumValue - bNumValue;
  }

  // If numeric parts are equal, sort alphabetically
  return a.table_no.localeCompare(b.table_no);
};

const ReviewOrder = () => {
  const navigate = useNavigate();
  const { restaurantId } = useRestaurantId();
  const { isAuthenticated, user, isCustomer } = useAuth();
  const { showCustomerDetails: configShowCustomerDetails, showCustomerName: configShowCustomerName, showCustomerPhone: configShowCustomerPhone, showCookingInstructions: configShowCookingInstructions, showSpecialInstructions: configShowSpecialInstructions, showPriceBreakdown: configShowPriceBreakdown, showTableInfo: configShowTableInfo, fetchConfig } = useRestaurantConfig();
  // console.log('restaurantId', restaurantId);

  // Inside ReviewOrder component, add:
  const location = useLocation();
  const params = useParams();
  const stationId = location.state?.stationId || params.stationId;

  const { cartItems, getTotalItems, getTotalPrice, clearCart } = useCart();

  // Fetch restaurant details
  const { restaurant } = useRestaurantDetails(restaurantId);

  // Fetch admin config
  useEffect(() => {
    if (restaurantId) {
      fetchConfig(restaurantId);
    }
  }, [restaurantId, fetchConfig]);

  // Fetch table/room configuration
  const { rooms, tables, loading: tablesLoading, error: tablesError, errorMessage: tablesErrorMessage } = useTableConfig(restaurantId);

  // Scanned table from QR code
  const {
    tableId: scannedTableId,
    tableNo: scannedTableNo,
    isScanned,
    roomOrTable: scannedRoomOrTable,
    orderType: scannedOrderType,
  } = useScannedTable();

  // console.log('🔍 Debug Scanned Table:', {
  //   restaurantId,
  //   scannedTableId,
  //   scannedTableNo,
  //   scannedRoomOrTable,
  //   scannedOrderType,
  //   isScanned
  // });


  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [roomOrTable, setRoomOrTable] = useState(null); // 'room' | 'table' | null
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [couponCode, setCouponCode] = useState('0');
  const [loyaltyPoints] = useState('1'); // Placeholder: "You have ₹1..."
  // const [loyaltyPoints, setLoyaltyPoints] = useState('1'); 

  const [showPhoneError, setShowPhoneError] = useState(false);

  // Token management state
  const [authToken, setAuthToken] = useState(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Validate phone number (10 digits for India)
  const isPhoneNumberValid = useMemo(() => {
    // if (!customerPhone) return false;
    if (!customerPhone || customerPhone.trim() === '') {
      return true;
    }

    // Check if it's a valid international phone number
    if (!isValidPhoneNumber(customerPhone)) {
      return false;
    }

    // For India (+91), check if it's exactly 10 digits
    if (customerPhone.startsWith('+91')) {
      const digits = customerPhone.replace(/\D/g, '');
      const phoneDigits = digits.slice(2); // Remove country code (91)
      return phoneDigits.length === 10;
    }

    // For other countries, just check if it's valid
    return true;
  }, [customerPhone]);

  // Check if customer details are filled
  const isCustomerDetailsFilled = useMemo(() => {
    return customerName.trim().length > 0 && isPhoneNumberValid;
  }, [customerName, isPhoneNumberValid]);

  // Clear phone error when phone becomes valid
  useEffect(() => {
    if (isPhoneNumberValid && showPhoneError) {
      setShowPhoneError(false);
    }
  }, [isPhoneNumberValid, showPhoneError]);

  // Control visibility of coupon and loyalty sections
  // Show only if: (1) API value is true AND (2) Customer details are filled
  const showCoupon = useMemo(() => {
    if (!restaurant) return false;

    // Check API value (support multiple possible field names)
    const couponEnabled =
      restaurant.is_coupon === 'Yes';


    // Both conditions must be true
    return couponEnabled && isCustomerDetailsFilled;
  }, [restaurant, isCustomerDetailsFilled]);

  const showLoyalty = useMemo(() => {
    if (!restaurant) return false;

    // Check API value (support multiple possible field names)
    const loyaltyEnabled =
      restaurant.is_loyalty === 'Yes';


    // Both conditions must be true
    return loyaltyEnabled && isCustomerDetailsFilled;
  }, [restaurant, isCustomerDetailsFilled]);

  // Check if restaurant is 716 (table number required)
  const isRestaurant716 = isMultipleMenu(restaurant, restaurantId);

  // Order page configurability flags - from admin config
  const showCustomerDetails = configShowCustomerDetails;
  const showCustomerName = configShowCustomerName;
  const showCustomerPhone = configShowCustomerPhone;
  const showCookingInstructions = configShowCookingInstructions;
  const showSpecialInstructions = configShowSpecialInstructions;
  const showPriceBreakdown = configShowPriceBreakdown;
  const showTableInfo = configShowTableInfo;

  // Validate room/table selection and number (required only for restaurant 716)
  const isTableNumberValid = () => {
    if (!isRestaurant716) return true; // Not required for other restaurants
    if (!roomOrTable) return false; // Must select Room or Table
    return tableNumber.trim().length > 0; // Must fill the input
  };

  // Get options based on roomOrTable selection (memoized for performance)
  const allOptions = useMemo(() => {
    const source = roomOrTable === 'room' ? rooms : tables;
    return [...source]
      .sort(sortTableNumbers)
      .map(item => ({ value: item.id.toString(), label: item.table_no }));
  }, [roomOrTable, rooms, tables]);


  // Handle select change
  const handleSelectChange = (selectedOption) => {
    setTableNumber(selectedOption ? selectedOption.value : '');
  };

  // Handle room/table selection change
  const handleRoomOrTableChange = (value) => {
    setRoomOrTable(value);
    setTableNumber('');
  };

  // Handle change table button click
  // const handleChangeTable = () => {
  //   clearScannedTable();
  //   setTableNumber('');
  //   setRoomOrTable(null);
  // };

  // Auto-fill table if scanned
  useEffect(() => {
    if (isScanned && scannedTableId && scannedOrderType === 'dinein') {
      setTableNumber(scannedTableId); // Set table_id for API payload
      setRoomOrTable(scannedRoomOrTable || 'table'); // Set type for display
    }
  }, [isScanned, scannedTableId, scannedRoomOrTable, scannedOrderType]);

  const totalItems = getTotalItems();
  const subtotal = getTotalPrice();

  // Calculate totals (GST, VAT will be added in future)
  // ─── Tax Calculation (from cart items) ────────────────────────
  const taxBreakdown = useMemo(() => {
    let totalGst = 0;
    let totalVat = 0;

    cartItems.forEach(cartItem => {
      const itemPrice = (() => {
        const base = parseFloat(cartItem.item.price) || 0;
        const varTotal = (cartItem.variations || []).reduce(
          (sum, v) => sum + (parseFloat(v.optionPrice) || 0), 0
        );
        const addonTotal = (cartItem.add_ons || []).reduce(
          (sum, a) => sum + ((parseFloat(a.price) || 0) * (a.quantity || 0)), 0
        );
        return base + varTotal + addonTotal;
      })();
      // console.log('tax', cartItem.item.tax);
      // console.log('tax_type', cartItem.item.tax_type);
      const taxPercent = parseFloat(cartItem.item.tax) || 0;
      const taxType = cartItem.item.tax_type || 'GST';
      const taxAmountPerUnit = parseFloat(((itemPrice * taxPercent) / 100).toFixed(2));

      //  Multiply by quantity to get total tax for this item
      const totalTaxForItem = taxAmountPerUnit * cartItem.quantity;

      if (taxType === 'GST') totalGst += totalTaxForItem;
      if (taxType === 'VAT') totalVat += totalTaxForItem;
    });

    totalGst = parseFloat(totalGst.toFixed(2));
    totalVat = parseFloat(totalVat.toFixed(2));

    // GST splits into CGST + SGST (50/50)
    const cgst = parseFloat((totalGst / 2).toFixed(2));
    const sgst = parseFloat((totalGst / 2).toFixed(2));
    const totalTax = parseFloat((totalGst + totalVat).toFixed(2));

    return { cgst, sgst, totalGst, vat: totalVat, totalTax };
  }, [cartItems]);

  const { cgst, sgst, totalGst, vat, totalTax } = taxBreakdown;

  // ─── Final totals ──────────────────────────────────────────────
  // const subtotal   = getTotalPrice();
  const totalToPay = parseFloat((subtotal + totalTax).toFixed(2));

  // console.log('totalTax', totalTax);
  // console.log('totalGst', totalGst);
  // console.log('totalVat', vat);
  // console.log('cgst', cgst);
  // console.log('sgst', sgst);
  // console.log('vat', vat);
  // console.log('subtotal', subtotal);
  // console.log('totalToPay', totalToPay);


  // Get token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      setIsLoadingToken(true);
      try {
        // console.log('[ReviewOrder] Fetching auth token...');
        const token = await getAuthToken(); // Will get new token or use existing if valid
        setAuthToken(token);
        // console.log('[ReviewOrder] Token ready');
      } catch (error) {
        // console.error('[ReviewOrder] Failed to get auth token:', error);
        toast.error('Unable to initialize. Please refresh the page.');
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchToken();
  }, []); // Only run once on mount

  // Auto-redirect if cart is empty (after 30 sec)
  useEffect(() => {
    if (totalItems === 0) {
      const redirectTimer = setTimeout(() => {
        if (restaurantId) {
          if (isRestaurant716) {
            navigate(`/${restaurantId}/stations`, { replace: true });
          } else {
            navigate(`/${restaurantId}/menu`, { replace: true });
          }
        }
      }, 30000); // 30 seconds = 30000ms

      return () => clearTimeout(redirectTimer);
    }
  }, [totalItems, navigate, restaurantId ,isRestaurant716]);

  // Handle back button click
  const handleBackClick = () => {
    if (restaurantId) {
      if (isRestaurant716) {
        navigate(`/${restaurantId}/menu/${stationId}`);
      } else {
        navigate(`/${restaurantId}/menu`);
      }
    }
  };

  // Handle navigate to menu
  const handleNavigateToMenu = () => {
    if (restaurantId) {
      if (isRestaurant716) {
        navigate(`/${restaurantId}/stations`, { replace: true });
      } else {
        navigate(`/${restaurantId}/menu`, { replace: true });
      }
    }
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    // Validate room/table selection and number for restaurant 716
    if (isRestaurant716) {
      // Check if scanned table is available
      const hasScannedTable = isScanned && scannedOrderType === 'dinein' && scannedTableId;

      // If not scanned, validate manual selection
      if (!hasScannedTable) {
        if (!roomOrTable) {
          toast('Please Select Your Room or Table');
          return;
        }
        if (!tableNumber.trim()) {
          const message = roomOrTable === 'room'
            ? 'Please Enter Your Room Number'
            : 'Please Enter Your Table Number';
          toast(message);
          return;
        }
      }
    }

    // Validate phone number only if provided (optional field)
    if (customerPhone && customerPhone.trim() !== '' && !isPhoneNumberValid) {
      setShowPhoneError(true);
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    // Clear phone error if phone is empty (optional)
    if (!customerPhone || customerPhone.trim() === '') {
      setShowPhoneError(false);
    }

    // Check if token is expired and get new one if needed
    let token = authToken;

    if (!token || isTokenExpired()) {
      setIsLoadingToken(true);
      try {
        // console.log('[ReviewOrder] Token expired or missing, fetching new token...');
        token = await getAuthToken();
        setAuthToken(token);
        // console.log('[ReviewOrder] New token obtained');
      } catch (error) {
        // console.error('[ReviewOrder] Failed to get token:', error);
        toast.error('Session expired. Please refresh the page and try again.');
        setIsLoadingToken(false);
        return;
      } finally {
        setIsLoadingToken(false);
      }
    }

    // Place order
    setIsPlacingOrder(true);
    try {
      // Format table number for API: R#table_no or T#table_no
      // let formattedTableNumber = tableNumber;
      // if (isRestaurant716 && roomOrTable && tableNumber) {
      //   const source = roomOrTable === 'room' ? rooms : tables;
      //   const selectedItem = source.find(item => item.id.toString() === tableNumber);
      //   if (selectedItem) {
      //     formattedTableNumber = `${roomOrTable === 'table' ? 'T' : 'R'}#${selectedItem.table_no}`;
      //   }
      // }
      // Use scanned table if available, otherwise use manual selection
      const finalTableId = (isScanned && scannedOrderType === 'dinein' && scannedTableId)
        ? scannedTableId
        : (isRestaurant716 && tableNumber ? tableNumber : '');

      // console.log('tableId (for table_id field):', finalTableId);

      // console.log('formattedTableNumber', tableNumber);

      const response = await placeOrder({
        cartItems,
        customerName,
        customerPhone: customerPhone || '',
        tableNumber: finalTableId,
        specialInstructions,
        couponCode,
        restaurantId,
        subtotal,
        totalToPay,
        totalTax,
        orderType: scannedOrderType,
        isMultipleMenuType: isRestaurant716,
        token
      });

      // Clear cart after successful order
      clearCart();

      // Navigate to success page with order data
      navigate(`/${restaurantId}/order-success`, {
        state: {
          orderData: {
            orderId: response?.order_id || null,
            totalToPay: response?.total_amount || totalToPay.toFixed(2)
          }
        }
      });

    } catch (error) {
      // console.error('[ReviewOrder] Failed to place order:', error);

      // Handle 401 - token expired during request
      if (error.response?.status === 401) {
        try {
          // console.log('[ReviewOrder] Token expired during request, refreshing...');
          const newToken = await getAuthToken(true);
          setAuthToken(newToken);

          // Use scanned table if available, otherwise use manual selection
          const retryTableId = (isScanned && scannedOrderType === 'dinein' && scannedTableId)
            ? scannedTableId
            : (isRestaurant716 && tableNumber ? tableNumber : '');

          // Retry order placement
          const retryResponse = await placeOrder({
            cartItems,
            customerName,
            customerPhone: customerPhone || '',
            tableNumber: retryTableId,
            specialInstructions,
            couponCode,
            restaurantId,
            orderType: scannedOrderType,
            subtotal,
            totalToPay,
            totalTax,
            isMultipleMenuType: isRestaurant716,
            token: newToken
          });

          // Clear cart after successful order
          clearCart();

          // Navigate to success page
          navigate(`/${restaurantId}/order-success`, {
            state: {
              orderData: {
                orderId: retryResponse?.order_id || null,
                totalToPay: retryResponse?.total_amount || totalToPay.toFixed(2)
              }
            }
          });

        } catch (retryError) {
          // console.error('[ReviewOrder] Failed to place order after retry:', retryError);
          toast.error('Session expired. Please refresh the page and try again.');
        }
      } else {
        // Other errors
        const errorMessage = error.response?.data?.message ||
          error.response?.data?.errors?.message ||
          'Failed to place order. Please try again.';
        toast.error(errorMessage);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Show loading state if token is being fetched
  // if (isLoadingToken) {
  //   return (
  //     <div className="review-order-page">
  //       <div className="review-order-header">
  //         <button className="review-order-back-btn" onClick={handleBackClick}>
  //           <IoArrowBackOutline />
  //         </button>
  //         <h1 className="review-order-title">Order Review</h1>
  //       </div>
  //       <div className="review-order-loading">
  //         <p>Initializing...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Empty cart state
  if (totalItems === 0) {
    return (
      <div className="review-order-page">
        {/* <div className="review-order-header">
          <button className="review-order-back-btn" onClick={handleBackClick}>
            <IoArrowBackOutline />
          </button>
          <h1 className="review-order-title">Order Review</h1>
        </div> */}

        <div className="review-order-empty">
          {/* <div className="review-order-empty-icon">🛒</div> */}
          <div className="review-order-empty-icon">
            {/* <GiShoppingCart /> */}
            <img src="/assets/images/empty.webp" alt="Empty Cart" />
          </div>
          <h2 className="review-order-empty-title">Ready to order?</h2>
          <p className="review-order-empty-message">
            Browse our menu to begin your dining experience.
          </p>
          <button
            className="review-order-empty-btn"
            onClick={handleNavigateToMenu}
          >
            Go to Menu
          </button>
          <p className="review-order-empty-redirect">
            Returning to menu in 30 seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-order-page">
      <div className="review-order-page page-transition">
        {/* Header */}
        <div className="review-order-header">
          <button className="review-order-back-btn" onClick={handleBackClick}>
            <IoArrowBackOutline />
          </button>
          <h1 className="review-order-title">Order Review</h1>
        </div>



        <div className="review-order-content">

          {/*Scanned Table Container */}
          {showTableInfo && !isRestaurant716 && isScanned && scannedOrderType === 'dinein' && (
            <>
              <div className="review-order-section">
                {/* <h2 className="review-order-section-title">
                  {scannedRoomOrTable === 'room' ? 'Room' : 'Table'}
                </h2> */}

                {/* Container with border for scanned table display */}
                <div className="review-order-room-table-container">
                  <p className="review-order-seated-text">We'll bring your order to</p>
                  <div className="review-order-seated-info">
                    {scannedRoomOrTable === 'room' ? (
                      <span className="review-order-room-icon"><FaDoorOpen  /></span>
                    ) : (
                      <span className="review-order-table-icon"><MdOutlineTableRestaurant   /></span>
                    )}
                    <span className="review-order-seated-name">{scannedTableNo}</span>
                  </div>
                </div>
              </div>
              <div className="review-order-divider"></div>
            </>

          )}


          {/* Room/Table Selection - Only for Restaurant hyatt */}
          {isRestaurant716 && (
            <>
              <div className="review-order-section">
                <h2 className="review-order-section-title">Room/Table</h2>

                {/* Container with border for radio buttons and input */}
                <div className="review-order-room-table-container">
                  {/* Radio Buttons for Room/Table Selection */}
                  <div className="review-order-room-table-radio-group">
                    <span className='review-order-radio-text'>Select : </span>
                    <label className="review-order-radio-label">
                      <input
                        type="radio"
                        name="roomOrTable"
                        value="room"
                        checked={roomOrTable === 'room'}
                        onChange={(e) => handleRoomOrTableChange(e.target.value)}
                        className="review-order-radio-input"
                      />
                      <span className="review-order-radio-text">Room</span>
                    </label>
                    <label className="review-order-radio-label">
                      <input
                        type="radio"
                        name="roomOrTable"
                        value="table"
                        checked={roomOrTable === 'table'}
                        onChange={(e) => handleRoomOrTableChange(e.target.value)}
                        className="review-order-radio-input"
                      />
                      <span className="review-order-radio-text">Table</span>
                    </label>
                  </div>

                  {/* Searchable Dropdown - Only show after selection */}
                  {roomOrTable && (
                    <div className="review-order-table-input-container">
                      {/* Loading State */}
                      {tablesLoading && (
                        <div className="review-order-select-loading">
                          <div className="review-order-select-skeleton"></div>
                        </div>
                      )}

                      {/* Error State */}
                      {tablesError && !tablesLoading && (
                        <div className="review-order-select-error">
                          <p className="review-order-error-message">
                            {tablesErrorMessage || 'Failed to load tables/rooms. Please try again.'}
                          </p>
                        </div>
                      )}

                      {/* Select Component */}
                      {!tablesLoading && (
                        <Select
                          options={allOptions}
                          value={allOptions.find(opt => opt.value === tableNumber) || null}
                          onChange={handleSelectChange}
                          filterOption={(option, inputValue) => {
                            if (!inputValue || !inputValue.trim()) return false;
                            return option.label.toLowerCase().includes(inputValue.trim().toLowerCase());
                          }}
                          noOptionsMessage={({ inputValue }) =>
                            inputValue?.trim() ? 'No options found' : 'Start typing to search...'
                          }
                          placeholder={roomOrTable === 'room'
                            ? 'Type your room number'
                            : 'Type your table number'}
                          isClearable
                          isSearchable
                          isDisabled={tablesError || tablesLoading}
                          className={`review-order-select ${!isTableNumberValid() && tableNumber.length > 0 ? 'error' : ''}`}
                          classNamePrefix="review-order-select"
                        />


                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="review-order-divider"></div>
            </>
          )}


          {/* Customer Details - configurable */}
          {!isRestaurant716 && showCustomerDetails && (<>  <div className="review-order-section">
            <div className="review-order-section-header">
              <div className="review-order-section-title-icon"><IoPersonOutline size={16} /></div>
              <h2 className="review-order-section-title">Customer Details</h2>
            </div>
            <CustomerDetails
              name={customerName}
              phone={customerPhone}
              onNameChange={setCustomerName}
              onPhoneChange={setCustomerPhone}
              showPhoneError={showPhoneError}
              showName={showCustomerName}
              showPhone={showCustomerPhone}
              showTitle={false}
            />
          </div>
            <div className="review-order-divider"></div>

          </>
          )}

          {/* Divider after Customer Details */}
          {/* <div className="review-order-divider"></div> */}


          {/* Order Items */}
          <div className="review-order-section">
            <div className="review-order-section-header">
              <div className="review-order-section-title-icon"><MdOutlineShoppingBag size={16} /></div>
              <h2 className="review-order-section-title">Order Items</h2>
              <div className="review-order-items-badge">
                <span className="review-order-items-count">{totalItems} items</span>
              </div>
            </div>
            <div className="review-order-items-list">
              {cartItems.map((cartItem) => (
                <OrderItemCard key={cartItem.cartId} cartItem={cartItem} showCookingInstructions={showCookingInstructions} />
              ))}
              {/* Special Instructions inside items card */}
              {showSpecialInstructions && (
                <div className="review-order-special-inline">
                  <textarea
                    className="review-order-textarea-inline"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Special Instructions..."
                    rows={1}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Divider after Order Items */}
          <div className="review-order-divider"></div>

          {/* Divider after Special Instructions - only if coupon or loyalty will be shown */}
          {/* {(showCoupon || showLoyalty) && (
          <div className="review-order-divider"></div>
        )} */}

          {/* Coupon Code - conditional */}
          {showCoupon && (
            <>
              <div className="review-order-section">
                <div className="review-order-coupon-loyalty">
                  <div className="review-order-coupon-loyalty-left">
                    <h3 className="review-order-coupon-loyalty-title">Coupon Code</h3>
                  </div>
                  <div className="review-order-coupon-loyalty-right">
                    <input
                      type="text"
                      className="review-order-coupon-input"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Ex.: ABC123"
                    />
                    <button className="review-order-apply-btn">Apply</button>
                  </div>
                </div>
              </div>
              {/* Divider after Coupon - only if Loyalty will be shown */}
              {/* {showLoyalty && ( */}
              <div className="review-order-divider"></div>
              {/* )} */}
            </>
          )}

          {/* Loyalty Points - conditional */}
          {showLoyalty && (
            <>
              <div className="review-order-section">
                <div className="review-order-coupon-loyalty review-order-loyalty-container">
                  <h3 className="review-order-coupon-loyalty-title">Loyalty Points</h3>
                  <div className="review-order-loyalty-row">
                    <p className="review-order-loyalty-text">You have ₹{loyaltyPoints}...</p>
                    <button className="review-order-redeem-btn">Redeem</button>
                  </div>
                </div>
              </div>
              {/* Divider after Loyalty - always show before Price Breakdown */}
              <div className="review-order-divider"></div>
            </>
          )}

          {/* Price Breakdown - configurable */}
          {showPriceBreakdown && (
          <div className="review-order-section">
            <div className="review-order-section-header">
              <div className="review-order-section-title-icon"><RiFileList3Line size={16} /></div>
              <h2 className="review-order-section-title">Price Breakdown</h2>
            </div>
            <ReviewOrderPriceBreakdown
              subtotal={subtotal}
              cgst={cgst}
              sgst={sgst}
              totalGst={totalGst}
              vat={vat}
              totalToPay={totalToPay}
              showHeader={false}
            />
          </div>
          )}

          {/* Login for Rewards Prompt - Show only if not logged in */}
          {!isAuthenticated && (
            <div className="review-order-login-prompt" data-testid="login-rewards-prompt">
              <div className="login-prompt-content">
                <IoGiftOutline className="login-prompt-icon" />
                <div className="login-prompt-text">
                  <span className="login-prompt-title">Earn rewards on this order!</span>
                  <span className="login-prompt-subtitle">Login to collect points & unlock offers</span>
                </div>
              </div>
              <button 
                className="login-prompt-btn"
                onClick={() => navigate('/login')}
                data-testid="login-rewards-btn"
              >
                Login
              </button>
            </div>
          )}

          {/* Logged In User Info */}
          {isAuthenticated && isCustomer && user && (
            <div className="review-order-user-info" data-testid="logged-in-user-info">
              <div className="user-info-content">
                <IoGiftOutline className="user-info-icon" />
                <div className="user-info-text">
                  <span className="user-info-name">Hi, {user.name?.split(' ')[0] || 'there'}!</span>
                  <span className="user-info-points">{user.total_points || 0} points available</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Place Order Button */}
        <div className="review-order-footer">
          <button
            className="review-order-place-btn"
            onClick={handlePlaceOrder}
            disabled={totalItems === 0 || isPlacingOrder || isLoadingToken}
          >
            {isPlacingOrder ? 'Placing Order...' : `Place Order ₹${totalToPay.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewOrder;
