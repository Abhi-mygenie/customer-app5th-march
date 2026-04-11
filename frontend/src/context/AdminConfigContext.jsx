import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { DEFAULT_THEME } from '../constants/theme';
import logger from '../utils/logger';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const AdminConfigContext = createContext(null);

export const useAdminConfig = () => {
  const context = useContext(AdminConfigContext);
  if (!context) {
    throw new Error('useAdminConfig must be used within AdminConfigProvider');
  }
  return context;
};

const defaultConfig = {
  // Landing Page Visibility
  showLogo: true,
  showWelcomeText: false,
  showDescription: false,
  showSocialIcons: false,
  showTableNumber: true,
  showPoweredBy: true,
  showCallWaiter: false,
  showPayBill: false,
  showLandingCallWaiter: false,
  showLandingPayBill: false,
  showEstimatedTimes: false,
  showFooter: true,
  showLandingCustomerCapture: false,
  showHamburgerMenu: true,
  showLoginButton: false,
  // Menu Page Visibility
  showPromotionsOnMenu: false,
  showCategories: true,
  showMenuFab: true,
  // Order Page Visibility
  showCustomerDetails: false,
  showCustomerName: false,
  showCustomerPhone: true,
  showCookingInstructions: true,
  showSpecialInstructions: true,
  showPriceBreakdown: true,
  showTableInfo: true,
  showLoyaltyPoints: true,
  showCouponCode: false,
  showWallet: false,
  // Order Status Page
  showFoodStatus: true,
  showOrderStatusTracker: false,
  // Branding - Colors
  logoUrl: '',
  backgroundImageUrl: '',
  mobileBackgroundImageUrl: '',
  primaryColor: DEFAULT_THEME.primaryColor,
  secondaryColor: DEFAULT_THEME.secondaryColor,
  buttonTextColor: DEFAULT_THEME.buttonTextColor,
  backgroundColor: DEFAULT_THEME.backgroundColor,
  textColor: DEFAULT_THEME.textColor,
  textSecondaryColor: DEFAULT_THEME.textSecondaryColor,
  // Branding - Typography
  fontHeading: 'Poppins',
  fontBody: 'Poppins',
  // Branding - Style
  borderRadius: 'rounded',
  // Branding - Text
  welcomeMessage: 'Welcome!',
  tagline: '',
  instagramUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  whatsappNumber: '',
  phone: '',
  // Content
  aboutUsContent: '',
  aboutUsImage: '',
  openingHours: '',
  footerText: '',
  footerLinks: [],
  address: '',
  contactEmail: '',
  mapEmbedUrl: '',
  feedbackEnabled: false,
  feedbackIntroText: '',
  customPages: [],
  navMenuOrder: [
    { id: 'home', label: 'Home', type: 'builtin', visible: true },
    { id: 'menu', label: 'Menu', type: 'builtin', visible: true },
    { id: 'about', label: 'About Us', type: 'builtin', visible: false },
    { id: 'contact', label: 'Contact', type: 'builtin', visible: false },
    { id: 'feedback', label: 'Feedback', type: 'builtin', visible: false },
    { id: 'login', label: 'Login', type: 'builtin', visible: false },
  ],
  // Banners
  banners: [],
  // Extra Info Section
  showExtraInfo: true,
  extraInfoItems: ['', '', '', '', ''],
  // Custom Text
  browseMenuButtonText: 'Browse Menu',
  // Restaurant Operating Shifts
  restaurantShifts: [{ start: '06:00', end: '03:00' }],
  // Restaurant Open master toggle (default open)
  restaurantOpen: true,
  // Category & Item Timings
  categoryTimings: {},
  itemTimings: {},
  // Menu Order
  menuOrder: null,
  // Payment Options (FEAT-001)
  codEnabled: false,
  onlinePaymentDinein: true,
  onlinePaymentTakeaway: true,
  onlinePaymentDelivery: true,
  payOnlineLabel: '',
  payAtCounterLabel: '',
  // Notification Popups (FEAT-003)
  notificationPopups: [],
};

export const AdminConfigProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [config, setConfig] = useState(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantFlags, setRestaurantFlags] = useState({});

  // Check if config has unsaved changes
  const isDirty = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // Fetch config on mount
  useEffect(() => {
    if (!user?.id || !token) return;

    const fetchConfig = async () => {
      const configId = user.restaurant_id || user.id;
      setLoading(true);

      try {
        const [configResponse, restaurantResponse] = await Promise.all([
          fetch(`${API_URL}/api/config/${configId}`),
          fetch(`${API_URL}/api/restaurant-info/${configId}`).catch(() => null)
        ]);

        if (configResponse.ok) {
          const data = await configResponse.json();
          const extraInfoItems = data.extraInfoItems || [];
          while (extraInfoItems.length < 5) extraInfoItems.push('');
          const newConfig = { ...defaultConfig, ...data, extraInfoItems };
          setConfig(newConfig);
          setOriginalConfig(newConfig);
        }

        if (restaurantResponse?.ok) {
          const restaurantData = await restaurantResponse.json();
          setRestaurantFlags({
            is_loyalty: restaurantData.is_loyalty,
            is_coupon: restaurantData.is_coupon,
            multiple_menu: restaurantData.multiple_menu === 'Yes',
          });
        }
      } catch (error) {
        logger.error('admin', 'Failed to load admin config:', error);
        toast.error('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user?.id, token]);

  // Update a single field
  const updateField = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update multiple fields
  const updateFields = useCallback((fields) => {
    setConfig(prev => ({ ...prev, ...fields }));
  }, []);

  // Toggle a boolean field
  const toggleField = useCallback((field) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  // Save config to server
  const saveConfig = useCallback(async () => {
    if (!token) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/config/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...config,
          extraInfoItems: config.extraInfoItems.filter(item => item.trim() !== ''),
        })
      });

      if (response.ok) {
        setOriginalConfig(config);
        toast.success('Settings saved successfully');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      logger.error('admin', 'Failed to save config:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [config, token]);

  // Reset to original config
  const resetConfig = useCallback(() => {
    setConfig(originalConfig);
  }, [originalConfig]);

  // Banner operations
  const addBanner = useCallback(async (banner) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/config/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(banner)
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          banners: [...(prev.banners || []), data.banner]
        }));
        setOriginalConfig(prev => ({
          ...prev,
          banners: [...(prev.banners || []), data.banner]
        }));
        toast.success('Banner added');
        return data.banner;
      } else {
        throw new Error('Failed to add banner');
      }
    } catch (error) {
      toast.error('Failed to add banner');
      return null;
    }
  }, [token]);

  const updateBanner = useCallback(async (bannerId, banner) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/config/banners/${bannerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(banner)
      });

      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          banners: prev.banners.map(b => b.id === bannerId ? { ...b, ...banner } : b)
        }));
        setOriginalConfig(prev => ({
          ...prev,
          banners: prev.banners.map(b => b.id === bannerId ? { ...b, ...banner } : b)
        }));
        toast.success('Banner updated');
      } else {
        throw new Error('Failed to update banner');
      }
    } catch (error) {
      toast.error('Failed to update banner');
    }
  }, [token]);

  const deleteBanner = useCallback(async (bannerId) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/config/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          banners: prev.banners.filter(b => b.id !== bannerId)
        }));
        setOriginalConfig(prev => ({
          ...prev,
          banners: prev.banners.filter(b => b.id !== bannerId)
        }));
        toast.success('Banner deleted');
      } else {
        throw new Error('Failed to delete banner');
      }
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  }, [token]);

  // Upload image helper
  const uploadImage = useCallback(async (file) => {
    if (!token) return null;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_URL}/api/upload/image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Upload failed');
      }

      const data = await response.json();
      toast.success('Image uploaded');
      return `${API_URL}${data.url}`;
    } catch (error) {
      toast.error(error.message || 'Upload failed');
      return null;
    }
  }, [token]);

  const value = {
    config,
    loading,
    saving,
    isDirty,
    restaurantFlags,
    updateField,
    updateFields,
    toggleField,
    saveConfig,
    resetConfig,
    addBanner,
    updateBanner,
    deleteBanner,
    uploadImage,
  };

  return (
    <AdminConfigContext.Provider value={value}>
      {children}
    </AdminConfigContext.Provider>
  );
};

export default AdminConfigContext;
