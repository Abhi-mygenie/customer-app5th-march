/**
 * Tests for CartContext
 * Covers: addToCart, updateQuantity, removeFromCart, clearCart,
 *         getTotalItems, getTotalPrice, getTotalQuantityForItem,
 *         updateCookingInstructions, generateCartId
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { CartProvider, useCart, generateCartId } from '../../context/CartContext';

// ─── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

// Helper: render hook-like test component
const TestConsumer = ({ onRender }) => {
  const cart = useCart();
  React.useEffect(() => {
    onRender(cart);
  });
  return null;
};

const renderCart = (restaurantId = 'test-rest') => {
  let cartRef = {};
  const onRender = (cart) => { cartRef = cart; };

  render(
    <CartProvider restaurantId={restaurantId}>
      <TestConsumer onRender={onRender} />
    </CartProvider>
  );

  return () => cartRef;
};

// Sample items
const sampleItem = {
  id: '101',
  name: 'Butter Chicken',
  price: 350,
  description: 'Creamy butter chicken',
};

const sampleItem2 = {
  id: '102',
  name: 'Paneer Tikka',
  price: 250,
  description: 'Grilled paneer',
};

// ─── generateCartId ──────────────────────────────────────────────

describe('generateCartId', () => {
  test('generates ID for item without variations/add-ons', () => {
    const id = generateCartId('101', [], []);
    expect(id).toBe('101_[]_[]');
  });

  test('generates different IDs for same item with different variations', () => {
    const id1 = generateCartId('101', [{ label: 'Small' }], []);
    const id2 = generateCartId('101', [{ label: 'Large' }], []);
    expect(id1).not.toBe(id2);
  });

  test('generates same ID for same item/variations/add-ons', () => {
    const id1 = generateCartId('101', [{ label: 'Medium' }], [{ id: 1 }]);
    const id2 = generateCartId('101', [{ label: 'Medium' }], [{ id: 1 }]);
    expect(id1).toBe(id2);
  });
});

// ─── Cart operations ─────────────────────────────────────────────

describe('CartProvider', () => {
  test('starts with empty cart', () => {
    const getCart = renderCart();
    expect(getCart().cartItems).toEqual([]);
    expect(getCart().getTotalItems()).toBe(0);
    expect(getCart().getTotalPrice()).toBe(0);
  });

  test('addToCart adds item with quantity 1', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    expect(getCart().cartItems.length).toBe(1);
    expect(getCart().cartItems[0].quantity).toBe(1);
    expect(getCart().cartItems[0].itemId).toBe('101');
    expect(getCart().getTotalItems()).toBe(1);
  });

  test('addToCart increments quantity for same item', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });
    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    expect(getCart().cartItems.length).toBe(1);
    expect(getCart().cartItems[0].quantity).toBe(2);
    expect(getCart().getTotalItems()).toBe(2);
  });

  test('addToCart treats same item with different variations as separate', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [{ label: 'Small', optionPrice: 0 }], []);
    });
    act(() => {
      getCart().addToCart(sampleItem, [{ label: 'Large', optionPrice: 50 }], []);
    });

    expect(getCart().cartItems.length).toBe(2);
    expect(getCart().getTotalItems()).toBe(2);
  });

  test('addToCart adds different items separately', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });
    act(() => {
      getCart().addToCart(sampleItem2, [], []);
    });

    expect(getCart().cartItems.length).toBe(2);
    expect(getCart().getTotalItems()).toBe(2);
  });

  test('updateQuantity changes quantity', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    const cartId = getCart().cartItems[0].cartId;

    act(() => {
      getCart().updateQuantity(cartId, 5);
    });

    expect(getCart().cartItems[0].quantity).toBe(5);
    expect(getCart().getTotalItems()).toBe(5);
  });

  test('updateQuantity with 0 removes item', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    const cartId = getCart().cartItems[0].cartId;

    act(() => {
      getCart().updateQuantity(cartId, 0);
    });

    expect(getCart().cartItems.length).toBe(0);
    expect(getCart().getTotalItems()).toBe(0);
  });

  test('removeFromCart removes specific item', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });
    act(() => {
      getCart().addToCart(sampleItem2, [], []);
    });

    const cartIdToRemove = getCart().cartItems.find(i => i.itemId === '101').cartId;

    act(() => {
      getCart().removeFromCart(cartIdToRemove);
    });

    expect(getCart().cartItems.length).toBe(1);
    expect(getCart().cartItems[0].itemId).toBe('102');
  });

  test('clearCart removes all items', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });
    act(() => {
      getCart().addToCart(sampleItem2, [], []);
    });
    act(() => {
      getCart().clearCart();
    });

    expect(getCart().cartItems.length).toBe(0);
    expect(getCart().getTotalItems()).toBe(0);
    expect(getCart().getTotalPrice()).toBe(0);
  });
});

// ─── Price calculations ──────────────────────────────────────────

describe('getTotalPrice', () => {
  test('calculates base price correctly', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []); // 350
    });

    expect(getCart().getTotalPrice()).toBe(350);
  });

  test('calculates price with quantity', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []); // 350
    });
    act(() => {
      getCart().addToCart(sampleItem, [], []); // 350 x2
    });

    expect(getCart().getTotalPrice()).toBe(700);
  });

  test('calculates price with variations', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [{ label: 'Large', optionPrice: 50 }], []);
    });

    // 350 + 50 = 400
    expect(getCart().getTotalPrice()).toBe(400);
  });

  test('calculates price with add-ons', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], [{ id: 1, name: 'Cheese', price: 30, quantity: 2 }]);
    });

    // 350 + (30 * 2) = 410
    expect(getCart().getTotalPrice()).toBe(410);
  });

  test('calculates price with variations + add-ons + quantity', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(
        sampleItem,
        [{ label: 'Large', optionPrice: 50 }],
        [{ id: 1, name: 'Cheese', price: 30, quantity: 1 }]
      );
    });

    const cartId = getCart().cartItems[0].cartId;

    act(() => {
      getCart().updateQuantity(cartId, 3);
    });

    // (350 + 50 + 30) * 3 = 1290
    expect(getCart().getTotalPrice()).toBe(1290);
  });

  test('handles multiple items with different prices', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []); // 350
    });
    act(() => {
      getCart().addToCart(sampleItem2, [], []); // 250
    });

    expect(getCart().getTotalPrice()).toBe(600);
  });
});

// ─── getTotalQuantityForItem ─────────────────────────────────────

describe('getTotalQuantityForItem', () => {
  test('returns 0 for item not in cart', () => {
    const getCart = renderCart();
    expect(getCart().getTotalQuantityForItem('999')).toBe(0);
  });

  test('returns quantity for single variation', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });
    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    expect(getCart().getTotalQuantityForItem('101')).toBe(2);
  });

  test('sums quantities across multiple variations', () => {
    const getCart = renderCart();

    // Add 2 x Small
    act(() => { getCart().addToCart(sampleItem, [{ label: 'Small' }], []); });
    act(() => { getCart().addToCart(sampleItem, [{ label: 'Small' }], []); });

    // Add 1 x Large
    act(() => { getCart().addToCart(sampleItem, [{ label: 'Large' }], []); });

    // Total: 2 + 1 = 3
    expect(getCart().getTotalQuantityForItem('101')).toBe(3);
  });
});

// ─── updateCookingInstructions ───────────────────────────────────

describe('updateCookingInstructions', () => {
  test('sets cooking instructions for cart item', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    const cartId = getCart().cartItems[0].cartId;

    act(() => {
      getCart().updateCookingInstructions(cartId, 'Extra spicy');
    });

    expect(getCart().cartItems[0].cookingInstructions).toBe('Extra spicy');
  });

  test('trims whitespace from instructions', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    const cartId = getCart().cartItems[0].cartId;

    act(() => {
      getCart().updateCookingInstructions(cartId, '  No onions  ');
    });

    expect(getCart().cartItems[0].cookingInstructions).toBe('No onions');
  });

  test('sets empty string for whitespace-only input', () => {
    const getCart = renderCart();

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    const cartId = getCart().cartItems[0].cartId;

    act(() => {
      getCart().updateCookingInstructions(cartId, '   ');
    });

    expect(getCart().cartItems[0].cookingInstructions).toBe('');
  });
});

// ─── localStorage persistence ────────────────────────────────────

describe('localStorage persistence', () => {
  test('persists cart to localStorage', () => {
    const getCart = renderCart('persist-test');

    act(() => {
      getCart().addToCart(sampleItem, [], []);
    });

    const stored = JSON.parse(localStorage.getItem('cart_persist-test'));
    expect(stored).not.toBeNull();
    expect(stored.items.length).toBe(1);
  });

  test('restores cart from localStorage on mount', () => {
    // Pre-populate localStorage
    const cartData = {
      items: [
        {
          cartId: '101_[]_[]',
          itemId: '101',
          quantity: 3,
          item: sampleItem,
          variations: [],
          add_ons: [],
          cookingInstructions: '',
          addedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      expiresAt: Date.now() + 3 * 60 * 60 * 1000, // 3 hours from now
    };
    localStorage.setItem('cart_restore-test', JSON.stringify(cartData));

    const getCart = renderCart('restore-test');

    expect(getCart().cartItems.length).toBe(1);
    expect(getCart().cartItems[0].quantity).toBe(3);
    expect(getCart().getTotalItems()).toBe(3);
  });

  test('clears expired cart on mount', () => {
    // Pre-populate with expired cart
    const cartData = {
      items: [
        {
          cartId: '101_[]_[]',
          itemId: '101',
          quantity: 1,
          item: sampleItem,
          variations: [],
          add_ons: [],
          cookingInstructions: '',
          addedAt: Date.now(),
        },
      ],
      createdAt: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
      expiresAt: Date.now() - 1 * 60 * 60 * 1000, // Expired 1 hour ago
    };
    localStorage.setItem('cart_expired-test', JSON.stringify(cartData));

    const getCart = renderCart('expired-test');

    expect(getCart().cartItems.length).toBe(0);
  });
});
