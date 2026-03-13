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
  const [restaurant, setRestaurant] = useState(null);
  const [stations, setStations] = useState([]);
  const [stationCategories, setStationCategories] = useState({});
  const [expandedStations, setExpandedStations] = useState({});

  const restaurantId = user?.restaurant_id || user?.id;
  const isMultiMenu = restaurant ? isMultipleMenu(restaurant) : false;

  // Fetch restaurant details to check multiple_menu
  useEffect(() => {
    if (!restaurantId) return;
    getRestaurantDetails(restaurantId).then(setRestaurant).catch(() => {});
  }, [restaurantId]);

  // Fetch stations from JSON for multiple_menu restaurants
  useEffect(() => {
    if (!isMultiMenu) return;
    try {
      const stationsData = require('../../data/stations.json');
      setStations(stationsData || []);
    } catch (e) {
      setStations([]);
    }
  }, [isMultiMenu]);

  // Fetch categories (non-multiple-menu)
  const fetchCategories = useCallback(async () => {
    if (!restaurantId || isMultiMenu) return;
    setLoading(true);
    try {
      const data = await getRestaurantProducts(restaurantId, "0");
      const products = data?.products || [];
      setApiCategories(products.map(p => ({
        id: String(p.category_id),
        name: p.category_name || '',
      })));
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isMultiMenu]);

  // Fetch categories per station (multiple-menu)
  const fetchStationCategories = useCallback(async () => {
    if (!restaurantId || !isMultiMenu || stations.length === 0) return;
    setLoading(true);
    try {
      const results = {};
      for (const station of stations) {
        const data = await getRestaurantProducts(restaurantId, "0", station.id);
        const products = data?.products || [];
        results[station.id] = products.map(p => ({
          id: String(p.category_id),
          name: p.category_name || '',
        }));
      }
      setStationCategories(results);
    } catch (err) {
      console.error('Failed to fetch station categories:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isMultiMenu, stations]);

  useEffect(() => {
    if (isMultiMenu && stations.length > 0) {
      fetchStationCategories();
    } else if (!isMultiMenu && restaurantId) {
      fetchCategories();
    }
  }, [isMultiMenu, stations, restaurantId, fetchCategories, fetchStationCategories]);

  // --- Non-multiple-menu: Category order logic (existing) ---
  const getMergedCategories = () => {
    const saved = config.menuOrder?.categoryOrder || [];
    const savedVisibility = config.menuOrder?.categoryVisibility || {};
    const ordered = [];
    const seen = new Set();
    for (const cat of saved) {
      const apiCat = apiCategories.find(a => a.id === cat.id);
      if (apiCat) {
        ordered.push({ ...apiCat, visible: savedVisibility[apiCat.id] !== false });
        seen.add(apiCat.id);
      }
    }
    for (const apiCat of apiCategories) {
      if (!seen.has(apiCat.id)) ordered.push({ ...apiCat, visible: true });
    }
    return ordered;
  };

  const updateCategoryConfig = (newCategories) => {
    const categoryOrder = newCategories.map(c => ({ id: c.id, name: c.name }));
    const categoryVisibility = {};
    newCategories.forEach(c => { categoryVisibility[c.id] = c.visible; });
    setConfig(prev => ({
      ...prev,
      menuOrder: { ...prev.menuOrder, categoryOrder, categoryVisibility },
    }));
  };

  // --- Multiple-menu: Station order logic ---
  const getMergedStations = () => {
    const saved = config.menuOrder?.stationOrder || [];
    const savedVisibility = config.menuOrder?.stationVisibility || {};
    const ordered = [];
    const seen = new Set();
    for (const s of saved) {
      const station = stations.find(st => st.id === s.id);
      if (station) {
        ordered.push({ ...station, visible: savedVisibility[station.id] !== false });
        seen.add(station.id);
      }
    }
    for (const station of stations) {
      if (!seen.has(station.id)) ordered.push({ ...station, visible: true });
    }
    return ordered;
  };

  const getMergedStationCategories = (stationId) => {
    const apiCats = stationCategories[stationId] || [];
    const savedOrder = config.menuOrder?.stationCategoryOrder?.[stationId] || [];
    const savedVis = config.menuOrder?.stationCategoryVisibility?.[stationId] || {};
    const ordered = [];
    const seen = new Set();
    for (const cat of savedOrder) {
      const apiCat = apiCats.find(a => a.id === cat.id);
      if (apiCat) {
        ordered.push({ ...apiCat, visible: savedVis[apiCat.id] !== false });
        seen.add(apiCat.id);
      }
    }
    for (const apiCat of apiCats) {
      if (!seen.has(apiCat.id)) ordered.push({ ...apiCat, visible: true });
    }
    return ordered;
  };

  const updateStationConfig = (newStations) => {
    const stationOrder = newStations.map(s => ({ id: s.id, name: s.name }));
    const stationVisibility = {};
    newStations.forEach(s => { stationVisibility[s.id] = s.visible; });
    setConfig(prev => ({
      ...prev,
      menuOrder: { ...prev.menuOrder, stationOrder, stationVisibility },
    }));
  };

  const updateStationCategoryConfig = (stationId, newCategories) => {
    const catOrder = newCategories.map(c => ({ id: c.id, name: c.name }));
    const catVis = {};
    newCategories.forEach(c => { catVis[c.id] = c.visible; });
    setConfig(prev => ({
      ...prev,
      menuOrder: {
        ...prev.menuOrder,
        stationCategoryOrder: { ...prev.menuOrder?.stationCategoryOrder, [stationId]: catOrder },
        stationCategoryVisibility: { ...prev.menuOrder?.stationCategoryVisibility, [stationId]: catVis },
      },
    }));
  };

  // --- Shared move/toggle helpers ---
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

  const toggleStation = (stationId) => {
    setExpandedStations(prev => ({ ...prev, [stationId]: !prev[stationId] }));
  };

  if (loading) {
    return <div className="menu-order-loading">Loading menu data...</div>;
  }

  // --- RENDER: Multiple Menu (3-layer) ---
  if (isMultiMenu) {
    const mergedStations = getMergedStations();
    return (
      <div className="menu-order-tab" data-testid="menu-order-tab">
        <div className="menu-order-header">
          <h3 className="menu-order-title">Station, Category Order & Visibility</h3>
          <button className="menu-order-refresh" onClick={fetchStationCategories} data-testid="menu-order-refresh" title="Refresh from API">
            <IoRefresh />
          </button>
        </div>
        <p className="menu-order-desc">Reorder stations and categories. Toggle visibility. Changes apply after saving.</p>

        <div className="menu-order-list" data-testid="menu-order-list">
          {mergedStations.map((station, sIdx) => (
            <div key={station.id} className={`menu-order-station ${!station.visible ? 'hidden-item' : ''}`}>
              <div className="menu-order-item station-item" data-testid={`menu-order-station-${station.id}`}>
                <div className="menu-order-item-info">
                  <button className="menu-order-expand-btn" onClick={() => toggleStation(station.id)}>
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
                  {getMergedStationCategories(station.id).map((cat, cIdx) => {
                    const cats = getMergedStationCategories(station.id);
                    return (
                      <div key={cat.id} className={`menu-order-item subcategory-item ${!cat.visible ? 'hidden-item' : ''}`} data-testid={`menu-order-cat-${station.id}-${cat.id}`}>
                        <div className="menu-order-item-info">
                          <span className="menu-order-item-index sub-index">{cIdx + 1}</span>
                          <span className="menu-order-item-name">{cat.name}</span>
                        </div>
                        <div className="menu-order-item-actions">
                          <button className="menu-order-btn" onClick={() => moveItem(cats, cIdx, 'up', (updated) => updateStationCategoryConfig(station.id, updated))} disabled={cIdx === 0}><IoArrowUp /></button>
                          <button className="menu-order-btn" onClick={() => moveItem(cats, cIdx, 'down', (updated) => updateStationCategoryConfig(station.id, updated))} disabled={cIdx === cats.length - 1}><IoArrowDown /></button>
                          <button className={`menu-order-btn visibility-btn ${cat.visible ? 'visible' : 'not-visible'}`} onClick={() => toggleItem(cats, cIdx, (updated) => updateStationCategoryConfig(station.id, updated))}>
                            {cat.visible ? <IoEyeOutline /> : <IoEyeOffOutline />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(stationCategories[station.id] || []).length === 0 && (
                    <div className="menu-order-empty-sub">No categories in this station</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: Single Menu (2-layer, existing) ---
  const categories = getMergedCategories();
  if (categories.length === 0) {
    return <div className="menu-order-empty">No categories found for this restaurant.</div>;
  }

  return (
    <div className="menu-order-tab" data-testid="menu-order-tab">
      <div className="menu-order-header">
        <h3 className="menu-order-title">Category Order & Visibility</h3>
        <button className="menu-order-refresh" onClick={fetchCategories} data-testid="menu-order-refresh" title="Refresh from API">
          <IoRefresh />
        </button>
      </div>
      <p className="menu-order-desc">Reorder categories and toggle visibility. Changes apply after saving.</p>

      <div className="menu-order-list" data-testid="menu-order-list">
        {categories.map((cat, index) => (
          <div key={cat.id} className={`menu-order-item ${!cat.visible ? 'hidden-item' : ''}`} data-testid={`menu-order-item-${cat.id}`}>
            <div className="menu-order-item-info">
              <span className="menu-order-item-index">{index + 1}</span>
              <span className="menu-order-item-name">{cat.name}</span>
            </div>
            <div className="menu-order-item-actions">
              <button className="menu-order-btn" onClick={() => moveItem(categories, index, 'up', updateCategoryConfig)} disabled={index === 0}><IoArrowUp /></button>
              <button className="menu-order-btn" onClick={() => moveItem(categories, index, 'down', updateCategoryConfig)} disabled={index === categories.length - 1}><IoArrowDown /></button>
              <button className={`menu-order-btn visibility-btn ${cat.visible ? 'visible' : 'not-visible'}`} onClick={() => toggleItem(categories, index, updateCategoryConfig)}>
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
