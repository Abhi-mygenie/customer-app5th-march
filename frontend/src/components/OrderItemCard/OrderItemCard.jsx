import React from 'react';
// import { useNavigate } from 'react-router-dom';
import QuantitySelector from '../QuantitySelector/QuantitySelector';
import { useCart } from '../../context/CartContext';
// import { useRestaurantId } from '../../utils/useRestaurantId';
import { MdModeEditOutline } from "react-icons/md";
import CustomizeItemModal from '../CustomizeItemModal/CustomizeItemModal';
import CookingInstructionsModal from '../CookingInstructionsModal/CookingInstructionsModal';
import './OrderItemCard.css';

const OrderItemCard = ({ cartItem, showCookingInstructions = true }) => {
  const { updateQuantity, addToCart, updateCookingInstructions } = useCart();
  // const { restaurantId } = useRestaurantId();
  // const navigate = useNavigate();
  const [customizeModalOpen, setCustomizeModalOpen] = React.useState(false);
  const [cookingInstructionsModalOpen, setCookingInstructionsModalOpen] = React.useState(false);

  // Calculate item price (base + variations + addons)
  const getItemPrice = () => {
    const basePrice = parseFloat(cartItem.item.price) || 0;
    
    // Calculate variations total
    let variationsTotal = 0;
    if (cartItem.variations && cartItem.variations.length > 0) {
      cartItem.variations.forEach((variation) => {
        const optionPrice = parseFloat(variation.optionPrice) || 0;
        variationsTotal += optionPrice;
      });
    }
    
    // Calculate addons total
    let addonsTotal = 0;
    if (cartItem.add_ons && cartItem.add_ons.length > 0) {
      cartItem.add_ons.forEach((addon) => {
        const addonPrice = parseFloat(addon.price) || 0;
        const addonQuantity = addon.quantity || 0;
        addonsTotal += addonPrice * addonQuantity;
      });
    }
    
    const itemSubtotal = basePrice + variationsTotal + addonsTotal;
    return itemSubtotal ;
  };

  // Format variations display
  const formatVariations = () => {
    if (!cartItem.variations || cartItem.variations.length === 0) return null;
    
    // Get variation names from the original item structure
    const formatted = [];
    
    // Get all selected variation labels
    cartItem.variations.forEach((selectedVariation) => {
      formatted.push(selectedVariation.label);
    });
    
    if (formatted.length === 0) return null;
    
    // Try to get variation name from item structure
    let variationName = 'CHOICE OF';
    if (cartItem.item.variations && cartItem.item.variations.length > 0) {
      // Get the first variation's name
      const firstVariation = cartItem.item.variations[0];
      variationName = firstVariation.name || firstVariation.variation_name || 'CHOICE OF';
    }
    
    // Return object with label and value
    return {
      label: 'Variants : ',
      value: `${variationName} (${formatted.join(', ')})`
    };
  };

  // Format addons display
  const formatAddons = () => {
    if (!cartItem.add_ons || cartItem.add_ons.length === 0) return null;
    
    const addonNames = cartItem.add_ons
      .filter(addon => addon.quantity > 0)
      .map(addon => `${addon.name} x${addon.quantity}`)
      .join(', ');
    
    // Return object with label and value
    return {
      label: 'Addons : ',
      value: addonNames
    };
  };

  // Check if item has variations or addons
  // const hasCustomizations = () => {
  //   const hasVariations = cartItem.item.variations && cartItem.item.variations.length > 0;
  //   const hasAddons = cartItem.item.add_ons && cartItem.item.add_ons.length > 0;
  //   return hasVariations || hasAddons;
  // };

  // Handle quantity change
  const handleQuantityChange = (delta) => {
    const newQuantity = cartItem.quantity + delta;
    if (newQuantity <= 0) {
      // Remove from cart handled by updateQuantity
      updateQuantity(cartItem.cartId, 0);
    } else {
      updateQuantity(cartItem.cartId, newQuantity);
    }
  };

  // Handle customize button click
  // const handleCustomizeClick = () => {
  //   setCustomizeModalOpen(true);
  // };

  // Handle add to cart from customize modal
  const handleAddToCartFromModal = (item, variations, add_ons) => {
    addToCart(item, variations, add_ons);
  };

  // Close customize modal
  const handleCloseCustomizeModal = () => {
    setCustomizeModalOpen(false);
  };

  // Handle cooking instructions click
  const handleCookingInstructionsClick = () => {
    setCookingInstructionsModalOpen(true);
  };

  // Handle close cooking instructions modal
  const handleCloseCookingInstructionsModal = () => {
    setCookingInstructionsModalOpen(false);
  };

  // Handle save cooking instructions
  const handleSaveCookingInstructions = (cartId, instructions) => {
    updateCookingInstructions(cartId, instructions);
  };

  // Get cooking instructions display text
  const getCookingInstructionsDisplay = () => {
    if (cartItem.cookingInstructions && cartItem.cookingInstructions.trim().length > 0) {
      const instructions = cartItem.cookingInstructions.trim();
      // Truncate to 20 characters
      if (instructions.length > 20) {
        return instructions.substring(0, 20) + '...';
      }
      return instructions;
    }
    return 'Cooking Instructions';
  };

  const variationsText = formatVariations();
  const addonsText = formatAddons();
  const itemPrice = getItemPrice();
  const cookingInstructionsText = getCookingInstructionsDisplay();
  const hasCookingInstructions = cartItem.cookingInstructions && cartItem.cookingInstructions.trim().length > 0;

  return (
    <>
      <div className="order-item-card">
        <div className="order-item-left">
          <h3 className="order-item-name">{cartItem.item.name}</h3>
          
          {variationsText && (
            <div className="order-item-variants">
              <span className="order-item-label">{variationsText.label}</span>
              <span className="order-item-value">{variationsText.value}</span>
            </div>
          )}
          
          {addonsText && (
            <div className="order-item-addons">
              <span className="order-item-label">{addonsText.label}</span>
              <span className="order-item-value">{addonsText.value}</span>
            </div>
          )}
          
          {showCookingInstructions && (
          <div 
            className="order-item-cooking-instructions"
            onClick={handleCookingInstructionsClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCookingInstructionsClick();
              }
            }}
          >
            <span className="cooking-instructions-icon"><MdModeEditOutline /></span>
            <span className={`cooking-instructions-text ${hasCookingInstructions ? 'cooking-instructions-text-filled' : ''}`}>
              {cookingInstructionsText}
            </span>
          </div>
          )}
        </div>
        
        <div className="order-item-right">
          <div className="order-item-quantity">
            <QuantitySelector
              quantity={cartItem.quantity}
              onIncrement={() => handleQuantityChange(1)}
              onDecrement={() => handleQuantityChange(-1)}
            />
          </div>
          
          {/* {hasCustomizations() && (
            <button 
              className="order-item-customize-btn"
              onClick={handleCustomizeClick}
            >
              Customize
            </button>
          )} */}
          
          <div className="order-item-price">₹{itemPrice.toFixed(2)}</div>
        </div>
      </div>
      
      {customizeModalOpen && (
        <CustomizeItemModal
          isOpen={customizeModalOpen}
          onClose={handleCloseCustomizeModal}
          item={cartItem.item}
          onAddToCart={handleAddToCartFromModal}
        />
      )}

      {cookingInstructionsModalOpen && (
        <CookingInstructionsModal
          isOpen={cookingInstructionsModalOpen}
          onClose={handleCloseCookingInstructionsModal}
          cartItem={cartItem}
          onSave={handleSaveCookingInstructions}
        />
      )}
    </>
  );
};

export default OrderItemCard;
