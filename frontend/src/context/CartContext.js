import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const CartContext = createContext();

// Cart expiration time: 3 hours (in milliseconds)
const CART_EXPIRY_TIME = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Get cart key for localStorage based on restaurant ID
 */
const getCartKey = (restaurantId) => `cart_${restaurantId}`;

/**
 * Load cart from localStorage for a specific restaurant
 */
const loadCartFromStorage = (restaurantId) => {
  try {
    const cartKey = getCartKey(restaurantId);
    const stored = localStorage.getItem(cartKey);
    if (!stored) return { items: [], createdAt: Date.now(), expiresAt: Date.now() + CART_EXPIRY_TIME };

    const cartData = JSON.parse(stored);
    
    // Check if cart has expired
    if (cartData.expiresAt && Date.now() > cartData.expiresAt) {
      // Cart expired, clear it
      localStorage.removeItem(cartKey);
      return { items: [], createdAt: Date.now(), expiresAt: Date.now() + CART_EXPIRY_TIME };
    }

    return cartData;
  } catch (error) {
    console.error('Error loading cart from storage:', error);
    return { items: [], createdAt: Date.now(), expiresAt: Date.now() + CART_EXPIRY_TIME };
  }
};

/**
 * Save cart to localStorage for a specific restaurant
 */
const saveCartToStorage = (restaurantId, cartData) => {
  try {
    const cartKey = getCartKey(restaurantId);
    const cartDataString = JSON.stringify(cartData);
    localStorage.setItem(cartKey, cartDataString);
    
    // Broadcast to other tabs using custom event (StorageEvent only fires in other tabs, not current)
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: { key: cartKey, value: cartDataString }
    }));
  } catch (error) {
    console.error('Error saving cart to storage:', error);
  }
};

/**
 * Generate unique cart ID for an item
 */
export const generateCartId = (itemId, variations = [], add_ons = []) => {
  // Create unique ID based on item + variations + add-ons
  const variationsKey = JSON.stringify(variations.sort());
  const addOnsKey = JSON.stringify(add_ons.sort());
  return `${itemId}_${variationsKey}_${addOnsKey}`;
};

export const CartProvider = ({ children, restaurantId }) => {
  const [cart, setCart] = useState(() => loadCartFromStorage(restaurantId));
  const isUpdatingFromStorage = useRef(false);

  // Listen for storage events from other tabs
  useEffect(() => {
    const cartKey = getCartKey(restaurantId);
    
    // Handle storage events from other tabs (only fires in other tabs, not current)
    const handleStorageChange = (e) => {
      if (e.key === cartKey && e.newValue) {
        try {
          isUpdatingFromStorage.current = true;
          const cartData = JSON.parse(e.newValue);
          // Check expiration
          if (cartData.expiresAt && Date.now() > cartData.expiresAt) {
            setCart({ items: [], createdAt: Date.now(), expiresAt: Date.now() + CART_EXPIRY_TIME });
          } else {
            setCart(cartData);
          }
        } catch (error) {
          console.error('Error parsing cart from storage event:', error);
        } finally {
          // Reset flag after a short delay to allow state update
          setTimeout(() => {
            isUpdatingFromStorage.current = false;
          }, 100);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [restaurantId]);

  // Update cart when restaurantId changes
  useEffect(() => {
    const newCart = loadCartFromStorage(restaurantId);
    setCart(newCart);
  }, [restaurantId]);

  // Save cart to localStorage whenever it changes (but not when updating from storage)
  useEffect(() => {
    if (restaurantId && !isUpdatingFromStorage.current) {
      saveCartToStorage(restaurantId, cart);
    }
  }, [cart, restaurantId]);

  /**
   * Add item to cart
   */
  const addToCart = useCallback((item, variations = [], add_ons = []) => {
    setCart((prevCart) => {
      const cartId = generateCartId(item.id, variations, add_ons);
      
      // Check if item already exists in cart
      const existingItemIndex = prevCart.items.findIndex(cartItem => cartItem.cartId === cartId);
      
      if (existingItemIndex >= 0) {
        // Item exists, increment quantity
        const updatedItems = [...prevCart.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1,
          addedAt: Date.now() // Update timestamp to move to top
        };
        
        // Reorder: move updated item to top
        const itemToMove = updatedItems.splice(existingItemIndex, 1)[0];
        updatedItems.unshift(itemToMove);
        
        return {
          ...prevCart,
          items: updatedItems,
          expiresAt: Date.now() + CART_EXPIRY_TIME
        };
      } else {
        // New item, add to cart
        const newItem = {
          cartId,
          itemId: String(item.id),
          quantity: 1,
          item: { ...item },
          variations: [...variations],
          add_ons: [...add_ons],
          cookingInstructions: '', // Initialize cooking instructions
          addedAt: Date.now()
        };
        
        // Add new item at the top
        return {
          ...prevCart,
          items: [newItem, ...prevCart.items],
          expiresAt: Date.now() + CART_EXPIRY_TIME
        };
      }
    });
  }, []);

  /**
   * Update item quantity in cart
   */
  const updateQuantity = useCallback((cartId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartId);
      return;
    }

    setCart((prevCart) => {
      const updatedItems = prevCart.items.map(cartItem => {
        if (cartItem.cartId === cartId) {
          return {
            ...cartItem,
            quantity: newQuantity,
            addedAt: Date.now() // Update timestamp to move to top
          };
        }
        return cartItem;
      });

      // Reorder: move updated item to top
      const itemIndex = updatedItems.findIndex(item => item.cartId === cartId);
      if (itemIndex > 0) {
        const itemToMove = updatedItems.splice(itemIndex, 1)[0];
        updatedItems.unshift(itemToMove);
      }

      return {
        ...prevCart,
        items: updatedItems,
        expiresAt: Date.now() + CART_EXPIRY_TIME
      };
    });
  }, []);

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback((cartId) => {
    setCart((prevCart) => ({
      ...prevCart,
      items: prevCart.items.filter(item => item.cartId !== cartId),
      expiresAt: Date.now() + CART_EXPIRY_TIME
    }));
  }, []);

  /**
   * Get quantity of an item in cart
   */
  const getItemQuantity = useCallback((itemId, variations = [], add_ons = []) => {
    const cartId = generateCartId(itemId, variations, add_ons);
    const cartItem = cart.items.find(item => item.cartId === cartId);
    return cartItem ? cartItem.quantity : 0;
  }, [cart.items]);

  /**
   * Check if item is in cart
   */
  const isItemInCart = useCallback((itemId, variations = [], add_ons = []) => {
    return getItemQuantity(itemId, variations, add_ons) > 0;
  }, [getItemQuantity]);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    setCart({
      items: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + CART_EXPIRY_TIME
    });
  }, []);

  /**
   * Get total items count in cart
   */
  const getTotalItems = useCallback(() => {
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }, [cart.items]);

  /**
   * Get total price of cart (including variations and add-ons)
   */
  const getTotalPrice = useCallback(() => {
    return cart.items.reduce((total, cartItem) => {
      // Base price
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
      
      // Subtotal for this item (base + variations + addons)
      const itemSubtotal = basePrice + variationsTotal + addonsTotal;
      
      // Total for this item (subtotal * quantity)
      const itemTotal = itemSubtotal * cartItem.quantity;
      
      return total + itemTotal;
    }, 0);
  }, [cart.items]);

  /**
   * Get total quantity of an item across all variations/add-ons combinations
   */
  const getTotalQuantityForItem = useCallback((itemId) => {
    return cart.items
      .filter(cartItem => cartItem.itemId === itemId)
      .reduce((total, cartItem) => total + cartItem.quantity, 0);
  }, [cart.items]);

  /**
   * Update cooking instructions for a cart item
   */
  const updateCookingInstructions = useCallback((cartId, instructions) => {
    setCart((prevCart) => {
      const updatedItems = prevCart.items.map(item => {
        if (item.cartId === cartId) {
          return {
            ...item,
            cookingInstructions: instructions.trim() || '' // Trim and allow empty string
          };
        }
        return item;
      });

      return {
        ...prevCart,
        items: updatedItems,
        expiresAt: Date.now() + CART_EXPIRY_TIME
      };
    });
  }, []);

  const value = {
    cartItems: cart.items,
    addToCart,
    updateQuantity,
    removeFromCart,
    getItemQuantity,
    getTotalQuantityForItem,
    isItemInCart,
    clearCart,
    getTotalItems,
    getTotalPrice,
    updateCookingInstructions,
    restaurantId
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
