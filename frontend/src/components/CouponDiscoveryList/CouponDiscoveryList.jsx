// CR-2026-10-11-009: Coupon discovery list — browse and tap to apply
import React from 'react';

const formatDiscount = (coupon) => {
  if (coupon.requires_cart_validation) return null;
  if (coupon.expected_discount != null) return `₹${coupon.expected_discount.toFixed(0)} off`;
  if (coupon.discount_type === 'percentage') return `${coupon.discount_value}% off`;
  if (coupon.discount_type === 'flat') return `₹${coupon.discount_value} off`;
  return null;
};

const CouponDiscoveryList = ({ coupons = [], loading = false, onTap, isAuthenticated = false }) => {
  if (loading) {
    return (
      <div style={{ padding: '8px 0 4px', display: 'flex', gap: 8, overflowX: 'auto' }}
           data-testid="coupon-list-loading">
        {[1, 2].map(i => (
          <div key={i} style={{ minWidth: 160, height: 64, borderRadius: 8,
                                background: '#F3F4F6', flexShrink: 0 }} />
        ))}
      </div>
    );
  }
  if (!coupons.length) return null;
  return (
    <div style={{ padding: '6px 0 2px' }} data-testid="coupon-discovery-list">
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, paddingLeft: 2 }}>
        Available coupons
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {coupons.map((c) => {
          const discount = formatDiscount(c);
          return (
            <button
              key={c.code}
              data-testid={`coupon-list-item-${c.code}`}
              onClick={() => onTap(c.code)}
              style={{
                minWidth: 148, flexShrink: 0, border: '1.5px dashed #E5800A',
                borderRadius: 8, padding: '8px 10px', background: '#FFFBF5',
                textAlign: 'left', cursor: 'pointer', display: 'flex',
                flexDirection: 'column', gap: 3,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1F2937',
                             whiteSpace: 'nowrap', overflow: 'hidden',
                             textOverflow: 'ellipsis', maxWidth: 128 }}>
                {c.display_title || c.title}
              </span>
              {discount && (
                <span style={{ fontSize: 11, color: '#E5800A', fontWeight: 600 }}>
                  {discount}
                </span>
              )}
              {c.requires_cart_validation && (
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>Tap to see discount</span>
              )}
              {c.min_order_value > 0 && (
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                  Min ₹{c.min_order_value}
                </span>
              )}
              {isAuthenticated && c.my_usage_count != null && (
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                  Used {c.my_usage_count}×
                </span>
              )}
              <span style={{ fontSize: 10, color: '#D1D5DB', marginTop: 1 }}>
                {c.code}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CouponDiscoveryList;
