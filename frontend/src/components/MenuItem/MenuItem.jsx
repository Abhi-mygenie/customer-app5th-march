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

  // Determine if we have a valid image
  const hasImage = item.image && typeof item.image === 'string' && item.image.trim() !== '';

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
    <div className="menu-item">
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

      {/* Image Box Container with Customisable Text */}
      <div className="item-image-container">
        {/* Image Box with ADD Button */}
        <div className="item-image-box">
          {/* Show actual image if it exists and is not empty */}
          {hasImage ? (
            <>
              <img
                src={item.image}
                alt={item.name}
                className="item-image"
                onError={handleImageError}
              />
              {/* Hidden default placeholder for fallback */}
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
            </>
          ) : (
            /* Default Image for when no food image */
            <div className="item-image-placeholder">
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
                onError={(e) => {
                  // Fallback if default image also fails to load
                  logger.error('menu', 'Default image failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

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
    </div>
  );
};

export default MenuItem;
