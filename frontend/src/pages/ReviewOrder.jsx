import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { isValidPhoneNumber } from 'react-phone-number-input';
import Select from 'react-select';
import { useCart } from '../context/CartContext';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantDetails, useTableConfig, useStations } from '../hooks/useMenuData';
import { useScannedTable } from '../hooks/useScannedTable';
import { useAuth } from '../context/AuthContext';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import { getAuthToken, isTokenExpired } from '../utils/authToken';
import { placeOrder, updateCustomerOrder } from '../api/services/orderService';
import { isCheckinItem } from '../utils/roomOrderUtils';
import OrderItemCard from '../components/OrderItemCard/OrderItemCard';
import PreviousOrderItems from '../components/PreviousOrderItems/PreviousOrderItems';
import { IoArrowBackOutline, IoGiftOutline, IoPersonOutline } from "react-icons/io5";
import { isMultipleMenu } from '../api/utils/restaurantIdConfig';
import { MdOutlineShoppingBag, MdOutlineTableRestaurant } from "react-icons/md";
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
  const { showCustomerDetails: configShowCustomerDetails, showCustomerName: configShowCustomerName, showCustomerPhone: configShowCustomerPhone, showCookingInstructions: configShowCookingInstructions, showSpecialInstructions: configShowSpecialInstructions, showPriceBreakdown: configShowPriceBreakdown, showTableInfo: configShowTableInfo, showLoyaltyPoints: configShowLoyaltyPoints, showCouponCode: configShowCouponCode, fetchConfig } = useRestaurantConfig();
  // console.log('restaurantId', restaurantId);

  // Inside ReviewOrder component, add:
  const location = useLocation();
  const params = useParams();
  const stationId = location.state?.stationId || params.stationId;

  const {
    cartItems,
    getTotalItems,
    getTotalPrice,
    clearCart,
    // Edit order mode
    isEditMode,
    editingOrderId,
    previousOrderItems,
    clearEditMode,
    getPreviousOrderTotal,
  } = useCart();

  // Fetch restaurant details FIRST to get numeric ID
  const { restaurant } = useRestaurantDetails(restaurantId);

  // Use numeric ID from restaurant-info response, fallback to restaurantId
  const numericRestaurantId = restaurant?.id?.toString() || restaurantId;
  const { stations } = useStations(numericRestaurantId);

  // Fetch admin config
  useEffect(() => {
    if (numericRestaurantId) {
      fetchConfig(numericRestaurantId);
    }
  }, [numericRestaurantId, fetchConfig]);

  // Fetch loyalty settings for points calculation
  useEffect(() => {
    const fetchLoyaltySettings = async () => {
      if (!numericRestaurantId) return;
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/loyalty-settings/${numericRestaurantId}`);
        if (response.ok) {
          const data = await response.json();
          setLoyaltySettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch loyalty settings:', error);
      }
    };
    fetchLoyaltySettings();
  }, [numericRestaurantId]);

  // Fetch table/room configuration (uses numeric ID)
  const { rooms, tables, loading: tablesLoading, error: tablesError, errorMessage: tablesErrorMessage } = useTableConfig(numericRestaurantId);

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
  const [couponCode, setCouponCode] = useState('');

  // Session storage key for customer info persistence during edit order
  const SESSION_CUSTOMER_KEY = 'sessionCustomerInfo';

  // Save customer info to sessionStorage whenever it changes
  useEffect(() => {
    if ((customerName || customerPhone) && numericRestaurantId) {
      sessionStorage.setItem(SESSION_CUSTOMER_KEY, JSON.stringify({
        name: customerName,
        phone: customerPhone,
        restaurantId: numericRestaurantId
      }));
    }
  }, [customerName, customerPhone, numericRestaurantId]);

  // Loyalty settings for points calculation
  const [loyaltySettings, setLoyaltySettings] = useState(null);

  // Points redemption state
  const [isUsingPoints, setIsUsingPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);

  // Customer lookup state (phone-based identification)
  const [lookedUpCustomer, setLookedUpCustomer] = useState(null); // { found, name, total_points, tier }
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [showPhoneError, setShowPhoneError] = useState(false);

  // Token management state
  const [authToken, setAuthToken] = useState(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // SECURITY: Synchronous guard to prevent double-fire before React re-render disables the button.
  // useRef is used (not useState) because ref updates are synchronous and don't cause re-renders.
  const isPlacingOrderRef = useRef(false);
  // SECURITY: Tracks whether placeOrder API was dispatched in the current attempt.
  // Used to detect network-loss scenarios where order may have reached server but no response came back.
  const orderDispatchedRef = useRef(false);

  // Countdown state for empty-cart redirect
  const [countdown, setCountdown] = useState(10);

  // Strip country code prefix from phone for PhoneInput (it handles country code via flag dropdown)
  const stripCountryCode = (phone) => {
    if (!phone) return '';
    if (phone.startsWith('+91')) return phone.slice(3);
    if (phone.startsWith('91') && phone.length > 10) return phone.slice(2);
    return phone;
  };

  // Pre-fill from sessionStorage first (for edit order scenarios)
  // Only pre-fill if stored restaurantId matches current restaurant
  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem(SESSION_CUSTOMER_KEY);
      if (savedSession) {
        const { name, phone, restaurantId: savedRestaurantId } = JSON.parse(savedSession);

        // Only pre-fill if restaurant matches (or no restaurantId stored - legacy data)
        if (savedRestaurantId && savedRestaurantId !== numericRestaurantId) {
          // Different restaurant - clear the stale data
          sessionStorage.removeItem(SESSION_CUSTOMER_KEY);
          return;
        }

        if (name && !customerName) setCustomerName(name);
        if (phone && !customerPhone) {
          // Store E.164 format (+91...) so PhoneInput shows India flag correctly
          const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^\+?91/, '')}`;
          setCustomerPhone(formattedPhone);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [numericRestaurantId]);

  // Pre-fill from guest capture (localStorage) - only if sessionStorage didn't have data
  // Only pre-fill if stored restaurantId matches current restaurant
  useEffect(() => {
    if (!isAuthenticated && !customerName && !customerPhone) {
      try {
        const savedGuest = localStorage.getItem('guestCustomer');
        if (savedGuest) {
          const { name, phone, restaurantId: savedRestaurantId } = JSON.parse(savedGuest);

          // Only pre-fill if restaurant matches (or no restaurantId stored - legacy data)
          if (savedRestaurantId && savedRestaurantId !== numericRestaurantId) {
            // Different restaurant - clear the stale data
            localStorage.removeItem('guestCustomer');
            return;
          }

          if (name && !customerName) setCustomerName(name);
          if (phone && !customerPhone) {
            // Store E.164 format (+91...) so PhoneInput shows India flag correctly
            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^\+?91/, '')}`;
            setCustomerPhone(formattedPhone);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [isAuthenticated, customerName, customerPhone, numericRestaurantId]);

  // Pre-fill from logged in user
  useEffect(() => {
    if (isAuthenticated && isCustomer && user) {
      if (user.name && !customerName) setCustomerName(user.name);
      if (user.phone && !customerPhone) {
        // Store E.164 format (+91...) so PhoneInput shows India flag correctly
        const phone = user.phone;
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^\+?91/, '')}`;
        setCustomerPhone(formattedPhone);
      }
      // Set looked up customer from auth user data
      setLookedUpCustomer({
        found: true,
        name: user.name || '',
        total_points: user.total_points || 0,
        tier: user.tier || 'Bronze',
      });
    }
  }, [isAuthenticated, isCustomer, user]);

  // Reset ALL form states when restaurant changes (scan & order app - user is at one restaurant at a time)
  // Uses localStorage to track previous restaurant ID (survives component re-mounts)
  const PREV_RESTAURANT_KEY = 'prevRestaurantId';

  useEffect(() => {
    const prevRestaurantId = localStorage.getItem(PREV_RESTAURANT_KEY);

    // Only reset if restaurant actually changed (not on initial mount)
    if (prevRestaurantId && prevRestaurantId !== numericRestaurantId && numericRestaurantId) {
      // Clear customer details
      setCustomerName('');
      setCustomerPhone('');
      setLookedUpCustomer(null);

      // Clear table/room selection
      setTableNumber('');
      setRoomOrTable(null);

      // Clear order details
      setSpecialInstructions('');
      setCouponCode('');

      // Clear loyalty/points state
      setLoyaltySettings(null);
      setIsUsingPoints(false);
      setPointsToRedeem(0);
      setPointsDiscount(0);

      // Clear session/local storage for customer details
      sessionStorage.removeItem('sessionCustomerInfo');
      localStorage.removeItem('guestCustomer');

      // Clear auth token on restaurant change
      localStorage.removeItem('auth_token');

      console.log(`Restaurant changed from ${prevRestaurantId} to ${numericRestaurantId} - cleared all form states`);
    }

    // Store current restaurant ID for next comparison (CartContext also does this, but this ensures it's set)
    if (numericRestaurantId) {
      localStorage.setItem(PREV_RESTAURANT_KEY, numericRestaurantId);
    }
  }, [numericRestaurantId]);

  // Phone-based customer lookup (debounced)
  useEffect(() => {
    if (isAuthenticated && isCustomer) return; // Skip if already logged in
    if (!customerPhone || !numericRestaurantId) return;

    // Extract bare digits from phone value
    const digits = customerPhone.replace(/\D/g, '');
    // Check for 10 digits (or 12 with country code)
    const bareDigits = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
    if (bareDigits.length !== 10) {
      setLookedUpCustomer(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/customer-lookup/${numericRestaurantId}?phone=${bareDigits}`
        );
        if (response.ok) {
          const data = await response.json();
          setLookedUpCustomer(data);
          if (data.found && data.name) {
            setCustomerName(data.name);
          } else {
            // Clear name when customer not found in this restaurant
            setCustomerName('');
          }
        }
      } catch (error) {
        console.error('Customer lookup failed:', error);
      } finally {
        setIsLookingUp(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [customerPhone, numericRestaurantId, isAuthenticated, isCustomer]);

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


    // Both conditions must be true + admin config toggle
    return couponEnabled && isCustomerDetailsFilled && configShowCouponCode;
  }, [restaurant, isCustomerDetailsFilled, configShowCouponCode]);

  const showLoyalty = useMemo(() => {
    if (!restaurant) return false;

    // Check API value (support multiple possible field names)
    const loyaltyEnabled =
      restaurant.is_loyalty === 'Yes';


    // Both conditions must be true + admin config toggle
    return loyaltyEnabled && isCustomerDetailsFilled && configShowLoyaltyPoints;
  }, [restaurant, isCustomerDetailsFilled, configShowLoyaltyPoints]);

  // Check if restaurant has multiple menus (table number required)
  const isMultiMenu = isMultipleMenu(restaurant);

  // Order page configurability flags - from admin config
  const showCustomerDetails = configShowCustomerDetails;
  const showCustomerName = configShowCustomerName;
  const showCustomerPhone = configShowCustomerPhone;
  const showCookingInstructions = configShowCookingInstructions;
  const showSpecialInstructions = configShowSpecialInstructions;
  const showPriceBreakdown = configShowPriceBreakdown;
  const showTableInfo = configShowTableInfo;

  // Validate room/table selection and number (required for multi-menu restaurants)
  const isTableNumberValid = () => {
    if (!isMultiMenu) return true; // Not required for other restaurants
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

  // Previous order subtotal (for edit mode)
  const previousSubtotal = isEditMode ? getPreviousOrderTotal() : 0;

  // Calculate totals (GST, VAT will be added in future)
  // ─── Tax Calculation (from cart items) ────────────────────────
  const taxBreakdown = useMemo(() => {
    let totalGst = 0;
    let totalVat = 0;

    // Debug: Log cart items and their tax info
    console.log('=== TAX DEBUG START ===');
    console.log('Cart items (new):', cartItems.length);
    console.log('Previous order items:', previousOrderItems?.length || 0);

    // Calculate tax for NEW items (cartItems)
    cartItems.forEach((cartItem, index) => {
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

      const taxPercent = parseFloat(cartItem.item.tax) || 0;
      const taxType = cartItem.item.tax_type || 'GST';
      const taxAmountPerUnit = parseFloat(((itemPrice * taxPercent) / 100).toFixed(2));
      const totalTaxForItem = taxAmountPerUnit * cartItem.quantity;

      // Debug: Log each item's tax info
      console.log(`New Item ${index + 1}: ${cartItem.item.name?.substring(0, 20)}`);
      console.log(`  - Price: ₹${itemPrice}, Qty: ${cartItem.quantity}`);
      console.log(`  - Tax: ${taxPercent}% (${taxType})`);
      console.log(`  - Tax Amount: ₹${totalTaxForItem}`);

      if (taxType === 'GST') totalGst += totalTaxForItem;
      if (taxType === 'VAT') totalVat += totalTaxForItem;
    });

    // Calculate tax for PREVIOUS items (in edit mode)
    // Exclude cancelled items (foodStatus === 3) and "check in" items (for room orders)
    const isRoom = scannedRoomOrTable === 'room';
    if (previousOrderItems && previousOrderItems.length > 0) {
      previousOrderItems.forEach((prevItem, index) => {
        if (prevItem.foodStatus === 3) return; // Skip cancelled items
        if (isRoom && isCheckinItem(prevItem)) return; // Skip "check in" items for room orders

        const itemPrice = parseFloat(prevItem.unitPrice || prevItem.price) || 0;
        const quantity = prevItem.quantity || 1;
        const taxPercent = parseFloat(prevItem.item?.tax) || 0;
        const taxType = prevItem.item?.tax_type || 'GST';
        const totalTaxForItem = parseFloat(((itemPrice * quantity * taxPercent) / 100).toFixed(2));

        // Debug: Log each previous item's tax info
        console.log(`Previous Item ${index + 1}: ${prevItem.item?.name?.substring(0, 20)}`);
        console.log(`  - Price: ₹${itemPrice}, Qty: ${quantity}`);
        console.log(`  - Tax: ${taxPercent}% (${taxType})`);
        console.log(`  - Tax Amount: ₹${totalTaxForItem}`);

        if (taxType === 'GST') totalGst += totalTaxForItem;
        if (taxType === 'VAT') totalVat += totalTaxForItem;
      });
    }

    totalGst = parseFloat(totalGst.toFixed(2));
    totalVat = parseFloat(totalVat.toFixed(2));

    // GST splits into CGST + SGST (50/50)
    const cgst = parseFloat((totalGst / 2).toFixed(2));
    const sgst = parseFloat((totalGst / 2).toFixed(2));
    const totalTax = parseFloat((totalGst + totalVat).toFixed(2));

    console.log('=== TAX DEBUG SUMMARY ===');
    console.log(`Total GST: ₹${totalGst} (CGST: ₹${cgst}, SGST: ₹${sgst})`);
    console.log(`Total VAT: ₹${totalVat}`);
    console.log('=== TAX DEBUG END ===');

    return { cgst, sgst, totalGst, vat: totalVat, totalTax };
  }, [cartItems, previousOrderItems, scannedRoomOrTable]);

  const { cgst, sgst, totalGst, vat, totalTax } = taxBreakdown;

  // ─── Final totals ──────────────────────────────────────────────
  // Item Total = sum of all item prices (before tax, before discounts)
  const itemTotal = previousSubtotal + subtotal;

  // Subtotal after discounts (this is the base for tax calculation)
  const subtotalAfterDiscount = Math.max(0, itemTotal - pointsDiscount);

  // Recalculate tax on discounted amount (proportional reduction)
  const discountRatio = itemTotal > 0 ? subtotalAfterDiscount / itemTotal : 1;
  const adjustedCgst = parseFloat((cgst * discountRatio).toFixed(2));
  const adjustedSgst = parseFloat((sgst * discountRatio).toFixed(2));
  const adjustedVat = parseFloat((vat * discountRatio).toFixed(2));
  const adjustedTotalTax = parseFloat((adjustedCgst + adjustedSgst + adjustedVat).toFixed(2));

  // Grand Total = Subtotal after discounts + Adjusted Tax
  const totalToPay = parseFloat((subtotalAfterDiscount + adjustedTotalTax).toFixed(2));

  // Total Rounding - when enabled, round grand total UP to nearest whole number
  const isTotalRoundEnabled = restaurant?.total_round === 'Yes';
  const roundedTotal = isTotalRoundEnabled ? Math.ceil(totalToPay) : totalToPay;
  const roundingDifference = isTotalRoundEnabled ? parseFloat((roundedTotal - totalToPay).toFixed(2)) : 0;

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

  // Auto-redirect if cart is empty — counts down 10→0 then goes to LandingPage
  useEffect(() => {
    if (totalItems === 0) {
      setCountdown(10);

      const tickInterval = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      const redirectTimer = setTimeout(() => {
        if (restaurantId) {
          if (isMultiMenu) {
            navigate(`/${restaurantId}/stations`, { replace: true });
          } else {
            navigate(`/${restaurantId}/menu`, { replace: true });
          }
        }
      }, 10000); // 10 seconds = 10000ms

      return () => {
        clearInterval(tickInterval);
        clearTimeout(redirectTimer);
      };
    }
  }, [totalItems, navigate, restaurantId, isMultiMenu]);

  // Handle back button click
  const handleBackClick = () => {
    if (restaurantId) {
      if (isMultiMenu) {
        navigate(`/${restaurantId}/menu/${stationId}`);
      } else {
        navigate(`/${restaurantId}/menu`);
      }
    }
  };

  // Handle navigate to menu — routes through LandingPage so business logic
  // (check table status → Edit Order or Browse Menu) is always applied.
  const handleNavigateToMenu = () => {
    if (restaurantId) {
      if (isMultiMenu) {
        navigate(`/${restaurantId}/stations`, { replace: true });
      } else {
        navigate(`/${restaurantId}`, { replace: true });
      }
    }
  };

  // Handle loyalty points redemption
  const handleUsePoints = () => {
    const availablePoints = isAuthenticated ? (user?.total_points || 0) : (lookedUpCustomer?.total_points || 0);
    const redemptionValue = loyaltySettings?.redemption_value || 0;

    if (!availablePoints || !redemptionValue) return;

    // Calculate max points that can be used (can't exceed subtotal)
    const maxPointsValue = subtotal; // Max discount = subtotal (can't go negative)
    const maxPointsToUse = Math.floor(maxPointsValue / redemptionValue);
    const pointsToUse = Math.min(availablePoints, maxPointsToUse);
    const discount = pointsToUse * redemptionValue;

    setPointsToRedeem(pointsToUse);
    setPointsDiscount(discount);
    setIsUsingPoints(true);
  };

  // Handle remove points redemption
  const handleRemovePoints = () => {
    setPointsToRedeem(0);
    setPointsDiscount(0);
    setIsUsingPoints(false);
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    // SECURITY FIX 1: Synchronous double-click guard.
    // React's setState is async — setIsPlacingOrder(true) doesn't disable the button
    // until the next render cycle. A fast double-click can bypass the disabled check.
    // This ref check is synchronous and blocks any concurrent invocation immediately.
    if (isPlacingOrderRef.current) return;
    isPlacingOrderRef.current = true;
    orderDispatchedRef.current = false; // Reset dispatch tracker for this attempt
    // Validate room/table selection and number for multi-menu restaurants
    if (isMultiMenu) {
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

    // Place order or Update order (if in edit mode)
    setIsPlacingOrder(true);
    try {
      // Use scanned table if available, otherwise use manual selection
      const finalTableId = (isScanned && scannedOrderType === 'dinein' && scannedTableId)
        ? scannedTableId
        : (isMultiMenu && tableNumber ? tableNumber : '');

      let response;

      // Check if we're in edit mode
      if (isEditMode && editingOrderId) {
        // Update existing order with new items
        response = await updateCustomerOrder({
          orderId: editingOrderId,
          cartItems,
          restaurantId,
          tableId: finalTableId,
          orderType: scannedOrderType || 'dinein',
          paymentType: 'postpaid',
          orderNote: specialInstructions,
          authToken: token,
          customerName,
          customerPhone: customerPhone || '',
          orderAmount: isTotalRoundEnabled ? roundedTotal : totalToPay,
          orderSubTotal: subtotalAfterDiscount,
          taxAmount: totalTax  
        });

        // Clear edit mode after successful update
        clearEditMode();

        toast.success('Order updated successfully!');
      } else {
        // Place new order
        // SECURITY: Mark that the API call is about to be dispatched.
        // If a network error occurs (no response), this flag tells the catch block
        // that the request may have reached the server even though we got no response.
        orderDispatchedRef.current = true;
        response = await placeOrder({
          cartItems,
          customerName,
          customerPhone: customerPhone || '',
          tableNumber: finalTableId,
          specialInstructions,
          couponCode,
          restaurantId,
          subtotal,
          totalToPay: isTotalRoundEnabled ? roundedTotal : totalToPay,
          totalTax,
          orderType: scannedOrderType,
          isMultipleMenuType: isMultiMenu,
          token,
          // Points redemption
          pointsRedeemed: pointsToRedeem,
          pointsDiscount: pointsDiscount
        });
      }

      // Clear cart after successful order
      clearCart();

      // Prepare new items for order success page
      const newOrderItems = cartItems.map(item => ({
        name: item.item?.name || 'Item',
        quantity: item.quantity,
        price: item.item?.price || item.totalPrice / item.quantity,
        totalPrice: item.totalPrice,
        veg: item.item?.veg === 1 || item.item?.veg === true
      }));

      // Prepare previous items if in edit mode
      const prevItems = isEditMode ? previousOrderItems.map(item => ({
        name: item.item?.name || 'Item',
        quantity: item.quantity,
        price: item.unitPrice || item.price || 0,
        totalPrice: (item.unitPrice || item.price || 0) * item.quantity,
        veg: item.item?.veg === true || item.item?.veg === 1
      })) : [];

      // Navigate to success page with order data
      navigate(`/${restaurantId}/order-success`, {
        state: {
          orderData: {
            orderId: response?.order_id || editingOrderId || null,
            totalToPay: response?.total_amount || totalToPay.toFixed(2),
            isEditedOrder: isEditMode,
            items: newOrderItems,
            previousItems: prevItems,
            // Bill breakdown calculated locally
            billSummary: {
              itemTotal: itemTotal,
              pointsDiscount: pointsDiscount,
              pointsRedeemed: pointsToRedeem,
              subtotal: subtotalAfterDiscount,
              cgst: adjustedCgst,
              sgst: adjustedSgst,
              vat: adjustedVat,
              totalTax: adjustedTotalTax,
              grandTotal: isTotalRoundEnabled ? roundedTotal : totalToPay,
              originalTotal: totalToPay,
              roundingApplied: isTotalRoundEnabled,
              roundingDifference: roundingDifference
            }
          }
        }
      });

    } catch (error) {
      // console.error('[ReviewOrder] Failed to place order:', error);

      // SECURITY FIX 2: Network-loss duplicate order prevention.
      // If error.response is undefined, the request was sent but no response was received
      // (network drop, timeout, server crash mid-request). The order MAY have been processed
      // server-side. We must NOT silently retry or show a generic "try again" message —
      // doing so risks placing a duplicate order.
      if (!error.response && orderDispatchedRef.current) {
        toast.error(
          'Network error: your order request was sent but we lost the connection. ' +
          'Please check your order history before placing again to avoid duplicates.',
          { duration: 8000 }
        );
      } else if (error.response?.status === 401) {
        // 401 = server explicitly rejected auth BEFORE processing the order.
        // Safe to retry — the order was never created.
        try {
          // console.log('[ReviewOrder] Token expired during request, refreshing...');
          const newToken = await getAuthToken(true);
          setAuthToken(newToken);

          // Use scanned table if available, otherwise use manual selection
          const retryTableId = (isScanned && scannedOrderType === 'dinein' && scannedTableId)
            ? scannedTableId
            : (isMultiMenu && tableNumber ? tableNumber : '');

          let retryResponse;

          // Check if we're in edit mode for retry
          if (isEditMode && editingOrderId) {
            retryResponse = await updateCustomerOrder({
              orderId: editingOrderId,
              cartItems,
              restaurantId,
              tableId: retryTableId,
              orderType: scannedOrderType || 'dinein',
              paymentType: 'postpaid',
              orderNote: specialInstructions,
              authToken: newToken,
              customerName,
              customerPhone: customerPhone || '',
              orderAmount: isTotalRoundEnabled ? roundedTotal : totalToPay,
              orderSubTotal: subtotalAfterDiscount,
              taxAmount: totalTax
            });

            // Clear edit mode after successful update
            clearEditMode();

            toast.success('Order updated successfully!');
          } else {
            // Retry order placement
            retryResponse = await placeOrder({
              cartItems,
              customerName,
              customerPhone: customerPhone || '',
              tableNumber: retryTableId,
              specialInstructions,
              couponCode,
              restaurantId,
              orderType: scannedOrderType,
              subtotal,
              totalToPay: isTotalRoundEnabled ? roundedTotal : totalToPay,
              totalTax,
              isMultipleMenuType: isMultiMenu,
              token: newToken,
              // Points redemption
              pointsRedeemed: pointsToRedeem,
              pointsDiscount: pointsDiscount
            });
          }

          // Clear cart after successful order
          clearCart();

          // Prepare new items for order success page
          const retryOrderItems = cartItems.map(item => ({
            name: item.item?.name || 'Item',
            quantity: item.quantity,
            price: item.item?.price || item.totalPrice / item.quantity,
            totalPrice: item.totalPrice,
            veg: item.item?.veg === 1 || item.item?.veg === true
          }));

          // Prepare previous items if in edit mode
          const retryPrevItems = isEditMode ? previousOrderItems.map(item => ({
            name: item.item?.name || 'Item',
            quantity: item.quantity,
            price: item.unitPrice || item.price || 0,
            totalPrice: (item.unitPrice || item.price || 0) * item.quantity,
            veg: item.item?.veg === true || item.item?.veg === 1
          })) : [];

          // Navigate to success page
          navigate(`/${restaurantId}/order-success`, {
            state: {
              orderData: {
                orderId: retryResponse?.order_id || editingOrderId || null,
                totalToPay: retryResponse?.total_amount || totalToPay.toFixed(2),
                isEditedOrder: isEditMode,
                items: retryOrderItems,
                previousItems: retryPrevItems,
                // Bill breakdown calculated locally
                billSummary: {
                  itemTotal: itemTotal,
                  pointsDiscount: pointsDiscount,
                  pointsRedeemed: pointsToRedeem,
                  subtotal: subtotalAfterDiscount,
                  cgst: adjustedCgst,
                  sgst: adjustedSgst,
                  vat: adjustedVat,
                  totalTax: adjustedTotalTax,
                  grandTotal: totalToPay
                }
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
          (isEditMode ? 'Failed to update order. Please try again.' : 'Failed to place order. Please try again.');
        toast.error(errorMessage);
      }
    } finally {
      isPlacingOrderRef.current = false;
      orderDispatchedRef.current = false;
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
          <button
            className="review-order-empty-btn"
            onClick={handleNavigateToMenu}
          >
            Browse Menu
          </button>
          <p className="review-order-empty-redirect">
            Redirecting in <span className="review-order-countdown">{countdown}</span>
          </p>
          <div className="review-order-progress-track">
            <div
              className="review-order-progress-bar"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
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
          {showTableInfo && !isMultiMenu && isScanned && scannedOrderType === 'dinein' && (
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
                      <span className="review-order-room-icon"><FaDoorOpen /></span>
                    ) : (
                      <span className="review-order-table-icon"><MdOutlineTableRestaurant /></span>
                    )}
                    <span className="review-order-seated-name">{scannedTableNo}</span>
                  </div>
                </div>
              </div>
              <div className="review-order-divider"></div>
            </>

          )}


          {/* Room/Table Selection - Only for Restaurant hyatt */}
          {isMultiMenu && (
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
          {!isMultiMenu && showCustomerDetails && (<>  <div className="review-order-section">
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

          {/* Previous Order Items - Show only in edit mode */}
          {isEditMode && previousOrderItems && previousOrderItems.length > 0 && (
            <>
              <PreviousOrderItems
                items={previousOrderItems}
                orderId={editingOrderId}
              />
              <div className="review-order-divider"></div>
            </>
          )}

          {/* Order Items - New items (editable) */}
          <div className="review-order-section">
            <div className="review-order-section-header">
              <div className="review-order-section-title-icon"><MdOutlineShoppingBag size={16} /></div>
              <h2 className="review-order-section-title">
                {isEditMode ? 'New Items' : 'Order Items'}
              </h2>
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

          {/* Price Breakdown - with integrated Coupon & Loyalty */}
          {showPriceBreakdown && (
            <div className="review-order-section">
              <div className="review-order-section-header">
                <div className="review-order-section-title-icon"><RiFileList3Line size={16} /></div>
                <h2 className="review-order-section-title">Price Breakdown</h2>
              </div>

              <div className="review-order-price-card">
                {/* Item Total */}
                <div className="price-row">
                  <span className="price-label">Item Total</span>
                  <span className="price-value">₹{itemTotal.toFixed(2)}</span>
                </div>

                {/* Coupon Code - inline */}
                {showCoupon && (
                  <div className="price-row price-row-input">
                    <div className="price-input-group">
                      <span className="price-input-icon">🏷️</span>
                      <input
                        type="text"
                        className="price-inline-input"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter coupon code"
                        data-testid="coupon-input"
                      />
                    </div>
                    <button className="price-inline-btn" data-testid="apply-coupon-btn">Apply</button>
                  </div>
                )}

                {/* Loyalty Points - inline */}
                {showLoyalty && (
                  (() => {
                    const pts = lookedUpCustomer?.found
                      ? (lookedUpCustomer?.total_points || 0)
                      : (isAuthenticated ? (user?.total_points || 0) : 0);
                    const rdv = loyaltySettings?.redemption_value || 0;

                    // If points are being used, show the applied discount
                    if (isUsingPoints && pointsToRedeem > 0) {
                      return (
                        <div className="price-row price-row-input price-row-discount">
                          <div className="price-input-group">
                            <span className="price-input-icon">🎁</span>
                            <span className="price-loyalty-text price-loyalty-applied">
                              Using {pointsToRedeem} points (-₹{pointsDiscount.toFixed(0)})
                            </span>
                          </div>
                          <button
                            className="price-inline-btn price-inline-btn-remove"
                            data-testid="remove-loyalty-btn"
                            onClick={handleRemovePoints}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    }

                    // Show available points with Use button
                    return (
                      <div className="price-row price-row-input">
                        <div className="price-input-group">
                          <span className="price-input-icon">🎁</span>
                          <span className="price-loyalty-text">
                            {pts} points{rdv ? ` (Worth ₹${(pts * rdv).toFixed(0)})` : ''}
                          </span>
                        </div>
                        <button
                          className="price-inline-btn"
                          data-testid="redeem-loyalty-btn"
                          disabled={!pts}
                          onClick={handleUsePoints}
                        >
                          Use
                        </button>
                      </div>
                    );
                  })()
                )}

                {/* Subtotal (before taxes) */}
                <div className="price-row price-row-subtotal">
                  <span className="price-label">Subtotal</span>
                  <span className="price-value">₹{subtotalAfterDiscount.toFixed(2)}</span>
                </div>

                {/* GST/VAT if applicable */}
                {totalGst > 0 && (
                  <>
                    <div className="price-row price-row-sub">
                      <span className="price-label-sub">CGST</span>
                      <span className="price-value-sub">₹{adjustedCgst.toFixed(2)}</span>
                    </div>
                    <div className="price-row price-row-sub">
                      <span className="price-label-sub">SGST</span>
                      <span className="price-value-sub">₹{adjustedSgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {vat > 0 && (
                  <div className="price-row price-row-sub">
                    <span className="price-label-sub">VAT</span>
                    <span className="price-value-sub">₹{adjustedVat.toFixed(2)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="price-row price-row-total">
                  <span className="price-label-total">Grand Total</span>
                  <span className="price-value-total">
                    ₹{isTotalRoundEnabled ? roundedTotal : totalToPay.toFixed(2)}
                    {isTotalRoundEnabled && roundedTotal !== totalToPay && (
                      <span className="original-total">(₹{totalToPay.toFixed(2)})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Customer Rewards Info — shown for any identified customer (via login or phone lookup) */}
          {configShowLoyaltyPoints && restaurant?.is_loyalty === 'Yes' && (isAuthenticated || lookedUpCustomer) && loyaltySettings && (
            (() => {
              const custTier = isAuthenticated ? (user?.tier || 'Bronze') : (lookedUpCustomer?.tier || 'Bronze');
              const tier = custTier.toLowerCase();
              const earnPercent = loyaltySettings[`${tier}_earn_percent`] || loyaltySettings.bronze_earn_percent || 5;
              const billAmount = totalToPay;
              const minOrderValue = loyaltySettings.min_order_value || 100;
              const isEligible = billAmount >= minOrderValue;
              const pointsToEarn = Math.round(billAmount * (earnPercent / 100));
              const redemptionValue = loyaltySettings.redemption_value || 0.25;
              const pointsWorth = (pointsToEarn * redemptionValue).toFixed(0);
              const isNewCustomer = lookedUpCustomer && !lookedUpCustomer.found;
              const firstVisitBonus = isNewCustomer && loyaltySettings.first_visit_bonus_enabled ? loyaltySettings.first_visit_bonus_points : 0;

              return (
                <div className="review-order-user-info" data-testid="logged-in-user-info">
                  <div className="user-info-content">
                    <IoGiftOutline className="user-info-icon" />
                    <div className="user-info-text">
                      {isEligible ? (
                        <>
                          <span className="user-info-name">
                            You will earn {pointsToEarn} points on this order!
                          </span>
                          <span className="user-info-points">
                            Worth ₹{pointsWorth}{firstVisitBonus > 0 ? ` + ${firstVisitBonus} bonus points for first visit` : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="user-info-name">Almost there!</span>
                          <span className="user-info-points">
                            Add ₹{(minOrderValue - billAmount).toFixed(0)} more to earn points
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* No loyalty settings fallback */}
          {configShowLoyaltyPoints && restaurant?.is_loyalty === 'Yes' && (isAuthenticated || lookedUpCustomer) && !loyaltySettings && (
            <div className="review-order-user-info" data-testid="logged-in-user-info">
              <div className="user-info-content">
                <IoGiftOutline className="user-info-icon" />
                <div className="user-info-text">
                  <span className="user-info-name">
                    Hi, {(isAuthenticated ? user?.name?.split(' ')[0] : lookedUpCustomer?.name?.split(' ')[0]) || 'there'}!
                  </span>
                  <span className="user-info-points">
                    {(isAuthenticated ? user?.total_points : lookedUpCustomer?.total_points) || 0} points available
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Guest prompt — only if no phone entered and not logged in */}
          {configShowLoyaltyPoints && restaurant?.is_loyalty === 'Yes' && !isAuthenticated && !lookedUpCustomer && loyaltySettings && (
            (() => {
              const earnPercent = loyaltySettings.bronze_earn_percent || 5;
              const billAmount = totalToPay;
              const pointsToEarn = Math.round(billAmount * (earnPercent / 100));
              const redemptionValue = loyaltySettings.redemption_value || 0.25;
              const pointsWorth = (pointsToEarn * redemptionValue).toFixed(0);
              const minOrderValue = loyaltySettings.min_order_value || 100;
              const isEligible = billAmount >= minOrderValue;

              return (
                <div className="review-order-login-prompt" data-testid="login-rewards-prompt">
                  <div className="login-prompt-content">
                    <IoGiftOutline className="login-prompt-icon" />
                    <div className="login-prompt-text">
                      {isEligible ? (
                        <>
                          <span className="login-prompt-title">
                            Earn {pointsToEarn} points on this order!
                          </span>
                          <span className="login-prompt-subtitle">
                            Worth ₹{pointsWorth} — enter your phone number above
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="login-prompt-title">Earn rewards on this order!</span>
                          <span className="login-prompt-subtitle">
                            Add ₹{(minOrderValue - billAmount).toFixed(0)} more to earn points
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Place Order Button */}
        <div className="review-order-footer">
          <button
            className="review-order-place-btn"
            onClick={handlePlaceOrder}
            disabled={totalItems === 0 || isPlacingOrder || isLoadingToken}
            data-testid="place-order-btn"
          >
            {isPlacingOrder
              ? (isEditMode ? 'Updating Order...' : 'Placing Order...')
              : (isEditMode
                ? `Update Order ₹${isTotalRoundEnabled ? roundedTotal : totalToPay.toFixed(2)}`
                : `Place Order ₹${isTotalRoundEnabled ? roundedTotal : totalToPay.toFixed(2)}`
              )
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewOrder;
