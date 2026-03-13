import React, { useState, useEffect, useCallback } from 'react';
import { IoEyeOutline, IoEyeOffOutline, IoArrowUp, IoArrowDown, IoRefresh } from 'react-icons/io5';
import { getRestaurantProducts } from '../../api/services/restaurantService';
import { useAuth } from '../../context/AuthContext';
import './MenuOrderTab.css';

const MenuOrderTab = ({ config, setConfig }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apiCategories, setApiCategories] = useState([]);

  const restaurantId = user?.restaurant_id || user?.id;

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const data = await getRestaurantProducts(restaurantId, "0");
      const products = data?.products || [];
      const categories = products.map(p => ({
        id: String(p.category_id),
        name: p.category_name || '',
        image: p.category_image || '',
      }));
      setApiCategories(categories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Merge saved order with API categories
  const getMergedCategories = () => {
    const saved = config.menuOrder?.categoryOrder || [];
    const savedVisibility = config.menuOrder?.categoryVisibility || {};

    // Build ordered list: saved order first, then new API categories at end
    const ordered = [];
    const seen = new Set();

    // Add saved categories (in saved order) if they still exist in API
    for (const cat of saved) {
      const apiCat = apiCategories.find(a => a.id === cat.id);
      if (apiCat) {
        ordered.push({
          ...apiCat,
          visible: savedVisibility[apiCat.id] !== false,
        });
        seen.add(apiCat.id);
      }
    }

    // Add new API categories not in saved order
    for (const apiCat of apiCategories) {
      if (!seen.has(apiCat.id)) {
        ordered.push({
          ...apiCat,
          visible: true,
        });
      }
    }

    return ordered;
  };

  const categories = getMergedCategories();

  const updateConfig = (newCategories) => {
    const categoryOrder = newCategories.map(c => ({ id: c.id, name: c.name }));
    const categoryVisibility = {};
    newCategories.forEach(c => {
      categoryVisibility[c.id] = c.visible;
    });

    setConfig(prev => ({
      ...prev,
      menuOrder: {
        ...prev.menuOrder,
        categoryOrder,
        categoryVisibility,
      },
    }));
  };

  const toggleVisibility = (index) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], visible: !updated[index].visible };
    updateConfig(updated);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const updated = [...categories];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updateConfig(updated);
  };

  const moveDown = (index) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updateConfig(updated);
  };

  if (loading) {
    return <div className="menu-order-loading">Loading categories...</div>;
  }

  if (categories.length === 0) {
    return <div className="menu-order-empty">No categories found for this restaurant.</div>;
  }

  return (
    <div className="menu-order-tab" data-testid="menu-order-tab">
      <div className="menu-order-header">
        <h3 className="menu-order-title">Category Order & Visibility</h3>
        <button
          className="menu-order-refresh"
          onClick={fetchCategories}
          data-testid="menu-order-refresh"
          title="Refresh from API"
        >
          <IoRefresh />
        </button>
      </div>
      <p className="menu-order-desc">Reorder categories and toggle visibility. Changes apply after saving.</p>

      <div className="menu-order-list" data-testid="menu-order-list">
        {categories.map((cat, index) => (
          <div
            key={cat.id}
            className={`menu-order-item ${!cat.visible ? 'hidden-item' : ''}`}
            data-testid={`menu-order-item-${cat.id}`}
          >
            <div className="menu-order-item-info">
              <span className="menu-order-item-index">{index + 1}</span>
              <span className="menu-order-item-name">{cat.name}</span>
            </div>
            <div className="menu-order-item-actions">
              <button
                className="menu-order-btn"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                data-testid={`menu-order-up-${cat.id}`}
                title="Move up"
              >
                <IoArrowUp />
              </button>
              <button
                className="menu-order-btn"
                onClick={() => moveDown(index)}
                disabled={index === categories.length - 1}
                data-testid={`menu-order-down-${cat.id}`}
                title="Move down"
              >
                <IoArrowDown />
              </button>
              <button
                className={`menu-order-btn visibility-btn ${cat.visible ? 'visible' : 'not-visible'}`}
                onClick={() => toggleVisibility(index)}
                data-testid={`menu-order-visibility-${cat.id}`}
                title={cat.visible ? 'Hide category' : 'Show category'}
              >
                {cat.visible ? <IoEyeOutline /> : <IoEyeOffOutline />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuOrderTab;
