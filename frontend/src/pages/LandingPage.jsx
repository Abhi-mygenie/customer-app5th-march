import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useRestaurantDetails, useStations } from '../hooks/useMenuData';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useScannedTable } from '../hooks/useScannedTable';
import { isMultipleMenu } from '../api/utils/restaurantIdConfig';
import { checkTableStatus, getOrderDetails } from '../api/services/orderService';
import { isDineInOrRoom, showsDineInActions, hasAssignedTable, isTakeawayOrDelivery } from '../utils/orderTypeHelpers';
import { getAuthToken } from '../utils/authToken';
import logger from '../utils/logger';
import { LandingPageSkeleton } from '../components/SkeletonLoaders';
import PromoBanner from '../components/PromoBanner/PromoBanner';
import HamburgerMenu from '../components/HamburgerMenu/HamburgerMenu';
import LandingCustomerCapture, { isPhoneValid } from '../components/LandingCustomerCapture/LandingCustomerCapture';
import OrderModeSelector from '../components/OrderModeSelector/OrderModeSelector';
import { DEFAULT_THEME } from '../constants/theme';
import { MdOutlineTableRestaurant, MdOutlineRestaurantMenu, MdOutlineEdit } from 'react-icons/md';
import { FaDoorOpen } from 'react-icons/fa';
import { IoCallOutline, IoPersonOutline } from 'react-icons/io5';
import { RiBillLine } from 'react-icons/ri';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { restaurantId } = useRestaurantId();
  const { isAuthenticated } = useAuth();
  const { startEditOrder, clearCart } = useCart();
  const { fetchConfig, showCallWaiter: configShowCallWaiter, showPayBill: configShowPayBill, showLandingCallWaiter: configShowLandingCallWaiter, showLandingPayBill: configShowLandingPayBill, showFooter: configShowFooter, showLogo: configShowLogo, showWelcomeText: configShowWelcomeText, showDescription: configShowDescription, showSocialIcons: configShowSocialIcons, showTableNumber: configShowTableNumber, showPoweredBy: configShowPoweredBy, showLandingCustomerCapture: configShowLandingCustomerCapture, showHamburgerMenu: configShowHamburgerMenu, showLoginButton: configShowLoginButton, logoUrl: configLogoUrl, backgroundImageUrl: configBackgroundImageUrl, mobileBackgroundImageUrl: configMobileBackgroundImageUrl, primaryColor: configPrimaryColor, buttonTextColor: configButtonTextColor, welcomeMessage: configWelcomeMessage, tagline: configTagline, banners: configBanners, instagramUrl: configInstagramUrl, facebookUrl: configFacebookUrl, twitterUrl: configTwitterUrl, youtubeUrl: configYoutubeUrl, whatsappNumber: configWhatsappNumber, phone: configPhone, browseMenuButtonText, mandatoryCustomerName, mandatoryCustomerPhone, poweredByText, poweredByLogoUrl } = useRestaurantConfig();

  const { tableNo: scannedTableNo, tableId: scannedTableId, roomOrTable: scannedRoomOrTable, isScanned, orderType: scannedOrderType, updateOrderType } = useScannedTable();

  const { restaurant, loading, error } = useRestaurantDetails(restaurantId);
  const actualRestaurantId = restaurant?.id?.toString() || restaurantId;
  const { stations } = useStations(actualRestaurantId);

  // State for customer capture flow
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [capturedPhone, setCapturedPhone] = useState('');
  const [capturedName, setCapturedName] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);

  // State for table status check (edit order detection)
  const [tableStatusCheck, setTableStatusCheck] = useState({
    isLoading: false,
    isOccupied: false,
    existingOrderId: null,
    isChecked: false,
    error: null,
  });

  // State for edit order loading
  const [isLoadingEditOrder, setIsLoadingEditOrder] = useState(false);

  // Phase 2: Takeaway/Delivery mode state
  const isTakeawayDeliveryMode = isTakeawayOrDelivery(scannedOrderType);
  const [selectedMode, setSelectedMode] = useState(scannedOrderType === 'delivery' ? 'delivery' : 'takeaway');

  // Handle mode switch (takeaway ↔ delivery)
  const handleModeChange = (newMode) => {
    setSelectedMode(newMode);
    if (updateOrderType) {
      updateOrderType(newMode);
    }
  };

  // Sync selectedMode when scannedOrderType changes (initial load)
  useEffect(() => {
    if (scannedOrderType === 'delivery' || scannedOrderType === 'takeaway') {
      setSelectedMode(scannedOrderType);
    }
  }, [scannedOrderType]);

  // Fetch admin config when restaurantId is available
  useEffect(() => {
    if (restaurantId) {
      fetchConfig(restaurantId);
    }
  }, [restaurantId, fetchConfig]);

  // Reset table status check on component mount to ensure fresh check every time
  // This fixes the stale cache bug where paid orders still appeared active
  useEffect(() => {
    setTableStatusCheck({
      isLoading: false,
      isOccupied: false,
      existingOrderId: null,
      isChecked: false,
      error: null,
    });
  }, []); // Empty deps = runs on mount only

  // Check table status on load (only for non-multi-menu restaurants with scanned table)
  // If table has an active order, auto-redirect to OrderSuccess
  useEffect(() => {
    const checkTable = async () => {
      // Skip if: no table scanned, or is multi-menu restaurant, or already checked this session
      if (!isScanned || !scannedTableId || !restaurantId) return;
      // Phase 1: Table status check only when a specific table/room was scanned (not walk-in)
      if (!hasAssignedTable(scannedTableId)) return;
      if (isMultipleMenu(restaurant)) return;
      if (tableStatusCheck.isChecked) return;

      setTableStatusCheck(prev => ({ ...prev, isLoading: true }));

      try {
        // Get auth token (will refresh if expired)
        let token;
        try {
          token = await getAuthToken();
        } catch (tokenErr) {
          logger.error('auth', 'Token fetch failed, retrying...', tokenErr);
          // Retry once with force refresh
          token = await getAuthToken(true);
        }

        const numericRestaurantId = restaurant?.id || restaurantId;
        const result = await checkTableStatus(scannedTableId, numericRestaurantId, token);

        // Handle invalid table ID
        if (result.isInvalid) {
          toast.error('Invalid table. Please scan a valid QR code.');
          setTableStatusCheck({
            isLoading: false,
            isOccupied: false,
            existingOrderId: null,
            isChecked: true,
            error: 'Invalid table',
          });
          return;
        }

        // If table has an active order, auto-redirect to OrderSuccess
        if (result.isOccupied && result.orderId) {
          try {
            // Fetch order details to check status
            const orderDetails = await getOrderDetails(result.orderId);
            
            // Only redirect if order is active (not cancelled=3, not paid=6)
            if (orderDetails.fOrderStatus !== 3 && orderDetails.fOrderStatus !== 6) {
              // Auto-redirect to OrderSuccess page
              navigate(`/${numericRestaurantId}/order-success`, {
                state: {
                  orderData: {
                    orderId: result.orderId,
                    totalToPay: orderDetails.billSummary?.grandTotal || 0,
                    billSummary: orderDetails.billSummary,
                  }
                }
              });
              return; // Don't update state, we're navigating away
            }
            
            // Order is cancelled or paid - clear any stale cart data
            // This prevents users from accidentally adding items to a paid order
            clearCart();
            
          } catch (orderErr) {
            logger.error('order', 'Failed to fetch order details for auto-redirect:', orderErr);
            // On error, fall through to show Edit Order button (user can retry manually)
          }
        }

        setTableStatusCheck({
          isLoading: false,
          isOccupied: result.isOccupied,
          existingOrderId: result.orderId || null,
          isChecked: true,
          error: result.error || null,
        });
      } catch (err) {
        logger.error('table', 'Table status check failed:', err);
        // Fallback to browse menu on error
        setTableStatusCheck({
          isLoading: false,
          isOccupied: false,
          existingOrderId: null,
          isChecked: true,
          error: err.message,
        });
      }
    };

    checkTable();
  }, [isScanned, scannedTableId, scannedOrderType, restaurantId, restaurant, tableStatusCheck.isChecked, navigate, clearCart]);

  // Theme colors now controlled by local admin config only (not POS)

  const handleDiningMenuClick = async () => {
    const actualRestaurantId = restaurant?.id || restaurantId;
    
    // Phase 2: Validate mandatory fields for takeaway/delivery
    if (isTakeawayDeliveryMode && !isAuthenticated) {
      if (!capturedPhone || !isPhoneValid(capturedPhone)) {
        setPhoneError('Please enter a valid phone number');
        return;
      }
      if (!capturedName.trim()) {
        toast.error('Please enter your name');
        return;
      }
    }

    // If customer capture is enabled (config-based), validate + lookup
    if (configShowLandingCustomerCapture || isTakeawayDeliveryMode) {
      // Validate mandatory fields (config-driven for dine-in, always for takeaway/delivery)
      if (effectiveMandatoryPhone && (!capturedPhone || !isPhoneValid(capturedPhone))) {
        setPhoneError('Please enter a valid phone number');
        return;
      }
      if (effectiveMandatoryName && !capturedName.trim()) {
        toast.error('Please enter your name');
        return;
      }
      
      // If phone is provided, do customer lookup
      if (capturedPhone && isPhoneValid(capturedPhone)) {
        setIsCheckingCustomer(true);
        try {
          const API_URL = process.env.REACT_APP_BACKEND_URL || '';
          const res = await fetch(`${API_URL}/api/auth/check-customer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: capturedPhone,
              restaurant_id: String(restaurantId),
              pos_id: '0001',
            }),
          });
          const data = await res.json();
          
          if (data.exists) {
            // Auto-populate name from lookup
            const customerName = data.customer?.name || '';
            if (customerName && !capturedName.trim()) {
              setCapturedName(customerName);
            }
            // Navigate to password setup
            navigate(`/${actualRestaurantId}/password-setup`, {
              state: {
                phone: capturedPhone,
                name: capturedName || customerName,
                restaurantId: actualRestaurantId,
                customerExists: true,
                hasPassword: data.customer?.has_password || false,
                customerName: customerName,
              },
            });
          } else {
            // New customer → password setup
            navigate(`/${actualRestaurantId}/password-setup`, {
              state: {
                phone: capturedPhone,
                name: capturedName,
                restaurantId: actualRestaurantId,
                customerExists: false,
                hasPassword: false,
                customerName: '',
              },
            });
          }
        } catch (err) {
          logger.error('order', 'Customer lookup failed:', err);
          // On error, save as guest and go to menu
          const guestData = { name: capturedName, phone: capturedPhone, restaurantId };
          localStorage.setItem('guestCustomer', JSON.stringify(guestData));
          if (isMultipleMenu(restaurant)) {
            navigate(`/${actualRestaurantId}/stations`);
          } else {
            navigate(`/${actualRestaurantId}/menu`);
          }
        } finally {
          setIsCheckingCustomer(false);
        }
        return;
      }
    }
    
    // No phone or capture disabled → go directly to menu
    if (capturedName || capturedPhone) {
      const guestData = { name: capturedName, phone: capturedPhone, restaurantId };
      localStorage.setItem('guestCustomer', JSON.stringify(guestData));
    }
    if (isMultipleMenu(restaurant)) {
      navigate(`/${actualRestaurantId}/stations`);
    } else {
      navigate(`/${actualRestaurantId}/menu`);
    }
  };

  const handleCallWaiter = () => {
    // TODO: Integrate with call waiter API
    logger.order('Call waiter triggered');
  };

  const handlePayBill = () => {
    // TODO: Integrate with pay bill flow
    logger.order('Pay bill triggered');
  };

  // Handle Edit Order click - fetch order details and enter edit mode
  const handleEditOrderClick = async () => {
    if (!tableStatusCheck.existingOrderId) return;

    setIsLoadingEditOrder(true);
    try {
      // Fetch order details from API
      const orderDetails = await getOrderDetails(tableStatusCheck.existingOrderId);

      // CHECK: If order is "yet to be confirmed" (fOrderStatus === 7), redirect to OrderSuccess
      if (orderDetails.fOrderStatus === 7) {
        const actualRestaurantId = restaurant?.id || restaurantId;
        navigate(`/${actualRestaurantId}/order-success`, {
          state: {
            orderData: {
              orderId: tableStatusCheck.existingOrderId,
              totalToPay: orderDetails.billSummary?.grandTotal || 0,
              billSummary: orderDetails.billSummary,
            }
          }
        });
        return;  // Don't enter edit mode
      }

      // CHECK: If order is cancelled or paid, don't allow edit
      if (orderDetails.fOrderStatus === 3 || orderDetails.fOrderStatus === 6) {
        toast(orderDetails.fOrderStatus === 3 ? 'This order was cancelled.' : 'This order has been paid.', { icon: 'ℹ️' });
        // Table should be available now - just go to menu for new order
        const actualRestaurantId = restaurant?.id || restaurantId;
        if (isMultipleMenu(restaurant)) {
          navigate(`/${actualRestaurantId}/stations`);
        } else {
          navigate(`/${actualRestaurantId}/menu`);
        }
        return;
      }

      // Start edit mode with previous items (only for confirmed orders: fOrderStatus 1, 2, 5)
      startEditOrder(
        tableStatusCheck.existingOrderId,
        orderDetails.previousItems,
        {
          tableId: orderDetails.tableId || scannedTableId,
          tableNo: orderDetails.tableNo || scannedTableNo,
          restaurant: orderDetails.restaurant,
        }
      );

      // Navigate to menu to add more items
      const actualRestaurantId = restaurant?.id || restaurantId;
      if (isMultipleMenu(restaurant)) {
        navigate(`/${actualRestaurantId}/stations`);
      } else {
        navigate(`/${actualRestaurantId}/menu`);
      }
    } catch (err) {
      logger.error('order', 'Failed to fetch order details for editing:', err);
      toast.error('Failed to load order. Starting fresh.');
      // On error, fallback to normal menu navigation
      const actualRestaurantId = restaurant?.id || restaurantId;
      navigate(`/${actualRestaurantId}/menu`);
    } finally {
      setIsLoadingEditOrder(false);
    }
  };

  if (loading || !restaurantId) {
    return <LandingPageSkeleton />;
  }

  if (error) {
    return (
      <div className="landing-page">
        <div className="landing-container">
          <div className="error-message">
            <p>Failed to load restaurant information. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  const restaurantName = restaurant?.name || 'MyGenie';
  // Tagline from local config only (not from MyGenie API)
  const tagline = configTagline || '';
  // Logo from local config only (DFA-003: no fallback — no logo if not configured)
  const logoUrl = configLogoUrl || null;
  const phone = configPhone || restaurant?.phone || '';
  // Instagram from local config only
  const instagramUrl = configInstagramUrl || '';
  const facebookUrl = configFacebookUrl || '';
  const twitterUrl = configTwitterUrl || '';
  const youtubeUrl = configYoutubeUrl || '';
  const whatsappNumber = configWhatsappNumber || '';

  // All visibility controlled by admin config (defaults to true)
  // FEAT-002-PREP: Call Waiter / Pay Bill only relevant for dine-in/room
  const isDineInContext = showsDineInActions(scannedOrderType);
  const showLogo = configShowLogo;
  const showWelcome = configShowWelcomeText;
  const showDescription = configShowDescription && tagline;
  const showSocial = configShowSocialIcons && (phone || instagramUrl || facebookUrl || twitterUrl || youtubeUrl || whatsappNumber);
  const showTable = configShowTableNumber && isScanned && scannedTableNo && hasAssignedTable(scannedTableId);
  const showBrowseMenu = true; // Always show Browse Menu / Edit Order button
  const showCallWaiter = configShowLandingCallWaiter && isDineInContext;
  const showPayBill = configShowLandingPayBill && isDineInContext;
  const showPoweredBy = configShowPoweredBy;

  // Admin config overrides for welcome message
  const displayWelcomeMessage = configWelcomeMessage || `Welcome to ${restaurantName}!`;
  const displayTagline = configTagline;

  // Button colors from local config only (no POS fallback)
  const btnColor = configPrimaryColor || DEFAULT_THEME.primaryColor;
  const btnTextColor = configButtonTextColor || DEFAULT_THEME.buttonTextColor;

  // Phase 2: Customer capture logic
  // For takeaway/delivery: ALWAYS show and ALWAYS mandatory (unless logged in)
  // For dine-in/walk-in: show from config
  const showCustomerCapture = isTakeawayDeliveryMode
    ? !isAuthenticated  // Always show for takeaway/delivery (mandatory)
    : (configShowLandingCustomerCapture && !isAuthenticated);

  // Phase 2: For takeaway/delivery, name+phone are always mandatory
  const effectiveMandatoryName = isTakeawayDeliveryMode ? true : mandatoryCustomerName;
  const effectiveMandatoryPhone = isTakeawayDeliveryMode ? true : mandatoryCustomerPhone;

  // Phase 2: Validate if takeaway/delivery requirements are met
  const isTakeawayDeliveryReady = !isTakeawayDeliveryMode || isAuthenticated || 
    (capturedName.trim().length > 0 && capturedPhone && isPhoneValid(capturedPhone));

  // Check if we have a background image
  const hasBackgroundImage = !!configBackgroundImageUrl;
  // Mobile image falls back to desktop if not set
  const mobileImg = configMobileBackgroundImageUrl || configBackgroundImageUrl;

  return (
    <div 
      className={`landing-page ${hasBackgroundImage ? 'has-background-image' : ''}`} 
      data-testid="landing-page"
      style={hasBackgroundImage ? {
        '--landing-bg-desktop': `url(${configBackgroundImageUrl})`,
        '--landing-bg-mobile': `url(${mobileImg})`,
      } : {}}
    >
      {/* Hamburger Menu - Controlled by config */}
      {configShowHamburgerMenu !== false && (
        <div className="landing-hamburger-wrapper">
          <HamburgerMenu restaurantName={restaurant?.name} phone={phone} />
        </div>
      )}

      {/* Login Button - Top right only if not logged in and config allows */}
      {!isAuthenticated && configShowLoginButton !== false && (
        <div className="landing-login-wrapper">
          <button 
            className={`landing-login-btn ${hasBackgroundImage ? 'on-image' : ''}`}
            onClick={() => navigate('/login')}
            style={{ backgroundColor: btnColor, color: btnTextColor }}
            data-testid="landing-login-btn"
          >
            <IoPersonOutline />
            <span>Login</span>
          </button>
        </div>
      )}

      <div className="landing-container">

        {/* 1. Logo */}
        {showLogo && (
          <div className="logo-section" data-testid="landing-logo">
            {logoUrl ? (
            <img
              src={logoUrl}
              alt={restaurantName}
              className="brand-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            ) : (
              <h2 className="brand-name-fallback">{restaurantName}</h2>
            )}
          </div>
        )}

        {/* 2. Welcome Text */}
        {showWelcome && (
          <h1 className="welcome-text" data-testid="landing-welcome">
            {displayWelcomeMessage}
          </h1>
        )}

        {/* 2.5 Tagline */}
        {displayTagline && (
          <p className="tagline-text" data-testid="landing-tagline">
            {displayTagline}
          </p>
        )}

        {/* 3. Description - uses tagline from local config (skip if tagline section already shows it) */}
        {showDescription && tagline && !displayTagline && (
          <p className={`description-text ${hasBackgroundImage ? 'on-image' : ''}`} data-testid="landing-description">
            {tagline}
          </p>
        )}

        {/* 3.2 Admin Config Banners - Show only when NO background image */}
        {!hasBackgroundImage && configBanners.filter(b => b.displayOn === 'landing' || b.displayOn === 'both' || !b.displayOn).length > 0 && (
          <div className="config-banner-carousel" data-testid="config-banner-carousel">
            <PromoBanner
              promotions={configBanners
                .filter(b => b.displayOn === 'landing' || b.displayOn === 'both' || !b.displayOn)
                .map((b, i) => ({
                  id: b.id || i,
                  image_url: b.bannerImage,
                  title: b.bannerTitle,
                  link: b.bannerLink,
                }))}
              autoPlayInterval={4000}
            />
          </div>
        )}

        {/* 4. Table Number Display */}
        {showTable && (
          <div className="table-badge" data-testid="landing-table-badge">
            <span className="table-badge-icon">
              {scannedRoomOrTable === 'room' ? <FaDoorOpen /> : <MdOutlineTableRestaurant />}
            </span>
            <span className="table-badge-label">
              {scannedRoomOrTable === 'room' ? 'Room' : 'Table'}
            </span>
            <span className="table-badge-number">{scannedTableNo}</span>
          </div>
        )}

        {/* Phase 2: Takeaway/Delivery Mode Selector */}
        {isTakeawayDeliveryMode && (
          <OrderModeSelector
            mode={selectedMode}
            onModeChange={handleModeChange}
            primaryColor={btnColor}
            textColor={btnTextColor}
          />
        )}

        {/* 4.5 Customer Capture Form — always shown for takeaway/delivery, config-driven for dine-in */}
        {showCustomerCapture && (
          <LandingCustomerCapture
            phone={capturedPhone}
            setPhone={setCapturedPhone}
            name={capturedName}
            setName={setCapturedName}
            phoneError={phoneError}
            setPhoneError={setPhoneError}
            mandatoryName={effectiveMandatoryName}
            mandatoryPhone={effectiveMandatoryPhone}
          />
        )}

        {/* 5. Action Buttons */}
        <div className="landing-actions" data-testid="landing-actions">
          {/* Dynamic Button: Edit Order OR Browse Menu */}
          {showBrowseMenu && (
            <>
              {/* Loading state while checking table status */}
              {tableStatusCheck.isLoading && (
                <button
                  className="landing-btn landing-btn-primary"
                  disabled
                  style={{ backgroundColor: btnColor, color: btnTextColor, opacity: 0.7 }}
                  data-testid="landing-btn-loading"
                >
                  <span className="landing-btn-spinner"></span>
                  Checking...
                </button>
              )}

              {/* Edit Order button - when table is occupied */}
              {!tableStatusCheck.isLoading && tableStatusCheck.isOccupied && tableStatusCheck.existingOrderId && (
                <button
                  className="landing-btn landing-btn-primary"
                  onClick={handleEditOrderClick}
                  disabled={isLoadingEditOrder}
                  style={{ backgroundColor: btnColor, color: btnTextColor, opacity: isLoadingEditOrder ? 0.7 : 1 }}
                  data-testid="landing-edit-order-btn"
                >
                  {isLoadingEditOrder ? (
                    <>
                      <span className="landing-btn-spinner"></span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <MdOutlineEdit className="landing-btn-icon" />
                      EDIT ORDER
                    </>
                  )}
                </button>
              )}

              {/* Browse Menu button - when table is available or no table scanned */}
              {!tableStatusCheck.isLoading && (!tableStatusCheck.isOccupied || !tableStatusCheck.existingOrderId) && (
                <button
                  className={`landing-btn landing-btn-primary ${isTakeawayDeliveryMode && !isTakeawayDeliveryReady ? 'landing-btn-disabled' : ''}`}
                  onClick={handleDiningMenuClick}
                  disabled={isCheckingCustomer || (isTakeawayDeliveryMode && !isTakeawayDeliveryReady)}
                  style={{ backgroundColor: btnColor, color: btnTextColor, opacity: (isCheckingCustomer || (isTakeawayDeliveryMode && !isTakeawayDeliveryReady)) ? 0.5 : 1 }}
                  data-testid="landing-browse-menu-btn"
                >
                  {isCheckingCustomer ? (
                    <>
                      <span className="landing-btn-spinner"></span>
                      Checking...
                    </>
                  ) : (
                    <>
                      <MdOutlineRestaurantMenu className="landing-btn-icon" />
                      {browseMenuButtonText}
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {/* Call Waiter & Pay Bill - Secondary Row */}
          {(showCallWaiter || showPayBill) && (
            <div className="landing-secondary-actions">
              {showCallWaiter && (
                <button
                  className="landing-btn landing-btn-secondary"
                  onClick={handleCallWaiter}
                  data-testid="landing-call-waiter-btn"
                >
                  <IoCallOutline className="landing-btn-icon" />
                  Call Waiter
                </button>
              )}
              {showPayBill && (
                <button
                  className="landing-btn landing-btn-secondary"
                  onClick={handlePayBill}
                  data-testid="landing-pay-bill-btn"
                >
                  <RiBillLine className="landing-btn-icon" />
                  Pay Bill
                </button>
              )}
            </div>
          )}
        </div>

        {/* 6. Social Icons */}
        {showSocial && (
          <div className="social-icons" data-testid="landing-social-icons">
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="icon-link" aria-label="Instagram">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            )}
            {facebookUrl && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="icon-link" aria-label="Facebook">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
            )}
            {twitterUrl && (
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="icon-link" aria-label="Twitter / X">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l11.733 16h4.267l-11.733 -16z"></path>
                  <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path>
                </svg>
              </a>
            )}
            {youtubeUrl && (
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="icon-link" aria-label="YouTube">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                </svg>
              </a>
            )}
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="icon-link" aria-label="WhatsApp">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="icon-link" aria-label="Phone">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </a>
            )}
          </div>
        )}

      </div>

      {/* 9. Powered by - Configurable (DFA-004) */}
      {showPoweredBy && (
        <footer className="landing-footer" data-testid="landing-footer">
          <p>
            {poweredByText}{' '}
            {poweredByLogoUrl && (
              <img src={poweredByLogoUrl} alt={poweredByText} className="footer-logo" onError={(e) => { e.target.style.display = 'none'; }} />
            )}
          </p>
        </footer>
      )}
    </div>
  );
};

export default LandingPage;
