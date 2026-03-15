import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { IoSearchOutline, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { getRestaurantProducts } from '../../api/services/restaurantService';
import { getAvailableDietaryTags, getDietaryTagsMapping, updateDietaryTagsMapping } from '../../api/services/dietaryTagsService';
import './DietaryTagsAdmin.css';

const DietaryTagsAdmin = ({ restaurantId, token, multipleMenu = false }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null); // Filter by dietary tag
  
  // Multi-menu states
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  
  // Auto-save debounce ref
  const saveTimeoutRef = useRef(null);
  const pendingMappingsRef = useRef(null);

  // Load stations for multi-menu restaurants
  useEffect(() => {
    if (multipleMenu) {
      try {
        const stationsData = require('../../data/stations.json');
        setStations(stationsData || []);
      } catch (error) {
        console.error('Failed to load stations:', error);
        setStations([]);
      }
    }
  }, [multipleMenu]);

  // Fetch all data: menu items, tags, and mappings
  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantId) return;
      
      // For multi-menu, wait until a station is selected
      if (multipleMenu && !selectedStation) {
        setLoading(false);
        setMenuItems([]);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch menu items, tags, and mappings in parallel
        const [productsData, tagsData, mappingData] = await Promise.all([
          getRestaurantProducts(
            restaurantId, 
            "0",
            multipleMenu ? selectedStation : null
          ),
          getAvailableDietaryTags(),
          getDietaryTagsMapping(restaurantId),
        ]);

        // Process menu items
        const products = productsData?.products || [];
        const allItems = [];
        products.forEach(category => {
          (category.items || []).forEach(item => {
            allItems.push({
              id: String(item.id),
              name: item.name || '',
              categoryName: category.category_name || '',
              categoryId: category.category_id || '',
              isVeg: item.veg === 1,
              isEgg: item.veg === 2,
            });
          });
        });
        setMenuItems(allItems);
        setAvailableTags(tagsData.tags || []);
        setMappings(mappingData.mappings || {});
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, multipleMenu, selectedStation]);

  // Auto-save function with debounce
  const autoSave = useCallback(async (newMappings) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Store the latest mappings
    pendingMappingsRef.current = newMappings;
    
    // Debounce save by 800ms
    saveTimeoutRef.current = setTimeout(async () => {
      if (!pendingMappingsRef.current) return;
      
      setSaving(true);
      try {
        await updateDietaryTagsMapping(restaurantId, pendingMappingsRef.current, token);
        toast.success('Saved ✓', { 
          duration: 1500,
          style: { 
            background: '#10b981', 
            color: 'white',
            padding: '8px 16px',
            fontSize: '14px'
          }
        });
      } catch (error) {
        console.error('Auto-save error:', error);
        toast.error('Failed to save changes');
      } finally {
        setSaving(false);
        pendingMappingsRef.current = null;
      }
    }, 800);
  }, [restaurantId, token]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    menuItems.forEach(item => cats.add(item.categoryName));
    return Array.from(cats).sort();
  }, [menuItems]);

  // Get items filtered by category (for tag counts)
  const categoryFilteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return menuItems;
    }
    return menuItems.filter(item => item.categoryName === selectedCategory);
  }, [menuItems, selectedCategory]);

  // Filter items (includes search, category, and tag filters)
  const filteredItems = useMemo(() => {
    let items = menuItems;
    
    // Filter by selected dietary tag
    if (selectedTag) {
      items = items.filter(item => {
        const itemTags = mappings[item.id] || [];
        return itemTags.includes(selectedTag);
      });
    }
    
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.categoryName === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [menuItems, selectedCategory, searchQuery, selectedTag, mappings]);

  // Get count of items for each tag (respects category filter)
  const getTagCount = useCallback((tagId) => {
    return categoryFilteredItems.filter(item => (mappings[item.id] || []).includes(tagId)).length;
  }, [categoryFilteredItems, mappings]);

  // Count untagged items
  const untaggedCount = useMemo(() => {
    return menuItems.filter(item => {
      const itemTags = mappings[item.id] || [];
      return itemTags.length === 0;
    }).length;
  }, [menuItems, mappings]);

  // Toggle a tag for an item (with auto-save)
  const toggleTag = (itemId, tagId) => {
    setMappings(prev => {
      const currentTags = prev[itemId] || [];
      let newTags;
      
      if (currentTags.includes(tagId)) {
        newTags = currentTags.filter(t => t !== tagId);
      } else {
        newTags = [...currentTags, tagId];
      }
      
      const newMappings = {
        ...prev,
        [itemId]: newTags,
      };
      
      // Trigger auto-save
      autoSave(newMappings);
      
      return newMappings;
    });
  };

  // Get selected station name
  const selectedStationName = useMemo(() => {
    if (!selectedStation) return '';
    const station = stations.find(s => s.id === selectedStation);
    return station?.name || selectedStation;
  }, [selectedStation, stations]);

  return (
    <div className="dietary-tags-admin" data-testid="dietary-tags-admin">
      <div className="dietary-tags-header">
        <h3 className="section-title">
          🏷️ Dietary Tags Management
          {saving && <span className="saving-indicator">Saving...</span>}
        </h3>
        <p className="section-description">
          Assign dietary tags to menu items. Changes are saved automatically.
        </p>
      </div>

      {/* Station Selector for Multi-Menu Restaurants */}
      {multipleMenu && stations.length > 0 && (
        <div className="station-selector" data-testid="station-selector">
          <h4 className="station-selector-title">Select Menu</h4>
          <div className="station-tabs">
            {stations.map(station => (
              <button
                key={station.id}
                className={`station-tab ${selectedStation === station.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedStation(station.id);
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                data-testid={`station-tab-${station.id}`}
              >
                <span className="station-name">{station.name}</span>
                {station.timing && (
                  <span className="station-timing">{station.timing}</span>
                )}
              </button>
            ))}
          </div>
          
          {!selectedStation && (
            <div className="select-station-prompt">
              <span className="prompt-icon">👆</span>
              <span>Select a menu to view and tag items</span>
            </div>
          )}
        </div>
      )}

      {/* Show content only if not multi-menu OR station is selected */}
      {(!multipleMenu || selectedStation) && (
        <>
          {/* Selected menu indicator */}
          {multipleMenu && selectedStation && (
            <div className="selected-menu-indicator">
              Showing items from: <strong>{selectedStationName}</strong>
              {menuItems.length > 0 && <span className="item-count">({menuItems.length} items)</span>}
            </div>
          )}

          {/* Stats banner */}
          {untaggedCount > 0 && !loading && (
            <div className="untagged-banner" data-testid="untagged-banner">
              <IoAlertCircle className="banner-icon" />
              <span>{untaggedCount} item{untaggedCount > 1 ? 's' : ''} need dietary tagging</span>
            </div>
          )}

          {/* Filters row */}
          <div className="dietary-filters-row">
            <div className="dietary-search">
              <IoSearchOutline className="search-icon" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="dietary-search-input"
              />
            </div>
            
            <select
              className="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              data-testid="dietary-category-filter"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Tag legend - Clickable filters */}
          <div className="tag-legend" data-testid="tag-legend">
            <button
              className={`tag-legend-item ${selectedTag === null ? 'active' : ''}`}
              onClick={() => setSelectedTag(null)}
              data-testid="tag-filter-all"
            >
              <span className="tag-label">All Items</span>
              <span className="tag-count">{categoryFilteredItems.length}</span>
            </button>
            {availableTags.map(tag => {
              const count = getTagCount(tag.id);
              return (
                <button
                  key={tag.id}
                  className={`tag-legend-item ${selectedTag === tag.id ? 'active' : ''} ${count === 0 ? 'empty' : ''}`}
                  onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                  title={`${tag.label}: ${count} items`}
                  data-testid={`tag-filter-${tag.id}`}
                >
                  <span className="tag-label">{tag.label}</span>
                  <span className="tag-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Active filter indicator */}
          {selectedTag && (
            <div className="active-filter-banner" data-testid="active-filter-banner">
              <span>
                Showing items tagged as: <strong>{availableTags.find(t => t.id === selectedTag)?.label}</strong>
              </span>
              <button 
                className="clear-filter-btn"
                onClick={() => setSelectedTag(null)}
              >
                Clear Filter ✕
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="loading-state">Loading menu items...</div>
          )}

          {/* Items list */}
          {!loading && (
            <div className="dietary-items-list">
              {filteredItems.length === 0 ? (
                <div className="empty-state">
                  {menuItems.length === 0 
                    ? 'No items found in this menu' 
                    : 'No items match your search'}
                </div>
              ) : (
                filteredItems.map(item => {
                  const itemTags = mappings[item.id] || [];
                  const hasNoTags = itemTags.length === 0;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`dietary-item-card ${hasNoTags ? 'needs-tagging' : ''}`}
                      data-testid={`dietary-item-${item.id}`}
                    >
                      <div className="item-info">
                        <div className="item-name-row">
                          <span className={`veg-indicator ${item.isVeg ? 'veg' : item.isEgg ? 'egg' : 'non-veg'}`}>
                            <span className="veg-dot"></span>
                          </span>
                          <span className="item-name">{item.name}</span>
                          {hasNoTags && <span className="new-badge">NEW</span>}
                        </div>
                        <span className="item-category">{item.categoryName}</span>
                      </div>
                      
                      <div className="item-tags">
                        {availableTags.map(tag => (
                          <button
                            key={tag.id}
                            className={`tag-checkbox ${itemTags.includes(tag.id) ? 'checked' : ''}`}
                            onClick={() => toggleTag(item.id, tag.id)}
                            title={tag.label}
                            data-testid={`tag-${item.id}-${tag.id}`}
                          >
                            <span className="tag-icon">{tag.icon}</span>
                            {itemTags.includes(tag.id) && (
                              <IoCheckmarkCircle className="check-icon" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DietaryTagsAdmin;
