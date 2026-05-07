import React from 'react';
import { IoFlameOutline, IoNutritionOutline, IoWarningOutline, IoInformationCircleOutline } from 'react-icons/io5';
import QuantitySelector from '../QuantitySelector/QuantitySelector';
import { isItemAvailable } from '../../utils/itemAvailability';
import './MenuItem.css';
import logger from '../../utils/logger';

const MenuItem = ({
  item,
  isExpanded,
  descriptionLimit,
  onToggleDescription,
  getAllergenIcon,
  quantity = 0,
  isInCart = false,
  onAddToCart,
  onIncrement,
  onDecrement,
  currentTimeInSeconds = 0,
  isOnlineOrderEnabled = true,
  categoryTiming = null,
  itemTiming = null,
}) => {
  const shouldTruncate = item.description && item.description.length > descriptionLimit;
  const displayDescription = isExpanded || !shouldTruncate
    ? item.description
    : `${item.description.substring(0, descriptionLimit)}...`;

  // Determine if we have a valid REAL image (not a POS-side default placeholder).
  // The POS API returns a hard-coded default URL for items without real photos:
  //   https://preprod.mygenie.online/public/assets/admin/img/.../food-default-image.png
  // These should be treated as "no image" so we render the compact card.
  const isPosDefaultImage = (url) =>
    typeof url === 'string' &&
    /\/admin\/img\/.*food-default-image/i.test(url);
  const hasImage = item.image
    && typeof item.image === 'string'
    && item.image.trim() !== ''
    && !isPosDefaultImage(item.image);

  // Check if item is customizable (has variations or add_ons)
  const isCustomizable = (item.variations && item.variations.length > 0) ||
    (item.add_ons && item.add_ons.length > 0);

  // Check if item is available based on live_web, admin timings, and POS time range
  const isAvailable = isItemAvailable(item, currentTimeInSeconds, { categoryTiming, itemTiming });

  const handleImageError = (e) => {
    // Hide the failed image
    e.target.style.display = 'none';
    // Show the default placeholder if it exists
    const placeholder = e.target.parentElement?.querySelector('.item-image-placeholder');
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  };

  return (
    <div className={`menu-item ${!hasImage ? 'menu-item--no-image' : ''}`}>
      <div className="item-content">
        {/* Veg/Non-Veg/Egg Indicator */}
        <span className={`veg-label ${item.isEgg ? 'egg' : item.isVeg ? 'veg' : 'non-veg'}`}>
          <span className="veg-dot"></span>
        </span>

        {/* Item Name */}
        <h3 className="item-name">{item.name}</h3>

        {/* Item Price */}
        <div className="item-price">₹{item.price}</div>

        {/* Allergen Icons */}
        {/* {item.allergens && item.allergens.length > 0 && (
          <div className="item-allergens">
            {item.allergens.map((allergen, idx) => (
              <span key={idx} className="allergen-icon-wrapper">
                {getAllergenIcon(allergen)}
              </span>
            ))}
          </div>
        )} */}


        {/*Calories */}
        {item.kcal && parseFloat(item.kcal) > 0 && (
          <div className="item-allergens">
            <span className="allergen-icon-wrapper">
              <IoFlameOutline className="item-info-icon" />
            </span>
            <span className="kcal-name">
              {item.kcal} kcal
            </span>
          </div>
        )}

        {/*Portion */}
        {item.portion && parseFloat(item.portion) > 0 && (
          <div className="item-allergens">
            <span className="allergen-icon-wrapper">
              <IoNutritionOutline className="item-info-icon" />
            </span>
            <span className="portion-name">
              {item.portion}
            </span>
          </div>
        )}

        {item.allergens && item.allergens.length > 0 && (
          <div className="item-allergens">
            <span className="allergen-icon-wrapper">
              <IoWarningOutline className="item-info-icon" />
            </span>
            <span className="allergen-name">
              Contains: {item.allergens
                .map((allergen) => {
                  // Capitalize first letter of each allergen
                  return allergen.charAt(0).toUpperCase() + allergen.slice(1).toLowerCase();
                })
                .join(', ')}
            </span>
          </div>
        )}

        {/* Item Description with Read More */}
        {displayDescription && (
          <div className="item-allergens">
          <span className="allergen-icon-wrapper">
            <IoInformationCircleOutline className="item-info-icon" />
          </span>
          <div className="item-description-wrapper">
            <p className="item-description">
              {displayDescription}
              {shouldTruncate && (
                <button
                  className="read-more-btn"
                  onClick={() => onToggleDescription(item.id)}
                >
                  {isExpanded ? 'Read Less' : 'Read More'}
                </button>
              )}
            </p>
          </div>
        </div>
        )}
      </div>

      {/* Image Box Container with Customisable Text — rendered ONLY when item has a real image */}
      {hasImage && (
        <div className="item-image-container">
          {/* Image Box with ADD Button */}
          <div className="item-image-box">
            <img
              src={item.image}
              alt={item.name}
              className="item-image"
              loading="lazy"
              decoding="async"
              onError={handleImageError}
            />
            {/* Hidden default placeholder for fallback (Bucket 7: image fails to load) */}
            <div className="item-image-placeholder" style={{ display: 'none' }}>
              <img
                src={
                  item.isEgg
                    ? '/assets/images/E_Food_Img.svg'
                    : item.isVeg
                      ? '/assets/images/V_FOOD_IMG.svg'
                      : '/assets/images/NV_FOOD_IMG.svg'
                }
                alt={
                  item.isEgg
                    ? 'Egg Food'
                    : item.isVeg
                      ? 'Veg Food'
                      : 'Non-Veg Food'
                }
                className="default-food-icon"
              />
            </div>

            {/* Show Quantity Selector if item is in cart, otherwise show ADD button (only if available and online order enabled) */}
            {isInCart ? (
              <QuantitySelector
                quantity={quantity}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
              />
            ) : isAvailable && isOnlineOrderEnabled ? (
              <button className="add-btn" onClick={onAddToCart}>
                ADD
              </button>
            ) : null}
          </div>

          {/* Customisable Indicator */}
          {isCustomizable && (
            <div className="customisable-indicator">
              Customisable
            </div>
          )}
        </div>
      )}

      {/* Compact action area — rendered ONLY when no image is present.
          Same handlers / same modal flow as image-mode; just laid out inline-right. */}
      {!hasImage && (
        <div className="item-action-area">
          {isInCart ? (
            <QuantitySelector
              quantity={quantity}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
          ) : isAvailable && isOnlineOrderEnabled ? (
            <button className="add-btn add-btn--inline" onClick={onAddToCart}>
              ADD
            </button>
          ) : null}
          {isCustomizable && (
            <div className="customisable-indicator customisable-indicator--inline">
              Customisable
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MenuItem;
