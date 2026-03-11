import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RestaurantConfigContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const DEFAULT_CONFIG = {
  // Landing Page
  showLogo: true,
  showWelcomeText: true,
  showDescription: true,
  showSocialIcons: true,
  showTableNumber: true,
  showPromotions: true,
  showPoweredBy: true,
  showCallWaiter: true,
  showPayBill: true,
  showLandingCallWaiter: true,
  showLandingPayBill: true,
  showEstimatedTimes: false,
  showAboutUs: true,
  showFooter: true,
  showLandingCustomerCapture: false,  // Capture name/phone on landing
  showHamburgerMenu: false,  // Show hamburger menu
  showLoginButton: true,    // Show login button on landing
  // Menu Page
  showPromotionsOnMenu: true,
  showCategories: true,
  // Order Page
  showCustomerDetails: true,
  showCustomerName: true,
  showCustomerPhone: true,
  showCookingInstructions: true,
  showSpecialInstructions: true,
  showPriceBreakdown: true,
  showTableInfo: true,
  showLoyaltyPoints: true,
  showCouponCode: true,
  showWallet: true,
  // Order Status Page
  showFoodStatus: true,  // Show food item status (Preparing/Ready/Served)
  showOrderStatusTracker: true,  // Show order status progress bar
  // Branding - Colors
  logoUrl: null,
  backgroundImageUrl: null,          // Desktop landing page background image
  mobileBackgroundImageUrl: null,    // Mobile landing page background image (9:16)
  primaryColor: null,
  secondaryColor: null,
  buttonTextColor: null,
  backgroundColor: null,
  textColor: null,
  textSecondaryColor: null,
  // Branding - Typography
  fontHeading: null,
  fontBody: null,
  // Branding - Style
  borderRadius: null,
  // Branding - Text
  welcomeMessage: null,
  tagline: null,
  instagramUrl: null,
  facebookUrl: null,
  twitterUrl: null,
  youtubeUrl: null,
  whatsappNumber: null,
  phone: null,
  address: null,
  contactEmail: null,
  mapEmbedUrl: null,
  aboutUsContent: null,
  aboutUsImage: null,
  openingHours: null,
  footerText: null,
  footerLinks: [],
  feedbackEnabled: true,
  feedbackIntroText: null,
  customPages: [],
  navMenuOrder: [],
  banners: [],
  // Extra Info Section
  showExtraInfo: true,
  extraInfoItems: [],
  // Custom Text
  browseMenuButtonText: 'Browse Menu',
  // Customer Capture - Mandatory fields
  mandatoryCustomerName: false,
  mandatoryCustomerPhone: false,
  // OTP Configuration per order type
  otpRequiredDineIn: false,
  otpRequiredTakeaway: false,
  otpRequiredDineInWithTable: false,
  otpRequiredWalkIn: false,
  otpRequiredRoomOrders: false,
};

export const RestaurantConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [configRestaurantId, setConfigRestaurantId] = useState(null);

  // Helper to get cache key for restaurant config
  const getConfigCacheKey = (restaurantId) => `restaurant_config_${restaurantId}`;

  // Load config from localStorage cache (instant brand colors on refresh)
  const loadConfigFromCache = useCallback((restaurantId) => {
    try {
      const cached = localStorage.getItem(getConfigCacheKey(restaurantId));
      if (cached) {
        const cachedConfig = JSON.parse(cached);
        setConfig({ ...DEFAULT_CONFIG, ...cachedConfig });
        setConfigRestaurantId(restaurantId);
        return true;
      }
    } catch (error) {
      console.error('Failed to load config from cache:', error);
    }
    return false;
  }, []);

  // Save config to localStorage cache
  const saveConfigToCache = (restaurantId, data) => {
    try {
      localStorage.setItem(getConfigCacheKey(restaurantId), JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save config to cache:', error);
    }
  };

  const fetchConfig = useCallback(async (restaurantId) => {
    if (!restaurantId || restaurantId === configRestaurantId) return;

    // Load from cache FIRST (instant brand colors)
    const hasCached = loadConfigFromCache(restaurantId);
    
    // Then fetch from API to get latest (in case config was updated)
    setConfigLoading(!hasCached); // Only show loading if no cache
    try {
      const response = await fetch(`${API_URL}/api/config/${restaurantId}`);
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...DEFAULT_CONFIG, ...data });
        setConfigRestaurantId(restaurantId);
        // Save to cache for next time
        saveConfigToCache(restaurantId, data);
      }
    } catch (error) {
      console.error('Failed to fetch restaurant config:', error);
    } finally {
      setConfigLoading(false);
    }
  }, [configRestaurantId, loadConfigFromCache]);

  // Force refresh config (used after Admin Settings save)
  const refreshConfig = useCallback(async (restaurantId) => {
    if (!restaurantId) return;
    
    // 1. Clear cached restaurant ID (so fetchConfig doesn't skip)
    setConfigRestaurantId(null);
    
    // 2. Clear localStorage cache
    const cacheKey = `restaurant_config_${restaurantId}`;
    localStorage.removeItem(cacheKey);
    
    // 3. Re-fetch from API
    setConfigLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/config/${restaurantId}`);
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...DEFAULT_CONFIG, ...data });
        setConfigRestaurantId(restaurantId);
        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to refresh restaurant config:', error);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Apply dynamic branding CSS variables when config changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Primary Color
    {
      const primary = config.primaryColor || '#E8531E';
      root.style.setProperty('--color-primary', primary);
      root.style.setProperty('--text-link', primary);
      root.style.setProperty('--border-primary', primary);
      root.style.setProperty('--text-blue-hero', primary);
      root.style.setProperty('--color-primary-darker', primary);
      root.style.setProperty('--color-primary-darkest', primary);
      root.style.setProperty('--text-blue-dark', primary);
      root.style.setProperty('--text-blue-medium', primary);
      root.style.setProperty('--text-blue-light', primary);
    }
    
    // Secondary Color (for hover states, gradients)
    {
      const secondary = config.secondaryColor || '#2E7D32';
      root.style.setProperty('--color-primary-dark', secondary);
      root.style.setProperty('--text-link-hover', secondary);
    }
    
    // Button Text Color
    root.style.setProperty('--button-text-color', config.buttonTextColor || '#FFFFFF');
    
    // Background Color
    root.style.setProperty('--bg-primary', config.backgroundColor || '#FFFFFF');
    
    // Text Color (for body text, descriptions, etc.)
    if (config.textColor) {
      root.style.setProperty('--text-color', config.textColor);
      root.style.setProperty('--text-primary', config.textColor);
    }
    
    // Text Secondary Color (for secondary text)
    if (config.textSecondaryColor) {
      root.style.setProperty('--text-secondary-color', config.textSecondaryColor);
      root.style.setProperty('--text-secondary', config.textSecondaryColor);
    }
    
    // Font Heading
    {
      const fontMap = {
        'Big Shoulders': "'Big Shoulders Display', sans-serif",
        'Montserrat': "'Montserrat', sans-serif",
        'Poppins': "'Poppins', sans-serif",
        'Roboto': "'Roboto', sans-serif",
        'Open Sans': "'Open Sans', sans-serif",
        'Playfair Display': "'Playfair Display', serif",
        'Lato': "'Lato', sans-serif",
      };
      const font = config.fontHeading || 'Montserrat';
      root.style.setProperty('--font-heading', fontMap[font] || font);
    }
    
    // Font Body
    {
      const fontMap = {
        'Montserrat': "'Montserrat', sans-serif",
        'Poppins': "'Poppins', sans-serif",
        'Roboto': "'Roboto', sans-serif",
        'Open Sans': "'Open Sans', sans-serif",
        'Lato': "'Lato', sans-serif",
        'Inter': "'Inter', sans-serif",
        'Nunito': "'Nunito', sans-serif",
      };
      const font = config.fontBody || 'Montserrat';
      root.style.setProperty('--font-body', fontMap[font] || font);
    }
    
    // Border Radius - affects buttons, badges AND containers proportionally
    if (config.borderRadius) {
      const radiusMap = {
        //                   button    badge   sm    md     lg     xl
        'sharp':          { button: '0px',    badge: '0px',    sm: '0px',  md: '0px',  lg: '0px',  xl: '0px'  },
        'slightly-rounded':{ button: '4px',   badge: '6px',    sm: '2px',  md: '4px',  lg: '6px',  xl: '8px'  },
        'rounded':         { button: '8px',   badge: '12px',   sm: '4px',  md: '8px',  lg: '12px', xl: '16px' },
        'very-rounded':    { button: '12px',  badge: '16px',   sm: '6px',  md: '12px', lg: '16px', xl: '20px' },
        'pill':            { button: '9999px',badge: '9999px', sm: '8px',  md: '14px', lg: '18px', xl: '24px' },
      };
      const radii = radiusMap[config.borderRadius];
      if (radii) {
        root.style.setProperty('--radius-button', radii.button);
        root.style.setProperty('--radius-badge', radii.badge);
        root.style.setProperty('--radius-container-sm', radii.sm);
        root.style.setProperty('--radius-container-md', radii.md);
        root.style.setProperty('--radius-container-lg', radii.lg);
        root.style.setProperty('--radius-container-xl', radii.xl);
      }
    }
    
    return () => {
      // Cleanup
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-dark');
      root.style.removeProperty('--color-primary-darker');
      root.style.removeProperty('--color-primary-darkest');
      root.style.removeProperty('--text-link');
      root.style.removeProperty('--text-link-hover');
      root.style.removeProperty('--border-primary');
      root.style.removeProperty('--button-text-color');
      root.style.removeProperty('--bg-primary');
      root.style.removeProperty('--text-color');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary-color');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--font-heading');
      root.style.removeProperty('--font-body');
      root.style.removeProperty('--radius-button');
      root.style.removeProperty('--radius-badge');
      root.style.removeProperty('--radius-container-sm');
      root.style.removeProperty('--radius-container-md');
      root.style.removeProperty('--radius-container-lg');
      root.style.removeProperty('--radius-container-xl');
      root.style.removeProperty('--text-blue-hero');
      root.style.removeProperty('--text-blue-dark');
      root.style.removeProperty('--text-blue-medium');
      root.style.removeProperty('--text-blue-light');
    };
  }, [config.primaryColor, config.secondaryColor, config.buttonTextColor, config.backgroundColor, config.fontHeading, config.fontBody, config.borderRadius]);

  // Helper: check boolean with default true
  const isOn = (key) => config[key] !== false;

  const value = {
    config,
    configLoading,
    fetchConfig,
    refreshConfig,
    // Landing Page
    showLogo: isOn('showLogo'),
    showWelcomeText: isOn('showWelcomeText'),
    showDescription: isOn('showDescription'),
    showSocialIcons: isOn('showSocialIcons'),
    showTableNumber: isOn('showTableNumber'),
    showPromotions: isOn('showPromotions'),
    showPoweredBy: isOn('showPoweredBy'),
    showCallWaiter: isOn('showCallWaiter'),
    showPayBill: isOn('showPayBill'),
    showLandingCallWaiter: isOn('showLandingCallWaiter'),
    showLandingPayBill: isOn('showLandingPayBill'),
    showEstimatedTimes: config.showEstimatedTimes === true,
    showAboutUs: isOn('showAboutUs'),
    showFooter: isOn('showFooter'),
    showLandingCustomerCapture: config.showLandingCustomerCapture === true,  // Default OFF
    showHamburgerMenu: config.showHamburgerMenu === true,  // Default OFF
    showLoginButton: isOn('showLoginButton'),      // Default ON
    // Menu Page
    showPromotionsOnMenu: isOn('showPromotionsOnMenu'),
    showCategories: isOn('showCategories'),
    // Order Page
    showCustomerDetails: isOn('showCustomerDetails'),
    showCustomerName: isOn('showCustomerName'),
    showCustomerPhone: isOn('showCustomerPhone'),
    showCookingInstructions: isOn('showCookingInstructions'),
    showSpecialInstructions: isOn('showSpecialInstructions'),
    showPriceBreakdown: isOn('showPriceBreakdown'),
    showTableInfo: isOn('showTableInfo'),
    showLoyaltyPoints: isOn('showLoyaltyPoints'),
    showCouponCode: isOn('showCouponCode'),
    showWallet: isOn('showWallet'),
    // Order Status Page
    showFoodStatus: isOn('showFoodStatus'),
    showOrderStatusTracker: isOn('showOrderStatusTracker'),
    // Branding - Colors
    logoUrl: config.logoUrl,
    backgroundImageUrl: config.backgroundImageUrl,
    mobileBackgroundImageUrl: config.mobileBackgroundImageUrl,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    buttonTextColor: config.buttonTextColor,
    backgroundColor: config.backgroundColor,
    textColor: config.textColor,
    textSecondaryColor: config.textSecondaryColor,
    // Branding - Typography
    fontHeading: config.fontHeading,
    fontBody: config.fontBody,
    // Branding - Style
    borderRadius: config.borderRadius,
    // Branding - Text
    welcomeMessage: config.welcomeMessage,
    tagline: config.tagline,
    instagramUrl: config.instagramUrl,
    facebookUrl: config.facebookUrl,
    twitterUrl: config.twitterUrl,
    youtubeUrl: config.youtubeUrl,
    whatsappNumber: config.whatsappNumber,
    phone: config.phone,
    address: config.address,
    contactEmail: config.contactEmail,
    mapEmbedUrl: config.mapEmbedUrl,
    aboutUsContent: config.aboutUsContent,
    aboutUsImage: config.aboutUsImage,
    openingHours: config.openingHours,
    footerText: config.footerText,
    footerLinks: config.footerLinks || [],
    feedbackEnabled: config.feedbackEnabled !== false,
    feedbackIntroText: config.feedbackIntroText,
    customPages: config.customPages || [],
    navMenuOrder: config.navMenuOrder || [],
    banners: (config.banners || []).filter(b => b.bannerEnabled !== false).sort((a, b) => (a.bannerOrder || 0) - (b.bannerOrder || 0)).slice(0, 5),
    // Extra Info Section
    showExtraInfo: config.showExtraInfo !== false,
    extraInfoItems: config.extraInfoItems || [],
    // Custom Text
    browseMenuButtonText: config.browseMenuButtonText || 'Browse Menu',
    // Customer Capture - Mandatory fields
    mandatoryCustomerName: config.mandatoryCustomerName === true,
    mandatoryCustomerPhone: config.mandatoryCustomerPhone === true,
    // OTP Configuration per order type
    otpRequiredDineIn: config.otpRequiredDineIn === true,
    otpRequiredTakeaway: config.otpRequiredTakeaway === true,
    otpRequiredDineInWithTable: config.otpRequiredDineInWithTable === true,
    otpRequiredWalkIn: config.otpRequiredWalkIn === true,
    otpRequiredRoomOrders: config.otpRequiredRoomOrders === true,
  };

  return (
    <RestaurantConfigContext.Provider value={value}>
      {children}
    </RestaurantConfigContext.Provider>
  );
};

export const useRestaurantConfig = () => {
  const context = useContext(RestaurantConfigContext);
  if (!context) {
    throw new Error('useRestaurantConfig must be used within a RestaurantConfigProvider');
  }
  return context;
};

export default RestaurantConfigContext;
