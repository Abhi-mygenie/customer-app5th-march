// CR-2026-10-11-009: Coupon discovery list — browse and tap to apply
// CR-2026-10-12-002: engine-path fields (requires_cart_validation, time_window, title, recommended), design spec states 1–4
import React from 'react';
import { Clock, Flame, Sparkles } from 'lucide-react';
import './CouponDiscoveryList.css';

// "17:00" → "5 PM", "17:30" → "5:30 PM"
export const fmt12 = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
};

// "5 PM"–"7 PM" → "5–7 PM"; "11 AM"–"2 PM" → "11 AM–2 PM"
export const windowLabel = (tw) => {
  const start = fmt12(tw?.start_time);
  const end = fmt12(tw?.end_time);
  if (!start || !end) return '';
  const [sH, sS] = start.split(' ');
  const [, eS] = end.split(' ');
  const range = sS === eS ? `${sH}–${end}` : `${start}–${end}`;
  const days = Array.isArray(tw?.valid_days) && tw.valid_days.length && tw.valid_days.length < 7
    ? ` · ${tw.valid_days.map(d => String(d).slice(0, 3)).join(', ')}`
    : '';
  return `Valid ${range}${days}`;
};

const formatDiscount = (c) => {
  if (c.requires_cart_validation) return null;
  if (c.offer_type && c.offer_type !== 'simple') return null; // BUG-2026-10-12-001 safety net (legacy path)
  if (c.expected_discount != null) return `₹${Number(c.expected_discount).toFixed(0)} off`;
  if (c.discount_type === 'percentage') return `${c.discount_value}% off`;
  if (c.discount_type === 'flat' && c.discount_value > 0) return `₹${c.discount_value} off`;
  return null;
};

const CouponCard = ({ c, onTap, isAuthenticated, isBest }) => {
  const outOfWindow = c.time_window?.configured === true && c.time_window?.within_window_now === false;
  const mystery = !outOfWindow && (c.requires_cart_validation || (c.offer_type && c.offer_type !== 'simple'));
  const discount = outOfWindow ? null : formatDiscount(c);
  const title = c.title || c.display_title || c.code;
  const kind = outOfWindow ? 'disabled' : mystery ? 'mystery' : 'normal';
  const cls = `cdl-card${isBest && !outOfWindow ? ' cdl-card--best' : ''}${outOfWindow ? ' cdl-card--off' : ''}`;
  const Tag = outOfWindow ? 'div' : 'button';
  return (
    <Tag className={cls} data-testid={`coupon-card-${kind}-${c.code}`}
         aria-disabled={outOfWindow || undefined}
         onClick={outOfWindow ? undefined : () => onTap(c.code)}>
      {isBest && !outOfWindow && (
        <span className="cdl-badge" data-testid="coupon-best-offer-badge"><Flame size={8} />Best offer</span>
      )}
      <span className="cdl-title">{title}</span>
      <span className="cdl-meta">
        {outOfWindow && <span className="cdl-chip cdl-chip--time"><Clock size={10} />{windowLabel(c.time_window)}</span>}
        {mystery && <span className="cdl-chip cdl-chip--mystery"><Sparkles size={10} />Tap to see discount</span>}
        {discount && <span className="cdl-chip">{discount}</span>}
        {!outOfWindow && !mystery && c.min_order_value > 0 && <span className="cdl-hint">Min ₹{c.min_order_value}</span>}
        {!outOfWindow && !mystery && !(c.min_order_value > 0) && isAuthenticated && c.my_usage_count != null && (
          <span className="cdl-hint">Used {c.my_usage_count}×</span>
        )}
      </span>
      <span className="cdl-code">{c.code}</span>
    </Tag>
  );
};

const CouponDiscoveryList = ({ coupons = [], loading = false, onTap, isAuthenticated = false, recommendedCode = null }) => {
  if (loading) {
    return (
      <div className="cdl-strip" data-testid="coupon-list-loading">
        {[1, 2].map(i => <div key={i} className="cdl-skel" />)}
      </div>
    );
  }
  if (!coupons.length) return null;
  return (
    <div className="cdl-wrap" data-testid="coupon-discovery-list">
      <div className="cdl-label">Available coupons</div>
      <div className="cdl-strip" data-testid="coupon-strip-container">
        {coupons.map(c => (
          <CouponCard key={c.code} c={c} onTap={onTap} isAuthenticated={isAuthenticated} isBest={c.code === recommendedCode} />
        ))}
      </div>
    </div>
  );
};

export default CouponDiscoveryList;
