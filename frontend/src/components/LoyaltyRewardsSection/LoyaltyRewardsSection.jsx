import React from 'react';
import { IoGiftOutline } from "react-icons/io5";

/**
 * LoyaltyRewardsSection — extracted from ReviewOrder.jsx (CA-008 Phase 1)
 * Consolidates 3 separate loyalty JSX blocks into one component:
 * 1. Identified customer rewards info (logged in or looked up)
 * 2. No loyalty settings fallback
 * 3. Guest prompt (no phone entered)
 */
const LoyaltyRewardsSection = ({
  configShowLoyaltyPoints,
  restaurant,
  isAuthenticated,
  user,
  lookedUpCustomer,
  loyaltySettings,
  totalToPay, // kept for prop compatibility; no longer used for earn maths (CR-2026-10-12-003)
  projectedPointsEarned, // CR-2026-10-09-003 · CR-2026-10-12-003: CRM-only; null = no number shown
  earnBasePreview = null, // CR-2026-10-12-003: CRM earn_base_preview (₹ the % was applied to)
}) => {
  if (!configShowLoyaltyPoints || restaurant?.is_loyalty !== 'Yes') return null;

  const isIdentified = isAuthenticated || lookedUpCustomer;
  const isGuest = !isAuthenticated && !lookedUpCustomer;

  // Variant 1: Identified customer WITH loyalty settings
  if (isIdentified && loyaltySettings) {
    const custTier = isAuthenticated ? (user?.tier || 'Bronze') : (lookedUpCustomer?.tier || 'Bronze');
    const tier = custTier.toLowerCase();
    // CR-2026-10-12-003 C4: CRM is the only source — no client-side estimate (post-tax total was wrong)
    const minOrderValue = loyaltySettings.min_order_value || 100;
    const hasPreview = projectedPointsEarned !== null && projectedPointsEarned !== undefined;
    const pointsToEarn = hasPreview ? projectedPointsEarned : 0;
    const belowMin = hasPreview && pointsToEarn === 0 && earnBasePreview !== null && earnBasePreview < minOrderValue;
    // CR-2026-10-03-004 Part B: G1 — per-tier redemption value; never fall back to flat redemption_value
    const tierKey = `${tier}_redemption_value`;
    const redemptionValue = loyaltySettings[tierKey] || loyaltySettings.bronze_redemption_value || 1.0;
    const pointsWorth = (pointsToEarn * redemptionValue).toFixed(0);
    const isNewCustomer = lookedUpCustomer && !lookedUpCustomer.found;
    const firstVisitBonus = isNewCustomer && loyaltySettings.first_visit_bonus_enabled ? loyaltySettings.first_visit_bonus_points : 0;

    return (
      <div className="review-order-user-info" data-testid="logged-in-user-info">
        <div className="user-info-content">
          <IoGiftOutline className="user-info-icon" />
          <div className="user-info-text">
            {!hasPreview ? (
              <>
                <span className="user-info-name">Earn rewards on this order!</span>
                <span className="user-info-points">Points are calculated on food value after discounts</span>
              </>
            ) : belowMin ? (
              <>
                <span className="user-info-name">Almost there!</span>
                <span className="user-info-points">
                  Add ₹{(minOrderValue - earnBasePreview).toFixed(0)} more to earn points
                </span>
              </>
            ) : (
              <>
                <span className="user-info-name">
                  You will earn {pointsToEarn} points on this order!
                </span>
                <span className="user-info-points">
                  Worth ₹{pointsWorth}{firstVisitBonus > 0 ? ` + ${firstVisitBonus} bonus points for first visit` : ''}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Variant 2: Identified customer WITHOUT loyalty settings
  if (isIdentified && !loyaltySettings) {
    return (
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
    );
  }

  // Variant 3: Guest (no phone entered, not logged in) WITH loyalty settings
  if (isGuest && loyaltySettings) {
    // CR-2026-10-12-003 C4: anonymous diners see a non-numeric prompt — no client-side estimate
    return (
      <div className="review-order-login-prompt" data-testid="login-rewards-prompt">
        <div className="login-prompt-content">
          <IoGiftOutline className="login-prompt-icon" />
          <div className="login-prompt-text">
            <span className="login-prompt-title">Earn rewards on this order!</span>
            <span className="login-prompt-subtitle">Enter your phone number above to see your points</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LoyaltyRewardsSection;
