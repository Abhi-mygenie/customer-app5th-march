import React, { useState, useEffect, useCallback } from 'react';
import { IoEyeOutline, IoEyeOffOutline, IoArrowUp, IoArrowDown, IoRefresh, IoChevronDown, IoChevronForward } from 'react-icons/io5';
import { getRestaurantProducts, getRestaurantDetails } from '../../api/services/restaurantService';
import { isMultipleMenu } from '../../api/utils/restaurantIdConfig';
import { useAuth } from '../../context/AuthContext';
import './MenuOrderTab.css';

const MenuOrderTab = ({ config, setConfig }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apiCategories, setApiCategories] = useState([]);
  const [apiItems, setApiItems] = useState({});
  const [restaurant, setRestaurant] = useState(null);
  const [stations, setStations] = useState([]);
  const [stationCategories, setStationCategories] = useState({});
  const [stationItems, setStationItems] = useState({});
  const [expandedStations, setExpandedStations] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  const restaurantId = user?.restaurant_id || user?.id;
  const isMultiMenu = restaurant ? isMultipleMenu(restaurant) : false;

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurantDetails(restaurantId).then(setRestaurant).catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    if (!isMultiMenu) return;
    try {
      const stationsData = require('../../data/stations.json');
      setStations(stationsData || []);
    } catch (e) {
      setStations([]);
    }
  }, [isMultiMenu]);

  // Fetch categories + items (non-multiple-menu)
  const fetchCategories = useCallback(async () => {
    if (!restaurantId || isMultiMenu) return;
    setLoading(true);
    try {
      const data = await getRestaurantProducts(restaurantId, "0");
      const products = data?.products || [];
      const cats = [];
      const items = {};
      for (const p of products) {
        const catId = String(p.category_id);
        cats.push({ id: catId, name: p.category_name || '' });
        items[catId] = (p.items || []).map(i => ({ id: String(i.id), name: i.name || '' }));
      }
      setApiCategories(cats);
      setApiItems(items);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isMultiMenu]);

  // Fetch station categories + items (multiple-menu)
  const fetchStationCategories = useCallback(async () => {
    if (!restaurantId || !isMultiMenu || stations.length === 0) return;
    setLoading(true);
    try {
      const catResults = {};
      const itemResults = {};
      for (const station of stations) {
        const data = await getRestaurantProducts(restaurantId, "0", station.id);
        const products = data?.products || [];
        catResults[station.id] = products.map(p => ({ id: String(p.category_id), name: p.category_name || '' }));
        for (const p of products) {
          const key = `${station.id}__${p.category_id}`;
          itemResults[key] = (p.items || []).map(i => ({ id: String(i.id), name: i.name || '' }));
        }
      }
      setStationCategories(catResults);
      setStationItems(itemResults);
    } catch (err) {
      console.error('Failed to fetch station categories:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isMultiMenu, stations]);

  useEffect(() => {
    if (isMultiMenu && stations.length > 0) fetchStationCategories();
    else if (!isMultiMenu && restaurantId) fetchCategories();
  }, [isMultiMenu, stations, restaurantId, fetchCategories, fetchStationCategories]);

  // --- Shared helpers ---
  const moveItem = (list, index, direction, updateFn) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const updated = [...list];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    updateFn(updated);
  };

  const toggleItem = (list, index, updateFn) => {
    const updated = [...list];
    updated[index] = { ...updated[index], visible: !updated[index].visible };
    updateFn(updated);
  };

  // --- Merge helpers ---
  const mergeWithSaved = (apiList, savedOrder, savedVisibility) => {
    const ordered = [];
    const seen = new Set();
    for (const s of savedOrder) {
      const item = apiList.find(a => a.id === s.id);
      if (item) {
        ordered.push({ ...item, visible: savedVisibility[item.id] !== false });
        seen.add(item.id);
      }
    }
    for (const item of apiList) {
      if (!seen.has(item.id)) ordered.push({ ...item, visible: true });
    }
    return ordered;
  };

  // ============ NON-MULTIPLE MENU ============
  const getMergedCategories = () => mergeWithSaved(apiCategories, config.menuOrder?.categoryOrder || [], config.menuOrder?.categoryVisibility || {});

  const getMergedItems = (categoryId) => mergeWithSaved(apiItems[categoryId] || [], config.menuOrder?.itemOrder?.[categoryId] || [], config.menuOrder?.itemVisibility?.[categoryId] || {});

  const updateCategoryConfig = (newCategories) => {
    const categoryOrder = newCategories.map(c => ({ id: c.id, name: c.name }));
    const categoryVisibility = {};
    newCategories.forEach(c => { categoryVisibility[c.id] = c.visible; });
    setConfig(prev => ({ ...prev, menuOrder: { ...prev.menuOrder, categoryOrder, categoryVisibility } }));
  };

  const updateItemConfig = (categoryId, newItems) => {
    const itemOrder = newItems.map(i => ({ id: i.id, name: i.name }));
    const itemVis = {};
    newItems.forEach(i => { itemVis[i.id] = i.visible; });
    setConfig(prev => ({
      ...prev,
      menuOrder: {
        ...prev.menuOrder,
        itemOrder: { ...prev.menuOrder?.itemOrder, [categoryId]: itemOrder },
        itemVisibility: { ...prev.menuOrder?.itemVisibility, [categoryId]: itemVis },
      },
    }));
  };

  // ============ MULTIPLE MENU ============
  const getMergedStations = () => mergeWithSaved(stations, config.menuOrder?.stationOrder || [], config.menuOrder?.stationVisibility || {});

  const getMergedStationCats = (stationId) => mergeWithSaved(stationCategories[stationId] || [], config.menuOrder?.stationCategoryOrder?.[stationId] || [], config.menuOrder?.stationCategoryVisibility?.[stationId] || {});

  const getMergedStationItems = (stationId, categoryId) => {
    const key = `${stationId}__${categoryId}`;
    return mergeWithSaved(stationItems[key] || [], config.menuOrder?.stationItemOrder?.[key] || [], config.menuOrder?.stationItemVisibility?.[key] || {});
  };

  const updateStationConfig = (newStations) => {
    const stationOrder = newStations.map(s => ({ id: s.id, name: s.name }));
    const stationVisibility = {};
    newStations.forEach(s => { stationVisibility[s.id] = s.visible; });
    setConfig(prev => ({ ...prev, menuOrder: { ...prev.menuOrder, stationOrder, stationVisibility } }));
  };

  const updateStationCatConfig = (stationId, newCats) => {
    const catOrder = newCats.map(c => ({ id: c.id, name: c.name }));
    const catVis = {};
    newCats.forEach(c => { catVis[c.id] = c.visible; });
    setConfig(prev => ({
      ...prev,
      menuOrder: {
        ...prev.menuOrder,
        stationCategoryOrder: { ...prev.menuOrder?.stationCategoryOrder, [stationId]: catOrder },
        stationCategoryVisibility: { ...prev.menuOrder?.stationCategoryVisibility, [stationId]: catVis },
      },
    }));
  };

  const updateStationItemConfig = (stationId, categoryId, newItems) => {
    const key = `${stationId}__${categoryId}`;
    const itemOrder = newItems.map(i => ({ id: i.id, name: i.name }));
    const itemVis = {};
    newItems.forEach(i => { itemVis[i.id] = i.visible; });
    setConfig(prev => ({
      ...prev,
      menuOrder: {
        ...prev.menuOrder,
        stationItemOrder: { ...prev.menuOrder?.stationItemOrder, [key]: itemOrder },
        stationItemVisibility: { ...prev.menuOrder?.stationItemVisibility, [key]: itemVis },
      },
    }));
  };

  // --- Reusable row component ---
  const OrderRow = ({ item, index, total, onMove, onToggle, className = '' }) => (
    <div className={`menu-order-item ${className} ${!item.visible ? 'hidden-item' : ''}`}>
      <div className="menu-order-item-info">
        <span className="menu-order-item-index">{index + 1}</span>
        <span className="menu-order-item-name">{item.name}</span>
      </div>
      <div className="menu-order-item-actions">
        <button className="menu-order-btn" onClick={() => onMove('up')} disabled={index === 0}><IoArrowUp /></button>
        <button className="menu-order-btn" onClick={() => onMove('down')} disabled={index === total - 1}><IoArrowDown /></button>
        <button className={`menu-order-btn visibility-btn ${item.visible ? 'visible' : 'not-visible'}`} onClick={onToggle}>
          {item.visible ? <IoEyeOutline /> : <IoEyeOffOutline />}
        </button>
      </div>
    </div>
  );

  // --- Expandable category with items ---
  const CategoryWithItems = ({ cat, catIndex, catTotal, onCatMove, onCatToggle, items, onItemMove, onItemToggle, expandKey }) => (
    <div className={`menu-order-category-block ${!cat.visible ? 'hidden-item' : ''}`}>
      <div className="menu-order-item category-row">
        <div className="menu-order-item-info">
          <button className="menu-order-expand-btn" onClick={() => setExpandedCategories(prev => ({ ...prev, [expandKey]: !prev[expandKey] }))}>
            {expandedCategories[expandKey] ? <IoChevronDown /> : <IoChevronForward />}
          </button>
          <span className="menu-order-item-index">{catIndex + 1}</span>
          <span className="menu-order-item-name">{cat.name}</span>
          <span className="menu-order-item-count">({items.length})</span>
        </div>
        <div className="menu-order-item-actions">
          <button className="menu-order-btn" onClick={() => onCatMove('up')} disabled={catIndex === 0}><IoArrowUp /></button>
          <button className="menu-order-btn" onClick={() => onCatMove('down')} disabled={catIndex === catTotal - 1}><IoArrowDown /></button>
          <button className={`menu-order-btn visibility-btn ${cat.visible ? 'visible' : 'not-visible'}`} onClick={onCatToggle}>
            {cat.visible ? <IoEyeOutline /> : <IoEyeOffOutline />}
          </button>
        </div>
      </div>
      {expandedCategories[expandKey] && (
        <div className="menu-order-items-list">
          {items.map((item, iIdx) => (
            <OrderRow
              key={item.id}
              item={item}
              index={iIdx}
              total={items.length}
              onMove={(dir) => onItemMove(iIdx, dir)}
              onToggle={() => onItemToggle(iIdx)}
              className="item-row"
            />
          ))}
          {items.length === 0 && <div className="menu-order-empty-sub">No items</div>}
        </div>
      )}
    </div>
  );

  if (loading) return <div className="menu-order-loading">Loading menu data...</div>;

  // ============ RENDER: MULTIPLE MENU (3-layer) ============
  if (isMultiMenu) {
    const mergedStations = getMergedStations();
    return (
      <div className="menu-order-tab" data-testid="menu-order-tab">
        <div className="menu-order-header">
          <h3 className="menu-order-title">Station, Category & Item Order</h3>
          <button className="menu-order-refresh" onClick={fetchStationCategories} data-testid="menu-order-refresh"><IoRefresh /></button>
        </div>
        <p className="menu-order-desc">Reorder stations, categories, and items. Toggle visibility. Save when done.</p>

        <div className="menu-order-list" data-testid="menu-order-list">
          {mergedStations.map((station, sIdx) => (
            <div key={station.id} className={`menu-order-station ${!station.visible ? 'hidden-item' : ''}`}>
              <div className="menu-order-item station-item">
                <div className="menu-order-item-info">
                  <button className="menu-order-expand-btn" onClick={() => setExpandedStations(prev => ({ ...prev, [station.id]: !prev[station.id] }))}>
                    {expandedStations[station.id] ? <IoChevronDown /> : <IoChevronForward />}
                  </button>
                  <span className="menu-order-item-index">{sIdx + 1}</span>
                  <span className="menu-order-item-name station-name">{station.name}</span>
                </div>
                <div className="menu-order-item-actions">
                  <button className="menu-order-btn" onClick={() => moveItem(mergedStations, sIdx, 'up', updateStationConfig)} disabled={sIdx === 0}><IoArrowUp /></button>
                  <button className="menu-order-btn" onClick={() => moveItem(mergedStations, sIdx, 'down', updateStationConfig)} disabled={sIdx === mergedStations.length - 1}><IoArrowDown /></button>
                  <button className={`menu-order-btn visibility-btn ${station.visible ? 'visible' : 'not-visible'}`} onClick={() => toggleItem(mergedStations, sIdx, updateStationConfig)}>
                    {station.visible ? <IoEyeOutline /> : <IoEyeOffOutline />}
                  </button>
                </div>
              </div>
              {expandedStations[station.id] && (
                <div className="menu-order-subcategories">
                  {getMergedStationCats(station.id).map((cat, cIdx) => {
                    const cats = getMergedStationCats(station.id);
                    const items = getMergedStationItems(station.id, cat.id);
                    return (
                      <CategoryWithItems
                        key={cat.id}
                        cat={cat}
                        catIndex={cIdx}
                        catTotal={cats.length}
                        onCatMove={(dir) => moveItem(cats, cIdx, dir, (u) => updateStationCatConfig(station.id, u))}
                        onCatToggle={() => toggleItem(cats, cIdx, (u) => updateStationCatConfig(station.id, u))}
                        items={items}
                        onItemMove={(iIdx, dir) => moveItem(items, iIdx, dir, (u) => updateStationItemConfig(station.id, cat.id, u))}
                        onItemToggle={(iIdx) => toggleItem(items, iIdx, (u) => updateStationItemConfig(station.id, cat.id, u))}
                        expandKey={`${station.id}__${cat.id}`}
                      />
                    );
                  })}
                  {(stationCategories[station.id] || []).length === 0 && <div className="menu-order-empty-sub">No categories</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============ RENDER: SINGLE MENU (2-layer + items) ============
  const categories = getMergedCategories();
  if (categories.length === 0) return <div className="menu-order-empty">No categories found.</div>;

  return (
    <div className="menu-order-tab" data-testid="menu-order-tab">
      <div className="menu-order-header">
        <h3 className="menu-order-title">Category & Item Order</h3>
        <button className="menu-order-refresh" onClick={fetchCategories} data-testid="menu-order-refresh"><IoRefresh /></button>
      </div>
      <p className="menu-order-desc">Reorder categories and items. Toggle visibility. Save when done.</p>

      <div className="menu-order-list" data-testid="menu-order-list">
        {categories.map((cat, cIdx) => {
          const items = getMergedItems(cat.id);
          return (
            <CategoryWithItems
              key={cat.id}
              cat={cat}
              catIndex={cIdx}
              catTotal={categories.length}
              onCatMove={(dir) => moveItem(categories, cIdx, dir, updateCategoryConfig)}
              onCatToggle={() => toggleItem(categories, cIdx, updateCategoryConfig)}
              items={items}
              onItemMove={(iIdx, dir) => moveItem(items, iIdx, dir, (u) => updateItemConfig(cat.id, u))}
              onItemToggle={(iIdx) => toggleItem(items, iIdx, (u) => updateItemConfig(cat.id, u))}
              expandKey={cat.id}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MenuOrderTab;
