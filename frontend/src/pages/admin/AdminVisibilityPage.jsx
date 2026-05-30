import React from 'react';
import { useAdminConfig } from '../../context/AdminConfigContext';
import { IoEyeOutline } from 'react-icons/io5';
import './AdminPages.css';

const AdminVisibilityPage = () => {
  const { config, toggleField, restaurantFlags, loading } = useAdminConfig();

  if (loading) {
    return <div className="admin-loading">Loading visibility settings...</div>;
  }

  const ToggleSwitch = ({ field, label }) => (
    <div className="admin-toggle-item">
      <span className="admin-toggle-label">{label}</span>
      <button
        className={`admin-toggle-switch ${config[field] ? 'active' : ''}`}
        onClick={() => toggleField(field)}
        data-testid={`toggle-${field}`}
      />
    </div>
  );

  return (
    <div className="admin-page" data-testid="admin-visibility-page">
      <h1 className="admin-page-title">
        <IoEyeOutline /> Visibility Settings
      </h1>
      <p className="admin-page-description">
        Control which elements are visible on different pages
      </p>

      {/* Landing Page Visibility */}
      <div className="admin-section">
        <h2 className="admin-section-title">Landing Page</h2>
        <div className="admin-toggle-grid">
          <ToggleSwitch field="showLogo" label="Show Logo" />
          <ToggleSwitch field="showWelcomeText" label="Show Welcome Text" />
          <ToggleSwitch field="showDescription" label="Show Description" />
          <ToggleSwitch field="showSocialIcons" label="Show Social Icons" />
          <ToggleSwitch field="showTableNumber" label="Show Table Number" />
          <ToggleSwitch field="showPoweredBy" label="Show Powered By" />
          <ToggleSwitch field="showHamburgerMenu" label="Show Hamburger Menu" />
          <ToggleSwitch field="showLoginButton" label="Show Login Button" />
          <ToggleSwitch field="showLandingCallWaiter" label="Show Call Waiter" />
          <ToggleSwitch field="showLandingPayBill" label="Show Pay Bill" />
          <ToggleSwitch field="showLandingCustomerCapture" label="Capture Customer Details" />
          <ToggleSwitch field="showFooter" label="Show Footer" />
        </div>
      </div>

      {/* Menu Page Visibility */}
      <div className="admin-section">
        <h2 className="admin-section-title">Menu Page</h2>
        <div className="admin-toggle-grid">
          <ToggleSwitch field="showPromotionsOnMenu" label="Show Promotions" />
          <ToggleSwitch field="showCategories" label="Show Categories" />
          <ToggleSwitch field="showMenuFab" label="Show Menu FAB Button" />
        </div>
      </div>

      {/* Review Order Visibility */}
      <div className="admin-section">
        <h2 className="admin-section-title">Review Order Page</h2>
        <div className="admin-toggle-grid">
          <ToggleSwitch field="showCustomerDetails" label="Show Customer Details" />
          <ToggleSwitch field="showCustomerName" label="Show Customer Name" />
          <ToggleSwitch field="showCustomerPhone" label="Show Customer Phone" />
          <ToggleSwitch field="showCookingInstructions" label="Show Cooking Instructions" />
          <ToggleSwitch field="showSpecialInstructions" label="Show Special Instructions" />
          <ToggleSwitch field="showPriceBreakdown" label="Show Price Breakdown" />
          <ToggleSwitch field="showTableInfo" label="Show Table Info" />
          {restaurantFlags.is_loyalty === 'Yes' && (
            <ToggleSwitch field="showLoyaltyPoints" label="Show Loyalty Points" />
          )}
          {restaurantFlags.is_coupon === 'Yes' && (
            <ToggleSwitch field="showCouponCode" label="Show Coupon Code" />
          )}
          <ToggleSwitch field="showWallet" label="Show Wallet" />
        </div>
      </div>

      {/* Order Status Visibility */}
      <div className="admin-section">
        <h2 className="admin-section-title">Order Status Page</h2>
        <div className="admin-toggle-grid">
          <ToggleSwitch field="showFoodStatus" label="Show Food Status" />
          <ToggleSwitch field="showOrderStatusTracker" label="Show Order Tracker" />
          <ToggleSwitch field="showCallWaiter" label="Show Call Waiter" />
          <ToggleSwitch field="showPayBill" label="Show Pay Bill" />
        </div>
      </div>

      {/* Extra Info Section */}
      <div className="admin-section">
        <h2 className="admin-section-title">Extra Info Section</h2>
        <div className="admin-toggle-grid">
          <ToggleSwitch field="showExtraInfo" label="Show Extra Info" />
        </div>
      </div>

      {/* Skip OTP / Password-Setup Screen — CR-2026-05-30-001 Item 1 */}
      <div className="admin-section" data-testid="admin-section-skip-otp">
        <h2 className="admin-section-title">Skip OTP / Password Setup</h2>
        <p className="admin-section-description">
          When ON, customers for the matching order type skip the password / OTP screen entirely
          and go straight to the menu (CRM identity is attached silently). Default OFF.
        </p>
        <div className="admin-toggle-grid">
          <ToggleSwitch field="skipOtpDineIn" label="Skip OTP for Dine-In Orders" />
          <ToggleSwitch field="skipOtpTakeaway" label="Skip OTP for Takeaway Orders" />
          <ToggleSwitch field="skipOtpDelivery" label="Skip OTP for Delivery Orders" />
          <ToggleSwitch field="skipOtpDineInWithTable" label="Skip OTP for Dine-In with Table Number" />
          <ToggleSwitch field="skipOtpWalkIn" label="Skip OTP for Walk-In Dine Orders" />
          <ToggleSwitch field="skipOtpRoomOrders" label="Skip OTP for Room Orders" />
        </div>
      </div>
    </div>
  );
};

export default AdminVisibilityPage;
