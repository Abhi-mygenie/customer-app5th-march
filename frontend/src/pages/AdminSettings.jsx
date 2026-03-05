import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  IoLogOutOutline, 
  IoSaveOutline, 
  IoAddOutline, 
  IoTrashOutline, 
  IoToggle,
  IoHomeOutline,
  IoRestaurantOutline,
  IoCartOutline,
  IoColorPaletteOutline,
  IoImagesOutline,
  IoCloudUploadOutline,
  IoCreateOutline,
  IoCloseOutline,
  IoDocumentOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import ContentTab from '../components/AdminSettings/ContentTab';
import '../components/AdminSettings/ContentTab.css';
import './AdminSettings.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, token, isRestaurant, logout } = useAuth();
  
  const [config, setConfig] = useState({
    // Landing Page Visibility
    showLogo: true,
    showWelcomeText: true,
    showDescription: true,
    showSocialIcons: true,
    showTableNumber: true,
    showPoweredBy: true,
    showCallWaiter: true,
    showPayBill: true,
    showAboutUs: true,
    showFooter: true,
    showLandingCustomerCapture: false,  // Capture name/phone on landing
    // Menu Page Visibility
    showPromotionsOnMenu: true,
    showCategories: true,
    // Order Page Visibility
    showCustomerDetails: true,
    showCustomerName: true,
    showCustomerPhone: true,
    showCookingInstructions: true,
    showSpecialInstructions: true,
    showPriceBreakdown: true,
    showTableInfo: true,
    // Branding - Colors
    logoUrl: '',
    primaryColor: '#61B4E5',
    secondaryColor: '#4fa3d1',
    buttonTextColor: '#ffffff',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    textSecondaryColor: '#666666',
    // Branding - Typography
    fontHeading: 'Big Shoulders',
    fontBody: 'Montserrat',
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
    feedbackEnabled: true,
    feedbackIntroText: '',
    customPages: [],
    navMenuOrder: [
      { id: 'home', label: 'Home', type: 'builtin', visible: true },
      { id: 'menu', label: 'Menu', type: 'builtin', visible: true },
      { id: 'about', label: 'About Us', type: 'builtin', visible: true },
      { id: 'contact', label: 'Contact', type: 'builtin', visible: true },
      { id: 'feedback', label: 'Feedback', type: 'builtin', visible: true },
    ],
    // Banners
    banners: []
  });
  
  const [newBanner, setNewBanner] = useState({
    bannerImage: '',
    bannerTitle: '',
    bannerLink: '',
    bannerOrder: 0,
    bannerEnabled: true
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('landing');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [bannerSizeWarning, setBannerSizeWarning] = useState('');
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const validateImageDimensions = (src) => {
    setBannerSizeWarning('');
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      const expected = 16 / 9;
      if (img.width < 600) {
        setBannerSizeWarning(`Image is too small (${img.width}x${img.height}px). Min width: 600px.`);
      } else if (Math.abs(ratio - expected) > 0.15) {
        setBannerSizeWarning(`Aspect ratio is ${img.width}x${img.height}px. Recommended: 16:9 (e.g. 1200x675px).`);
      }
    };
    img.onerror = () => {};
    img.src = src;
  };

  const uploadImage = async (file, setUploading) => {
    setUploading(true);
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
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    if (!isRestaurant) {
      navigate('/profile');
      return;
    }
    
    fetchConfig();
  }, [token, isRestaurant, navigate]);

  const fetchConfig = async () => {
    if (!user?.id) return;
    
    // Use restaurant_id field if available, fallback to user id
    const configId = user.restaurant_id || user.id;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/config/${configId}`);
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/config/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          // Landing Page Visibility
          showLogo: config.showLogo,
          showWelcomeText: config.showWelcomeText,
          showDescription: config.showDescription,
          showSocialIcons: config.showSocialIcons,
          showTableNumber: config.showTableNumber,
          showPoweredBy: config.showPoweredBy,
          showCallWaiter: config.showCallWaiter,
          showPayBill: config.showPayBill,
          showAboutUs: config.showAboutUs,
          showFooter: config.showFooter,
          showLandingCustomerCapture: config.showLandingCustomerCapture,
          // Menu Page Visibility
          showPromotionsOnMenu: config.showPromotionsOnMenu,
          showCategories: config.showCategories,
          // Order Page Visibility
          showCustomerDetails: config.showCustomerDetails,
          showCustomerName: config.showCustomerName,
          showCustomerPhone: config.showCustomerPhone,
          showCookingInstructions: config.showCookingInstructions,
          showSpecialInstructions: config.showSpecialInstructions,
          showPriceBreakdown: config.showPriceBreakdown,
          showTableInfo: config.showTableInfo,
          // Branding - Colors
          logoUrl: config.logoUrl,
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
          // Content
          aboutUsContent: config.aboutUsContent,
          aboutUsImage: config.aboutUsImage,
          openingHours: config.openingHours,
          footerText: config.footerText,
          footerLinks: config.footerLinks,
          address: config.address,
          contactEmail: config.contactEmail,
          mapEmbedUrl: config.mapEmbedUrl,
          feedbackEnabled: config.feedbackEnabled,
          feedbackIntroText: config.feedbackIntroText,
          navMenuOrder: config.navMenuOrder
        })
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addBanner = async () => {
    if (!newBanner.bannerImage || !newBanner.bannerTitle) {
      toast.error('Please fill in banner image and title');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/config/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBanner)
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          banners: [...(prev.banners || []), data.banner]
        }));
        setNewBanner({
          bannerImage: '',
          bannerTitle: '',
          bannerLink: '',
          bannerOrder: 0,
          bannerEnabled: true
        });
        toast.success('Banner added');
      } else {
        throw new Error('Failed to add banner');
      }
    } catch (error) {
      toast.error('Failed to add banner');
    }
  };

  const deleteBanner = async (bannerId) => {
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
        toast.success('Banner deleted');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const startEditBanner = (banner) => {
    setEditingBannerId(banner.id);
    setNewBanner({
      bannerImage: banner.bannerImage || '',
      bannerTitle: banner.bannerTitle || '',
      bannerLink: banner.bannerLink || '',
      bannerOrder: banner.bannerOrder || 0,
      bannerEnabled: banner.bannerEnabled !== false
    });
    setBannerSizeWarning('');
  };

  const cancelEditBanner = () => {
    setEditingBannerId(null);
    setNewBanner({ bannerImage: '', bannerTitle: '', bannerLink: '', bannerOrder: 0, bannerEnabled: true });
    setBannerSizeWarning('');
  };

  const updateBanner = async () => {
    if (!newBanner.bannerImage || !newBanner.bannerTitle) {
      toast.error('Please fill in banner image and title');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/config/banners/${editingBannerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBanner)
      });
      if (response.ok) {
        setConfig(prev => ({
          ...prev,
          banners: prev.banners.map(b => b.id === editingBannerId ? { ...b, ...newBanner } : b)
        }));
        cancelEditBanner();
        toast.success('Banner updated');
      } else {
        throw new Error('Failed to update banner');
      }
    } catch (error) {
      toast.error('Failed to update banner');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  // Toggle component for reuse
  const ToggleRow = ({ field, label }) => (
    <div className="toggle-row" data-testid={`toggle-${field}`}>
      <span className="toggle-label">{label}</span>
      <button
        className={`toggle-btn ${config[field] ? 'active' : ''}`}
        onClick={() => handleToggle(field)}
      >
        <IoToggle />
      </button>
    </div>
  );

  // Section navigation tabs
  const sections = [
    { id: 'landing', label: 'Landing Page', icon: IoHomeOutline },
    { id: 'menu', label: 'Menu Page', icon: IoRestaurantOutline },
    { id: 'order', label: 'Order Page', icon: IoCartOutline },
    { id: 'branding', label: 'Branding', icon: IoColorPaletteOutline },
    { id: 'banners', label: 'Banners', icon: IoImagesOutline },
    { id: 'content', label: 'Content', icon: IoDocumentOutline },
  ];

  if (!user || !isRestaurant) {
    return null;
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-state">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="admin-page" data-testid="admin-settings-page">
      {/* Header */}
      <div className="admin-header">
        <div className="header-spacer"></div>
        <h1 className="admin-title">App Settings</h1>
        <button className="logout-btn" onClick={handleLogout} data-testid="admin-logout-btn">
          <IoLogOutOutline />
        </button>
      </div>

      {/* Restaurant Info */}
      <div className="restaurant-card" data-testid="admin-restaurant-info">
        <h2 className="restaurant-name">{user.restaurant_name || 'Restaurant'}</h2>
        <p className="restaurant-email">{user.email}</p>
      </div>

      {/* Section Navigation Tabs */}
      <div className="section-tabs" data-testid="section-tabs">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`section-tab ${activeSection === id ? 'active' : ''}`}
            onClick={() => setActiveSection(id)}
            data-testid={`tab-${id}`}
          >
            <Icon className="tab-icon" />
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </div>

      {/* Landing Page Section */}
      {activeSection === 'landing' && (
        <div className="settings-section" data-testid="section-landing">
          <h3 className="section-title">
            <IoHomeOutline className="section-icon" />
            Landing Page Visibility
          </h3>
          <p className="section-description">Control what elements are visible on the landing page</p>
          <div className="toggle-list">
            <ToggleRow field="showLogo" label="Restaurant Logo" />
            <ToggleRow field="showWelcomeText" label="Welcome Message" />
            <ToggleRow field="showDescription" label="Restaurant Description" />
            <ToggleRow field="showTableNumber" label="Table/Room Number Badge" />
            <ToggleRow field="showCallWaiter" label="Call Waiter Button" />
            <ToggleRow field="showPayBill" label="Pay Bill Button" />
            <ToggleRow field="showSocialIcons" label="Social Media Icons" />
            <ToggleRow field="showAboutUs" label="About Us Link" />
            <ToggleRow field="showFooter" label="Footer Section" />
            <ToggleRow field="showPoweredBy" label="Powered by MyGenie" />
            <ToggleRow field="showLandingCustomerCapture" label="Capture Customer Details (Name & Phone)" />
          </div>
        </div>
      )}

      {/* Menu Page Section */}
      {activeSection === 'menu' && (
        <div className="settings-section" data-testid="section-menu">
          <h3 className="section-title">
            <IoRestaurantOutline className="section-icon" />
            Menu Page Visibility
          </h3>
          <p className="section-description">Control what elements are visible on the menu page</p>
          <div className="toggle-list">
            <ToggleRow field="showPromotionsOnMenu" label="Promotional Banners" />
            <ToggleRow field="showCategories" label="Category Navigation" />
          </div>
        </div>
      )}

      {/* Order Page Section */}
      {activeSection === 'order' && (
        <div className="settings-section" data-testid="section-order">
          <h3 className="section-title">
            <IoCartOutline className="section-icon" />
            Order Page Visibility
          </h3>
          <p className="section-description">Control what elements are visible on the order/checkout page</p>
          <div className="toggle-list">
            <ToggleRow field="showCustomerDetails" label="Customer Details Section" />
            <ToggleRow field="showCustomerName" label="Customer Name Field" />
            <ToggleRow field="showCustomerPhone" label="Customer Phone Field" />
            <ToggleRow field="showCookingInstructions" label="Cooking Instructions" />
            <ToggleRow field="showSpecialInstructions" label="Special Instructions" />
            <ToggleRow field="showPriceBreakdown" label="Price Breakdown" />
            <ToggleRow field="showTableInfo" label="Table Information" />
          </div>
        </div>
      )}

      {/* Branding Section */}
      {activeSection === 'branding' && (
        <div className="settings-section" data-testid="section-branding">
          <h3 className="section-title">
            <IoColorPaletteOutline className="section-icon" />
            Branding & Appearance
          </h3>
          <p className="section-description">Customize your restaurant's look and feel</p>
          
          {/* Logo */}
          <div className="form-group">
            <label className="form-label">Logo</label>
            <div className="image-upload-field">
              <div className="image-url-row">
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://example.com/logo.png"
                  value={config.logoUrl || ''}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  data-testid="input-logoUrl"
                />
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadImage(file, setUploadingLogo);
                    if (url) handleChange('logoUrl', url);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="upload-btn"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  data-testid="upload-logo-btn"
                >
                  <IoCloudUploadOutline />
                  {uploadingLogo ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              <span className="form-hint">Paste a URL or upload an image (max 5MB)</span>
              {config.logoUrl && (
                <div className="image-preview-box" data-testid="logo-preview">
                  <img src={config.logoUrl} alt="Logo preview" className="image-preview-img" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
            </div>
          </div>

          {/* Colors Sub-section */}
          <div className="form-subsection">
            <h4 className="form-subsection-title">Colors</h4>
            
            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Primary Color</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="form-color"
                    value={config.primaryColor || '#61B4E5'}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    data-testid="input-primaryColor"
                  />
                  <input
                    type="text"
                    className="form-input color-text"
                    value={config.primaryColor || '#61B4E5'}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                  />
                </div>
                <span className="form-hint">Buttons, links, accents</span>
              </div>

              <div className="form-group half">
                <label className="form-label">Secondary Color</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="form-color"
                    value={config.secondaryColor || '#4fa3d1'}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    data-testid="input-secondaryColor"
                  />
                  <input
                    type="text"
                    className="form-input color-text"
                    value={config.secondaryColor || '#4fa3d1'}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                  />
                </div>
                <span className="form-hint">Hover states, gradients</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Button Text Color</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="form-color"
                    value={config.buttonTextColor || '#ffffff'}
                    onChange={(e) => handleChange('buttonTextColor', e.target.value)}
                    data-testid="input-buttonTextColor"
                  />
                  <input
                    type="text"
                    className="form-input color-text"
                    value={config.buttonTextColor || '#ffffff'}
                    onChange={(e) => handleChange('buttonTextColor', e.target.value)}
                  />
                </div>
                <span className="form-hint">Text on buttons</span>
              </div>

              <div className="form-group half">
                <label className="form-label">Background Color</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="form-color"
                    value={config.backgroundColor || '#ffffff'}
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    data-testid="input-backgroundColor"
                  />
                  <input
                    type="text"
                    className="form-input color-text"
                    value={config.backgroundColor || '#ffffff'}
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  />
                </div>
                <span className="form-hint">Page background</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Text Color</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="form-color"
                    value={config.textColor || '#333333'}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    data-testid="input-textColor"
                  />
                  <input
                    type="text"
                    className="form-input color-text"
                    value={config.textColor || '#333333'}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                  />
                </div>
                <span className="form-hint">Main body text</span>
              </div>

              <div className="form-group half">
                <label className="form-label">Secondary Text Color</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="form-color"
                    value={config.textSecondaryColor || '#666666'}
                    onChange={(e) => handleChange('textSecondaryColor', e.target.value)}
                    data-testid="input-textSecondaryColor"
                  />
                  <input
                    type="text"
                    className="form-input color-text"
                    value={config.textSecondaryColor || '#666666'}
                    onChange={(e) => handleChange('textSecondaryColor', e.target.value)}
                  />
                </div>
                <span className="form-hint">Descriptions, hints</span>
              </div>
            </div>
          </div>

          {/* Typography Sub-section */}
          <div className="form-subsection">
            <h4 className="form-subsection-title">Typography</h4>
            
            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Heading Font</label>
                <select
                  className="form-select"
                  value={config.fontHeading || 'Big Shoulders'}
                  onChange={(e) => handleChange('fontHeading', e.target.value)}
                  data-testid="select-fontHeading"
                >
                  <option value="Big Shoulders">Big Shoulders</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Lato">Lato</option>
                </select>
                <span className="form-hint">Used for titles & headings</span>
              </div>

              <div className="form-group half">
                <label className="form-label">Body Font</label>
                <select
                  className="form-select"
                  value={config.fontBody || 'Montserrat'}
                  onChange={(e) => handleChange('fontBody', e.target.value)}
                  data-testid="select-fontBody"
                >
                  <option value="Montserrat">Montserrat</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Inter">Inter</option>
                  <option value="Nunito">Nunito</option>
                </select>
                <span className="form-hint">Used for body text</span>
              </div>
            </div>
          </div>

          {/* Style Sub-section */}
          <div className="form-subsection">
            <h4 className="form-subsection-title">Style</h4>
            
            <div className="form-group">
              <label className="form-label">Border Radius</label>
              <div className="radius-options">
                {[
                  { value: 'sharp', label: 'Sharp', preview: '0px' },
                  { value: 'slightly-rounded', label: 'Slight', preview: '4px' },
                  { value: 'rounded', label: 'Rounded', preview: '8px' },
                  { value: 'very-rounded', label: 'Very Rounded', preview: '16px' },
                  { value: 'pill', label: 'Pill', preview: '9999px' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`radius-option ${config.borderRadius === option.value ? 'active' : ''}`}
                    onClick={() => handleChange('borderRadius', option.value)}
                    data-testid={`radius-${option.value}`}
                  >
                    <span 
                      className="radius-preview" 
                      style={{ borderRadius: option.preview }}
                    />
                    <span className="radius-label">{option.label}</span>
                  </button>
                ))}
              </div>
              <span className="form-hint">Corner roundness for buttons and cards</span>
            </div>
          </div>

          {/* Text Content Sub-section */}
          <div className="form-subsection">
            <h4 className="form-subsection-title">Text Content</h4>

            <div className="form-group">
              <label className="form-label">Welcome Message</label>
              <input
                type="text"
                className="form-input"
                placeholder="Welcome to our restaurant!"
                value={config.welcomeMessage || ''}
                onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                data-testid="input-welcomeMessage"
              />
              <span className="form-hint">Main heading shown on landing page</span>
            </div>

            <div className="form-group">
              <label className="form-label">Tagline</label>
              <input
                type="text"
                className="form-input"
                placeholder="Your tagline here"
                value={config.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                data-testid="input-tagline"
              />
              <span className="form-hint">Secondary text shown below welcome message</span>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 98765 43210"
                value={config.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                data-testid="input-phone"
              />
              <span className="form-hint">Overrides POS phone number if set</span>
            </div>

            <div className="form-group">
              <label className="form-label">Instagram URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://instagram.com/yourrestaurant"
                value={config.instagramUrl || ''}
                onChange={(e) => handleChange('instagramUrl', e.target.value)}
                data-testid="input-instagramUrl"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Facebook URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://facebook.com/yourrestaurant"
                value={config.facebookUrl || ''}
                onChange={(e) => handleChange('facebookUrl', e.target.value)}
                data-testid="input-facebookUrl"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Twitter / X URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://x.com/yourrestaurant"
                value={config.twitterUrl || ''}
                onChange={(e) => handleChange('twitterUrl', e.target.value)}
                data-testid="input-twitterUrl"
              />
            </div>

            <div className="form-group">
              <label className="form-label">YouTube URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://youtube.com/@yourrestaurant"
                value={config.youtubeUrl || ''}
                onChange={(e) => handleChange('youtubeUrl', e.target.value)}
                data-testid="input-youtubeUrl"
              />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 98765 43210"
                value={config.whatsappNumber || ''}
                onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                data-testid="input-whatsappNumber"
              />
              <span className="form-hint">Used for WhatsApp chat link on the landing page</span>
            </div>
          </div>
        </div>
      )}

      {/* Banners Section */}
      {activeSection === 'banners' && (
        <div className="settings-section" data-testid="section-banners">
          <h3 className="section-title">
            <IoImagesOutline className="section-icon" />
            Promotional Banners
          </h3>
          <p className="section-description">Manage promotional banners shown on the landing page</p>
          
          {/* Existing Banners */}
          <div className="banners-list">
            {config.banners && config.banners.length > 0 ? (
              config.banners.map((banner, index) => (
                <div key={banner.id} className={`banner-card ${editingBannerId === banner.id ? 'editing' : ''}`} data-testid={`banner-${banner.id}`}>
                  <span className="banner-order">#{index + 1}</span>
                  <img src={banner.bannerImage} alt={banner.bannerTitle} className="banner-preview" />
                  <div className="banner-info">
                    <span className="banner-title">{banner.bannerTitle}</span>
                    <span className={`banner-status ${banner.bannerEnabled ? 'active' : 'inactive'}`}>
                      {banner.bannerEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="banner-actions">
                    <button
                      className="banner-edit-btn"
                      onClick={() => startEditBanner(banner)}
                      data-testid={`edit-banner-${banner.id}`}
                    >
                      <IoCreateOutline />
                    </button>
                    <button
                      className="banner-delete-btn"
                      onClick={() => deleteBanner(banner.id)}
                      data-testid={`delete-banner-${banner.id}`}
                    >
                      <IoTrashOutline />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-banners">No banners added yet. Add your first promotional banner below.</p>
            )}
          </div>

          {/* Add/Edit Banner Form */}
          <div className="add-banner-form">
            <div className="form-subtitle-row">
              <h4 className="form-subtitle">{editingBannerId ? 'Edit Banner' : 'Add New Banner'}</h4>
              {editingBannerId && (
                <button className="cancel-edit-btn" onClick={cancelEditBanner} data-testid="cancel-edit-banner-btn">
                  <IoCloseOutline /> Cancel
                </button>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Banner Image *</label>
              <div className="image-upload-field">
                <div className="image-url-row">
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/banner.jpg"
                    value={newBanner.bannerImage}
                    onChange={(e) => {
                      setNewBanner(prev => ({ ...prev, bannerImage: e.target.value }));
                      validateImageDimensions(e.target.value);
                    }}
                    onBlur={(e) => validateImageDimensions(e.target.value)}
                    data-testid="input-newBannerImage"
                  />
                  <input
                    type="file"
                    ref={bannerInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadImage(file, setUploadingBanner);
                      if (url) {
                        setNewBanner(prev => ({ ...prev, bannerImage: url }));
                        validateImageDimensions(url);
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    className="upload-btn"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    data-testid="upload-banner-btn"
                  >
                    <IoCloudUploadOutline />
                    {uploadingBanner ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                <span className="form-hint">Recommended: 1200 x 675px (16:9 ratio). Max 5MB.</span>
                {bannerSizeWarning && (
                  <span className="size-warning" data-testid="banner-size-warning">{bannerSizeWarning}</span>
                )}
                {newBanner.bannerImage && (
                  <div className="image-preview-box" data-testid="banner-image-preview">
                    <img src={newBanner.bannerImage} alt="Banner preview" className="image-preview-img banner-preview-large" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Banner title (e.g., Happy Hour 20% Off)"
                value={newBanner.bannerTitle}
                onChange={(e) => setNewBanner(prev => ({ ...prev, bannerTitle: e.target.value }))}
                data-testid="input-newBannerTitle"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Link URL (optional)</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com/promo"
                value={newBanner.bannerLink}
                onChange={(e) => setNewBanner(prev => ({ ...prev, bannerLink: e.target.value }))}
                data-testid="input-newBannerLink"
              />
            </div>
            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Display Order</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  min="0"
                  value={newBanner.bannerOrder}
                  onChange={(e) => setNewBanner(prev => ({ ...prev, bannerOrder: parseInt(e.target.value) || 0 }))}
                  data-testid="input-newBannerOrder"
                />
              </div>
              <div className="form-group half">
                <label className="form-label">Status</label>
                <button
                  type="button"
                  className={`status-toggle-btn ${newBanner.bannerEnabled ? 'active' : ''}`}
                  onClick={() => setNewBanner(prev => ({ ...prev, bannerEnabled: !prev.bannerEnabled }))}
                  data-testid="toggle-newBannerEnabled"
                >
                  {newBanner.bannerEnabled ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            <button
              className={`add-banner-btn ${editingBannerId ? 'update-mode' : ''}`}
              onClick={editingBannerId ? updateBanner : addBanner}
              data-testid={editingBannerId ? 'update-banner-btn' : 'add-banner-btn'}
            >
              {editingBannerId ? <><IoSaveOutline /> Update Banner</> : <><IoAddOutline /> Add Banner</>}
            </button>
          </div>
        </div>
      )}

      {/* Content Section */}
      {activeSection === 'content' && (
        <ContentTab config={config} setConfig={setConfig} token={token} uploadImage={uploadImage} />
      )}

      {/* Save Button */}
      <div className="save-section">
        <button
          className="save-btn"
          onClick={saveConfig}
          disabled={saving}
          data-testid="save-settings-btn"
        >
          <IoSaveOutline />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
