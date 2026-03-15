import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IoEyeOutline,
  IoEyeOffOutline,
  IoRefresh,
  IoChevronDown,
  IoChevronForward,
  IoReorderThree,
  IoSearch,
  IoCheckmarkCircle,
  IoCloseCircle,
} from 'react-icons/io5';
import { getRestaurantProducts, getRestaurantDetails } from '../../api/services/restaurantService';
import { isMultipleMenu } from '../../api/utils/restaurantIdConfig';
import { useAuth } from '../../context/AuthContext';
import './MenuOrderTab.css';

// Sortable Item Component
const SortableItem = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ listeners, isDragging })}
    </div>
  );
};

// Drag Handle Component
const DragHandle = ({ listeners }) => (
  <button className="drag-handle" {...listeners} data-testid="drag-handle">
    <IoReorderThree />
  </button>
);

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, label }) => (
  <button
    className={`toggle-switch ${checked ? 'active' : ''}`}
    onClick={onChange}
    data-testid={`toggle-${label}`}
  >
    <span className="toggle-track">
      <span className="toggle-thumb" />
    </span>
    <span className="toggle-label">{checked ? 'Visible' : 'Hidden'}</span>
  </button>
);

// Category Card Component
const CategoryCard = ({
  cat,
  index,
  items,
  expanded,
  onToggleExpand,
  onToggleVisibility,
  onItemReorder,
  onItemToggle,
  listeners,
  isDragging,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleItemDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onItemReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  const visibleCount = items.filter((i) => i.visible).length;
  const itemPreview = items.slice(0, 3).map((i) => i.name).join(', ');

  return (
    <div
      className={`category-card ${!cat.visible ? 'hidden-category' : ''} ${isDragging ? 'dragging' : ''}`}
      data-testid={`category-${cat.id}`}
    >
      <div className="category-header" onClick={onToggleExpand}>
        <DragHandle listeners={listeners} />
        <div className="category-info">
          <div className="category-title-row">
            <span className="category-name">{cat.name}</span>
            <span className="category-badge">{visibleCount}/{items.length} items</span>
          </div>
          {!expanded && itemPreview && (
            <span className="category-preview">{itemPreview}...</span>
          )}
        </div>
        <div className="category-actions">
          <ToggleSwitch
            checked={cat.visible}
            onChange={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            label={cat.name}
          />
          <button className="expand-btn">
            {expanded ? <IoChevronDown /> : <IoChevronForward />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="category-items">
          <div className="items-header">
            <span className="items-title">Items</span>
            <div className="items-bulk-actions">
              <button
                className="bulk-action-btn"
                onClick={() => {
                  const allVisible = items.map((i) => ({ ...i, visible: true }));
                  onItemReorder(allVisible);
                }}
                data-testid="show-all-items"
              >
                <IoCheckmarkCircle /> Show All
              </button>
              <button
                className="bulk-action-btn"
                onClick={() => {
                  const allHidden = items.map((i) => ({ ...i, visible: false }));
                  onItemReorder(allHidden);
                }}
                data-testid="hide-all-items"
              >
                <IoCloseCircle /> Hide All
              </button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="items-list">
                {items.map((item, iIdx) => (
                  <SortableItem key={item.id} id={item.id}>
                    {({ listeners: itemListeners, isDragging: itemDragging }) => (
                      <div
                        className={`item-row ${!item.visible ? 'hidden-item' : ''} ${itemDragging ? 'dragging' : ''}`}
                        data-testid={`item-${item.id}`}
                      >
                        <DragHandle listeners={itemListeners} />
                        <span className="item-index">{iIdx + 1}</span>
                        <span className="item-name">{item.name}</span>
                        <button
                          className={`visibility-btn ${item.visible ? 'visible' : ''}`}
                          onClick={() => onItemToggle(iIdx)}
                          data-testid={`toggle-item-${item.id}`}
                        >
                          {item.visible ? <IoEyeOutline /> : <IoEyeOffOutline />}
                        </button>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {items.length === 0 && (
            <div className="empty-items">No items in this category</div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Component
const MenuOrderTab = ({ config, setConfig }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [apiCategories, setApiCategories] = useState([]);
  const [apiItems, setApiItems] = useState({});
  const [restaurant, setRestaurant] = useState(null);
  const [stations, setStations] = useState([]);
  const [stationCategories, setStationCategories] = useState({});
  const [stationItems, setStationItems] = useState({});
  const [selectedStation, setSelectedStation] = useState(null); // NEW: Selected station for pills
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeId, setActiveId] = useState(null);

  const restaurantId = user?.restaurant_id || user?.id;
  const isMultiMenu = restaurant ? isMultipleMenu(restaurant, restaurantId) : false;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      const data = await getRestaurantProducts(restaurantId, '0');
      const products = data?.products || [];
      const cats = [];
      const items = {};
      for (const p of products) {
        const catId = String(p.category_id);
        cats.push({ id: catId, name: p.category_name || '' });
        items[catId] = (p.items || []).map((i) => ({ id: String(i.id), name: i.name || '' }));
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
        const data = await getRestaurantProducts(restaurantId, '0', station.id);
        const products = data?.products || [];
        catResults[station.id] = products.map((p) => ({
          id: String(p.category_id),
          name: p.category_name || '',
        }));
        for (const p of products) {
          const key = `${station.id}__${p.category_id}`;
          itemResults[key] = (p.items || []).map((i) => ({
            id: String(i.id),
            name: i.name || '',
          }));
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

  // --- Merge helpers ---
  const mergeWithSaved = (apiList, savedOrder, savedVisibility) => {
    const ordered = [];
    const seen = new Set();
    for (const s of savedOrder) {
      const item = apiList.find((a) => a.id === s.id);
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
  const getMergedCategories = () =>
    mergeWithSaved(
      apiCategories,
      config.menuOrder?.categoryOrder || [],
      config.menuOrder?.categoryVisibility || {}
    );

  const getMergedItems = (categoryId) =>
    mergeWithSaved(
      apiItems[categoryId] || [],
      config.menuOrder?.itemOrder?.[categoryId] || [],
      config.menuOrder?.itemVisibility?.[categoryId] || {}
    );

  const updateCategoryConfig = (newCategories) => {
    const categoryOrder = newCategories.map((c) => ({ id: c.id, name: c.name }));
    const categoryVisibility = {};
    newCategories.forEach((c) => {
      categoryVisibility[c.id] = c.visible;
    });
    setConfig((prev) => ({
      ...prev,
      menuOrder: { ...prev.menuOrder, categoryOrder, categoryVisibility },
    }));
  };

  const updateItemConfig = (categoryId, newItems) => {
    const itemOrder = newItems.map((i) => ({ id: i.id, name: i.name }));
    const itemVis = {};
    newItems.forEach((i) => {
      itemVis[i.id] = i.visible;
    });
    setConfig((prev) => ({
      ...prev,
      menuOrder: {
        ...prev.menuOrder,
        itemOrder: { ...prev.menuOrder?.itemOrder, [categoryId]: itemOrder },
        itemVisibility: { ...prev.menuOrder?.itemVisibility, [categoryId]: itemVis },
      },
    }));
  };

  // ============ MULTIPLE MENU ============
  const getMergedStations = () =>
    mergeWithSaved(
      stations,
      config.menuOrder?.stationOrder || [],
      config.menuOrder?.stationVisibility || {}
    );

  const getMergedStationCats = (stationId) =>
    mergeWithSaved(
      stationCategories[stationId] || [],
      config.menuOrder?.stationCategoryOrder?.[stationId] || [],
      config.menuOrder?.stationCategoryVisibility?.[stationId] || {}
    );

  const getMergedStationItems = (stationId, categoryId) => {
    const key = `${stationId}__${categoryId}`;
    return mergeWithSaved(
      stationItems[key] || [],
      config.menuOrder?.stationItemOrder?.[key] || [],
      config.menuOrder?.stationItemVisibility?.[key] || {}
    );
  };

  const updateStationConfig = (newStations) => {
    const stationOrder = newStations.map((s) => ({ id: s.id, name: s.name }));
    const stationVisibility = {};
    newStations.forEach((s) => {
      stationVisibility[s.id] = s.visible;
    });
    setConfig((prev) => ({
      ...prev,
      menuOrder: { ...prev.menuOrder, stationOrder, stationVisibility },
    }));
  };

  const updateStationCatConfig = (stationId, newCats) => {
    const catOrder = newCats.map((c) => ({ id: c.id, name: c.name }));
    const catVis = {};
    newCats.forEach((c) => {
      catVis[c.id] = c.visible;
    });
    setConfig((prev) => ({
      ...prev,
      menuOrder: {
        ...prev.menuOrder,
        stationCategoryOrder: {
          ...prev.menuOrder?.stationCategoryOrder,
          [stationId]: catOrder,
        },
        stationCategoryVisibility: {
          ...prev.menuOrder?.stationCategoryVisibility,
          [stationId]: catVis,
        },
      },
    }));
  };

  const updateStationItemConfig = (stationId, categoryId, newItems) => {
    const key = `${stationId}__${categoryId}`;
    const itemOrder = newItems.map((i) => ({ id: i.id, name: i.name }));
    const itemVis = {};
    newItems.forEach((i) => {
      itemVis[i.id] = i.visible;
    });
    setConfig((prev) => ({
      ...prev,
      menuOrder: {
        ...prev.menuOrder,
        stationItemOrder: { ...prev.menuOrder?.stationItemOrder, [key]: itemOrder },
        stationItemVisibility: { ...prev.menuOrder?.stationItemVisibility, [key]: itemVis },
      },
    }));
  };

  // Drag handlers
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const categories = getMergedCategories();
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      updateCategoryConfig(arrayMove(categories, oldIndex, newIndex));
    }
  };

  const handleStationDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const mergedStations = getMergedStations();
    const oldIndex = mergedStations.findIndex((s) => s.id === active.id);
    const newIndex = mergedStations.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      updateStationConfig(arrayMove(mergedStations, oldIndex, newIndex));
    }
  };

  if (loading) {
    return (
      <div className="menu-order-loading">
        <div className="loading-spinner" />
        <span>Loading menu data...</span>
      </div>
    );
  }

  // Filter categories by search
  const filterBySearch = (items) => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(term));
  };

  // ============ RENDER: MULTIPLE MENU (3-layer) ============
  if (isMultiMenu) {
    const mergedStations = filterBySearch(getMergedStations());
    return (
      <div className="menu-order-tab modern" data-testid="menu-order-tab">
        <div className="menu-order-toolbar">
          <div className="search-box">
            <IoSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search stations, categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="menu-search"
            />
          </div>
          <button
            className="refresh-btn"
            onClick={fetchStationCategories}
            data-testid="menu-order-refresh"
          >
            <IoRefresh /> Refresh
          </button>
        </div>

        <div className="menu-order-info">
          <span className="info-icon">💡</span>
          <span>Drag items using the handle to reorder. Toggle visibility with the switch.</span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleStationDragEnd}
        >
          <SortableContext
            items={mergedStations.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="stations-list" data-testid="stations-list">
              {mergedStations.map((station) => (
                <SortableItem key={station.id} id={station.id}>
                  {({ listeners, isDragging }) => (
                    <div
                      className={`station-card ${!station.visible ? 'hidden-station' : ''} ${isDragging ? 'dragging' : ''}`}
                    >
                      <div
                        className="station-header"
                        onClick={() =>
                          setExpandedStations((prev) => ({
                            ...prev,
                            [station.id]: !prev[station.id],
                          }))
                        }
                      >
                        <DragHandle listeners={listeners} />
                        <span className="station-name">{station.name}</span>
                        <div className="station-actions">
                          <ToggleSwitch
                            checked={station.visible}
                            onChange={(e) => {
                              e.stopPropagation();
                              const updated = getMergedStations().map((s) =>
                                s.id === station.id ? { ...s, visible: !s.visible } : s
                              );
                              updateStationConfig(updated);
                            }}
                            label={station.name}
                          />
                          <button className="expand-btn">
                            {expandedStations[station.id] ? (
                              <IoChevronDown />
                            ) : (
                              <IoChevronForward />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedStations[station.id] && (
                        <div className="station-categories">
                          {getMergedStationCats(station.id).map((cat, cIdx) => {
                            const items = getMergedStationItems(station.id, cat.id);
                            const expandKey = `${station.id}__${cat.id}`;
                            return (
                              <CategoryCard
                                key={cat.id}
                                cat={cat}
                                index={cIdx}
                                items={items}
                                expanded={expandedCategories[expandKey]}
                                onToggleExpand={() =>
                                  setExpandedCategories((prev) => ({
                                    ...prev,
                                    [expandKey]: !prev[expandKey],
                                  }))
                                }
                                onToggleVisibility={() => {
                                  const cats = getMergedStationCats(station.id);
                                  const updated = cats.map((c) =>
                                    c.id === cat.id ? { ...c, visible: !c.visible } : c
                                  );
                                  updateStationCatConfig(station.id, updated);
                                }}
                                onItemReorder={(newItems) =>
                                  updateStationItemConfig(station.id, cat.id, newItems)
                                }
                                onItemToggle={(iIdx) => {
                                  const updated = [...items];
                                  updated[iIdx] = {
                                    ...updated[iIdx],
                                    visible: !updated[iIdx].visible,
                                  };
                                  updateStationItemConfig(station.id, cat.id, updated);
                                }}
                                listeners={{}}
                                isDragging={false}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  // ============ RENDER: SINGLE MENU (2-layer + items) ============
  const categories = filterBySearch(getMergedCategories());

  if (categories.length === 0 && !searchTerm) {
    return (
      <div className="menu-order-empty">
        <span className="empty-icon">📋</span>
        <h3>No Categories Found</h3>
        <p>Add menu items to your restaurant to organize them here.</p>
      </div>
    );
  }

  return (
    <div className="menu-order-tab modern" data-testid="menu-order-tab">
      <div className="menu-order-toolbar">
        <div className="search-box">
          <IoSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="menu-search"
          />
        </div>
        <button className="refresh-btn" onClick={fetchCategories} data-testid="menu-order-refresh">
          <IoRefresh /> Refresh
        </button>
      </div>

      <div className="menu-order-info">
        <span className="info-icon">💡</span>
        <span>Drag categories using the handle (⋮⋮) to reorder. Click to expand and manage items.</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="categories-list" data-testid="menu-order-list">
            {categories.map((cat, cIdx) => {
              const items = getMergedItems(cat.id);
              return (
                <SortableItem key={cat.id} id={cat.id}>
                  {({ listeners, isDragging }) => (
                    <CategoryCard
                      cat={cat}
                      index={cIdx}
                      items={items}
                      expanded={expandedCategories[cat.id]}
                      onToggleExpand={() =>
                        setExpandedCategories((prev) => ({
                          ...prev,
                          [cat.id]: !prev[cat.id],
                        }))
                      }
                      onToggleVisibility={() => {
                        const updated = getMergedCategories().map((c) =>
                          c.id === cat.id ? { ...c, visible: !c.visible } : c
                        );
                        updateCategoryConfig(updated);
                      }}
                      onItemReorder={(newItems) => updateItemConfig(cat.id, newItems)}
                      onItemToggle={(iIdx) => {
                        const updated = [...items];
                        updated[iIdx] = { ...updated[iIdx], visible: !updated[iIdx].visible };
                        updateItemConfig(cat.id, updated);
                      }}
                      listeners={listeners}
                      isDragging={isDragging}
                    />
                  )}
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && (
            <div className="drag-overlay-item">
              {categories.find((c) => c.id === activeId)?.name || 'Category'}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {categories.length === 0 && searchTerm && (
        <div className="no-results">
          <span>No categories match "{searchTerm}"</span>
        </div>
      )}
    </div>
  );
};

export default MenuOrderTab;
